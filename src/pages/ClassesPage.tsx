/**
 * Classes Page — Workspace overview where teacher manages classes.
 * Supports both Active Classes (/classes) and Archived Classes (/classes/archived).
 * Features:
 * 1) Color-coded class cards matching Sticky Notes themes
 * 2) Pin classes to the top with instant toggle (Active view)
 * 3) Drag-and-drop reordering for unpinned class cards
 * 4) Academic Year filtering & search filtering by name, subject, room, schedule, academic year
 * 5) Dedicated Active and Archived sub-views
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Archive,
  GraduationCap,
  Filter,
} from 'lucide-react';
import type { Class } from '@/types';
import { formatDate, formatClassSchedule } from '@/lib/utils';

interface ClassesPageProps {
  isArchivedView?: boolean;
}

export function ClassesPage({ isArchivedView: explicitArchived }: ClassesPageProps) {
  const { user } = useAuth();
  const location = useLocation();
  const isArchivedView = explicitArchived ?? location.pathname.includes('/archived');

  const [classes, setClasses] = useState<Class[]>([]);
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
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

  // Extract distinct academic years for filtering
  const availableYears = useMemo(() => {
    const years = classes
      .filter((c) => (isArchivedView ? c.status === 'archived' : c.status !== 'archived'))
      .map((c) => c.academicYear)
      .filter((y): y is string => Boolean(y && y.trim()));
    return Array.from(new Set(years)).sort().reverse();
  }, [classes, isArchivedView]);

  // Toggle pin state (active classes only)
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
    if (isArchivedView || c.isPinned || search.trim() || selectedYear !== 'all') {
      e.preventDefault();
      return;
    }
    isDraggingRef.current = true;
    setDraggedId(c.id);
    e.dataTransfer.setData('text/plain', c.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, c: Class) => {
    if (isArchivedView || c.isPinned || !draggedId || draggedId === c.id || search.trim() || selectedYear !== 'all') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (_e: React.DragEvent, c: Class) => {
    if (isArchivedView || c.isPinned || !draggedId || draggedId === c.id || search.trim() || selectedYear !== 'all') return;
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

    if (isArchivedView || !draggedId || draggedId === targetClass.id || targetClass.isPinned || !user) {
      setDraggedId(null);
      isDraggingRef.current = false;
      return;
    }

    const activeClasses = classes.filter((c) => c.status !== 'archived');
    const pinnedClasses = activeClasses.filter((c) => c.isPinned);
    const unpinnedClasses = activeClasses.filter((c) => !c.isPinned);

    const fromIndex = unpinnedClasses.findIndex((c) => c.id === draggedId);
    const toIndex = unpinnedClasses.findIndex((c) => c.id === targetClass.id);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      isDraggingRef.current = false;
      return;
    }

    const reordered = [...unpinnedClasses];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const fullList = [...pinnedClasses, ...reordered];
    const otherClasses = classes.filter((c) => c.status === 'archived');
    setClasses([...fullList, ...otherClasses]);

    try {
      await reorderClasses(
        user.uid,
        reordered.map((c) => c.id)
      );
    } catch {
      toast.error('Failed to save order.');
    } finally {
      setDraggedId(null);
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
    const matchesStatus = isArchivedView ? c.status === 'archived' : c.status !== 'archived';
    if (!matchesStatus) return false;

    if (selectedYear !== 'all' && c.academicYear !== selectedYear) {
      return false;
    }

    if (!search.trim()) return true;

    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      (c.academicYear && c.academicYear.toLowerCase().includes(q)) ||
      (c.room && c.room.toLowerCase().includes(q)) ||
      (c.days && c.days.some((d) => d.toLowerCase().includes(q))) ||
      (c.color && c.color.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {isArchivedView ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Archive className="h-5 w-5" />
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isArchivedView ? 'Archived Classes' : 'Active Classes'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isArchivedView
              ? 'View completed academic years, past student records, and preserved gradebooks.'
              : 'Manage and organize your current class workspaces, rosters, and gradebooks.'}
          </p>
        </div>

        {!isArchivedView && (
          <Button onClick={() => setIsCreateOpen(true)} className="shrink-0 cursor-pointer shadow-xs">
            <Plus className="mr-2 h-4 w-4" />
            Create Class
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search classes by name, subject, room, year..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 shadow-2xs text-xs sm:text-sm h-9"
          />
        </div>

        {/* Academic Year Filter Dropdown */}
        {availableYears.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 px-3 text-xs rounded-lg border border-input bg-card font-medium text-foreground cursor-pointer shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Academic Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Class Grid */}
      {filteredClasses.length === 0 ? (
        <Card className="border-dashed shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-4 ${
              isArchivedView ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'
            }`}>
              {isArchivedView ? <Archive className="h-7 w-7" /> : <BookOpen className="h-7 w-7" />}
            </div>
            <h3 className="text-lg font-semibold">
              {search || selectedYear !== 'all'
                ? 'No classes match your filter'
                : isArchivedView
                ? 'No archived classes'
                : 'No active classes created yet'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
              {search || selectedYear !== 'all'
                ? 'Try adjusting your search terms or academic year filter.'
                : isArchivedView
                ? 'When a school year finishes, you can move classes here from Class Settings to preserve their full records.'
                : 'Create your first class workspace to organize students, assignments, and grades.'}
            </p>
            {!isArchivedView && !search && selectedYear === 'all' && (
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
            const isDraggable = !isArchivedView && !c.isPinned && !search.trim() && selectedYear === 'all';

            return (
              <div
                key={c.id}
                draggable={isDraggable}
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
                          {/* Drag Grip Handle on unpinned cards in active view */}
                          {isDraggable && (
                            <span
                              className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing shrink-0 mt-1 -ml-1"
                              title="Drag to reorder class"
                              onClick={(e) => e.preventDefault()}
                            >
                              <GripVertical className="h-4 w-4" />
                            </span>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
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
                              {c.status === 'archived' && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0"
                                  title="Archived Class"
                                >
                                  <Archive className="h-2.5 w-2.5" />
                                  Archived
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
                          {/* Pin Toggle Button (Only for active classes) */}
                          {!isArchivedView && (
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
                          )}

                          {/* Student Count Badge */}
                          <Badge variant="secondary" className="font-normal text-xs shrink-0">
                            <Users className="mr-1 h-3 w-3" />
                            {c.studentCount}
                          </Badge>
                        </div>
                      </div>

                      {/* Academic Year, Room and Schedule Details */}
                      {(c.academicYear || c.room || scheduleText) && (
                        <div className="space-y-1.5 pt-2.5 mt-1 border-t border-border/50 text-xs text-muted-foreground">
                          {c.academicYear && (
                            <div className="flex items-center gap-1.5 truncate">
                              <GraduationCap className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                              <span className="truncate font-medium text-foreground">
                                {c.academicYear}
                              </span>
                            </div>
                          )}
                          {c.room && (
                            <div className="flex items-center gap-1.5 truncate">
                              <DoorOpen className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                              <span className="truncate">{c.room}</span>
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
                          {isArchivedView ? 'View Records' : 'Manage'} <ArrowRight className="ml-1 h-3 w-3" />
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
