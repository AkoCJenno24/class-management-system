/**
 * Student Class Dashboard Page — Comprehensive single-student record for a specific class workspace.
 * Displays:
 * 1) Student profile & class enrollment metadata
 * 2) Combined class performance stats (Average, High/Low score, Total Points, Completion Count)
 * 3) Chronological activity/quiz records table with score editing & deletion
 * 4) Quick "Record New Grade" action
 */
import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getClass,
  onStudentsChange,
  onClassGradesChange,
  onClassAttendanceChange,
  onClassActivitiesChange,
  deleteGrade,
} from '@/lib/firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { StudentAvatar } from '@/components/students/StudentAvatar';
import { StudentStatusBadge } from '@/components/students/StudentStatusBadge';
import { EditStudentDialog } from '@/components/students/EditStudentDialog';
import { AddGradeDialog } from '@/components/grades/AddGradeDialog';
import { EditGradeDialog } from '@/components/grades/EditGradeDialog';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { showGraceUndoToast } from '@/components/ui/grace-undo-toast';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Sparkles,
  TrendingUp,
  Award,
  BookOpen,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Pencil,
  GraduationCap,
  Mail,
  Phone,
  UserCheck,
  MapPin,
  User,
  Archive,
} from 'lucide-react';
import type { Class, Student, Grade, AttendanceRecord, AttendanceStatus, Activity } from '@/types';
import { DEFAULT_GRADING_SCALE } from '@/types';
import {
  formatDate,
  calculatePercentage,
  formatGrade,
  getGradeColor,
  formatStudentFullName,
  formatClassSchedule,
} from '@/lib/utils';

