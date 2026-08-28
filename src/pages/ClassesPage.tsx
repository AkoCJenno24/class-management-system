/**
 * Classes Page — Workspace overview where teacher manages all classes.
 * Features:
 * 1) Color-coded class cards matching Sticky Notes themes
 * 2) Pin classes to the top with instant toggle
 * 3) Drag-and-drop reordering for unpinned class cards
 * 4) Full search filtering by name, subject, room, schedule days, and color
 * 5) Responsive layout adapted for mobile, tablet, and desktop
 */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { onClassesChange, togglePinClass, reorderClasses } from '@/lib/firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreateClassDialog } from '@/components/classes/CreateClassDialog';
import { CLASS_COLOR_CONFIGS } from '@/components/classes/ClassColorPicker';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  BookOpen,
  Users,
  ArrowRight,
  DoorOpen,
  Clock,
  Pin,
  GripVertical,
} from 'lucide-react';
import type { Class } from '@/types';
import { formatDate, formatClassSchedule } from '@/lib/utils';

export function ClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Drag & drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onClassesChange(user.uid, setClasses);
    return unsub;
  }, [user]);

  // Toggle pin state
  const handleTogglePin = async (e: React.MouseEvent, c: Class) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    const nextPinned = !c.isPinned;
    // Optimistic local update
    setClasses((prev) =>
      prev
        .map((item) => (item.id === c.id ? { ...item, isPinned: nextPinned } : item))
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
            return a.order - b.order;
          }
          return b.createdAt.getTime() - a.createdAt.getTime();
        })
    );

    try {
      await togglePinClass(user.uid, c.id, nextPinned);
      toast.success(nextPinned ? `Pinned "${c.name}" to top` : `Unpinned "${c.name}"`);
    } catch {
      toast.error('Failed to update pin state.');
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, c: Class) => {
    if (c.isPinned || search.trim()) {
      e.preventDefault();
      return;
    }
    isDraggingRef.current = true;
    setDraggedId(c.id);
    e.dataTransfer.setData('text/plain', c.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, c: Class) => {
    if (c.isPinned || !draggedId || draggedId === c.id || search.trim()) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (_e: React.DragEvent, c: Class) => {
    if (c.isPinned || !draggedId || draggedId === c.id || search.trim()) return;
    setDragOverId(c.id);
  };

  const handleDragLeave = (_e: React.DragEvent, c: Class) => {
    if (dragOverId === c.id) {
      setDragOverId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetClass: Class) => {
    e.preventDefault();
    setDragOverId(null);

    if (!draggedId || draggedId === targetClass.id || targetClass.isPinned || !user) {
      setDraggedId(null);
      isDraggingRef.current = false;
      return;
    }

    const pinnedClasses = classes.filter((c) => c.isPinned);
    const unpinnedClasses = classes.filter((c) => !c.isPinned);

    const fromIndex = unpinnedClasses.findIndex((c) => c.id === draggedId);
    const toIndex = unpinnedClasses.findIndex((c) => c.id === targetClass.id);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      isDraggingRef.current = false;
      return;
    }

    const newUnpinned = [...unpinnedClasses];
    const [movedItem] = newUnpinned.splice(fromIndex, 1);
    newUnpinned.splice(toIndex, 0, movedItem);

    // Optimistic local state update
    const reorderedList = [...pinnedClasses, ...newUnpinned];
    setClasses(reorderedList);
    setDraggedId(null);

    // Persist new ordering to Firestore
    try {
      const orderedIds = newUnpinned.map((c) => c.id);
      await reorderClasses(user.uid, orderedIds);
    } catch {
      toast.error('Failed to save new class order.');
    } finally {
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const filteredClasses = classes.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      (c.room && c.room.toLowerCase().includes(q)) ||
      (c.days && c.days.some((d) => d.toLowerCase().includes(q))) ||
      (c.color && c.color.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search classes by name, subject, room, schedule..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 shadow-xs text-sm"
          />
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="shrink-0 cursor-pointer shadow-xs">
          <Plus className="mr-2 h-4 w-4" />
          Create Class
        </Button>
      </div>

      {/* Class Grid */}
      {filteredClasses.length === 0 ? (
        <Card className="border-dashed shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 text-primary">
              <BookOpen className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold">
              {search ? 'No classes match your search' : 'No classes created yet'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
              {search
                ? 'Try a different keyword or clear the search input.'
                : 'Create your first class workspace to organize students, assignments, and grades.'}
            </p>
            {!search && (
              <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Create First Class
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((c) => {
            const scheduleText = formatClassSchedule(c.days, c.startTime, c.endTime);
            const colorConfig = CLASS_COLOR_CONFIGS[c.color || 'default'] || CLASS_COLOR_CONFIGS.default;
            const isDraggingThis = draggedId === c.id;
            const isDragOverThis = dragOverId === c.id;

            return (
              <div
                key={c.id}
                draggable={!c.isPinned && !search.trim()}
                onDragStart={(e) => handleDragStart(e, c)}
                onDragOver={(e) => handleDragOver(e, c)}
                onDragEnter={(e) => handleDragEnter(e, c)}
                onDragLeave={(e) => handleDragLeave(e, c)}
                onDrop={(e) => handleDrop(e, c)}
                onDragEnd={handleDragEnd}
                className={`transition-all duration-200 ${
                  isDraggingThis ? 'opacity-40 scale-[0.98]' : ''
                } ${
                  isDragOverThis
                    ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-lg z-10'
                    : ''
                }`}
              >
                <Link
                  to={`/classes/${c.id}`}
                  onClick={(e) => {
                    if (isDraggingRef.current) {
                      e.preventDefault();
                    }
                  }}
                  className="block h-full"
                >
                  <Card
                    className={`h-full border shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${
                      colorConfig.bgClass
                    } ${colorConfig.borderClass} ${colorConfig.hoverBorderClass} hover:shadow-md`}
                  >
                    <CardHeader className="pb-3">
                      {/* Top Header: Drag Handle / Pin Button / Student Count */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-1.5 min-w-0 flex-1">
                          {/* Drag Grip Handle on unpinned cards */}
                          {!c.isPinned && !search.trim() && (
                            <span
                              className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing shrink-0 mt-1 -ml-1"
                              title="Drag to reorder class"
                              onClick={(e) => e.preventDefault()}
                            >
                              <GripVertical className="h-4 w-4" />
                            </span>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <CardTitle className="text-lg font-semibold truncate text-foreground">
                                {c.name}
                              </CardTitle>
                              {c.isPinned && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25 shrink-0"
                                  title="Pinned to top"
                                >
                                  Pinned
                                </span>
                              )}
                            </div>
                            <CardDescription className="font-medium text-primary mt-0.5 text-xs truncate">
                              {c.subject || 'General Class'}
                            </CardDescription>
                          </div>
                        </div>

                        {/* Top Right Action Area */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Pin Toggle Button */}
                          <button
                            type="button"
                            onClick={(e) => handleTogglePin(e, c)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              c.isPinned
                                ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                                : 'bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground border-border/60 opacity-80 group-hover:opacity-100'
                            }`}
                            title={c.isPinned ? 'Unpin class' : 'Pin class to top'}
                          >
                            <Pin className={`h-3.5 w-3.5 ${c.isPinned ? 'fill-current' : ''}`} />
                          </button>

                          {/* Student Count Badge */}
                          <Badge variant="secondary" className="font-normal text-xs shrink-0">
                            <Users className="mr-1 h-3 w-3" />
                            {c.studentCount}
                          </Badge>
                        </div>
                      </div>

                      {/* Room and Schedule Details */}
                      {(c.room || scheduleText) && (
                        <div className="space-y-1.5 pt-2.5 mt-1 border-t border-border/50 text-xs text-muted-foreground">
                          {c.room && (
                            <div className="flex items-center gap-1.5 truncate">
                              <DoorOpen className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                              <span className="truncate font-medium text-foreground">{c.room}</span>
                            </div>
                          )}
                          {scheduleText && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Clock className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                              <span className="truncate">{scheduleText}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3 mt-1">
                        <span>Created {formatDate(c.createdAt)}</span>
                        <span className="flex items-center text-primary font-medium group-hover:translate-x-0.5 transition-transform">
                          Manage <ArrowRight className="ml-1 h-3 w-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreateClassDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
