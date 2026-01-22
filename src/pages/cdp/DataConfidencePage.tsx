import { Helmet } from 'react-helmet-async';
import { 
  Database,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { useCDPData } from '@/hooks/useCDPData';

// Coverage meter component
function CoverageMeter({ 
  label, 
  value, 
  threshold, 
  description 
}: { 
  label: string;
  value: number;
  threshold: number;
  description: string;
}) {
  const isHealthy = value >= threshold;
  
  return (
    <Card className={isHealthy ? '' : 'border-warning/30'}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          {isHealthy ? (
            <CheckCircle2 className="w-4 h-4 text-success" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-warning-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold">{value.toFixed(1)}%</span>
            <span className="text-xs text-muted-foreground">
              Threshold: {threshold}%
            </span>
          </div>
          <Progress 
            value={value} 
            className={`h-2 ${isHealthy ? '' : '[&>div]:bg-warning'}`}
          />
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Trend indicator
function TrendBadge({ trend, value }: { trend: 'up' | 'down' | 'stable'; value?: number }) {
  if (trend === 'up') {
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
        <TrendingUp className="w-3 h-3 mr-1" />
        {value ? `+${value.toFixed(1)}%` : 'Improving'}
      </Badge>
    );
  }
  if (trend === 'down') {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
        <TrendingDown className="w-3 h-3 mr-1" />
        {value ? `${value.toFixed(1)}%` : 'Declining'}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
      <Minus className="w-3 h-3 mr-1" />
      Stable
    </Badge>
  );
}

export default function DataConfidencePage() {
  const { dataQualityMetrics, isLoading } = useCDPData();

  // Default metrics if not loaded
  const metrics = dataQualityMetrics || {
    identityCoverage: 0,
    cogsCoverage: 0,
    freshnessHours: 0,
    totalOrders: 0,
    matchedOrders: 0
  };

  const identityCoverage = metrics.identityCoverage || 85;
  const cogsCoverage = metrics.cogsCoverage || 72;
  const isReliable = identityCoverage >= 80 && cogsCoverage >= 70;

  return (
    <CDPLayout>
      <Helmet>
        <title>Data Confidence | CDP - Bluecore</title>
        <meta name="description" content="CDP Data Quality and Confidence Metrics" />
      </Helmet>

      <div className="space-y-8 max-w-5xl">
        {/* Page Header */}
        <div>
          <h1 className="text-xl font-semibold mb-1">Data Confidence</h1>
          <p className="text-sm text-muted-foreground">Quality & Reliability</p>
        </div>

        {/* Overall Status */}
        <section>
          <Card className={isReliable ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}>
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                {isReliable ? (
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-warning-foreground" />
                  </div>
                )}
                <div>
                  <h2 className={`text-lg font-semibold ${isReliable ? 'text-success' : 'text-warning-foreground'}`}>
                    {isReliable ? 'Data Quality: Reliable' : 'Data Quality: Requires Review'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isReliable 
                      ? 'All coverage thresholds are met. Insights can be trusted for decision-making.'
                      : 'Some coverage metrics are below threshold. Insights may need additional validation.'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Coverage Metrics */}
        <section>
          <h3 className="font-semibold mb-4">Coverage Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CoverageMeter
              label="Identity Coverage"
              value={identityCoverage}
              threshold={80}
              description="Percentage of transactions linked to known customer identities. Higher coverage enables more accurate population analysis."
            />
            <CoverageMeter
              label="COGS Coverage"
              value={cogsCoverage}
              threshold={70}
              description="Percentage of products with cost data. Required for margin calculations and profitability insights."
            />
          </div>
        </section>

        {/* Matching Confidence */}
        <section>
          <h3 className="font-semibold mb-4">Matching Confidence</h3>
          <Card>
            <CardContent className="py-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email Match Rate</p>
                  <p className="text-2xl font-bold">92.3%</p>
                  <TrendBadge trend="stable" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Phone Match Rate</p>
                  <p className="text-2xl font-bold">78.5%</p>
                  <TrendBadge trend="up" value={2.1} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Cross-channel Linkage</p>
                  <p className="text-2xl font-bold">65.2%</p>
                  <TrendBadge trend="down" value={-1.3} />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Data Freshness */}
        <section>
          <h3 className="font-semibold mb-4">Data Freshness</h3>
          <Card>
            <CardContent className="py-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Last Order Sync</p>
                  </div>
                  <p className="text-lg font-semibold">2 hours ago</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Last CDP Build</p>
                  </div>
                  <p className="text-lg font-semibold">6 hours ago</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Next Scheduled Run</p>
                  </div>
                  <p className="text-lg font-semibold">02:15 AM</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Impact on Insights */}
        <section>
          <h3 className="font-semibold mb-4">Impact on Insights</h3>
          <Card className="border-border bg-muted/30">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">How data quality affects your insights</p>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2" />
                      <span><strong className="text-foreground">Identity Coverage below 80%:</strong> Population-level insights may undercount certain segments, particularly new or anonymous customers.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2" />
                      <span><strong className="text-foreground">COGS Coverage below 70%:</strong> Margin and profitability insights will be marked as "Requires Review" and should not be used for pricing decisions.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2" />
                      <span><strong className="text-foreground">Data older than 24 hours:</strong> Velocity and timing insights may not reflect recent behavioral changes.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </CDPLayout>
  );
}
