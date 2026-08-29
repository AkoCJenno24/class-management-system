/**
 * Class Detail Page — Workspace view for a single class.
 * Provides 5 tabs:
 * 1) Enrolled Students
 * 2) Activities & Quizzes (Create, configure scoring, manage assessments)
 * 3) Daily Attendance Sheet
 * 4) Grades & Combined Averages
 * 5) Class Settings (Edit/Delete)
 */
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getClass,
  updateClass,
  deleteClass,
  archiveClass,
  restoreClass,
  onStudentsChange,
  onClassGradesChange,
  onClassActivitiesChange,
  removeStudentFromClass,
} from '@/lib/firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { AddStudentToClassDialog } from '@/components/classes/AddStudentToClassDialog';
import { AddGradeDialog } from '@/components/grades/AddGradeDialog';
import { GradeTable } from '@/components/grades/GradeTable';
import { AttendanceMonitor } from '@/components/attendance/AttendanceMonitor';
import { ActivityManager } from '@/components/activities/ActivityManager';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { showGraceUndoToast } from '@/components/ui/grace-undo-toast';
import { Badge } from '@/components/ui/badge';
import { StudentAvatar } from '@/components/students/StudentAvatar';
import { StudentStatusBadge } from '@/components/students/StudentStatusBadge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Users,
  Award,
  Settings,
  Trash2,
  Loader2,
  UserMinus,
  ClipboardCheck,
  BookMarked,
  DoorOpen,
  Clock,
  Pin,
  Archive,
  ArchiveRestore,
  GraduationCap,
  Search,
  X,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { ScheduleDaysPicker } from '@/components/classes/ScheduleDaysPicker';
import { TimePicker12Hour } from '@/components/classes/TimePicker12Hour';
import { AcademicYearInput } from '@/components/classes/AcademicYearInput';
import { ClassColorPicker } from '@/components/classes/ClassColorPicker';
import { togglePinClass } from '@/lib/firebase/firestore';
import type { Class, Student, Grade, Activity, ClassColor } from '@/types';
import {
  calculatePercentage,
  formatGrade,
  getGradeColor,
  formatStudentFullName,
  formatClassSchedule,
} from '@/lib/utils';
import { DEFAULT_GRADING_SCALE } from '@/types';

