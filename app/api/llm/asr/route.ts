import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCredits, consumeCredits } from '@/lib/credits';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

const ASR_CREDITS_COST = 0.01; // 100次调用=1credit
const DASHSCOPE_ASR_MODEL = 'paraformer-v2';
const DEFAULT_LANGUAGE_HINTS = ['ja']; // Japanese by default

interface TranscriptionResult {
  success: boolean;
  text?: string;
  timestamps?: Array<{
    begin_time: number;
    end_time: number;
    text: string;
  }>;
  error?: string;
}

// Submit ASR task (async)
async function submitAsrTask(audioUrl: string, languageHints: string[] = DEFAULT_LANGUAGE_HINTS): Promise<{ taskId?: string; error?: string }> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return { error: 'DASHSCOPE_API_KEY is not configured' };
  }

  try {
    const requestBody = {
      model: DASHSCOPE_ASR_MODEL,
      input: {
        file_urls: [audioUrl],
      },
      parameters: {
        language_hints: languageHints,
      },
    };
    
    console.log('[ASR] Submit request body:', JSON.stringify(requestBody, null, 2));
    console.log('[ASR] Calling DashScope API...');
    
    // Add timeout with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log('[ASR] Submit response status:', response.status);
    console.log('[ASR] Submit response body:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return { error: `Invalid JSON response: ${responseText}` };
    }

    if (!response.ok) {
      return { error: data.message || data.error?.message || `HTTP ${response.status}: ${responseText}` };
    }

    if (data.output?.task_id) {
      return { taskId: data.output.task_id };
    } else {
      return { error: data.message || 'Failed to submit ASR task - no task_id in response' };
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[ASR] Submit task error:', err.name, err.message);
    
    if (err.name === 'AbortError') {
      return { error: 'DashScope API request timed out (30s)' };
    }
    
    return { error: `Submit task failed: ${err.name} - ${err.message}` };
  }
}

// Check task status (must use POST per DashScope docs)
async function checkTaskStatus(taskId: string): Promise<{ 
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'; 
  transcriptionUrl?: string; 
  error?: string 
}> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return { status: 'FAILED', error: 'DASHSCOPE_API_KEY is not configured' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    // DashScope requires POST for task status query
    const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    const data = await response.json();
    const taskStatus = data.output?.task_status;
    console.log(`[ASR] Check task ${taskId} status:`, taskStatus);

    if (taskStatus === 'SUCCEEDED') {
      const results = data.output?.results;
      if (results && results.length > 0) {
        const result = results[0];
        if (result.subtask_status === 'SUCCEEDED' && result.transcription_url) {
          return { status: 'SUCCEEDED', transcriptionUrl: result.transcription_url };
        }
      }
      return { status: 'FAILED', error: 'Transcription succeeded but no URL found' };
    } else if (taskStatus === 'FAILED') {
      return { status: 'FAILED', error: data.output?.message || 'ASR task failed' };
    } else if (taskStatus === 'RUNNING') {
      return { status: 'RUNNING' };
    } else {
      return { status: 'PENDING' };
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[ASR] Check task status error:', err.name, err.message);
    if (err.name === 'AbortError') {
      return { status: 'FAILED', error: 'Status check timed out' };
    }
    return { status: 'FAILED', error: `Check status failed: ${err.message}` };
  }
}

// Download transcription result
async function downloadTranscription(transcriptionUrl: string): Promise<TranscriptionResult> {
  try {
    const response = await fetch(transcriptionUrl);
    const data = await response.json();
    console.log('[ASR] Transcription data keys:', Object.keys(data));

    const transcripts = data.transcripts || [];
    if (!transcripts.length) {
      return { success: false, error: 'No transcripts found' };
    }

    // Extract text
    const texts: string[] = [];
    for (const transcript of transcripts) {
      if (transcript.text) {
        texts.push(transcript.text);
      }
    }

    // Extract timestamps
    const timestamps: Array<{ begin_time: number; end_time: number; text: string }> = [];
    for (const transcript of transcripts) {
      const sentences = transcript.sentences || [];
      for (const sentence of sentences) {
        const words = sentence.words || [];
        for (const word of words) {
          if (word.text) {
            timestamps.push({
              begin_time: word.begin_time || 0,
              end_time: word.end_time || 0,
              text: word.text,
            });
          }
        }
      }
    }

    return {
      success: true,
      text: texts.join(' '),
      timestamps,
    };
  } catch (error) {
    console.error('[ASR] Download transcription error:', error);
    return { success: false, error: `Download transcription failed: ${error}` };
  }
}

// POST: Submit ASR task (async, returns taskId immediately)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const { audioUrl, languageHints } = await request.json();

    if (!audioUrl) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Audio URL is required'),
        { status: 400 }
      );
    }

    // Check credits
    const currentCredits = await getCredits(userId);
    if (currentCredits < ASR_CREDITS_COST) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INSUFFICIENT_CREDITS,
          'Insufficient credits',
          { credits: currentCredits, required: ASR_CREDITS_COST }
        ),
        { status: 402 }
      );
    }

    // Check API key
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      console.error('[ASR] DASHSCOPE_API_KEY not configured');
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, 'DashScope API key is not configured'),
        { status: 500 }
      );
    }
    console.log('[ASR] API key present, length:', apiKey.length, ', starts with:', apiKey.substring(0, 5));

    // Submit ASR task (async)
    console.log('[ASR] Submitting task for:', audioUrl);
    const submitResult = await submitAsrTask(audioUrl, languageHints || DEFAULT_LANGUAGE_HINTS);
    if (!submitResult.taskId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, submitResult.error || 'Failed to submit ASR task'),
        { status: 500 }
      );
    }

    // Consume credits immediately after successful submission
    await consumeCredits(userId, ASR_CREDITS_COST);
    const remainingCredits = await getCredits(userId);

    // Return taskId for client to poll
    return NextResponse.json(
      successResponse({
        taskId: submitResult.taskId,
        status: 'PENDING',
        credits: remainingCredits,
      })
    );
  } catch (error) {
    console.error('[ASR] Submit error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'ASR task submission failed'),
      { status: 500 }
    );
  }
}

// GET: Check ASR task status and get result
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'taskId is required'),
        { status: 400 }
      );
    }

    // Check task status
    const statusResult = await checkTaskStatus(taskId);

    if (statusResult.status === 'SUCCEEDED' && statusResult.transcriptionUrl) {
      // Download and return transcription
      const transcription = await downloadTranscription(statusResult.transcriptionUrl);
      if (!transcription.success) {
        return NextResponse.json(
          errorResponse(ErrorCodes.INTERNAL_ERROR, transcription.error || 'Failed to get transcription'),
          { status: 500 }
        );
      }

      return NextResponse.json(
        successResponse({
          status: 'SUCCEEDED',
          text: transcription.text,
          timestamps: transcription.timestamps,
        })
      );
    } else if (statusResult.status === 'FAILED') {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, statusResult.error || 'ASR task failed'),
        { status: 500 }
      );
    } else {
      // Still pending or running
      return NextResponse.json(
        successResponse({
          status: statusResult.status,
        })
      );
    }
  } catch (error) {
    console.error('[ASR] Status check error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to check ASR status'),
      { status: 500 }
    );
  }
}
