import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { consumeCredits, getCredits } from '@/lib/credits';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';
import OpenAI from 'openai';

const LLM_CREDITS_COST = 0.02; // 文本提炼消耗 0.02 credits (100次调用=2credits)

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
    const systemContent = "你是一个专业的日语教学专家。你的任务是分析日语学习资料，提炼其中的核心知识点，包括核心单词和练习句子。";
    const userContent = `以下是一段日语学习资料（Markdown格式），其中可能包含中文讲解、日语例句和词汇说明。请你：
1. 提炼出资料中涉及的核心单词（Vocabulary）和核心知识点。
2. 基于这些知识点，生成 5-10 个纯日语练习句子。
3. 请按照以下严格格式输出，以便我进行程序解析：

[VOCABULARY]
单词1
单词2
...

[SENTENCES]
句子1
句子2
...

注意：
- [VOCABULARY] 下方只列出单词原文，不要包含假名、翻译或编号，每个单词占一行。
- [SENTENCES] 下方只列出生成的日语例句，不要包含翻译或编号，每个句子占一行。
- 不要包含任何其他描述性文字或 Markdown 格式（如 ### 或 **）。

学习资料内容：
${markdown}`;

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

    const resultText = completion.choices[0]?.message?.content;

    if (resultText) {
      // 消耗 credits
      await consumeCredits(userId, LLM_CREDITS_COST);
      
      const remainingCredits = await getCredits(userId);

      // 解析结果
      const vocabulary: string[] = [];
      const sentences: string[] = [];
      
      let currentSection: 'NONE' | 'VOCABULARY' | 'SENTENCES' = 'NONE';
      const lines = resultText.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        if (trimmed.includes('[VOCABULARY]')) {
          currentSection = 'VOCABULARY';
          continue;
        } else if (trimmed.includes('[SENTENCES]')) {
          currentSection = 'SENTENCES';
          continue;
        }
        
        if (currentSection === 'VOCABULARY') {
          vocabulary.push(trimmed);
        } else if (currentSection === 'SENTENCES') {
          sentences.push(trimmed);
        }
      }

      return NextResponse.json(
        successResponse({
          vocabulary,
          sentences,
          credits: remainingCredits,
          // LLM interaction details for transparency
          llmInteraction: {
            model: 'qwen3.5-plus',
            systemPrompt: systemContent,
            userPrompt: userContent.substring(0, 500) + (userContent.length > 500 ? '...' : ''),
            response: resultText,
          }
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
