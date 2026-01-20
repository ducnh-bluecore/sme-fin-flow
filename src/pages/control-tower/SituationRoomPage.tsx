import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Clock,
  CheckCircle2,
  ArrowRight,
  User,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotificationCenter, AlertInstance } from '@/hooks/useNotificationCenter';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AssignOwnerDropdown } from '@/components/alerts/AssignOwnerDropdown';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { toast } from 'sonner';

/**
 * SITUATION ROOM - Control Tower Manifesto
 * 
 * Design Principles:
 * - NOT a dashboard. A situation room.
 * - Maximum ONE primary alert on screen
 * - No charts, no filters, no tabs
 * - Numbers tied to impact ("This costs X per day")
 * - Feel uncomfortable when something is wrong
 * 
 * Layout:
 * - Top: Situation Summary (1 sentence)
 * - Middle: Impact & Time Pressure
 * - Bottom: Required Action + Owner + Deadline
 * 
 * Color States (only 3):
 * - CRITICAL (Red): Requires immediate action
 * - WARNING (Amber): Needs attention today
 * - CLEAR (Muted): System operating normally
 */

// Format currency with VND
const formatCurrency = (amount: number): string => {
  if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)} tỷ`;
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(0)} triệu`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toLocaleString('vi-VN');
};

// Calculate daily cost from impact and time
const calculateDailyCost = (totalImpact: number, hoursActive: number): number => {
  if (hoursActive <= 0) return totalImpact;
  const days = Math.max(hoursActive / 24, 1);
  return totalImpact / days;
};

