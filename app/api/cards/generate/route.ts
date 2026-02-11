import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';
import { getUserId, getBearerTokenFromRequest } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

const CARD_GENERATION_CREDITS_COST = 3; // 完整卡片生成消耗 3 credits (LLM 2 + TTS 1)

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    // 获取用户 ID（支持登录用户和临时用户）
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const { text, cardType, deckName, includePronunciation, sourceId, category = 'CARD', analysis: providedAnalysis } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Text is required'),
        { status: 400 }
      );
    }

    // 检查 credits
    const currentCredits = await getCredits(userId);
    
    // 如果提供了 analysis，可能不需要消耗 LLM credits
    const requiredCredits = providedAnalysis ? 0 : (includePronunciation ? CARD_GENERATION_CREDITS_COST : 2);
    
    if (currentCredits < requiredCredits) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INSUFFICIENT_CREDITS,
          'Insufficient credits. Please purchase a package.',
          { credits: currentCredits, required: requiredCredits }
        ),
        { status: 402 }
      );
    }

    let analysis = providedAnalysis;

    if (!analysis) {
      // 检查 DashScope API Key
      if (!process.env.DASHSCOPE_API_KEY) {
        return NextResponse.json(
          errorResponse(ErrorCodes.INTERNAL_ERROR, 'DashScope API key is not configured'),
          { status: 500 }
        );
      }

      // 准备请求头（支持 Bearer Token）
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      const bearerToken = getBearerTokenFromRequest(request);
      if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
      } else {
        headers['Cookie'] = request.headers.get('cookie') || '';
      }

      // 1. 调用 LLM 分析
      const llmResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/llm/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text }),
      });

      if (!llmResponse.ok) {
        const errorData = await llmResponse.json().catch(() => ({}));
        return NextResponse.json(
          errorResponse(
            ErrorCodes.INTERNAL_ERROR,
            'LLM analysis failed',
            errorData
          ),
          { status: llmResponse.status }
        );
      }

      const llmData = await llmResponse.json();
      if (!llmData.success || !llmData.data?.analysis) {
        return NextResponse.json(
          errorResponse(
            ErrorCodes.INTERNAL_ERROR,
            'LLM analysis failed',
            llmData
          ),
          { status: 500 }
        );
      }

      analysis = llmData.data.analysis;
    }

    // 2. 生成 TTS（如果需要）
    let audioUrl: string | null = null;
    let audioFilename: string | null = null;
    let timestamps: Array<{ text: string; begin_time: number; end_time: number }> | null = null;

    if (includePronunciation) {
      const ttsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/tts/generate-enhanced`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          kanaText: analysis.kanaText,
        }),
      });

      if (ttsResponse.ok) {
        const ttsData = await ttsResponse.json();
        if (ttsData.success && ttsData.data?.audio?.url) {
          // 使用 TTS API 返回的 URL（可能已经上传到云存储）
          audioUrl = ttsData.data.audio.url;
          // 使用 TTS API 返回的文件名（如果已上传到云存储）
          audioFilename = ttsData.data.audio.filename || (() => {
            if (audioUrl) {
              const urlParts = audioUrl.split('/');
              return urlParts[urlParts.length - 1] || 'audio.mp3';
            }
            return 'audio.mp3';
          })();
          timestamps = ttsData.data.audio.timestamps || null;
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
        sourceId: sourceId || null,
        category,
        frontContent: text,
        backContent: analysis.html,
        cardType: cardType || '问答题（附翻转卡片）',
        audioUrl,
        audioFilename,
        timestamps: timestamps ? JSON.parse(JSON.stringify(timestamps)) : null,
        kanaText: analysis.kanaText,
        deckName: finalDeckName,
        tags: [],
      },
    });

    const remainingCredits = await getCredits(userId);

    return NextResponse.json(
      successResponse({
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
      })
    );
  } catch (error) {
    console.error('Card generation error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate card'),
      { status: 500 }
    );
  }
}

