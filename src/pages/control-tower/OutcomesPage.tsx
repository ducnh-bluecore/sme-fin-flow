import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Target, Calendar, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDecisionEffectiveness, usePendingFollowups, useLearningInsights, type PendingFollowup } from '@/hooks/control-tower';
import {
  EffectivenessSummaryCards,
  ModuleEffectivenessTable,
  LearningInsightsCard,
  PendingFollowupList,
  OutcomeRecordingDialog,
} from '@/components/control-tower';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

/**
 * OUTCOMES PAGE - Decision Effectiveness Tracking
 * 
 * Features:
 * - Summary metrics: Resolved, Success Rate, Accuracy, Total ROI
 * - Accuracy trend chart
 * - Effectiveness by module table
 * - Learning insights
 * - Pending follow-up list
 */

type Period = '7d' | '30d' | '90d';

export default function OutcomesPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'followup'>('overview');
  const [selectedFollowup, setSelectedFollowup] = useState<PendingFollowup | null>(null);
  const [measureDialogOpen, setMeasureDialogOpen] = useState(false);

  const { data: effectiveness, isLoading: loadingEffectiveness } = useDecisionEffectiveness(period);
  const { data: pendingFollowups = [], isLoading: loadingFollowups } = usePendingFollowups();
  const { insights, isLoading: loadingInsights, hasData } = useLearningInsights();

  // Generate chart data from module effectiveness
  const chartData = useMemo(() => {
    if (!effectiveness || effectiveness.byModule.length === 0) {
      // Demo data when no real data
      return [
        { module: 'FDP', predicted: 250, actual: 240, accuracy: 96 },
        { module: 'MDP', predicted: 150, actual: 128, accuracy: 85 },
        { module: 'CDP', predicted: 50, actual: 47, accuracy: 94 },
      ];
    }

    return effectiveness.byModule.map(m => ({
      module: m.decision_type,
      predicted: m.total_predicted_value / 1_000_000,
      actual: m.total_actual_value / 1_000_000,
      accuracy: m.avg_accuracy,
    }));
  }, [effectiveness]);

  // Demo effectiveness if no data
  const displayEffectiveness = useMemo(() => {
    if (effectiveness && effectiveness.totalDecisions > 0) {
      return effectiveness;
    }
    // Demo data
    return {
      totalDecisions: 12,
      successfulCount: 10,
      failedCount: 2,
      pendingCount: 3,
      overallSuccessRate: 83.3,
      overallAccuracy: 91.5,
      totalROI: 450_000_000,
      byModule: [
        { decision_type: 'FDP', total_decisions: 5, successful_count: 4, failed_count: 1, pending_count: 1, success_rate: 80, avg_accuracy: 95, total_actual_value: 250_000_000, total_predicted_value: 260_000_000 },
        { decision_type: 'MDP', total_decisions: 4, successful_count: 4, failed_count: 0, pending_count: 1, success_rate: 100, avg_accuracy: 88, total_actual_value: 150_000_000, total_predicted_value: 170_000_000 },
        { decision_type: 'CDP', total_decisions: 3, successful_count: 2, failed_count: 1, pending_count: 1, success_rate: 67, avg_accuracy: 92, total_actual_value: 50_000_000, total_predicted_value: 55_000_000 },
      ],
    };
  }, [effectiveness]);

  // Demo pending followups if no data
  const displayFollowups = useMemo(() => {
    if (pendingFollowups.length > 0) {
      return pendingFollowups;
    }
    return [
      {
        id: '1',
        tenant_id: '',
        decision_id: null,
        decision_type: 'MDP',
        decision_title: 'Scale TikTok Channel',
        predicted_impact_amount: 45_000_000,
        decided_at: new Date().toISOString(),
        followup_due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        outcome_verdict: 'pending_followup',
        urgency_status: 'due_soon' as const,
        days_until_due: 5,
      },
      {
        id: '2',
        tenant_id: '',
        decision_id: null,
        decision_type: 'CDP',
        decision_title: 'Reactivate Dormant Segment',
        predicted_impact_amount: 120_000_000,
        decided_at: new Date().toISOString(),
        followup_due_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        outcome_verdict: 'pending_followup',
        urgency_status: 'upcoming' as const,
        days_until_due: 12,
      },
      {
        id: '3',
        tenant_id: '',
        decision_id: null,
        decision_type: 'FDP',
        decision_title: 'New pricing strategy',
        predicted_impact_amount: 85_000_000,
        decided_at: new Date().toISOString(),
        followup_due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        outcome_verdict: 'pending_followup',
        urgency_status: 'upcoming' as const,
        days_until_due: 20,
      },
    ];
  }, [pendingFollowups]);

  // Demo insights if no data
  const displayInsights = useMemo(() => {
    if (insights.length > 0) {
      return insights;
    }
    return [
      { id: '1', type: 'positive' as const, icon: '💡' as const, message: 'FDP margin decisions có accuracy 95% - rất đáng tin cậy' },
      { id: '2', type: 'warning' as const, icon: '⚠️' as const, message: 'MDP campaign decisions thường underestimate impact 15%' },
      { id: '3', type: 'info' as const, icon: '📊' as const, message: 'Decisions resolved trong 4h có success rate cao hơn 20%' },
    ];
  }, [insights]);

  const overdueCount = displayFollowups.filter(f => f.urgency_status === 'overdue').length;

  return (
    <>
      <Helmet>
        <title>Decision Effectiveness | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-muted-foreground" />
            <div>
              <h1 className="text-lg font-semibold">Decision Effectiveness</h1>
              <p className="text-sm text-muted-foreground">
                Theo dõi hiệu quả và ROI của các quyết định
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Follow-up Badge */}
            {displayFollowups.length > 0 && (
              <Badge 
                variant={overdueCount > 0 ? 'destructive' : 'outline'}
                className="cursor-pointer"
                onClick={() => setActiveTab('followup')}
              >
                {overdueCount > 0 ? `${overdueCount} overdue` : `${displayFollowups.length} pending`}
              </Badge>
            )}

            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 ngày qua</SelectItem>
                  <SelectItem value="30d">30 ngày qua</SelectItem>
                  <SelectItem value="90d">90 ngày qua</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'followup')}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="followup" className="relative">
              Follow-up
              {overdueCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Summary Cards */}
            <EffectivenessSummaryCards 
              data={displayEffectiveness} 
              isLoading={loadingEffectiveness}
            />

            {/* Accuracy Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Predicted vs Actual by Module (₫M)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="module" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`₫${value.toFixed(0)}M`, '']}
                      />
                      <Legend />
                      <Bar 
                        dataKey="predicted" 
                        fill="hsl(var(--muted-foreground))" 
                        name="Predicted"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="actual" 
                        fill="hsl(142.1 76.2% 36.3%)" 
                        name="Actual"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Module Effectiveness */}
              <ModuleEffectivenessTable 
                data={displayEffectiveness.byModule}
                isLoading={loadingEffectiveness}
              />

              {/* Learning Insights */}
              <LearningInsightsCard 
                insights={displayInsights}
                isLoading={loadingInsights}
              />
            </div>
          </TabsContent>

          <TabsContent value="followup" className="space-y-6 mt-6">
            <PendingFollowupList
              data={displayFollowups}
              isLoading={loadingFollowups}
              onMeasure={(followup) => {
                setSelectedFollowup(followup);
                setMeasureDialogOpen(true);
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Outcome Recording Dialog */}
        {selectedFollowup && (
          <OutcomeRecordingDialog
            open={measureDialogOpen}
            onOpenChange={setMeasureDialogOpen}
            alert={{
              id: selectedFollowup.id,
              title: selectedFollowup.decision_title,
              category: selectedFollowup.decision_type,
              impact_amount: selectedFollowup.predicted_impact_amount,
            }}
          />
        )}
      </div>
    </>
  );
}
