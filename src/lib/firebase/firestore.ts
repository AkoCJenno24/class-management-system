/**
 * Firestore data access layer.
 * All database CRUD operations are centralized here.
 * UI components access data exclusively through these functions.
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
  getDocs,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from './config';
import type {
  TeacherProfile,
  Class,
  ClassColor,
  Student,
  StudentStatus,
  Activity,
  ActivityType,
  Grade,
  AttendanceRecord,
  AttendanceStatus,
  StickyNote,
  StickyNoteColor,
  TodoItem,
  TodoPriority,
  TodoCategory,
  OnboardingData,
  GradingScale,
  AppNotification,
  NotificationType,
  NotificationCategory,
} from '@/types';
import { DEFAULT_GRADING_SCALE, DEFAULT_GRADE_LEVELS } from '@/types';

// ─── Helper: Convert Firestore timestamps to Date ───────────────────────────

function toDate(timestamp: unknown): Date {
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    return (timestamp as { toDate: () => Date }).toDate();
  }
  return new Date();
}

/** Parses grading scale from Firestore data, falling back to default. */
function parseGradingScale(data: unknown): GradingScale {
  if (data && typeof data === 'object' && 'type' in data) {
    return data as GradingScale;
  }
  return DEFAULT_GRADING_SCALE;
}

// ─── Teacher Profile ─────────────────────────────────────────────────────────

/** Fetches the teacher profile for a given user ID. Returns null if not found. */
export async function getTeacherProfile(uid: string): Promise<TeacherProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    email: data.email ?? '',
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    school: data.school ?? '',
    subject: data.subject ?? '',
    avatarUrl: data.avatarUrl ?? null,
    avatarPreset: data.avatarPreset ?? null,
    avatarColor: data.avatarColor ?? '#6366F1',
    isOnboarded: data.isOnboarded ?? false,
    gradingScale: parseGradingScale(data.gradingScale),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/** Creates the initial teacher profile document after sign-up. */
export async function createTeacherProfile(uid: string, email: string): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    email,
    firstName: '',
    lastName: '',
    school: '',
    subject: '',
    avatarUrl: null,
    avatarPreset: null,
    avatarColor: '#6366F1',
    isOnboarded: false,
    gradingScale: DEFAULT_GRADING_SCALE,
    gradeLevels: DEFAULT_GRADE_LEVELS,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Completes the onboarding process by updating the teacher profile. */
export async function completeOnboarding(uid: string, data: OnboardingData): Promise<void> {
  const profilePayload: Record<string, unknown> = {
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    school: data.school ?? '',
    subject: data.subject ?? '',
    avatarUrl: data.avatarUrl ?? null,
    avatarColor: data.avatarColor ?? '#6366F1',
    avatarPreset: data.avatarPreset ?? null,
    gradingScale: data.gradingScale ?? DEFAULT_GRADING_SCALE,
    gradeLevels: DEFAULT_GRADE_LEVELS,
    isOnboarded: true,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', uid), profilePayload, { merge: true });
}

/** Updates specific fields on the teacher profile. */
export async function updateTeacherProfile(
  uid: string,
  updates: Partial<Omit<TeacherProfile, 'uid' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/** Subscribes to real-time changes on the teacher profile. */
export function onTeacherProfileChange(
  uid: string,
  callback: (profile: TeacherProfile | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data();
    callback({
      uid,
      email: data.email ?? '',
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      school: data.school ?? '',
      subject: data.subject ?? '',
      avatarUrl: data.avatarUrl ?? null,
      avatarPreset: data.avatarPreset ?? null,
      avatarColor: data.avatarColor ?? '#6366F1',
      isOnboarded: data.isOnboarded ?? false,
      gradingScale: parseGradingScale(data.gradingScale),
      gradeLevels: Array.isArray(data.gradeLevels) && data.gradeLevels.length > 0 ? data.gradeLevels : DEFAULT_GRADE_LEVELS,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    });
  });
}

// ─── Classes ─────────────────────────────────────────────────────────────────

/** Creates a new class for the teacher. Returns the new class ID. */
export async function createClass(
  uid: string,
  data: {
    name: string;
    subject?: string;
    description?: string;
    academicYear?: string;
    room?: string;
    startTime?: string;
    endTime?: string;
    days?: string[];
    color?: ClassColor;
    isPinned?: boolean;
    order?: number;
  }
): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'classes'), {
    name: data.name,
    subject: data.subject ?? '',
    description: data.description ?? '',
    academicYear: data.academicYear ?? '',
    room: data.room ?? '',
    startTime: data.startTime ?? '',
    endTime: data.endTime ?? '',
    days: Array.isArray(data.days) ? data.days : [],
    color: data.color ?? 'default',
    isPinned: data.isPinned ?? false,
    status: 'active',
    order: data.order ?? Date.now(),
    studentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Updates an existing class. */
export async function updateClass(
  uid: string,
  classId: string,
  updates: Partial<Omit<Class, 'id' | 'createdAt' | 'updatedAt' | 'studentCount'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'classes', classId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/** Toggles pinning state for a class. */
export async function togglePinClass(
  uid: string,
  classId: string,
  isPinned: boolean
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'classes', classId), {
    isPinned,
    updatedAt: serverTimestamp(),
  });
}

