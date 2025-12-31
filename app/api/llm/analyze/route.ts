import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { consumeCredits, getCredits } from '@/lib/credits';
import { extractKanaFromLLMResult, markdownToHtml } from '@/lib/llm-utils';

const LLM_CREDITS_COST = 2; // LLM 分析消耗 2 credits

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

    if (text.length > 1000) {
      return NextResponse.json(
        { error: 'Text is too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // 检查 credits
    const userId = session.user.id as string;
    const currentCredits = await getCredits(userId);
    
    if (currentCredits < LLM_CREDITS_COST) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits. Please purchase a package.',
          credits: currentCredits,
          required: LLM_CREDITS_COST
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

    // 构建 LLM Prompt
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

    // 调用 DashScope API
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
      console.error('DashScope API error:', errorData);
      return NextResponse.json(
        { error: 'LLM analysis failed', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (data.output?.choices?.[0]?.message?.content) {
      const markdownContent = data.output.choices[0].message.content;
      
      // 提取假名
      const kanaText = extractKanaFromLLMResult(markdownContent);
      
      // 转换为 HTML
      const htmlContent = markdownToHtml(markdownContent);
      
      // 消耗 credits
      await consumeCredits(userId, LLM_CREDITS_COST);
      
      const remainingCredits = await getCredits(userId);

      return NextResponse.json({
        success: true,
        analysis: {
          markdown: markdownContent,
          html: htmlContent,
          kanaText: kanaText || text, // 如果没有提取到假名，使用原文
        },
        credits: remainingCredits,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid response from LLM service' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('LLM analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze text' },
      { status: 500 }
    );
  }
}

