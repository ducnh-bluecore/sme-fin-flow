import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle,
  ChevronRight,
  Loader2,
  Zap
} from 'lucide-react';
import { useNotificationCenter } from '@/hooks/useNotificationCenter';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { MobileAlertItem } from '@/components/mobile/MobileAlertItem';

export default function MobileHomePage() {
  const navigate = useNavigate();
  const { instances, stats, isLoading, refetchInstances } = useNotificationCenter();

  const activeAlerts = useMemo(() => 
    instances.filter(i => i.status === 'active').slice(0, 10),
    [instances]
  );

  const handleRefresh = async () => {
    await refetchInstances();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  const hasUrgentAlerts = stats.bySeverity.critical > 0 || stats.bySeverity.warning > 0;

  return (
    <>
      <Helmet>
        <title>Cảnh báo | Mobile App</title>
      </Helmet>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 space-y-5">
          {/* Status Banner */}
          {hasUrgentAlerts ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-destructive">
                    {stats.bySeverity.critical + (stats.bySeverity.warning || 0)} cảnh báo
                  </p>
                  <p className="text-sm text-muted-foreground">Cần xử lý ngay</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/mobile/alerts')}
                  className="h-10 w-10 rounded-full bg-destructive flex items-center justify-center"
                >
                  <ChevronRight className="h-5 w-5 text-destructive-foreground" />
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center"
            >
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-7 w-7 text-primary" />
              </div>
              <p className="text-lg font-semibold text-foreground">Tất cả ổn!</p>
              <p className="text-sm text-muted-foreground mt-1">Không có cảnh báo khẩn cấp</p>
            </motion.div>
          )}

          {/* Summary Row */}
          <div className="grid grid-cols-3 gap-3">
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/mobile/alerts')}
              className="bg-card border border-border rounded-xl p-3 text-center cursor-pointer"
            >
              <p className="text-2xl font-bold text-destructive">{stats.bySeverity.critical || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Cao</p>
            </motion.div>
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/mobile/alerts')}
              className="bg-card border border-border rounded-xl p-3 text-center cursor-pointer"
            >
              <p className="text-2xl font-bold text-warning">{stats.bySeverity.warning || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Trung bình</p>
            </motion.div>
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/mobile/alerts')}
              className="bg-card border border-border rounded-xl p-3 text-center cursor-pointer"
            >
              <p className="text-2xl font-bold text-primary">{stats.resolved || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Đã xử lý</p>
            </motion.div>
          </div>

          {/* Active Alerts List */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Cảnh báo mới nhất</h2>
              {activeAlerts.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/mobile/alerts')}
                  className="text-xs text-primary flex items-center gap-1"
                >
                  Xem tất cả <ChevronRight className="h-3 w-3" />
                </motion.button>
              )}
            </div>

            {activeAlerts.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">Không có cảnh báo mới</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <MobileAlertItem
                    key={alert.id}
                    id={alert.id}
                    title={alert.title}
                    message={alert.message || ''}
                    severity={(alert.severity as 'critical' | 'warning' | 'info') || 'info'}
                    category={alert.category}
                    createdAt={alert.created_at}
                    isRead={alert.status !== 'active'}
                    onClick={() => navigate('/mobile/alerts')}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </PullToRefresh>
    </>
  );
}
