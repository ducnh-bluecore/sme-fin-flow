import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Risk Heatmap - 3x3 Visual Grid
 * 
 * Rows: FDP | MDP | CDP (modules)
 * Cols: Revenue | Cash | Operations (dimensions)
 * 
 * Cell intensity = risk level
 * Shows cascade effects with animated arrows
 */

type RiskLevel = 0 | 1 | 2 | 3; // 0 = no risk, 1 = low, 2 = medium, 3 = high

interface RiskCell {
  level: RiskLevel;
  value?: number;
  label?: string;
}

interface RiskHeatmapData {
  fdp: { revenue: RiskCell; cash: RiskCell; operations: RiskCell };
  mdp: { revenue: RiskCell; cash: RiskCell; operations: RiskCell };
  cdp: { revenue: RiskCell; cash: RiskCell; operations: RiskCell };
}

interface CascadeEffect {
  from: { module: 'fdp' | 'mdp' | 'cdp'; dimension: 'revenue' | 'cash' | 'operations' };
  to: { module: 'fdp' | 'mdp' | 'cdp'; dimension: 'revenue' | 'cash' | 'operations' };
  description: string;
}

interface RiskHeatmapProps {
  data?: RiskHeatmapData;
  cascades?: CascadeEffect[];
  isLoading?: boolean;
}

const MODULES = ['FDP', 'MDP', 'CDP'] as const;
const DIMENSIONS = ['Revenue', 'Cash', 'Operations'] as const;

const riskColors: Record<RiskLevel, string> = {
  0: 'bg-muted/30 border-muted',
  1: 'bg-emerald-500/20 border-emerald-500/30',
  2: 'bg-amber-500/30 border-amber-500/40',
  3: 'bg-destructive/40 border-destructive/50',
};

const riskTextColors: Record<RiskLevel, string> = {
  0: 'text-muted-foreground',
  1: 'text-emerald-600',
  2: 'text-amber-600',
  3: 'text-destructive',
};

const riskLabels: Record<RiskLevel, string> = {
  0: 'OK',
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

// Demo data generator
function generateDemoData(): RiskHeatmapData {
  return {
    fdp: { 
      revenue: { level: 2, value: 85, label: '85% target' }, 
      cash: { level: 3, value: 12, label: '12 days runway' }, 
      operations: { level: 1, value: 95, label: '95% efficiency' } 
    },
    mdp: { 
      revenue: { level: 2, value: 0.8, label: 'ROAS 0.8' }, 
      cash: { level: 2, value: 45, label: '45% budget used' }, 
      operations: { level: 0, value: 100, label: 'On track' } 
    },
    cdp: { 
      revenue: { level: 1, value: 92, label: '92% retention' }, 
      cash: { level: 1, value: 1.2, label: 'LTV/CAC 1.2' }, 
      operations: { level: 3, value: 8, label: '8% churn spike' } 
    },
  };
}

function generateDemoCascades(): CascadeEffect[] {
  return [
    {
      from: { module: 'cdp', dimension: 'operations' },
      to: { module: 'mdp', dimension: 'cash' },
      description: 'CDP Churn tăng → MDP phải tăng budget acquire',
    },
    {
      from: { module: 'fdp', dimension: 'cash' },
      to: { module: 'mdp', dimension: 'revenue' },
      description: 'FDP Cash thấp → MDP phải giảm spend',
    },
  ];
}

export function RiskHeatmap({ data, cascades, isLoading }: RiskHeatmapProps) {
  const displayData = data ?? generateDemoData();
  const displayCascades = cascades ?? generateDemoCascades();

  // Count high-risk cells
  const highRiskCount = useMemo(() => {
    let count = 0;
    Object.values(displayData).forEach(module => {
      Object.values(module).forEach((cell: RiskCell) => {
        if (cell.level >= 3) count++;
      });
    });
    return count;
  }, [displayData]);

  const getCellData = (module: string, dimension: string): RiskCell => {
    const moduleKey = module.toLowerCase() as 'fdp' | 'mdp' | 'cdp';
    const dimKey = dimension.toLowerCase() as 'revenue' | 'cash' | 'operations';
    return displayData[moduleKey]?.[dimKey] ?? { level: 0 };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Risk Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 animate-pulse">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Risk Heatmap
          </CardTitle>
          {highRiskCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full"
            >
              {highRiskCount} high-risk zones
            </motion.span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          {/* Grid Header */}
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div /> {/* Empty corner */}
            {DIMENSIONS.map((dim) => (
              <div 
                key={dim} 
                className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                {dim}
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="grid grid-cols-4 gap-2">
            {MODULES.map((module, moduleIndex) => (
              <>
                {/* Module Label */}
                <div 
                  key={`label-${module}`}
                  className="flex items-center justify-center text-sm font-semibold"
                >
                  {module}
                </div>

                {/* Risk Cells */}
                {DIMENSIONS.map((dimension, dimIndex) => {
                  const cell = getCellData(module, dimension);
                  const delay = (moduleIndex * 3 + dimIndex) * 0.05;

                  return (
                    <Tooltip key={`${module}-${dimension}`}>
                      <TooltipTrigger asChild>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay, duration: 0.3 }}
                          whileHover={{ scale: 1.05 }}
                          className={cn(
                            'relative h-14 rounded-lg border-2 cursor-pointer',
                            'flex flex-col items-center justify-center gap-0.5',
                            'transition-all duration-200',
                            riskColors[cell.level],
                            cell.level >= 3 && 'ring-2 ring-destructive/30'
                          )}
                        >
                          {cell.level >= 3 && (
                            <motion.div
                              className="absolute inset-0 rounded-lg bg-destructive/10"
                              animate={{ opacity: [0.3, 0.6, 0.3] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                          )}
                          <span className={cn(
                            'relative z-10 text-xs font-bold',
                            riskTextColors[cell.level]
                          )}>
                            {riskLabels[cell.level]}
                          </span>
                          {cell.value !== undefined && (
                            <span className="relative z-10 text-[10px] text-muted-foreground font-medium">
                              {cell.value}
                              {typeof cell.value === 'number' && cell.value <= 10 && !cell.label?.includes('%') ? 'd' : ''}
                            </span>
                          )}
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <div className="space-y-1">
                          <p className="font-semibold">{module} - {dimension}</p>
                          {cell.label && (
                            <p className="text-xs text-muted-foreground">{cell.label}</p>
                          )}
                          <p className={cn('text-xs font-medium', riskTextColors[cell.level])}>
                            Risk Level: {riskLabels[cell.level]}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </>
            ))}
          </div>

          {/* Cascade Effects */}
          {displayCascades.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4 pt-4 border-t space-y-2"
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cascade Effects
              </p>
              {displayCascades.map((cascade, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2"
                >
                  <span className="font-semibold text-destructive">
                    {cascade.from.module.toUpperCase()}
                  </span>
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </motion.div>
                  <span className="font-semibold text-amber-600">
                    {cascade.to.module.toUpperCase()}
                  </span>
                  <span className="text-muted-foreground flex-1 truncate">
                    {cascade.description}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
