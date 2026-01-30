/**
 * ModuleAssessmentGuard - Guard component for module data assessment
 * 
 * Checks if user has completed data assessment for a module.
 * If not, shows the assessment wizard before allowing access.
 */

import React from 'react';
import { useDataAssessment } from '@/hooks/useDataAssessment';
import { DataAssessmentWizard } from '@/components/assessment';
import { type ModuleKey } from '@/lib/dataRequirementsMap';
import { Loader2 } from 'lucide-react';

interface ModuleAssessmentGuardProps {
  moduleKey: ModuleKey;
  children: React.ReactNode;
  /**
   * If true, the guard will not block access even if assessment is incomplete.
   * Useful for showing a banner instead of blocking.
   */
  softMode?: boolean;
  /**
   * Callback when assessment is completed
   */
  onAssessmentComplete?: () => void;
}

export function ModuleAssessmentGuard({
  moduleKey,
  children,
  softMode = false,
  onAssessmentComplete,
}: ModuleAssessmentGuardProps) {
  const {
    assessment,
    isLoading,
    needsAssessment,
    refetch,
  } = useDataAssessment(moduleKey);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show wizard if assessment not completed (and not in soft mode)
  if (needsAssessment && !softMode) {
    return (
      <DataAssessmentWizard
        moduleKey={moduleKey}
        onComplete={() => {
          refetch();
          onAssessmentComplete?.();
        }}
        onSkip={() => {
          refetch();
        }}
      />
    );
  }

  // Render children
  return <>{children}</>;
}

/**
 * Hook to check if assessment is needed without blocking
 */
export function useModuleAssessmentStatus(moduleKey: ModuleKey) {
  const { needsAssessment, isCompleted, isSkipped, assessment, isLoading } = useDataAssessment(moduleKey);

  return {
    needsAssessment,
    isCompleted,
    isSkipped,
    importPlan: assessment?.import_plan,
    surveyResponses: assessment?.survey_responses,
    isLoading,
  };
}
