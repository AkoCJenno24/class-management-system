import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
} from 'lucide-react';
import { formatBytes } from './document-utils';

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number; // 0 to 100
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface UploadProgressWidgetProps {
  items: UploadItem[];
  onDismiss: () => void;
  onRemoveItem?: (id: string) => void;
}

export function UploadProgressWidget({
  items,
  onDismiss,
}: UploadProgressWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (items.length === 0) return null;

  const totalUploading = items.filter((i) => i.status === 'uploading').length;
  const totalCompleted = items.filter((i) => i.status === 'completed').length;
  const isAllDone = totalUploading === 0;

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 shadow-2xl border-border bg-card overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/60 border-b border-border select-none">
        <div className="flex items-center gap-2 min-w-0">
          <UploadCloud className="size-4 text-primary shrink-0" />
          <span className="text-xs font-semibold truncate text-foreground">
            {isAllDone
              ? `${totalCompleted} upload${totalCompleted > 1 ? 's' : ''} complete`
              : `Uploading ${totalUploading} item${totalUploading > 1 ? 's' : ''}...`}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="size-6 text-muted-foreground hover:text-foreground"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>
          {isAllDone && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="size-6 text-muted-foreground hover:text-foreground"
              title="Close"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Body / Item List */}
      {!isMinimized && (
        <div className="max-h-60 overflow-y-auto divide-y divide-border/60 p-2 space-y-1">
          {items.map((item) => (
            <div key={item.id} className="pt-2 pb-1.5 px-1.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-medium text-foreground truncate max-w-[200px]" title={item.name}>
                  {item.name}
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {formatBytes(item.size)}
                </span>
              </div>

              {/* Progress bar or Status Icon */}
              <div className="flex items-center gap-2">
                {item.status === 'uploading' && (
                  <>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-200 ease-out rounded-full"
                        style={{ width: `${Math.max(5, item.progress)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-8 text-right">
                      {item.progress}%
                    </span>
                  </>
                )}

                {item.status === 'completed' && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="size-3.5" />
                    <span>Upload complete</span>
                  </div>
                )}

                {item.status === 'error' && (
                  <div className="flex items-center gap-1.5 text-[11px] text-destructive font-medium">
                    <AlertCircle className="size-3.5" />
                    <span className="truncate">{item.error || 'Upload failed'}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
