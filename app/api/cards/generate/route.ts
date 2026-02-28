import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCredits, consumeCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';
import { getUserId, getBearerTokenFromRequest } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';
import { extractKanaFromLLMResult, markdownToHtml } from '@/lib/llm-utils';
import OpenAI from 'openai';

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

    const { text, cardType, deckName, includePronunciation, sourceId, pageNumber, category = 'CARD', analysis: providedAnalysis } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Text is required'),
        { status: 400 }
      );
    }

    // 查询是否已存在相同内容的卡片（在同一牌组内去重复优化）
    // 只查询 CARD 类型，不包括 NOTE
    const finalDeckName = deckName?.trim() || 'default';
    
    // 规范化文本用于比较：去除末尾标点符号以支持模糊匹配
    const normalizeText = (t: string) => t.trim().replace(/[。！？、，.!?,]+$/g, '').trim();
    const normalizedInput = normalizeText(text);
    
    // 先尝试精确匹配
    let existingCard = await prisma.card.findFirst({
      where: {
        userId,
        frontContent: text.trim(),
        category: 'CARD',
        deckName: finalDeckName,
      },
      select: {
        frontContent: true,
        backContent: true,
        kanaText: true,
        audioUrl: true,
        audioFilename: true,
        timestamps: true,
      },
    });
    
    // 如果精确匹配失败，尝试模糊匹配（忽略末尾标点）
    if (!existingCard) {
      // 查找所有可能的匹配卡片
      const candidates = await prisma.card.findMany({
        where: {
          userId,
          category: 'CARD',
          deckName: finalDeckName,
          frontContent: {
            startsWith: normalizedInput.substring(0, Math.min(10, normalizedInput.length)),
          },
        },
        select: {
          frontContent: true,
          backContent: true,
          kanaText: true,
          audioUrl: true,
          audioFilename: true,
          timestamps: true,
        },
        take: 20, // 限制候选数量
      });
      
      // 查找规范化后匹配的卡片
      existingCard = candidates.find(c => normalizeText(c.frontContent) === normalizedInput) || null;
    }

    // 如果找到现有卡片，复用其分析和音频数据
    if (existingCard && existingCard.backContent) {
      console.log(`Found existing card for text: ${text.substring(0, 30)}... - reusing cached data`);
      
      // 确保牌组存在
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

      // 创建新卡片，复用现有数据
      const card = await prisma.card.create({
        data: {
          userId,
          deckId: deck.id,
          sourceId: sourceId || null,
          pageNumber: pageNumber || null,
          category,
          frontContent: text,
          backContent: existingCard.backContent,
          cardType: cardType || '问答题（附翻转卡片）',
          audioUrl: existingCard.audioUrl,
          audioFilename: existingCard.audioFilename,
          timestamps: existingCard.timestamps ? JSON.parse(JSON.stringify(existingCard.timestamps)) : null,
          kanaText: existingCard.kanaText,
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
            pageNumber: card.pageNumber,
            createdAt: card.createdAt,
          },
          credits: remainingCredits,
          cachedFromExisting: true, // 标记为复用现有数据
          llmInteraction: null,
          ttsInteraction: null,
        })
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
    let llmInteraction: {
      model: string;
      systemPrompt: string;
      userPrompt: string;
      response: string;
    } | null = null;

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

    if (!analysis) {
      // 检查 DashScope API Key
      if (!process.env.DASHSCOPE_API_KEY) {
        return NextResponse.json(
          errorResponse(ErrorCodes.INTERNAL_ERROR, 'DashScope API key is not configured'),
          { status: 500 }
        );
      }

      // 直接调用 DashScope API 进行 LLM 分析
      const systemContent = "你是一个有帮助的助手，擅长将日文翻译成中文，并能对日文句子进行详细的语言分析，包括单词的假名读音、罗马文读音、中文解释和语法点解释。";
      const userContent = `请将以下日文句子翻译成中文。在翻译之后，请对句子中的主要单词和语法点进行详细解释。请按照以下格式输出：
**中文翻译：**
[翻译结果]
**句子读法：**
- [句子假名读音]
- [句子罗马文读音]
**单词解释：**
- [日文单词]（[假名读音]）（[罗马文读音]）：[中文意思]
... (列出句子中的主要单词及其假名读音和中文解释)
**语法点解释：**
- [日文语法点]（[假名读音]）（[罗马文读音]）：[解释]
... (列出句子中的主要语法点及其解释)
日文句子：
${text}`;

      // 使用 OpenAI 兼容 Chat Completions API 调用 qwen3.5-plus
      const openai = new OpenAI({
        apiKey: process.env.DASHSCOPE_API_KEY,
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
      });

      const completion = await openai.chat.completions.create({
        model: 'qwen3.5-plus',
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent }
        ]
      });

      const markdownContent = completion.choices[0]?.message?.content;
      
      if (!markdownContent) {
        return NextResponse.json(
          errorResponse(ErrorCodes.INTERNAL_ERROR, 'Invalid response from LLM service'),
          { status: 500 }
        );
      }

      // 提取假名和转换HTML
      const kanaText = extractKanaFromLLMResult(markdownContent);
      const htmlContent = markdownToHtml(markdownContent);
      
      // 捕获 LLM 交互详情
      llmInteraction = {
        model: 'qwen3.5-plus',
        systemPrompt: systemContent,
        userPrompt: userContent,
        response: markdownContent,
      };
      
      // 消耗 2 credits 用于 LLM 分析
      await consumeCredits(userId, 2);

      analysis = {
        markdown: markdownContent,
        html: htmlContent,
        kanaText: kanaText || text,
      };
    }

    // 2. 生成 TTS（如果需要）或使用提供的音频URL
    let audioUrl: string | null = providedAnalysis?.audioUrl || null;
    let audioFilename: string | null = null;
    let timestamps: Array<{ text: string; begin_time: number; end_time: number }> | null = providedAnalysis?.timestamps || null;

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
        pageNumber: pageNumber || null,  // PDF page number for page-level association
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
          pageNumber: card.pageNumber,
          createdAt: card.createdAt,
        },
        credits: remainingCredits,
        // LLM interaction details for transparency
        llmInteraction: llmInteraction,
        ttsInteraction: includePronunciation ? {
          input: text,
          kanaText: analysis.kanaText,
          audioUrl: audioUrl,
        } : null,
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

