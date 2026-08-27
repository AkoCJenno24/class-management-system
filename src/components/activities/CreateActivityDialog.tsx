/**
 * Create Activity dialog — form to add an activity/quiz/exam definition with custom max score.
 * Features strict auto-validation for activity name and max score.
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
import { autoCapitalizeSentences } from '@/lib/utils';

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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateField = (field: string, val: string): string => {
    if (field === 'name') {
      if (!val.trim()) return 'Activity name is required.';
      if (val.trim().length < 2) return 'Must be at least 2 characters.';
      return '';
    }
    if (field === 'maxScore') {
      if (!val.trim()) return 'Max points is required.';
      const num = parseFloat(val);
      if (isNaN(num) || num <= 0) return 'Max points must be greater than 0.';
      if (num > 10000) return 'Max points cannot exceed 10,000.';
      return '';
    }
    return '';
  };

  const handleBlur = (field: string, val: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, val) }));
  };

  const handleChange = (field: string, val: string, setter: (v: string) => void) => {
    setter(val);
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, val) }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nameErr = validateField('name', name);
    const scoreErr = validateField('maxScore', maxScore);

    setTouched({ name: true, maxScore: true });
    setErrors({ name: nameErr, maxScore: scoreErr });

    if (nameErr || scoreErr) {
      toast.error('Please resolve form errors before creating activity.');
      return;
    }

    const cleanName = autoCapitalizeSentences(name.trim());
    const numMax = parseFloat(maxScore);
    if (!user || !cleanName) return;

    setIsLoading(true);
    try {
      await createActivity(user.uid, {
        classId,
        name: cleanName,
        type,
        maxScore: numMax,
        description: autoCapitalizeSentences(description.trim()),
        dueDate: dueDate ? new Date(dueDate) : null,
      });
      toast.success(`Activity "${cleanName}" created!`);
      setName('');
      setType('quiz');
      setMaxScore(defaultMax.toString());
      setDescription('');
      setDueDate('');
      setErrors({});
      setTouched({});
      onOpenChange(false);
    } catch {
      toast.error('Failed to create activity. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setName('');
          setType('quiz');
          setMaxScore(defaultMax.toString());
          setDescription('');
          setDueDate('');
          setErrors({});
          setTouched({});
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Activity</DialogTitle>
          <DialogDescription>
            Define an assignment, quiz, exam, or project for {className || 'this class'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="activity-name" className="text-xs font-medium">
              Activity / Quiz Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="activity-name"
              placeholder="e.g., Chapter 4 Quiz, Midterm Project"
              value={name}
              onChange={(e) => handleChange('name', e.target.value, setName)}
              onBlur={() => handleBlur('name', name)}
              disabled={isLoading}
              required
              autoFocus
              className={errors.name ? 'border-destructive focus-visible:ring-destructive/30' : ''}
            />
            {errors.name && (
              <p className="text-xs font-medium text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 items-start">
            <div className="space-y-1.5">
              <Label htmlFor="activity-type" className="text-xs font-medium">
                Activity Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={type}
                onValueChange={(val) => setType((val as ActivityType) || 'quiz')}
                disabled={isLoading}
              >
                <SelectTrigger id="activity-type" className="w-full text-xs">
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

            <div className="space-y-1.5">
              <Label htmlFor="activity-max-score" className="text-xs font-medium">
                Max Points <span className="text-destructive">*</span>
              </Label>
              <Input
                id="activity-max-score"
                type="number"
                step="any"
                min="1"
                placeholder={defaultMax.toString()}
                value={maxScore}
                onChange={(e) => handleChange('maxScore', e.target.value, setMaxScore)}
                onBlur={() => handleBlur('maxScore', maxScore)}
                disabled={isLoading}
                required
                className={errors.maxScore ? 'border-destructive focus-visible:ring-destructive/30' : ''}
              />
              {errors.maxScore && (
                <p className="text-xs font-medium text-destructive">{errors.maxScore}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="activity-due-date" className="text-xs font-medium">
              Due Date / Activity Date <span className="text-[10px] text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="activity-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="activity-description" className="text-xs font-medium">
              Description / Notes <span className="text-[10px] text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="activity-description"
              placeholder="e.g., Covers chapters 1 through 3, calculator allowed"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <DialogFooter className="pt-2">
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
              disabled={isLoading || !name.trim() || !maxScore.trim()}
              className="cursor-pointer"
            >
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
