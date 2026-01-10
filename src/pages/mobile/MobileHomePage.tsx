import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Bell, 
  CheckSquare, 
  ChevronRight,
  XCircle,
  Clock,
  CheckCircle,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotificationCenter } from '@/hooks/useNotificationCenter';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function MobileHomePage() {
  const navigate = useNavigate();
  const { instances, stats, isLoading, refetchInstances } = useNotificationCenter();

  const urgentAlerts = useMemo(() => 
    instances.filter(i => i.status === 'active' && (i.severity === 'critical' || i.severity === 'warning')).slice(0, 3),
    [instances]
  );

  const recentNotifications = useMemo(() =>
    instances.filter(i => i.status === 'active').slice(0, 5),
    [instances]
  );

  const handleRefresh = async () => {
    await refetchInstances();
  };

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
        <title>Mobile App | Control Tower</title>
      </Helmet>

      <PullToRefresh onRefresh={handleRefresh}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="p-4 space-y-6"
        >
          {/* Summary Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <XCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{stats.bySeverity.critical || 0}</p>
                    <p className="text-xs text-slate-400">Nghiêm trọng</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-400">{stats.bySeverity.warning || 0}</p>
                    <p className="text-xs text-slate-400">Cảnh báo</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Bell className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{stats.active}</p>
                    <p className="text-xs text-slate-400">Chưa đọc</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{stats.resolved}</p>
                    <p className="text-xs text-slate-400">Đã xử lý</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Urgent Alerts Section */}
          {urgentAlerts.length > 0 && (
            <motion.section variants={itemVariants}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  Cảnh báo khẩn cấp
                </h2>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/mobile/alerts')}
                  className="text-xs text-amber-400 flex items-center gap-1"
                >
                  Xem tất cả <ChevronRight className="h-3 w-3" />
                </motion.button>
              </div>

              <div className="space-y-2">
                {urgentAlerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/mobile/alerts')}
                    className={`p-3 rounded-xl border ${
                      alert.severity === 'critical'
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-amber-500/10 border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg ${
                        alert.severity === 'critical' ? 'bg-red-500/20' : 'bg-amber-500/20'
                      }`}>
                        {alert.severity === 'critical' 
                          ? <XCircle className="h-4 w-4 text-red-400" />
                          : <AlertTriangle className="h-4 w-4 text-amber-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-100 line-clamp-1">{alert.title}</h3>
                        {alert.message && (
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{alert.message}</p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: vi })}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Recent Notifications */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-400" />
                Thông báo mới
              </h2>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/mobile/notifications')}
                className="text-xs text-amber-400 flex items-center gap-1"
              >
                Xem tất cả <ChevronRight className="h-3 w-3" />
              </motion.button>
            </div>

            {recentNotifications.length === 0 ? (
              <Card className="bg-slate-900/50 border-slate-800/50">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Không có thông báo mới</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {recentNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/mobile/notifications')}
                    className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-lg bg-blue-500/20">
                        <Bell className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-100 line-clamp-1">{notification.title}</h3>
                        {notification.message && (
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{notification.message}</p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: vi })}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Quick Tasks */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-purple-400" />
                Công việc cần làm
              </h2>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/mobile/tasks')}
                className="text-xs text-amber-400 flex items-center gap-1"
              >
                Xem tất cả <ChevronRight className="h-3 w-3" />
              </motion.button>
            </div>

            <Card className="bg-slate-900/50 border-slate-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <CheckSquare className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-100">12</p>
                      <p className="text-xs text-slate-400">Công việc đang chờ</p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/mobile/tasks')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium"
                  >
                    Xem ngay
                  </motion.button>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </motion.div>
      </PullToRefresh>
    </>
  );
}
