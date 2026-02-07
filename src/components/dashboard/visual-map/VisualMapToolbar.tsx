import React from 'react';
import { Search, LayoutGrid, Maximize, Lock, Unlock, ArrowRight, ArrowLeft, ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { ResourceKind, LayoutDirection } from './types';
import { LAYOUT_OPTIONS } from './types';

interface VisualMapToolbarProps {
  kindFilter: Set<ResourceKind>;
  statusFilter: Set<string>;
  searchQuery: string;
  isLocked: boolean;
  direction: LayoutDirection;
  onToggleKind: (kind: ResourceKind) => void;
  onToggleStatus: (status: string) => void;
  onSearchChange: (query: string) => void;
  onReLayout: () => void;
  onFitView: () => void;
  onToggleLock: () => void;
  onChangeDirection: (dir: LayoutDirection) => void;
}

const KIND_CHIPS: { kind: ResourceKind; label: string; colorVar: string }[] = [
  { kind: 'ModelAPI', label: 'ModelAPI', colorVar: '--modelapi-color' },
  { kind: 'MCPServer', label: 'MCPServer', colorVar: '--mcpserver-color' },
  { kind: 'Agent', label: 'Agent', colorVar: '--agent-color' },
];

const DIR_ICONS: Record<LayoutDirection, typeof ArrowRight> = {
  LR: ArrowRight,
  RL: ArrowLeft,
  TB: ArrowDown,
  BT: ArrowUp,
};

export function VisualMapToolbar({
  kindFilter,
  statusFilter,
  searchQuery,
  isLocked,
  direction,
  onToggleKind,
  onToggleStatus,
  onSearchChange,
  onReLayout,
  onFitView,
  onToggleLock,
  onChangeDirection,
}: VisualMapToolbarProps) {
  // Cycle through directions on click
  const cycleDirection = () => {
    const dirs: LayoutDirection[] = ['LR', 'RL', 'TB', 'BT'];
    const next = dirs[(dirs.indexOf(direction) + 1) % dirs.length];
    onChangeDirection(next);
  };

  const DirIcon = DIR_ICONS[direction];
  const dirLabel = LAYOUT_OPTIONS.find(o => o.value === direction)?.label || direction;

  return (
    <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 w-48 pl-7 text-xs bg-card/90 backdrop-blur-sm border-border"
        />
      </div>

      {/* Kind filter chips */}
      <div className="flex items-center gap-1">
        {KIND_CHIPS.map((chip) => {
          const active = kindFilter.has(chip.kind);
          return (
            <button
              key={chip.kind}
              onClick={() => onToggleKind(chip.kind)}
              className={`
                text-[10px] font-medium px-2 py-1 rounded-full border transition-all duration-150
                ${active
                  ? 'border-border bg-card text-foreground shadow-sm'
                  : 'border-transparent bg-muted/50 text-muted-foreground/50'
                }
              `}
              style={active ? { borderLeftColor: `hsl(var(${chip.colorVar}))`, borderLeftWidth: 3 } : undefined}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1">
        {['ready', 'pending', 'failed'].map((status) => {
          const active = statusFilter.has(status);
          return (
            <button
              key={status}
              onClick={() => onToggleStatus(status)}
              className={`
                text-[10px] px-2 py-0.5 rounded-full capitalize transition-all duration-150
                ${active ? 'bg-secondary text-foreground' : 'text-muted-foreground/40 hover:text-muted-foreground'}
              `}
            >
              {status}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Layout controls */}
      <div className="flex items-center gap-1 bg-card/90 backdrop-blur-sm rounded-lg border border-border px-1 py-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" onClick={cycleDirection} className="h-7 px-1.5 gap-1 text-[10px]">
              <DirIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{dirLabel}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Change layout direction</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" onClick={onReLayout} className="h-7 w-7 p-0">
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Re-layout (resets positions)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" onClick={onFitView} className="h-7 w-7 p-0">
              <Maximize className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to view</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="xs" onClick={onToggleLock} className={`h-7 w-7 p-0 ${isLocked ? 'text-primary' : ''}`}>
              {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isLocked ? 'Unlock positions' : 'Lock positions'}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
