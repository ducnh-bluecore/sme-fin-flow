/**
 * OnboardingGuard - Redirects users to appropriate onboarding step if needed
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useNeedsOnboarding } from '@/hooks/useOnboardingStatus';
import { Loader2 } from 'lucide-react';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

// Routes that should bypass onboarding check
const BYPASS_ROUTES = [
  '/onboarding',
  '/auth',
  '/login',
  '/signup',
  '/reset-password',
  '/admin',
];

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const location = useLocation();
  const { 
    isLoading, 
    needsPlatformOnboarding, 
    needsTenantOnboarding, 
    isOnboardingComplete 
  } = useNeedsOnboarding();

  // Check if current route should bypass onboarding
  const shouldBypass = BYPASS_ROUTES.some(route => 
    location.pathname.startsWith(route)
  );

  if (shouldBypass) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Redirect to platform onboarding if needed
  if (needsPlatformOnboarding) {
    return <Navigate to="/onboarding/welcome" state={{ from: location }} replace />;
  }

  // Redirect to tenant onboarding if platform is done but tenant isn't
  if (needsTenantOnboarding) {
    return <Navigate to="/onboarding/company" state={{ from: location }} replace />;
  }

  // User has completed onboarding - allow access
  return <>{children}</>;
}

export default OnboardingGuard;
