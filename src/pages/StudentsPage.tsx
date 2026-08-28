/**
 * Students Page — Global roster management.
 * Displays student profile photo/preset, full name (with middle/suffix), status badge,
 * student ID, grade level, contact information, enrolled classes, and quick actions.
 */
import { useState, useEffect, useRef } from 'react';
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
import { CreateStudentDialog } from '@/components/students/CreateStudentDialog';
import { EditStudentDialog } from '@/components/students/EditStudentDialog';
import { StudentAvatar } from '@/components/students/StudentAvatar';
import { StudentStatusBadge } from '@/components/students/StudentStatusBadge';
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
  Mail,
  Phone,
  UserCheck,
  Calendar,
  Filter,
} from 'lucide-react';
import type { Student, Class } from '@/types';
import { STUDENT_STATUS_OPTIONS } from '@/types';
import { formatDate, formatStudentFullName } from '@/lib/utils';

export function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  // Status counts for filter chips
  const activeStudentsList = students.filter((s) => !pendingDeleteIds.has(s.id));
  const statusCounts = {
    all: activeStudentsList.length,
    active: activeStudentsList.filter((s) => (s.status || 'active') === 'active').length,
    inactive: activeStudentsList.filter((s) => s.status === 'inactive').length,
    graduated: activeStudentsList.filter((s) => s.status === 'graduated').length,
    transferred: activeStudentsList.filter((s) => s.status === 'transferred').length,
    dropped: activeStudentsList.filter((s) => s.status === 'dropped').length,
    suspended: activeStudentsList.filter((s) => s.status === 'suspended').length,
  };

  const filteredStudents = activeStudentsList
    .filter((s) => {
      if (statusFilter === 'all') return true;
      const currentStatus = s.status || 'active';
      return currentStatus === statusFilter;
    })
    .filter((s) => {
      const term = search.toLowerCase().trim();
      if (!term) return true;
      const fullName = formatStudentFullName(s).toLowerCase();
      return (
        fullName.includes(term) ||
        s.firstName.toLowerCase().includes(term) ||
        (s.middleName && s.middleName.toLowerCase().includes(term)) ||
        s.lastName.toLowerCase().includes(term) ||
        (s.studentId && s.studentId.toLowerCase().includes(term)) ||
        (s.gradeLevel && s.gradeLevel.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.phone && s.phone.toLowerCase().includes(term)) ||
        (s.parentGuardian && s.parentGuardian.toLowerCase().includes(term)) ||
        (s.address && s.address.toLowerCase().includes(term)) ||
        (s.status && s.status.toLowerCase().includes(term))
      );
    });

  const handleConfirmDeleteStudent = () => {
    if (!user || !studentToDelete) return;
    const student = studentToDelete;
    const studentId = student.id;
    const studentName = formatStudentFullName(student);

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
            placeholder="Search by name, ID, grade, email, parent..."
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

      {/* Status Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-muted-foreground text-xs mr-1 flex items-center gap-1 shrink-0 font-medium">
          <Filter className="h-3.5 w-3.5" />
          Status:
        </span>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
            statusFilter === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted text-muted-foreground border-border'
          }`}
        >
          All ({statusCounts.all})
        </button>
        {STUDENT_STATUS_OPTIONS.map((opt) => {
          const count = statusCounts[opt.value] || 0;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted text-muted-foreground border-border'
              }`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: statusFilter === opt.value ? 'currentColor' : opt.dotColor,
                }}
              />
              <span>{opt.label}</span>
              <span className="opacity-75 text-[11px]">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Roster display */}
      {filteredStudents.length === 0 ? (
        <Card className="border-dashed shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 text-primary">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold">
              {search || statusFilter !== 'all' ? 'No students match your filter' : 'No students in roster yet'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
              {search || statusFilter !== 'all'
                ? 'Try resetting your status filter or searching with different keywords.'
                : 'Build your global student roster. You can record personal info, contact details, and enroll them into classes.'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Add First Student
              </Button>
            )}
            {(search || statusFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
              >
                Reset Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View (shown on screen < md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredStudents.map((student) => {
              const fullName = formatStudentFullName(student);
              return (
                <Card key={student.id} className="p-4 border-border shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <StudentAvatar student={student} size="default" showStatusIndicator />
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">
                          {fullName}
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono">
                          {student.studentId ? `ID: ${student.studentId}` : 'No ID'}
                          {student.gradeLevel ? ` • ${student.gradeLevel}` : ''}
                        </p>
                      </div>
                    </div>
                    <StudentStatusBadge status={student.status} className="shrink-0 text-[11px]" />
                  </div>

                  {/* Contact / Guardian Chips */}
                  {(student.parentGuardian || student.email || student.phone) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                      {student.parentGuardian && (
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3 text-primary shrink-0" />
                          <span>{student.parentGuardian}</span>
                        </span>
                      )}
                      {student.email && (
                        <a href={`mailto:${student.email}`} className="flex items-center gap-1 text-primary hover:underline">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[140px]">{student.email}</span>
                        </a>
                      )}
                      {student.phone && (
                        <a href={`tel:${student.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{student.phone}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Enrolled Classes and Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60 gap-2">
                    <div className="flex flex-wrap gap-1 min-w-0">
                      {student.classIds.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground italic">No classes</span>
                      ) : (
                        student.classIds.map((cid) => (
                          <Badge key={cid} variant="outline" className="text-[10px] px-1.5 py-0">
                            {classMap.get(cid) || 'Class'}
                          </Badge>
                        ))
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setEditingStudent(student)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => setStudentToDelete(student)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop/Tablet Table View (shown on md+) */}
          <Card className="hidden md:block border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto touch-scroll">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[280px]">Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Grade Level</TableHead>
                    <TableHead>Contact / Guardian</TableHead>
                    <TableHead>Enrolled Classes</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const fullName = formatStudentFullName(student);
                    const hasContactInfo = student.email || student.phone || student.parentGuardian;

                    return (
                      <TableRow key={student.id}>
                        {/* Student Avatar and Full Name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <StudentAvatar student={student} size="default" showStatusIndicator />
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-foreground truncate max-w-[200px]">
                                {fullName}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                {student.gender && <span>{student.gender}</span>}
                                {student.gender && student.dateOfBirth && <span>•</span>}
                                {student.dateOfBirth && (
                                  <span className="flex items-center gap-0.5">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(student.dateOfBirth)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell>
                          <StudentStatusBadge status={student.status} />
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

                        {/* Contact / Guardian */}
                        <TableCell>
                          {hasContactInfo ? (
                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground max-w-[200px]">
                              {student.parentGuardian && (
                                <span className="font-medium text-foreground flex items-center gap-1 truncate" title={`Parent/Guardian: ${student.parentGuardian}`}>
                                  <UserCheck className="h-3 w-3 text-primary shrink-0" />
                                  {student.parentGuardian}
                                </span>
                              )}
                              {student.email && (
                                <a
                                  href={`mailto:${student.email}`}
                                  className="flex items-center gap-1 hover:text-primary hover:underline truncate"
                                  title={student.email}
                                >
                                  <Mail className="h-3 w-3 shrink-0" />
                                  {student.email}
                                </a>
                              )}
                              {student.phone && (
                                <a
                                  href={`tel:${student.phone}`}
                                  className="flex items-center gap-1 hover:text-primary hover:underline truncate"
                                  title={student.phone}
                                >
                                  <Phone className="h-3 w-3 shrink-0" />
                                  {student.phone}
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No contact info</span>
                          )}
                        </TableCell>

                        {/* Enrolled Classes */}
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
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
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
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
        itemName={studentToDelete ? formatStudentFullName(studentToDelete) : ''}
        description={
          studentToDelete ? (
            <>
              Are you sure you want to delete student{' '}
              <span className="font-semibold text-foreground">
                "{formatStudentFullName(studentToDelete)}"
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
