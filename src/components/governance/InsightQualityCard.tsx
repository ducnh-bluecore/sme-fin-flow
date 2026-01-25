import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Brain, Loader2 } from 'lucide-react';
import { useCDPValidateInsightAccuracy } from '@/hooks/useCDPInsightQuality';

interface InsightQualityCardProps {
  className?: string;
}

export function InsightQualityCard({ className }: InsightQualityCardProps) {
  const { data: validationResults = [], isLoading, error } = useCDPValidateInsightAccuracy();

  const passedCount = validationResults.filter(r => r.overallPassed).length;
  const failedCount = validationResults.filter(r => !r.overallPassed).length;
  const totalCount = validationResults.length;
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 100;

  const getStatusColor = () => {
    if (passRate >= 90) return 'text-emerald-600';
    if (passRate >= 70) return 'text-amber-600';
    return 'text-destructive';
  };

  const getStatusIcon = () => {
    if (passRate >= 90) return <CheckCircle className="w-5 h-5 text-emerald-600" />;
    if (passRate >= 70) return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    return <XCircle className="w-5 h-5 text-destructive" />;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Insight Data Accuracy
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Insight Data Accuracy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Lỗi kiểm tra: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Insight Data Accuracy
          <Badge variant={passRate >= 90 ? 'default' : passRate >= 70 ? 'secondary' : 'destructive'}>
            {passRate}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="flex items-center gap-4">
          {getStatusIcon()}
          <div>
            <p className={`text-2xl font-bold ${getStatusColor()}`}>
              {passedCount}/{totalCount}
            </p>
            <p className="text-xs text-muted-foreground">
              insights đạt chuẩn accuracy
            </p>
          </div>
        </div>

        {/* Validation Details */}
        {totalCount > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground">Chi tiết kiểm tra:</p>
            {validationResults.slice(0, 5).map((result) => (
              <div key={result.insightEventId} className="flex items-center justify-between text-xs">
                <span className="font-mono">{result.insightCode}</span>
                <div className="flex items-center gap-2">
                  {result.customerMatch ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                      KH ✓
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-destructive border-destructive">
                      KH: {result.reportedCustomerCount} vs {result.sourceCustomerCount}
                    </Badge>
                  )}
                  {result.metricMatch ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                      Metric ✓
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-destructive border-destructive">
                      {result.reportedMetricValue}% vs {result.sourceMetricValue}%
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {totalCount > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{totalCount - 5} insights khác
              </p>
            )}
          </div>
        )}

        {totalCount === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Không có insight active để kiểm tra
          </p>
        )}
      </CardContent>
    </Card>
  );
}
