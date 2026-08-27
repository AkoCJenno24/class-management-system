/**
 * Reusable Confirmation Dialog for deletion and destructive actions across the app.
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string | React.ReactNode;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: 'trash' | 'warning';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = 'Confirm Deletion',
  description,
  itemName,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  icon = 'trash',
  isLoading = false,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            {icon === 'trash' ? (
              <Trash2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            )}
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm text-foreground/85 leading-relaxed">
            {description || (
              <>
                Are you sure you want to delete{' '}
                {itemName ? (
                  <span className="font-semibold text-foreground">"{itemName}"</span>
                ) : (
                  'this item'
                )}
                ? You will have a grace period with Undo to restore it.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="cursor-pointer"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isLoading}
            className="cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
