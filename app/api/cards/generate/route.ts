import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';

const CARD_GENERATION_CREDITS_COST = 3; // 完整卡片生成消耗 3 credits (LLM 2 + TTS 1)

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { text, cardType, deckName, includePronunciation } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // 检查 credits
    const userId = session.user.id as string;
    const currentCredits = await getCredits(userId);
    
    const requiredCredits = includePronunciation ? CARD_GENERATION_CREDITS_COST : 2;
    
    if (currentCredits < requiredCredits) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits. Please purchase a package.',
          credits: currentCredits,
          required: requiredCredits
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

    // 1. 调用 LLM 分析
    const llmResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/llm/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({ text }),
    });

    if (!llmResponse.ok) {
      const errorData = await llmResponse.json();
      return NextResponse.json(
        { error: 'LLM analysis failed', details: errorData },
        { status: llmResponse.status }
      );
    }

    const llmData = await llmResponse.json();
    if (!llmData.success) {
      return NextResponse.json(
        { error: 'LLM analysis failed', details: llmData },
        { status: 500 }
      );
    }

    // 2. 生成 TTS（如果需要）
    let audioUrl: string | null = null;
    let audioFilename: string | null = null;
    let timestamps: Array<{ text: string; begin_time: number; end_time: number }> | null = null;

    if (includePronunciation) {
      const ttsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/tts/generate-enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({
          text,
          kanaText: llmData.analysis.kanaText,
        }),
      });

      if (ttsResponse.ok) {
        const ttsData = await ttsResponse.json();
        if (ttsData.success && ttsData.audio?.url) {
          // 使用 TTS API 返回的 URL（可能已经上传到云存储）
          audioUrl = ttsData.audio.url;
          // 使用 TTS API 返回的文件名（如果已上传到云存储）
          audioFilename = ttsData.audio.filename || (() => {
            const urlParts = audioUrl.split('/');
            return urlParts[urlParts.length - 1] || 'audio.mp3';
          })();
          timestamps = ttsData.audio.timestamps || null;
        }
      }
    }

    // 3. 确保牌组存在
    const finalDeckName = deckName?.trim() || 'default';
    let deck = await prisma.deck.findUnique({
      where: {
        userId_name: {
          userId,
          name: finalDeckName,
        },
      },
    });

    if (!deck) {
      deck = await prisma.deck.create({
        data: {
          userId,
          name: finalDeckName,
        },
      });
    }

    // 4. 创建卡片
    const card = await prisma.card.create({
      data: {
        userId,
        deckId: deck.id,
        frontContent: text,
        backContent: llmData.analysis.html,
        cardType: cardType || '问答题（附翻转卡片）',
        audioUrl,
        audioFilename,
        timestamps: timestamps ? JSON.parse(JSON.stringify(timestamps)) : null,
        kanaText: llmData.analysis.kanaText,
        deckName: finalDeckName,
        tags: [],
      },
    });

    const remainingCredits = await getCredits(userId);

    return NextResponse.json({
      success: true,
      card: {
        id: card.id,
        frontContent: card.frontContent,
        backContent: card.backContent,
        cardType: card.cardType,
        audioUrl: card.audioUrl,
        timestamps: card.timestamps,
        kanaText: card.kanaText,
        deckName: card.deckName,
        createdAt: card.createdAt,
      },
      credits: remainingCredits,
    });
  } catch (error) {
    console.error('Card generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate card' },
      { status: 500 }
    );
  }
}