/** Archives a class to preserve records while hiding from active lists. */
export async function archiveClass(uid: string, classId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'classes', classId), {
    status: 'archived',
    isPinned: false, // Automatically unpin when archiving
    updatedAt: serverTimestamp(),
  });
}

/** Restores an archived class back to active status. */
export async function restoreClass(uid: string, classId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'classes', classId), {
    status: 'active',
    updatedAt: serverTimestamp(),
  });
}

/** Reorders unpinned classes sequence in Firestore. */
export async function reorderClasses(
  uid: string,
  orderedClassIds: string[]
): Promise<void> {
  const batch = writeBatch(db);
  orderedClassIds.forEach((id, index) => {
    const ref = doc(db, 'users', uid, 'classes', id);
    batch.update(ref, {
      order: index,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

/** Deletes a class and removes it from all enrolled students. */
export async function deleteClass(uid: string, classId: string): Promise<void> {
  const batch = writeBatch(db);

  // Remove classId from all students enrolled in this class
  const studentsSnap = await getDocs(
    query(collection(db, 'users', uid, 'students'), where('classIds', 'array-contains', classId))
  );
  for (const studentDoc of studentsSnap.docs) {
    const currentClassIds: string[] = studentDoc.data().classIds ?? [];
    batch.update(studentDoc.ref, {
      classIds: currentClassIds.filter((id) => id !== classId),
      updatedAt: serverTimestamp(),
    });
  }

  // Delete all grades for this class
  const gradesSnap = await getDocs(
    query(collection(db, 'users', uid, 'grades'), where('classId', '==', classId))
  );
  for (const gradeDoc of gradesSnap.docs) {
    batch.delete(gradeDoc.ref);
  }

  // Delete the class itself
  batch.delete(doc(db, 'users', uid, 'classes', classId));
  await batch.commit();
}

/** Subscribes to real-time changes on all classes for a teacher. */
export function onClassesChange(
  uid: string,
  callback: (classes: Class[]) => void
): Unsubscribe {
  const q = query(collection(db, 'users', uid, 'classes'));
  return onSnapshot(
    q,
    (snap) => {
      const classes: Class[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? '',
          subject: data.subject ?? '',
          description: data.description ?? '',
          academicYear: data.academicYear ?? '',
          room: data.room ?? '',
          startTime: data.startTime ?? '',
          endTime: data.endTime ?? '',
          days: Array.isArray(data.days) ? data.days : [],
          color: (data.color as ClassColor) || 'default',
          isPinned: data.isPinned ?? false,
          status: (data.status as 'active' | 'archived') || 'active',
          order: typeof data.order === 'number' ? data.order : 0,
          studentCount: data.studentCount ?? 0,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        };
      });

      // Pinned classes come first, then ordered unpinned classes
      classes.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
          return a.order - b.order;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      callback(classes);
    },
    (err) => {
      console.error('Error in onClassesChange listener:', err);
    }
  );
}

/** Fetches a single class by ID. */
export async function getClass(uid: string, classId: string): Promise<Class | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'classes', classId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name ?? '',
    subject: data.subject ?? '',
    description: data.description ?? '',
    academicYear: data.academicYear ?? '',
    room: data.room ?? '',
    startTime: data.startTime ?? '',
    endTime: data.endTime ?? '',
    days: Array.isArray(data.days) ? data.days : [],
    color: (data.color as ClassColor) || 'default',
    isPinned: data.isPinned ?? false,
    status: (data.status as 'active' | 'archived') || 'active',
    order: typeof data.order === 'number' ? data.order : 0,
    studentCount: data.studentCount ?? 0,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

// ─── Students ────────────────────────────────────────────────────────────────

/** Creates a new student in the global roster. Returns the new student ID. */
export async function createStudent(
  uid: string,
  data: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    suffix?: string | null;
    avatarUrl?: string | null;
    avatarPreset?: string | null;
    avatarColor?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    address?: string | null;
    status?: StudentStatus;
    parentGuardian?: string | null;
    email?: string | null;
    phone?: string | null;
    studentId?: string | null;
    gradeLevel?: string | null;
  }
): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'students'), {
    firstName: data.firstName,
    middleName: data.middleName ?? null,
    lastName: data.lastName,
    suffix: data.suffix ?? null,
    avatarUrl: data.avatarUrl ?? null,
    avatarPreset: data.avatarPreset ?? null,
    avatarColor: data.avatarColor ?? '#6366F1',
    dateOfBirth: data.dateOfBirth ?? null,
    gender: data.gender ?? null,
    address: data.address ?? null,
    status: data.status ?? 'active',
    parentGuardian: data.parentGuardian ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    studentId: data.studentId ?? null,
    gradeLevel: data.gradeLevel ?? null,
    classIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Updates an existing student. */
export async function updateStudent(
  uid: string,
  studentId: string,
  updates: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'classIds'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'students', studentId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/** Deletes a student and all their grades. */
export async function deleteStudent(uid: string, studentId: string): Promise<void> {
  const batch = writeBatch(db);

  // Get the student to find their classes (to decrement studentCount)
  const studentSnap = await getDoc(doc(db, 'users', uid, 'students', studentId));
  if (studentSnap.exists()) {
    const classIds: string[] = studentSnap.data().classIds ?? [];
    for (const classId of classIds) {
      batch.update(doc(db, 'users', uid, 'classes', classId), {
        studentCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    }
  }

  // Delete all grades for this student
  const gradesSnap = await getDocs(
    query(collection(db, 'users', uid, 'grades'), where('studentId', '==', studentId))
  );
  for (const gradeDoc of gradesSnap.docs) {
    batch.delete(gradeDoc.ref);
  }

  // Delete the student
  batch.delete(doc(db, 'users', uid, 'students', studentId));
  await batch.commit();
}

/** Subscribes to real-time changes on all students for a teacher. */
export function onStudentsChange(
  uid: string,
  callback: (students: Student[]) => void
): Unsubscribe {
  const q = query(collection(db, 'users', uid, 'students'));
  return onSnapshot(
    q,
    (snap) => {
      const students: Student[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          firstName: data.firstName ?? '',
          middleName: data.middleName ?? null,
          lastName: data.lastName ?? '',
          suffix: data.suffix ?? null,
          avatarUrl: data.avatarUrl ?? null,
          avatarPreset: data.avatarPreset ?? null,
          avatarColor: data.avatarColor ?? '#6366F1',
          dateOfBirth: data.dateOfBirth ?? null,
          gender: data.gender ?? null,
          address: data.address ?? null,
          status: (data.status as StudentStatus) ?? 'active',
          parentGuardian: data.parentGuardian ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
          studentId: data.studentId ?? null,
          gradeLevel: data.gradeLevel ?? null,
          classIds: data.classIds ?? [],
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        };
      });
      students.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(students);
    },
    (err) => {
      console.error('Error in onStudentsChange listener:', err);
    }
  );
}

/** Adds a student to a class. Updates both the student's classIds and the class's studentCount. */
export async function addStudentToClass(
  uid: string,
  studentId: string,
  classId: string
): Promise<void> {
  const batch = writeBatch(db);
  const studentRef = doc(db, 'users', uid, 'students', studentId);
  const studentSnap = await getDoc(studentRef);

  if (!studentSnap.exists()) throw new Error('Student not found');

  const currentClassIds: string[] = studentSnap.data().classIds ?? [];
  if (currentClassIds.includes(classId)) return; // Already enrolled

  batch.update(studentRef, {
    classIds: [...currentClassIds, classId],
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'users', uid, 'classes', classId), {
    studentCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

/** Removes a student from a class. */
export async function removeStudentFromClass(
  uid: string,
  studentId: string,
  classId: string
): Promise<void> {
  const batch = writeBatch(db);
  const studentRef = doc(db, 'users', uid, 'students', studentId);
  const studentSnap = await getDoc(studentRef);

  if (!studentSnap.exists()) throw new Error('Student not found');

  const currentClassIds: string[] = studentSnap.data().classIds ?? [];
  batch.update(studentRef, {
    classIds: currentClassIds.filter((id) => id !== classId),
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'users', uid, 'classes', classId), {
    studentCount: increment(-1),
    updatedAt: serverTimestamp(),
  });

  // Also delete grades for this student in this class
  const gradesSnap = await getDocs(
    query(
      collection(db, 'users', uid, 'grades'),
      where('studentId', '==', studentId),
      where('classId', '==', classId)
    )
  );
  for (const gradeDoc of gradesSnap.docs) {
    batch.delete(gradeDoc.ref);
  }

  await batch.commit();
}

// ─── Grades ──────────────────────────────────────────────────────────────────

/** Creates a new grade entry. Returns the new grade ID. */
export async function createGrade(
  uid: string,
  data: {
    studentId: string;
    classId: string;
    assignmentName: string;
    score: number;
    maxScore: number;
    date: Date;
  }
): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'grades'), {
    studentId: data.studentId,
    classId: data.classId,
    assignmentName: data.assignmentName,
    score: data.score,
    maxScore: data.maxScore,
    date: data.date,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Updates an existing grade. */
export async function updateGrade(
  uid: string,
  gradeId: string,
  updates: Partial<Omit<Grade, 'id' | 'createdAt' | 'updatedAt' | 'studentId' | 'classId'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'grades', gradeId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/** Deletes a grade entry. */
export async function deleteGrade(uid: string, gradeId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'grades', gradeId));
}

/** Subscribes to real-time changes on grades for a specific class. */
export function onClassGradesChange(
  uid: string,
  classId: string,
  callback: (grades: Grade[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'users', uid, 'grades'),
    where('classId', '==', classId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const grades: Grade[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          studentId: data.studentId ?? '',
          classId: data.classId ?? '',
          assignmentName: data.assignmentName ?? '',
          score: data.score ?? 0,
          maxScore: data.maxScore ?? 100,
          date: toDate(data.date),
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        };
      });
      // Sort in memory by date descending, then createdAt descending
      grades.sort((a, b) => b.date.getTime() - a.date.getTime() || b.createdAt.getTime() - a.createdAt.getTime());
      callback(grades);
    },
    (err) => {
      console.error('Error in onClassGradesChange listener:', err);
    }
  );
}

// ─── Attendance ──────────────────────────────────────────────────────────────

/**
 * Saves or updates daily attendance for a class on a specific date (YYYY-MM-DD).
 * Document is stored at users/{uid}/attendance/{classId_date}.
 */
export async function saveAttendanceRecord(
  uid: string,
  classId: string,
  date: string,
  statuses: Record<string, AttendanceStatus>
): Promise<void> {
  const docId = `${classId}_${date}`;
  const docRef = doc(db, 'users', uid, 'attendance', docId);

  await setDoc(
    docRef,
    {
      classId,
      date,
      statuses,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Fetches attendance record for a specific class and date. */
export async function getAttendanceRecord(
  uid: string,
  classId: string,
  date: string
): Promise<AttendanceRecord | null> {
  const docId = `${classId}_${date}`;
  const snap = await getDoc(doc(db, 'users', uid, 'attendance', docId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    classId: data.classId ?? classId,
    date: data.date ?? date,
    statuses: data.statuses ?? {},
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/** Subscribes to real-time changes on attendance for a specific class and date. */
export function onAttendanceRecordChange(
  uid: string,
  classId: string,
  date: string,
  callback: (record: AttendanceRecord | null) => void
): Unsubscribe {
  const docId = `${classId}_${date}`;
  return onSnapshot(
    doc(db, 'users', uid, 'attendance', docId),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.data();
      callback({
        id: snap.id,
        classId: data.classId ?? classId,
        date: data.date ?? date,
        statuses: data.statuses ?? {},
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      });
    },
    (err) => {
      console.error('Error in onAttendanceRecordChange listener:', err);
    }
  );
}

/** Subscribes to all attendance records for a specific class across all dates. */
export function onClassAttendanceChange(
  uid: string,
  classId: string,
  callback: (records: AttendanceRecord[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'users', uid, 'attendance'),
    where('classId', '==', classId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const records: AttendanceRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          classId: data.classId ?? classId,
          date: data.date ?? '',
          statuses: data.statuses ?? {},
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        };
      });
      records.sort((a, b) => b.date.localeCompare(a.date));
      callback(records);
    },
    (err) => {
      console.error('Error in onClassAttendanceChange listener:', err);
    }
  );
}

// ─── Class Activities ───────────────────────────────────────────────────────

/** Creates a new activity definition for a class. */
export async function createActivity(
  uid: string,
  data: {
    classId: string;
    name: string;
    type: ActivityType;
    maxScore: number;
    description?: string;
    dueDate?: Date | null;
  }
): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'activities'), {
    classId: data.classId,
    name: data.name,
    type: data.type,
    maxScore: data.maxScore,
    description: data.description ?? '',
    dueDate: data.dueDate ? data.dueDate : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Updates an existing activity definition. */
export async function updateActivity(
  uid: string,
  activityId: string,
  data: Partial<Pick<Activity, 'name' | 'type' | 'maxScore' | 'description' | 'dueDate'>>
): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.type !== undefined) updatePayload.type = data.type;
  if (data.maxScore !== undefined) updatePayload.maxScore = data.maxScore;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate;

  await updateDoc(doc(db, 'users', uid, 'activities', activityId), updatePayload);
}

/** Deletes an activity definition. */
export async function deleteActivity(uid: string, activityId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'activities', activityId));
}

/** Fetches all activities defined for a specific class. */
export async function getClassActivities(uid: string, classId: string): Promise<Activity[]> {
  const q = query(
    collection(db, 'users', uid, 'activities'),
    where('classId', '==', classId)
  );
  const snap = await getDocs(q);
  const list: Activity[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      classId: data.classId ?? classId,
      name: data.name ?? '',
      type: data.type ?? 'quiz',
      maxScore: data.maxScore ?? 100,
      description: data.description ?? '',
      dueDate: data.dueDate ? toDate(data.dueDate) : null,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  });
  list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return list;
}

