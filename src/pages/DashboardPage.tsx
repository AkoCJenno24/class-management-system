/**
 * Dashboard page — Overview of classes, students, quick actions, and sticky notes.
 * Shows summary cards and color-coded teacher sticky notes board.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  onClassesChange,
  onStudentsChange,
  onStickyNotesChange,
  onTodoItemsChange,
} from '@/lib/firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StickyNotesBoard } from '@/components/dashboard/StickyNotesBoard';
import { TodoListBoard } from '@/components/dashboard/TodoListBoard';
import type { Class, Student, StickyNote, TodoItem } from '@/types';
import { BookOpen, Users, Plus, GraduationCap, School } from 'lucide-react';

export function DashboardPage() {
  const { user, teacherProfile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);

  // Subscribe to real-time data
  useEffect(() => {
    if (!user) return;

    const unsubClasses = onClassesChange(user.uid, setClasses);
    const unsubStudents = onStudentsChange(user.uid, setStudents);
    const unsubNotes = onStickyNotesChange(user.uid, setStickyNotes);
    const unsubTodos = onTodoItemsChange(user.uid, setTodos);

    return () => {
      unsubClasses();
      unsubStudents();
      unsubNotes();
      unsubTodos();
    };
  }, [user]);

  const totalStudents = students.length;
  const activeClasses = classes.filter((c) => c.status !== 'archived');
  const archivedClasses = classes.filter((c) => c.status === 'archived');
  const activeCount = activeClasses.length;
  const archivedCount = archivedClasses.length;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <Card className="border-border bg-card shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Welcome back teacher, {teacherProfile?.firstName || 'Teacher'}!
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Here is an overview of your active classes, roster, and daily grading records.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <Button asChild className="flex-1 sm:flex-initial">
                <Link to="/classes">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Class
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1 sm:flex-initial">
                <Link to="/students">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Student
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Active Classes
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeCount === 0
                ? 'No active classes'
                : `${activeCount} active workspace${activeCount === 1 ? '' : 's'}${archivedCount > 0 ? ` (${archivedCount} archived)` : ''
                }`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Students
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalStudents === 0 ? 'No students enrolled' : 'In your global roster'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs hover:border-primary/40 transition-colors sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              School & Subject
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <School className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">
              {teacherProfile?.school || '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {teacherProfile?.subject || 'General'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Productivity Hub: Sticky Notes (70% Left) & To-Do List (30% Right) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
        {/* Left: Sticky Notes (70% on lg screens) */}
        <div className="lg:col-span-7 space-y-4">
          <StickyNotesBoard notes={stickyNotes} />
        </div>

        {/* Right: To-Do List (30% on lg screens) */}
        <div className="lg:col-span-3 space-y-4">
          <TodoListBoard todos={todos} />
        </div>
      </div>

      {/* Empty state when no classes or students */}
      {activeCount === 0 && totalStudents === 0 && (
        <Card className="border-dashed shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 text-primary">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold">Get started with ClassHub</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-1 mb-4">
              Create your first class workspace and enroll students to begin managing daily attendance and grades.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link to="/classes">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Class
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
