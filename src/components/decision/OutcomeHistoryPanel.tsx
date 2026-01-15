import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface OutcomeWithDecision {
  id: string;
  measured_at: string;
  actual_impact_amount: number | null;
  impact_variance: number | null;
  impact_variance_percent: number | null;
  outcome_status: string;
  outcome_summary: string | null;
  lessons_learned: string | null;
  would_repeat: boolean | null;
  is_auto_measured: boolean | null;
  baseline_metrics: Record<string, any> | null;
  current_metrics: Record<string, any> | null;
  // From decision_audit_log join
  entity_label: string | null;
  entity_type: string | null;
  card_type: string | null;
  selected_action_label: string | null;
  expected_impact_amount: number | null;
  decided_at: string | null;
}

const statusConfig = {
  positive: { 
    icon: CheckCircle2, 
    color: 'text-green-500', 
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    label: 'Thành công' 
  },
  neutral: { 
    icon: MinusCircle, 
    color: 'text-amber-500', 
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Trung bình' 
  },
  negative: { 
    icon: XCircle, 
    color: 'text-red-500', 
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    label: 'Chưa đạt' 
  },
  too_early: { 
    icon: Clock, 
    color: 'text-muted-foreground', 
    bg: 'bg-muted',
    border: 'border-muted',
    label: 'Còn sớm' 
  },
};

const metricLabels: Record<string, string> = {
  ad_spend_7d: 'Chi phí Ads',
  roas: 'ROAS',
  cpa: 'CPA',
  conversions: 'Conversions',
  revenue_7d: 'Doanh thu 7d',
  margin_percent: 'Margin %',
  gross_margin_percent: 'Gross Margin %',
  cash_balance: 'Số dư tiền',
  runway_days: 'Runway (ngày)',
  monthly_burn: 'Chi phí/tháng',
};

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
}

