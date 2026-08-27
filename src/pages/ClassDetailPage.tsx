/**
 * Class Detail Page — Workspace view for a single class.
 * Provides 5 tabs:
 * 1) Enrolled Students
 * 2) Activities & Quizzes (Create, configure scoring, manage assessments)
 * 3) Daily Attendance Sheet
 * 4) Grades & Combined Averages
 * 5) Class Settings (Edit/Delete)
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getClass,
  updateClass,
  deleteClass,
  onStudentsChange,
  onClassGradesChange,
  onClassActivitiesChange,
  removeStudentFromClass,
} from '@/lib/firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AddStudentToClassDialog } from '@/components/classes/AddStudentToClassDialog';
import { AddGradeDialog } from '@/components/grades/AddGradeDialog';
import { GradeTable } from '@/components/grades/GradeTable';
import { AttendanceMonitor } from '@/components/attendance/AttendanceMonitor';
import { ActivityManager } from '@/components/activities/ActivityManager';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Users,
  Award,
  Settings,
  Trash2,
  Loader2,
  UserMinus,
  ClipboardCheck,
  BookMarked,
} from 'lucide-react';
import type { Class, Student, Grade, Activity } from '@/types';
import { getInitials, calculatePercentage, formatGrade, getGradeColor } from '@/lib/utils';
import { DEFAULT_GRADING_SCALE } from '@/types';

export function ClassDetailPage() {
  const { id: classId } = useParams<{ id: string }>();
  const { user, teacherProfile } = useAuth();
  const navigate = useNavigate();

  const [currentClass, setCurrentClass] = useState<Class | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & form state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddGradeOpen, setIsAddGradeOpen] = useState(false);
  const [selectedActivityForGrade, setSelectedActivityForGrade] = useState<Activity | null>(null);

  // Settings form
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user || !classId) return;

    let unsubStudents: () => void;
    let unsubGrades: () => void;
    let unsubActivities: () => void;

    async function loadData() {
      if (!user || !classId) return;
      setIsLoading(true);
      const cls = await getClass(user.uid, classId);
      if (!cls) {
        toast.error('Class not found.');
        navigate('/classes');
        return;
      }
      setCurrentClass(cls);
      setEditName(cls.name);
      setEditSubject(cls.subject);
      setEditDescription(cls.description);

      unsubStudents = onStudentsChange(user.uid, setAllStudents);
      unsubGrades = onClassGradesChange(user.uid, classId, setGrades);
      unsubActivities = onClassActivitiesChange(user.uid, classId, setActivities);
      setIsLoading(false);
    }

    loadData();

    return () => {
      if (unsubStudents) unsubStudents();
      if (unsubGrades) unsubGrades();
      if (unsubActivities) unsubActivities();
    };
  }, [user, classId, navigate]);

  if (isLoading || !currentClass) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter students enrolled in this specific class
  const enrolledStudents = allStudents.filter((s) => s.classIds.includes(classId!));

  const scale = teacherProfile?.gradingScale || DEFAULT_GRADING_SCALE;

  // Calculate class average percentage
  const totalPercentage = grades.reduce(
    (sum, g) => sum + calculatePercentage(g.score, g.maxScore),
    0
  );
  const averagePercentage =
    grades.length > 0 ? Math.round(totalPercentage / grades.length) : 0;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !classId || !editName.trim()) return;

    setIsSavingSettings(true);
    try {
      await updateClass(user.uid, classId, {
        name: editName.trim(),
        subject: editSubject.trim(),
        description: editDescription.trim(),
      });
      setCurrentClass((prev) =>
        prev
          ? {
              ...prev,
              name: editName.trim(),
              subject: editSubject.trim(),
              description: editDescription.trim(),
            }
          : null
      );
      toast.success('Class settings saved!');
    } catch {
      toast.error('Failed to update class settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!user || !classId) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete "${currentClass.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteClass(user.uid, classId);
      toast.success(`Class "${currentClass.name}" deleted.`);
      navigate('/classes');
    } catch {
      toast.error('Failed to delete class.');
      setIsDeleting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!user || !classId) return;
    if (!confirm(`Remove ${studentName} from ${currentClass.name}?`)) return;

    try {
      await removeStudentFromClass(user.uid, studentId, classId);
      toast.success(`${studentName} removed from class.`);
    } catch {
      toast.error('Failed to remove student.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top bar: Back button + Class info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/classes">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to classes</span>
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{currentClass.name}</h1>
              {currentClass.subject && (
                <Badge variant="secondary" className="text-xs">
                  {currentClass.subject}
                </Badge>
              )}
            </div>
            {currentClass.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {currentClass.description}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsAddStudentOpen(true)} className="cursor-pointer">
            <Users className="mr-2 h-4 w-4" />
            Enroll Student
          </Button>
          <Button
            onClick={() => {
              setSelectedActivityForGrade(null);
              setIsAddGradeOpen(true);
            }}
            disabled={enrolledStudents.length === 0}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Grade
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="students" className="space-y-6">
        <div className="w-full overflow-x-auto pb-1">
          <TabsList className="inline-flex h-auto w-auto p-1 gap-1 bg-muted/80 rounded-xl border border-border/60">
            <TabsTrigger
              value="students"
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg cursor-pointer"
            >
              <Users className="h-4 w-4" />
              <span>Students</span>
              <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[11px] font-semibold">
                {enrolledStudents.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="activities"
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg cursor-pointer"
            >
              <BookMarked className="h-4 w-4" />
              <span>Activities</span>
              <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[11px] font-semibold">
                {activities.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg cursor-pointer"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>Attendance</span>
            </TabsTrigger>
            <TabsTrigger
              value="grades"
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg cursor-pointer"
            >
              <Award className="h-4 w-4" />
              <span>Grades</span>
              <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[11px] font-semibold">
                {grades.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Students */}
        <TabsContent value="students" className="space-y-4">
          {enrolledStudents.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground mb-3" />
                <h4 className="text-base font-semibold">No students in this class yet</h4>
                <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                  Enroll students from your global roster to start tracking attendance and grades.
                </p>
                <Button onClick={() => setIsAddStudentOpen(true)} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Enroll Students
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {enrolledStudents.map((student) => {
                const studentGrades = grades.filter((g) => g.studentId === student.id);
                const count = studentGrades.length;
                let avgPercent: number | null = null;
                let displayGrade = 'No Grades';
                let color = '#71717a';

                if (count > 0) {
                  const sumPct = studentGrades.reduce(
                    (sum, g) => sum + calculatePercentage(g.score, g.maxScore),
                    0
                  );
                  avgPercent = Math.round(sumPct / count);
                  displayGrade = formatGrade(avgPercent, 100, scale);
                  color = getGradeColor(avgPercent, 100, scale);
                }

                return (
                  <Link
                    key={student.id}
                    to={`/classes/${classId}/students/${student.id}`}
                    className="block group"
                  >
                    <Card className="flex flex-col justify-between p-4 gap-3 border-border shadow-xs group-hover:border-primary/50 group-hover:shadow-md transition-all duration-200 cursor-pointer h-full">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              {getInitials(student.firstName, student.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {student.gradeLevel ? `${student.gradeLevel}` : ''}
                              {student.gradeLevel && student.studentId ? ' • ' : ''}
                              {student.studentId ? `ID: ${student.studentId}` : (!student.gradeLevel ? 'No ID' : '')}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-1 -mt-1 cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveStudent(
                              student.id,
                              `${student.firstName} ${student.lastName}`
                            );
                          }}
                          title="Remove from class"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Combined average badge & activity counter */}
                      <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
                        <span className="text-muted-foreground">
                          {count} {count === 1 ? 'activity' : 'activities'}
                        </span>
                        {avgPercent !== null ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground">{avgPercent}%</span>
                            <Badge
                              variant="outline"
                              className="font-bold text-xs py-0.5 px-2"
                              style={{
                                borderColor: color,
                                color: color,
                                backgroundColor: `${color}10`,
                              }}
                            >
                              {displayGrade}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No grades yet</span>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Activities & Scoring Configuration */}
        <TabsContent value="activities" className="space-y-4">
          <ActivityManager
            classId={classId!}
            className={currentClass.name}
            activities={activities}
            grades={grades}
            onRecordGradeForActivity={(activity) => {
              setSelectedActivityForGrade(activity);
              setIsAddGradeOpen(true);
            }}
          />
        </TabsContent>

        {/* Tab 3: Attendance */}
        <TabsContent value="attendance" className="space-y-4">
          <AttendanceMonitor classId={classId!} students={enrolledStudents} />
        </TabsContent>

        {/* Tab 4: Grades */}
        <TabsContent value="grades" className="space-y-4">
          {grades.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground font-medium uppercase">
                    Class Average
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averagePercentage}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Display grade: {formatGrade(averagePercentage, 100, scale)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground font-medium uppercase">
                    Assignments Recorded
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{grades.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all students</p>
                </CardContent>
              </Card>
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground font-medium uppercase">
                    Grading Scale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold capitalize">{scale.type}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configured in teacher profile
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <GradeTable grades={grades} students={enrolledStudents} classId={classId!} />
        </TabsContent>

        {/* Tab 5: Settings */}
        <TabsContent value="settings" className="max-w-xl space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg">Class Settings</CardTitle>
              <CardDescription>Update name, subject, or description for this class.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveSettings}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-class-name">Class Name *</Label>
                  <Input
                    id="edit-class-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={isSavingSettings}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-class-subject">Subject</Label>
                  <Input
                    id="edit-class-subject"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    disabled={isSavingSettings}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-class-desc">Description</Label>
                  <Input
                    id="edit-class-desc"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    disabled={isSavingSettings}
                  />
                </div>
                <Button type="submit" disabled={isSavingSettings || !editName.trim()} className="cursor-pointer">
                  {isSavingSettings ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </Button>
              </CardContent>
            </form>
          </Card>

          <Card className="border-destructive/30 shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete this class. This will remove student enrollments and all grades for this class.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleDeleteClass}
                disabled={isDeleting}
                className="cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Class
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddStudentToClassDialog
        open={isAddStudentOpen}
        onOpenChange={setIsAddStudentOpen}
        classId={classId!}
        className={currentClass.name}
        students={allStudents}
      />

      <AddGradeDialog
        open={isAddGradeOpen}
        onOpenChange={(open) => {
          setIsAddGradeOpen(open);
          if (!open) setSelectedActivityForGrade(null);
        }}
        classId={classId!}
        enrolledStudents={enrolledStudents}
        activities={activities}
        grades={grades}
        preselectedActivity={selectedActivityForGrade}
      />
    </div>
  );
}
