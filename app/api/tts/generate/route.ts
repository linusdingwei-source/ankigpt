import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { consumeCredits, getCredits } from '@/lib/credits';

// Using Web Speech API via a service
// For production, you might want to use a service like Google Cloud TTS, Azure TTS, or AWS Polly
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

    if (text.length > 500) {
      return NextResponse.json(
        { error: 'Text is too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Check and consume credits
    const userId = session.user.id as string;
    const currentCredits = await getCredits(userId);
    
    if (currentCredits < 1) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits. Please purchase a package.',
          credits: currentCredits 
        },
        { status: 402 }
      );
    }

    // Consume 1 credit
    const creditConsumed = await consumeCredits(userId, 1);
    if (!creditConsumed) {
      return NextResponse.json(
        { error: 'Failed to consume credits' },
        { status: 500 }
      );
    }

    // For demo purposes, we'll use a simple approach
    // In production, you should use a proper TTS service
    // Here's an example using a free API service (you may need to replace with your preferred service)
    
    // Option 1: Use Google Cloud TTS (requires API key)
    // Option 2: Use a free TTS API
    // Option 3: Use browser's SpeechSynthesis API (client-side)
    
    // For now, we'll create a placeholder that returns a base64 encoded audio
    // You should replace this with actual TTS service integration
    
    // Example: Using a mock response
    // In production, integrate with actual TTS service like:
    // - Google Cloud Text-to-Speech
    // - Azure Cognitive Services
    // - AWS Polly
    // - OpenAI TTS
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'alloy', // You can change to other voices
        language: 'ja', // Japanese
      }),
    });

    if (!response.ok) {
      // Fallback: Return a simple message indicating TTS service is not configured
      // In production, you should properly configure a TTS service
      return NextResponse.json(
        { 
          error: 'TTS service not configured. Please set OPENAI_API_KEY or configure another TTS service.',
          fallback: true 
        },
        { status: 503 }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    const remainingCredits = await getCredits(userId);

    return NextResponse.json({
      success: true,
      audio: base64Audio,
      format: 'mp3',
      credits: remainingCredits,
    });
  } catch (error) {
    console.error('TTS generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    );
  }
}

