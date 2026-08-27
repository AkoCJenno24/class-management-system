/**
 * Daily Attendance Monitor Component — Manage daily attendance records for a class workspace.
 * Features:
 * 1) Date selection with Previous / Today / Next quick controls
 * 2) Search functionality to quickly find students by name, ID, or email
 * 3) Quick Checklist on the left side with a "Select All Present" master toggle
 * 4) Individual status options (Present, Absent, Late, Excused)
 * 5) Daily summary metrics (Present %, Absent count, Late/Excused)
 * 6) Student historical attendance percentage rate
 * 7) Real-time Firestore synchronization
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  onAttendanceRecordChange,
  onClassAttendanceChange,
  saveAttendanceRecord,
} from '@/lib/firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { StudentAvatar } from '@/components/students/StudentAvatar';
import { StudentStatusBadge } from '@/components/students/StudentStatusBadge';
import { toast } from 'sonner';
import {
  CheckSquare,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  Search,
} from 'lucide-react';
import type { Student, AttendanceRecord, AttendanceStatus } from '@/types';
import { formatStudentFullName } from '@/lib/utils';

interface AttendanceMonitorProps {
  classId: string;
  students: Student[];
}

/** Formats a Date object to YYYY-MM-DD string */
function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Formats YYYY-MM-DD into a readable label (e.g. Wednesday, Aug 26, 2026) */
function formatDisplayDate(dateString: string): string {
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function AttendanceMonitor({ classId, students }: AttendanceMonitorProps) {
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [search, setSearch] = useState<string>('');
  const [allClassRecords, setAllClassRecords] = useState<AttendanceRecord[]>([]);
  const [localStatuses, setLocalStatuses] = useState<Record<string, AttendanceStatus>>({});

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const term = search.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(term) ||
        s.lastName.toLowerCase().includes(term) ||
        (s.studentId && s.studentId.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term))
    );
  }, [students, search]);

  // Subscribe to attendance records for this specific date
  useEffect(() => {
    if (!user || !classId) return;

    const unsub = onAttendanceRecordChange(user.uid, classId, selectedDate, (record) => {
      if (record) {
        setLocalStatuses(record.statuses || {});
      } else {
        setLocalStatuses({});
      }
    });

    return unsub;
  }, [user, classId, selectedDate]);

  // Subscribe to all historical attendance for overall rates
  useEffect(() => {
    if (!user || !classId) return;
    const unsub = onClassAttendanceChange(user.uid, classId, setAllClassRecords);
    return unsub;
  }, [user, classId]);

  // Persist status changes silently to Firestore in background
  const persistStatuses = useCallback(
    async (updated: Record<string, AttendanceStatus>) => {
      if (!user) return;
      try {
        await saveAttendanceRecord(user.uid, classId, selectedDate, updated);
      } catch {
        toast.error('Failed to save attendance.');
      }
    },
    [user, classId, selectedDate]
  );

  // Change status of a single student
  const handleSetStudentStatus = (studentId: string, status: AttendanceStatus) => {
    const updated = {
      ...localStatuses,
      [studentId]: status,
    };
    setLocalStatuses(updated);
    persistStatuses(updated);
  };

  // Toggle present/absent for checklist
  const handleTogglePresent = (studentId: string) => {
    const current = localStatuses[studentId] || 'absent';
    const next: AttendanceStatus = current === 'present' ? 'absent' : 'present';
    handleSetStudentStatus(studentId, next);
  };

  // Bulk action: Mark All Present (Select All)
  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = { ...localStatuses };
    const targetStudents = filteredStudents.length > 0 ? filteredStudents : students;
    targetStudents.forEach((s) => {
      updated[s.id] = 'present';
    });
    setLocalStatuses(updated);
    persistStatuses(updated);
    toast.success(`${targetStudents.length} students marked Present!`);
  };

  // Bulk action: Mark All Absent
  const handleMarkAllAbsent = () => {
    const updated: Record<string, AttendanceStatus> = { ...localStatuses };
    const targetStudents = filteredStudents.length > 0 ? filteredStudents : students;
    targetStudents.forEach((s) => {
      updated[s.id] = 'absent';
    });
    setLocalStatuses(updated);
    persistStatuses(updated);
    toast.info(`${targetStudents.length} students marked Absent.`);
  };

  // Date navigation helpers
  const handleShiftDate = (days: number) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${dayStr}`);
  };

  // Daily statistics
  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let unmarked = 0;

    students.forEach((s) => {
      const status = localStatuses[s.id];
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
      else if (status === 'excused') excused++;
      else unmarked++;
    });

    const total = students.length;
    const presentRate = total > 0 ? Math.round((present / total) * 100) : 0;
    const isAllPresent = total > 0 && present === total;

    return {
      present,
      absent,
      late,
      excused,
      unmarked,
      total,
      presentRate,
      isAllPresent,
    };
  }, [students, localStatuses]);

  // Compute student historical attendance rate across all recorded days
  const studentHistoricalRates = useMemo(() => {
    const map = new Map<string, { presentCount: number; totalDays: number; rate: number }>();
    const totalDatesRecorded = allClassRecords.length;

    students.forEach((student) => {
      let presentCount = 0;
      allClassRecords.forEach((record) => {
        const st = record.statuses[student.id];
        if (st === 'present' || st === 'late') {
          presentCount++;
        }
      });
      const rate =
        totalDatesRecorded > 0 ? Math.round((presentCount / totalDatesRecorded) * 100) : 100;
      map.set(student.id, { presentCount, totalDays: totalDatesRecorded, rate });
    });

    return map;
  }, [students, allClassRecords]);

  if (students.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
          <h4 className="text-base font-semibold">No students enrolled yet</h4>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Enroll students from your roster into this class to begin daily attendance tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── 1. Date Selector & Controls ─── */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Date Navigator */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 cursor-pointer"
                onClick={() => handleShiftDate(-1)}
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="relative flex items-center gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="w-auto h-9 text-sm font-semibold cursor-pointer"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 cursor-pointer"
                onClick={() => handleShiftDate(1)}
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant={selectedDate === getTodayString() ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setSelectedDate(getTodayString())}
                className="h-9 text-xs cursor-pointer"
              >
                Today
              </Button>
            </div>

            {/* Quick Bulk Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={handleMarkAllPresent}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
              >
                <Check className="mr-1.5 h-4 w-4" />
                Select All Present
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAbsent}
                className="text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Mark All Absent
              </Button>
            </div>
          </div>

          {/* Date Label */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatDisplayDate(selectedDate)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. Daily Attendance Analytics Cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Present Card */}
        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
              Present Today
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {summary.present} / {summary.total}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {summary.presentRate}% Attendance Rate
            </p>
          </CardContent>
        </Card>

        {/* Absent Card */}
        <Card className="border-red-500/20 bg-red-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">
              Absent
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-red-600 dark:text-red-400">
              {summary.absent}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.total > 0
                ? `${Math.round((summary.absent / summary.total) * 100)}% absent rate`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        {/* Late Card */}
        <Card className="border-yellow-500/20 bg-yellow-500/5 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase">
              Tardy / Late
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-yellow-600 dark:text-yellow-400">
              {summary.late}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Students marked late</p>
          </CardContent>
        </Card>

        {/* Excused / Unmarked Card */}
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Excused / Unmarked
            </CardTitle>
            <HelpCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">
              {summary.excused} <span className="text-sm font-normal text-muted-foreground">excused</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.unmarked > 0
                ? `${summary.unmarked} pending status`
                : 'All students recorded'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── 3. Daily Attendance Checklist Table with Search ─── */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Class Roster Attendance Sheet</CardTitle>
              <CardDescription>
                Check off students who are present or specify late/excused details.
              </CardDescription>
            </div>

            {/* Search and counter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search student by name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8.5 h-8.5 text-xs shadow-xs w-full"
                />
              </div>
              <Badge variant="outline" className="text-xs whitespace-nowrap shrink-0">
                {search ? `${filteredStudents.length} of ${students.length}` : students.length} Students
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {/* Select All Checkbox Column on Left */}
                  <TableHead className="w-12 text-center">
                    <button
                      type="button"
                      onClick={summary.isAllPresent ? handleMarkAllAbsent : handleMarkAllPresent}
                      className="cursor-pointer text-primary hover:opacity-80 flex items-center justify-center mx-auto"
                      title={
                        summary.isAllPresent
                          ? 'Deselect All (Mark Absent)'
                          : 'Select All (Mark Present)'
                      }
                    >
                      {summary.isAllPresent ? (
                        <CheckSquare className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-center">Daily Status Selector</TableHead>
                  <TableHead className="text-center">Historical Attendance Rate</TableHead>
                  <TableHead className="text-right">Status Badge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No students matching "{search}" found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => {
                    const status = localStatuses[student.id] || 'absent';
                    const isPresent = status === 'present';
                    const hist = studentHistoricalRates.get(student.id);

                    return (
                      <TableRow
                        key={student.id}
                        className={`transition-colors ${
                          isPresent
                            ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                            : status === 'absent'
                            ? 'hover:bg-red-500/5'
                            : 'hover:bg-accent/40'
                        }`}
                      >
                        {/* Left Checklist Checkbox */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePresent(student.id)}
                            className="cursor-pointer flex items-center justify-center mx-auto p-1 rounded-md hover:bg-accent transition-colors"
                            title={`Toggle ${student.firstName}'s status`}
                          >
                            {isPresent ? (
                              <CheckSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                            )}
                          </button>
                        </TableCell>

                        {/* Student Info */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <StudentAvatar student={student} size="default" showStatusIndicator />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">
                                  {formatStudentFullName(student)}
                                </span>
                                {student.status && student.status !== 'active' && (
                                  <StudentStatusBadge status={student.status} showDot={false} className="text-[10px] py-0 px-1.5" />
                                )}
                              </div>
                              {student.studentId && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  ID: {student.studentId}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Status Selector Pill Buttons */}
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant={status === 'present' ? 'default' : 'outline'}
                              onClick={() => handleSetStudentStatus(student.id, 'present')}
                              className={`h-7 px-2.5 text-xs font-medium cursor-pointer ${
                                status === 'present'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'text-muted-foreground hover:text-emerald-600'
                              }`}
                            >
                              Present
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={status === 'absent' ? 'default' : 'outline'}
                              onClick={() => handleSetStudentStatus(student.id, 'absent')}
                              className={`h-7 px-2.5 text-xs font-medium cursor-pointer ${
                                status === 'absent'
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'text-muted-foreground hover:text-red-600'
                              }`}
                            >
                              Absent
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={status === 'late' ? 'default' : 'outline'}
                              onClick={() => handleSetStudentStatus(student.id, 'late')}
                              className={`h-7 px-2.5 text-xs font-medium cursor-pointer ${
                                status === 'late'
                                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                  : 'text-muted-foreground hover:text-yellow-600'
                              }`}
                            >
                              Late
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={status === 'excused' ? 'default' : 'outline'}
                              onClick={() => handleSetStudentStatus(student.id, 'excused')}
                              className={`h-7 px-2.5 text-xs font-medium cursor-pointer ${
                                status === 'excused'
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'text-muted-foreground hover:text-blue-600'
                              }`}
                            >
                              Excused
                            </Button>
                          </div>
                        </TableCell>

                        {/* Cumulative Historical Attendance Rate */}
                        <TableCell className="text-center">
                          {hist && hist.totalDays > 0 ? (
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${hist.rate}%`,
                                      backgroundColor:
                                        hist.rate >= 90
                                          ? '#22C55E'
                                          : hist.rate >= 75
                                          ? '#EAB308'
                                          : '#EF4444',
                                    }}
                                  />
                                </div>
                                <span className="font-bold text-xs">{hist.rate}%</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {hist.presentCount}/{hist.totalDays} sessions
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">First record</span>
                          )}
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell className="text-right">
                          {status === 'present' && (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold"
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Present
                            </Badge>
                          )}
                          {status === 'absent' && (
                            <Badge
                              variant="outline"
                              className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 font-bold"
                            >
                              <XCircle className="mr-1 h-3 w-3" /> Absent
                            </Badge>
                          )}
                          {status === 'late' && (
                            <Badge
                              variant="outline"
                              className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 font-bold"
                            >
                              <Clock className="mr-1 h-3 w-3" /> Late
                            </Badge>
                          )}
                          {status === 'excused' && (
                            <Badge
                              variant="outline"
                              className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold"
                            >
                              <HelpCircle className="mr-1 h-3 w-3" /> Excused
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
