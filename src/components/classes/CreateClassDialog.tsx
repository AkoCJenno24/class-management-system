/**
 * Create Class dialog — form to create a new class.
 * Real-time auto-validation for required class fields.
 */
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClass } from '@/lib/firebase/firestore';
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
import { Loader2 } from 'lucide-react';
import { autoCapitalizeSentences } from '@/lib/utils';

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateClassDialog({ open, onOpenChange }: CreateClassDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateName = (val: string): string => {
    if (!val.trim()) return 'Class name is required.';
    if (val.trim().length < 2) return 'Must be at least 2 characters.';
    return '';
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (touched) {
      setError(validateName(val));
    }
  };

  const handleBlur = () => {
    setTouched(true);
    setError(validateName(name));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const err = validateName(name);
    if (err) {
      setError(err);
      toast.error('Please provide a valid class name.');
      return;
    }

    const cleanName = autoCapitalizeSentences(name.trim());
    if (!user || !cleanName) return;

    setIsLoading(true);
    try {
      await createClass(user.uid, {
        name: cleanName,
        subject: autoCapitalizeSentences(subject.trim()),
        description: autoCapitalizeSentences(description.trim()),
      });
      toast.success(`Class "${cleanName}" created!`);
      setName('');
      setSubject('');
      setDescription('');
      setError('');
      setTouched(false);
      onOpenChange(false);
    } catch {
      toast.error('Failed to create class. Please try again.');
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
          setSubject('');
          setDescription('');
          setError('');
          setTouched(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Class</DialogTitle>
          <DialogDescription>
            Add a new class to manage students and grades.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="class-name" className="text-xs font-medium">
              Class Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="class-name"
              placeholder="e.g., Math 101, Grade 10 Physics"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={handleBlur}
              disabled={isLoading}
              autoFocus
              required
              className={error ? 'border-destructive focus-visible:ring-destructive/30' : ''}
            />
            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="class-subject" className="text-xs font-medium">
              Subject <span className="text-[10px] text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="class-subject"
              placeholder="e.g., Mathematics, Science"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="class-description" className="text-xs font-medium">
              Description <span className="text-[10px] text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="class-description"
              placeholder="e.g., Period 1 • Room 204"
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
              disabled={isLoading || !name.trim()}
              className="cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Class'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
