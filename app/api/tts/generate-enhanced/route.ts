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
      const dashscopeAudioUrl = data.output.audio.url;
      
      // 下载音频文件并上传到云存储（如果配置了）
      let finalAudioUrl = dashscopeAudioUrl;
      let audioFilename: string | null = null;
      
      // 检查是否配置了云存储
      const storageProvider = process.env.STORAGE_PROVIDER;
      if (storageProvider && storageProvider !== 'none') {
        try {
          // 下载 DashScope 返回的音频
          const audioResponse = await fetch(dashscopeAudioUrl);
          if (audioResponse.ok) {
            const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
            
            // 从 URL 提取原始文件名，移除查询参数
            const urlObj = new URL(dashscopeAudioUrl);
            let originalFilename = urlObj.pathname.split('/').pop() || 'audio.mp3';
            // 如果文件名包含扩展名，确保只保留文件名和扩展名
            // 移除任何查询参数或特殊字符
            originalFilename = originalFilename.split('?')[0].split('#')[0];
            // 如果没有扩展名，添加 .mp3
            if (!originalFilename.includes('.')) {
              originalFilename = `${originalFilename}.mp3`;
            }
            
            // 上传到云存储
            const { uploadToStorage } = await import('@/lib/storage');
            const uploadResult = await uploadToStorage(
              audioBuffer,
              originalFilename,
              'audio/mpeg'
            );
            
            finalAudioUrl = uploadResult.url;
            audioFilename = uploadResult.filename;
            
            console.log(`Audio uploaded to cloud storage: ${finalAudioUrl}`);
          } else {
            console.warn('Failed to download audio from DashScope, using original URL');
          }
        } catch (uploadError) {
          console.error('Failed to upload audio to cloud storage:', uploadError);
          // 如果上传失败，使用 DashScope 的原始 URL
          console.warn('Falling back to DashScope audio URL');
        }
      }
      
      // 消耗 credits
      await consumeCredits(userId, TTS_CREDITS_COST);
      
      const remainingCredits = await getCredits(userId);

      return NextResponse.json({
        success: true,
        audio: {
          url: finalAudioUrl,
          filename: audioFilename,
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

