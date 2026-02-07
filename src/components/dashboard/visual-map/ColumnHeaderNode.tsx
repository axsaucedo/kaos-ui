import React from 'react';
import { Plus } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { ColumnHeaderData } from './types';

interface ColumnHeaderNodeProps {
  data: ColumnHeaderData & { onAdd?: () => void };
}

export function ColumnHeaderNode({ data }: ColumnHeaderNodeProps) {
  return (
    <div className="flex items-center gap-2 pointer-events-auto select-none">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
        {data.label}
      </span>
      <span className="text-[10px] text-muted-foreground/40">({data.count})</span>
      {data.onAdd && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={data.onAdd}
              className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:text-primary text-muted-foreground/40 transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Create {data.label?.replace(/s$/, '')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
