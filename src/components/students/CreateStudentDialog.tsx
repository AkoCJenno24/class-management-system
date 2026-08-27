/**
 * Create Student dialog — form to add a student to the global roster.
 * Features:
 * 1) First Name and Last Name
 * 2) Preset Grade Level selector (configurable from Teacher Settings)
 * 3) Student ID / Roll number
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createStudent } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Settings2 } from 'lucide-react';
import { DEFAULT_GRADE_LEVELS } from '@/types';
import { capitalizeFirst } from '@/lib/utils';

interface CreateStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStudentDialog({ open, onOpenChange }: CreateStudentDialogProps) {
  const { user, teacherProfile } = useAuth();
  const availableGradeLevels =
    teacherProfile?.gradeLevels && teacherProfile.gradeLevels.length > 0
      ? teacherProfile.gradeLevels
      : DEFAULT_GRADE_LEVELS;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gradeLevel, setGradeLevel] = useState<string>('');
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanFirst = capitalizeFirst(firstName.trim());
    const cleanLast = capitalizeFirst(lastName.trim());

    if (!user || !cleanFirst || !cleanLast) {
      toast.error('First name and last name are required.');
      return;
    }

    setIsLoading(true);
    try {
      await createStudent(user.uid, {
        firstName: cleanFirst,
        lastName: cleanLast,
        gradeLevel: gradeLevel.trim() || null,
        studentId: studentId.trim() || null,
      });
      toast.success(`Student ${cleanFirst} ${cleanLast} added!`);
      setFirstName('');
      setLastName('');
      setGradeLevel('');
      setStudentId('');
      onOpenChange(false);
    } catch {
      toast.error('Failed to add student. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Add a student to your global roster. You can assign them to classes anytime.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student-first-name">First Name *</Label>
              <Input
                id="student-first-name"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isLoading}
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-last-name">Last Name *</Label>
              <Input
                id="student-last-name"
                placeholder="Smith"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Grade Level Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="student-grade-level">Grade Level</Label>
              <Link
                to="/settings"
                onClick={() => onOpenChange(false)}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                <Settings2 className="h-3 w-3" />
                Customize grade presets
              </Link>
            </div>
            <Select
              value={gradeLevel}
              onValueChange={(val) => setGradeLevel(val || '')}
              disabled={isLoading}
            >
              <SelectTrigger id="student-grade-level" className="w-full">
                <SelectValue placeholder="Select grade level..." />
              </SelectTrigger>
              <SelectContent>
                {availableGradeLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student ID */}
          <div className="space-y-2">
            <Label htmlFor="student-id-number">Student ID / Roll # (optional)</Label>
            <Input
              id="student-id-number"
              placeholder="e.g., STU-10024"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
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
            <Button
              type="submit"
              disabled={isLoading || !firstName.trim() || !lastName.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                'Add Student'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
