import type { ColumnHeaderData } from './types';

export function ColumnHeaderNode({ data }: { data: ColumnHeaderData }) {
  return (
    <div className="text-center pointer-events-none select-none">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
        {data.label}
      </span>
      <span className="ml-2 text-[10px] text-muted-foreground/40">({data.count})</span>
    </div>
  );
}
