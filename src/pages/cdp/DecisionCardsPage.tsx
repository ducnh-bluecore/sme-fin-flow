import { Helmet } from 'react-helmet-async';
import { useState, useMemo } from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { DecisionLayout } from '@/components/cdp/decisions/DecisionLayout';
import { DecisionQueueCard, DecisionCardData } from '@/components/cdp/decisions/DecisionQueueCard';
import { DecisionQueueFilters } from '@/components/cdp/decisions/DecisionQueueFilters';
import { useCDPDecisionCards } from '@/hooks/useCDPDecisionCards';

// Helper functions
function getOwnerFromRole(role: string): 'CEO' | 'CFO' | 'COO' {
  const normalized = role?.toUpperCase();
  if (normalized === 'CFO') return 'CFO';
  if (normalized === 'COO' || normalized === 'OPS') return 'COO';
  return 'CEO';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function mapStatus(status: string): 'new' | 'reviewing' | 'decided' | 'archived' {
  const statusMap: Record<string, 'new' | 'reviewing' | 'decided' | 'archived'> = {
    'NEW': 'new',
    'IN_REVIEW': 'reviewing',
    'DECIDED': 'decided',
    'ARCHIVED': 'archived',
  };
  return statusMap[status] || 'new';
}

function mapSeverity(severity: string): 'low' | 'medium' | 'high' {
  const severityMap: Record<string, 'low' | 'medium' | 'high'> = {
    'CRITICAL': 'high',
    'HIGH': 'high',
    'MEDIUM': 'medium',
    'LOW': 'low',
  };
  return severityMap[severity] || 'medium';
}

function mapPriority(priority: string): number {
  const priorityMap: Record<string, number> = {
    'P0': 0,
    'P1': 1,
    'P2': 2,
    'P3': 3,
  };
  return priorityMap[priority] ?? 2;
}

export default function DecisionCardsPage() {
  const { data: cards = [], isLoading } = useCDPDecisionCards();
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Transform DB cards into UI format
  const decisionCards: DecisionCardData[] = useMemo(() => {
    return cards.map((card): DecisionCardData => ({
      id: card.id,
      title: card.title,
      sourceInsights: card.source_ref?.insight_code 
        ? [String(card.source_ref.insight_code)] 
        : card.source_ref?.code 
          ? [String(card.source_ref.code)]
          : [],
      sourceEquity: card.category === 'VALUE' || card.category === 'EQUITY',
      severity: mapSeverity(card.severity),
      priority: mapPriority(card.priority),
      owner: getOwnerFromRole(card.owner_role),
      reviewDeadline: card.review_by 
        ? formatDate(new Date(card.review_by)) 
        : card.decision_due 
          ? formatDate(new Date(card.decision_due))
          : '',
      status: mapStatus(card.status),
      createdAt: formatDate(new Date(card.created_at)),
      populationSize: undefined,
      equityImpact: undefined
    }));
  }, [cards]);

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
