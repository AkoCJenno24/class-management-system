/**
 * Edit Activity dialog — form to modify existing activity details.
 * Features strict auto-validation for activity name and max score.
 */
import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateActivity } from '@/lib/firebase/firestore';
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
import type { Activity, ActivityType } from '@/types';
import { autoCapitalizeSentences } from '@/lib/utils';

interface EditActivityDialogProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditActivityDialog({ activity, open, onOpenChange }: EditActivityDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<ActivityType>('quiz');
  const [maxScore, setMaxScore] = useState('100');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activity) {
      setName(activity.name);
      setType(activity.type);
      setMaxScore(activity.maxScore.toString());
      setDescription(activity.description || '');
      if (activity.dueDate) {
        const d = activity.dueDate;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setDueDate(`${year}-${month}-${day}`);
      } else {
        setDueDate('');
      }
      setErrors({});
      setTouched({});
    }
  }, [activity]);

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
      toast.error('Please resolve form errors before saving activity.');
      return;
    }

    const cleanName = autoCapitalizeSentences(name.trim());
    const numMax = parseFloat(maxScore);
    if (!user || !activity || !cleanName) return;

    setIsLoading(true);
    try {
      await updateActivity(user.uid, activity.id, {
        name: cleanName,
        type,
        maxScore: numMax,
        description: autoCapitalizeSentences(description.trim()),
        dueDate: dueDate ? new Date(dueDate) : null,
      });
      toast.success('Activity updated successfully!');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update activity.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Activity Details</DialogTitle>
          <DialogDescription>Modify activity name, scoring, or due date.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="edit-activity-name" className="text-xs font-medium">
              Activity / Quiz Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-activity-name"
              value={name}
              onChange={(e) => handleChange('name', e.target.value, setName)}
              onBlur={() => handleBlur('name', name)}
              disabled={isLoading}
              required
              className={errors.name ? 'border-destructive focus-visible:ring-destructive/30' : ''}
            />
            {errors.name && (
              <p className="text-xs font-medium text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <div className="space-y-1.5">
              <Label htmlFor="edit-activity-type" className="text-xs font-medium">
                Activity Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={type}
                onValueChange={(val) => setType((val as ActivityType) || 'quiz')}
                disabled={isLoading}
              >
                <SelectTrigger id="edit-activity-type" className="w-full text-xs">
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
              <Label htmlFor="edit-activity-max-score" className="text-xs font-medium">
                Max Points <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-activity-max-score"
                type="number"
                step="any"
                min="1"
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
            <Label htmlFor="edit-activity-due-date" className="text-xs font-medium">
              Due Date / Activity Date <span className="text-[10px] text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="edit-activity-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-activity-description" className="text-xs font-medium">
              Description / Notes <span className="text-[10px] text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="edit-activity-description"
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
