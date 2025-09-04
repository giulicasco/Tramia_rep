import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

interface AuthUser {
  email: string;
  role: string;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading, error } = useQuery<AuthUser>({
    queryKey: ['/auth/me'],
    retry: false,
    staleTime: 30000, // 30 seconds to reduce flicker on navigation
  });

  useEffect(() => {
    if (!isLoading && (error || !user)) {
      // User is not authenticated, redirect to login
      setLocation('/login');
    }
  }, [user, isLoading, error, setLocation]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center" data-testid="status-auth-check">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Show nothing while redirecting
  if (error || !user) {
    return null;
  }

  // User is authenticated, show the protected content
  return <>{children}</>;
}