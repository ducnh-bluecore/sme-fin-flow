import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export type ModuleStatus = 'healthy' | 'warning' | 'error' | 'syncing';

export interface ModuleHealth {
  module: 'FDP' | 'MDP' | 'CDP';
  status: ModuleStatus;
  lastSyncAt: Date | null;
  activeAlerts: number;
  description: string;
}

interface ModuleHealthGridProps {
  modules: ModuleHealth[];
  onModuleClick?: (module: string) => void;
  className?: string;
}

const moduleConfig = {
  FDP: {
    icon: DollarSign,
    label: 'Financial Data Platform',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  MDP: {
    icon: TrendingUp,
    label: 'Marketing Data Platform',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  CDP: {
    icon: Users,
    label: 'Customer Data Platform',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
};

const statusConfig = {
  healthy: {
    icon: CheckCircle2,
    label: 'Hoạt động tốt',
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Cần chú ý',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
  },
  error: {
    icon: XCircle,
    label: 'Có vấn đề',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
  },
  syncing: {
    icon: RefreshCw,
    label: 'Đang đồng bộ',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/10',
    borderColor: 'border-muted/30',
  },
};

function ModuleCard({ 
  module, 
  onClick 
}: { 
  module: ModuleHealth; 
  onClick?: () => void;
}) {
  const moduleConf = moduleConfig[module.module];
  const statusConf = statusConfig[module.status];
  const ModuleIcon = moduleConf.icon;
  const StatusIcon = statusConf.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className={cn(
        'relative overflow-hidden border-2 transition-all',
        statusConf.borderColor,
        'hover:shadow-lg'
      )}>
        {/* Status indicator bar */}
        <div className={cn('absolute top-0 left-0 right-0 h-1', statusConf.bgColor)}>
          <motion.div
            className={cn('h-full', statusConf.color.replace('text-', 'bg-'))}
            animate={module.status === 'syncing' ? { x: ['-100%', '100%'] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ width: module.status === 'syncing' ? '30%' : '100%' }}
          />
        </div>

        <CardContent className="pt-6 pb-4">
          <div className="flex items-start justify-between mb-3">
            <div className={cn('p-2 rounded-lg', moduleConf.bgColor)}>
              <ModuleIcon className={cn('h-6 w-6', moduleConf.color)} />
            </div>
            <Badge 
              variant="outline" 
              className={cn('gap-1', statusConf.color, statusConf.bgColor)}
            >
              <StatusIcon className={cn(
                'h-3 w-3',
                module.status === 'syncing' && 'animate-spin'
              )} />
              {statusConf.label}
            </Badge>
          </div>

          <h3 className="font-bold text-lg">{module.module}</h3>
          <p className="text-xs text-muted-foreground mb-2">{moduleConf.label}</p>
          <p className="text-sm text-muted-foreground line-clamp-1">{module.description}</p>

          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <span className="text-xs text-muted-foreground">
              {module.lastSyncAt 
                ? `Cập nhật ${formatDistanceToNow(module.lastSyncAt, { addSuffix: true, locale: vi })}`
                : 'Chưa đồng bộ'
              }
            </span>
            {module.activeAlerts > 0 && (
              <Badge variant="destructive" className="text-xs">
                {module.activeAlerts} cảnh báo
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function ModuleHealthGrid({ modules, onModuleClick, className }: ModuleHealthGridProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
      {modules.map((module, index) => (
        <motion.div
          key={module.module}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <ModuleCard 
            module={module} 
            onClick={() => onModuleClick?.(module.module)}
          />
        </motion.div>
      ))}
    </div>
  );
}
