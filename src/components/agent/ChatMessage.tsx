import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Bot, User, Copy, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  timestamp?: Date;
}

// Detect if the message contains an error pattern
function detectError(content: string): { isError: boolean; errorType: string } {
  const errorPatterns = [
    { pattern: /error.*404.*not found/i, type: 'Not Found (404)' },
    { pattern: /error.*503.*service unavailable/i, type: 'Service Unavailable (503)' },
    { pattern: /error.*500.*internal server/i, type: 'Internal Server Error (500)' },
    { pattern: /client error/i, type: 'Client Error' },
    { pattern: /connection refused/i, type: 'Connection Refused' },
    { pattern: /timeout/i, type: 'Timeout' },
    { pattern: /sorry,? i encountered an error/i, type: 'Agent Error' },
    { pattern: /failed to/i, type: 'Operation Failed' },
  ];

  for (const { pattern, type } of errorPatterns) {
    if (pattern.test(content)) {
      return { isError: true, errorType: type };
    }
  }
  return { isError: false, errorType: '' };
}

// Safely convert content to string, handling objects
function safeContentToString(content: unknown): string {
  if (content === null || content === undefined) {
    return '';
  }
  if (typeof content === 'string') {
    return content;
  }
  if (typeof content === 'object') {
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return '[Object]';
    }
  }
  return String(content);
}

export function ChatMessage({ role, content, isStreaming, timestamp }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  
  // Ensure content is always a string
  const safeContent = safeContentToString(content);
  
  const isAssistant = role === 'assistant';
  const { isError, errorType } = isAssistant ? detectError(safeContent) : { isError: false, errorType: '' };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(safeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'group flex gap-3 py-4 px-4',
        isAssistant ? 'bg-muted/30' : 'bg-background',
        isError && 'bg-destructive/10 border-l-2 border-destructive'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center',
          isError ? 'bg-destructive/20' : isAssistant ? 'bg-agent/20' : 'bg-primary/20'
        )}
      >
        {isError ? (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        ) : isAssistant ? (
          <Bot className="h-4 w-4 text-agent" />
        ) : (
          <User className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-medium",
            isError ? "text-destructive" : "text-foreground"
          )}>
            {isError ? `Error: ${errorType}` : isAssistant ? 'Agent' : 'You'}
          </span>
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString()}
            </span>
          )}
          {isStreaming && !isError && (
            <span className="flex items-center gap-1 text-xs text-agent">
              <span className="h-1.5 w-1.5 rounded-full bg-agent animate-pulse" />
              Generating...
            </span>
          )}
        </div>

        <div className={cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "prose-headings:text-foreground prose-p:text-foreground/90",
          "prose-strong:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
          "prose-pre:bg-muted prose-pre:border prose-pre:border-border",
          "prose-ul:text-foreground/90 prose-ol:text-foreground/90 prose-li:text-foreground/90",
          "prose-a:text-primary prose-a:underline",
          isError && "prose-p:text-destructive/80 prose-headings:text-destructive"
        )}>
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="leading-relaxed mb-2 last:mb-0">{children}</p>,
              code: ({ children, className }) => {
                const isBlock = className?.includes('language-');
                return isBlock ? (
                  <code className={cn("block overflow-x-auto", className)}>{children}</code>
                ) : (
                  <code className="text-sm">{children}</code>
                );
              },
            }}
          >
            {safeContent}
          </ReactMarkdown>
          {isStreaming && !isError && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-agent/60 animate-pulse" />
          )}
        </div>

        {/* Error hint */}
        {isError && (
          <p className="text-xs text-muted-foreground mt-2">
            Check the Pods tab for more diagnostics information.
          </p>
        )}

        {/* Actions */}
        {safeContent && !isStreaming && (
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
