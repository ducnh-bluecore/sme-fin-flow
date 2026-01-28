import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { OutcomeCard } from '@/components/decision-os/OutcomeCard';
import { usePendingFollowups, useOutcomeStats } from '@/hooks/useDecisionOutcomes';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type TimeWindow = 7 | 14 | 30;

export default function OutcomesPage() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(7);
  const { data: pendingFollowups, isLoading: followupsLoading } = usePendingFollowups();
  const { data: stats, isLoading: statsLoading } = useOutcomeStats();

  const isLoading = followupsLoading || statsLoading;

  // Mock outcome data for display (in real implementation, filter by timeWindow)
  const outcomeCards = (pendingFollowups || []).slice(0, 10).map(item => ({
    id: item.id,
    decisionTitle: item.entity_label || 'Decision',
    decidedAt: item.decided_at,
    outcomeStatus: item.follow_up_status === 'completed' ? 'positive' as const : 'too_early' as const,
    expectedImpact: item.expected_impact_amount || 0,
    actualImpact: item.original_impact || 0,
    impactVariancePercent: 0,
    outcomeSummary: item.expected_outcome || undefined,
    measuredAt: item.follow_up_date,
  }));

  return (
    <>
      <Helmet>
        <title>Outcomes | BlueCore Decision OS</title>
      </Helmet>

      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Outcomes
          </h2>
          <p className="text-muted-foreground">
            Did this decision improve the business?
          </p>
        </div>

        {/* Helper Copy */}
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-sky-800">
            Outcome evaluation is automated to reduce bias.
          </p>
        </div>

        {/* Time Window Toggle */}
        <div className="flex gap-2 mb-6">
          {([7, 14, 30] as TimeWindow[]).map((days) => (
            <Button
              key={days}
              variant={timeWindow === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeWindow(days)}
            >
              {days} days
            </Button>
          ))}
        </div>

        {/* Stats Summary */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{stats.positiveCount}</p>
                <p className="text-xs text-muted-foreground">Positive Impact</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Minus className="h-5 w-5 text-slate-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{stats.neutralCount}</p>
                <p className="text-xs text-muted-foreground">No Change</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingDown className="h-5 w-5 text-destructive mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{stats.negativeCount}</p>
                <p className="text-xs text-muted-foreground">Negative Impact</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {stats.successRate.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Outcome Cards Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : outcomeCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              No outcomes to review
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Decisions that have been executed will show their outcome evaluation here after the follow-up period.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outcomeCards.map((outcome) => (
              <OutcomeCard key={outcome.id} {...outcome} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