/** Subscribes to real-time changes on activities for a specific class. */
export function onClassActivitiesChange(
  uid: string,
  classId: string,
  callback: (activities: Activity[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'users', uid, 'activities'),
    where('classId', '==', classId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const activities: Activity[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          classId: data.classId ?? classId,
          name: data.name ?? '',
          type: data.type ?? 'quiz',
          maxScore: data.maxScore ?? 100,
          description: data.description ?? '',
          dueDate: data.dueDate ? toDate(data.dueDate) : null,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        };
      });
      activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(activities);
    },
    (err) => {
      console.error('Error in onClassActivitiesChange listener:', err);
    }
  );
}

/** Subscribes to real-time changes on ALL activities across all classes for a user. */
export function onAllActivitiesChange(
  uid: string,
  callback: (activities: Activity[]) => void
): Unsubscribe {
  const q = collection(db, 'users', uid, 'activities');
  return onSnapshot(
    q,
    (snap) => {
      const activities: Activity[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          classId: data.classId ?? '',
          name: data.name ?? '',
          type: data.type ?? 'quiz',
          maxScore: data.maxScore ?? 100,
          description: data.description ?? '',
          dueDate: data.dueDate ? toDate(data.dueDate) : null,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        };
      });
      activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(activities);
    },
    (err) => {
      console.error('Error in onAllActivitiesChange listener:', err);
    }
  );
}

