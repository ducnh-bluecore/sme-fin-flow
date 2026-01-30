/**
 * OnboardingProgress - Visual progress indicator for onboarding steps
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ONBOARDING_STEPS, type OnboardingStep } from '@/lib/onboardingConfig';

interface OnboardingProgressProps {
  currentStepId: string;
  className?: string;
}

export function OnboardingProgress({ currentStepId, className }: OnboardingProgressProps) {
  const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === currentStepId);
  const platformSteps = ONBOARDING_STEPS.filter(s => s.layer === 'platform');
  const tenantSteps = ONBOARDING_STEPS.filter(s => s.layer === 'tenant');

  const renderStepGroup = (steps: OnboardingStep[], groupLabel: string) => {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
          {groupLabel}
        </span>
        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const stepIndex = ONBOARDING_STEPS.findIndex(s => s.id === step.id);
            const isCompleted = stepIndex < currentIndex;
            const isCurrent = step.id === currentStepId;
            const isUpcoming = stepIndex > currentIndex;

            return (
              <React.Fragment key={step.id}>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    'relative flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background',
                    isUpcoming && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{stepIndex + 1}</span>
                  )}
                </motion.div>
                
                {index < steps.length - 1 && (
                  <div 
                    className={cn(
                      'h-0.5 w-8 transition-colors',
                      stepIndex < currentIndex ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col sm:flex-row gap-6 sm:gap-12', className)}>
      {renderStepGroup(platformSteps, 'Tài khoản')}
      
      <div className="hidden sm:block w-px bg-border" />
      
      {renderStepGroup(tenantSteps, 'Công ty')}
    </div>
  );
}

export default OnboardingProgress;
