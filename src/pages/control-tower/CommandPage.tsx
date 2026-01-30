import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useActiveAlerts, AlertInstance } from '@/hooks/useAlertInstances';
import { OutcomeRecordingDialog } from '@/components/control-tower';
import { 
  BusinessPulse, 
  RiskHeatmap, 
  AIPredictionCard, 
  CriticalAlertCard,
  type SystemState 
} from '@/components/control-tower/command';

/**
 * COMMAND PAGE - Control Tower Default View (WOW Edition)
 * 
 * Manifesto Compliance:
 * - CHỈ hiển thị "ĐIỀU GÌ SAI"
 * - Tối đa 7 alerts
 * - Mỗi alert: Impact + Deadline + Owner
 * - Dramatic visual effects
 * - AI-powered recommendations
 */

export default function CommandPage() {
  const { data: alerts = [], isLoading } = useActiveAlerts();
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertInstance | null>(null);

  // System state
  const systemState = useMemo((): SystemState => {
    const hasCritical = alerts.some(a => a.severity === 'critical');
    const hasWarning = alerts.some(a => a.severity === 'warning');
    if (hasCritical) return 'CRITICAL';
    if (hasWarning) return 'WARNING';
    return 'STABLE';
  }, [alerts]);

  // Top 7 critical alerts
  const criticalAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => {
        const sevOrder = { critical: 0, warning: 1, info: 2 };
        const sevA = sevOrder[a.severity as keyof typeof sevOrder] ?? 3;
        const sevB = sevOrder[b.severity as keyof typeof sevOrder] ?? 3;
        if (sevA !== sevB) return sevA - sevB;
        return (b.impact_amount || 0) - (a.impact_amount || 0);
      })
      .slice(0, 7);
  }, [alerts]);

  // Total exposure
  const totalExposure = useMemo(() => {
    return alerts.reduce((sum, a) => sum + (a.impact_amount || 0), 0);
  }, [alerts]);

  // Nearest deadline
  const nearestDeadline = useMemo(() => {
    const withDeadline = alerts.filter(a => a.deadline_at);
    if (withDeadline.length === 0) return null;
    return withDeadline.sort(
      (a, b) => new Date(a.deadline_at!).getTime() - new Date(b.deadline_at!).getTime()
    )[0].deadline_at;
  }, [alerts]);

  const handleResolve = (alert: AlertInstance | { id: string; title: string; category?: string; impact_amount?: number }) => {
    setSelectedAlert(alert as AlertInstance);
    setResolveDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Command Center | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Business Pulse Banner */}
        <BusinessPulse
          systemState={systemState}
          totalAlerts={alerts.length}
          totalExposure={totalExposure}
          nearestDeadline={nearestDeadline}
          lastUpdated={new Date()}
        />

        {/* Two Column Layout: Risk Heatmap + AI Prediction */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskHeatmap />
          <AIPredictionCard />
        </div>

        {/* Critical Alerts List */}
        <AnimatePresence mode="wait">
          {criticalAlerts.length > 0 ? (
            <motion.div
              key="alerts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <motion.h2 
                className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                Critical Decisions
                <span className="text-foreground font-bold">({criticalAlerts.length})</span>
              </motion.h2>
              
              <div className="space-y-2">
                {criticalAlerts.map((alert, index) => (
                  <CriticalAlertCard
                    key={alert.id}
                    alert={{
                      id: alert.id,
                      title: alert.title,
                      message: alert.message || undefined,
                      category: alert.category,
                      severity: alert.severity as 'critical' | 'warning' | 'info',
                      impact_amount: alert.impact_amount || undefined,
                      deadline_at: alert.deadline_at || undefined,
                      status: alert.status || undefined,
                    }}
                    index={index}
                    onResolve={() => handleResolve(alert)}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="stable"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30">
                <CardContent className="py-16 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                  >
                    <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                  </motion.div>
                  <motion.h2 
                    className="text-xl font-semibold text-emerald-600"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Hệ thống hoạt động ổn định
                  </motion.h2>
                  <motion.p 
                    className="text-sm text-muted-foreground mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    Không có vấn đề cần xử lý • Tất cả metrics trong ngưỡng an toàn
                  </motion.p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Outcome Recording Dialog */}
      {selectedAlert && (
        <OutcomeRecordingDialog
          open={resolveDialogOpen}
          onOpenChange={setResolveDialogOpen}
          alert={selectedAlert}
        />
      )}
    </>
  );
}
