import { Helmet } from 'react-helmet-async';
import { 
  Users, 
  Layers,
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { useCDPData } from '@/hooks/useCDPData';

// Stability indicator
function StabilityBadge({ stability }: { stability: 'stable' | 'drifting' | 'volatile' }) {
  const styles = {
    stable: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', icon: Minus },
    drifting: { bg: 'bg-warning/10', text: 'text-warning-foreground', border: 'border-warning/20', icon: TrendingUp },
    volatile: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20', icon: TrendingDown }
  };
  
  const style = styles[stability];
  const Icon = style.icon;
  
  return (
    <Badge variant="outline" className={`${style.bg} ${style.text} ${style.border}`}>
      <Icon className="w-3 h-3 mr-1" />
      {stability.charAt(0).toUpperCase() + stability.slice(1)}
    </Badge>
  );
}

// Population card component
function PopulationCard({ 
  name,
  type,
  definition,
  size,
  revenueShare,
  stability,
  metrics
}: { 
  name: string;
  type: 'segment' | 'cohort' | 'tier';
  definition: string;
  size: number;
  revenueShare: number;
  stability: 'stable' | 'drifting' | 'volatile';
  metrics: string[];
}) {
  const typeStyles = {
    segment: { color: 'text-info', bg: 'bg-info/10' },
    cohort: { color: 'text-primary', bg: 'bg-primary/10' },
    tier: { color: 'text-warning-foreground', bg: 'bg-warning/10' }
  };
  
  const typeStyle = typeStyles[type];
  
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${typeStyle.bg} ${typeStyle.color} border-0 text-xs uppercase`}>
              {type}
            </Badge>
            <CardTitle className="text-base">{name}</CardTitle>
          </div>
          <StabilityBadge stability={stability} />
        </div>
        <CardDescription className="text-sm mt-2">
          {definition}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Size</p>
            <p className="font-semibold">{size.toLocaleString()} customers</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Revenue Share</p>
            <p className="font-semibold">{revenueShare.toFixed(1)}%</p>
          </div>
        </div>
        
        <div>
          <p className="text-xs text-muted-foreground mb-2">Key Metrics (read-only)</p>
          <div className="flex flex-wrap gap-1.5">
            {metrics.map((metric) => (
              <Badge key={metric} variant="secondary" className="text-xs font-normal">
                {metric}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PopulationsPage() {
  const { segmentSummaries, summaryStats, isLoading } = useCDPData();

  // Transform segment data into population definitions
  const segments = segmentSummaries.map((seg) => ({
    name: seg.name,
    type: 'segment' as const,
    definition: getSegmentDefinition(seg.name),
    size: seg.customerCount,
    revenueShare: seg.totalRevenue / (summaryStats.totalRevenue || 1) * 100,
    stability: getStability(seg.trend),
    metrics: ['Net Revenue', 'AOV', 'Frequency']
  }));

  // Value tiers (derived from percentile logic)
  const valueTiers = [
    {
      name: 'TOP10',
      type: 'tier' as const,
      definition: 'Top 10% of customers by 365-day net revenue',
      size: Math.round(summaryStats.totalCustomers * 0.1),
      revenueShare: summaryStats.top20Percent * 0.6,
      stability: 'stable' as const,
      metrics: ['Net Revenue 365d', 'Margin', 'Frequency']
    },
    {
      name: 'TOP20',
      type: 'tier' as const,
      definition: 'Top 11-20% of customers by 365-day net revenue',
      size: Math.round(summaryStats.totalCustomers * 0.1),
      revenueShare: summaryStats.top20Percent * 0.4,
      stability: 'stable' as const,
      metrics: ['Net Revenue 365d', 'Margin', 'Frequency']
    },
    {
      name: 'TOP30',
      type: 'tier' as const,
      definition: 'Top 21-30% of customers by 365-day net revenue',
      size: Math.round(summaryStats.totalCustomers * 0.1),
      revenueShare: Math.max(0, 100 - summaryStats.top20Percent) * 0.3,
      stability: 'drifting' as const,
      metrics: ['Net Revenue 365d', 'AOV']
    },
    {
      name: 'REST',
      type: 'tier' as const,
      definition: 'Bottom 70% of customers by 365-day net revenue',
      size: Math.round(summaryStats.totalCustomers * 0.7),
      revenueShare: Math.max(0, 100 - summaryStats.top20Percent) * 0.7,
      stability: 'volatile' as const,
      metrics: ['Net Revenue 365d']
    }
  ];

  // Example cohorts (time-based)
  const cohorts = [
    {
      name: 'Q4-2024 Acquired',
      type: 'cohort' as const,
      definition: 'Customers with first purchase in Oct-Dec 2024',
      size: Math.round(summaryStats.totalCustomers * 0.15),
      revenueShare: 8.5,
      stability: 'drifting' as const,
      metrics: ['Time-to-2nd Purchase', 'AOV', '90d Retention']
    },
    {
      name: 'Q3-2024 Acquired',
      type: 'cohort' as const,
      definition: 'Customers with first purchase in Jul-Sep 2024',
      size: Math.round(summaryStats.totalCustomers * 0.18),
      revenueShare: 12.3,
      stability: 'stable' as const,
      metrics: ['Time-to-2nd Purchase', 'AOV', '90d Retention']
    }
  ];

  return (
    <CDPLayout>
      <Helmet>
        <title>Populations | CDP - Bluecore</title>
        <meta name="description" content="Customer population definitions - Segments, Cohorts, and Value Tiers" />
      </Helmet>

      <div className="space-y-8 max-w-5xl">
        {/* Page Header */}
        <div>
          <h1 className="text-xl font-semibold mb-1">Populations</h1>
          <p className="text-sm text-muted-foreground">Segments, Cohorts, Value Tiers</p>
        </div>

        {/* Explanatory Header */}
        <Card className="border-border bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">
                  This screen explains HOW customers are grouped, not WHO they are
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Populations are the unit of analysis in CDP. All insights and decision cards 
                  reference populations, not individual customers. Definitions are versioned 
                  and read-only to maintain analytical integrity.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Population Types */}
        <Tabs defaultValue="tiers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tiers" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Value Tiers
            </TabsTrigger>
            <TabsTrigger value="segments" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Segments
            </TabsTrigger>
            <TabsTrigger value="cohorts" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Cohorts
            </TabsTrigger>
          </TabsList>

          {/* Value Tiers */}
          <TabsContent value="tiers" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Value Tiers</h3>
                <p className="text-sm text-muted-foreground">
                  Customers grouped by 365-day net revenue percentile
                </p>
              </div>
              <Badge variant="outline">{valueTiers.length} tiers</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {valueTiers.map((tier) => (
                <PopulationCard key={tier.name} {...tier} />
              ))}
            </div>
          </TabsContent>

          {/* Segments */}
          <TabsContent value="segments" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Behavioral Segments</h3>
                <p className="text-sm text-muted-foreground">
                  Logic-based customer groupings with versioned definitions
                </p>
              </div>
              <Badge variant="outline">{segments.length} segments</Badge>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="h-48 animate-pulse bg-muted" />
                ))}
              </div>
            ) : segments.length === 0 ? (
              <Card className="py-12 text-center">
                <CardContent>
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">No segments defined</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Segments are configured in the CDP registry
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {segments.map((seg) => (
                  <PopulationCard key={seg.name} {...seg} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Cohorts */}
          <TabsContent value="cohorts" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Acquisition Cohorts</h3>
                <p className="text-sm text-muted-foreground">
                  Time-based groupings for lifecycle economics analysis
                </p>
              </div>
              <Badge variant="outline">{cohorts.length} cohorts</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cohorts.map((cohort) => (
                <PopulationCard key={cohort.name} {...cohort} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </CDPLayout>
  );
}

// Helper functions
function getSegmentDefinition(name: string): string {
  const definitions: Record<string, string> = {
    'Elite': 'Customers in top 10% by lifetime revenue with 3+ purchases',
    'High Value': 'Customers in 75-90th percentile by revenue',
    'Medium Value': 'Customers in 50-75th percentile by revenue',
    'Low Value': 'Customers in 25-50th percentile by revenue',
    'At Risk': 'Customers with declining purchase frequency or AOV'
  };
  return definitions[name] || `Customers classified as ${name} based on behavioral patterns`;
}

function getStability(trend: 'up' | 'down' | 'stable'): 'stable' | 'drifting' | 'volatile' {
  if (trend === 'stable') return 'stable';
  if (trend === 'down') return 'volatile';
  return 'drifting';
}
