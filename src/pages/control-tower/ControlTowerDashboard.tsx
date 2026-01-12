import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  DollarSign,
  Zap,
  TrendingDown,
  Sparkles,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotificationCenter, severityConfig } from '@/hooks/useNotificationCenter';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useMemo } from 'react';

// Format VND compact
const formatImpact = (amount: number) => {
  if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toString();
};

interface AlertWithImpact {
  id: string;
  title: string;
  message: string | null;
  severity: string;
  status: string;
  category: string;
  created_at: string;
  impact_amount: number | null;
  impact_description: string | null;
  deadline_at: string | null;
  suggested_action: string | null;
  calculation_details: any;
}

function ImpactAlertCard({ 
  alert, 
  onAcknowledge, 
  onResolve 
}: { 
  alert: AlertWithImpact;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info;
  const isCrossDomain = alert.calculation_details?.is_cross_domain;
  
  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: vi });
    } catch {
      return '';
    }
  }, [alert.created_at]);

  const deadlineInfo = useMemo(() => {
    if (!alert.deadline_at) return null;
    try {
      const deadline = new Date(alert.deadline_at);
      const now = new Date();
      const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
      if (hoursLeft < 0) return { text: 'Quá hạn', urgent: true };
      if (hoursLeft < 24) return { text: `${hoursLeft}h còn lại`, urgent: true };
      return { text: `${Math.round(hoursLeft / 24)} ngày`, urgent: false };
    } catch {
      return null;
    }
  }, [alert.deadline_at]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-xl border-2 ${config.bgColor} ${
        alert.severity === 'critical' ? 'border-red-500/50' : 
        alert.severity === 'warning' ? 'border-amber-500/30' : 'border-blue-500/20'
      } transition-all hover:scale-[1.01]`}
    >
      <div className="flex items-start gap-4">
        {/* Impact Amount - Most prominent */}
        {alert.impact_amount && alert.impact_amount > 0 ? (
          <div className={`flex flex-col items-center justify-center min-w-[80px] p-3 rounded-lg ${
            alert.severity === 'critical' ? 'bg-red-500/20' : 'bg-amber-500/20'
          }`}>
            <DollarSign className={`h-4 w-4 mb-1 ${config.color}`} />
            <span className={`text-lg font-bold ${config.color}`}>
              {formatImpact(alert.impact_amount)}
            </span>
            <span className="text-[10px] text-slate-400">VND</span>
          </div>
        ) : (
          <div className={`p-3 rounded-lg ${config.bgColor}`}>
            <AlertTriangle className={`h-6 w-6 ${config.color}`} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header with badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={`text-xs ${config.bgColor} ${config.color} border ${
              alert.severity === 'critical' ? 'border-red-500/30' : 'border-amber-500/30'
            }`}>
              {alert.severity === 'critical' ? '🚨 Nghiêm trọng' : 
               alert.severity === 'warning' ? '⚠️ Cảnh báo' : 'ℹ️ Thông tin'}
            </Badge>
            {isCrossDomain && (
              <Badge className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Cross-domain
              </Badge>
            )}
            {deadlineInfo && (
              <Badge className={`text-xs ${
                deadlineInfo.urgent 
                  ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse' 
                  : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
              }`}>
                <Clock className="h-3 w-3 mr-1" />
                {deadlineInfo.text}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-slate-100 line-clamp-2">{alert.title}</h3>

          {/* Message */}
          {alert.message && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{alert.message}</p>
          )}

          {/* Suggested Action */}
          {alert.suggested_action && (
            <div className="mt-2 p-2 rounded bg-slate-800/50 border border-slate-700/30">
              <div className="flex items-start gap-2">
                <Target className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-emerald-300">{alert.suggested_action}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-500">{timeAgo}</span>
            
            {alert.status === 'active' && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-7 px-2 text-xs text-slate-400 hover:bg-slate-700/50"
                  onClick={() => onAcknowledge(alert.id)}
                >
                  Đã nhận
                </Button>
                <Button 
                  size="sm" 
                  className="h-7 px-3 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => onResolve(alert.id)}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Xử lý ngay
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ControlTowerDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: tenantId } = useActiveTenantId();
  
  const { 
    activeAlerts, 
    stats, 
    isLoading,
    acknowledgeAlert,
    resolveAlert,
    refetchAll 
  } = useNotificationCenter();

  // Calculate total impact from active alerts
  const totalImpact = useMemo(() => {
    return activeAlerts.reduce((sum, alert: any) => sum + (alert.impact_amount || 0), 0);
  }, [activeAlerts]);

  // Sort by impact amount (highest first), then by severity
  const sortedAlerts = useMemo(() => {
    return [...activeAlerts].sort((a: any, b: any) => {
      // Critical first
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (b.severity === 'critical' && a.severity !== 'critical') return 1;
      // Then by impact
      return (b.impact_amount || 0) - (a.impact_amount || 0);
    });
  }, [activeAlerts]);

  const handleRunDetection = async () => {
    if (!tenantId) return;
    
    toast.loading('Đang quét cảnh báo...', { id: 'detection' });
    
    try {
      // Run both regular and cross-domain detection
      const [regularResult, crossDomainResult] = await Promise.all([
        supabase.functions.invoke('detect-alerts', { body: { tenant_id: tenantId } }),
        supabase.functions.invoke('detect-cross-domain-alerts', { body: { tenant_id: tenantId } })
      ]);

      const regularCount = regularResult.data?.result?.triggered || 0;
      const crossDomainCount = crossDomainResult.data?.triggered || 0;
      const totalTriggered = regularCount + crossDomainCount;

      toast.success(
        `Đã quét xong: ${totalTriggered} cảnh báo mới${crossDomainCount > 0 ? ` (${crossDomainCount} cross-domain)` : ''}`, 
        { id: 'detection' }
      );
      refetchAll();
    } catch (err) {
      toast.error('Lỗi khi quét cảnh báo', { id: 'detection' });
      console.error(err);
    }
  };

  const criticalCount = stats.bySeverity.critical || 0;
  const warningCount = stats.bySeverity.warning || 0;

  return (
    <>
      <Helmet>
        <title>Control Tower | Alert Center</title>
      </Helmet>

      <div className="space-y-6">
        {/* Simplified Header - Alert Focused */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
              Alert Center
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {stats.active > 0 
                ? `${stats.active} cảnh báo cần xử lý` 
                : 'Không có cảnh báo nào'}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRunDetection}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Quét cảnh báo
          </Button>
        </div>

        {/* Impact Summary Bar - The Most Important Metric */}
        {stats.active > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-xl border-2 ${
              criticalCount > 0 
                ? 'bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-500/30' 
                : 'bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/30'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-6">
                {/* Total Impact */}
                <div className="text-center">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <DollarSign className="h-3 w-3" />
                    Tổng Impact
                  </div>
                  <p className={`text-3xl font-bold ${criticalCount > 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    ₫{formatImpact(totalImpact)}
                  </p>
                </div>

                <div className="h-12 w-px bg-slate-700" />

                {/* Alert Counts */}
                <div className="flex gap-4">
                  {criticalCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
                      <p className="text-xs text-slate-400">Critical</p>
                    </div>
                  )}
                  {warningCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-400">{warningCount}</p>
                      <p className="text-xs text-slate-400">Warning</p>
                    </div>
                  )}
                </div>
              </div>

              <Button 
                size="sm"
                onClick={() => navigate('/control-tower/alerts')}
                className={`${
                  criticalCount > 0 ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
                } text-white`}
              >
                Xem tất cả
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* No Alerts State */}
        {stats.active === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-slate-900/30 rounded-xl border border-slate-800/50"
          >
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-400" />
            <h2 className="text-xl font-semibold text-slate-100 mb-2">Hệ thống hoạt động bình thường</h2>
            <p className="text-slate-400 mb-4">Không có cảnh báo nào cần xử lý</p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {stats.resolved} đã xử lý hôm nay
              </div>
            </div>
          </motion.div>
        )}

        {/* Priority Alert List */}
        {stats.active > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-amber-400" />
                Cảnh báo ưu tiên cao nhất
              </h2>
              <span className="text-xs text-slate-500">Sắp xếp theo Impact ₫</span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-32 bg-slate-800" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedAlerts.slice(0, 5).map((alert: any) => (
                  <ImpactAlertCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={(id) => acknowledgeAlert.mutate(id)}
                    onResolve={(id) => resolveAlert.mutate({ id })}
                  />
                ))}
                
                {sortedAlerts.length > 5 && (
                  <Button 
                    variant="ghost" 
                    className="w-full text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    onClick={() => navigate('/control-tower/alerts')}
                  >
                    Xem tất cả {sortedAlerts.length} cảnh báo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Stats - Simplified */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{stats.bySeverity.critical}</p>
                <p className="text-xs text-slate-400">Critical</p>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{stats.bySeverity.warning}</p>
                <p className="text-xs text-slate-400">Warning</p>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{stats.resolved}</p>
                <p className="text-xs text-slate-400">Đã xử lý</p>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{stats.acknowledged}</p>
                <p className="text-xs text-slate-400">Đã xác nhận</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
