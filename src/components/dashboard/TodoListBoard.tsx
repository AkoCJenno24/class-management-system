/**
 * Teacher's To-Do List Board Component.
 * Features:
 * 1) Real-time Firestore synchronization for teacher tasks
 * 2) Quick inline task creator and full detail creation/edit dialogs
 * 3) Priority categorization (Urgent, High, Medium, Low) and Category tagging (Lesson, Grading, Admin, Meeting, General)
 * 4) Due date tracking with smart relative indicators (Overdue, Due Today, Tomorrow)
 * 5) Pin tasks to top, completion progress bar, filtering tabs, and bulk actions
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  createTodoItem,
  updateTodoItem,
  toggleTodoItem,
  deleteTodoItem,
  clearCompletedTodos,
} from '@/lib/firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { showGraceUndoToast } from '@/components/ui/grace-undo-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ListTodo,
  Plus,
  CheckCircle2,
  Circle,
  Pin,
  Trash2,
  Pencil,
  Calendar,
  AlertCircle,
  Clock,
  BookOpen,
  FileCheck2,
  Briefcase,
  Users2,
  Layers,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { TodoItem, TodoPriority, TodoCategory } from '@/types';
import { formatDate, autoCapitalizeSentences } from '@/lib/utils';

interface TodoListBoardProps {
  todos: TodoItem[];
}

type FilterTab = 'all' | 'pending' | 'today' | 'high_priority' | 'completed';

// Category configurations with labels, icons, and styling
const CATEGORY_CONFIG: Record<
  TodoCategory,
  { label: string; icon: typeof BookOpen; bgClass: string; textClass: string; borderClass: string }
> = {
  lesson: {
    label: 'Lesson Prep',
    icon: BookOpen,
    bgClass: 'bg-purple-500/10 dark:bg-purple-500/20',
    textClass: 'text-purple-700 dark:text-purple-300',
    borderClass: 'border-purple-300 dark:border-purple-800/60',
  },
  grading: {
    label: 'Grading & Reports',
    icon: FileCheck2,
    bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-300 dark:border-emerald-800/60',
  },
  administrative: {
    label: 'Administrative',
    icon: Briefcase,
    bgClass: 'bg-blue-500/10 dark:bg-blue-500/20',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-300 dark:border-blue-800/60',
  },
  meeting: {
    label: 'Meeting / Parent',
    icon: Users2,
    bgClass: 'bg-amber-500/10 dark:bg-amber-500/20',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-300 dark:border-amber-800/60',
  },
  general: {
    label: 'General',
    icon: Layers,
    bgClass: 'bg-slate-500/10 dark:bg-slate-500/20',
    textClass: 'text-slate-700 dark:text-slate-300',
    borderClass: 'border-slate-300 dark:border-slate-800/60',
  },
  other: {
    label: 'Other',
    icon: Layers,
    bgClass: 'bg-zinc-500/10 dark:bg-zinc-500/20',
    textClass: 'text-zinc-700 dark:text-zinc-300',
    borderClass: 'border-zinc-300 dark:border-zinc-800/60',
  },
};

// Priority configurations
const PRIORITY_CONFIG: Record<
  TodoPriority,
  { label: string; bgClass: string; textClass: string; dotClass: string; borderClass: string }
> = {
  urgent: {
    label: 'Urgent',
    bgClass: 'bg-rose-500/15 dark:bg-rose-500/25',
    textClass: 'text-rose-700 dark:text-rose-300 font-semibold',
    dotClass: 'bg-rose-500',
    borderClass: 'border-rose-400/50 dark:border-rose-700/50',
  },
  high: {
    label: 'High',
    bgClass: 'bg-orange-500/15 dark:bg-orange-500/25',
    textClass: 'text-orange-700 dark:text-orange-300 font-medium',
    dotClass: 'bg-orange-500',
    borderClass: 'border-orange-400/50 dark:border-orange-700/50',
  },
  medium: {
    label: 'Medium',
    bgClass: 'bg-sky-500/15 dark:bg-sky-500/25',
    textClass: 'text-sky-700 dark:text-sky-300 font-medium',
    dotClass: 'bg-sky-500',
    borderClass: 'border-sky-400/50 dark:border-sky-700/50',
  },
  low: {
    label: 'Low',
    bgClass: 'bg-slate-500/15 dark:bg-slate-500/25',
    textClass: 'text-slate-600 dark:text-slate-400 font-medium',
    dotClass: 'bg-slate-400',
    borderClass: 'border-slate-300/60 dark:border-slate-700/60',
  },
};

/** Helper to format and check due status relative to today */
function getDueStatus(dueDate: Date | null | undefined, completed: boolean) {
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dueDate);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (!completed && diffDays < 0) {
    return {
      text: `Overdue by ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'}`,
      isOverdue: true,
      colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-400/40',
      icon: AlertCircle,
    };
  }

  if (diffDays === 0) {
    return {
      text: 'Due Today',
      isOverdue: false,
      isToday: true,
      colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-400/40',
      icon: Clock,
    };
  }

  if (diffDays === 1) {
    return {
      text: 'Due Tomorrow',
      isOverdue: false,
      colorClass: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-400/40',
      icon: Calendar,
    };
  }

  return {
    text: `Due ${formatDate(dueDate)}`,
    isOverdue: false,
    colorClass: 'text-muted-foreground bg-muted/50 border-border',
    icon: Calendar,
  };
}

