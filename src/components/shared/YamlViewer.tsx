import React, { useState } from 'react';
import { Copy, Check, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface YamlViewerProps {
  resource: unknown;
  title?: string;
  maxHeight?: string;
}

export function YamlViewer({ resource, title = 'YAML', maxHeight = '400px' }: YamlViewerProps) {
  const [copied, setCopied] = useState(false);

  // Convert resource to YAML-like format
  const toYaml = (obj: unknown, indent = 0): string => {
    const spaces = '  '.repeat(indent);
    
    if (obj === null || obj === undefined) {
      return 'null';
    }
    
    if (typeof obj === 'string') {
      // Multi-line strings
      if (obj.includes('\n')) {
        return `|\n${obj.split('\n').map(line => spaces + '  ' + line).join('\n')}`;
      }
      // Strings that need quoting
      if (obj.includes(':') || obj.includes('#') || obj.startsWith(' ') || obj.endsWith(' ')) {
        return `"${obj.replace(/"/g, '\\"')}"`;
      }
      return obj;
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return obj.map(item => {
        if (typeof item === 'object' && item !== null) {
          const inner = toYaml(item, indent + 1);
          const lines = inner.split('\n');
          return `\n${spaces}- ${lines[0]}${lines.slice(1).map(l => '\n' + spaces + '  ' + l.trim()).join('')}`;
        }
        return `\n${spaces}- ${toYaml(item, indent + 1)}`;
      }).join('');
    }
    
    if (typeof obj === 'object') {
      const entries = Object.entries(obj as Record<string, unknown>).filter(
        ([, v]) => v !== undefined
      );
      if (entries.length === 0) return '{}';
      
      return entries.map(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `${spaces}${key}:\n${toYaml(value, indent + 1)}`;
        }
        if (Array.isArray(value)) {
          return `${spaces}${key}:${toYaml(value, indent + 1)}`;
        }
        return `${spaces}${key}: ${toYaml(value, indent)}`;
      }).join('\n');
    }
    
    return String(obj);
  };

  const yaml = toYaml(resource);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCode className="h-4 w-4 text-muted-foreground" />
            {title}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="rounded-lg border bg-muted/30" style={{ maxHeight }}>
          <pre className="p-4 text-xs font-mono whitespace-pre overflow-x-auto">
            {yaml}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
