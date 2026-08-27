/**
 * Add Grade dialog — record an assignment grade for a student in a class.
 * Features:
 * 1) Combobox for student selection with initials avatar and search
 * 2) Combobox for activity selection with automatic max score pre-fill
 * 3) Duplicate Prevention: Checks if the student already has a score for this activity.
 * 4) Max Score Enforcement: Student score cannot exceed the maximum score set for the activity.
 */
import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createGrade, updateGrade } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StudentAvatar } from '@/components/students/StudentAvatar';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, BookMarked, Sparkles, AlertCircle, Edit3, AlertTriangle } from 'lucide-react';
import type { Student, Activity, Grade } from '@/types';
import { formatStudentFullName } from '@/lib/utils';

interface AddGradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  enrolledStudents: Student[];
  activities?: Activity[];
  grades?: Grade[];
  preselectedActivity?: Activity | null;
  preselectedStudentId?: string | null;
}

export function AddGradeDialog({
  open,
  onOpenChange,
  classId,
  enrolledStudents,
  activities = [],
  grades = [],
  preselectedActivity = null,
  preselectedStudentId = null,
}: AddGradeDialogProps) {
  const { user, teacherProfile } = useAuth();
  const defaultMax = teacherProfile?.gradingScale?.defaultMaxScore || 100;

  const [studentId, setStudentId] = useState('');
  const [assignmentName, setAssignmentName] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState(defaultMax.toString());
  const [isLoading, setIsLoading] = useState(false);

  // Sync preselected activity and student when dialog opens
  useEffect(() => {
    if (open) {
      if (preselectedStudentId) {
        setStudentId(preselectedStudentId);
      } else if (enrolledStudents.length === 1) {
        setStudentId(enrolledStudents[0].id);
      } else {
        setStudentId('');
      }

      if (preselectedActivity) {
        setAssignmentName(preselectedActivity.name);
        setMaxScore(preselectedActivity.maxScore.toString());
      } else {
        setAssignmentName('');
        setMaxScore(defaultMax.toString());
      }

      setScore('');
    }
  }, [open, preselectedActivity, preselectedStudentId, enrolledStudents, defaultMax]);

  // Check if a grade entry already exists for this (student, activity) pair
  const existingGrade = useMemo(() => {
    if (!studentId || !assignmentName.trim()) return null;
    const normActivity = assignmentName.trim().toLowerCase();
    return (
      grades.find(
        (g) =>
          g.studentId === studentId &&
          g.assignmentName.trim().toLowerCase() === normActivity
      ) || null
    );
  }, [grades, studentId, assignmentName]);

  // Check if activity matches a pre-configured class activity
  const matchedClassActivity = useMemo(() => {
    if (!assignmentName.trim()) return null;
    return (
      activities.find(
        (a) => a.name.trim().toLowerCase() === assignmentName.trim().toLowerCase()
      ) || null
    );
  }, [activities, assignmentName]);

  // If an existing grade is found and score is empty, prefill existing score
  useEffect(() => {
    if (existingGrade && score === '') {
      setScore(existingGrade.score.toString());
      setMaxScore(existingGrade.maxScore.toString());
    }
  }, [existingGrade, score]);

  // Selected student object
  const selectedStudent = useMemo(
    () => enrolledStudents.find((s) => s.id === studentId),
    [enrolledStudents, studentId]
  );

  // Score validation against max score
  const parsedScore = parseFloat(score);
  const parsedMax = parseFloat(maxScore) || defaultMax;
  const isOverMax = !isNaN(parsedScore) && !isNaN(parsedMax) && parsedScore > parsedMax;
  const isNegative = !isNaN(parsedScore) && parsedScore < 0;

  // Options for Student Combobox
  const studentOptions: ComboboxOption[] = useMemo(() => {
    const normActivity = assignmentName.trim().toLowerCase();
    return enrolledStudents.map((s) => {
      const studentGrade = normActivity
        ? grades.find(
            (g) =>
              g.studentId === s.id &&
              g.assignmentName.trim().toLowerCase() === normActivity
          )
        : null;

      const fullName = formatStudentFullName(s);
      return {
        value: s.id,
        label: fullName,
        keywords: [s.firstName, s.middleName || '', s.lastName, s.studentId || '', s.email || ''],
        subtext: s.studentId ? `ID: ${s.studentId}` : s.email || undefined,
        icon: <StudentAvatar student={s} size="sm" />,
        badge: studentGrade ? (
          <Badge
            variant="outline"
            className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 px-1.5 py-0 font-semibold"
          >
            Scored: {studentGrade.score}/{studentGrade.maxScore}
          </Badge>
        ) : undefined,
      };
    });
  }, [enrolledStudents, grades, assignmentName]);

  // Options for Activity Combobox
  const activityOptions: ComboboxOption[] = useMemo(() => {
    return activities.map((a) => {
      const normName = a.name.trim().toLowerCase();
      const activityGrade = studentId
        ? grades.find(
            (g) =>
              g.studentId === studentId &&
              g.assignmentName.trim().toLowerCase() === normName
          )
        : null;

      return {
        value: a.name,
        label: a.name,
        keywords: [a.name, a.type, a.description || ''],
        subtext: `${a.type.toUpperCase()} • Max: ${a.maxScore} pts`,
        icon: <BookMarked className="h-4 w-4 text-primary shrink-0" />,
        badge: activityGrade ? (
          <Badge
            variant="outline"
            className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 px-1.5 py-0 font-semibold"
          >
            Scored: {activityGrade.score}/{activityGrade.maxScore}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] font-bold font-mono px-1.5 py-0">
            {a.maxScore} pts
          </Badge>
        ),
      };
    });
  }, [activities, grades, studentId]);

  // Handle activity selection from combobox (auto-fills maxScore)
  const handleSelectActivity = (selectedName: string) => {
    setAssignmentName(selectedName);
    const matchedActivity = activities.find(
      (a) => a.name.toLowerCase() === selectedName.toLowerCase()
    );
    if (matchedActivity) {
      setMaxScore(matchedActivity.maxScore.toString());
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !studentId || !assignmentName.trim() || score === '') {
      toast.error('Please fill in all required fields.');
      return;
    }

    const numScore = parseFloat(score);
    const numMax = parseFloat(maxScore) || defaultMax;

    if (isNaN(numScore) || numScore < 0) {
      toast.error('Please enter a valid numeric score.');
      return;
    }

    if (isNaN(numMax) || numMax <= 0) {
      toast.error('Please enter a valid maximum score.');
      return;
    }

    // Strict maximum score validation rule
    if (numScore > numMax) {
      toast.error(`Score cannot exceed the maximum score (${numMax} pts) for this activity.`);
      return;
    }

    setIsLoading(true);
    try {
      if (existingGrade) {
        // Update existing grade to prevent duplication!
        await updateGrade(user.uid, existingGrade.id, {
          assignmentName: assignmentName.trim(),
          score: numScore,
          maxScore: numMax,
        });
        toast.success(
          `Score updated for ${selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'student'} (duplicate prevented)!`
        );
      } else {
        // Create new grade
        await createGrade(user.uid, {
          classId,
          studentId,
          assignmentName: assignmentName.trim(),
          score: numScore,
          maxScore: numMax,
          date: new Date(),
        });
        toast.success('Grade recorded successfully!');
      }

      setAssignmentName('');
      setScore('');
      onOpenChange(false);
    } catch {
      toast.error('Failed to save grade.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existingGrade ? 'Edit Student Grade' : 'Record Student Grade'}
          </DialogTitle>
          <DialogDescription>
            {existingGrade
              ? 'Update the recorded score for this activity. Duplicate records are prevented.'
              : 'Select a student and choose or enter an activity/quiz score.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Duplicate Prevention Notice */}
          {existingGrade && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold text-xs text-amber-900 dark:text-amber-200">
                  Existing Score Found
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-semibold text-foreground">
                    {selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Student'}
                  </span>{' '}
                  already has a score of{' '}
                  <span className="font-bold text-foreground">
                    {existingGrade.score} / {existingGrade.maxScore}
                  </span>{' '}
                  for "{existingGrade.assignmentName}". Saving will update their existing score to prevent duplicate entries.
                </p>
              </div>
            </div>
          )}

          {/* Student Combobox Selection */}
          <div className="space-y-2">
            <Label htmlFor="grade-student-combobox">Student *</Label>
            <Combobox
              options={studentOptions}
              value={studentId}
              onValueChange={setStudentId}
              placeholder="Search and select student..."
              searchPlaceholder="Type student name or ID..."
              emptyText="No matching student found."
              disabled={isLoading || enrolledStudents.length === 0}
            />
          </div>

          {/* Activity Combobox Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="grade-activity-combobox">Activity / Quiz / Exam Name *</Label>
              {activities.length > 0 && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  {activities.length} defined in class
                </span>
              )}
            </div>
            <Combobox
              options={activityOptions}
              value={assignmentName}
              onValueChange={handleSelectActivity}
              placeholder="Search or enter activity name..."
              searchPlaceholder="Type activity name..."
              emptyText="No matching defined activity."
              allowCustomValue={true}
              disabled={isLoading}
            />
          </div>

          {/* Score & Max Score */}
          <div className="grid grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <div className="flex h-5 items-center justify-between">
                <Label htmlFor="grade-score" className="text-sm font-medium whitespace-nowrap">
                  Score Earned *
                </Label>
              </div>
              <Input
                id="grade-score"
                type="number"
                step="any"
                min="0"
                max={parsedMax}
                placeholder={`0 - ${parsedMax}`}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className={isOverMax ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                disabled={isLoading}
                required
                autoFocus
              />
              {isOverMax && (
                <p className="text-xs font-medium text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Max is {parsedMax} pts</span>
                </p>
              )}
              {isNegative && (
                <p className="text-xs font-medium text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Cannot be negative</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex h-5 items-center justify-between gap-1">
                <Label htmlFor="grade-max-score" className="text-sm font-medium whitespace-nowrap">
                  Max Points *
                </Label>
                {matchedClassActivity && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-primary border-primary/30 font-medium shrink-0">
                    Activity rule
                  </Badge>
                )}
              </div>
              <Input
                id="grade-max-score"
                type="number"
                step="any"
                min="1"
                placeholder={defaultMax.toString()}
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                disabled={isLoading || Boolean(matchedClassActivity)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !studentId ||
                !assignmentName.trim() ||
                score === '' ||
                isOverMax ||
                isNegative
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : existingGrade ? (
                <>
                  <Edit3 className="h-4 w-4 mr-1.5" />
                  Update Existing Score
                </>
              ) : (
                'Save Grade'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
