import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, StopCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChatMessage } from './ChatMessage';
import { useAgentChat } from '@/hooks/useAgentChat';
import type { Agent } from '@/types/kubernetes';

interface AgentChatProps {
  agent: Agent;
}

export function AgentChat({ agent }: AgentChatProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, error, sendMessage, clearMessages, stopGeneration } = useAgentChat({
    agentName: agent.metadata.name,
    namespace: agent.metadata.namespace || 'default',
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border border-border overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Chat with {agent.metadata.name}</span>
          {messages.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({messages.length} messages)
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearMessages}
          disabled={messages.length === 0}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="m-4 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-col gap-2">
              <span className="font-medium">
                {error.includes('503') || error.includes('no endpoints') 
                  ? 'Agent Unavailable' 
                  : 'Connection Error'}
              </span>
              <span className="text-sm opacity-90">
                {error.includes('no endpoints') 
                  ? 'The agent pod is not ready. Check that the pod is running and healthy.'
                  : error}
              </span>
              <div className="flex gap-2 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => messages.length > 1 && sendMessage(messages[messages.length - 2]?.content || '')}
                  className="h-7 text-xs"
                  disabled={messages.length < 2}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <div className="h-16 w-16 rounded-full bg-agent/10 flex items-center justify-center mb-4">
              <span className="text-3xl">🤖</span>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Start a conversation
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Send a message to {agent.metadata.name} to begin chatting.
              The agent uses the <span className="font-mono text-agent">{agent.spec.modelAPI}</span> model.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                isStreaming={message.isStreaming}
                timestamp={message.timestamp}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-muted/20">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            className="min-h-[44px] max-h-32 resize-none bg-background"
            disabled={isLoading}
            rows={1}
          />
          {isLoading ? (
            <Button
              type="button"
              onClick={stopGeneration}
              variant="destructive"
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim()}
              size="icon"
              className="h-11 w-11 shrink-0 bg-agent hover:bg-agent/90"
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
