import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { 
  FileText,
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCDPInsightDetection } from '@/hooks/useCDPInsightDetection';

// Decision card status styles
const statusStyles = {
  NEW: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  REVIEWING: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  DECIDED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' }
};

// Owner role styles
const ownerStyles = {
  CEO: 'bg-violet-100 text-violet-700',
  CFO: 'bg-blue-100 text-blue-700',
  COO: 'bg-slate-100 text-slate-700',
  Growth: 'bg-emerald-100 text-emerald-700'
};

// Decision Card component
function DecisionCard({ 
  title,
  sourceInsights,
  population,
  whatChanged,
  whyItMatters,
  owner,
  reviewBy,
  decisionDue,
  status
}: { 
  title: string;
  sourceInsights: string[];
  population: string;
  whatChanged: string;
  whyItMatters: string;
  owner: 'CEO' | 'CFO' | 'COO' | 'Growth';
  reviewBy: string;
  decisionDue: string;
  status: 'NEW' | 'REVIEWING' | 'DECIDED';
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusStyle = statusStyles[status];
  
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                  {status}
                </Badge>
                <Badge className={ownerStyles[owner]}>
                  {owner}
                </Badge>
              </div>
              <CardTitle className="text-base leading-tight">{title}</CardTitle>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          {/* Source insights */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <FileText className="w-3.5 h-3.5" />
            Source: {sourceInsights.join(', ')}
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <Separator />
            
            {/* Population */}
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Users className="w-3.5 h-3.5" />
                Population Impacted
              </div>
              <p className="text-sm">{population}</p>
            </div>
            
            {/* What changed */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">What Changed</div>
              <p className="text-sm font-medium">{whatChanged}</p>
            </div>
            
            {/* Why it matters */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Why This Matters</div>
              <p className="text-sm text-muted-foreground">{whyItMatters}</p>
            </div>
            
            <Separator />
            
            {/* Governance */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="w-3.5 h-3.5" />
                  Review by: <span className="text-foreground font-medium">{reviewBy}</span>
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  Decision due: <span className="text-foreground font-medium">{decisionDue}</span>
                </span>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function DecisionCardsPage() {
  const navigate = useNavigate();
  const { insights, summary, isLoading } = useCDPInsightDetection();
  const [activeTab, setActiveTab] = useState<'new' | 'reviewing' | 'decided'>('new');

  // Transform insights into decision cards
  const decisionCards = insights
    .filter((i) => i.definition.risk.severity === 'critical' || i.definition.risk.severity === 'high')
    .map((insight) => ({
      id: insight.code,
      title: insight.decisionPrompt || `Review ${insight.definition.name}`,
      sourceInsights: [insight.code],
      population: insight.population.description,
      whatChanged: `${insight.definition.detection.metric} shifted ${insight.detection.changePercent.toFixed(1)}% vs baseline`,
      whyItMatters: insight.statement,
      owner: getOwnerFromCategory(insight.definition.category) as 'CEO' | 'CFO' | 'COO' | 'Growth',
      reviewBy: formatDate(addDays(new Date(), 3)),
      decisionDue: formatDate(addDays(new Date(), 7)),
      status: 'NEW' as const
    }));

  const cardsByStatus = {
    new: decisionCards,
    reviewing: [] as typeof decisionCards,
    decided: [] as typeof decisionCards
  };

  return (
    <>
      <Helmet>
        <title>Decision Cards | CDP - Bluecore</title>
        <meta name="description" content="Executive decision cards from CDP insights" />
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
                  <h1 className="font-semibold text-lg">Decision Cards</h1>
                  <p className="text-xs text-muted-foreground">Executive Governance</p>
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
                  className="text-sm text-muted-foreground"
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
                  className="text-sm font-medium"
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

        <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          {/* Summary */}
          <section>
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{cardsByStatus.new.length}</p>
                  <p className="text-sm text-blue-600">New</p>
                </CardContent>
              </Card>
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{cardsByStatus.reviewing.length}</p>
                  <p className="text-sm text-amber-600">Reviewing</p>
                </CardContent>
              </Card>
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{cardsByStatus.decided.length}</p>
                  <p className="text-sm text-emerald-600">Decided</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Governance Explainer */}
          <Card className="border-slate-200 bg-slate-50/50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    Decision Cards are governance artifacts, not task lists
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Each card represents a strategic question that requires executive review. 
                    Cards capture the evidence snapshot at creation time and track ownership 
                    through the decision lifecycle. No operational actions are executed from this screen.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards by Status */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList>
              <TabsTrigger value="new" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                New ({cardsByStatus.new.length})
              </TabsTrigger>
              <TabsTrigger value="reviewing" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Reviewing ({cardsByStatus.reviewing.length})
              </TabsTrigger>
              <TabsTrigger value="decided" className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Decided ({cardsByStatus.decided.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="mt-6 space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="h-32 animate-pulse bg-muted" />
                  ))}
                </div>
              ) : cardsByStatus.new.length === 0 ? (
                <Card className="py-12 text-center">
                  <CardContent>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                    <p className="font-medium">No new decision cards</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All high-severity insights have been reviewed
                    </p>
                  </CardContent>
                </Card>
              ) : (
                cardsByStatus.new.map((card) => (
                  <DecisionCard key={card.id} {...card} />
                ))
              )}
            </TabsContent>

            <TabsContent value="reviewing" className="mt-6 space-y-4">
              {cardsByStatus.reviewing.length === 0 ? (
                <Card className="py-12 text-center">
                  <CardContent>
                    <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium">No cards under review</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Move cards from "New" to begin review
                    </p>
                  </CardContent>
                </Card>
              ) : (
                cardsByStatus.reviewing.map((card) => (
                  <DecisionCard key={card.id} {...card} />
                ))
              )}
            </TabsContent>

            <TabsContent value="decided" className="mt-6 space-y-4">
              {cardsByStatus.decided.length === 0 ? (
                <Card className="py-12 text-center">
                  <CardContent>
                    <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium">No decided cards yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Completed decisions will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                cardsByStatus.decided.map((card) => (
                  <DecisionCard key={card.id} {...card} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}

// Helper functions
function getOwnerFromCategory(category: string): string {
  const mapping: Record<string, string> = {
    value: 'CFO',
    velocity: 'COO',
    mix: 'Growth',
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
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' });
}
