/**
 * Core TypeScript interfaces for the Class Management System.
 * All data models used across the application are defined here.
 */

/** Teacher profile stored in Firestore under users/{uid} */
export interface TeacherProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  school: string;
  subject: string;
  avatarUrl: string | null;
  avatarPreset: string | null;
  avatarColor: string;
  isOnboarded: boolean;
  /** Teacher's preferred grading scale */
  gradingScale: GradingScale;
  /** Teacher's preset grade levels list */
  gradeLevels?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Supported grading scale types */
export type GradingScaleType = 'numeric' | 'percentage' | 'letter' | 'custom';

/** Grading scale configuration */
export interface GradingScale {
  type: GradingScaleType;
  /** For numeric: the default max score (e.g. 100, 50, 20) */
  defaultMaxScore: number;
  /** For custom scales: user-defined grade labels and thresholds */
  customLabels?: GradeLabel[];
}

/** A single grade label in a custom grading scale (e.g., A+ = 97-100%) */
export interface GradeLabel {
  label: string;
  minPercentage: number;
  maxPercentage: number;
  color: string;
}

/** Default grading scale presets the teacher can choose from */
export const GRADING_SCALE_PRESETS: Record<string, GradingScale> = {
  numeric100: {
    type: 'numeric',
    defaultMaxScore: 100,
  },
  numeric20: {
    type: 'numeric',
    defaultMaxScore: 20,
  },
  percentage: {
    type: 'percentage',
    defaultMaxScore: 100,
  },
  letterUS: {
    type: 'letter',
    defaultMaxScore: 100,
    customLabels: [
      { label: 'A+', minPercentage: 97, maxPercentage: 100, color: '#22C55E' },
      { label: 'A',  minPercentage: 93, maxPercentage: 96,  color: '#22C55E' },
      { label: 'A-', minPercentage: 90, maxPercentage: 92,  color: '#22C55E' },
      { label: 'B+', minPercentage: 87, maxPercentage: 89,  color: '#3B82F6' },
      { label: 'B',  minPercentage: 83, maxPercentage: 86,  color: '#3B82F6' },
      { label: 'B-', minPercentage: 80, maxPercentage: 82,  color: '#3B82F6' },
      { label: 'C+', minPercentage: 77, maxPercentage: 79,  color: '#EAB308' },
      { label: 'C',  minPercentage: 73, maxPercentage: 76,  color: '#EAB308' },
      { label: 'C-', minPercentage: 70, maxPercentage: 72,  color: '#EAB308' },
      { label: 'D+', minPercentage: 67, maxPercentage: 69,  color: '#F97316' },
      { label: 'D',  minPercentage: 63, maxPercentage: 66,  color: '#F97316' },
      { label: 'D-', minPercentage: 60, maxPercentage: 62,  color: '#F97316' },
      { label: 'F',  minPercentage: 0,  maxPercentage: 59,  color: '#EF4444' },
    ],
  },
  letterUK: {
    type: 'letter',
    defaultMaxScore: 100,
    customLabels: [
      { label: 'A*', minPercentage: 90, maxPercentage: 100, color: '#22C55E' },
      { label: 'A',  minPercentage: 80, maxPercentage: 89,  color: '#22C55E' },
      { label: 'B',  minPercentage: 70, maxPercentage: 79,  color: '#3B82F6' },
      { label: 'C',  minPercentage: 60, maxPercentage: 69,  color: '#EAB308' },
      { label: 'D',  minPercentage: 50, maxPercentage: 59,  color: '#F97316' },
      { label: 'E',  minPercentage: 40, maxPercentage: 49,  color: '#EF4444' },
      { label: 'F',  minPercentage: 0,  maxPercentage: 39,  color: '#EF4444' },
    ],
  },
};

/** Default grading scale for new teachers */
export const DEFAULT_GRADING_SCALE: GradingScale = GRADING_SCALE_PRESETS.numeric100;

