/**
 * useOnboardingFlow - Navigation and flow control for onboarding wizard
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ONBOARDING_STEPS, 
  getNextStep, 
  getPreviousStep,
  getStepProgress,
  type OnboardingStep,
} from '@/lib/onboardingConfig';
import { 
  useUpdateProfileOnboarding, 
  useUpdateTenantOnboarding,
  useOnboardingStatus,
} from './useOnboardingStatus';

export function useOnboardingFlow() {
  const navigate = useNavigate();
  const { data: onboardingData } = useOnboardingStatus();
  const updateProfile = useUpdateProfileOnboarding();
  const updateTenant = useUpdateTenantOnboarding();

  // Get current step from pathname
  const getCurrentStep = useCallback((pathname: string): OnboardingStep | null => {
    return ONBOARDING_STEPS.find(step => step.path === pathname) || null;
  }, []);

  // Navigate to next step
  const goToNextStep = useCallback(async (currentStepId: string) => {
    const nextStep = getNextStep(currentStepId);
    
    if (nextStep) {
      // Check if transitioning from platform to tenant layer
      if (nextStep.layer === 'tenant' && currentStepId === 'preview') {
        // Mark platform onboarding as done
        await updateProfile.mutateAsync({ onboarding_status: 'platform_done' });
      }
      
      navigate(nextStep.path);
    } else {
      // Onboarding complete - go to portal
      await updateProfile.mutateAsync({ 
        onboarding_status: 'completed',
        onboarding_completed_at: new Date().toISOString(),
      });
      
      if (onboardingData?.tenant?.id) {
        await updateTenant.mutateAsync({
          tenantId: onboardingData.tenant.id,
          data: { onboarding_status: 'completed' },
        });
      }
      
      navigate('/portal', { replace: true });
    }
  }, [navigate, updateProfile, updateTenant, onboardingData]);

  // Navigate to previous step
  const goToPreviousStep = useCallback((currentStepId: string) => {
    const previousStep = getPreviousStep(currentStepId);
    if (previousStep) {
      navigate(previousStep.path);
    }
  }, [navigate]);

  // Skip current layer and proceed
  const skipOnboarding = useCallback(async (layer: 'platform' | 'tenant') => {
    if (layer === 'platform') {
      await updateProfile.mutateAsync({ onboarding_status: 'skipped' });
    } else if (layer === 'tenant' && onboardingData?.tenant?.id) {
      await updateTenant.mutateAsync({
        tenantId: onboardingData.tenant.id,
        data: { onboarding_status: 'skipped' },
      });
    }
    
    navigate('/portal', { replace: true });
  }, [navigate, updateProfile, updateTenant, onboardingData]);

  // Get progress for current step
  const getProgress = useCallback((stepId: string): number => {
    return getStepProgress(stepId);
  }, []);

  return {
    getCurrentStep,
    goToNextStep,
    goToPreviousStep,
    skipOnboarding,
    getProgress,
    steps: ONBOARDING_STEPS,
    isUpdating: updateProfile.isPending || updateTenant.isPending,
  };
}
