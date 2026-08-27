/**
 * Create Activity dialog — form to add an activity/quiz/exam definition with custom max score.
 */
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createActivity } from '@/lib/firebase/firestore';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { ActivityType } from '@/types';

interface CreateActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className?: string;
}

export function CreateActivityDialog({
  open,
  onOpenChange,
  classId,
  className,
}: CreateActivityDialogProps) {
  const { user, teacherProfile } = useAuth();
  const defaultMax = teacherProfile?.gradingScale?.defaultMaxScore || 100;

  const [name, setName] = useState('');
  const [type, setType] = useState<ActivityType>('quiz');
  const [maxScore, setMaxScore] = useState(defaultMax.toString());
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) {
      toast.error('Activity name is required.');
      return;
    }

    const numMax = parseFloat(maxScore) || defaultMax;
    if (isNaN(numMax) || numMax <= 0) {
      toast.error('Max score must be a positive number.');
      return;
    }

    setIsLoading(true);
    try {
      await createActivity(user.uid, {
        classId,
        name: name.trim(),
        type,
        maxScore: numMax,
        description: description.trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
      });
      toast.success(`Activity "${name.trim()}" created!`);
      setName('');
      setType('quiz');
      setMaxScore(defaultMax.toString());
      setDescription('');
      setDueDate('');
      onOpenChange(false);
    } catch {
      toast.error('Failed to create activity. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Activity</DialogTitle>
          <DialogDescription>
            Define an assignment, quiz, exam, or project for {className || 'this class'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity-name">Activity / Quiz Name *</Label>
            <Input
              id="activity-name"
              placeholder="e.g., Chapter 4 Quiz, Midterm Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <div className="flex h-5 items-center justify-between">
                <Label htmlFor="activity-type" className="text-sm font-medium whitespace-nowrap">
                  Activity Type *
                </Label>
              </div>
              <Select
                value={type}
                onValueChange={(val) => setType((val as ActivityType) || 'quiz')}
                disabled={isLoading}
              >
                <SelectTrigger id="activity-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="exam">Exam / Test</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="homework">Homework</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="participation">Participation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex h-5 items-center justify-between">
                <Label htmlFor="activity-max-score" className="text-sm font-medium whitespace-nowrap">
                  Max Points *
                </Label>
              </div>
              <Input
                id="activity-max-score"
                type="number"
                step="any"
                min="1"
                placeholder={defaultMax.toString()}
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity-due-date">Due Date / Activity Date (optional)</Label>
            <Input
              id="activity-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity-description">Description / Notes (optional)</Label>
            <Input
              id="activity-description"
              placeholder="e.g., Covers chapters 1 through 3, calculator allowed"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
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
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Activity'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
