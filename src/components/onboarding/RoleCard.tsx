/**
 * RoleCard - Selectable card for role selection
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Calculator, Megaphone, Settings2, TrendingUp, FileSpreadsheet, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type RoleConfig } from '@/lib/onboardingConfig';

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  Crown,
  Calculator,
  Megaphone,
  Settings2,
  TrendingUp,
  FileSpreadsheet,
};

// Color mapping
const colorMap: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    border: 'border-amber-500/30',
    ring: 'ring-amber-500',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    border: 'border-emerald-500/30',
    ring: 'ring-emerald-500',
  },
  violet: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-500',
    border: 'border-violet-500/30',
    ring: 'ring-violet-500',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    border: 'border-blue-500/30',
    ring: 'ring-blue-500',
  },
  pink: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-500',
    border: 'border-pink-500/30',
    ring: 'ring-pink-500',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-500',
    border: 'border-cyan-500/30',
    ring: 'ring-cyan-500',
  },
};

interface RoleCardProps {
  role: RoleConfig;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

export function RoleCard({ role, isSelected, onClick, index }: RoleCardProps) {
  const Icon = iconMap[role.icon] || Crown;
  const colors = colorMap[role.color] || colorMap.blue;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        'relative p-5 rounded-xl border-2 text-left transition-all hover:shadow-md',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isSelected
          ? `${colors.border} ${colors.bg} ${colors.ring}`
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
      <h3 className="font-semibold text-lg mb-1">{role.label}</h3>
      <p className="text-sm text-muted-foreground">{role.description}</p>

      {/* Modules hint */}
      <div className="mt-3 flex flex-wrap gap-1">
        {role.primaryModules.map(module => (
          <span
            key={module}
            className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase"
          >
            {module}
          </span>
        ))}
      </div>
    </motion.button>
  );
}

export default RoleCard;
