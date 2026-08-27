/**
 * Grace Period Undo Toast with animated countdown progress bar.
 * Used across the application when deleting items, allowing users to safely undo accidental deletions.
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Trash2, Undo2 } from 'lucide-react';

export interface GraceUndoToastProps {
  t: string | number;
  title: string;
  subtitle?: string;
  duration?: number;
  onUndo: () => void;
}

export function GraceUndoToast({
  t,
  title,
  subtitle,
  duration = 5000,
  onUndo,
}: GraceUndoToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div className="relative overflow-hidden w-full max-w-[360px] rounded-xl border border-border bg-popover/95 p-3.5 shadow-xl backdrop-blur-md text-popover-foreground">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
            <Trash2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold leading-tight truncate text-foreground">
              {title}
            </p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => {
            onUndo();
            toast.dismiss(t);
          }}
          className="h-8 px-3 text-xs font-semibold shrink-0 cursor-pointer shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Undo2 className="mr-1 h-3.5 w-3.5" />
          Undo
        </Button>
      </div>

      {/* Countdown Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/60 overflow-hidden">
        <div
          className="h-full bg-destructive transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/** Helper function to easily spawn an Undo toast with countdown */
export function showGraceUndoToast(options: {
  title: string;
  subtitle?: string;
  duration?: number;
  onUndo: () => void;
}) {
  const duration = options.duration ?? 5000;
  return toast.custom(
    (t) => (
      <GraceUndoToast
        t={t}
        title={options.title}
        subtitle={options.subtitle}
        duration={duration}
        onUndo={options.onUndo}
      />
    ),
    { duration }
  );
}
