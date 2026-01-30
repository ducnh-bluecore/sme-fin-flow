/**
 * AssessmentSpotlightTour - Guided tour for first-time users
 * 
 * Highlights key elements and explains the assessment flow
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TourStep {
  id: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlight?: string; // CSS selector to highlight
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Chào mừng đến Khảo sát Dữ liệu 👋',
    description: 'Wizard này giúp xác định dữ liệu bạn có và tạo kế hoạch import tối ưu cho FDP (Financial Data Platform).',
    position: 'center',
  },
  {
    id: 'sources',
    title: 'Bước 1: Chọn Nguồn Dữ liệu',
    description: 'Chọn các nền tảng mà doanh nghiệp đang sử dụng. Hệ thống sẽ tự động hiểu bạn có những loại dữ liệu nào.',
    position: 'center',
  },
  {
    id: 'd2c-mapping',
    title: 'Hiểu về D2C/Retail Mapping',
    description: 'Trong mô hình D2C: Đơn hàng = Invoice (AR), Phí sàn = Bill (AP), Tiền đối soát = Cash thực. Bạn không cần phần mềm kế toán!',
    position: 'center',
  },
  {
    id: 'confirm',
    title: 'Bước 2: Xác nhận Dữ liệu',
    description: 'Xem dữ liệu được suy luận tự động và bổ sung thêm nếu cần (từ Excel hoặc nguồn thủ công).',
    position: 'center',
  },
  {
    id: 'plan',
    title: 'Bước 3: Kế hoạch Import',
    description: 'Nhận lộ trình cá nhân hóa: Kết nối tự động, Import Excel, hoặc Để sau. Đơn giản và rõ ràng!',
    position: 'center',
  },
];

interface AssessmentSpotlightTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const TOUR_STORAGE_KEY = 'bluecore_assessment_tour_completed';

export function AssessmentSpotlightTour({
  isOpen,
  onClose,
  onComplete,
}: AssessmentSpotlightTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    onClose();
  };

  const step = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      >
        {/* Tour Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', duration: 0.4 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-md w-[90vw]",
            step.position === 'center' && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          )}
        >
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Bỏ qua hướng dẫn"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4 mx-auto">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {step.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === currentStep
                    ? "bg-primary w-4"
                    : i < currentStep
                      ? "bg-primary/50"
                      : "bg-muted-foreground/30"
                )}
                aria-label={`Đến bước ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Bỏ qua
            </Button>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Quay lại
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleNext}
              >
                {isLastStep ? 'Bắt đầu' : 'Tiếp tục'}
                {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>

          {/* Step indicator */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            Bước {currentStep + 1} / {TOUR_STEPS.length}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook to manage tour state
 */
export function useAssessmentTour() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Check if tour was completed before
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = () => setShowTour(true);
  const closeTour = () => setShowTour(false);
  const completeTour = () => setShowTour(false);

  const resetTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setShowTour(true);
  };

  return {
    showTour,
    startTour,
    closeTour,
    completeTour,
    resetTour,
  };
}
