/**
 * CrossModuleDataCard
 * 
 * Card component for displaying cross-module data with transparency.
 * Shows data origin, confidence level, and upgrade prompts.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CrossModuleBadge } from './CrossModuleBadge';
import { ConfidenceLevel, SourceModule } from '@/types/cross-module';

interface CrossModuleDataCardProps {
  title: string;
  value: string | number;
  unit?: string;
  confidenceLevel: ConfidenceLevel;
  dataSource?: string;
  fromModule?: SourceModule;
  upgradePrompt?: string;
  onUpgrade?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function CrossModuleDataCard({
  title,
  value,
  unit,
  confidenceLevel,
  dataSource,
  fromModule,
  upgradePrompt,
  onUpgrade,
  children,
  className,
}: CrossModuleDataCardProps) {
  const showUpgradePrompt = confidenceLevel === 'ESTIMATED' && upgradePrompt;

  return (
    <Card className={cn('relative', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <CrossModuleBadge
            confidenceLevel={confidenceLevel}
            dataSource={dataSource}
            fromModule={fromModule}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>

        {children}

        {showUpgradePrompt && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                {upgradePrompt}
              </p>
              {onUpgrade && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-amber-700 dark:text-amber-400"
                  onClick={onUpgrade}
                >
                  Nâng cấp ngay
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * CrossModuleMetric
 * 
 * Inline metric display with confidence badge.
 */
interface CrossModuleMetricProps {
  label: string;
  value: string | number;
  unit?: string;
  confidenceLevel: ConfidenceLevel;
  fromModule?: SourceModule;
  className?: string;
}

export function CrossModuleMetric({
  label,
  value,
  unit,
  confidenceLevel,
  fromModule,
  className,
}: CrossModuleMetricProps) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium tabular-nums">
          {value}
          {unit && <span className="text-muted-foreground ml-0.5">{unit}</span>}
        </span>
        <CrossModuleBadge
          confidenceLevel={confidenceLevel}
          fromModule={fromModule}
          size="sm"
        />
      </div>
    </div>
  );
}
