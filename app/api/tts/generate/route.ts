import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { consumeCredits, getCredits } from '@/lib/credits';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

const TTS_CREDITS_COST = 0.01; // TTS 生成消耗 0.01 credit (100次调用=1credit)

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { getUserId } = await import('@/lib/anonymous-user');
    
    // 获取用户 ID（支持登录用户和临时用户）
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Text is required'),
        { status: 400 }
      );
    }

    if (text.length > 500) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Text is too long (max 500 characters)'),
        { status: 400 }
      );
    }

    // Check and consume credits
    const currentCredits = await getCredits(userId);
    
    if (currentCredits < TTS_CREDITS_COST) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INSUFFICIENT_CREDITS,
          'Insufficient credits. Please purchase a package.',
          { credits: currentCredits, required: TTS_CREDITS_COST }
        ),
        { status: 402 }
      );
    }

    // Check DashScope API Key
    if (!process.env.DASHSCOPE_API_KEY) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, 'DashScope API key is not configured'),
        { status: 500 }
      );
    }

    // 调用 DashScope Qwen-TTS API (使用多模态生成接口)
    // Qwen-TTS 需要使用 MultiModalConversation 接口
    const ttsResponse = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen3-tts-flash',
        input: {
          text: text,
        },
        parameters: {
          voice: 'Cherry', // 日语语音
          language_type: 'Japanese',
        },
      }),
    });

    if (!ttsResponse.ok) {
      const errorData = await ttsResponse.json().catch(() => ({}));
      console.error('DashScope TTS API error:', errorData);
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          'TTS generation failed',
          errorData
        ),
        { status: ttsResponse.status }
      );
    }

    const ttsData = await ttsResponse.json();
    
    // Qwen-TTS 返回音频 URL
    if (!ttsData.output?.audio?.url) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, 'Invalid response from TTS service'),
        { status: 500 }
      );
    }

    const audioUrl = ttsData.output.audio.url;

    // 下载音频文件并转换为 base64
    try {
      const audioDownloadResponse = await fetch(audioUrl);
      if (!audioDownloadResponse.ok) {
        throw new Error(`Failed to download audio: ${audioDownloadResponse.statusText}`);
      }

      const audioBuffer = await audioDownloadResponse.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');

      // 消耗 credits
      const creditConsumed = await consumeCredits(userId, TTS_CREDITS_COST);
      if (!creditConsumed) {
        return NextResponse.json(
          errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to consume credits'),
          { status: 500 }
        );
      }

      const remainingCredits = await getCredits(userId);

      return NextResponse.json(
        successResponse({
          audio: base64Audio,
          format: 'mp3',
          credits: remainingCredits,
        })
      );
    } catch (downloadError) {
      console.error('Error downloading audio:', downloadError);
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to download audio from TTS service'),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('TTS generation error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate audio'),
      { status: 500 }
    );
  }
}