export function StudentClassDashboardPage() {
  const { classId, studentId } = useParams<{ classId: string; studentId: string }>();
  const { user, teacherProfile } = useAuth();
  const navigate = useNavigate();

  const [currentClass, setCurrentClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [allClassGrades, setAllClassGrades] = useState<Grade[]>([]);
  const [allClassAttendance, setAllClassAttendance] = useState<AttendanceRecord[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add & edit grade modals
  const [isAddGradeOpen, setIsAddGradeOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);

  const scale = teacherProfile?.gradingScale || DEFAULT_GRADING_SCALE;

  useEffect(() => {
    if (!user || !classId) return;

    let unsubStudents: () => void;
    let unsubGrades: () => void;
    let unsubAttendance: () => void;
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

      unsubStudents = onStudentsChange(user.uid, setStudents);
      unsubGrades = onClassGradesChange(user.uid, classId, setAllClassGrades);
      unsubAttendance = onClassAttendanceChange(user.uid, classId, setAllClassAttendance);
      unsubActivities = onClassActivitiesChange(user.uid, classId, setActivities);
      setIsLoading(false);
    }

    loadData();

    return () => {
      if (unsubStudents) unsubStudents();
      if (unsubGrades) unsubGrades();
      if (unsubAttendance) unsubAttendance();
      if (unsubActivities) unsubActivities();
    };
  }, [user, classId, navigate]);

  const currentStudent = useMemo(
    () => students.find((s) => s.id === studentId) || null,
    [students, studentId]
  );

  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);

  // Grace Period & Undo registry
  const [pendingDeleteGradeIds, setPendingDeleteGradeIds] = useState<Set<string>>(new Set());
  const pendingDeletesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    const activeTimers = pendingDeletesRef.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // Filter grades specifically for this student in this class (excluding pending deletion)
  const studentGrades = useMemo(
    () => allClassGrades.filter((g) => g.studentId === studentId && !pendingDeleteGradeIds.has(g.id)),
    [allClassGrades, studentId, pendingDeleteGradeIds]
  );

  // Performance calculations
  const stats = useMemo(() => {
    const count = studentGrades.length;
    if (count === 0) {
      return {
        totalActivities: 0,
        totalScore: 0,
        totalMaxScore: 0,
        averagePercentage: null,
        formattedGrade: 'N/A',
        gradeColor: '#71717a',
        highestPercentage: null,
        lowestPercentage: null,
      };
    }

    const totalScore = studentGrades.reduce((sum, g) => sum + g.score, 0);
    const totalMaxScore = studentGrades.reduce((sum, g) => sum + g.maxScore, 0);
    const percentages = studentGrades.map((g) => calculatePercentage(g.score, g.maxScore));
    const sumPercentages = percentages.reduce((sum, p) => sum + p, 0);
    const averagePercentage = Math.round(sumPercentages / count);
    const formattedGrade = formatGrade(averagePercentage, 100, scale);
    const gradeColor = getGradeColor(averagePercentage, 100, scale);
    const highestPercentage = Math.max(...percentages);
    const lowestPercentage = Math.min(...percentages);

    return {
      totalActivities: count,
      totalScore,
      totalMaxScore,
      averagePercentage,
      formattedGrade,
      gradeColor,
      highestPercentage,
      lowestPercentage,
    };
  }, [studentGrades, scale]);

  const attendanceStats = useMemo(() => {
    if (!studentId || allClassAttendance.length === 0) {
      return {
        totalRecordedDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        excusedDays: 0,
        rate: null,
        records: [] as Array<{ date: string; status: AttendanceStatus }>,
      };
    }

    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let excusedDays = 0;
    const records: Array<{ date: string; status: AttendanceStatus }> = [];

    allClassAttendance.forEach((rec) => {
      const status = rec.statuses[studentId];
      if (status) {
        records.push({ date: rec.date, status });
        if (status === 'present') presentDays++;
        else if (status === 'absent') absentDays++;
        else if (status === 'late') lateDays++;
        else if (status === 'excused') excusedDays++;
      }
    });

    const total = records.length;
    const attended = presentDays + lateDays;
    const rate = total > 0 ? Math.round((attended / total) * 100) : null;

    return {
      totalRecordedDays: total,
      presentDays,
      absentDays,
      lateDays,
      excusedDays,
      rate,
      records,
    };
  }, [studentId, allClassAttendance]);

  const handleConfirmDeleteGrade = () => {
    if (!user || !gradeToDelete) return;
    const grade = gradeToDelete;
    const gradeId = grade.id;
    const label = `${grade.assignmentName} (${grade.score}/${grade.maxScore})`;

    setGradeToDelete(null);

    // Optimistically hide grade entry
    setPendingDeleteGradeIds((prev) => new Set(prev).add(gradeId));

    const timeoutId = setTimeout(async () => {
      try {
        await deleteGrade(user.uid, gradeId);
      } catch {
        toast.error(`Failed to delete grade "${label}".`);
      } finally {
        pendingDeletesRef.current.delete(gradeId);
        setPendingDeleteGradeIds((prev) => {
          const next = new Set(prev);
          next.delete(gradeId);
          return next;
        });
      }
    }, 5000);

    pendingDeletesRef.current.set(gradeId, timeoutId);

    showGraceUndoToast({
      title: 'Grade entry deleted',
      subtitle: label,
      duration: 5000,
      onUndo: () => {
        const timer = pendingDeletesRef.current.get(gradeId);
        if (timer) {
          clearTimeout(timer);
          pendingDeletesRef.current.delete(gradeId);
        }
        setPendingDeleteGradeIds((prev) => {
          const next = new Set(prev);
          next.delete(gradeId);
          return next;
        });
        toast.success(`Restored grade for "${label}"`);
      },
    });
  };

  if (isLoading || !currentClass) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentStudent && !isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/classes/${classId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Class
          </Link>
        </Button>
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            Student record not found or has been removed.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (    <div className="space-y-6">
      {/* Archived Notice Banner */}
      {currentClass.status === 'archived' && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium shadow-2xs">
          <Archive className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            This student performance record belongs to an archived class workspace (Read-Only).
          </span>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          to={currentClass.status === 'archived' ? '/classes/archived' : '/classes'}
          className="hover:text-foreground transition-colors"
        >
          {currentClass.status === 'archived' ? 'Archive Classes' : 'Classes'}
        </Link>
        <span>/</span>
        <Link to={`/classes/${classId}`} className="hover:text-foreground transition-colors">
          {currentClass.name}
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">
          {currentStudent ? formatStudentFullName(currentStudent) : 'Student'}
        </span>
      </div>

      {/* Student Profile Hero Banner */}
      <Card className="border-border bg-card shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 min-w-0">
              <Button variant="outline" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 self-start sm:self-center" asChild>
                <Link to={`/classes/${classId}`}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Back</span>
                </Link>
              </Button>

              <StudentAvatar
                student={currentStudent}
                size="xl"
                showStatusIndicator
                className="shrink-0 ring-2 ring-primary/20 shadow-md"
              />

              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground break-words">
                    {currentStudent ? formatStudentFullName(currentStudent) : ''}
                  </h2>
                  {currentStudent?.status && (
                    <StudentStatusBadge status={currentStudent.status} />
                  )}
                  {currentStudent?.studentId && (
                    <Badge variant="secondary" className="font-mono text-xs font-normal">
                      ID: {currentStudent.studentId}
                    </Badge>
                  )}
                  {currentStudent?.gradeLevel && (
                    <Badge variant="outline" className="text-xs font-normal">
                      <GraduationCap className="h-3 w-3 mr-1 text-primary" />
                      {currentStudent.gradeLevel}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Enrolled in <span className="font-semibold text-foreground">{currentClass.name}</span>
                  {currentClass.subject ? ` • ${currentClass.subject}` : ''}
                  {currentClass.room ? ` • ${currentClass.room}` : ''}
                  {formatClassSchedule(currentClass.days, currentClass.startTime, currentClass.endTime)
                    ? ` • ${formatClassSchedule(currentClass.days, currentClass.startTime, currentClass.endTime)}`
                    : ''}
                </p>

                {/* Contact & Bio Info Chips */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                  {currentStudent?.gender && (
                    <span className="flex items-center gap-1 capitalize">
                      <User className="h-3 w-3 text-primary/70 shrink-0" />
                      {currentStudent.gender}
                    </span>
                  )}
                  {currentStudent?.dateOfBirth && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-primary/70 shrink-0" />
                      Born {formatDate(currentStudent.dateOfBirth)}
                    </span>
                  )}
                  {currentStudent?.parentGuardian && (
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-primary/70 shrink-0" />
                      Guardian: <span className="text-foreground font-medium">{currentStudent.parentGuardian}</span>
                    </span>
                  )}
                  {currentStudent?.email && (
                    <a
                      href={`mailto:${currentStudent.email}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[160px]">{currentStudent.email}</span>
                    </a>
                  )}
                  {currentStudent?.phone && (
                    <a
                      href={`tel:${currentStudent.phone}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Phone className="h-3 w-3 shrink-0" />
                      {currentStudent.phone}
                    </a>
                  )}
                  {currentStudent?.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary/70 shrink-0" />
                      <span className="truncate max-w-[180px]">{currentStudent.address}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 self-stretch sm:self-start lg:self-center">
              <Button
                variant="outline"
                onClick={() => setIsEditStudentOpen(true)}
                className="cursor-pointer shadow-2xs flex-1 sm:flex-initial text-xs sm:text-sm"
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit Profile
              </Button>
              {currentClass.status !== 'archived' && (
                <Button onClick={() => setIsAddGradeOpen(true)} className="shadow-xs cursor-pointer flex-1 sm:flex-initial text-xs sm:text-sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Record Grade
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Analytics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Combined Grade Average */}
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Combined Class Average
            </CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {stats.averagePercentage !== null ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold" style={{ color: stats.gradeColor }}>
                    {stats.averagePercentage}%
                  </span>
                  <Badge
                    variant="outline"
                    className="font-bold text-sm px-2 py-0.5"
                    style={{
                      borderColor: stats.gradeColor,
                      color: stats.gradeColor,
                      backgroundColor: `${stats.gradeColor}10`,
                    }}
                  >
                    {stats.formattedGrade}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Across all {stats.totalActivities} activities
                </p>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-bold text-muted-foreground">No Grades</div>
                <p className="text-xs text-muted-foreground mt-1.5">No activities recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metric 2: Total Activities */}
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Activities Completed
            </CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">
              {stats.totalActivities}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Quizzes, exams, and assignments
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Total Points Earned */}
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Cumulative Points
            </CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">
              {stats.totalActivities > 0
                ? `${stats.totalScore} / ${stats.totalMaxScore}`
                : '0 / 0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Total raw points accumulated</p>
          </CardContent>
        </Card>

        {/* Metric 4: High / Low Range */}
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Score Range
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {stats.highestPercentage !== null ? (
              <div>
                <div className="text-lg font-bold text-foreground">
                  High: <span className="text-emerald-500">{stats.highestPercentage}%</span> • Low:{' '}
                  <span className="text-orange-500">{stats.lowestPercentage}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Peak vs minimum score</p>
              </div>
            ) : (
              <div>
                <div className="text-lg font-bold text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground mt-1.5">Requires graded activities</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metric 5: Attendance Rate */}
        <Card className="border-border shadow-xs sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Attendance Rate
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {attendanceStats.rate !== null ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-2xl font-extrabold"
                    style={{
                      color:
                        attendanceStats.rate >= 90
                          ? '#22C55E'
                          : attendanceStats.rate >= 75
                          ? '#EAB308'
                          : '#EF4444',
                    }}
                  >
                    {attendanceStats.rate}%
                  </span>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {attendanceStats.presentDays + attendanceStats.lateDays}/
                    {attendanceStats.totalRecordedDays} Days
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {attendanceStats.absentDays} absences recorded
                </p>
              </div>
            ) : (
              <div>
                <div className="text-lg font-bold text-muted-foreground">No Records</div>
                <p className="text-xs text-muted-foreground mt-1.5">No attendance tracked yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Activity & Quiz Records Table */}
      <Card className="border-border shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Class Grade Breakdown</CardTitle>
            <CardDescription>
              Every test, quiz, and assignment recorded for {currentStudent?.firstName} in{' '}
              {currentClass.name}.
            </CardDescription>
          </div>
          {studentGrades.length > 0 && (
            <Badge variant="secondary" className="self-start sm:self-auto text-xs font-normal">
              {studentGrades.length} Records
            </Badge>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {studentGrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed p-6">
              <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
              <h4 className="font-semibold text-base">No activity grades recorded yet</h4>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                {currentClass.status === 'archived'
                  ? 'No grades were recorded for this student in this archived class.'
                  : 'Record quiz scores, homework assignments, or exam results for this student.'}
              </p>
              {currentClass.status !== 'archived' && (
                <Button onClick={() => setIsAddGradeOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record First Grade
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Assignment / Quiz Name</TableHead>
                    <TableHead>Date Recorded</TableHead>
                    <TableHead>Raw Score</TableHead>
                    <TableHead>Score Percentage</TableHead>
                    <TableHead>Grade Display</TableHead>
                    {currentClass.status !== 'archived' && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentGrades.map((grade) => {
                    const percentage = calculatePercentage(grade.score, grade.maxScore);
                    const displayGrade = formatGrade(grade.score, grade.maxScore, scale);
                    const color = getGradeColor(grade.score, grade.maxScore, scale);

                    return (
                      <TableRow key={grade.id}>
                        <TableCell className="font-semibold text-foreground">
                          {grade.assignmentName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(grade.date)}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-medium">
                          {grade.score} / {grade.maxScore}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(percentage, 100)}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                            <span className="text-xs font-bold" style={{ color }}>
                              {percentage}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-bold text-xs"
                            style={{
                              borderColor: color,
                              color: color,
                              backgroundColor: `${color}10`,
                            }}
                          >
                            {displayGrade}
                          </Badge>
                        </TableCell>
                        {currentClass.status !== 'archived' && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => setEditingGrade(grade)}
                                title="Edit grade"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                                onClick={() => setGradeToDelete(grade)}
                                title="Delete grade"
                              >
                                <Trash2 className="h-4 w-4" />
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

      {/* Attendance History Section */}
      <Card className="border-border shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Daily Attendance History
            </CardTitle>
            <CardDescription>
              Chronological attendance log for {currentStudent?.firstName} in {currentClass.name}.
            </CardDescription>
          </div>
          {attendanceStats.totalRecordedDays > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                {attendanceStats.presentDays} Present
              </Badge>
              {attendanceStats.absentDays > 0 && (
                <Badge variant="outline" className="text-red-600 bg-red-500/10 border-red-500/30">
                  {attendanceStats.absentDays} Absent
                </Badge>
              )}
              {attendanceStats.lateDays > 0 && (
                <Badge variant="outline" className="text-yellow-600 bg-yellow-500/10 border-yellow-500/30">
                  {attendanceStats.lateDays} Late
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {attendanceStats.records.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No attendance records found for this student in this class yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Attendance Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceStats.records.map((rec, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-foreground">
                        {rec.date}
                      </TableCell>
                      <TableCell className="text-right">
                        {rec.status === 'present' && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Present
                          </Badge>
                        )}
                        {rec.status === 'absent' && (
                          <Badge
                            variant="outline"
                            className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 font-bold"
                          >
                            <XCircle className="mr-1 h-3 w-3" /> Absent
                          </Badge>
                        )}
                        {rec.status === 'late' && (
                          <Badge
                            variant="outline"
                            className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 font-bold"
                          >
                            <Clock className="mr-1 h-3 w-3" /> Late
                          </Badge>
                        )}
                        {rec.status === 'excused' && (
                          <Badge
                            variant="outline"
                            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold"
                          >
                            Excused
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Grade Dialog for this specific student */}
      {currentStudent && (
        <AddGradeDialog
          open={isAddGradeOpen}
          onOpenChange={setIsAddGradeOpen}
          classId={classId!}
          enrolledStudents={[currentStudent]}
          activities={activities}
          grades={allClassGrades}
          preselectedStudentId={currentStudent.id}
        />
      )}

      {/* Edit Student Dialog */}
      <EditStudentDialog
        student={currentStudent}
        open={isEditStudentOpen}
        onOpenChange={setIsEditStudentOpen}
      />

      {/* Edit Grade Dialog */}
      <EditGradeDialog
        grade={editingGrade}
        student={currentStudent}
        open={Boolean(editingGrade)}
        onOpenChange={(open) => {
          if (!open) setEditingGrade(null);
        }}
      />

      {/* Confirm Delete Grade Dialog */}
      <ConfirmDeleteDialog
        open={Boolean(gradeToDelete)}
        onOpenChange={(open) => !open && setGradeToDelete(null)}
        title="Delete Grade Entry?"
        itemName={gradeToDelete ? `${gradeToDelete.assignmentName} (${gradeToDelete.score}/${gradeToDelete.maxScore})` : ''}
        description={
          gradeToDelete ? (
            <>
              Are you sure you want to delete the score of{' '}
              <span className="font-bold text-foreground">
                {gradeToDelete.score} / {gradeToDelete.maxScore}
              </span>{' '}
              for <span className="font-semibold text-foreground">"{gradeToDelete.assignmentName}"</span>? You will
              have a 5-second grace period with Undo to restore it.
            </>
          ) : undefined
        }
        confirmText="Delete Grade"
        onConfirm={handleConfirmDeleteGrade}
      />
    </div>
  );
}
