/**
 * IndustryCard - Selectable card for industry selection
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Store, ShoppingBag, Building2, UtensilsCrossed, Briefcase, Factory, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type IndustryConfig } from '@/lib/onboardingConfig';

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  Store,
  ShoppingBag,
  Building2,
  UtensilsCrossed,
  Briefcase,
  Factory,
};

// Color mapping
const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/30' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
};

interface IndustryCardProps {
  industry: IndustryConfig;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

export function IndustryCard({ industry, isSelected, onClick, index }: IndustryCardProps) {
  const Icon = iconMap[industry.icon] || Store;
  const colors = colorMap[industry.color] || colorMap.blue;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        'relative p-5 rounded-xl border-2 text-left transition-all hover:shadow-md',
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
        'w-12 h-12 rounded-lg flex items-center justify-center mb-3',
        colors.bg, colors.text
      )}>
        <Icon className="h-6 w-6" />
      </div>

      {/* Content */}
      <h3 className="font-semibold text-lg mb-1">{industry.label}</h3>
      <p className="text-sm text-muted-foreground">{industry.description}</p>
    </motion.button>
  );
}

export default IndustryCard;
