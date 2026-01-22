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
  Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  getDemandInsightsByCategory
} from '@/lib/cdp-demand-insight-registry';

// Category filter type
type CategoryFilter = 'all' | DemandInsightCategory;

const categoryIcons: Record<DemandInsightCategory, typeof TrendingUp> = {
  demand_shift: TrendingUp,
  substitution: ArrowLeftRight,
  basket_structure: ShoppingCart,
  product_customer: Users,
  product_risk: AlertTriangle,
};

// Mock detected insights (would come from detection engine)
interface DetectedDemandInsight {
  code: string;
  category: DemandInsightCategory;
  nameVi: string;
  description: string;
  severity: 'critical' | 'high' | 'medium';
  productGroup: string;
  affectedCustomers: number;
  revenueContribution: number;
  shiftPercent: number;
  shiftDirection: 'up' | 'down';
  businessMeaningVi: string;
  riskVi: string;
  detectedAt: Date;
  status: 'active' | 'cooldown';
}

const mockDetectedInsights: DetectedDemandInsight[] = [
  {
    code: 'D01',
    category: 'demand_shift',
    nameVi: 'Tỷ trọng chi tiêu cho nhóm Điện tử giảm đáng kể',
    description: 'Tỷ trọng chi tiêu vào nhóm sản phẩm chính giảm 18% so với baseline',
    severity: 'high',
    productGroup: 'Điện tử',
    affectedCustomers: 4523,
    revenueContribution: 32,
    shiftPercent: -18.5,
    shiftDirection: 'down',
    businessMeaningVi: 'Khách hàng đang phân bổ lại chi tiêu ra khỏi nhóm điện tử, cho thấy tiềm năng thay đổi cấu trúc nhu cầu.',
    riskVi: 'Xói mòn nhóm sản phẩm chủ lực',
    detectedAt: new Date('2025-01-20'),
    status: 'active',
  },
  {
    code: 'S04',
    category: 'substitution',
    nameVi: 'Sự thay thế diễn ra mạnh ở khách giá trị cao',
    description: 'Top 20% khách hàng chuyển từ nhóm Gia dụng sang nhóm Thời trang',
    severity: 'critical',
    productGroup: 'Gia dụng → Thời trang',
    affectedCustomers: 1256,
    revenueContribution: 45,
    shiftPercent: 24.3,
    shiftDirection: 'up',
    businessMeaningVi: 'Khách hàng có giá trị nhất đang thay đổi sở thích sản phẩm, rủi ro tài sản khách hàng cao.',
    riskVi: 'Thay đổi hành vi khách cốt lõi',
    detectedAt: new Date('2025-01-19'),
    status: 'active',
  },
  {
    code: 'B03',
    category: 'basket_structure',
    nameVi: 'Tỷ lệ cross-category giảm',
    description: 'Khách mua lại mua từ ít nhóm sản phẩm hơn mỗi đơn',
    severity: 'high',
    productGroup: 'Đa nhóm',
    affectedCustomers: 6789,
    revenueContribution: 58,
    shiftPercent: -22.1,
    shiftDirection: 'down',
    businessMeaningVi: 'Khách hàng tương tác với ít dòng sản phẩm hơn, có thể hạn chế mở rộng giá trị tương lai.',
    riskVi: 'Thu hẹp tương tác',
    detectedAt: new Date('2025-01-18'),
    status: 'active',
  },
  {
    code: 'P01',
    category: 'product_customer',
    nameVi: 'Khách CLV cao giảm mua nhóm Mỹ phẩm',
    description: 'Top 20% khách hàng giảm 17% chi tiêu vào nhóm Mỹ phẩm',
    severity: 'critical',
    productGroup: 'Mỹ phẩm',
    affectedCustomers: 2134,
    revenueContribution: 38,
    shiftPercent: -17.2,
    shiftDirection: 'down',
    businessMeaningVi: 'Khách hàng tốt nhất đang thay đổi mối quan hệ với sản phẩm cốt lõi, chỉ báo sớm rời bỏ.',
    riskVi: 'Tín hiệu ly khai khách cốt lõi',
    detectedAt: new Date('2025-01-17'),
    status: 'active',
  },
  {
    code: 'X05',
    category: 'product_risk',
    nameVi: 'Doanh thu phụ thuộc quá nhiều vào nhóm Thực phẩm',
    description: 'Nhóm Thực phẩm chiếm 52% tổng doanh thu, vượt ngưỡng rủi ro',
    severity: 'critical',
    productGroup: 'Thực phẩm',
    affectedCustomers: 12450,
    revenueContribution: 52,
    shiftPercent: 8.3,
    shiftDirection: 'up',
    businessMeaningVi: 'Phụ thuộc quá mức vào một nhóm sản phẩm tạo tính dễ tổn thương cho doanh nghiệp.',
    riskVi: 'Điểm thất bại đơn lẻ',
    detectedAt: new Date('2025-01-16'),
    status: 'cooldown',
  },
  {
    code: 'D02',
    category: 'demand_shift',
    nameVi: 'Tỷ trọng chi tiêu cho Phụ kiện tăng ở khách mua lại',
    description: 'Khách mua lại tăng 25% chi tiêu vào nhóm Phụ kiện',
    severity: 'medium',
    productGroup: 'Phụ kiện',
    affectedCustomers: 5678,
    revenueContribution: 18,
    shiftPercent: 25.4,
    shiftDirection: 'up',
    businessMeaningVi: 'Khách mua lại cho thấy xu hướng ưa thích nhóm sản phẩm mới, có thể là dấu hiệu tiến hóa danh mục.',
    riskVi: 'Tái phân bổ nhu cầu',
    detectedAt: new Date('2025-01-15'),
    status: 'active',
  },
];

