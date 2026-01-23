import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  TrendingUp, 
  ArrowLeftRight, 
  ShoppingCart, 
  Users, 
  AlertTriangle,
  ChevronRight,
  Info,
  Filter,
  Package,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { cn } from '@/lib/utils';
import { 
  DemandInsightCategory, 
  DEMAND_INSIGHT_CATEGORIES,
  getCategoryColor,
  getSeverityStyle,
} from '@/lib/cdp-demand-insight-registry';
import { useCDPDemandIntelligence, DemandInsight, DemandCategory } from '@/hooks/useCDPDemandInsights';

type CategoryFilter = 'all' | DemandCategory;

const categoryIcons: Record<DemandCategory, typeof TrendingUp> = {
  demand_shift: TrendingUp,
  substitution: ArrowLeftRight,
  basket_structure: ShoppingCart,
  product_customer: Users,
  product_risk: AlertTriangle,
};

// Category Summary Cards
function CategorySummaryCards({ 
  categoryCounts, 
  activeCategory, 
  onCategoryClick 
}: { 
  categoryCounts: Record<DemandCategory, { total_count: number; active_count: number }>;
  activeCategory: CategoryFilter;
  onCategoryClick: (category: CategoryFilter) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {(Object.entries(DEMAND_INSIGHT_CATEGORIES) as [DemandInsightCategory, typeof DEMAND_INSIGHT_CATEGORIES[DemandInsightCategory]][]).map(([key, cat]) => {
        const Icon = categoryIcons[key as DemandCategory];
        const isActive = activeCategory === key;
        const count = categoryCounts[key as DemandCategory] || { total_count: 0, active_count: 0 };
        
        return (
          <Card 
            key={key}
            className={cn(
              'cursor-pointer transition-all hover:shadow-sm',
              isActive && 'ring-2 ring-primary'
            )}
            onClick={() => onCategoryClick(isActive ? 'all' : key as DemandCategory)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('p-1.5 rounded', getCategoryColor(key as DemandInsightCategory))}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium truncate">{cat.nameVi}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold">{count.active_count}</span>
                <span className="text-xs text-muted-foreground">/ {count.total_count} phát hiện</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Insight Card Component
function DemandInsightCard({ insight }: { insight: DemandInsight }) {
  const navigate = useNavigate();
  const Icon = categoryIcons[insight.category];
  const categoryInfo = DEMAND_INSIGHT_CATEGORIES[insight.category as DemandInsightCategory];
  
  return (
    <Card 
      className={cn(
        'hover:shadow-sm transition-all cursor-pointer group',
        insight.status === 'cooldown' && 'opacity-60'
      )}
      onClick={() => navigate(`/cdp/insights/${insight.code}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">
                {insight.code}
              </Badge>
              <Badge variant="outline" className={cn('text-xs', getCategoryColor(insight.category as DemandInsightCategory))}>
                <Icon className="w-3 h-3 mr-1" />
                {categoryInfo?.nameVi || insight.category}
              </Badge>
              <Badge className={cn('text-xs', getSeverityStyle(insight.severity))}>
                {insight.severity === 'critical' ? 'Nghiêm trọng' : insight.severity === 'high' ? 'Cần xem xét' : 'Theo dõi'}
              </Badge>
              {insight.status === 'cooldown' && (
                <Badge variant="outline" className="text-xs bg-muted">
                  Cooldown
                </Badge>
              )}
            </div>

            {/* Title */}
            <h3 className="font-medium text-sm mb-3 text-foreground">
              {insight.name_vi}
            </h3>

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground mb-0.5">Nhóm sản phẩm</p>
                <p className="font-medium flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {insight.product_group}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Tập khách bị ảnh hưởng</p>
                <p className="font-medium">{insight.affected_customers.toLocaleString()} khách</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Tỷ trọng doanh thu</p>
                <p className="font-medium">{insight.revenue_contribution}%</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Rủi ro</p>
                <p className="font-medium text-destructive">{insight.risk_vi}</p>
              </div>
            </div>

            {/* Business Meaning */}
            <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
              <p className="flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {insight.business_meaning_vi}
              </p>
            </div>
          </div>

          {/* Right Side - Change Indicator */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className={cn(
                'flex items-center gap-1 text-sm font-semibold',
                insight.shift_direction === 'down' ? 'text-destructive' : 'text-success'
              )}>
                {insight.shift_direction === 'down' ? (
                  <TrendingUp className="w-4 h-4 rotate-180" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                {insight.shift_percent > 0 ? '+' : ''}{insight.shift_percent.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">so với baseline</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DemandInsightsPage() {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cooldown'>('all');
  
  const { insights, categoryCounts, isLoading } = useCDPDemandIntelligence();

  const filteredInsights = useMemo(() => {
    return insights.filter(insight => {
      if (categoryFilter !== 'all' && insight.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && insight.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => {
      const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
      if ((severityOrder[a.severity] ?? 2) !== (severityOrder[b.severity] ?? 2)) {
        return (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
      }
      return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
    });
  }, [insights, categoryFilter, statusFilter]);

  const totalActive = insights.filter(i => i.status === 'active').length;
  const totalCritical = insights.filter(i => i.severity === 'critical').length;

  if (isLoading) {
    return (
      <CDPLayout>
        <Helmet>
          <title>Nhu cầu & Sản phẩm | CDP - Bluecore</title>
        </Helmet>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Đang tải...</span>
        </div>
      </CDPLayout>
    );
  }

  return (
    <CDPLayout>
      <Helmet>
        <title>Nhu cầu & Sản phẩm | CDP - Bluecore</title>
        <meta name="description" content="Phân tích dịch chuyển nhu cầu và cấu trúc chi tiêu theo nhóm sản phẩm" />
      </Helmet>

      <div className="space-y-6">
        {/* Context Banner */}
        <div className="bg-muted/50 border border-border rounded-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-primary/10 rounded">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Demand Intelligence – Không phải Product Analytics</p>
                <p className="text-xs text-muted-foreground">
                  Phân tích cách khách hàng phân bổ chi tiêu • Không hiển thị SKU chi tiết • Mọi insight gắn với tập khách
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <Badge variant="outline">
                <span className="font-semibold text-primary mr-1">{totalActive}</span> 
                insight đang hoạt động
              </Badge>
              {totalCritical > 0 && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                  {totalCritical} nghiêm trọng
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Category Summary */}
        <CategorySummaryCards 
          categoryCounts={categoryCounts}
          activeCategory={categoryFilter}
          onCategoryClick={(cat) => setCategoryFilter(cat)}
        />

        {/* Filter Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {filteredInsights.length} insight
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Đang hoạt động</SelectItem>
                <SelectItem value="cooldown">Cooldown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Insights List */}
        <ScrollArea className="h-[calc(100vh-420px)]">
          <div className="space-y-3 pr-4">
            {filteredInsights.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">Không có insight nào</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hệ thống chưa phát hiện insight về nhu cầu/sản phẩm
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredInsights.map((insight) => (
                <DemandInsightCard key={insight.code} insight={insight} />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer Note */}
        <div className="text-xs text-muted-foreground border-t pt-4">
          <p>
            <strong>Nguyên tắc:</strong> Mỗi insight phản ánh dịch chuyển nhu cầu, không phải hiệu suất sản phẩm. 
            Insight dẫn tới Customer Equity và Thẻ Quyết định.
          </p>
        </div>
      </div>
    </CDPLayout>
  );
}
