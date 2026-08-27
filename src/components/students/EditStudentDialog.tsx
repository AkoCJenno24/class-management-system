/**
 * Edit Student dialog — form to modify existing student info.
 * Updates Firestore document under users/{uid}/students/{studentId}.
 */
import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { updateStudent } from '@/lib/firebase/firestore';
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
import type { Student } from '@/types';
import { DEFAULT_GRADE_LEVELS } from '@/types';
import { capitalizeFirst } from '@/lib/utils';

interface EditStudentDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditStudentDialog({ student, open, onOpenChange }: EditStudentDialogProps) {
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

  useEffect(() => {
    if (student) {
      setFirstName(student.firstName);
      setLastName(student.lastName);
      setGradeLevel(student.gradeLevel || '');
      setStudentId(student.studentId || '');
    }
  }, [student]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanFirst = capitalizeFirst(firstName.trim());
    const cleanLast = capitalizeFirst(lastName.trim());

    if (!user || !student || !cleanFirst || !cleanLast) {
      toast.error('First and last name are required.');
      return;
    }

    setIsLoading(true);
    try {
      await updateStudent(user.uid, student.id, {
        firstName: cleanFirst,
        lastName: cleanLast,
        gradeLevel: gradeLevel.trim() || null,
        studentId: studentId.trim() || null,
      });
      toast.success('Student details updated.');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update student.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>Update student profile and grade level.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-student-first-name">First Name *</Label>
              <Input
                id="edit-student-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-student-last-name">Last Name *</Label>
              <Input
                id="edit-student-last-name"
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
              <Label htmlFor="edit-student-grade-level">Grade Level</Label>
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
              <SelectTrigger id="edit-student-grade-level" className="w-full">
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
            <Label htmlFor="edit-student-id">Student ID / Roll # (optional)</Label>
            <Input
              id="edit-student-id"
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
