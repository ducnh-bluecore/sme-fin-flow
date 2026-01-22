import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
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

// Category labels
const categoryLabels: Record<InsightCategory, string> = {
  value: 'Value & Revenue',
  velocity: 'Purchase Timing',
  mix: 'Monetization Mix',
  risk: 'Risk Signals',
  quality: 'Data Quality'
};

// Severity styles
const severityStyles = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  high: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  medium: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' }
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
              <span className="font-medium text-sm">{insight.definition.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${severityStyle.bg} ${severityStyle.text} ${severityStyle.border}`}>
                {insight.definition.risk.severity.toUpperCase()}
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
                <p className="text-xs text-muted-foreground mb-1">Population Scope</p>
                <p>{insight.population.description}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Change vs Baseline</p>
                <p className={`font-semibold flex items-center gap-1 ${
                  insight.detection.changePercent < 0 ? 'text-red-600' : 'text-emerald-600'
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
                <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                <p className="capitalize">{insight.impact.confidence}</p>
              </div>
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground mb-1">Business Implication</p>
              <p className="text-sm">{insight.statement}</p>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                First detected: {insight.detectedAt.toLocaleDateString('vi-VN')}
              </span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function InsightsPage() {
  const navigate = useNavigate();
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
    <>
      <Helmet>
        <title>Insights | CDP - Bluecore</title>
        <meta name="description" content="CDP Insight Registry - Detected behavioral shifts" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/portal')}
                  className="text-muted-foreground"
                >
                  ← Portal
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div>
                  <h1 className="font-semibold text-lg">Insights</h1>
                  <p className="text-xs text-muted-foreground">Detected Behavioral Shifts</p>
                </div>
              </div>
              
              <nav className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/cdp')}
                  className="text-sm text-muted-foreground"
                >
                  Overview
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/cdp/insights')}
                  className="text-sm font-medium"
                >
                  Insights
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/cdp/populations')}
                  className="text-sm text-muted-foreground"
                >
                  Populations
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/cdp/decision-cards')}
                  className="text-sm text-muted-foreground"
                >
                  Decision Cards
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/cdp/data-confidence')}
                  className="text-sm text-muted-foreground"
                >
                  Data Confidence
                </Button>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
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
                    } ${count > 0 ? 'border-amber-200' : ''}`}
                    onClick={() => setActiveCategory(activeCategory === cat ? 'all' : cat)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between mb-1">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className={`text-lg font-bold ${count > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
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
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="py-3">
                <p className="text-sm text-amber-700">
                  ⚠️ Data coverage below threshold. Some insights may require additional validation.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Insights List */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {activeCategory === 'all' 
                  ? `All Triggered Insights (${sortedInsights.length})`
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
                  Clear Filter
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
                  <Database className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                  <p className="font-medium">No insights triggered</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All metrics are trending within normal thresholds
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
        </main>
      </div>
    </>
  );
}
