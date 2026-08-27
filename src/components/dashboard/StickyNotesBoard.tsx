/**
 * Sticky Notes Board Component — Teacher's dashboard quick notes & reminders board.
 * Features:
 * 1) Color-coded sticky notes with selectable modern color themes (Yellow, Blue, Green, Pink, Purple, Orange)
 * 2) Pin notes to the top
 * 3) Quick note creation dialog and on-the-fly color changing
 * 4) Edit and delete capabilities with real-time Firestore persistence
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  createStickyNote,
  updateStickyNote,
  deleteStickyNote,
} from '@/lib/firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus,
  StickyNote as NoteIcon,
  Pin,
  Trash2,
  Pencil,
  Loader2,
  Check,
} from 'lucide-react';
import type { StickyNote, StickyNoteColor } from '@/types';
import { formatDate } from '@/lib/utils';

interface StickyNotesBoardProps {
  notes: StickyNote[];
}

interface ColorConfig {
  name: string;
  bgClass: string;
  dotColor: string;
  badgeClass: string;
}

const COLOR_CONFIGS: Record<StickyNoteColor, ColorConfig> = {
  yellow: {
    name: 'Yellow',
    bgClass: 'bg-amber-100/80 border-amber-300/80 text-amber-950 dark:bg-amber-950/30 dark:border-amber-700/40 dark:text-amber-100',
    dotColor: 'bg-amber-400 border-amber-500',
    badgeClass: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-400/40',
  },
  blue: {
    name: 'Sky Blue',
    bgClass: 'bg-sky-100/80 border-sky-300/80 text-sky-950 dark:bg-sky-950/30 dark:border-sky-700/40 dark:text-sky-100',
    dotColor: 'bg-sky-400 border-sky-500',
    badgeClass: 'bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-400/40',
  },
  green: {
    name: 'Mint Green',
    bgClass: 'bg-emerald-100/80 border-emerald-300/80 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-700/40 dark:text-emerald-100',
    dotColor: 'bg-emerald-400 border-emerald-500',
    badgeClass: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-400/40',
  },
  pink: {
    name: 'Rose Pink',
    bgClass: 'bg-pink-100/80 border-pink-300/80 text-pink-950 dark:bg-pink-950/30 dark:border-pink-700/40 dark:text-pink-100',
    dotColor: 'bg-pink-400 border-pink-500',
    badgeClass: 'bg-pink-500/20 text-pink-800 dark:text-pink-300 border-pink-400/40',
  },
  purple: {
    name: 'Lavender',
    bgClass: 'bg-purple-100/80 border-purple-300/80 text-purple-950 dark:bg-purple-950/30 dark:border-purple-700/40 dark:text-purple-100',
    dotColor: 'bg-purple-400 border-purple-500',
    badgeClass: 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-400/40',
  },
  orange: {
    name: 'Peach Orange',
    bgClass: 'bg-orange-100/80 border-orange-300/80 text-orange-950 dark:bg-orange-950/30 dark:border-orange-700/40 dark:text-orange-100',
    dotColor: 'bg-orange-400 border-orange-500',
    badgeClass: 'bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-400/40',
  },
};

const COLOR_KEYS: StickyNoteColor[] = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'];

export function StickyNotesBoard({ notes }: StickyNotesBoardProps) {
  const { user } = useAuth();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState<StickyNoteColor>('yellow');
  const [isLoading, setIsLoading] = useState(false);

  // Handle opening creation modal
  const handleOpenCreate = () => {
    setTitle('');
    setContent('');
    setSelectedColor('yellow');
    setIsCreateOpen(true);
  };

  // Handle opening edit modal
  const handleOpenEdit = (note: StickyNote) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSelectedColor(note.color);
  };

  // Create new note
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!title.trim() && !content.trim())) {
      toast.error('Please enter a note title or content.');
      return;
    }

    setIsLoading(true);
    try {
      await createStickyNote(user.uid, {
        title: title.trim() || 'Untitled Note',
        content: content.trim(),
        color: selectedColor,
      });
      toast.success('Sticky note added!');
      setIsCreateOpen(false);
      setTitle('');
      setContent('');
    } catch {
      toast.error('Failed to create note.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save edited note
  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingNote) return;

    setIsLoading(true);
    try {
      await updateStickyNote(user.uid, editingNote.id, {
        title: title.trim() || 'Untitled Note',
        content: content.trim(),
        color: selectedColor,
      });
      toast.success('Note updated!');
      setEditingNote(null);
    } catch {
      toast.error('Failed to update note.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle pinned status
  const handleTogglePin = async (note: StickyNote) => {
    if (!user) return;
    try {
      await updateStickyNote(user.uid, note.id, {
        isPinned: !note.isPinned,
      });
      toast.success(note.isPinned ? 'Note unpinned' : 'Note pinned to top!');
    } catch {
      toast.error('Failed to pin note.');
    }
  };

  // Change color on the fly
  const handleChangeColor = async (note: StickyNote, color: StickyNoteColor) => {
    if (!user || note.color === color) return;
    try {
      await updateStickyNote(user.uid, note.id, { color });
    } catch {
      toast.error('Failed to update note color.');
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this sticky note?')) return;

    try {
      await deleteStickyNote(user.uid, noteId);
      toast.success('Note deleted.');
    } catch {
      toast.error('Failed to delete note.');
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
            <NoteIcon className="h-4 w-4 text-primary" />
            Teacher's Sticky Notes & Quick Reminders
          </h3>
          <p className="text-xs text-muted-foreground">
            Personal blackboard for lesson reminders, to-do items, and quick teaching notes.
          </p>
        </div>
        <Button onClick={handleOpenCreate} size="sm" className="self-start sm:self-auto cursor-pointer shadow-xs">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Sticky Note
        </Button>
      </div>

      {/* ─── Notes Grid ─── */}
      {notes.length === 0 ? (
        <Card className="border-dashed shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-3">
              <NoteIcon className="h-6 w-6" />
            </div>
            <h4 className="font-semibold text-sm">No sticky notes yet</h4>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              Jot down lesson plans, announcements, or reminders and customize their color.
            </p>
            <Button onClick={handleOpenCreate} size="sm" variant="outline" className="cursor-pointer">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create First Note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {notes.map((note) => {
            const config = COLOR_CONFIGS[note.color] || COLOR_CONFIGS.yellow;

            return (
              <div
                key={note.id}
                className={`group relative flex flex-col justify-between rounded-xl border p-4 shadow-xs transition-all duration-200 hover:shadow-md ${config.bgClass}`}
              >
                {/* Note Header & Top Controls */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <h4 className="font-bold text-sm leading-snug line-clamp-2">
                        {note.title}
                      </h4>
                      <span className="text-[10px] opacity-70 block mt-0.5">
                        {formatDate(note.createdAt)}
                      </span>
                    </div>

                    {/* Pin button */}
                    <button
                      type="button"
                      onClick={() => handleTogglePin(note)}
                      className={`cursor-pointer rounded-md p-1 transition-colors shrink-0 ${
                        note.isPinned
                          ? 'text-primary bg-primary/10'
                          : 'opacity-40 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                      title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                    >
                      <Pin className={`h-3.5 w-3.5 ${note.isPinned ? 'fill-primary rotate-45' : ''}`} />
                    </button>
                  </div>

                  {/* Note Content Body */}
                  {note.content && (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap line-clamp-6 opacity-90 font-normal mt-1">
                      {note.content}
                    </p>
                  )}
                </div>

                {/* Note Footer: Color swatches & Actions */}
                <div className="flex items-center justify-between border-t border-black/10 dark:border-white/10 pt-2.5 mt-3 text-[11px] opacity-80">
                  {/* Quick Color Swatches */}
                  <div className="flex items-center gap-1">
                    {COLOR_KEYS.map((colKey) => (
                      <button
                        key={colKey}
                        type="button"
                        onClick={() => handleChangeColor(note, colKey)}
                        className={`h-3.5 w-3.5 rounded-full border transition-transform ${COLOR_CONFIGS[colKey].dotColor} ${
                          note.color === colKey ? 'scale-125 ring-2 ring-primary ring-offset-1' : 'hover:scale-110 opacity-70 hover:opacity-100'
                        }`}
                        title={`Change to ${COLOR_CONFIGS[colKey].name}`}
                      />
                    ))}
                  </div>

                  {/* Action Icons */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(note)}
                      className="cursor-pointer p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                      title="Edit note"
                    >
                      <Pencil className="h-3 w-3" />
                      <span className="sr-only">Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="cursor-pointer p-1 rounded-md hover:bg-destructive/20 text-destructive transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Create Note Modal ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <NoteIcon className="h-5 w-5 text-primary" />
              Add Sticky Note
            </DialogTitle>
            <DialogDescription>
              Create a color-coded reminder or quick note for your dashboard.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNote} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note-title">Title / Headline</Label>
              <Input
                id="note-title"
                placeholder="e.g., Prepare Quiz 3, Staff Meeting at 2 PM"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note-content">Note Content</Label>
              <Textarea
                id="note-content"
                placeholder="Write your thoughts, task items, or reminder details..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                disabled={isLoading}
              />
            </div>

            {/* Color Palette Picker */}
            <div className="space-y-2">
              <Label>Select Note Color</Label>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {COLOR_KEYS.map((colorKey) => {
                  const conf = COLOR_CONFIGS[colorKey];
                  const isSelected = selectedColor === colorKey;

                  return (
                    <button
                      key={colorKey}
                      type="button"
                      onClick={() => setSelectedColor(colorKey)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${conf.bgClass} ${
                        isSelected ? 'ring-2 ring-primary ring-offset-2 scale-105 font-bold shadow-xs' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full border ${conf.dotColor}`} />
                      <span>{conf.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 ml-1 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || (!title.trim() && !content.trim())}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Note'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Note Modal ─── */}
      <Dialog open={Boolean(editingNote)} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Sticky Note
            </DialogTitle>
            <DialogDescription>
              Update your note title, details, or color theme.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateNote} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-note-title">Title / Headline</Label>
              <Input
                id="edit-note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-note-content">Note Content</Label>
              <Textarea
                id="edit-note-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                disabled={isLoading}
              />
            </div>

            {/* Color Palette Picker */}
            <div className="space-y-2">
              <Label>Change Note Color</Label>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {COLOR_KEYS.map((colorKey) => {
                  const conf = COLOR_CONFIGS[colorKey];
                  const isSelected = selectedColor === colorKey;

                  return (
                    <button
                      key={colorKey}
                      type="button"
                      onClick={() => setSelectedColor(colorKey)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${conf.bgClass} ${
                        isSelected ? 'ring-2 ring-primary ring-offset-2 scale-105 font-bold shadow-xs' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full border ${conf.dotColor}`} />
                      <span>{conf.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 ml-1 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingNote(null)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || (!title.trim() && !content.trim())}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