function OutcomeCard({ outcome }: { outcome: OutcomeWithDecision }) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[outcome.outcome_status as keyof typeof statusConfig] || statusConfig.neutral;
  const StatusIcon = config.icon;

  const hasMetrics = outcome.baseline_metrics && outcome.current_metrics;

  return (
    <div className={cn(
      "border rounded-lg p-4 transition-all",
      config.border,
      config.bg
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <StatusIcon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
          <div className="space-y-1.5 flex-1">
            <p className="font-medium text-sm">{outcome.entity_label || 'Quyết định'}</p>
            {outcome.selected_action_label && (
              <p className="text-sm text-muted-foreground">
                Hành động: {outcome.selected_action_label}
              </p>
            )}
            
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge className={cn(config.bg, config.color, config.border)}>
                {config.label}
              </Badge>
              {outcome.is_auto_measured && (
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                  <Bot className="h-3 w-3 mr-1" />
                  Tự động
                </Badge>
              )}
              {!outcome.is_auto_measured && (
                <Badge variant="outline" className="text-xs">
                  <User className="h-3 w-3 mr-1" />
                  Thủ công
                </Badge>
              )}
              {outcome.entity_type && (
                <Badge variant="secondary" className="text-xs">
                  {outcome.entity_type}
                </Badge>
              )}
            </div>

            {/* Summary */}
            {outcome.outcome_summary && (
              <p className="text-sm text-muted-foreground mt-2">
                {outcome.outcome_summary}
              </p>
            )}
          </div>
        </div>
        
        {/* Right side - Impact & Date */}
        <div className="text-right shrink-0 space-y-1">
          {outcome.actual_impact_amount != null && (
            <div className="flex items-center justify-end gap-1">
              {outcome.actual_impact_amount >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={cn(
                "font-semibold text-sm",
                outcome.actual_impact_amount >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {outcome.actual_impact_amount >= 0 ? '+' : ''}{formatCurrency(outcome.actual_impact_amount)}đ
              </span>
            </div>
          )}
          {outcome.impact_variance_percent != null && (
            <p className="text-xs text-muted-foreground">
              Variance: {outcome.impact_variance_percent >= 0 ? '+' : ''}{outcome.impact_variance_percent.toFixed(1)}%
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {format(new Date(outcome.measured_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
          </p>
        </div>
      </div>

      {/* Expand/Collapse for details */}
      {(hasMetrics || outcome.lessons_learned) && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-center text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Thu gọn
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Xem chi tiết
            </>
          )}
        </Button>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-4">
          {/* Metrics comparison */}
          {hasMetrics && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="h-4 w-4" />
                So sánh Metrics
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.keys(outcome.baseline_metrics || {}).map(key => {
                  const baseline = outcome.baseline_metrics?.[key];
                  const current = outcome.current_metrics?.[key];
                  if (baseline == null) return null;
                  
                  const change = current != null ? current - baseline : null;
                  const changePercent = baseline !== 0 && change != null 
                    ? (change / Math.abs(baseline)) * 100 
                    : null;
                  
                  return (
                    <div key={key} className="bg-background/50 rounded-md p-2 text-xs space-y-1">
                      <p className="text-muted-foreground">{metricLabels[key] || key}</p>
                      <div className="flex items-center justify-between">
                        <span>{formatCurrency(baseline)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className={cn(
                          current != null ? "font-medium" : "text-muted-foreground"
                        )}>
                          {current != null ? formatCurrency(current) : 'N/A'}
                        </span>
                      </div>
                      {changePercent != null && (
                        <p className={cn(
                          "text-right",
                          changePercent >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lessons learned */}
          {outcome.lessons_learned && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Bài học kinh nghiệm
              </div>
              <p className="text-sm text-muted-foreground bg-background/50 rounded-md p-3">
                {outcome.lessons_learned}
              </p>
            </div>
          )}

          {/* Would repeat */}
          {outcome.would_repeat != null && (
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4" />
              <span>Sẽ làm lại lần nữa:</span>
              <Badge variant={outcome.would_repeat ? "default" : "secondary"}>
                {outcome.would_repeat ? 'Có' : 'Không'}
              </Badge>
            </div>
          )}

          {/* Expected vs Actual */}
          {outcome.expected_impact_amount != null && outcome.actual_impact_amount != null && (
            <div className="text-xs text-muted-foreground">
              Kỳ vọng: {formatCurrency(outcome.expected_impact_amount)}đ → 
              Thực tế: {formatCurrency(outcome.actual_impact_amount)}đ
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function OutcomeHistoryPanel() {
  const { data: tenantId } = useActiveTenantId();

  const { data: outcomes, isLoading } = useQuery({
    queryKey: ['outcome-history', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Join with decision_audit_log to get decision details
      const { data, error } = await supabase
        .from('decision_outcomes')
        .select(`
          id,
          measured_at,
          actual_impact_amount,
          impact_variance,
          impact_variance_percent,
          outcome_status,
          outcome_summary,
          lessons_learned,
          would_repeat,
          is_auto_measured,
          baseline_metrics,
          current_metrics,
          decision_audit_id
        `)
        .eq('tenant_id', tenantId)
        .order('measured_at', { ascending: false });

      if (error) throw error;

      // Fetch decision details for each outcome
      const outcomeIds = data.map(o => o.decision_audit_id).filter(Boolean);
      
      let decisionsMap: Record<string, any> = {};
      if (outcomeIds.length > 0) {
        const { data: decisions } = await supabase
          .from('decision_audit_log')
          .select('id, entity_label, entity_type, card_type, selected_action_label, expected_impact_amount, decided_at')
          .in('id', outcomeIds);
        
        if (decisions) {
          decisionsMap = Object.fromEntries(decisions.map(d => [d.id, d]));
        }
      }

      // Merge data
      return data.map(o => ({
        ...o,
        ...(decisionsMap[o.decision_audit_id] || {}),
      })) as OutcomeWithDecision[];
    },
    enabled: !!tenantId,
  });

  // Stats
  const stats = {
    total: outcomes?.length || 0,
    positive: outcomes?.filter(o => o.outcome_status === 'positive').length || 0,
    neutral: outcomes?.filter(o => o.outcome_status === 'neutral').length || 0,
    negative: outcomes?.filter(o => o.outcome_status === 'negative').length || 0,
    tooEarly: outcomes?.filter(o => o.outcome_status === 'too_early').length || 0,
    autoMeasured: outcomes?.filter(o => o.is_auto_measured).length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!outcomes || outcomes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Chưa có kết quả nào được ghi nhận</p>
        <p className="text-sm mt-1">Các outcome sẽ xuất hiện ở đây sau khi bạn theo dõi và đánh giá quyết định</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Tổng cộng</p>
        </div>
        <div className="bg-green-500/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.positive}</p>
          <p className="text-xs text-muted-foreground">Thành công</p>
        </div>
        <div className="bg-amber-500/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.neutral}</p>
          <p className="text-xs text-muted-foreground">Trung bình</p>
        </div>
        <div className="bg-red-500/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.negative}</p>
          <p className="text-xs text-muted-foreground">Chưa đạt</p>
        </div>
        <div className="bg-blue-500/10 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.autoMeasured}</p>
          <p className="text-xs text-muted-foreground">Tự động đo</p>
        </div>
      </div>

      {/* Outcome list */}
      <div className="space-y-3">
        {outcomes.map(outcome => (
          <OutcomeCard key={outcome.id} outcome={outcome} />
        ))}
      </div>
    </div>
  );
}
