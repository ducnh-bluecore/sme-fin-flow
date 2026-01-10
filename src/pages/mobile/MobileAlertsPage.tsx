import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  XCircle, 
  Bell,
  CheckCircle,
  Clock,
  ChevronRight,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotificationCenter, AlertInstance, categoryLabels } from '@/hooks/useNotificationCenter';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { cn } from '@/lib/utils';

const severityConfig = {
  critical: { 
    icon: XCircle, 
    color: 'text-red-400', 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/30',
    label: 'Nghiêm trọng'
  },
  warning: { 
    icon: AlertTriangle, 
    color: 'text-amber-400', 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/30',
    label: 'Cảnh báo'
  },
  info: { 
    icon: Bell, 
    color: 'text-blue-400', 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/30',
    label: 'Thông tin'
  },
};

interface AlertItemProps {
  alert: AlertInstance;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}

function AlertItem({ alert, onAcknowledge, onResolve }: AlertItemProps) {
  const [swiped, setSwiped] = useState<'left' | 'right' | null>(null);
  const severity = alert.severity as keyof typeof severityConfig;
  const config = severityConfig[severity] || severityConfig.info;
  const Icon = config.icon;

  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: vi });
    } catch {
      return '';
    }
  }, [alert.created_at]);

  const handleDragEnd = (event: any, info: any) => {
    const offset = info.offset.x;
    if (offset > 100) {
      setSwiped('right');
      onAcknowledge(alert.id);
    } else if (offset < -100) {
      setSwiped('left');
      onResolve(alert.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: swiped === 'left' ? -300 : swiped === 'right' ? 300 : 0 }}
      className="relative overflow-hidden rounded-xl"
    >
      {/* Swipe Background */}
      <div className="absolute inset-0 flex items-center">
        <div className="flex-1 h-full bg-blue-500/20 flex items-center pl-4">
          <Check className="h-5 w-5 text-blue-400" />
          <span className="ml-2 text-xs text-blue-400 font-medium">Đã nhận</span>
        </div>
        <div className="flex-1 h-full bg-emerald-500/20 flex items-center justify-end pr-4">
          <span className="mr-2 text-xs text-emerald-400 font-medium">Đã xử lý</span>
          <CheckCircle className="h-5 w-5 text-emerald-400" />
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        drag={alert.status === 'active' ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className={cn(
          'relative p-4 border',
          config.bg,
          config.border,
          'bg-[#0F1117]'
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-xl', config.bg)}>
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge className={cn('text-[10px]', config.bg, config.color, 'border', config.border)}>
                    {config.label}
                  </Badge>
                  <Badge className="text-[10px] bg-slate-700/50 text-slate-400 border-slate-600/30">
                    {categoryLabels[alert.category as keyof typeof categoryLabels] || alert.category}
                  </Badge>
                </div>
                <h3 className="text-sm font-medium text-slate-100">{alert.title}</h3>
                {alert.message && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{alert.message}</p>
                )}
              </div>
              {alert.status === 'active' && (
                <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </div>
              {alert.status === 'active' && (
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onAcknowledge(alert.id)}
                    className="px-2.5 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-[10px] font-medium"
                  >
                    Đã nhận
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onResolve(alert.id)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-medium"
                  >
                    Xử lý
                  </motion.button>
                </div>
              )}
              {alert.status === 'acknowledged' && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onResolve(alert.id)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-medium"
                >
                  Đánh dấu đã xử lý
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function MobileAlertsPage() {
  const { 
    instances, 
    stats, 
    isLoading, 
    acknowledgeAlert,
    resolveAlert,
    refetchInstances 
  } = useNotificationCenter();

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert.mutateAsync(id);
  };

  const handleResolve = async (id: string) => {
    await resolveAlert.mutateAsync({ id });
  };

  const handleRefresh = async () => {
    await refetchInstances();
  };

  const activeAlerts = useMemo(() => 
    instances.filter(i => i.status === 'active'),
    [instances]
  );

  const acknowledgedAlerts = useMemo(() =>
    instances.filter(i => i.status === 'acknowledged'),
    [instances]
  );

  const resolvedAlerts = useMemo(() =>
    instances.filter(i => i.status === 'resolved'),
    [instances]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Cảnh báo | Mobile App</title>
      </Helmet>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 space-y-4">
          {/* Header Stats */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 whitespace-nowrap">
              {stats.bySeverity.critical || 0} nghiêm trọng
            </Badge>
            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
              {stats.bySeverity.warning || 0} cảnh báo
            </Badge>
            <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 whitespace-nowrap">
              {stats.active} chưa xử lý
            </Badge>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="w-full bg-slate-900/50 border border-slate-800/50 p-1">
              <TabsTrigger value="active" className="flex-1 text-xs data-[state=active]:bg-slate-800">
                Đang xảy ra ({activeAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="acknowledged" className="flex-1 text-xs data-[state=active]:bg-slate-800">
                Đã nhận ({acknowledgedAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex-1 text-xs data-[state=active]:bg-slate-800">
                Đã xử lý ({resolvedAlerts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4 space-y-3">
              <AnimatePresence>
                {activeAlerts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Không có cảnh báo đang xảy ra</p>
                  </motion.div>
                ) : (
                  activeAlerts.map((alert) => (
                    <AlertItem
                      key={alert.id}
                      alert={alert}
                      onAcknowledge={handleAcknowledge}
                      onResolve={handleResolve}
                    />
                  ))
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="acknowledged" className="mt-4 space-y-3">
              <AnimatePresence>
                {acknowledgedAlerts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <Bell className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Không có cảnh báo đã nhận</p>
                  </motion.div>
                ) : (
                  acknowledgedAlerts.map((alert) => (
                    <AlertItem
                      key={alert.id}
                      alert={alert}
                      onAcknowledge={handleAcknowledge}
                      onResolve={handleResolve}
                    />
                  ))
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="resolved" className="mt-4 space-y-3">
              <AnimatePresence>
                {resolvedAlerts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <Bell className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Không có cảnh báo đã xử lý</p>
                  </motion.div>
                ) : (
                  resolvedAlerts.map((alert) => (
                    <AlertItem
                      key={alert.id}
                      alert={alert}
                      onAcknowledge={handleAcknowledge}
                      onResolve={handleResolve}
                    />
                  ))
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </PullToRefresh>
    </>
  );
}
