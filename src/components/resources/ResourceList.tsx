import React from 'react';
import { Plus, Search, MoreVertical, Edit, Trash2, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (item: T) => React.ReactNode;
}

interface ResourceListProps<T> {
  title: string;
  description: string;
  items: T[];
  columns: Column<T>[];
  icon: React.ElementType;
  iconColor: string;
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  getStatus?: (item: T) => string;
  getItemId: (item: T) => string;
}

export function ResourceList<T>({
  title,
  description,
  items,
  columns,
  icon: Icon,
  iconColor,
  onAdd,
  onEdit,
  onDelete,
  onView,
  getStatus,
  getItemId,
}: ResourceListProps<T>) {
  const [search, setSearch] = React.useState('');
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());

  const filteredItems = items.filter((item) => {
    const id = getItemId(item);
    return id.toLowerCase().includes(search.toLowerCase());
  });

  const getStatusVariant = (status: string) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'running':
      case 'ready':
      case 'bound':
      case 'active':
      case 'available':
        return 'success';
      case 'pending':
      case 'creating':
      case 'waiting':
      case 'progressing':
        return 'warning';
      case 'error':
      case 'failed':
      case 'crashloopbackoff':
        return 'error';
      case 'terminating':
      case 'terminated':
      case 'deleting':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `hsl(var(--${iconColor}) / 0.15)` }}
          >
            <Icon className="h-6 w-6" style={{ color: `hsl(var(--${iconColor}))` }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button onClick={onAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Create {title.slice(0, -1)}
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-transparent"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Badge variant="secondary">{filteredItems.length} resources</Badge>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems(new Set(filteredItems.map(getItemId)));
                    } else {
                      setSelectedItems(new Set());
                    }
                  }}
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider',
                    col.width
                  )}
                >
                  {col.header}
                </th>
              ))}
              {getStatus && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              )}
              <th className="w-20 px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredItems.map((item) => {
              const id = getItemId(item);
              const status = getStatus?.(item);
              return (
                <tr
                  key={id}
                  className={cn(
                    'hover:bg-muted/30 transition-colors',
                    selectedItems.has(id) && 'bg-primary/5'
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={selectedItems.has(id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedItems);
                        if (e.target.checked) {
                          newSet.add(id);
                        } else {
                          newSet.delete(id);
                        }
                        setSelectedItems(newSet);
                      }}
                    />
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render ? (
                        col.render(item)
                      ) : (
                        <span className="text-sm text-foreground">
                          {(item as any)[col.key]}
                        </span>
                      )}
                    </td>
                  ))}
                  {status && (
                    <td className="px-4 py-3">
                      <Badge variant={getStatusVariant(status) as any}>{status}</Badge>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border">
                        {onView && (
                          <DropdownMenuItem onClick={() => onView(item)} className="gap-2">
                            <Eye className="h-4 w-4" />
                            View
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(item)} className="gap-2">
                            <Edit className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem
                            onClick={() => onDelete(item)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
          <div className="p-12 text-center">
            <Icon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No resources found</p>
            <Button variant="outline" className="mt-4" onClick={onAdd}>
              Create your first resource
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
