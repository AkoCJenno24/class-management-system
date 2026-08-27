/**
 * Root Application component.
 * Sets up routing, providers (Auth, Theme, Sonner Toast), and route guards.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';

import { LoginPage } from '@/pages/LoginPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ClassesPage } from '@/pages/ClassesPage';
import { ClassDetailPage } from '@/pages/ClassDetailPage';
import { StudentClassDashboardPage } from '@/pages/StudentClassDashboardPage';
import { StudentsPage } from '@/pages/StudentsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Routes>
                {/* Public auth routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />

                {/* Onboarding route (must be authenticated, but NOT yet onboarded) */}
                <Route element={<ProtectedRoute requireOnboarding={false} />}>
                  <Route path="/onboarding" element={<OnboardingPage />} />
                </Route>

                {/* Main protected application routes (must be authenticated AND onboarded) */}
                <Route element={<ProtectedRoute requireOnboarding={true} />}>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/classes" element={<ClassesPage />} />
                    <Route path="/classes/:id" element={<ClassDetailPage />} />
                    <Route
                      path="/classes/:classId/students/:studentId"
                      element={<StudentClassDashboardPage />}
                    />
                    <Route path="/students" element={<StudentsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                </Route>

                {/* Catch-all redirect to dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
          <Toaster position="top-right" richColors />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