// ─── Sticky Notes ───────────────────────────────────────────────────────────

/** Creates a new sticky note on the teacher's dashboard. */
export async function createStickyNote(
  uid: string,
  data: {
    title: string;
    content: string;
    color: StickyNoteColor;
    isPinned?: boolean;
    order?: number;
  }
): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'notes'), {
    title: data.title,
    content: data.content,
    color: data.color,
    isPinned: data.isPinned ?? false,
    order: data.order ?? 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Updates an existing sticky note. */
export async function updateStickyNote(
  uid: string,
  noteId: string,
  data: Partial<Pick<StickyNote, 'title' | 'content' | 'color' | 'isPinned' | 'order'>>
): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (data.title !== undefined) updatePayload.title = data.title;
  if (data.content !== undefined) updatePayload.content = data.content;
  if (data.color !== undefined) updatePayload.color = data.color;
  if (data.isPinned !== undefined) updatePayload.isPinned = data.isPinned;
  if (data.order !== undefined) updatePayload.order = data.order;

  await updateDoc(doc(db, 'users', uid, 'notes', noteId), updatePayload);
}

/** Updates the sequence order of multiple sticky notes in a batch. */
export async function reorderStickyNotes(
  uid: string,
  orderedNoteIds: string[]
): Promise<void> {
  if (orderedNoteIds.length === 0) return;
  const batch = writeBatch(db);
  orderedNoteIds.forEach((id, index) => {
    batch.update(doc(db, 'users', uid, 'notes', id), {
      order: index,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

/** Deletes a sticky note. */
export async function deleteStickyNote(uid: string, noteId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'notes', noteId));
}

/** Subscribes to real-time changes on sticky notes for the teacher. */
export function onStickyNotesChange(
  uid: string,
  callback: (notes: StickyNote[]) => void
): Unsubscribe {
  const q = query(collection(db, 'users', uid, 'notes'));
  return onSnapshot(
    q,
    (snap) => {
      const notes: StickyNote[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? '',
          content: data.content ?? '',
          color: data.color ?? 'yellow',
          isPinned: data.isPinned ?? false,
          order: typeof data.order === 'number' ? data.order : undefined,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        };
      });
      // Pinned notes first, then unpinned notes sorted by custom order or creation date
      notes.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      callback(notes);
    },
    (err) => {
      console.error('Error in onStickyNotesChange listener:', err);
    }
  );
}

// ─── To-Do Items ───────────────────────────────────────────────────────────

/** Creates a new task item on the teacher's to-do list. */
export async function createTodoItem(
  uid: string,
  data: {
    title: string;
    description?: string;
    priority?: TodoPriority;
    category?: TodoCategory;
    dueDate?: Date | null;
    isPinned?: boolean;
  }
): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'todos'), {
    title: data.title,
    description: data.description ?? '',
    completed: false,
    priority: data.priority ?? 'medium',
    category: data.category ?? 'general',
    dueDate: data.dueDate ? data.dueDate : null,
    isPinned: data.isPinned ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: null,
  });
  return ref.id;
}

