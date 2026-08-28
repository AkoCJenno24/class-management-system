/**
 * Activity Manager Component — Workspace view for managing class activities and scoring rules.
 * Features:
 * 1) Activity list table & cards showing Name, Type, Max Score, Date, and Description
 * 2) Direct action to record grades for any activity
 * 3) Create / Edit / Delete activity definitions
 * 4) Activity stats overview
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { deleteActivity } from '@/lib/firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { CreateActivityDialog } from './CreateActivityDialog';
import { EditActivityDialog } from './EditActivityDialog';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { showGraceUndoToast } from '@/components/ui/grace-undo-toast';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  BookOpen,
  Calendar,
  Pencil,
  Trash2,
  CheckCircle2,
  Award,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import type { Activity, Grade } from '@/types';
import { formatDate } from '@/lib/utils';

interface ActivityManagerProps {
  classId: string;
  className: string;
  activities: Activity[];
  grades: Grade[];
  onRecordGradeForActivity?: (activity: Activity) => void;
  readOnly?: boolean;
}

/** Formats activity type badge colors and labels */
function getActivityTypeBadge(type: Activity['type']) {
  switch (type) {
    case 'quiz':
      return { label: 'Quiz', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' };
    case 'exam':
      return { label: 'Exam / Test', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' };
    case 'assignment':
      return { label: 'Assignment', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' };
    case 'homework':
      return { label: 'Homework', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
    case 'project':
      return { label: 'Project', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' };
    case 'participation':
      return { label: 'Participation', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' };
    default:
      return { label: 'Other', color: 'bg-muted text-muted-foreground border-border' };
  }
}

export function ActivityManager({
  classId,
  className,
  activities,
  grades,
  onRecordGradeForActivity,
  readOnly = false,
}: ActivityManagerProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);

  // Grace Period registry for soft delete undo
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const pendingDeletesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    const activeTimers = pendingDeletesRef.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const stats = useMemo(() => {
    const total = activities.length;
    const totalMaxPoints = activities.reduce((acc, a) => acc + (a.maxScore || 0), 0);
    const quizzes = activities.filter((a) => a.type === 'quiz').length;
    const exams = activities.filter((a) => a.type === 'exam').length;
    const assignments = activities.filter((a) => a.type === 'assignment').length;
    const projects = activities.filter((a) => a.type === 'project').length;
    return { total, totalMaxPoints, quizzes, exams, assignments, projects };
  }, [activities]);

  const filteredActivities = activities
    .filter((a) => !pendingDeleteIds.has(a.id))
    .filter((a) => {
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        a.type.toLowerCase().includes(q)
      );
    });

  const handleConfirmDeleteActivity = () => {
    if (!user || !activityToDelete || readOnly) return;
    const activity = activityToDelete;
    const activityId = activity.id;
    const activityName = activity.name;

    setActivityToDelete(null);

    // Optimistically hide activity
    setPendingDeleteIds((prev) => new Set(prev).add(activityId));

    const timeoutId = setTimeout(async () => {
      try {
        await deleteActivity(user.uid, activityId);
      } catch {
        toast.error(`Failed to delete activity "${activityName}".`);
      } finally {
        pendingDeletesRef.current.delete(activityId);
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.delete(activityId);
          return next;
        });
      }
    }, 5000);

    pendingDeletesRef.current.set(activityId, timeoutId);

    showGraceUndoToast({
      title: 'Activity deleted',
      subtitle: activityName,
      duration: 5000,
      onUndo: () => {
        const timer = pendingDeletesRef.current.get(activityId);
        if (timer) {
          clearTimeout(timer);
          pendingDeletesRef.current.delete(activityId);
        }
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.delete(activityId);
          return next;
        });
        toast.success(`Restored activity "${activityName}"`);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. Header & Actions ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Class Activities & Scoring</h2>
          <p className="text-sm text-muted-foreground">
            {readOnly
              ? 'Archived record of all quizzes, exams, assignments, and scoring configurations (Read-Only).'
              : 'Configure quizzes, exams, and assignments with customized maximum point scoring.'}
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => setIsCreateOpen(true)} className="shadow-xs self-start sm:self-auto cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            Create Activity
          </Button>
        )}
      </div>

      {/* ─── 2. Metrics Analytics Cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Activities
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Configured for {className}</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Cumulative Points
            </CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMaxPoints} pts</div>
            <p className="text-xs text-muted-foreground mt-1">Total possible score sum</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Quizzes & Exams
            </CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.quizzes} <span className="text-xs font-normal text-muted-foreground">quizzes</span> •{' '}
              {stats.exams} <span className="text-xs font-normal text-muted-foreground">exams</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Major assessments</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Assignments & Projects
            </CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.assignments} <span className="text-xs font-normal text-muted-foreground">tasks</span> •{' '}
              {stats.projects} <span className="text-xs font-normal text-muted-foreground">projects</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Coursework activities</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── 3. Activities Table ─── */}
      <Card className="border-border shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Activity Roster</CardTitle>
            <CardDescription>
              All defined activities and quizzes. When recording grades, scores will automatically validate against these point thresholds.
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed p-6">
              <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
              <h4 className="font-semibold text-base">
                {activities.length === 0 ? 'No activities created yet' : 'No matching activities found'}
              </h4>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                {activities.length === 0
                  ? 'Define quizzes, homework, or exam rules with target max scores for this class.'
                  : 'Try searching with a different keyword.'}
              </p>
              {activities.length === 0 && !readOnly && (
                <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Activity
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Activity Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Max Score / Points</TableHead>
                    <TableHead>Due / Target Date</TableHead>
                    <TableHead className="text-center">Graded Entries</TableHead>
                    {!readOnly && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => {
                    const badge = getActivityTypeBadge(activity.type);
                    const entriesCount = grades.filter((g) => g.assignmentName === activity.name).length;

                    return (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <div>
                            <span className="font-semibold text-foreground">{activity.name}</span>
                            {activity.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {activity.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-semibold text-xs py-0.5 ${badge.color}`}>
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-bold text-xs font-mono">
                            {activity.maxScore} pts
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {activity.dueDate ? (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{formatDate(activity.dueDate)}</span>
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold">{entriesCount}</span>{' '}
                          <span className="text-xs text-muted-foreground">
                            {entriesCount === 1 ? 'student' : 'students'}
                          </span>
                        </TableCell>
                        {!readOnly && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onRecordGradeForActivity && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs font-medium cursor-pointer"
                                  onClick={() => onRecordGradeForActivity(activity)}
                                >
                                  <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-primary" />
                                  Record Grade
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => setEditingActivity(activity)}
                                title="Edit activity"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                                onClick={() => setActivityToDelete(activity)}
                                title="Delete activity"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── 4. Modals ─── */}
      <CreateActivityDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        classId={classId}
        className={className}
      />

      <EditActivityDialog
        activity={editingActivity}
        open={Boolean(editingActivity)}
        onOpenChange={(open) => {
          if (!open) setEditingActivity(null);
        }}
      />

      {/* Confirm Delete Activity Dialog */}
      <ConfirmDeleteDialog
        open={Boolean(activityToDelete)}
        onOpenChange={(open) => !open && setActivityToDelete(null)}
        title="Delete Activity?"
        itemName={activityToDelete?.name}
        description={
          activityToDelete ? (
            <>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">"{activityToDelete.name}"</span>? All
              grades scored for this activity in <span className="font-semibold text-foreground">{className}</span> will
              also be removed. You will have a 5-second grace period with Undo.
            </>
          ) : undefined
        }
        confirmText="Delete Activity"
        onConfirm={handleConfirmDeleteActivity}
      />
    </div>
  );
}
