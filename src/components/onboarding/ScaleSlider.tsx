/**
 * ScaleSlider - Visual scale selector for company size
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Rocket, Building, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMPANY_SCALES, type CompanyScale } from '@/lib/onboardingConfig';

const iconMap = {
  startup: Rocket,
  sme: Building,
  enterprise: Building2,
};

const colorMap = {
  startup: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/30' },
  sme: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
  enterprise: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
};

interface ScaleSliderProps {
  value: CompanyScale | null;
  onChange: (scale: CompanyScale) => void;
}

export function ScaleSlider({ value, onChange }: ScaleSliderProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {COMPANY_SCALES.map((scale, index) => {
        const Icon = iconMap[scale.id as keyof typeof iconMap];
        const colors = colorMap[scale.id as keyof typeof colorMap];
        const isSelected = value === scale.id;

        return (
          <motion.button
            key={scale.id}
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onChange(scale.id as CompanyScale)}
            className={cn(
              'relative p-6 rounded-xl border-2 text-left transition-all hover:shadow-md',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              isSelected
                ? `${colors.border} ${colors.bg}`
                : 'border-border hover:border-muted-foreground/30'
            )}
          >
            {/* Selected indicator */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  'absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center',
                  colors.bg, colors.text
                )}
              >
                <Check className="h-4 w-4" />
              </motion.div>
            )}

            {/* Icon */}
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center mb-4',
              colors.bg, colors.text
            )}>
              <Icon className="h-7 w-7" />
            </div>

            {/* Content */}
            <h3 className="font-semibold text-lg mb-1">{scale.label}</h3>
            <p className="text-sm text-muted-foreground mb-3">{scale.description}</p>

            {/* Stats */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Doanh thu:</span>
                <span className="font-medium">{scale.revenueRange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nhân sự:</span>
                <span className="font-medium">{scale.employeeRange}</span>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

export default ScaleSlider;