/** Updates an existing to-do item. */
export async function updateTodoItem(
  uid: string,
  todoId: string,
  data: Partial<
    Pick<
      TodoItem,
      | 'title'
      | 'description'
      | 'completed'
      | 'priority'
      | 'category'
      | 'dueDate'
      | 'isPinned'
      | 'completedAt'
    >
  >
): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (data.title !== undefined) updatePayload.title = data.title;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.completed !== undefined) {
    updatePayload.completed = data.completed;
    updatePayload.completedAt = data.completed ? serverTimestamp() : null;
  }
  if (data.priority !== undefined) updatePayload.priority = data.priority;
  if (data.category !== undefined) updatePayload.category = data.category;
  if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate ? data.dueDate : null;
  if (data.isPinned !== undefined) updatePayload.isPinned = data.isPinned;

  await updateDoc(doc(db, 'users', uid, 'todos', todoId), updatePayload);
}

/** Toggles completion status of a to-do item. */
export async function toggleTodoItem(
  uid: string,
  todoId: string,
  completed: boolean
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'todos', todoId), {
    completed,
    completedAt: completed ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}

/** Deletes a single to-do item. */
export async function deleteTodoItem(uid: string, todoId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'todos', todoId));
}

/** Batch deletes all completed to-do items for a teacher. */
export async function clearCompletedTodos(uid: string): Promise<void> {
  const q = query(
    collection(db, 'users', uid, 'todos'),
    where('completed', '==', true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  for (const item of snap.docs) {
    batch.delete(item.ref);
  }
  await batch.commit();
}

/** Subscribes to real-time changes on to-do list items for the teacher. */
export function onTodoItemsChange(
  uid: string,
  callback: (todos: TodoItem[]) => void
): Unsubscribe {
  const q = query(collection(db, 'users', uid, 'todos'));
  return onSnapshot(
    q,
    (snap) => {
      const items: TodoItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? '',
          description: data.description ?? '',
          completed: data.completed ?? false,
          priority: (data.priority as TodoPriority) ?? 'medium',
          category: (data.category as TodoCategory) ?? 'general',
          dueDate: data.dueDate ? toDate(data.dueDate) : null,
          isPinned: data.isPinned ?? false,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
          completedAt: data.completedAt ? toDate(data.completedAt) : null,
        };
      });

      // Sort ordering:
      // 1. Incomplete items before completed items
      // 2. Pinned items first within each group
      // 3. Due dates (closest first) or creation date (newest first)
      items.sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      callback(items);
    },
    (err) => {
      console.error('Error in onTodoItemsChange listener:', err);
    }
  );
}

