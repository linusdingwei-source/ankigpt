import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { consumeCredits, getCredits } from '@/lib/credits';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';

const LLM_CREDITS_COST = 2; // 文本提炼消耗 2 credits

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    // 获取用户 ID
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'),
        { status: 401 }
      );
    }

    const { markdown } = await request.json();

    if (!markdown) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Markdown content is required'),
        { status: 400 }
      );
    }

    // 检查 DashScope API Key
    if (!process.env.DASHSCOPE_API_KEY) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, 'DashScope API key is not configured'),
        { status: 500 }
      );
    }

    // 检查 credits
    const currentCredits = await getCredits(userId);
    
    if (currentCredits < LLM_CREDITS_COST) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INSUFFICIENT_CREDITS,
          'Insufficient credits',
          { credits: currentCredits, required: LLM_CREDITS_COST }
        ),
        { status: 402 }
      );
    }

    // 构建 LLM Prompt
    const systemContent = "你是一个专业的日语教学专家。你的任务是分析日语学习资料，提炼其中的核心知识点，并生成高质量的练习句子。";
    const userContent = `以下是一段日语学习资料（Markdown格式），其中可能包含中文讲解、日语例句和词汇说明。请你：
1. 提炼出资料中涉及的核心单词（Vocabulary）、语法点（Grammar）和知识点。
2. 基于这些知识点，生成 5-10 个纯日语例句。
3. 这些句子应该尽量覆盖提炼出的知识点，且难度适中。
4. **注意：** 只输出生成的日语例句，每个句子占一行，不要包含任何编号、中文解释或其他描述性文字。直接输出日文句子。

学习资料内容：
${markdown}`;

    // 调用 DashScope API (qwen-plus)
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        input: {
          messages: [
            {
              role: 'system',
              content: systemContent
            },
            {
              role: 'user',
              content: userContent
            }
          ]
        },
        parameters: {
          result_format: 'message'
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, 'LLM refinement failed', errorData),
        { status: response.status }
      );
    }

    const data = await response.json();
    const resultText = data.output?.choices?.[0]?.message?.content;

    if (resultText) {
      // 消耗 credits
      await consumeCredits(userId, LLM_CREDITS_COST);
      
      const remainingCredits = await getCredits(userId);

      // 按行拆分句子
      const sentences = resultText
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && !s.startsWith('#') && !s.startsWith('*'));

      return NextResponse.json(
        successResponse({
          sentences: sentences,
          credits: remainingCredits,
        })
      );
    } else {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, 'Invalid response from LLM service'),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('LLM refinement error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to refine content'),
      { status: 500 }
    );
  }
}