// Category Summary Cards
function CategorySummaryCards({ 
  insights, 
  activeCategory, 
  onCategoryClick 
}: { 
  insights: DetectedDemandInsight[]; 
  activeCategory: CategoryFilter;
  onCategoryClick: (category: CategoryFilter) => void;
}) {
  const categoryCounts = useMemo(() => {
    const counts: Record<DemandInsightCategory, { total: number; active: number }> = {
      demand_shift: { total: 0, active: 0 },
      substitution: { total: 0, active: 0 },
      basket_structure: { total: 0, active: 0 },
      product_customer: { total: 0, active: 0 },
      product_risk: { total: 0, active: 0 },
    };
    
    insights.forEach(insight => {
      counts[insight.category].total++;
      if (insight.status === 'active') {
        counts[insight.category].active++;
      }
    });
    
    return counts;
  }, [insights]);

  return (
    <div className="grid grid-cols-5 gap-3">
      {(Object.entries(DEMAND_INSIGHT_CATEGORIES) as [DemandInsightCategory, typeof DEMAND_INSIGHT_CATEGORIES[DemandInsightCategory]][]).map(([key, cat]) => {
        const Icon = categoryIcons[key];
        const isActive = activeCategory === key;
        const count = categoryCounts[key];
        
        return (
          <Card 
            key={key}
            className={cn(
              'cursor-pointer transition-all hover:shadow-sm',
              isActive && 'ring-2 ring-primary'
            )}
            onClick={() => onCategoryClick(isActive ? 'all' : key)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('p-1.5 rounded', getCategoryColor(key))}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium truncate">{cat.nameVi}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold">{count.active}</span>
                <span className="text-xs text-muted-foreground">/ {count.total} phát hiện</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Insight Card Component
function DemandInsightCard({ insight }: { insight: DetectedDemandInsight }) {
  const navigate = useNavigate();
  const Icon = categoryIcons[insight.category];
  const categoryInfo = DEMAND_INSIGHT_CATEGORIES[insight.category];
  
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
              <Badge variant="outline" className={cn('text-xs', getCategoryColor(insight.category))}>
                <Icon className="w-3 h-3 mr-1" />
                {categoryInfo.nameVi}
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
              {insight.nameVi}
            </h3>

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground mb-0.5">Nhóm sản phẩm</p>
                <p className="font-medium flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {insight.productGroup}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Tập khách bị ảnh hưởng</p>
                <p className="font-medium">{insight.affectedCustomers.toLocaleString()} khách</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Tỷ trọng doanh thu</p>
                <p className="font-medium">{insight.revenueContribution}%</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Rủi ro</p>
                <p className="font-medium text-destructive">{insight.riskVi}</p>
              </div>
            </div>

            {/* Business Meaning */}
            <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
              <p className="flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {insight.businessMeaningVi}
              </p>
            </div>
          </div>

          {/* Right Side - Change Indicator */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className={cn(
                'flex items-center gap-1 text-sm font-semibold',
                insight.shiftDirection === 'down' ? 'text-destructive' : 'text-success'
              )}>
                {insight.shiftDirection === 'down' ? (
                  <TrendingUp className="w-4 h-4 rotate-180" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                {insight.shiftPercent > 0 ? '+' : ''}{insight.shiftPercent.toFixed(1)}%
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
  
  const filteredInsights = useMemo(() => {
    return mockDetectedInsights.filter(insight => {
      if (categoryFilter !== 'all' && insight.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && insight.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => {
      // Sort by severity first, then by date
      const severityOrder = { critical: 0, high: 1, medium: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.detectedAt.getTime() - a.detectedAt.getTime();
    });
  }, [categoryFilter, statusFilter]);

  const totalActive = mockDetectedInsights.filter(i => i.status === 'active').length;
  const totalCritical = mockDetectedInsights.filter(i => i.severity === 'critical').length;

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
          insights={mockDetectedInsights}
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
                  <p className="text-sm font-medium">Không có insight nào phù hợp</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Thử thay đổi bộ lọc để xem thêm insight
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
