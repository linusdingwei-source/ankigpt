import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { consumeCredits, getCredits } from '@/lib/credits';

const TTS_CREDITS_COST = 1; // TTS 生成消耗 1 credit

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (text.length > 500) {
      return NextResponse.json(
        { error: 'Text is too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Check and consume credits
    const userId = session.user.id as string;
    const currentCredits = await getCredits(userId);
    
    if (currentCredits < TTS_CREDITS_COST) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits. Please purchase a package.',
          credits: currentCredits 
        },
        { status: 402 }
      );
    }

    // Check DashScope API Key
    if (!process.env.DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { error: 'DashScope API key is not configured' },
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
        { 
          error: 'TTS generation failed', 
          details: errorData 
        },
        { status: ttsResponse.status }
      );
    }

    const ttsData = await ttsResponse.json();
    
    // Qwen-TTS 返回音频 URL
    if (!ttsData.output?.audio?.url) {
      return NextResponse.json(
        { error: 'Invalid response from TTS service' },
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
          { error: 'Failed to consume credits' },
          { status: 500 }
        );
      }

      const remainingCredits = await getCredits(userId);

      return NextResponse.json({
        success: true,
        audio: base64Audio,
        format: 'mp3',
        credits: remainingCredits,
      });
    } catch (downloadError) {
      console.error('Error downloading audio:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download audio from TTS service' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('TTS generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    );
  }
}

