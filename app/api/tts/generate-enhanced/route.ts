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

    const { text, kanaText } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // 检查 credits
    const userId = session.user.id as string;
    const currentCredits = await getCredits(userId);
    
    if (currentCredits < TTS_CREDITS_COST) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits. Please purchase a package.',
          credits: currentCredits,
          required: TTS_CREDITS_COST
        },
        { status: 402 }
      );
    }

    // 检查 DashScope API Key
    if (!process.env.DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { error: 'DashScope API key is not configured' },
        { status: 500 }
      );
    }

    // 使用假名文本生成 TTS（如果提供），否则使用原文
    const ttsInput = kanaText || text;

    // 调用 DashScope Qwen-TTS API (使用多模态生成接口)
    // Qwen-TTS 需要使用 MultiModalConversation 接口
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen3-tts-flash',
        input: {
          text: ttsInput,
        },
        parameters: {
          voice: 'Cherry',
          language_type: 'Japanese',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('DashScope TTS API error:', errorData);
      return NextResponse.json(
        { error: 'TTS generation failed', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Qwen-TTS 返回音频 URL
    if (data.output?.audio?.url) {
      const audioUrl = data.output.audio.url;
      
      // 下载音频文件（可选：保存到云存储）
      // 这里先返回 URL，客户端可以直接使用
      // 如果需要保存，可以下载后上传到 S3/OSS 等
      
      // 消耗 credits
      await consumeCredits(userId, TTS_CREDITS_COST);
      
      const remainingCredits = await getCredits(userId);

      return NextResponse.json({
        success: true,
        audio: {
          url: audioUrl,
          // 如果需要时间戳，需要调用支持时间戳的 API
          // timestamps: data.output.timestamps || null,
        },
        credits: remainingCredits,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid response from TTS service' },
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