// Get the most critical alert
const getMostCriticalAlert = (alerts: AlertInstance[]): AlertInstance | null => {
  const activeAlerts = alerts.filter(a => a.status === 'active' || a.status === 'acknowledged');
  if (activeAlerts.length === 0) return null;
  
  // Sort by severity, then by impact amount, then by age
  return activeAlerts.sort((a, b) => {
    // Severity first
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    const sevA = severityOrder[a.severity as keyof typeof severityOrder] ?? 3;
    const sevB = severityOrder[b.severity as keyof typeof severityOrder] ?? 3;
    if (sevA !== sevB) return sevA - sevB;
    
    // Then impact amount
    const impactA = (a as any).impact_amount || 0;
    const impactB = (b as any).impact_amount || 0;
    if (impactA !== impactB) return impactB - impactA;
    
    // Then age (older first - needs attention)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  })[0];
};

// Determine situation state
type SituationState = 'CRITICAL' | 'WARNING' | 'CLEAR';

const getSituationState = (alert: AlertInstance | null): SituationState => {
  if (!alert) return 'CLEAR';
  if (alert.severity === 'critical') return 'CRITICAL';
  if (alert.severity === 'warning') return 'WARNING';
  return 'CLEAR';
};

export default function SituationRoomPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();
  
  const { 
    instances, 
    stats, 
    isLoading, 
    resolveAlert,
    assignAlert,
  } = useNotificationCenter();

  // Get the ONE primary alert
  const primaryAlert = useMemo(() => getMostCriticalAlert(instances), [instances]);
  const situationState = useMemo(() => getSituationState(primaryAlert), [primaryAlert]);
  
  // Calculate metrics
  const hoursActive = useMemo(() => {
    if (!primaryAlert) return 0;
    return differenceInHours(new Date(), new Date(primaryAlert.created_at));
  }, [primaryAlert]);
  
  const impactAmount = (primaryAlert as any)?.impact_amount || 0;
  const dailyCost = useMemo(() => calculateDailyCost(impactAmount, hoursActive), [impactAmount, hoursActive]);
  const deadlineAt = (primaryAlert as any)?.deadline_at;
  const assignedTo = (primaryAlert as any)?.assigned_to;
  
  // Hours until deadline
  const hoursUntilDeadline = useMemo(() => {
    if (!deadlineAt) return null;
    const hours = differenceInHours(new Date(deadlineAt), new Date());
    return Math.max(0, hours);
  }, [deadlineAt]);

  // Queue count (remaining alerts after primary)
  const queueCount = useMemo(() => {
    return instances.filter(a => 
      (a.status === 'active' || a.status === 'acknowledged') && 
      a.id !== primaryAlert?.id
    ).length;
  }, [instances, primaryAlert]);

  // Create task mutation
  const createTaskFromAlert = useMutation({
    mutationFn: async (alert: AlertInstance) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const priorityMap: Record<string, string> = {
        critical: 'urgent',
        warning: 'high',
        info: 'medium',
      };
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          tenant_id: tenantId,
          title: `[Alert] ${alert.title}`,
          description: alert.message || `Xử lý cảnh báo: ${alert.title}`,
          status: 'todo',
          priority: priorityMap[alert.severity] || 'medium',
          assignee_id: (alert as any).assigned_to,
          source_type: 'alert',
          source_id: alert.id,
          source_alert_type: alert.alert_type,
          due_date: (alert as any).deadline_at || null,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-tasks-count'] });
      toast.success('Đã tạo task');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  const handleResolve = async () => {
    if (!primaryAlert) return;
    await resolveAlert.mutateAsync({ id: primaryAlert.id });
  };

  const handleAssign = (alertId: string, ownerId: string | null) => {
    assignAlert.mutate({ id: alertId, assignedTo: ownerId });
  };

  const handleCreateTask = () => {
    if (!primaryAlert) return;
    createTaskFromAlert.mutate(primaryAlert);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-3 h-3 bg-slate-500 rounded-full animate-pulse mx-auto" />
          <p className="text-slate-500 text-sm mt-4">Đang kiểm tra...</p>
        </div>
      </div>
    );
  }

  // Situation state colors
  const stateColors = {
    CRITICAL: {
      bg: 'bg-red-950/30',
      border: 'border-red-500/20',
      accent: 'text-red-400',
      glow: 'shadow-red-500/10',
    },
    WARNING: {
      bg: 'bg-amber-950/20',
      border: 'border-amber-500/20',
      accent: 'text-amber-400',
      glow: 'shadow-amber-500/10',
    },
    CLEAR: {
      bg: 'bg-slate-900/50',
      border: 'border-slate-800/50',
      accent: 'text-emerald-400',
      glow: '',
    },
  };

  const colors = stateColors[situationState];

  return (
    <>
      <Helmet>
        <title>Situation Room | Control Tower</title>
      </Helmet>

      <div className="min-h-[calc(100vh-120px)] flex flex-col">
        
        {/* ========== CLEAR STATE ========== */}
        <AnimatePresence mode="wait">
          {situationState === 'CLEAR' && (
            <motion.div
              key="clear"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center px-6"
            >
              <CheckCircle2 className="h-16 w-16 text-emerald-400/60 mb-6" />
              <h1 className="text-2xl font-medium text-slate-200 mb-2">
                Không có vấn đề cần xử lý
              </h1>
              <p className="text-slate-500 text-sm max-w-md">
                Hệ thống đang hoạt động bình thường. {stats.resolved} cảnh báo đã được xử lý.
              </p>
              
              {/* Secondary: View history link */}
              <Button
                variant="ghost"
                size="sm"
                className="mt-8 text-slate-500 hover:text-slate-300"
                onClick={() => navigate('/control-tower/alerts')}
              >
                Xem lịch sử
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* ========== ALERT STATE (CRITICAL or WARNING) ========== */}
          {situationState !== 'CLEAR' && primaryAlert && (
            <motion.div
              key="alert"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              
              {/* === TOP: Situation Summary === */}
              <div className={`px-6 py-4 ${colors.bg} border-b ${colors.border}`}>
                <p className="text-sm text-slate-400">
                  {situationState === 'CRITICAL' ? (
                    <span className="text-red-400 font-medium">Cần xử lý ngay</span>
                  ) : (
                    <span className="text-amber-400 font-medium">Cần chú ý</span>
                  )}
                  {queueCount > 0 && (
                    <span className="text-slate-500 ml-2">
                      • {queueCount} vấn đề khác đang chờ
                    </span>
                  )}
                </p>
              </div>

              {/* === MIDDLE: Impact & Time Pressure === */}
              <div className="flex-1 flex flex-col justify-center px-6 py-12 max-w-3xl mx-auto w-full">
                
                {/* Primary Alert Title */}
                <motion.h1 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-2xl md:text-3xl font-semibold ${colors.accent} mb-4 leading-tight`}
                >
                  {primaryAlert.title}
                </motion.h1>
                
                {/* Message/Context */}
                {primaryAlert.message && (
                  <p className="text-slate-400 text-base mb-8 leading-relaxed">
                    {primaryAlert.message}
                  </p>
                )}

                {/* Impact Numbers - The cost of inaction */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  
                  {/* Total Impact */}
                  {impactAmount > 0 && (
                    <div className={`p-5 rounded-lg ${colors.bg} border ${colors.border}`}>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                        Tổng thiệt hại
                      </p>
                      <p className={`text-3xl font-bold ${colors.accent}`}>
                        ₫{formatCurrency(impactAmount)}
                      </p>
                    </div>
                  )}

                  {/* Daily Cost */}
                  {dailyCost > 0 && hoursActive > 0 && (
                    <div className={`p-5 rounded-lg ${colors.bg} border ${colors.border}`}>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                        Mất mỗi ngày
                      </p>
                      <p className={`text-3xl font-bold ${colors.accent}`}>
                        ₫{formatCurrency(dailyCost)}
                        <span className="text-sm font-normal text-slate-500">/ngày</span>
                      </p>
                    </div>
                  )}

                  {/* Time Pressure */}
                  <div className={`p-5 rounded-lg ${colors.bg} border ${colors.border}`}>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                      {hoursUntilDeadline !== null ? 'Còn lại' : 'Đã xảy ra'}
                    </p>
                    <p className={`text-3xl font-bold ${
                      hoursUntilDeadline !== null && hoursUntilDeadline < 4 
                        ? 'text-red-400' 
                        : colors.accent
                    }`}>
                      {hoursUntilDeadline !== null ? (
                        <>
                          {hoursUntilDeadline}
                          <span className="text-sm font-normal text-slate-500"> giờ</span>
                        </>
                      ) : (
                        <>
                          {hoursActive}
                          <span className="text-sm font-normal text-slate-500"> giờ trước</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Suggested Action */}
                {(primaryAlert as any).suggested_action && (
                  <div className={`p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 mb-8`}>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                      Hành động đề xuất
                    </p>
                    <p className="text-slate-200">
                      {(primaryAlert as any).suggested_action}
                    </p>
                  </div>
                )}

              </div>

              {/* === BOTTOM: Required Action + Owner + Deadline === */}
              <div className={`px-6 py-5 ${colors.bg} border-t ${colors.border} mt-auto`}>
                <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  
                  {/* Owner Assignment */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-slate-500" />
                      <span className="text-slate-500">Người xử lý:</span>
                    </div>
                    <AssignOwnerDropdown
                      alertId={primaryAlert.id}
                      currentOwnerId={assignedTo}
                      onAssign={handleAssign}
                      isLoading={assignAlert.isPending}
                    />
                    
                    {/* Deadline display */}
                    {deadlineAt && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="h-4 w-4" />
                        <span>
                          Hạn: {formatDistanceToNow(new Date(deadlineAt), { addSuffix: true, locale: vi })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {/* Secondary: Create task */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateTask}
                      disabled={createTaskFromAlert.isPending}
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      Tạo Task
                    </Button>
                    
                    {/* Primary: Resolve */}
                    <Button
                      size="sm"
                      onClick={handleResolve}
                      disabled={resolveAlert.isPending}
                      className={`${
                        situationState === 'CRITICAL' 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-amber-500 hover:bg-amber-600 text-black'
                      }`}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Đã xử lý
                    </Button>
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
