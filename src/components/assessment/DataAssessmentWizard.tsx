/**
 * DataAssessmentWizard - Multi-step wizard for data assessment
 * 
 * Simplified 3-step flow with smart data inference:
 * 1. Data Sources selection (with sub-sources)
 * 2. Data Confirmation (auto-inferred + additional)
 * 3. Import Plan review
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, X, Loader2, Check, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { DataSourceStep } from './DataSourceStep';
import { DataConfirmStep } from './DataConfirmStep';
import { ImportPlanStep } from './ImportPlanStep';
import { DataAssessmentIntro } from './DataAssessmentIntro';
import { AssessmentSpotlightTour, useAssessmentTour } from './AssessmentSpotlightTour';
import { useDataAssessment, type SurveyResponses } from '@/hooks/useDataAssessment';
import { useSmartDataMatcher } from '@/hooks/useSmartDataMatcher';
import { moduleDisplayInfo, type ModuleKey } from '@/lib/dataRequirementsMap';

interface DataAssessmentWizardProps {
  moduleKey: ModuleKey;
  onComplete?: () => void;
  onSkip?: () => void;
}

const STEPS = ['sources', 'confirm', 'plan'] as const;
type Step = typeof STEPS[number];

const STEP_LABELS: Record<Step, string> = {
  sources: 'Nguồn dữ liệu',
  confirm: 'Xác nhận',
  plan: 'Kế hoạch',
};

export function DataAssessmentWizard({
  moduleKey,
  onComplete,
  onSkip,
}: DataAssessmentWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('sources');
  const [surveyData, setSurveyData] = useState<SurveyResponses>({
    data_sources: [],
    sub_sources: [],
    additional_data_types: [],
  });
  const [showIntro, setShowIntro] = useState(true);
  
  // Tour management
  const { showTour, closeTour, completeTour, startTour } = useAssessmentTour();

  const { upsertAssessment, completeAssessment, skipAssessment } = useDataAssessment(moduleKey);
  const { importPlan, summary, recommendations } = useSmartDataMatcher(
    moduleKey,
    currentStep === 'plan' ? surveyData : null
  );

  const moduleInfo = moduleDisplayInfo[moduleKey];
  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 'sources':
        return surveyData.data_sources.length > 0;
      case 'confirm':
        // Always can proceed - inferred data is automatic
        return true;
      case 'plan':
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      // Save progress
      await upsertAssessment.mutateAsync({
        surveyResponses: surveyData,
        status: 'in_progress',
      });
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handleComplete = async () => {
    await completeAssessment.mutateAsync(importPlan);
    onComplete?.();
  };

  const handleSkip = async () => {
    await skipAssessment.mutateAsync();
    onSkip?.();
  };

  const isLoading = upsertAssessment.isPending || completeAssessment.isPending || skipAssessment.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto">
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
          <div className="container max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Khảo sát dữ liệu cho {moduleInfo.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Bước {stepIndex + 1}: {STEP_LABELS[currentStep]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startTour}
                  className="text-muted-foreground"
                >
                  <HelpCircle className="h-4 w-4 mr-1" />
                  Hướng dẫn
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Bỏ qua
                </Button>
              </div>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
          {/* Intro Section (only on sources step) */}
          {currentStep === 'sources' && showIntro && (
            <DataAssessmentIntro
              moduleKey={moduleKey}
              onDismiss={() => setShowIntro(false)}
            />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep === 'sources' && (
                <DataSourceStep
                  selectedSources={surveyData.data_sources}
                  selectedSubSources={surveyData.sub_sources}
                  onSourcesChange={(sources) => 
                    setSurveyData(prev => ({ ...prev, data_sources: sources }))
                  }
                  onSubSourcesChange={(subSources) => 
                    setSurveyData(prev => ({ ...prev, sub_sources: subSources }))
                  }
                />
              )}

              {currentStep === 'confirm' && (
                <DataConfirmStep
                  selectedSources={surveyData.data_sources}
                  selectedSubSources={surveyData.sub_sources}
                  additionalDataTypes={surveyData.additional_data_types}
                  onAdditionalTypesChange={(types) => 
                    setSurveyData(prev => ({ ...prev, additional_data_types: types }))
                  }
                />
              )}

              {currentStep === 'plan' && (
                <ImportPlanStep
                  moduleKey={moduleKey}
                  importPlan={importPlan}
                  summary={summary}
                  recommendations={recommendations}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="sticky bottom-0 bg-background/80 backdrop-blur border-t">
          <div className="container max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={stepIndex === 0 || isLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>

              <div className="flex items-center gap-2">
                {/* Step indicators */}
                {STEPS.map((step, i) => (
                  <div
                    key={step}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      i === stepIndex
                        ? "bg-primary"
                        : i < stepIndex
                          ? "bg-primary/50"
                          : "bg-muted"
                    )}
                  />
                ))}
              </div>

              {currentStep === 'plan' ? (
                <Button
                  onClick={handleComplete}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Hoàn thành
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Tiếp tục
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </footer>
      </div>

      {/* Spotlight Tour */}
      <AssessmentSpotlightTour
        isOpen={showTour}
        onClose={closeTour}
        onComplete={completeTour}
      />
    </div>
  );
}
