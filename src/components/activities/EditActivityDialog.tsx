/**
 * Edit Activity dialog — form to modify an existing activity definition and its max scoring.
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

export function EditActivityDialog({
  activity,
  open,
  onOpenChange,
}: EditActivityDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<ActivityType>('quiz');
  const [maxScore, setMaxScore] = useState('100');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activity) {
      setName(activity.name);
      setType(activity.type);
      setMaxScore(activity.maxScore.toString());
      setDescription(activity.description || '');
      if (activity.dueDate) {
        const d = activity.dueDate;
        const formatted = d.toISOString().split('T')[0];
        setDueDate(formatted);
      } else {
        setDueDate('');
      }
    }
  }, [activity]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = autoCapitalizeSentences(name.trim());
    if (!user || !activity || !cleanName) {
      toast.error('Activity name is required.');
      return;
    }

    const numMax = parseFloat(maxScore);
    if (isNaN(numMax) || numMax <= 0) {
      toast.error('Max score must be a positive number.');
      return;
    }

    setIsLoading(true);
    try {
      await updateActivity(user.uid, activity.id, {
        name: cleanName,
        type,
        maxScore: numMax,
        description: autoCapitalizeSentences(description.trim()),
        dueDate: dueDate ? new Date(dueDate) : null,
      });
      toast.success(`Activity "${name.trim()}" updated!`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to update activity.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Activity</DialogTitle>
          <DialogDescription>Update activity details and scoring rules.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-activity-name">Activity / Quiz Name *</Label>
            <Input
              id="edit-activity-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <div className="flex h-5 items-center justify-between">
                <Label htmlFor="edit-activity-type" className="text-sm font-medium whitespace-nowrap">
                  Activity Type *
                </Label>
              </div>
              <Select
                value={type}
                onValueChange={(val) => setType((val as ActivityType) || 'quiz')}
                disabled={isLoading}
              >
                <SelectTrigger id="edit-activity-type" className="w-full">
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
                <Label htmlFor="edit-activity-max-score" className="text-sm font-medium whitespace-nowrap">
                  Max Points *
                </Label>
              </div>
              <Input
                id="edit-activity-max-score"
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

          <div className="space-y-2">
            <Label htmlFor="edit-activity-due-date">Due Date / Activity Date</Label>
            <Input
              id="edit-activity-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-activity-desc">Description / Notes</Label>
            <Input
              id="edit-activity-desc"
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
