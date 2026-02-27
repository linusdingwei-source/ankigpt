import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';
import OpenAI from "openai";

// Note: This API does not charge credits because it's primarily used
// as part of the PDF-to-card flow, where credits are charged at card generation.

const PARSE_IMAGE_PROMPT = "提取图片内容整理成markdown";

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

    const { imageUrl, imageBase64 } = await request.json();

    // Accept either imageUrl or imageBase64
    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        errorResponse(ErrorCodes.BAD_REQUEST, 'Image URL or base64 data is required'),
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

    // 初始化 OpenAI 客户端 (兼容百炼)
    const openai = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    });

    // Prepare image content - prefer base64 if provided (avoids needing to upload)
    // Use jpeg format for smaller payload size
    const imageContent = imageBase64 
      ? `data:image/jpeg;base64,${imageBase64}`
      : imageUrl;

    // Log base64 size for debugging
    let imageSizeKB = 0;
    if (imageBase64) {
      imageSizeKB = Math.round(imageBase64.length * 0.75 / 1024); // base64 is ~33% larger
      console.log(`Parsing image: base64 size ~${imageSizeKB}KB`);
    }

    // 调用 qwen3.5-plus 进行文档解析
    const response = await openai.chat.completions.create({
      model: "qwen3.5-plus",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                "url": imageContent
              }
            },
            {
              type: "text",
              text: PARSE_IMAGE_PROMPT
            }
          ]
        }
      ]
    });

    const content = response.choices[0].message.content;

    if (content) {
      return NextResponse.json(
        successResponse({
          content: content,
          // LLM interaction details for transparency
          llmInteraction: {
            model: "qwen3.5-plus",
            prompt: PARSE_IMAGE_PROMPT,
            imageUrl: imageUrl || null,
            imageSizeKB: imageSizeKB || null,
            response: content,
          }
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
    
    // Extract more detailed error info
    let errorMessage = 'Failed to parse image with Qwen-VL';
    if (error instanceof Error) {
      errorMessage = `Qwen-VL error: ${error.message}`;
    }
    
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, errorMessage),
      { status: 500 }
    );
  }
}
