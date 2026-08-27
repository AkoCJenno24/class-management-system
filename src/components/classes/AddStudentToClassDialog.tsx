/**
 * Add Student to Class dialog.
 * Shows the global student roster and lets the teacher pick students to add.
 * Filters out students already enrolled in the class.
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addStudentToClass } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StudentAvatar } from '@/components/students/StudentAvatar';
import { StudentStatusBadge } from '@/components/students/StudentStatusBadge';
import { toast } from 'sonner';
import { Loader2, UserPlus, Search } from 'lucide-react';
import type { Student } from '@/types';
import { formatStudentFullName } from '@/lib/utils';

interface AddStudentToClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
  students: Student[];
}

export function AddStudentToClassDialog({
  open,
  onOpenChange,
  classId,
  className: classDisplayName,
  students,
}: AddStudentToClassDialogProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null);

  // Filter out students already in this class, and apply search
  const availableStudents = students.filter((s) => {
    if (s.classIds.includes(classId)) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase().trim();
    const fullName = formatStudentFullName(s).toLowerCase();
    return (
      fullName.includes(term) ||
      s.firstName.toLowerCase().includes(term) ||
      (s.middleName && s.middleName.toLowerCase().includes(term)) ||
      s.lastName.toLowerCase().includes(term) ||
      (s.gradeLevel && s.gradeLevel.toLowerCase().includes(term)) ||
      (s.studentId && s.studentId.toLowerCase().includes(term))
    );
  });

  const handleAddStudent = async (studentId: string) => {
    if (!user) return;

    setLoadingStudentId(studentId);
    try {
      await addStudentToClass(user.uid, studentId, classId);
      toast.success('Student added to class!');
    } catch {
      toast.error('Failed to add student. Please try again.');
    } finally {
      setLoadingStudentId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Students to {classDisplayName}</DialogTitle>
          <DialogDescription>
            Select students from your roster to add to this class.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students by name, grade level, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {/* Student list */}
        <div className="max-h-64 overflow-y-auto space-y-2">
          {availableStudents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {students.length === 0
                ? 'No students in your roster. Add students first.'
                : 'All matching students are already enrolled in this class.'}
            </div>
          ) : (
            availableStudents.map((student) => {
              const fullName = formatStudentFullName(student);

              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <StudentAvatar student={student} size="default" showStatusIndicator />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">{fullName}</p>
                        {student.status && student.status !== 'active' && (
                          <StudentStatusBadge
                            status={student.status}
                            showDot={false}
                            className="text-[10px] py-0 px-1.5"
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {student.gradeLevel ? `${student.gradeLevel}` : ''}
                        {student.gradeLevel && student.studentId ? ' • ' : ''}
                        {student.studentId
                          ? `ID: ${student.studentId}`
                          : !student.gradeLevel
                          ? 'No grade level'
                          : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddStudent(student.id)}
                    disabled={loadingStudentId === student.id}
                  >
                    {loadingStudentId === student.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="mr-1 h-3 w-3" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
