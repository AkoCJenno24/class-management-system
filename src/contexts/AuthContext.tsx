/**
 * Authentication context and provider.
 * Wraps Firebase Auth state and provides the teacher's Firestore profile.
 * All components access auth state through the useAuth() hook.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange } from '@/lib/firebase/auth';
import {
  getTeacherProfile,
  createTeacherProfile,
  onTeacherProfileChange,
} from '@/lib/firebase/firestore';
import type { TeacherProfile } from '@/types';

interface AuthContextType {
  /** Firebase Auth user object, or null if not authenticated */
  user: User | null;
  /** Teacher's Firestore profile, or null if not loaded/signed in */
  teacherProfile: TeacherProfile | null;
  /** Whether the auth state is still loading (initial check) */
  isLoading: boolean;
  /** Whether the teacher has completed onboarding */
  isOnboarded: boolean;
  /** Forces a refresh of the teacher profile from Firestore */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Check if the teacher profile exists; if not, create one
        const profile = await getTeacherProfile(firebaseUser.uid);
        if (!profile) {
          await createTeacherProfile(firebaseUser.uid, firebaseUser.email ?? '');
          const newProfile = await getTeacherProfile(firebaseUser.uid);
          setTeacherProfile(newProfile);
        } else {
          setTeacherProfile(profile);
        }
      } else {
        setTeacherProfile(null);
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Subscribe to real-time profile changes when user is authenticated
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onTeacherProfileChange(user.uid, (profile) => {
      setTeacherProfile(profile);
    });

    return unsubscribe;
  }, [user]);

  /** Refreshes the teacher profile from Firestore. */
  const refreshProfile = async () => {
    if (!user) return;
    const profile = await getTeacherProfile(user.uid);
    setTeacherProfile(profile);
  };

  const isOnboarded = teacherProfile?.isOnboarded ?? false;

  return (
    <AuthContext.Provider value={{ user, teacherProfile, isLoading, isOnboarded, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to access authentication state and the teacher profile. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
