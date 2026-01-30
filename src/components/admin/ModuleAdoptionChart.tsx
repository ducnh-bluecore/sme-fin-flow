import { Progress } from '@/components/ui/progress';
import { MODULE_LABELS } from '@/hooks/useTenantHealth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ModuleAdoptionChartProps {
  moduleUsage: Record<string, number>;
  totalEvents?: number;
  lastActivityByModule?: Record<string, string>;
}

// Core modules to always show (even if 0 usage)
const CORE_MODULES = ['fdp', 'mdp', 'cdp', 'control_tower'];

// Module colors
const MODULE_COLORS: Record<string, string> = {
  fdp: 'bg-blue-500',
  mdp: 'bg-purple-500',
  cdp: 'bg-emerald-500',
  control_tower: 'bg-orange-500',
  settings: 'bg-slate-500',
  onboarding: 'bg-amber-500',
  other: 'bg-gray-500',
};

export function ModuleAdoptionChart({
  moduleUsage,
  totalEvents = 0,
  lastActivityByModule,
}: ModuleAdoptionChartProps) {
  // Calculate max usage for relative scaling
  const maxUsage = Math.max(...Object.values(moduleUsage), 1);

  // Merge core modules with actual usage
  const allModules = [...new Set([...CORE_MODULES, ...Object.keys(moduleUsage)])];

  const getUsagePercent = (module: string) => {
    const usage = moduleUsage[module] || 0;
    return Math.round((usage / maxUsage) * 100);
  };

  const formatLastActivity = (module: string) => {
    const lastActivity = lastActivityByModule?.[module];
    if (!lastActivity) return 'Chưa sử dụng';
    
    try {
      return formatDistanceToNow(new Date(lastActivity), { addSuffix: true, locale: vi });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-4">
      {allModules.map((module) => {
        const usage = moduleUsage[module] || 0;
        const percent = getUsagePercent(module);
        const isActive = usage > 0;

        return (
          <div key={module} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className={cn('font-medium', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                {MODULE_LABELS[module] || module}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {formatLastActivity(module)}
                </span>
                <span className={cn('text-sm font-medium tabular-nums', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                  {usage} events
                </span>
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={percent} 
                className={cn('h-2', !isActive && 'opacity-50')}
              />
              {/* Custom color overlay */}
              <div 
                className={cn(
                  'absolute left-0 top-0 h-2 rounded-full transition-all duration-500',
                  MODULE_COLORS[module] || 'bg-primary'
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}

      {/* Summary */}
      {totalEvents > 0 && (
        <div className="pt-2 border-t text-xs text-muted-foreground">
          Tổng cộng: <span className="font-medium text-foreground">{totalEvents.toLocaleString()}</span> sự kiện trong 30 ngày
        </div>
      )}
    </div>
  );
}
