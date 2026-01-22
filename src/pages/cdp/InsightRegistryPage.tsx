import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, 
  Clock, 
  Shuffle, 
  AlertTriangle, 
  UserCheck,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Info,
  CheckCircle2,
  XCircle,
  ChevronRight
} from 'lucide-react';
import { useCDPInsightDetection, DetectedInsight } from '@/hooks/useCDPInsightDetection';
import { 
  CDP_INSIGHT_REGISTRY, 
  INSIGHT_CATEGORIES,
  InsightCategory,
  InsightCode,
  getSeverityColor,
  getCategoryColor
} from '@/lib/cdp-insight-registry';

const categoryIcons: Record<InsightCategory, React.ReactNode> = {
  value: <DollarSign className="h-4 w-4" />,
  velocity: <Clock className="h-4 w-4" />,
  mix: <Shuffle className="h-4 w-4" />,
  risk: <AlertTriangle className="h-4 w-4" />,
  quality: <UserCheck className="h-4 w-4" />,
};

function formatCurrency(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString('vi-VN');
}

function InsightCard({ insight }: { insight: DetectedInsight }) {
  const [expanded, setExpanded] = useState(false);
  const { definition, detection, population, impact } = insight;
  
  return (
    <Card className={`p-4 border-l-4 ${
      definition.risk.severity === 'critical' ? 'border-l-red-500' :
      definition.risk.severity === 'high' ? 'border-l-orange-500' :
      'border-l-amber-500'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={getCategoryColor(definition.category)}>
              {categoryIcons[definition.category]}
              <span className="ml-1">{insight.code}</span>
            </Badge>
            <Badge className={getSeverityColor(definition.risk.severity)}>
              {definition.risk.severity.toUpperCase()}
            </Badge>
          </div>
          
          <h3 className="font-semibold text-foreground mb-1">{definition.nameVi}</h3>
          <p className="text-sm text-muted-foreground mb-3">{insight.statement}</p>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Population</span>
              <p className="font-medium">{population.customerCount.toLocaleString()} khách</p>
              <p className="text-xs text-muted-foreground">{population.revenueContribution.toFixed(1)}% doanh thu</p>
            </div>
            <div>
              <span className="text-muted-foreground">Thay đổi</span>
              <p className={`font-medium flex items-center gap-1 ${
                detection.direction === 'down' ? 'text-red-600' : 'text-orange-600'
              }`}>
                {detection.direction === 'down' ? 
                  <TrendingDown className="h-3 w-3" /> : 
                  <TrendingUp className="h-3 w-3" />
                }
                {detection.changePercent > 0 ? '+' : ''}{detection.changePercent.toFixed(1)}%
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Impact</span>
              <p className="font-medium">{impact.estimatedAmount > 0 ? formatCurrency(impact.estimatedAmount) : 'Rủi ro forecast'}</p>
              <p className="text-xs text-muted-foreground">{impact.timeHorizon}</p>
            </div>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
          <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </Button>
      </div>
      
      {expanded && (
        <div className="mt-4 pt-4 border-t">
          <div className="bg-muted/50 rounded-lg p-3 mb-3">
            <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Decision Prompt
            </h4>
            <p className="text-sm text-foreground">{insight.decisionPrompt}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Risk Type</span>
              <p className="font-medium">{definition.risk.primary}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Financial Impact</span>
              <p className="font-medium capitalize">{definition.risk.financialImpactType}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Detection Window</span>
              <p className="font-medium">{definition.detection.windowDays} ngày</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cooldown</span>
              <p className="font-medium">{definition.cooldownDays} ngày</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function RegistryOverview({ triggeredCodes }: { triggeredCodes: Set<InsightCode> }) {
  return (
    <div className="space-y-4">
      {(Object.entries(INSIGHT_CATEGORIES) as [InsightCategory, typeof INSIGHT_CATEGORIES[InsightCategory]][]).map(([category, meta]) => {
        const insights = Object.values(CDP_INSIGHT_REGISTRY).filter(i => i.category === category);
        const triggeredCount = insights.filter(i => triggeredCodes.has(i.code)).length;
        
        return (
          <Card key={category} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {categoryIcons[category]}
                <h3 className="font-semibold">{meta.nameVi}</h3>
                <Badge variant="outline">{meta.count} insights</Badge>
              </div>
              <div className="flex items-center gap-2">
                {triggeredCount > 0 && (
                  <Badge className="bg-red-100 text-red-700">{triggeredCount} triggered</Badge>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {insights.map(insight => {
                const isTriggered = triggeredCodes.has(insight.code);
                return (
                  <div 
                    key={insight.code}
                    className={`flex items-center gap-2 p-2 rounded text-sm ${
                      isTriggered ? 'bg-red-50 text-red-700' : 'bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    {isTriggered ? 
                      <XCircle className="h-3 w-3 flex-shrink-0" /> : 
                      <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                    }
                    <span className="font-mono text-xs">{insight.code}</span>
                    <span className="truncate">{insight.nameVi}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default function InsightRegistryPage() {
  const { insights, summary, isLoading, dataQuality } = useCDPInsightDetection();
  const [activeTab, setActiveTab] = useState<'triggered' | 'registry'>('triggered');
  
  const triggeredCodes = new Set(insights.map(i => i.code));
  
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">CDP Insight Registry v1</h1>
        <p className="text-muted-foreground">25 hard-coded insights với logic phát hiện cố định</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold">25</p>
          <p className="text-sm text-muted-foreground">Tổng Insights</p>
        </Card>
        <Card className="p-4 text-center bg-red-50">
          <p className="text-3xl font-bold text-red-600">{summary.triggered}</p>
          <p className="text-sm text-muted-foreground">Triggered</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{summary.bySeverity.critical}</p>
          <p className="text-sm text-muted-foreground">Critical</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-orange-600">{summary.bySeverity.high}</p>
          <p className="text-sm text-muted-foreground">High</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{summary.bySeverity.medium}</p>
          <p className="text-sm text-muted-foreground">Medium</p>
        </Card>
      </div>

      {/* Data Quality Warning */}
      {!dataQuality.isReliable && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">Cảnh báo chất lượng dữ liệu</h3>
              <p className="text-sm text-amber-700">
                Identity Coverage: {dataQuality.identityCoverage.toFixed(1)}% | 
                COGS Coverage: {dataQuality.cogsCoverage.toFixed(1)}%
              </p>
              <p className="text-sm text-amber-600 mt-1">
                Insights có thể không chính xác do dữ liệu không đầy đủ.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="triggered" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Triggered ({summary.triggered})
          </TabsTrigger>
          <TabsTrigger value="registry" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Full Registry (25)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="triggered" className="mt-4">
          {insights.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-lg">Không có insight nào triggered</h3>
              <p className="text-muted-foreground">Tất cả metrics đang trong ngưỡng bình thường.</p>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {insights
                  .sort((a, b) => {
                    const severityOrder = { critical: 0, high: 1, medium: 2 };
                    return severityOrder[a.definition.risk.severity] - severityOrder[b.definition.risk.severity];
                  })
                  .map(insight => (
                    <InsightCard key={insight.code} insight={insight} />
                  ))
                }
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="registry" className="mt-4">
          <RegistryOverview triggeredCodes={triggeredCodes} />
        </TabsContent>
      </Tabs>

      {/* Category Breakdown */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Phân bố theo Category</h3>
        <div className="grid grid-cols-5 gap-4">
          {(Object.entries(INSIGHT_CATEGORIES) as [InsightCategory, typeof INSIGHT_CATEGORIES[InsightCategory]][]).map(([category, meta]) => (
            <div key={category} className="text-center">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${getCategoryColor(category)} mb-2`}>
                {categoryIcons[category]}
              </div>
              <p className="text-sm font-medium">{meta.nameVi}</p>
              <p className="text-xs text-muted-foreground">
                {summary.byCategory[category]} / {meta.count} triggered
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
