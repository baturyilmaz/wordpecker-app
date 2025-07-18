import { useState, useCallback, useRef, useEffect } from 'react';
import { RealtimeSession } from '@openai/agents-realtime';
import { voiceAgentService } from './index';
import { VoiceAgentConfig, ConversationMessage, VoiceAgentStatus, UseVoiceAgentReturn } from './types';
import { apiService } from '../../services/api';

export function useVoiceAgent(): UseVoiceAgentReturn {
  const [status, setStatus] = useState<VoiceAgentStatus>('idle');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const sessionRef = useRef<RealtimeSession | null>(null);
  const configRef = useRef<VoiceAgentConfig | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  
  const isConnected = status === 'connected' || status === 'listening' || status === 'speaking' || status === 'processing';

  // Add message to conversation
  const addMessage = useCallback((type: 'user' | 'assistant', content: string) => {
    const message: ConversationMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
    };
    setConversation(prev => [...prev, message]);
  }, []);

  // Handle session events
  const setupSessionEvents = useCallback((session: RealtimeSession) => {
    // User speech detected
    (session as any).on('user_speech_started', () => {
      setStatus('listening');
    });

    // Agent response started
    (session as any).on('agent_response_started', () => {
      setStatus('speaking');
    });

    // Agent response completed
    (session as any).on('agent_response_completed', () => {
      setStatus('connected');
    });

    // History updated - convert to conversation format
    (session as any).on('history_updated', (history: any) => {
      console.log('History updated:', history);
      
      // Convert entire history to our conversation format
      const messages: ConversationMessage[] = [];
      
      history.forEach((item: any, index: number) => {
        if (item.type === 'message') {
          if (item.role === 'user' && item.content?.[0]?.transcript) {
            // Only add if transcript has content
            const transcript = item.content[0].transcript.trim();
            if (transcript) {
              messages.push({
                id: item.id || `user-${index}-${Date.now()}`,
                type: 'user',
                content: transcript,
                timestamp: new Date(),
              });
            }
          } else if (item.role === 'assistant' && item.content?.[0]?.transcript) {
            // Only add if transcript has content
            const transcript = item.content[0].transcript.trim();
            if (transcript) {
              messages.push({
                id: item.id || `assistant-${index}-${Date.now()}`,
                type: 'assistant',
                content: transcript,
                timestamp: new Date(),
              });
            }
          }
        }
      });
      
      // Only update if we have actual messages with content
      setConversation(prev => {
        // Check if content actually changed by comparing serialized versions
        const prevSerialized = JSON.stringify(prev.map(m => ({ type: m.type, content: m.content })));
        const newSerialized = JSON.stringify(messages.map(m => ({ type: m.type, content: m.content })));
        
        if (prevSerialized !== newSerialized) {
          console.log('Setting conversation with', messages.length, 'messages');
          return messages;
        }
        
        return prev;
      });
    });

    // Tool calls
    (session as any).on('tool_call_started', () => {
      setStatus('processing');
    });

    (session as any).on('tool_call_completed', () => {
      setStatus('connected');
    });

    // Interruptions
    (session as any).on('audio_interrupted', () => {
      setStatus('connected');
    });

    // Errors
    (session as any).on('error', (error: any) => {
      console.error('Voice agent error:', error);
      setError(error.message || 'An error occurred with the voice agent');
      setStatus('error');
    });

  }, []);

  // Start conversation
  const startConversation = useCallback(async (config: VoiceAgentConfig) => {
    // Prevent multiple concurrent connections
    if (status === 'connecting' || isConnected) {
      console.warn('Connection already in progress or active');
      return;
    }

    try {
      setStatus('connecting');
      setError(null);
      configRef.current = config;

      // Reset conversation and message counter for new session
      setConversation([]);
      lastMessageCountRef.current = 0;

      // Ensure any existing session is properly cleaned up
      if (sessionRef.current) {
        console.log('Cleaning up existing session before starting new one');
        await voiceAgentService.disconnect();
        sessionRef.current = null;
      }

      // Get ephemeral token from backend
      const tokenResponse = await apiService.createVoiceSession(config.listId);
      
      if (!tokenResponse.success) {
        throw new Error('Failed to create voice session');
      }

      // Create agent and connect
      await voiceAgentService.createAgent(config);
      const session = await voiceAgentService.connect(tokenResponse.data.clientSecret);
      
      sessionRef.current = session;
      setupSessionEvents(session);
      
      setStatus('connected');
      
      // Don't auto-add welcome message - let the AI start naturally
      
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
      setStatus('error');
    }
  }, [setupSessionEvents, addMessage, status, isConnected]);

  // End conversation
  const endConversation = useCallback(async () => {
    try {
      setStatus('disconnecting');
      
      if (sessionRef.current) {
        // Remove event listeners
        if ('removeAllListeners' in sessionRef.current && typeof (sessionRef.current as any).removeAllListeners === 'function') {
          (sessionRef.current as any).removeAllListeners();
        }
      }
      
      await voiceAgentService.disconnect();
      sessionRef.current = null;
      configRef.current = null;
      lastMessageCountRef.current = 0;
      
      setStatus('idle');
      
    } catch (err) {
      console.error('Failed to end conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to end conversation');
      setStatus('error');
    }
  }, []);

  // Send text message
  const sendMessage = useCallback((message: string) => {
    try {
      if (!isConnected) {
        throw new Error('Not connected to voice agent');
      }
      
      voiceAgentService.sendMessage(message);
      addMessage('user', message);
      
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [isConnected, addMessage]);

  // Interrupt agent
  const interrupt = useCallback(() => {
    try {
      voiceAgentService.interrupt();
    } catch (err) {
      console.error('Failed to interrupt:', err);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
    if (status === 'error') {
      setStatus('idle');
    }
  }, [status]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setConversation([]);
    lastMessageCountRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        endConversation();
      }
    };
  }, [endConversation]);

  return {
    // State
    status,
    conversation,
    isConnected,
    error,
    
    // Actions
    startConversation,
    endConversation,
    sendMessage,
    interrupt,
    
    // Utils
    clearError,
    clearConversation,
  };
}