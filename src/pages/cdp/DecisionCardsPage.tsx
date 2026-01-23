import { Helmet } from 'react-helmet-async';
import { useState, useMemo } from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { DecisionLayout } from '@/components/cdp/decisions/DecisionLayout';
import { DecisionQueueCard, DecisionCardData } from '@/components/cdp/decisions/DecisionQueueCard';
import { DecisionQueueFilters } from '@/components/cdp/decisions/DecisionQueueFilters';
import { useCDPInsightFeed } from '@/hooks/useCDPInsightFeed';

// Helper functions
function getOwnerFromCategory(category: string): 'CEO' | 'CFO' | 'COO' {
  const mapping: Record<string, 'CEO' | 'CFO' | 'COO'> = {
    value: 'CFO',
    velocity: 'COO',
    mix: 'CEO',
    risk: 'CFO',
    quality: 'COO'
  };
  return mapping[category] || 'CEO';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DecisionCardsPage() {
  const { data: insights = [], isLoading } = useCDPInsightFeed();
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Transform DB insights into decision cards
  const decisionCards: DecisionCardData[] = useMemo(() => {
    return insights
      .filter((i) => i.severity === 'critical' || i.severity === 'high')
      .map((insight): DecisionCardData => ({
        id: insight.event_id,
        title: `Xem xét: ${insight.title}`,
        sourceInsights: [insight.code],
        sourceEquity: insight.topic === 'equity' || insight.topic === 'value',
        severity: insight.severity === 'critical' ? 'high' : 
                  insight.severity === 'high' ? 'medium' : 'low',
        priority: insight.severity === 'critical' ? 1 : 2,
        owner: getOwnerFromCategory(insight.topic || 'value'),
        reviewDeadline: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        status: 'new',
        createdAt: formatDate(new Date(insight.detected_at)),
        populationSize: insight.population_size || 0,
        equityImpact: undefined
      }));
  }, [insights]);

  // Count by status
  const counts = useMemo(() => ({
    new: decisionCards.filter(c => c.status === 'new').length,
    reviewing: decisionCards.filter(c => c.status === 'reviewing').length,
    decided: decisionCards.filter(c => c.status === 'decided').length,
    archived: decisionCards.filter(c => c.status === 'archived').length,
  }), [decisionCards]);

  // Apply filters
  const filteredCards = useMemo(() => {
    return decisionCards.filter(card => {
      if (statusFilter !== 'all' && card.status !== statusFilter) return false;
      if (ownerFilter !== 'all' && card.owner !== ownerFilter) return false;
      if (severityFilter !== 'all' && card.severity !== severityFilter) return false;
      return true;
    }).sort((a, b) => {
      // Sort by severity first, then by priority
      const severityOrder = { high: 0, medium: 1, low: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.priority - b.priority;
    });
  }, [decisionCards, statusFilter, ownerFilter, severityFilter]);

  const clearFilters = () => {
    setStatusFilter('all');
    setOwnerFilter('all');
    setSeverityFilter('all');
  };

  return (
    <CDPLayout>
      <Helmet>
        <title>Thẻ Quyết định | CDP - Bluecore</title>
        <meta name="description" content="Quản trị quyết định điều hành dựa trên Insight" />
      </Helmet>

      <div className="space-y-6 max-w-5xl">
        {/* Page Header */}
        <div>
          <h1 className="text-xl font-semibold mb-1">Thẻ Quyết định</h1>
          <p className="text-sm text-muted-foreground">
            Danh sách các vấn đề điều hành cần được xem xét
          </p>
        </div>

        <DecisionLayout>
          {/* Governance Explainer */}
          <Card className="border-border bg-muted/30 mb-6">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">
                    Thẻ Quyết định là công cụ quản trị, không phải danh sách việc cần làm
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Mỗi thẻ đại diện cho một vấn đề điều hành cần xem xét. Quyết định được ghi nhận 
                    bằng văn bản, không có workflow hay hành động tự động. Không có hành động 
                    marketing nào được thực hiện từ màn hình này.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <DecisionQueueFilters
            statusFilter={statusFilter}
            ownerFilter={ownerFilter}
            severityFilter={severityFilter}
            onStatusChange={setStatusFilter}
            onOwnerChange={setOwnerFilter}
            onSeverityChange={setSeverityFilter}
            onClearFilters={clearFilters}
            counts={counts}
          />

          {/* Cards List */}
          <div className="mt-6 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="h-32 animate-pulse bg-muted" />
                ))}
              </div>
            ) : filteredCards.length === 0 ? (
              <Card className="py-12 text-center">
                <CardContent>
                  <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-3" />
                  <p className="font-medium">Không có thẻ quyết định nào</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {statusFilter !== 'all' || ownerFilter !== 'all' || severityFilter !== 'all'
                      ? 'Thử điều chỉnh bộ lọc để xem thêm'
                      : 'Tất cả vấn đề đã được xem xét'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredCards.map((card) => (
                <DecisionQueueCard key={card.id} card={card} />
              ))
            )}
          </div>
        </DecisionLayout>
      </div>
    </CDPLayout>
  );
}