// ─── Notifications ──────────────────────────────────────────────────────────

/** Creates a new notification for a teacher. Returns the created notification ID. */
export async function createNotification(
  uid: string,
  data: {
    title: string;
    message: string;
    type?: NotificationType;
    category?: NotificationCategory;
    link?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'notifications'), {
    title: data.title,
    message: data.message,
    type: data.type ?? 'info',
    category: data.category ?? 'general',
    link: data.link ?? null,
    entityId: data.entityId ?? null,
    metadata: data.metadata ?? {},
    read: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Marks a specific notification as read. */
export async function markNotificationAsRead(
  uid: string,
  notificationId: string
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'notifications', notificationId), {
    read: true,
  });
}

/** Marks all unread notifications as read for a teacher. */
export async function markAllNotificationsAsRead(uid: string): Promise<void> {
  const q = query(
    collection(db, 'users', uid, 'notifications'),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  for (const item of snap.docs) {
    batch.update(item.ref, { read: true });
  }
  await batch.commit();
}

/** Deletes a single notification. */
export async function deleteNotification(
  uid: string,
  notificationId: string
): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'notifications', notificationId));
}

/** Clears all notifications for a teacher. */
export async function clearAllNotifications(uid: string): Promise<void> {
  const snap = await getDocs(collection(db, 'users', uid, 'notifications'));
  if (snap.empty) return;

  const batch = writeBatch(db);
  for (const item of snap.docs) {
    batch.delete(item.ref);
  }
  await batch.commit();
}

/** Subscribes to real-time changes on notifications for the teacher. */
export function onNotificationsChange(
  uid: string,
  callback: (notifications: AppNotification[]) => void
): Unsubscribe {
  const q = query(collection(db, 'users', uid, 'notifications'));
  return onSnapshot(
    q,
    (snap) => {
      const items: AppNotification[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: uid,
          title: data.title ?? '',
          message: data.message ?? '',
          type: (data.type as NotificationType) ?? 'info',
          category: (data.category as NotificationCategory) ?? 'general',
          link: data.link ?? undefined,
          read: data.read ?? false,
          entityId: data.entityId ?? undefined,
          metadata: data.metadata ?? undefined,
          createdAt: toDate(data.createdAt),
        };
      });

      // Sort by creation date descending (newest first)
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      callback(items);
    },
    (err) => {
      console.error('Error in onNotificationsChange listener:', err);
    }
  );
}



