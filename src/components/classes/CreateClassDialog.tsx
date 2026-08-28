/**
 * Create Class dialog — form to create a new class.
 * Real-time auto-validation for required class fields.
 * Includes optional room number, start/end time pickers, and schedule days tag list.
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
import { ScheduleDaysPicker } from './ScheduleDaysPicker';
import { TimePicker12Hour } from './TimePicker12Hour';
import { AcademicYearInput } from './AcademicYearInput';
import { ClassColorPicker } from './ClassColorPicker';
import { toast } from 'sonner';
import { Loader2, DoorOpen, Clock, GraduationCap } from 'lucide-react';
import type { ClassColor } from '@/types';
import { autoCapitalizeSentences } from '@/lib/utils';

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateClassDialog({ open, onOpenChange }: CreateClassDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [room, setRoom] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [color, setColor] = useState<ClassColor>('default');
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

  const handleReset = () => {
    setName('');
    setSubject('');
    setAcademicYear('');
    setRoom('');
    setStartTime('');
    setEndTime('');
    setDays([]);
    setColor('default');
    setError('');
    setTouched(false);
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
        academicYear: academicYear.trim(),
        room: room.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        days,
        color,
      });
      toast.success(`Class "${cleanName}" created!`);
      handleReset();
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
          handleReset();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Class</DialogTitle>
          <DialogDescription>
            Add a new class workspace with room details and schedule times.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Class Name */}
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

          {/* Row: Subject & Room Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <Label htmlFor="class-room" className="text-xs font-medium flex items-center gap-1">
                <DoorOpen className="h-3.5 w-3.5 text-primary" />
                <span>Room Number</span>
                <span className="text-[10px] text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="class-room"
                placeholder="e.g., Room 304, Lab 2B"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Academic Year (From Year - To Year) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
              <span>Academic Year</span>
              <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
            </Label>
            <AcademicYearInput
              value={academicYear}
              onChange={setAcademicYear}
              disabled={isLoading}
            />
          </div>

          {/* Schedule Time Pickers (Start Time & End Time) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>Class Schedule Time</span>
                <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
              </Label>
              {(startTime || endTime) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartTime('');
                    setEndTime('');
                  }}
                  className="text-[10px] text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                >
                  Clear time
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <Label htmlFor="class-start-time" className="text-[11px] text-muted-foreground">
                  Start Time
                </Label>
                <TimePicker12Hour
                  id="class-start-time"
                  value={startTime}
                  onChange={setStartTime}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="class-end-time" className="text-[11px] text-muted-foreground">
                  End Time
                </Label>
                <TimePicker12Hour
                  id="class-end-time"
                  value={endTime}
                  onChange={setEndTime}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Schedule Days Tag List */}
          <ScheduleDaysPicker
            selectedDays={days}
            onChange={setDays}
            disabled={isLoading}
          />

          {/* Class Card Color Theme */}
          <ClassColorPicker
            selectedColor={color}
            onChange={setColor}
            disabled={isLoading}
          />

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