/** Class (workspace) belonging to a teacher */
export interface Class {
  id: string;
  name: string;
  subject: string;
  description: string;
  studentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Default preset grade levels available to teachers */
export const DEFAULT_GRADE_LEVELS: string[] = [
  'Kindergarten',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'College / University',
  'Other',
];

/** Supported student enrollment statuses */
export type StudentStatus =
  | 'active'
  | 'inactive'
  | 'graduated'
  | 'transferred'
  | 'dropped'
  | 'suspended';

/** Student status metadata configuration */
export interface StudentStatusOption {
  value: StudentStatus;
  label: string;
  badgeClass: string;
  dotColor: string;
}

export const STUDENT_STATUS_OPTIONS: StudentStatusOption[] = [
  {
    value: 'active',
    label: 'Active',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dotColor: '#10B981',
  },
  {
    value: 'inactive',
    label: 'Inactive',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    dotColor: '#6B7280',
  },
  {
    value: 'graduated',
    label: 'Graduated',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    dotColor: '#3B82F6',
  },
  {
    value: 'transferred',
    label: 'Transferred',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    dotColor: '#8B5CF6',
  },
  {
    value: 'dropped',
    label: 'Dropped',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dotColor: '#F59E0B',
  },
  {
    value: 'suspended',
    label: 'Suspended',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    dotColor: '#EF4444',
  },
];

/** Preset gender options for student records */
export const STUDENT_GENDER_OPTIONS = [
  'Male',
  'Female',
  'Non-binary',
  'Other',
  'Prefer not to say',
] as const;

export type StudentGender = (typeof STUDENT_GENDER_OPTIONS)[number] | string;

/** Student in the global roster */
export interface Student {
  id: string;
  // Basic Information
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  avatarColor?: string | null;
  dateOfBirth?: string | null; // ISO Date YYYY-MM-DD
  gender?: StudentGender | null;
  address?: string | null;
  status?: StudentStatus;

  // Contact Information
  parentGuardian?: string | null;
  email?: string | null;
  phone?: string | null;

  // Academic Information
  studentId: string | null;
  gradeLevel?: string | null;
  classIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Supported activity/assignment types */
export type ActivityType = 'quiz' | 'exam' | 'assignment' | 'homework' | 'project' | 'participation' | 'other';

/** Activity definition created by the teacher for a class */
export interface Activity {
  id: string;
  classId: string;
  name: string;
  type: ActivityType;
  maxScore: number;
  description?: string;
  dueDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Grade entry for a student in a class */
export interface Grade {
  id: string;
  studentId: string;
  classId: string;
  assignmentName: string;
  score: number;
  maxScore: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Attendance status for a student on a specific date */
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

/** Daily attendance document stored under users/{uid}/attendance/{classId_date} */
export interface AttendanceRecord {
  id: string;
  classId: string;
  date: string; // 'YYYY-MM-DD'
  /** Mapping of studentId -> status */
  statuses: Record<string, AttendanceStatus>;
  createdAt: Date;
  updatedAt: Date;
}

/** Supported sticky note color themes */
export type StickyNoteColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange';

/** Sticky note created by teacher on the dashboard */
export interface StickyNote {
  id: string;
  title: string;
  content: string;
  color: StickyNoteColor;
  isPinned?: boolean;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Supported task priorities */
export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';

/** Supported task categories for teachers */
export type TodoCategory =
  | 'lesson'
  | 'grading'
  | 'administrative'
  | 'meeting'
  | 'general'
  | 'other';

/** Teacher To-Do item stored in Firestore under users/{uid}/todos */
export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: TodoPriority;
  category: TodoCategory;
  dueDate?: Date | null;
  isPinned?: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}

/** Data collected during the onboarding wizard */
export interface OnboardingData {
  firstName: string;
  lastName: string;
  school: string;
  subject: string;
  avatarUrl?: string | null;
  avatarColor: string;
  avatarPreset: string | null;
  gradingScale: GradingScale;
}

/** Preset avatar options for onboarding */
export interface AvatarPreset {
  id: string;
  label: string;
  src: string;
  category: 'male' | 'female';
}

/** Available avatar presets */
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'male-1', label: 'Alex', src: '/avatars/male-1.jpg', category: 'male' },
  { id: 'male-2', label: 'Marcus', src: '/avatars/male-2.jpg', category: 'male' },
  { id: 'male-3', label: 'Sam', src: '/avatars/male-3.jpg', category: 'male' },
  { id: 'female-1', label: 'Lisa', src: '/avatars/female-1.jpg', category: 'female' },
  { id: 'female-2', label: 'Ruby', src: '/avatars/female-2.jpg', category: 'female' },
  { id: 'female-3', label: 'Zara', src: '/avatars/female-3.jpg', category: 'female' },
];

/** Preset avatar color options for initials-based avatars */
export const AVATAR_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6B7280', // Gray
] as const;

/** Supported notification types */
export type NotificationType =
  | 'deadline'
  | 'reminder'
  | 'activity'
  | 'grade'
  | 'system'
  | 'info'
  | 'warning'
  | 'success';

/** Supported notification categories */
export type NotificationCategory =
  | 'todo'
  | 'activity'
  | 'class'
  | 'student'
  | 'grade'
  | 'system'
  | 'general';

/** Global App Notification model stored in Firestore under users/{uid}/notifications */
export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  link?: string;
  read: boolean;
  createdAt: Date;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

