import { Helmet } from 'react-helmet-async';
import { useState, useMemo } from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { DecisionLayout } from '@/components/cdp/decisions/DecisionLayout';
import { DecisionQueueCard, DecisionCardData } from '@/components/cdp/decisions/DecisionQueueCard';
import { DecisionQueueFilters } from '@/components/cdp/decisions/DecisionQueueFilters';
import { useCDPInsightDetection } from '@/hooks/useCDPInsightDetection';

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

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DecisionCardsPage() {
  const { insights, isLoading } = useCDPInsightDetection();
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Transform insights into decision cards
  const decisionCards: DecisionCardData[] = useMemo(() => {
    return insights
      .filter((i) => i.definition.risk.severity === 'critical' || i.definition.risk.severity === 'high')
      .map((insight): DecisionCardData => ({
        id: insight.code,
        title: insight.decisionPrompt || `Xem xét: ${insight.definition.nameVi || insight.definition.name}`,
        sourceInsights: [insight.code],
        sourceEquity: insight.definition.category === 'value',
        severity: insight.definition.risk.severity === 'critical' ? 'high' : 
                  insight.definition.risk.severity === 'high' ? 'medium' : 'low',
        priority: insight.definition.risk.severity === 'critical' ? 1 : 2,
        owner: getOwnerFromCategory(insight.definition.category),
        reviewDeadline: formatDate(addDays(new Date(), 7)),
        status: 'new',
        createdAt: formatDate(new Date()),
        populationSize: insight.population.customerCount,
        equityImpact: undefined
      }));
  }, [insights]);

  // Add some mock decided cards for demo
  const allCards: DecisionCardData[] = useMemo(() => {
    const mockDecided: DecisionCardData[] = [
      {
        id: 'DC-001',
        title: 'Khách hàng TOP20 có xu hướng giảm tần suất mua',
        sourceInsights: ['T01', 'V02'],
        sourceEquity: true,
        severity: 'high',
        priority: 1,
        owner: 'CFO',
        reviewDeadline: '15/01/2026',
        status: 'decided',
        createdAt: '08/01/2026',
        populationSize: 2400,
        equityImpact: 3200000000
      },
      {
        id: 'DC-002',
        title: 'Tỷ lệ hoàn trả tăng đột biến ở danh mục Điện tử',
        sourceInsights: ['E03'],
        severity: 'medium',
        priority: 2,
        owner: 'COO',
        reviewDeadline: '18/01/2026',
        status: 'reviewing',
        createdAt: '10/01/2026',
        populationSize: 850,
        equityImpact: 800000000
      }
    ];
    return [...decisionCards, ...mockDecided];
  }, [decisionCards]);

  // Count by status
  const counts = useMemo(() => ({
    new: allCards.filter(c => c.status === 'new').length,
    reviewing: allCards.filter(c => c.status === 'reviewing').length,
    decided: allCards.filter(c => c.status === 'decided').length,
    archived: allCards.filter(c => c.status === 'archived').length,
  }), [allCards]);

  // Apply filters
  const filteredCards = useMemo(() => {
    return allCards.filter(card => {
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
  }, [allCards, statusFilter, ownerFilter, severityFilter]);

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
