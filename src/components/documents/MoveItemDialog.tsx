import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type DocFolder, type DocFile } from '@/types';
import { Folder, HardDrive, CornerDownRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MoveItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DocFolder | DocFile | null;
  itemType: 'folder' | 'file';
  allFolders: DocFolder[];
  onMove: (newParentId: string | null) => Promise<void>;
}

export function MoveItemDialog({
  open,
  onOpenChange,
  item,
  itemType,
  allFolders,
  onMove,
}: MoveItemDialogProps) {
  const currentParentId = itemType === 'folder' ? (item as DocFolder)?.parentId ?? null : (item as DocFile)?.folderId ?? null;
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentParentId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!item) return null;

  // Filter out invalid destinations if moving a folder:
  // Cannot move a folder into itself, or into any of its descendants
  const invalidFolderIds = new Set<string>();
  if (itemType === 'folder') {
    invalidFolderIds.add(item.id);
    for (const f of allFolders) {
      if (f.path && f.path.includes(item.id)) {
        invalidFolderIds.add(f.id);
      }
    }
  }

  // Build hierarchical folder display
  const rootFolders = allFolders.filter((f) => !f.parentId && !invalidFolderIds.has(f.id));

  const getSubfolders = (parentId: string): DocFolder[] => {
    return allFolders.filter((f) => f.parentId === parentId && !invalidFolderIds.has(f.id));
  };

  const handleConfirm = async () => {
    if (selectedFolderId === currentParentId) {
      onOpenChange(false);
      return;
    }
    setIsSubmitting(true);
    try {
      await onMove(selectedFolderId);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFolderItem = (folder: DocFolder, depth = 0) => {
    const isSelected = selectedFolderId === folder.id;
    const isCurrent = currentParentId === folder.id;
    const children = getSubfolders(folder.id);

    return (
      <div key={folder.id} className="space-y-1">
        <button
          type="button"
          onClick={() => setSelectedFolderId(folder.id)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer',
            isSelected
              ? 'bg-primary/10 text-primary font-medium'
              : 'hover:bg-muted text-foreground',
            isCurrent && 'opacity-60'
          )}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {depth > 0 && <CornerDownRight className="size-3.5 text-muted-foreground shrink-0" />}
            <Folder
              className="size-4 shrink-0 fill-current/20"
              style={{ color: folder.color || '#3B82F6' }}
            />
            <span className="truncate">{folder.name}</span>
            {isCurrent && (
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground ml-1">
                Current
              </span>
            )}
          </div>
          {isSelected && <Check className="size-4 text-primary shrink-0 ml-2" />}
        </button>

        {children.length > 0 && (
          <div className="space-y-1">
            {children.map((child) => renderFolderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move "{item.name}"</DialogTitle>
          <DialogDescription>
            Select a destination folder to move this {itemType}.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[300px] overflow-y-auto border border-border rounded-lg p-2 space-y-1 bg-muted/20">
          {/* Root Directory Option */}
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer',
              selectedFolderId === null
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-muted text-foreground',
              currentParentId === null && 'opacity-60'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <HardDrive className="size-4 text-muted-foreground shrink-0" />
              <span className="truncate">Documents (Root)</span>
              {currentParentId === null && (
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground ml-1">
                  Current
                </span>
              )}
            </div>
            {selectedFolderId === null && <Check className="size-4 text-primary shrink-0 ml-2" />}
          </button>

          {/* Folder Hierarchy */}
          {rootFolders.map((folder) => renderFolderItem(folder, 0))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || selectedFolderId === currentParentId}
          >
            {isSubmitting ? 'Moving...' : 'Move Here'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
