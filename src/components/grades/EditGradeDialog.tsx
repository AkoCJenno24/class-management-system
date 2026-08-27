/**
 * Edit Grade dialog — modify an existing recorded score for a student.
 * Strict validation: score earned cannot exceed the maximum score.
 */
import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateGrade } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { Grade, Student } from '@/types';

interface EditGradeDialogProps {
  grade: Grade | null;
  student?: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditGradeDialog({
  grade,
  student,
  open,
  onOpenChange,
}: EditGradeDialogProps) {
  const { user } = useAuth();
  const [assignmentName, setAssignmentName] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (grade) {
      setAssignmentName(grade.assignmentName);
      setScore(grade.score.toString());
      setMaxScore(grade.maxScore.toString());
    }
  }, [grade]);

  const parsedScore = parseFloat(score);
  const parsedMax = parseFloat(maxScore);
  const isOverMax = !isNaN(parsedScore) && !isNaN(parsedMax) && parsedScore > parsedMax;
  const isNegative = !isNaN(parsedScore) && parsedScore < 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !grade || !assignmentName.trim() || score === '') {
      toast.error('Please fill in all required fields.');
      return;
    }

    const numScore = parseFloat(score);
    const numMax = parseFloat(maxScore);

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
      toast.error(`Score cannot exceed the maximum score (${numMax} pts).`);
      return;
    }

    setIsLoading(true);
    try {
      await updateGrade(user.uid, grade.id, {
        assignmentName: assignmentName.trim(),
        score: numScore,
        maxScore: numMax,
      });
      toast.success('Grade score updated successfully!');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update grade.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Recorded Grade</DialogTitle>
          <DialogDescription>
            Modify the score or activity title for {student ? `${student.firstName} ${student.lastName}` : 'this student'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-grade-assignment">Assignment / Exam Name *</Label>
            <Input
              id="edit-grade-assignment"
              value={assignmentName}
              onChange={(e) => setAssignmentName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <div className="flex h-5 items-center justify-between">
                <Label htmlFor="edit-grade-score" className="text-sm font-medium whitespace-nowrap">
                  Score Earned *
                </Label>
              </div>
              <Input
                id="edit-grade-score"
                type="number"
                step="any"
                min="0"
                max={parsedMax}
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
              <div className="flex h-5 items-center justify-between">
                <Label htmlFor="edit-grade-max-score" className="text-sm font-medium whitespace-nowrap">
                  Max Points *
                </Label>
              </div>
              <Input
                id="edit-grade-max-score"
                type="number"
                step="any"
                min="1"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                disabled={isLoading}
                required
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
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
