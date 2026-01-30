/**
 * OnboardingLayout - Shared layout wrapper for all onboarding pages
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingProgress } from './OnboardingProgress';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { cn } from '@/lib/utils';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  stepId: string;
  title?: string;
  subtitle?: string;
  showProgress?: boolean;
  showBack?: boolean;
  showSkip?: boolean;
  skipLabel?: string;
  className?: string;
}

export function OnboardingLayout({
  children,
  stepId,
  title,
  subtitle,
  showProgress = true,
  showBack = true,
  showSkip = true,
  skipLabel = 'Bỏ qua',
  className,
}: OnboardingLayoutProps) {
  const { goToPreviousStep, skipOnboarding, steps, getProgress } = useOnboardingFlow();
  
  const currentStep = steps.find(s => s.id === stepId);
  const isFirstStep = stepId === 'welcome';
  const progress = getProgress(stepId);

  const handleSkip = () => {
    if (currentStep?.layer === 'platform') {
      skipOnboarding('platform');
    } else {
      skipOnboarding('tenant');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Back button */}
          <div className="w-24">
            {showBack && !isFirstStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToPreviousStep(stepId)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
            )}
          </div>

          {/* Progress */}
          {showProgress && (
            <div className="hidden md:block">
              <OnboardingProgress currentStepId={stepId} />
            </div>
          )}

          {/* Skip button */}
          <div className="w-24 flex justify-end">
            {showSkip && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                {skipLabel}
                <X className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile progress bar */}
        <div className="md:hidden h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-8 md:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={cn('flex flex-col', className)}
          >
            {/* Step header */}
            {(title || subtitle) && (
              <div className="text-center mb-8 md:mb-12">
                {title && (
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl md:text-3xl font-bold tracking-tight"
                  >
                    {title}
                  </motion.h1>
                )}
                {subtitle && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-2 text-muted-foreground text-lg"
                  >
                    {subtitle}
                  </motion.p>
                )}
              </div>
            )}

            {/* Step content */}
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-muted-foreground">
        <p>© 2024 Bluecore. Nền tảng dữ liệu cho doanh nghiệp Việt.</p>
      </footer>
    </div>
  );
}

export default OnboardingLayout;
