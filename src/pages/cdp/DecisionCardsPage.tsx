import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { 
  FileText,
  Users,
  Calendar,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { useCDPInsightDetection } from '@/hooks/useCDPInsightDetection';

// Decision card status styles (using semantic tokens)
const statusStyles = {
  NEW: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/20' },
  REVIEWING: { bg: 'bg-warning/10', text: 'text-warning-foreground', border: 'border-warning/20' },
  DECIDED: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' }
};

// Owner role styles
const ownerStyles = {
  CEO: 'bg-primary/10 text-primary',
  CFO: 'bg-info/10 text-info',
  COO: 'bg-muted text-muted-foreground',
  Growth: 'bg-success/10 text-success'
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
  const { insights, isLoading } = useCDPInsightDetection();
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
    <CDPLayout>
      <Helmet>
        <title>Decision Cards | CDP - Bluecore</title>
        <meta name="description" content="Executive decision cards from CDP insights" />
      </Helmet>

      <div className="space-y-8 max-w-5xl">
        {/* Page Header */}
        <div>
          <h1 className="text-xl font-semibold mb-1">Decision Cards</h1>
          <p className="text-sm text-muted-foreground">Executive Governance</p>
        </div>

        {/* Summary */}
        <section>
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-info/30 bg-info/5">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-info">{cardsByStatus.new.length}</p>
                <p className="text-sm text-info/80">New</p>
              </CardContent>
            </Card>
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-warning-foreground">{cardsByStatus.reviewing.length}</p>
                <p className="text-sm text-warning-foreground/80">Reviewing</p>
              </CardContent>
            </Card>
            <Card className="border-success/30 bg-success/5">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-success">{cardsByStatus.decided.length}</p>
                <p className="text-sm text-success/80">Decided</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Governance Explainer */}
        <Card className="border-border bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">
                  Decision Cards are governance artifacts, not task lists
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
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
                  <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-3" />
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
      </div>
    </CDPLayout>
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
