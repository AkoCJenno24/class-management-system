/**
 * Global Search Dialog — Spotlight Command Palette for instant navigation & search across the platform.
 * Features:
 * 1) Real-time full-text search across Classes, Students, Tasks, Sticky Notes, Activities & Quizzes
 * 2) Quick Navigation & Action shortcuts (Create Class, Add Student, Open Settings, etc.)
 * 3) Keyboard navigation (Arrow keys, Enter to navigate, Escape to dismiss)
 * 4) Clean responsive layout preventing any overlapping of badges, icons, or text.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearchData } from '@/hooks/useGlobalSearchData';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { StudentAvatar } from '@/components/students/StudentAvatar';
import {
  School,
  Users,
  CheckSquare,
  StickyNote as NoteIcon,
  Award,
  LayoutDashboard,
  Settings,
  PlusCircle,
  ArrowRight,
  Pin,
} from 'lucide-react';
import { CLASS_COLOR_CONFIGS } from '@/components/classes/ClassColorPicker';
import type { StickyNoteColor, TodoPriority } from '@/types';
import { formatStudentFullName, formatClassSchedule } from '@/lib/utils';

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCreateClass?: () => void;
  onOpenCreateStudent?: () => void;
}

const STICKY_COLOR_DOTS: Record<StickyNoteColor, string> = {
  yellow: 'bg-amber-400',
  blue: 'bg-blue-400',
  green: 'bg-emerald-400',
  pink: 'bg-pink-400',
  purple: 'bg-purple-400',
  orange: 'bg-orange-400',
};

const PRIORITY_BADGES: Record<TodoPriority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
  high: { label: 'High', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  medium: { label: 'Medium', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  low: { label: 'Low', color: 'bg-muted text-muted-foreground border-border' },
};

export function GlobalSearchDialog({
  open,
  onOpenChange,
  onOpenCreateClass,
  onOpenCreateStudent,
}: GlobalSearchDialogProps) {
  const navigate = useNavigate();
  const { classes, students, notes, todos, activities } = useGlobalSearchData();
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearchQuery('');
    }
    onOpenChange(nextOpen);
  };

  // Class ID to Name map for activities
  const classMap = useMemo(() => {
    return new Map<string, string>(classes.map((c) => [c.id, c.name]));
  }, [classes]);

  const handleSelect = (callback: () => void) => {
    handleOpenChange(false);
    callback();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Global Search"
      description="Search classes, students, tasks, notes, activities, and quick actions"
    >
      <CommandInput
        placeholder="Search classes, students, tasks, notes, activities... (Type to search)"
        value={searchQuery}
        onValueChange={setSearchQuery}
      />

      <CommandList className="max-h-[min(380px,70dvh)] p-2 overflow-y-auto touch-scroll">
        <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No matching results found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a different search term or pick an action from below.
          </p>
        </CommandEmpty>

        {/* ─── 1. Classes ─── */}
        {classes.length > 0 && (
          <CommandGroup heading="Classes" className="capitalize">
            {classes.map((cls) => {
              const schedule = formatClassSchedule(cls.days, cls.startTime, cls.endTime);
              const daysStr = cls.days?.join(' ') || '';
              const colorConfig = CLASS_COLOR_CONFIGS[cls.color || 'default'] || CLASS_COLOR_CONFIGS.default;

              return (
                <CommandItem
                  key={cls.id}
                  value={`class ${cls.name} ${cls.subject} ${cls.room || ''} ${daysStr} ${schedule} ${cls.color || ''}`}
                  onSelect={() => handleSelect(() => navigate(`/classes/${cls.id}`))}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-primary"
                      style={{
                        backgroundColor: `${colorConfig.swatchColor}18`,
                        borderColor: `${colorConfig.swatchColor}40`,
                        color: colorConfig.swatchColor,
                      }}
                    >
                      <School className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate text-foreground leading-tight">{cls.name}</p>
                        {cls.isPinned && (
                          <Pin className="h-3 w-3 text-primary fill-current shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {cls.subject || 'General Class'}
                        {cls.room ? ` • ${cls.room}` : ''}
                        {schedule ? ` • ${schedule}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <Badge variant="secondary" className="text-[11px] font-medium font-mono whitespace-nowrap">
                      {cls.studentCount ?? 0} {cls.studentCount === 1 ? 'student' : 'students'}
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* ─── 2. Students ─── */}
        {students.length > 0 && (
          <CommandGroup heading="Students" className="capitalize">
            {students.map((student) => {
              const fullName = formatStudentFullName(student);
              return (
                <CommandItem
                  key={student.id}
                  value={`student ${fullName} ${student.middleName || ''} ${student.studentId || ''} ${student.gradeLevel || ''} ${student.email || ''} ${student.phone || ''} ${student.parentGuardian || ''} ${student.status || ''}`}
                  onSelect={() => handleSelect(() => navigate('/students'))}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <StudentAvatar student={student} size="sm" showStatusIndicator />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate text-foreground leading-tight">{fullName}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {student.studentId ? `ID: ${student.studentId}` : 'Roster Student'}
                        {student.classIds?.length ? ` • ${student.classIds.length} classes` : ''}
                        {student.status && student.status !== 'active' ? ` • ${student.status}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {student.gradeLevel && (
                      <Badge variant="outline" className="text-[11px] font-medium whitespace-nowrap">
                        {student.gradeLevel}
                      </Badge>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* ─── 3. Activities & Quizzes ─── */}
        {activities.length > 0 && (
          <CommandGroup heading="Activities & Quizzes" className="capitalize">
            {activities.map((activity) => {
              const clsName = classMap.get(activity.classId) || 'Class';
              return (
                <CommandItem
                  key={activity.id}
                  value={`activity quiz exam ${activity.name} ${activity.type} ${clsName} ${activity.description || ''}`}
                  onSelect={() => handleSelect(() => navigate(`/classes/${activity.classId}`))}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      <Award className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate text-foreground leading-tight">{activity.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {clsName} • <span className="capitalize">{activity.type}</span>
                        {activity.description ? ` • ${activity.description}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <Badge variant="secondary" className="text-[11px] font-bold font-mono whitespace-nowrap">
                      {activity.maxScore} pts
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* ─── 4. To-Do Tasks ─── */}
        {todos.length > 0 && (
          <CommandGroup heading="To-Do Tasks" className="capitalize">
            {todos.map((todo) => {
              const priority = PRIORITY_BADGES[todo.priority] || PRIORITY_BADGES.medium;
              return (
                <CommandItem
                  key={todo.id}
                  value={`todo task ${todo.title} ${todo.description || ''} ${todo.category} ${todo.priority}`}
                  onSelect={() => handleSelect(() => navigate('/'))}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                        todo.completed
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}
                    >
                      <CheckSquare className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold truncate leading-tight ${
                          todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {todo.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        <span className="capitalize">{todo.category}</span>
                        {todo.completed ? ' • Completed' : ' • Active'}
                        {todo.description ? ` • ${todo.description}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <Badge variant="outline" className={`text-[10px] font-semibold whitespace-nowrap ${priority.color}`}>
                      {priority.label}
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* ─── 5. Sticky Notes ─── */}
        {notes.length > 0 && (
          <CommandGroup heading="Sticky Notes" className="capitalize">
            {notes.map((note) => (
              <CommandItem
                key={note.id}
                value={`note sticky ${note.title} ${note.content}`}
                onSelect={() => handleSelect(() => navigate('/'))}
                className="flex items-center justify-between gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 relative">
                    <NoteIcon className="h-4 w-4" />
                    <span
                      className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-background ${
                        STICKY_COLOR_DOTS[note.color] || 'bg-amber-400'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate text-foreground leading-tight">
                      {note.title || 'Untitled Note'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {note.content || 'Empty note content'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <Badge variant="outline" className="text-[10px] capitalize whitespace-nowrap">
                    {note.color}
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* ─── 6. Quick Actions & Navigation ─── */}
        <CommandGroup heading="Quick Actions & Navigation" className="capitalize">
          <CommandItem
            value="go to dashboard home"
            onSelect={() => handleSelect(() => navigate('/'))}
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">Go to Dashboard</span>
          </CommandItem>

          <CommandItem
            value="view all classes workspace"
            onSelect={() => handleSelect(() => navigate('/classes'))}
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              <School className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">View All Classes</span>
          </CommandItem>

          {onOpenCreateClass && (
            <CommandItem
              value="create new class workspace"
              onSelect={() => handleSelect(onOpenCreateClass)}
              className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <PlusCircle className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Create New Class</span>
            </CommandItem>
          )}

          <CommandItem
            value="view all students roster"
            onSelect={() => handleSelect(() => navigate('/students'))}
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-sm font-medium">View All Students</span>
          </CommandItem>

          {onOpenCreateStudent && (
            <CommandItem
              value="add new student roster"
              onSelect={() => handleSelect(onOpenCreateStudent)}
              className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <PlusCircle className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Add New Student</span>
            </CommandItem>
          )}

          <CommandItem
            value="settings teacher profile preferences grade levels"
            onSelect={() => handleSelect(() => navigate('/settings'))}
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              <Settings className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium">Teacher Profile & Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between border-t border-border px-3.5 py-2 text-[11px] text-muted-foreground bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <span>Navigate <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] border border-border">↑</kbd> <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] border border-border">↓</kbd></span>
          <span>•</span>
          <span>Select <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] border border-border">↵</kbd></span>
        </div>
        <div>
          <span>Close <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] border border-border">Esc</kbd></span>
        </div>
      </div>
    </CommandDialog>
  );
}