export function ClassDetailPage() {
  const { id: classId } = useParams<{ id: string }>();
  const { user, teacherProfile } = useAuth();
  const navigate = useNavigate();

  const [currentClass, setCurrentClass] = useState<Class | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & form state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddGradeOpen, setIsAddGradeOpen] = useState(false);
  const [selectedActivityForGrade, setSelectedActivityForGrade] = useState<Activity | null>(null);

  // Search & sort state for enrolled students tab
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSort, setStudentSort] = useState<'firstName-asc' | 'firstName-desc' | 'lastName-asc' | 'lastName-desc'>('firstName-asc');
  const [studentGenderFilter, setStudentGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  // Settings form
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editAcademicYear, setEditAcademicYear] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editDays, setEditDays] = useState<string[]>([]);
  const [editColor, setEditColor] = useState<ClassColor>('default');
  const [editNameError, setEditNameError] = useState('');
  const [editNameTouched, setEditNameTouched] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [studentToRemove, setStudentToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleteClassDialogOpen, setIsDeleteClassDialogOpen] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  // Grace period & Undo registry for student removals
  const [pendingRemoveStudentIds, setPendingRemoveStudentIds] = useState<Set<string>>(new Set());
  const pendingRemovesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    const activeTimers = pendingRemovesRef.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!user || !classId) return;

    let unsubStudents: () => void;
    let unsubGrades: () => void;
    let unsubActivities: () => void;

    async function loadData() {
      if (!user || !classId) return;
      setIsLoading(true);
      const cls = await getClass(user.uid, classId);
      if (!cls) {
        toast.error('Class not found.');
        navigate('/classes');
        return;
      }
      setCurrentClass(cls);
      setEditName(cls.name);
      setEditSubject(cls.subject);
      setEditAcademicYear(cls.academicYear ?? '');
      setEditRoom(cls.room ?? '');
      setEditStartTime(cls.startTime ?? '');
      setEditEndTime(cls.endTime ?? '');
      setEditDays(Array.isArray(cls.days) ? cls.days : []);
      setEditColor(cls.color || 'default');

      unsubStudents = onStudentsChange(user.uid, setAllStudents);
      unsubGrades = onClassGradesChange(user.uid, classId, setGrades);
      unsubActivities = onClassActivitiesChange(user.uid, classId, setActivities);
      setIsLoading(false);
    }

    loadData();

    return () => {
      if (unsubStudents) unsubStudents();
      if (unsubGrades) unsubGrades();
      if (unsubActivities) unsubActivities();
    };
  }, [user, classId, navigate]);

  if (isLoading || !currentClass) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter students enrolled in this specific class (excluding pending removals)
  const enrolledStudents = allStudents.filter(
    (s) => s.classIds.includes(classId!) && !pendingRemoveStudentIds.has(s.id)
  );

  // Filter enrolled students strictly by First Name, Middle Name, and Last Name + Gender
  const filteredEnrolledStudents = enrolledStudents.filter((s) => {
    // Gender filter
    if (studentGenderFilter !== 'all') {
      const g = (s.gender || '').toLowerCase().trim();
      if (g !== studentGenderFilter) return false;
    }

    // Name search
    const term = studentSearch.toLowerCase().trim();
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

  // Sort filtered enrolled students by First Name or Last Name
  const sortedEnrolledStudents = [...filteredEnrolledStudents].sort((a, b) => {
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

  const scale = teacherProfile?.gradingScale || DEFAULT_GRADING_SCALE;

  // Calculate class average percentage
  const totalPercentage = grades.reduce(
    (sum, g) => sum + calculatePercentage(g.score, g.maxScore),
    0
  );
  const averagePercentage =
    grades.length > 0 ? Math.round(totalPercentage / grades.length) : 0;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditNameTouched(true);
    if (!editName.trim()) {
      setEditNameError('Class name is required.');
      toast.error('Please enter a class name.');
      return;
    }
    if (editName.trim().length < 2) {
      setEditNameError('Class name must be at least 2 characters.');
      toast.error('Class name must be at least 2 characters.');
      return;
    }
    setEditNameError('');

    if (!user || !classId) return;

    setIsSavingSettings(true);
    try {
      await updateClass(user.uid, classId, {
        name: editName.trim(),
        subject: editSubject.trim(),
        academicYear: editAcademicYear.trim(),
        room: editRoom.trim(),
        startTime: editStartTime.trim(),
        endTime: editEndTime.trim(),
        days: editDays,
        color: editColor,
      });
      setCurrentClass((prev) =>
        prev
          ? {
              ...prev,
              name: editName.trim(),
              subject: editSubject.trim(),
              academicYear: editAcademicYear.trim(),
              room: editRoom.trim(),
              startTime: editStartTime.trim(),
              endTime: editEndTime.trim(),
              days: editDays,
              color: editColor,
            }
          : null
      );
      toast.success('Class settings saved!');
    } catch {
      toast.error('Failed to update class settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleConfirmArchiveClass = async () => {
    if (!user || !classId || !currentClass) return;

    setIsArchiving(true);
    try {
      await archiveClass(user.uid, classId);
      setCurrentClass((prev) => (prev ? { ...prev, status: 'archived', isPinned: false } : null));
      toast.success(`Class "${currentClass.name}" moved to archive.`);
      setIsArchiveDialogOpen(false);
    } catch {
      toast.error('Failed to archive class.');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreClass = async () => {
    if (!user || !classId || !currentClass) return;

    setIsRestoring(true);
    try {
      await restoreClass(user.uid, classId);
      setCurrentClass((prev) => (prev ? { ...prev, status: 'active' } : null));
      toast.success(`Class "${currentClass.name}" restored to active classes!`);
    } catch {
      toast.error('Failed to restore class.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleConfirmDeleteClass = async () => {
    if (!user || !classId) return;

    setIsDeletingClass(true);
    try {
      await deleteClass(user.uid, classId);
      toast.success(`Class "${currentClass.name}" deleted.`);
      navigate('/classes');
    } catch {
      toast.error('Failed to delete class.');
      setIsDeletingClass(false);
    }
  };

  const handleConfirmRemoveStudent = () => {
    if (!user || !classId || !studentToRemove) return;

    const { id: studentId, name: studentName } = studentToRemove;
    setStudentToRemove(null);

    // Optimistically hide student from class
    setPendingRemoveStudentIds((prev) => new Set(prev).add(studentId));

    const timeoutId = setTimeout(async () => {
      try {
        await removeStudentFromClass(user.uid, studentId, classId);
      } catch {
        toast.error(`Failed to remove ${studentName} from class.`);
      } finally {
        pendingRemovesRef.current.delete(studentId);
        setPendingRemoveStudentIds((prev) => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
      }
    }, 5000);

    pendingRemovesRef.current.set(studentId, timeoutId);

    showGraceUndoToast({
      title: 'Student removed from class',
      subtitle: `${studentName} removed from ${currentClass.name}`,
      duration: 5000,
      onUndo: () => {
        const timer = pendingRemovesRef.current.get(studentId);
        if (timer) {
          clearTimeout(timer);
          pendingRemovesRef.current.delete(studentId);
        }
        setPendingRemoveStudentIds((prev) => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
        toast.success(`Restored ${studentName} to ${currentClass.name}`);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Archived Notice Banner */}
      {currentClass.status === 'archived' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
            <Archive className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              This class is in the archive. All student records, grades, activities, and attendance are preserved and viewable.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRestoreClass}
            disabled={isRestoring}
            className="shrink-0 bg-background hover:bg-muted text-foreground cursor-pointer text-xs h-7.5 shadow-2xs"
          >
            {isRestoring ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <ArchiveRestore className="h-3.5 w-3.5 mr-1.5 text-primary" />
            )}
            Restore to Active
          </Button>
        </div>
      )}

      {/* Top bar: Back button + Class info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0 h-9 w-9 mt-0.5 sm:mt-0">
            <Link to={currentClass.status === 'archived' ? '/classes/archived' : '/classes'}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to classes</span>
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words">{currentClass.name}</h1>
              {currentClass.status === 'archived' && (
                <Badge variant="outline" className="text-xs shrink-0 font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                  <Archive className="h-3 w-3 mr-1 text-amber-600" />
                  Archived
                </Badge>
              )}
              {currentClass.academicYear && (
                <Badge variant="outline" className="text-xs shrink-0 font-normal bg-card">
                  <GraduationCap className="h-3 w-3 mr-1 text-primary" />
                  {currentClass.academicYear}
                </Badge>
              )}
              {currentClass.subject && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {currentClass.subject}
                </Badge>
              )}
              {currentClass.room && (
                <Badge variant="outline" className="text-xs shrink-0 font-normal">
                  <DoorOpen className="h-3 w-3 mr-1 text-primary" />
                  {currentClass.room}
                </Badge>
              )}
            </div>
            {formatClassSchedule(currentClass.days, currentClass.startTime, currentClass.endTime) && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{formatClassSchedule(currentClass.days, currentClass.startTime, currentClass.endTime)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons (Only for active classes) */}
        {currentClass.status !== 'archived' && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <Button
              variant={currentClass.isPinned ? "default" : "outline"}
              size="sm"
              onClick={async () => {
                if (!user || !classId) return;
                const nextPinned = !currentClass.isPinned;
                try {
                  await togglePinClass(user.uid, classId, nextPinned);
                  setCurrentClass((prev) => prev ? { ...prev, isPinned: nextPinned } : null);
                  toast.success(nextPinned ? `Pinned "${currentClass.name}" to top` : `Unpinned "${currentClass.name}"`);
                } catch {
                  toast.error('Failed to update pin state.');
                }
              }}
              className="cursor-pointer text-xs sm:text-sm shadow-xs"
              title={currentClass.isPinned ? "Unpin class" : "Pin class to top"}
            >
              <Pin className={`h-3.5 w-3.5 mr-1.5 ${currentClass.isPinned ? 'fill-current' : ''}`} />
              <span>{currentClass.isPinned ? 'Pinned' : 'Pin'}</span>
            </Button>

            <Button variant="outline" onClick={() => setIsAddStudentOpen(true)} className="cursor-pointer flex-1 sm:flex-initial text-xs sm:text-sm">
              <Users className="mr-1.5 h-4 w-4" />
              Enroll Student
            </Button>
            <Button
              onClick={() => {
                setSelectedActivityForGrade(null);
                setIsAddGradeOpen(true);
              }}
              disabled={enrolledStudents.length === 0}
              className="cursor-pointer flex-1 sm:flex-initial text-xs sm:text-sm shadow-xs"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Grade
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="students" className="space-y-6">
        <div className="w-full overflow-x-auto pb-1.5 scrollbar-none touch-scroll">
          <TabsList className="inline-flex h-auto w-auto p-1 gap-1 bg-muted/80 rounded-xl border border-border/60">
            <TabsTrigger
              value="students"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Users className="h-4 w-4" />
              <span>Students</span>
              <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[11px] font-semibold">
                {enrolledStudents.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="activities"
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg cursor-pointer"
            >
              <BookMarked className="h-4 w-4" />
              <span>Activities</span>
              <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[11px] font-semibold">
                {activities.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg cursor-pointer"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>Attendance</span>
            </TabsTrigger>
            <TabsTrigger
              value="grades"
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg cursor-pointer"
            >
              <Award className="h-4 w-4" />
              <span>Grades</span>
              <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[11px] font-semibold">
                {grades.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Students */}
        <TabsContent value="students" className="space-y-4">
          {enrolledStudents.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground mb-3" />
                <h4 className="text-base font-semibold">No students in this class yet</h4>
                <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                  {currentClass.status === 'archived'
                    ? 'No students were enrolled in this archived class.'
                    : 'Enroll students from your global roster to start tracking attendance and grades.'}
                </p>
                {currentClass.status !== 'archived' && (
                  <Button onClick={() => setIsAddStudentOpen(true)} className="cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" />
                    Enroll Students
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search students by name (first, middle, last)..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-9 pr-8 text-xs sm:text-sm h-9 shadow-2xs"
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-full hover:bg-muted"
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span className="sr-only">Clear search</span>
                    </button>
                  )}
                </div>

                {/* Sort Option */}
                <div className="flex items-center gap-1.5 shrink-0">
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

              {/* Students Grid or Empty Search State */}
              {sortedEnrolledStudents.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <Search className="h-8 w-8 text-muted-foreground mb-2 opacity-60" />
                    <h4 className="text-sm font-semibold">No students found</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mt-0.5 mb-3">
                      {studentSearch && studentGenderFilter !== 'all'
                        ? `No ${studentGenderFilter} students match "${studentSearch}".`
                        : studentSearch
                        ? `No enrolled students match "${studentSearch}".`
                        : `No ${studentGenderFilter} students enrolled in this class.`}
                    </p>
                    <div className="flex items-center gap-2">
                      {studentSearch && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStudentSearch('')}
                          className="text-xs cursor-pointer h-8"
                        >
                          <X className="mr-1.5 h-3.5 w-3.5" />
                          Clear Search
                        </Button>
                      )}
                      {studentGenderFilter !== 'all' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStudentGenderFilter('all')}
                          className="text-xs cursor-pointer h-8"
                        >
                          <X className="mr-1.5 h-3.5 w-3.5" />
                          Reset Filter
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedEnrolledStudents.map((student) => (
                    <Card
                      key={student.id}
                      className="border-border shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <StudentAvatar student={student} size="default" showStatusIndicator />
                            <div>
                              <CardTitle className="text-base font-semibold">
                                {formatStudentFullName(student)}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground font-mono">
                                {student.studentId ? `ID: ${student.studentId}` : 'No ID'}
                              </p>
                            </div>
                          </div>
                          <StudentStatusBadge status={student.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-1">
                          {currentClass.status !== 'archived' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                              onClick={() =>
                                setStudentToRemove({
                                  id: student.id,
                                  name: formatStudentFullName(student),
                                })
                              }
                            >
                              <UserMinus className="mr-1 h-3.5 w-3.5" />
                              Remove
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium">Enrolled Record</span>
                          )}

                          <Button variant="outline" size="sm" asChild className="text-xs cursor-pointer">
                            <Link to={`/classes/${classId}/students/${student.id}`}>
                              View Records
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Tab 2: Activities & Scoring Configuration */}
        <TabsContent value="activities" className="space-y-4">
          <ActivityManager
            classId={classId!}
            className={currentClass.name}
            activities={activities}
            grades={grades}
            readOnly={currentClass.status === 'archived'}
            onRecordGradeForActivity={(activity) => {
              if (currentClass.status === 'archived') return;
              setSelectedActivityForGrade(activity);
              setIsAddGradeOpen(true);
            }}
          />
        </TabsContent>

        {/* Tab 3: Attendance */}
        <TabsContent value="attendance" className="space-y-4">
          <AttendanceMonitor
            classId={classId!}
            students={enrolledStudents}
            readOnly={currentClass.status === 'archived'}
          />
        </TabsContent>

        {/* Tab 4: Grades */}
        <TabsContent value="grades" className="space-y-6">
          {grades.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-border shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                    Class Average
                  </CardTitle>
                  <Award className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div
                    className="text-2xl font-bold"
                    style={{
                      color: getGradeColor(averagePercentage, 100, scale),
                    }}
                  >
                    {averagePercentage}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Display: {formatGrade(averagePercentage, 100, scale)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                    Total Grades Logged
                  </CardTitle>
                  <Plus className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{grades.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Individual score entries</p>
                </CardContent>
              </Card>
              <Card className="border-border shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                    Grading System
                  </CardTitle>
                  <Settings className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold capitalize">{scale.type}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configured in teacher profile
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <GradeTable
            grades={grades}
            students={enrolledStudents}
            classId={classId!}
            readOnly={currentClass.status === 'archived'}
          />
        </TabsContent>

        {/* Tab 5: Settings */}
        <TabsContent value="settings" className="max-w-xl space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg">Class Settings</CardTitle>
              <CardDescription>
                {currentClass.status === 'archived'
                  ? 'This class is archived. Settings are in read-only mode until restored.'
                  : 'Update name, subject, room number, and schedule times for this class.'}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveSettings} noValidate>
              <CardContent className="space-y-4">
                {currentClass.status === 'archived' && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium">
                    <Archive className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>This class is in the archive (Read-Only). Restore the class to active status to make changes.</span>
                  </div>
                )}

                {/* Class Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-class-name" className="text-xs font-medium">
                    Class Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-class-name"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      if (editNameTouched) {
                        setEditNameError(e.target.value.trim() ? '' : 'Class name is required.');
                      }
                    }}
                    onBlur={() => {
                      setEditNameTouched(true);
                      setEditNameError(editName.trim() ? '' : 'Class name is required.');
                    }}
                    disabled={isSavingSettings || currentClass.status === 'archived'}
                    required
                    className={editNameError ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                  />
                  {editNameError && (
                    <p className="text-xs font-medium text-destructive">{editNameError}</p>
                  )}
                </div>

                {/* Subject & Room Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-class-subject" className="text-xs font-medium">
                      Subject <span className="text-[10px] text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="edit-class-subject"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      disabled={isSavingSettings || currentClass.status === 'archived'}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-class-room" className="text-xs font-medium flex items-center gap-1">
                      <DoorOpen className="h-3.5 w-3.5 text-primary" />
                      <span>Room Number</span>
                      <span className="text-[10px] text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="edit-class-room"
                      placeholder="e.g., Room 304, Lab 2B"
                      value={editRoom}
                      onChange={(e) => setEditRoom(e.target.value)}
                      disabled={isSavingSettings || currentClass.status === 'archived'}
                    />
                  </div>
                </div>

                {/* Academic Year (From Year - To Year) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                    <span>Academic Year</span>
                    <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <AcademicYearInput
                    value={editAcademicYear}
                    onChange={setEditAcademicYear}
                    disabled={isSavingSettings || currentClass.status === 'archived'}
                  />
                </div>

                {/* Schedule Time Pickers */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>Class Schedule Time</span>
                      <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    {(editStartTime || editEndTime) && currentClass.status !== 'archived' && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditStartTime('');
                          setEditEndTime('');
                        }}
                        className="text-[10px] text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                      >
                        Clear time
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div className="space-y-1">
                      <Label htmlFor="edit-class-start-time" className="text-[11px] text-muted-foreground">
                        Start Time
                      </Label>
                      <TimePicker12Hour
                        id="edit-class-start-time"
                        value={editStartTime}
                        onChange={setEditStartTime}
                        disabled={isSavingSettings || currentClass.status === 'archived'}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="edit-class-end-time" className="text-[11px] text-muted-foreground">
                        End Time
                      </Label>
                      <TimePicker12Hour
                        id="edit-class-end-time"
                        value={editEndTime}
                        onChange={setEditEndTime}
                        disabled={isSavingSettings || currentClass.status === 'archived'}
                      />
                    </div>
                  </div>
                </div>

                {/* Schedule Days Tag List */}
                <ScheduleDaysPicker
                  selectedDays={editDays}
                  onChange={setEditDays}
                  disabled={isSavingSettings || currentClass.status === 'archived'}
                />

                {/* Class Card Color Theme */}
                <ClassColorPicker
                  selectedColor={editColor}
                  onChange={setEditColor}
                  disabled={isSavingSettings || currentClass.status === 'archived'}
                />

                {currentClass.status !== 'archived' ? (
                  <Button type="submit" disabled={isSavingSettings || !editName.trim()} className="cursor-pointer">
                    {isSavingSettings ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Settings cannot be saved while class is archived.
                  </p>
                )}
              </CardContent>
            </form>
          </Card>

          {/* Class Archiving Section */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {currentClass.status === 'archived' ? (
                  <>
                    <ArchiveRestore className="h-5 w-5 text-primary" />
                    <span>Class Status: Archived</span>
                  </>
                ) : (
                  <>
                    <Archive className="h-5 w-5 text-amber-500" />
                    <span>Move Class to Archive</span>
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {currentClass.status === 'archived'
                  ? 'This class is currently archived. All records are safe. Restoring it will make it visible again in your active classes and sidebar quick workspaces.'
                  : 'Move this class to the archive when the academic year is completed. All student enrollments, grades, activities, and attendance records will remain preserved and accessible whenever you want.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentClass.status === 'archived' ? (
                <Button
                  type="button"
                  onClick={handleRestoreClass}
                  disabled={isRestoring}
                  className="cursor-pointer"
                >
                  {isRestoring ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                      Restore Class to Active
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsArchiveDialogOpen(true)}
                  className="border-amber-500/40 hover:bg-amber-500/10 text-amber-800 dark:text-amber-300 cursor-pointer shadow-2xs"
                >
                  <Archive className="mr-2 h-4 w-4 text-amber-500" />
                  Move to Archive
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Permanent Delete Danger Zone */}
          <Card className="border-destructive/30 shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete this class. This will remove student enrollments and all grades for this class. Use this if you created a class with wrong info and wish to delete it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setIsDeleteClassDialogOpen(true)}
                className="cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Class
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddStudentToClassDialog
        open={isAddStudentOpen}
        onOpenChange={setIsAddStudentOpen}
        classId={classId!}
        className={currentClass.name}
        students={allStudents}
      />

      <AddGradeDialog
        open={isAddGradeOpen}
        onOpenChange={(open) => {
          setIsAddGradeOpen(open);
          if (!open) setSelectedActivityForGrade(null);
        }}
        classId={classId!}
        enrolledStudents={enrolledStudents}
        activities={activities}
        grades={grades}
        preselectedActivity={selectedActivityForGrade}
      />

      {/* Remove Student Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={Boolean(studentToRemove)}
        onOpenChange={(open) => !open && setStudentToRemove(null)}
        title="Remove Student from Class?"
        itemName={studentToRemove?.name}
        description={
          studentToRemove ? (
            <>
              Are you sure you want to remove{' '}
              <span className="font-semibold text-foreground">"{studentToRemove.name}"</span> from{' '}
              <span className="font-semibold text-foreground">{currentClass.name}</span>? You will
              have a 5-second grace period with Undo to restore them.
            </>
          ) : undefined
        }
        confirmText="Remove from Class"
        onConfirm={handleConfirmRemoveStudent}
      />

      {/* Archive Class Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={isArchiveDialogOpen}
        onOpenChange={setIsArchiveDialogOpen}
        title="Move Class to Archive?"
        itemName={currentClass.name}
        description={
          <>
            Are you sure you want to move <span className="font-semibold text-foreground">"{currentClass.name}"</span> to your archive? All student records, grades, activities, and attendance will remain safe and viewable under <span className="font-semibold text-foreground">Archived Classes</span>. You can restore this class back to active anytime.
          </>
        }
        confirmText="Move to Archive"
        isLoading={isArchiving}
        onConfirm={handleConfirmArchiveClass}
      />

      {/* Delete Class Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteClassDialogOpen}
        onOpenChange={setIsDeleteClassDialogOpen}
        title="Delete Class Workspace?"
        itemName={currentClass.name}
        description={
          <>
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-foreground">"{currentClass.name}"</span>? All
            activities, student enrollments, and grades for this class will be permanently removed.
          </>
        }
        confirmText="Delete Class"
        isLoading={isDeletingClass}
        onConfirm={handleConfirmDeleteClass}
      />
    </div>
  );
}
