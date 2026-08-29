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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
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
  MoreVertical,
  ArrowUpDown,
  X,
} from 'lucide-react';
import type { Student, Class } from '@/types';
import { STUDENT_STATUS_OPTIONS } from '@/types';
import { formatDate, formatStudentFullName } from '@/lib/utils';

export function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [search, setSearch] = useState('');
  const [studentSort, setStudentSort] = useState<'firstName-asc' | 'firstName-desc' | 'lastName-asc' | 'lastName-desc'>('firstName-asc');
  const [studentGenderFilter, setStudentGenderFilter] = useState<'all' | 'male' | 'female'>('all');
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
      if (studentGenderFilter !== 'all') {
        const g = (s.gender || '').toLowerCase().trim();
        if (g !== studentGenderFilter) return false;
      }
      return true;
    })
    .filter((s) => {
      const term = search.toLowerCase().trim();
      if (!term) return true;

      const firstName = (s.firstName || '').toLowerCase();
      const middleName = (s.middleName || '').toLowerCase();
      const lastName = (s.lastName || '').toLowerCase();
      const fullName = formatStudentFullName(s).toLowerCase();
      const firstLast = `${firstName} ${lastName}`.trim();
      const lastFirst = `${lastName} ${firstName}`.trim();

      return (
        firstName.includes(term) ||
        middleName.includes(term) ||
        lastName.includes(term) ||
        fullName.includes(term) ||
        firstLast.includes(term) ||
        lastFirst.includes(term)
      );
    });

  // Sort filtered students by First Name or Last Name
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    switch (studentSort) {
      case 'firstName-asc':
        return (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' });
      case 'firstName-desc':
        return (b.firstName || '').localeCompare(a.firstName || '', undefined, { sensitivity: 'base' });
      case 'lastName-asc':
        return (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' });
      case 'lastName-desc':
        return (b.lastName || '').localeCompare(a.lastName || '', undefined, { sensitivity: 'base' });
      default:
        return 0;
    }
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
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Students
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage and organize your student roster, profiles, and academic records.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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

      {/* Search & Sort / Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search students by name (first, middle, last)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 shadow-2xs text-xs sm:text-sm h-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-full hover:bg-muted"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Clear search</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sort Option */}
          <Select
            value={studentSort}
            onValueChange={(val) =>
              setStudentSort(val as 'firstName-asc' | 'firstName-desc' | 'lastName-asc' | 'lastName-desc')
            }
          >
            <SelectTrigger className="h-9 w-full sm:w-auto px-3 text-xs sm:text-sm bg-card shadow-2xs gap-1.5 cursor-pointer">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium">Sort</span>
            </SelectTrigger>
            <SelectContent align="end" alignItemWithTrigger={false} className="w-56 min-w-[220px] p-1.5 shadow-lg">
              <SelectItem value="firstName-asc" className="cursor-pointer text-xs sm:text-sm py-2 pr-8 pl-2.5">
                First Name (Ascending)
              </SelectItem>
              <SelectItem value="firstName-desc" className="cursor-pointer text-xs sm:text-sm py-2 pr-8 pl-2.5">
                First Name (Descending)
              </SelectItem>
              <SelectItem value="lastName-asc" className="cursor-pointer text-xs sm:text-sm py-2 pr-8 pl-2.5">
                Last Name (Ascending)
              </SelectItem>
              <SelectItem value="lastName-desc" className="cursor-pointer text-xs sm:text-sm py-2 pr-8 pl-2.5">
                Last Name (Descending)
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Option */}
          <Select
            value={studentGenderFilter}
            onValueChange={(val) =>
              setStudentGenderFilter(val as 'all' | 'male' | 'female')
            }
          >
            <SelectTrigger
              className={`h-9 w-full sm:w-auto px-3 text-xs sm:text-sm bg-card shadow-2xs gap-1.5 cursor-pointer ${
                studentGenderFilter !== 'all' ? 'border-primary/50 text-primary bg-primary/5' : ''
              }`}
            >
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium">
                {studentGenderFilter === 'all'
                  ? 'Filter'
                  : studentGenderFilter === 'male'
                  ? 'Filter: Male'
                  : 'Filter: Female'}
              </span>
            </SelectTrigger>
            <SelectContent align="end" alignItemWithTrigger={false} className="w-48 min-w-[180px] p-1.5 shadow-lg">
              <SelectItem value="all" className="cursor-pointer text-xs sm:text-sm py-2 pr-8 pl-2.5">
                All Genders
              </SelectItem>
              <SelectItem value="male" className="cursor-pointer text-xs sm:text-sm py-2 pr-8 pl-2.5">
                Male
              </SelectItem>
              <SelectItem value="female" className="cursor-pointer text-xs sm:text-sm py-2 pr-8 pl-2.5">
                Female
              </SelectItem>
            </SelectContent>
          </Select>
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
      {sortedStudents.length === 0 ? (
        <Card className="border-dashed shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 text-primary">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold">
              {search || statusFilter !== 'all' || studentGenderFilter !== 'all' ? 'No students match your filter' : 'No students in roster yet'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
              {search || statusFilter !== 'all' || studentGenderFilter !== 'all'
                ? 'Try resetting your status or gender filter, or searching with different keywords.'
                : 'Build your global student roster. You can record personal info, contact details, and enroll them into classes.'}
            </p>
            {!search && statusFilter === 'all' && studentGenderFilter === 'all' && (
              <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Add First Student
              </Button>
            )}
            {(search || statusFilter !== 'all' || studentGenderFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setStudentGenderFilter('all');
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
            {sortedStudents.map((student) => {
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

                    <div className="shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="More options"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">More options</span>
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            onClick={() => setEditingStudent(student)}
                            className="cursor-pointer gap-2"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setStudentToDelete(student)}
                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                  {sortedStudents.map((student) => {
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
                          <div className="flex items-center justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="More options"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">More options</span>
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem
                                  onClick={() => setEditingStudent(student)}
                                  className="cursor-pointer gap-2"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setStudentToDelete(student)}
                                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
