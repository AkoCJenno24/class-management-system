/**
 * Grade Table component — Displays recorded grades and combined student averages for a class.
 * Shows:
 * 1) Student Combined Averages Summary (average across all quizzes & activities for each student)
 * 2) Detailed Activity Grade Log with filter-by-student capability
 * Formats scores according to the teacher's configured grading scale (letter, percentage, numeric).
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { deleteGrade } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EditGradeDialog } from './EditGradeDialog';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { showGraceUndoToast } from '@/components/ui/grace-undo-toast';
import { toast } from 'sonner';
import { Trash2, Calculator, Filter, ChevronRight, Pencil } from 'lucide-react';
import type { Grade, Student } from '@/types';
import { DEFAULT_GRADING_SCALE } from '@/types';
import { formatDate, formatGrade, getGradeColor, calculatePercentage, getInitials } from '@/lib/utils';

interface GradeTableProps {
  grades: Grade[];
  students: Student[];
  classId?: string;
}

export function GradeTable({ grades, students, classId }: GradeTableProps) {
  const { user, teacherProfile } = useAuth();
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);

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

  const scale = teacherProfile?.gradingScale || DEFAULT_GRADING_SCALE;

  const studentMap = useMemo(() => {
    return new Map<string, Student>(students.map((s) => [s.id, s]));
  }, [students]);

  const visibleGrades = useMemo(() => {
    return grades.filter((g) => !pendingDeleteIds.has(g.id));
  }, [grades, pendingDeleteIds]);

  // Compute per-student summaries for all enrolled students
  const studentSummaries = useMemo(() => {
    return students.map((student) => {
      const studentGrades = visibleGrades.filter((g) => g.studentId === student.id);
      const totalActivities = studentGrades.length;
      const totalScore = studentGrades.reduce((sum, g) => sum + g.score, 0);
      const totalMaxScore = studentGrades.reduce((sum, g) => sum + g.maxScore, 0);

      const averagePercentage =
        totalMaxScore > 0
          ? Math.round((totalScore / totalMaxScore) * 100)
          : null;

      const formattedGrade =
        averagePercentage !== null ? formatGrade(averagePercentage, 100, scale) : 'N/A';
      const gradeColor =
        averagePercentage !== null
          ? getGradeColor(averagePercentage, 100, scale)
          : 'text-muted-foreground';

      return {
        student,
        totalActivities,
        totalScore,
        totalMaxScore,
        averagePercentage,
        formattedGrade,
        gradeColor,
      };
    });
  }, [students, visibleGrades, scale]);

  const handleConfirmDeleteGrade = () => {
    if (!user || !gradeToDelete) return;
    const grade = gradeToDelete;
    const gradeId = grade.id;
    const student = studentMap.get(grade.studentId);
    const label = `${grade.assignmentName} (${student ? `${student.firstName} ${student.lastName}` : 'Grade'}: ${grade.score}/${grade.maxScore})`;

    setGradeToDelete(null);

    // Optimistically hide grade entry
    setPendingDeleteIds((prev) => new Set(prev).add(gradeId));

    const timeoutId = setTimeout(async () => {
      try {
        await deleteGrade(user.uid, gradeId);
      } catch {
        toast.error(`Failed to delete grade "${label}".`);
      } finally {
        pendingDeletesRef.current.delete(gradeId);
        setPendingDeleteIds((prev) => {
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
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.delete(gradeId);
          return next;
        });
        toast.success(`Restored grade for "${label}"`);
      },
    });
  };

  const filteredGrades = useMemo(() => {
    if (selectedStudentFilter === 'all') return visibleGrades;
    return visibleGrades.filter((g) => g.studentId === selectedStudentFilter);
  }, [visibleGrades, selectedStudentFilter]);

  if (grades.length === 0 && students.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No students enrolled or grades recorded yet. Enroll students and click "Add Grade" to start.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── 1. Student Combined Averages Summary Section ─── */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Combined Student Averages
              </CardTitle>
              <CardDescription>
                Cumulative performance calculated across all quizzes, exams, and graded activities.
              </CardDescription>
            </div>
            <Badge variant="outline" className="self-start sm:self-auto text-xs py-1">
              Grading Scale: <span className="font-semibold ml-1 capitalize">{scale.type}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">Activities Taken</TableHead>
                  <TableHead className="text-center">Total Points</TableHead>
                  <TableHead>Performance Bar</TableHead>
                  <TableHead className="text-center">Combined Average</TableHead>
                  <TableHead className="text-right">Overall Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentSummaries.map(
                  ({
                    student,
                    totalActivities,
                    totalScore,
                    totalMaxScore,
                    averagePercentage,
                    formattedGrade,
                    gradeColor,
                  }) => (
                    <TableRow
                      key={student.id}
                      className="cursor-pointer"
                      onClick={() =>
                        setSelectedStudentFilter(
                          selectedStudentFilter === student.id ? 'all' : student.id
                        )
                      }
                      title="Click to filter activity log for this student"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {getInitials(student.firstName, student.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-semibold text-foreground">
                              {student.firstName} {student.lastName}
                            </span>
                            {student.studentId && (
                              <span className="ml-2 text-xs text-muted-foreground font-mono">
                                ({student.studentId})
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">{totalActivities}</span>{' '}
                        <span className="text-xs text-muted-foreground">
                          {totalActivities === 1 ? 'activity' : 'activities'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {totalActivities > 0 ? (
                          <span>
                            {totalScore} / {totalMaxScore} pts
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="min-w-[130px]">
                        {averagePercentage !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-full max-w-[120px] rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(averagePercentage, 100)}%`,
                                  backgroundColor: gradeColor,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                              {averagePercentage}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No activities yet</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {averagePercentage !== null ? (
                          <span style={{ color: gradeColor }}>{averagePercentage}%</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {averagePercentage !== null ? (
                            <Badge
                              variant="outline"
                              className="font-bold px-2.5 py-1 text-sm shadow-xs"
                              style={{
                                borderColor: gradeColor,
                                color: gradeColor,
                                backgroundColor: `${gradeColor}10`,
                              }}
                            >
                              {formattedGrade}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              No Grades
                            </Badge>
                          )}

                          {classId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link to={`/classes/${classId}/students/${student.id}`}>
                                Dashboard
                                <ChevronRight className="ml-1 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. Detailed Activity Grade Log ─── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Activity & Quiz Grade Log</h3>
            <p className="text-xs text-muted-foreground">
              Individual grade records for assignments, tests, and homework.
            </p>
          </div>

          {/* Student Filter dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={selectedStudentFilter}
              onValueChange={(val) => setSelectedStudentFilter(val || 'all')}
            >
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Filter student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students ({grades.length} entries)</SelectItem>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredGrades.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {selectedStudentFilter === 'all'
              ? 'No grades recorded yet. Click "Add Grade" to enter scores.'
              : 'No grades recorded for this selected student.'}
          </div>
        ) : (
          <Card className="border-border shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Student</TableHead>
                  <TableHead>Assignment / Quiz</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Raw Score</TableHead>
                  <TableHead>Grade Display</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGrades.map((grade) => {
                  const student = studentMap.get(grade.studentId);
                  const studentName = student
                    ? `${student.firstName} ${student.lastName}`
                    : 'Unknown Student';
                  const percentage = calculatePercentage(grade.score, grade.maxScore);
                  const displayGrade = formatGrade(grade.score, grade.maxScore, scale);
                  const color = getGradeColor(grade.score, grade.maxScore, scale);

                  return (
                    <TableRow key={grade.id}>
                      <TableCell className="font-semibold text-foreground">
                        {studentName}
                        {student?.studentId && (
                          <span className="ml-2 text-xs text-muted-foreground font-mono">
                            ({student.studentId})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{grade.assignmentName}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(grade.date)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {grade.score} / {grade.maxScore} ({percentage}%)
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Edit Grade Dialog */}
      <EditGradeDialog
        grade={editingGrade}
        student={editingGrade ? studentMap.get(editingGrade.studentId) : null}
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
        itemName={gradeToDelete ? `${gradeToDelete.assignmentName} (${studentMap.get(gradeToDelete.studentId)?.firstName || 'Student'})` : ''}
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
