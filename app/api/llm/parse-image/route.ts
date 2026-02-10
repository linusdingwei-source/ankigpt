import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { consumeCredits, getCredits } from '@/lib/credits';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';
import OpenAI from "openai";

const LLM_CREDITS_COST = 5; // 图片解析消耗 5 credits

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

    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Image URL is required'),
        { status: 400 }
      );
    }

    // 检查 credits
    const currentCredits = await getCredits(userId);
    
    if (currentCredits < LLM_CREDITS_COST) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INSUFFICIENT_CREDITS,
          'Insufficient credits. Please purchase a package.',
          { credits: currentCredits, required: LLM_CREDITS_COST }
        ),
        { status: 402 }
      );
    }

    // 检查 DashScope API Key
    if (!process.env.DASHSCOPE_API_KEY) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, 'DashScope API key is not configured'),
        { status: 500 }
      );
    }

    // 初始化 OpenAI 客户端 (兼容百炼)
    const openai = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    });

    // 调用 qwen3-vl-plus 进行文档解析
    const response = await openai.chat.completions.create({
      model: "qwen3-vl-plus",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                "url": imageUrl
              }
            },
            {
              type: "text",
              text: "qwenvl markdown"
            }
          ]
        }
      ]
    });

    const content = response.choices[0].message.content;

    if (content) {
      // 消耗 credits
      await consumeCredits(userId, LLM_CREDITS_COST);
      
      const remainingCredits = await getCredits(userId);

      return NextResponse.json(
        successResponse({
          content: content,
          credits: remainingCredits,
        })
      );
    } else {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, 'Invalid response from Qwen-VL service'),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Qwen-VL parsing error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to parse image with Qwen-VL'),
      { status: 500 }
    );
  }
}