export function TodoListBoard({ todos }: TodoListBoardProps) {
  const { user } = useAuth();

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [todoToDelete, setTodoToDelete] = useState<TodoItem | null>(null);
  const [isDeleteDoneOpen, setIsDeleteDoneOpen] = useState(false);

  // Grace Period & Undo registry
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const pendingDeletesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    const activeTimers = pendingDeletesRef.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // Quick inline add state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TodoPriority>('medium');
  const [quickCategory, setQuickCategory] = useState<TodoCategory>('general');
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Modal Form states
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalPriority, setModalPriority] = useState<TodoPriority>('medium');
  const [modalCategory, setModalCategory] = useState<TodoCategory>('lesson');
  const [modalDueDate, setModalDueDate] = useState('');
  const [modalIsPinned, setModalIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Visible todos excluding pending deletion
  const visibleTodos = useMemo(() => {
    return todos.filter((t) => !pendingDeleteIds.has(t.id));
  }, [todos, pendingDeleteIds]);

  // Calculations for stats
  const totalCount = visibleTodos.length;
  const completedCount = visibleTodos.filter((t) => t.completed).length;
  const pendingCount = totalCount - completedCount;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered todos
  const filteredTodos = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return visibleTodos.filter((todo) => {
      if (activeTab === 'pending') return !todo.completed;
      if (activeTab === 'completed') return todo.completed;
      if (activeTab === 'high_priority') return todo.priority === 'high' || todo.priority === 'urgent';
      if (activeTab === 'today') {
        if (!todo.dueDate) return false;
        const d = new Date(todo.dueDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      }
      return true;
    });
  }, [visibleTodos, activeTab]);

  // Quick toggle description expanded
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Quick inline add handler
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = autoCapitalizeSentences(quickTitle.trim());
    if (!user || !cleanTitle) return;

    setIsQuickAdding(true);
    try {
      await createTodoItem(user.uid, {
        title: cleanTitle,
        priority: quickPriority,
        category: quickCategory,
      });
      setQuickTitle('');
      toast.success('Task added to to-do list!');
    } catch {
      toast.error('Failed to add task.');
    } finally {
      setIsQuickAdding(false);
    }
  };

  // Open Full Create Modal
  const handleOpenCreateModal = () => {
    setModalTitle('');
    setModalDescription('');
    setModalPriority('medium');
    setModalCategory('lesson');
    setModalDueDate('');
    setModalIsPinned(false);
    setIsCreateOpen(true);
  };

  // Open Full Edit Modal
  const handleOpenEditModal = (todo: TodoItem) => {
    setEditingTodo(todo);
    setModalTitle(todo.title);
    setModalDescription(todo.description || '');
    setModalPriority(todo.priority);
    setModalCategory(todo.category);
    setModalDueDate(
      todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : ''
    );
    setModalIsPinned(Boolean(todo.isPinned));
  };

  // Submit Create Modal
  const handleSaveNewTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = autoCapitalizeSentences(modalTitle.trim());
    if (!user || !cleanTitle) {
      toast.error('Please provide a task title.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createTodoItem(user.uid, {
        title: cleanTitle,
        description: autoCapitalizeSentences(modalDescription.trim()),
        priority: modalPriority,
        category: modalCategory,
        dueDate: modalDueDate ? new Date(`${modalDueDate}T12:00:00`) : null,
        isPinned: modalIsPinned,
      });
      toast.success('Task created!');
      setIsCreateOpen(false);
    } catch {
      toast.error('Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Modal
  const handleSaveEditTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = autoCapitalizeSentences(modalTitle.trim());
    if (!user || !editingTodo || !cleanTitle) return;

    setIsSubmitting(true);
    try {
      await updateTodoItem(user.uid, editingTodo.id, {
        title: cleanTitle,
        description: autoCapitalizeSentences(modalDescription.trim()),
        priority: modalPriority,
        category: modalCategory,
        dueDate: modalDueDate ? new Date(`${modalDueDate}T12:00:00`) : null,
        isPinned: modalIsPinned,
      });
      toast.success('Task updated!');
      setEditingTodo(null);
    } catch {
      toast.error('Failed to update task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Complete
  const handleToggleComplete = async (todo: TodoItem) => {
    if (!user) return;
    try {
      await toggleTodoItem(user.uid, todo.id, !todo.completed);
      if (!todo.completed) {
        toast.success(`Completed: ${todo.title}`);
      }
    } catch {
      toast.error('Failed to update task status.');
    }
  };

  // Toggle Pin
  const handleTogglePin = async (todo: TodoItem) => {
    if (!user) return;
    try {
      await updateTodoItem(user.uid, todo.id, {
        isPinned: !todo.isPinned,
      });
      toast.success(todo.isPinned ? 'Task unpinned' : 'Task pinned to top!');
    } catch {
      toast.error('Failed to update pin.');
    }
  };

  // Delete Single Todo confirmation
  const handleConfirmDeleteSingleTodo = () => {
    if (!user || !todoToDelete) return;

    const todo = todoToDelete;
    const todoId = todo.id;
    const todoTitle = todo.title;

    setTodoToDelete(null);

    // Optimistically hide task from visible list
    setPendingDeleteIds((prev) => new Set(prev).add(todoId));

    const timeoutId = setTimeout(async () => {
      try {
        await deleteTodoItem(user.uid, todoId);
      } catch {
        toast.error(`Failed to delete "${todoTitle}".`);
      } finally {
        pendingDeletesRef.current.delete(todoId);
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.delete(todoId);
          return next;
        });
      }
    }, 5000);

    pendingDeletesRef.current.set(todoId, timeoutId);

    showGraceUndoToast({
      title: 'Task deleted',
      subtitle: todoTitle,
      duration: 5000,
      onUndo: () => {
        const timer = pendingDeletesRef.current.get(todoId);
        if (timer) {
          clearTimeout(timer);
          pendingDeletesRef.current.delete(todoId);
        }
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.delete(todoId);
          return next;
        });
        toast.success(`Restored "${todoTitle}"`);
      },
    });
  };

  // Delete all completed tasks with Grace Period & Undo
  const handleConfirmDeleteAllDone = () => {
    if (!user || completedCount === 0) return;

    setIsDeleteDoneOpen(false);

    const doneTodos = visibleTodos.filter((t) => t.completed);
    const doneIds = doneTodos.map((t) => t.id);
    const count = doneIds.length;

    if (count === 0) return;

    // Optimistically hide all completed tasks
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      doneIds.forEach((id) => next.add(id));
      return next;
    });

    const batchKey = `batch_done_${Date.now()}`;
    const timeoutId = setTimeout(async () => {
      try {
        await clearCompletedTodos(user.uid);
      } catch {
        toast.error('Failed to permanently delete completed tasks.');
      } finally {
        pendingDeletesRef.current.delete(batchKey);
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          doneIds.forEach((id) => next.delete(id));
          return next;
        });
      }
    }, 5000);

    pendingDeletesRef.current.set(batchKey, timeoutId);

    showGraceUndoToast({
      title: `Deleted ${count} completed task${count > 1 ? 's' : ''}`,
      subtitle: 'Click Undo to restore before countdown ends',
      duration: 5000,
      onUndo: () => {
        const timer = pendingDeletesRef.current.get(batchKey);
        if (timer) {
          clearTimeout(timer);
          pendingDeletesRef.current.delete(batchKey);
        }
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          doneIds.forEach((id) => next.delete(id));
          return next;
        });
        toast.success(`Restored ${count} completed task${count > 1 ? 's' : ''}`);
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* ─── Header & Summary Card ─── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary shrink-0" />
            <span>To-Do List</span>
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {completedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteDoneOpen(true)}
                className="h-8 px-2 text-xs cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                title="Delete all done tasks"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" />
                <span>Delete Done ({completedCount})</span>
              </Button>
            )}
            <Button
              onClick={() => handleOpenCreateModal()}
              size="sm"
              className="h-8 px-2.5 text-xs cursor-pointer shadow-xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              New Task
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Track lesson plans, grading deadlines, and meetings.
        </p>
      </div>

      {/* ─── Progress Bar & Quick Stats ─── */}
      {totalCount > 0 && (
        <Card className="bg-card/70 border-border/80 shadow-xs">
          <CardContent className="p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Progress
              </span>
              <span className="font-bold text-primary">
                {completedCount}/{totalCount} ({completionPercentage}%)
              </span>
            </div>
            <div className="w-full bg-secondary/80 rounded-full h-2 overflow-hidden border border-border/40">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Quick Inline Task Add Bar ─── */}
      <form
        onSubmit={handleQuickAdd}
        className="flex flex-col gap-2 bg-card p-2.5 rounded-xl border border-border shadow-xs focus-within:border-primary/50 transition-colors"
      >
        <div className="flex items-center gap-2 px-1">
          <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Quick task (press Enter)..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            disabled={isQuickAdding}
            className="border-none shadow-none focus-visible:ring-0 text-xs h-8 px-0"
          />
        </div>

        <div className="flex items-center gap-1.5 justify-between pt-1.5 border-t border-border/60">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {/* Quick Category */}
            <Select
              value={quickCategory}
              onValueChange={(val) => setQuickCategory(val as TodoCategory)}
            >
              <SelectTrigger className="h-7 text-[11px] px-2 flex-1 min-w-0 border-border/80">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lesson">Lesson</SelectItem>
                <SelectItem value="grading">Grading</SelectItem>
                <SelectItem value="administrative">Admin</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>

            {/* Quick Priority */}
            <Select
              value={quickPriority}
              onValueChange={(val) => setQuickPriority(val as TodoPriority)}
            >
              <SelectTrigger className="h-7 text-[11px] px-2 w-[85px] shrink-0 border-border/80">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={isQuickAdding || !quickTitle.trim()}
            className="h-7 px-2.5 text-xs shrink-0 cursor-pointer"
          >
            {isQuickAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
          </Button>
        </div>
      </form>

      {/* ─── Filter Tabs ─── */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border pb-2 text-[11px]">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          All ({totalCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Active ({pendingCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
            activeTab === 'today'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Today
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('high_priority')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
            activeTab === 'high_priority'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Urgent
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Done ({completedCount})
        </button>
      </div>

      {/* ─── Task List View ─── */}
      {/* Action banner when viewing Completed tab with items */}
      {activeTab === 'completed' && completedCount > 0 && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs">
          <span className="text-destructive font-medium flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {completedCount} completed task{completedCount === 1 ? '' : 's'}
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setIsDeleteDoneOpen(true)}
            className="h-7 px-2.5 text-xs cursor-pointer shadow-xs"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Delete All Done
          </Button>
        </div>
      )}

      {filteredTodos.length === 0 ? (
        <Card className="border-dashed shadow-xs bg-card/40">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="font-semibold text-sm">
              {activeTab === 'all'
                ? 'No tasks yet'
                : activeTab === 'completed'
                ? 'No completed tasks'
                : 'All caught up!'}
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {activeTab === 'all'
                ? 'Add lesson preparations, grading tasks, or administrative reminders.'
                : 'No tasks matching the selected filter criteria.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTodos.map((todo) => {
            const priorityConf = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
            const categoryConf = CATEGORY_CONFIG[todo.category] || CATEGORY_CONFIG.general;
            const CategoryIcon = categoryConf.icon;
            const dueStatus = getDueStatus(todo.dueDate, todo.completed);
            const isExpanded = expandedIds.has(todo.id);

            return (
              <div
                key={todo.id}
                className={`group relative flex flex-col rounded-xl border transition-all duration-200 shadow-xs ${
                  todo.completed
                    ? 'bg-muted/30 border-border/50 opacity-75'
                    : todo.isPinned
                    ? 'bg-card border-primary/40 shadow-sm'
                    : 'bg-card border-border hover:border-primary/30 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start sm:items-center justify-between p-3 sm:p-3.5 gap-3">
                  {/* Left: Checkbox & Main Info */}
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    {/* Interactive Checkbox Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(todo)}
                      className="mt-0.5 sm:mt-0 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0 focus:outline-hidden"
                      title={todo.completed ? 'Mark as pending' : 'Mark as completed'}
                    >
                      {todo.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 fill-emerald-500/10" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/60 hover:text-primary transition-all hover:scale-110" />
                      )}
                    </button>

                    {/* Task Title & Tags */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm font-medium leading-snug break-words ${
                            todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {todo.title}
                        </span>

                        {/* Pinned Tag */}
                        {todo.isPinned && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20"
                          >
                            <Pin className="h-2.5 w-2.5 mr-0.5 fill-primary" />
                            Pinned
                          </Badge>
                        )}
                      </div>

                      {/* Sub-row: Category, Priority, Due Date */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px]">
                        {/* Category Chip */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${categoryConf.bgClass} ${categoryConf.textClass} ${categoryConf.borderClass}`}
                        >
                          <CategoryIcon className="h-3 w-3" />
                          {categoryConf.label}
                        </span>

                        {/* Priority Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] ${priorityConf.bgClass} ${priorityConf.textClass} ${priorityConf.borderClass}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${priorityConf.dotClass}`} />
                          {priorityConf.label}
                        </span>

                        {/* Due Date Indicator */}
                        {dueStatus && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${dueStatus.colorClass}`}
                          >
                            <dueStatus.icon className="h-3 w-3 shrink-0" />
                            {dueStatus.text}
                          </span>
                        )}

                        {/* Has description toggle */}
                        {todo.description && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(todo.id)}
                            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 cursor-pointer ml-1 underline decoration-dotted"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3" /> Hide notes
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" /> View notes
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    {/* Pin button */}
                    <button
                      type="button"
                      onClick={() => handleTogglePin(todo)}
                      className={`cursor-pointer rounded-md p-1.5 transition-colors ${
                        todo.isPinned
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      title={todo.isPinned ? 'Unpin task' : 'Pin to top'}
                    >
                      <Pin className={`h-3.5 w-3.5 ${todo.isPinned ? 'fill-primary rotate-45' : ''}`} />
                    </button>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(todo)}
                      className="cursor-pointer p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Edit task"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => setTodoToDelete(todo)}
                      className="cursor-pointer p-1.5 rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Description Accordion */}
                {todo.description && isExpanded && (
                  <div className="px-4 pb-3 pt-1 text-xs text-muted-foreground border-t border-border/40 bg-muted/20 rounded-b-xl whitespace-pre-wrap">
                    {todo.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Create Task Modal ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              Create New Task
            </DialogTitle>
            <DialogDescription>
              Add a detailed task, due date, category, and priority level.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNewTodo} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-task-title">Task Title *</Label>
              <Input
                id="create-task-title"
                placeholder="e.g., Prepare Science Quiz 2, Submit Q1 Attendance Report"
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="create-task-category">Category</Label>
                <Select
                  value={modalCategory}
                  onValueChange={(val) => setModalCategory(val as TodoCategory)}
                >
                  <SelectTrigger id="create-task-category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lesson">Lesson Prep</SelectItem>
                    <SelectItem value="grading">Grading & Reports</SelectItem>
                    <SelectItem value="administrative">Administrative</SelectItem>
                    <SelectItem value="meeting">Meeting / Parent</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-task-priority">Priority</Label>
                <Select
                  value={modalPriority}
                  onValueChange={(val) => setModalPriority(val as TodoPriority)}
                >
                  <SelectTrigger id="create-task-priority">
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🔵 Medium</SelectItem>
                    <SelectItem value="low">⚪ Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-task-duedate">Due Date (Optional)</Label>
              <Input
                id="create-task-duedate"
                type="date"
                value={modalDueDate}
                onChange={(e) => setModalDueDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-task-desc">Notes & Details (Optional)</Label>
              <Textarea
                id="create-task-desc"
                placeholder="Add instructions, checklist items, links, or reminder details..."
                value={modalDescription}
                onChange={(e) => setModalDescription(e.target.value)}
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="create-task-pin"
                checked={modalIsPinned}
                onChange={(e) => setModalIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="create-task-pin" className="cursor-pointer text-xs font-normal">
                Pin this task to the top of the list
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !modalTitle.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Create Task'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Task Modal ─── */}
      <Dialog open={Boolean(editingTodo)} onOpenChange={(open) => !open && setEditingTodo(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Task
            </DialogTitle>
            <DialogDescription>
              Update your task details, deadline, priority, or category.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEditTodo} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-task-title">Task Title *</Label>
              <Input
                id="edit-task-title"
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-task-category">Category</Label>
                <Select
                  value={modalCategory}
                  onValueChange={(val) => setModalCategory(val as TodoCategory)}
                >
                  <SelectTrigger id="edit-task-category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lesson">Lesson Prep</SelectItem>
                    <SelectItem value="grading">Grading & Reports</SelectItem>
                    <SelectItem value="administrative">Administrative</SelectItem>
                    <SelectItem value="meeting">Meeting / Parent</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-task-priority">Priority</Label>
                <Select
                  value={modalPriority}
                  onValueChange={(val) => setModalPriority(val as TodoPriority)}
                >
                  <SelectTrigger id="edit-task-priority">
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🔵 Medium</SelectItem>
                    <SelectItem value="low">⚪ Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-task-duedate">Due Date (Optional)</Label>
              <Input
                id="edit-task-duedate"
                type="date"
                value={modalDueDate}
                onChange={(e) => setModalDueDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-task-desc">Notes & Details (Optional)</Label>
              <Textarea
                id="edit-task-desc"
                value={modalDescription}
                onChange={(e) => setModalDescription(e.target.value)}
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-task-pin"
                checked={modalIsPinned}
                onChange={(e) => setModalIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="edit-task-pin" className="cursor-pointer text-xs font-normal">
                Pin this task to the top of the list
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTodo(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !modalTitle.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving Changes...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Single Task Confirmation Modal ─── */}
      <ConfirmDeleteDialog
        open={Boolean(todoToDelete)}
        onOpenChange={(open) => !open && setTodoToDelete(null)}
        title="Delete Task?"
        itemName={todoToDelete?.title}
        confirmText="Delete Task"
        onConfirm={handleConfirmDeleteSingleTodo}
      />

      {/* ─── Delete All Done Confirmation Modal ─── */}
      <ConfirmDeleteDialog
        open={isDeleteDoneOpen}
        onOpenChange={setIsDeleteDoneOpen}
        title="Delete All Completed Tasks?"
        description={
          <>
            Are you sure you want to delete all{' '}
            <span className="font-bold text-foreground">{completedCount}</span> completed{' '}
            {completedCount === 1 ? 'task' : 'tasks'}? You will have a 5-second grace period with
            Undo to restore them.
          </>
        }
        confirmText={`Delete ${completedCount} Tasks`}
        onConfirm={handleConfirmDeleteAllDone}
      />
    </div>
  );
}
