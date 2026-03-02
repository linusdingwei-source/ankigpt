import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserId } from '@/lib/anonymous-user';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response';
import WebSocket from 'ws';

const API_KEY = process.env.DASHSCOPE_API_KEY;
const MODEL = 'qwen3-asr-flash-realtime';
const BASE_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime';

interface AsrSession {
  ws: WebSocket;
  transcript: string;
  isFinished: boolean;
  chunks: string[];
}

// Store active sessions (in production, use Redis or similar)
const sessions = new Map<string, AsrSession>();

// POST: Initialize session and receive audio chunks
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = await getUserId(session, request);
    
    if (!userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required'),
        { status: 401 }
      );
    }

    if (!API_KEY) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, 'DASHSCOPE_API_KEY not configured'),
        { status: 500 }
      );
    }

    const body = await request.json();
    const { action, sessionId, audioChunk, language = 'ja' } = body;

    if (action === 'start') {
      // Create new ASR session
      const newSessionId = `asr_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      const wsUrl = `${BASE_URL}?model=${MODEL}`;
      
      return new Promise((resolve) => {
        const ws = new WebSocket(wsUrl, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        });

        const session: AsrSession = {
          ws,
          transcript: '',
          isFinished: false,
          chunks: []
        };

        ws.on('open', () => {
          // Send session update with VAD
          const sessionUpdate = {
            event_id: `event_${Date.now()}`,
            type: 'session.update',
            session: {
              modalities: ['text'],
              input_audio_format: 'pcm',
              sample_rate: 16000,
              input_audio_transcription: {
                language: language
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.0,
                silence_duration_ms: 400
              }
            }
          };
          ws.send(JSON.stringify(sessionUpdate));
          
          sessions.set(newSessionId, session);
          
          resolve(NextResponse.json(
            successResponse({ sessionId: newSessionId, status: 'started' })
          ));
        });

        ws.on('message', (message: Buffer) => {
          try {
            const data = JSON.parse(message.toString());
            
            // Handle different event types
            if (data.type === 'input_audio_buffer.speech_started') {
              // Speech started
            } else if (data.type === 'input_audio_buffer.speech_stopped') {
              // Speech stopped
            } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
              // Transcription completed for a segment
              if (data.transcript) {
                session.transcript += data.transcript;
                session.chunks.push(data.transcript);
              }
            } else if (data.type === 'session.finished') {
              // Session finished
              if (data.transcript) {
                session.transcript = data.transcript;
              }
              session.isFinished = true;
            }
          } catch (e) {
            console.error('Failed to parse ASR message:', e);
          }
        });

        ws.on('error', (err: Error) => {
          console.error('ASR WebSocket error:', err);
          sessions.delete(newSessionId);
        });

        ws.on('close', () => {
          // Don't delete immediately to allow fetching final result
          setTimeout(() => {
            sessions.delete(newSessionId);
          }, 30000);
        });

        // Timeout for connection
        setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            resolve(NextResponse.json(
              errorResponse(ErrorCodes.INTERNAL_ERROR, 'Connection timeout'),
              { status: 500 }
            ));
          }
        }, 10000);
      });
    }

    if (action === 'audio' && sessionId && audioChunk) {
      // Send audio chunk
      const session = sessions.get(sessionId);
      if (!session) {
        return NextResponse.json(
          errorResponse(ErrorCodes.NOT_FOUND, 'Session not found'),
          { status: 404 }
        );
      }

      if (session.ws.readyState === WebSocket.OPEN) {
        const appendEvent = {
          event_id: `event_${Date.now()}`,
          type: 'input_audio_buffer.append',
          audio: audioChunk // Already base64 encoded
        };
        session.ws.send(JSON.stringify(appendEvent));
        
        return NextResponse.json(
          successResponse({ 
            status: 'sent',
            currentTranscript: session.transcript,
            chunks: session.chunks
          })
        );
      } else {
        return NextResponse.json(
          errorResponse(ErrorCodes.INTERNAL_ERROR, 'WebSocket not connected'),
          { status: 500 }
        );
      }
    }

    if (action === 'finish' && sessionId) {
      // Finish session
      const session = sessions.get(sessionId);
      if (!session) {
        return NextResponse.json(
          errorResponse(ErrorCodes.NOT_FOUND, 'Session not found'),
          { status: 404 }
        );
      }

      if (session.ws.readyState === WebSocket.OPEN) {
        const finishEvent = {
          event_id: `event_${Date.now()}`,
          type: 'session.finish'
        };
        session.ws.send(JSON.stringify(finishEvent));
      }

      // Wait for final result
      return new Promise((resolve) => {
        const checkFinished = setInterval(() => {
          if (session.isFinished) {
            clearInterval(checkFinished);
            const transcript = session.transcript;
            sessions.delete(sessionId);
            resolve(NextResponse.json(
              successResponse({ 
                status: 'finished',
                transcript,
                chunks: session.chunks
              })
            ));
          }
        }, 100);

        // Timeout
        setTimeout(() => {
          clearInterval(checkFinished);
          const transcript = session.transcript;
          sessions.delete(sessionId);
          resolve(NextResponse.json(
            successResponse({ 
              status: 'finished',
              transcript,
              chunks: session.chunks
            })
          ));
        }, 5000);
      });
    }

    if (action === 'status' && sessionId) {
      // Get current status
      const session = sessions.get(sessionId);
      if (!session) {
        return NextResponse.json(
          errorResponse(ErrorCodes.NOT_FOUND, 'Session not found'),
          { status: 404 }
        );
      }

      return NextResponse.json(
        successResponse({ 
          status: session.isFinished ? 'finished' : 'active',
          transcript: session.transcript,
          chunks: session.chunks
        })
      );
    }

    return NextResponse.json(
      errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid action'),
      { status: 400 }
    );

  } catch (error) {
    console.error('Realtime ASR error:', error);
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to process ASR request'),
      { status: 500 }
    );
  }
}
