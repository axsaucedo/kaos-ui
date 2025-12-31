import React from 'react';
import { cn } from '@/lib/utils';
import { Bot, User, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  timestamp?: Date;
}

export function ChatMessage({ role, content, isStreaming, timestamp }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  
  const isAssistant = role === 'assistant';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'group flex gap-3 py-4 px-4',
        isAssistant ? 'bg-muted/30' : 'bg-background'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center',
          isAssistant ? 'bg-agent/20' : 'bg-primary/20'
        )}
      >
        {isAssistant ? (
          <Bot className="h-4 w-4 text-agent" />
        ) : (
          <User className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {isAssistant ? 'Agent' : 'You'}
          </span>
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString()}
            </span>
          )}
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-agent">
              <span className="h-1.5 w-1.5 rounded-full bg-agent animate-pulse" />
              Generating...
            </span>
          )}
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
            {content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-agent/60 animate-pulse" />
            )}
          </p>
        </div>

        {/* Actions */}
        {content && !isStreaming && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
