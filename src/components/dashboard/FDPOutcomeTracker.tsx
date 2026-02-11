/**
 * FDP Outcome Tracker
 * 
 * Hiển thị ngay trong trang Unit Economics để theo dõi
 * kết quả các quyết định SKU (stop, review pricing, reduce ads).
 * 
 * FDP Manifesto #6: Unit Economics → Action
 * Control Tower Manifesto #5: Alert phải có Owner & Kết quả
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  BarChart3,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatVNDCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { usePendingFollowups } from '@/hooks/control-tower/usePendingFollowups';
import { useOutcomeStats } from '@/hooks/useDecisionOutcomes';
import { OutcomeRecordingDialog } from '@/components/control-tower/common/OutcomeRecordingDialog';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function FDPOutcomeTracker() {
  const { data: followups = [], isLoading: loadingFollowups } = usePendingFollowups();
  const { data: stats, isLoading: loadingStats } = useOutcomeStats();
  const [expanded, setExpanded] = useState(true);
  const [selectedFollowup, setSelectedFollowup] = useState<any>(null);

  // Only show FDP-related decisions
  const fdpFollowups = followups.filter(f => 
    f.decision_type?.startsWith('FDP_') || f.decision_type === 'sku_stop_action'
  );

  // Don't render if no data
  if (!loadingFollowups && !loadingStats && fdpFollowups.length === 0 && (!stats || stats.totalOutcomes === 0)) {
    return null;
  }

  const urgencyConfig = {
    overdue: { label: 'Quá hạn', color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle },
    due_soon: { label: 'Sắp đến hạn', color: 'bg-amber-500 text-white', icon: Clock },
    upcoming: { label: 'Sắp tới', color: 'bg-muted text-muted-foreground', icon: CalendarClock },
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Theo dõi quyết định SKU</CardTitle>
                {fdpFollowups.length > 0 && (
                  <Badge variant="secondary">{fdpFollowups.length} chờ đo lường</Badge>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <CardContent className="pt-2 space-y-4">
                  {/* Quick Stats */}
                  {stats && stats.totalOutcomes > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Tổng quyết định</p>
                        <p className="text-lg font-bold">{stats.totalOutcomes}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Tỷ lệ đúng</p>
                        <p className="text-lg font-bold text-primary">{stats.successRate.toFixed(0)}%</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Impact thật</p>
                        <p className={cn(
                          "text-lg font-bold",
                          stats.totalActualImpact >= 0 ? 'text-emerald-600' : 'text-destructive'
                        )}>
                          {formatVNDCompact(Math.abs(stats.totalActualImpact))}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Pending Followups List */}
                  {fdpFollowups.length > 0 && (
                    <div className="space-y-2">
                      {fdpFollowups.slice(0, 5).map((followup) => {
                        const urgency = urgencyConfig[followup.urgency_status] || urgencyConfig.upcoming;
                        const UrgencyIcon = urgency.icon;
                        
                        return (
                          <div 
                            key={followup.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <UrgencyIcon className={cn("h-4 w-4 flex-shrink-0", 
                                followup.urgency_status === 'overdue' ? 'text-destructive' : 
                                followup.urgency_status === 'due_soon' ? 'text-amber-500' : 'text-muted-foreground'
                              )} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{followup.decision_title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {followup.predicted_impact_amount 
                                    ? `Dự đoán: ${formatVNDCompact(followup.predicted_impact_amount)}` 
                                    : ''
                                  }
                                  {followup.followup_due_date && (
                                    <span> • {formatDistanceToNow(new Date(followup.followup_due_date), { addSuffix: true, locale: vi })}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={cn("text-xs", urgency.color)}>
                                {urgency.label}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedFollowup({
                                  id: followup.id,
                                  title: followup.decision_title,
                                  category: followup.decision_type,
                                  impact_amount: followup.predicted_impact_amount,
                                  decided_at: followup.decided_at,
                                })}
                              >
                                <BarChart3 className="h-3 w-3 mr-1" />
                                Đo lường
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {fdpFollowups.length === 0 && stats && stats.totalOutcomes > 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/50" />
                      Không có quyết định nào đang chờ theo dõi
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Outcome Recording Dialog - reuse from Control Tower */}
      {selectedFollowup && (
        <OutcomeRecordingDialog
          open={!!selectedFollowup}
          onOpenChange={(open) => !open && setSelectedFollowup(null)}
          alert={selectedFollowup}
        />
      )}
    </>
  );
}
