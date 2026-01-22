import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { 
  TrendingDown,
  TrendingUp,
  DollarSign,
  Clock,
  Layers,
  ShieldAlert,
  Database,
  ChevronDown,
  ChevronUp,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { useCDPInsightDetection, DetectedInsight } from '@/hooks/useCDPInsightDetection';
import { InsightCategory } from '@/lib/cdp-insight-registry';

// Category icons
const categoryIcons: Record<InsightCategory, typeof DollarSign> = {
  value: DollarSign,
  velocity: Clock,
  mix: Layers,
  risk: ShieldAlert,
  quality: Database
};

// Category labels (Vietnamese)
const categoryLabels: Record<InsightCategory, string> = {
  value: 'Giá trị & Doanh thu',
  velocity: 'Tần suất mua',
  mix: 'Cơ cấu sản phẩm',
  risk: 'Tín hiệu rủi ro',
  quality: 'Chất lượng dữ liệu'
};

// Severity styles (using semantic tokens)
const severityStyles = {
  critical: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20', label: 'NGHIÊM TRỌNG' },
  high: { bg: 'bg-warning/10', text: 'text-warning-foreground', border: 'border-warning/20', label: 'CAO' },
  medium: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', label: 'TRUNG BÌNH' }
};

// Insight row component
function InsightRow({ insight }: { insight: DetectedInsight }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const severityStyle = severityStyles[insight.definition.risk.severity];
  
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-xs">
                {insight.code}
              </Badge>
              <span className="font-medium text-sm">{insight.definition.nameVi || insight.definition.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${severityStyle.bg} ${severityStyle.text} ${severityStyle.border}`}>
                {severityStyle.label}
              </Badge>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            <Separator />
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tập khách hàng</p>
                <p>{insight.population.description}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Thay đổi so với Baseline</p>
                <p className={`font-semibold flex items-center gap-1 ${
                  insight.detection.changePercent < 0 ? 'text-destructive' : 'text-success'
                }`}>
                  {insight.detection.changePercent < 0 ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                  {insight.detection.changePercent.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Độ tin cậy</p>
                <p className="capitalize">{insight.impact.confidence === 'high' ? 'Cao' : insight.impact.confidence === 'medium' ? 'Trung bình' : 'Thấp'}</p>
              </div>
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground mb-1">Hàm ý kinh doanh</p>
              <p className="text-sm">{insight.statement}</p>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Phát hiện lần đầu: {insight.detectedAt.toLocaleDateString('vi-VN')}
              </span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function InsightsPage() {
  const { insights, summary, dataQuality, isLoading } = useCDPInsightDetection();
  const [activeCategory, setActiveCategory] = useState<InsightCategory | 'all'>('all');

  // Group insights by category
  const insightsByCategory = insights.reduce((acc, insight) => {
    const cat = insight.definition.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(insight);
    return acc;
  }, {} as Record<InsightCategory, DetectedInsight[]>);

  // Filter insights
  const filteredInsights = activeCategory === 'all' 
    ? insights 
    : insightsByCategory[activeCategory] || [];

  // Sort by severity
  const sortedInsights = [...filteredInsights].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2 };
    return severityOrder[a.definition.risk.severity] - severityOrder[b.definition.risk.severity];
  });

  return (
    <CDPLayout>
      <Helmet>
        <title>Tín hiệu | CDP - Bluecore</title>
        <meta name="description" content="CDP - Các tín hiệu dịch chuyển hành vi được phát hiện" />
      </Helmet>

      <div className="space-y-6 max-w-5xl">
        {/* Page Header */}
        <div>
          <h1 className="text-xl font-semibold mb-1">Tín hiệu</h1>
          <p className="text-sm text-muted-foreground">Các dịch chuyển hành vi được phát hiện</p>
        </div>

        {/* Summary Stats */}
        <section>
          <div className="grid grid-cols-5 gap-3">
            {(['value', 'velocity', 'mix', 'risk', 'quality'] as InsightCategory[]).map((cat) => {
              const Icon = categoryIcons[cat];
              const count = summary.byCategory[cat] || 0;
              return (
                <Card 
                  key={cat}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    activeCategory === cat ? 'border-primary' : ''
                  } ${count > 0 ? 'border-warning/30' : ''}`}
                  onClick={() => setActiveCategory(activeCategory === cat ? 'all' : cat)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between mb-1">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className={`text-lg font-bold ${count > 0 ? 'text-warning-foreground' : 'text-muted-foreground'}`}>
                        {count}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{categoryLabels[cat]}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Data Quality Warning */}
        {!dataQuality.isReliable && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="py-3">
              <p className="text-sm text-warning-foreground">
                ⚠️ Độ phủ dữ liệu dưới ngưỡng. Một số tín hiệu có thể cần xác thực thêm.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Insights List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              {activeCategory === 'all' 
                ? `Tất cả tín hiệu (${sortedInsights.length})`
                : `${categoryLabels[activeCategory]} (${sortedInsights.length})`
              }
            </h3>
            {activeCategory !== 'all' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveCategory('all')}
                className="text-xs"
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="h-16 animate-pulse bg-muted" />
              ))}
            </div>
          ) : sortedInsights.length === 0 ? (
            <Card className="py-12 text-center">
              <CardContent>
                <Database className="w-8 h-8 text-success mx-auto mb-3" />
                <p className="font-medium">Không có tín hiệu nào được kích hoạt</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tất cả chỉ số đang trong ngưỡng bình thường
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3 pr-4">
                {sortedInsights.map((insight) => (
                  <InsightRow key={insight.code} insight={insight} />
                ))}
              </div>
            </ScrollArea>
          )}
        </section>
      </div>
    </CDPLayout>
  );
}
