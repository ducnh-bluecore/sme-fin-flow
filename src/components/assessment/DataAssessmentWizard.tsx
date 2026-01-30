/**
 * DataAssessmentWizard - Multi-step wizard for data assessment
 * 
 * Guides users through:
 * 1. Data Sources selection
 * 2. Data Types selection
 * 3. Data Format selection
 * 4. Import Plan review
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, X, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { DataSourceStep } from './DataSourceStep';
import { DataTypeStep } from './DataTypeStep';
import { DataFormatStep } from './DataFormatStep';
import { ImportPlanStep } from './ImportPlanStep';
import { useDataAssessment, type SurveyResponses } from '@/hooks/useDataAssessment';
import { useSmartDataMatcher } from '@/hooks/useSmartDataMatcher';
import { moduleDisplayInfo, type ModuleKey } from '@/lib/dataRequirementsMap';

interface DataAssessmentWizardProps {
  moduleKey: ModuleKey;
  onComplete?: () => void;
  onSkip?: () => void;
}

const STEPS = ['sources', 'types', 'format', 'plan'] as const;
type Step = typeof STEPS[number];

export function DataAssessmentWizard({
  moduleKey,
  onComplete,
  onSkip,
}: DataAssessmentWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('sources');
  const [surveyData, setSurveyData] = useState<SurveyResponses>({
    data_sources: [],
    data_types: [],
    data_format: '',
  });

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
      case 'types':
        return surveyData.data_types.length > 0;
      case 'format':
        return surveyData.data_format !== '';
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
                  Bước {stepIndex + 1} / {STEPS.length}
                </p>
              </div>
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
            <Progress value={progress} className="h-1" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
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
                  onSourcesChange={(sources) => setSurveyData(prev => ({ ...prev, data_sources: sources }))}
                />
              )}

              {currentStep === 'types' && (
                <DataTypeStep
                  selectedTypes={surveyData.data_types}
                  onTypesChange={(types) => setSurveyData(prev => ({ ...prev, data_types: types }))}
                />
              )}

              {currentStep === 'format' && (
                <DataFormatStep
                  selectedFormat={surveyData.data_format}
                  onFormatChange={(format) => setSurveyData(prev => ({ ...prev, data_format: format }))}
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
    </div>
  );
}
