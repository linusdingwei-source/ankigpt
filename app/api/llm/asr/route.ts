import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCredits, consumeCredits } from '@/lib/credits';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

const ASR_CREDITS_COST = 1;
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

async function submitAsrTask(audioUrl: string, languageHints: string[] = DEFAULT_LANGUAGE_HINTS): Promise<{ taskId?: string; error?: string }> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return { error: 'DASHSCOPE_API_KEY is not configured' };
  }

  try {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DASHSCOPE_ASR_MODEL,
        input: {
          file_urls: [audioUrl],
        },
        parameters: {
          language_hints: languageHints,
        },
      }),
    });

    const data = await response.json();
    console.log('[ASR] Submit task response:', JSON.stringify(data, null, 2));

    if (data.output?.task_id) {
      return { taskId: data.output.task_id };
    } else {
      return { error: data.message || 'Failed to submit ASR task' };
    }
  } catch (error) {
    console.error('[ASR] Submit task error:', error);
    return { error: `Submit task failed: ${error}` };
  }
}

async function waitForTask(taskId: string, maxAttempts = 60, interval = 3000): Promise<{ transcriptionUrl?: string; error?: string }> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return { error: 'DASHSCOPE_API_KEY is not configured' };
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();
      console.log(`[ASR] Poll task ${taskId} attempt ${attempt + 1}:`, data.output?.task_status);

      const taskStatus = data.output?.task_status;
      
      if (taskStatus === 'SUCCEEDED') {
        const results = data.output?.results;
        if (results && results.length > 0) {
          const result = results[0];
          if (result.subtask_status === 'SUCCEEDED' && result.transcription_url) {
            return { transcriptionUrl: result.transcription_url };
          }
        }
        return { error: 'Transcription succeeded but no URL found' };
      } else if (taskStatus === 'FAILED') {
        return { error: `ASR task failed: ${data.output?.message || 'Unknown error'}` };
      }

      // Still running, wait and retry
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      console.error(`[ASR] Poll task error (attempt ${attempt + 1}):`, error);
      if (attempt === maxAttempts - 1) {
        return { error: `Poll task failed: ${error}` };
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  return { error: 'ASR task timed out' };
}

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
    if (!process.env.DASHSCOPE_API_KEY) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, 'DashScope API key is not configured'),
        { status: 500 }
      );
    }

    // Step 1: Submit ASR task
    console.log('[ASR] Submitting task for:', audioUrl);
    const submitResult = await submitAsrTask(audioUrl, languageHints || DEFAULT_LANGUAGE_HINTS);
    if (!submitResult.taskId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, submitResult.error || 'Failed to submit ASR task'),
        { status: 500 }
      );
    }

    // Step 2: Wait for task completion
    console.log('[ASR] Waiting for task:', submitResult.taskId);
    const waitResult = await waitForTask(submitResult.taskId);
    if (!waitResult.transcriptionUrl) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, waitResult.error || 'ASR task failed'),
        { status: 500 }
      );
    }

    // Step 3: Download transcription
    console.log('[ASR] Downloading transcription from:', waitResult.transcriptionUrl);
    const transcription = await downloadTranscription(waitResult.transcriptionUrl);
    if (!transcription.success) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, transcription.error || 'Failed to get transcription'),
        { status: 500 }
      );
    }

    // Consume credits
    await consumeCredits(userId, ASR_CREDITS_COST);
    const remainingCredits = await getCredits(userId);

    return NextResponse.json(
      successResponse({
        text: transcription.text,
        timestamps: transcription.timestamps,
        credits: remainingCredits,
      })
    );
  } catch (error) {
    console.error('[ASR] Error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'ASR processing failed'),
      { status: 500 }
    );
  }
}
