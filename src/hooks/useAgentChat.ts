/**
 * Hook for managing chat state and streaming with an Agent
 */

import { useState, useCallback, useRef } from 'react';
import { k8sClient } from '@/lib/kubernetes-client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface UseAgentChatOptions {
  agentName: string;
  namespace: string;
  serviceName?: string; // Override service name if different from agent name
  model?: string;
  temperature?: number;
  sessionId?: string; // Optional session ID for conversation continuity
  onSessionIdReceived?: (sessionId: string) => void; // Callback when session ID is received from response
}

export function useAgentChat(options: UseAgentChatOptions) {
  const { agentName, namespace, serviceName, model, temperature, sessionId, onSessionIdReceived } = options;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Determine service name (convention: agent-<name> is the service name)
  const resolvedServiceName = serviceName || `agent-${agentName}`;

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Create assistant placeholder
    const assistantMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);

    // Build message history for API
    const apiMessages = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      console.log(`[useAgentChat] Sending to service: ${resolvedServiceName} in namespace: ${namespace}`);
      console.log(`[useAgentChat] Messages:`, apiMessages);
      
      await k8sClient.streamChatCompletion(
        resolvedServiceName,
        apiMessages,
        {
          namespace,
          model,
          temperature,
          sessionId,
          onChunk: (chunk) => {
            console.log(`[useAgentChat] Received chunk:`, chunk);
            setMessages(prev => {
              const updated = [...prev];
              const lastMessage = updated[updated.length - 1];
              if (lastMessage.role === 'assistant') {
                lastMessage.content += chunk;
              }
              return updated;
            });
          },
          onDone: (metadata) => {
            console.log(`[useAgentChat] Stream complete`, metadata);
            // If we received a session ID and have a callback, call it
            if (metadata?.sessionId && onSessionIdReceived) {
              onSessionIdReceived(metadata.sessionId);
            }
            setMessages(prev => {
              const updated = [...prev];
              const lastMessage = updated[updated.length - 1];
              if (lastMessage.role === 'assistant') {
                lastMessage.isStreaming = false;
              }
              return updated;
            });
            setIsLoading(false);
          },
          onError: (err) => {
            console.error('[useAgentChat] Stream error:', err);
            setError(err.message);
            setMessages(prev => {
              const updated = [...prev];
              const lastMessage = updated[updated.length - 1];
              if (lastMessage.role === 'assistant') {
                lastMessage.isStreaming = false;
                lastMessage.content = lastMessage.content || 'Error: Failed to get response';
              }
              return updated;
            });
            setIsLoading(false);
          },
        }
      );
    } catch (err) {
      console.error('[useAgentChat] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  }, [messages, isLoading, resolvedServiceName, namespace, model, temperature, sessionId, onSessionIdReceived]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages(prev => {
      const updated = [...prev];
      const lastMessage = updated[updated.length - 1];
      if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
        lastMessage.isStreaming = false;
      }
      return updated;
    });
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    stopGeneration,
  };
}
