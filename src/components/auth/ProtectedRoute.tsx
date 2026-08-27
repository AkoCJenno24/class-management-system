/**
 * Protected route component.
 * Redirects unauthenticated users to /login.
 * Redirects authenticated but un-onboarded users to /onboarding.
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  /** If true, requires the user to have completed onboarding */
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ requireOnboarding = true }: ProtectedRouteProps) {
  const { user, isLoading, isOnboarded } = useAuth();

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but not onboarded → redirect to onboarding
  if (requireOnboarding && !isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
