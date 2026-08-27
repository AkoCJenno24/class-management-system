/**
 * Students Page — Global roster management.
 * Displays student name, grade level, ID, and enrolled classes.
 */import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { onStudentsChange, onClassesChange, deleteStudent } from '@/lib/firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CreateStudentDialog } from '@/components/students/CreateStudentDialog';
import { EditStudentDialog } from '@/components/students/EditStudentDialog';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { showGraceUndoToast } from '@/components/ui/grace-undo-toast';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Users,
  Pencil,
  Trash2,
  GraduationCap,
  Settings2,
} from 'lucide-react';
import type { Student, Class } from '@/types';
import { getInitials, formatDate } from '@/lib/utils';

export function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [search, setSearch] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Grace Period & Undo registry
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const pendingDeletesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    const activeTimers = pendingDeletesRef.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubStudents = onStudentsChange(user.uid, setStudents);
    const unsubClasses = onClassesChange(user.uid, setClasses);

    return () => {
      unsubStudents();
      unsubClasses();
    };
  }, [user]);

  const classMap = new Map<string, string>(classes.map((c) => [c.id, c.name]));

  const filteredStudents = students
    .filter((s) => !pendingDeleteIds.has(s.id))
    .filter((s) => {
      const term = search.toLowerCase().trim();
      if (!term) return true;
      return (
        s.firstName.toLowerCase().includes(term) ||
        s.lastName.toLowerCase().includes(term) ||
        (s.gradeLevel && s.gradeLevel.toLowerCase().includes(term)) ||
        (s.studentId && s.studentId.toLowerCase().includes(term))
      );
    });

  const handleConfirmDeleteStudent = () => {
    if (!user || !studentToDelete) return;
    const student = studentToDelete;
    const studentId = student.id;
    const studentName = `${student.firstName} ${student.lastName}`;

    setStudentToDelete(null);

    // Optimistically hide student
    setPendingDeleteIds((prev) => new Set(prev).add(studentId));

    const timeoutId = setTimeout(async () => {
      try {
        await deleteStudent(user.uid, studentId);
      } catch {
        toast.error(`Failed to delete student "${studentName}".`);
      } finally {
        pendingDeletesRef.current.delete(studentId);
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
      }
    }, 5000);

    pendingDeletesRef.current.set(studentId, timeoutId);

    showGraceUndoToast({
      title: 'Student deleted',
      subtitle: `${studentName} (grades and records removed)`,
      duration: 5000,
      onUndo: () => {
        const timer = pendingDeletesRef.current.get(studentId);
        if (timer) {
          clearTimeout(timer);
          pendingDeletesRef.current.delete(studentId);
        }
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
        toast.success(`Restored student "${studentName}"`);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students by name, grade level, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 shadow-xs text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
            <Link to="/settings">
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              Grade Presets
            </Link>
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="shrink-0 cursor-pointer shadow-xs">
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Roster display */}
      {filteredStudents.length === 0 ? (
        <Card className="border-dashed shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 text-primary">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold">
              {search ? 'No students match your search' : 'No students in roster yet'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
              {search
                ? 'Try searching with another student name or grade level.'
                : 'Build your global student roster. You can set their grade level and enroll them into classes.'}
            </p>
            {!search && (
              <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Add First Student
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[280px]">Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>Enrolled Classes</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    {/* Student Avatar and Full Name */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {getInitials(student.firstName, student.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-foreground">
                          {student.firstName} {student.lastName}
                        </span>
                      </div>
                    </TableCell>

                    {/* Student ID */}
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {student.studentId || '—'}
                    </TableCell>

                    {/* Grade Level Badge */}
                    <TableCell>
                      {student.gradeLevel ? (
                        <Badge
                          variant="secondary"
                          className="font-medium text-xs border border-primary/20 bg-primary/5 text-primary"
                        >
                          <GraduationCap className="mr-1 h-3 w-3 shrink-0" />
                          {student.gradeLevel}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Not set</span>
                      )}
                    </TableCell>

                    {/* Enrolled Classes */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {student.classIds.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">None</span>
                        ) : (
                          student.classIds.map((cid) => (
                            <Badge key={cid} variant="outline" className="text-xs font-normal">
                              {classMap.get(cid) || 'Class'}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>

                    {/* Date Added */}
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(student.createdAt)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => setEditingStudent(student)}
                          title="Edit student"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                          onClick={() => setStudentToDelete(student)}
                          title="Delete student"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Dialogs */}
      <CreateStudentDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <EditStudentDialog
        student={editingStudent}
        open={Boolean(editingStudent)}
        onOpenChange={(open) => !open && setEditingStudent(null)}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={Boolean(studentToDelete)}
        onOpenChange={(open) => !open && setStudentToDelete(null)}
        title="Delete Student?"
        itemName={studentToDelete ? `${studentToDelete.firstName} ${studentToDelete.lastName}` : ''}
        description={
          studentToDelete ? (
            <>
              Are you sure you want to delete student{' '}
              <span className="font-semibold text-foreground">
                "{studentToDelete.firstName} {studentToDelete.lastName}"
              </span>
              ? All associated grades and records will be removed. You will have a 5-second grace period with Undo.
            </>
          ) : undefined
        }
        confirmText="Delete Student"
        onConfirm={handleConfirmDeleteStudent}
      />
    </div>
  );
}
