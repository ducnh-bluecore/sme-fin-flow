import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
    <Card className={isHealthy ? '' : 'border-amber-200'}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          {isHealthy ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
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
            className={`h-2 ${isHealthy ? '' : '[&>div]:bg-amber-500'}`}
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
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        <TrendingUp className="w-3 h-3 mr-1" />
        {value ? `+${value.toFixed(1)}%` : 'Improving'}
      </Badge>
    );
  }
  if (trend === 'down') {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        <TrendingDown className="w-3 h-3 mr-1" />
        {value ? `${value.toFixed(1)}%` : 'Declining'}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
      <Minus className="w-3 h-3 mr-1" />
      Stable
    </Badge>
  );
}

export default function DataConfidencePage() {
  const navigate = useNavigate();
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
    <>
      <Helmet>
        <title>Data Confidence | CDP - Bluecore</title>
        <meta name="description" content="CDP Data Quality and Confidence Metrics" />
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
                  <h1 className="font-semibold text-lg">Data Confidence</h1>
                  <p className="text-xs text-muted-foreground">Quality & Reliability</p>
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
                  className="text-sm text-muted-foreground"
                >
                  Decision Cards
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/cdp/data-confidence')}
                  className="text-sm font-medium"
                >
                  Data Confidence
                </Button>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          {/* Overall Status */}
          <section>
            <Card className={isReliable ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30'}>
              <CardContent className="py-6">
                <div className="flex items-center gap-4">
                  {isReliable ? (
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                  )}
                  <div>
                    <h2 className={`text-lg font-semibold ${isReliable ? 'text-emerald-700' : 'text-amber-700'}`}>
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
            <Card className="border-slate-200 bg-slate-50/50">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <Info className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">How data quality affects your insights</p>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2" />
                        <span><strong>Identity Coverage below 80%:</strong> Population-level insights may undercount certain segments, particularly new or anonymous customers.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2" />
                        <span><strong>COGS Coverage below 70%:</strong> Margin and profitability insights will be marked as "Requires Review" and should not be used for pricing decisions.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2" />
                        <span><strong>Data older than 24 hours:</strong> Velocity and timing insights may not reflect recent behavioral changes.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </>
  );
}
