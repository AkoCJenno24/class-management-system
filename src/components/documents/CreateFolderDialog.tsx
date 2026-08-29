import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FOLDER_COLOR_PRESETS, type DocFolder } from '@/types';
import { Folder, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderToEdit?: DocFolder | null;
  currentParentFolder?: DocFolder | null;
  onSubmit: (name: string, color: string) => Promise<void>;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  folderToEdit,
  currentParentFolder,
  onSubmit,
}: CreateFolderDialogProps) {
  const isEditing = !!folderToEdit;
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(FOLDER_COLOR_PRESETS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (folderToEdit) {
        setName(folderToEdit.name);
        setColor(folderToEdit.color || FOLDER_COLOR_PRESETS[0].value);
      } else {
        setName('');
        setColor(FOLDER_COLOR_PRESETS[0].value);
      }
      setError('');
    }
  }, [open, folderToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter a folder name');
      return;
    }
    if (/[\\/:*?"<>|]/.test(cleanName)) {
      setError('Folder name cannot contain special characters (\\ / : * ? " < > |)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(cleanName, color);
      onOpenChange(false);
    } catch (err: unknown) {
      console.error(err);
      setError('Failed to save folder. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div
                className="size-9 rounded-lg flex items-center justify-center text-white shadow-xs"
                style={{ backgroundColor: color }}
              >
                <Folder className="size-5 fill-current/20" />
              </div>
              <div>
                <DialogTitle>{isEditing ? 'Rename Folder' : 'New Folder'}</DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? 'Update the name and color for this folder.'
                    : currentParentFolder
                    ? `Creating inside "${currentParentFolder.name}"`
                    : 'Create a new folder in Documents.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name" className="text-xs font-semibold">
                Folder Name
              </Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. Lesson Plans, Unit 1, Worksheets"
                autoFocus
                disabled={isSubmitting}
                className={cn(error && 'border-destructive ring-destructive/20')}
              />
              {error && <p className="text-xs text-destructive font-medium">{error}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Folder Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {FOLDER_COLOR_PRESETS.map((preset) => {
                  const isSelected = color === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setColor(preset.value)}
                      title={preset.label}
                      className={cn(
                        'size-7 rounded-full flex items-center justify-center transition-all cursor-pointer ring-offset-2',
                        isSelected ? 'ring-2 ring-foreground scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                      )}
                      style={{ backgroundColor: preset.value }}
                    >
                      {isSelected && <Check className="size-3.5 text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
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
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
