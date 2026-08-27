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
} from '@/lib/firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StickyNotesBoard } from '@/components/dashboard/StickyNotesBoard';
import type { Class, Student, StickyNote } from '@/types';
import { BookOpen, Users, Plus, GraduationCap, School } from 'lucide-react';

export function DashboardPage() {
  const { user, teacherProfile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);

  // Subscribe to real-time data
  useEffect(() => {
    if (!user) return;

    const unsubClasses = onClassesChange(user.uid, setClasses);
    const unsubStudents = onStudentsChange(user.uid, setStudents);
    const unsubNotes = onStickyNotesChange(user.uid, setStickyNotes);

    return () => {
      unsubClasses();
      unsubStudents();
      unsubNotes();
    };
  }, [user]);

  const totalStudents = students.length;
  const totalClasses = classes.length;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <Card className="border-border bg-card shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Welcome back, {teacherProfile?.firstName || 'Teacher'}!
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Here is an overview of your active classes, roster, and daily grading records.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild>
                <Link to="/classes">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Class
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/students">
                  <Plus className="mr-2 h-4 w-4" />
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
              Total Classes
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{totalClasses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalClasses === 0 ? 'No classes yet' : 'Active class workspaces'}
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

      {/* ─── Teacher's Sticky Notes Board ─── */}
      <StickyNotesBoard notes={stickyNotes} />

      {/* Empty state when no classes or students */}
      {totalClasses === 0 && totalStudents === 0 && (
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
