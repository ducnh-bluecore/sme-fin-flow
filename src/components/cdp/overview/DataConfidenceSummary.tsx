import { Database, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

interface DataConfidenceSummaryProps {
  overallScore: number;
  identityCoverage: number;
  matchAccuracy: number;
  returnDataCompleteness: number;
  dataFreshnessDays: number;
  issues: Array<{
    id: string;
    label: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
}

export function DataConfidenceSummary({
  overallScore,
  identityCoverage,
  matchAccuracy,
  returnDataCompleteness,
  dataFreshnessDays,
  issues
}: DataConfidenceSummaryProps) {
  const navigate = useNavigate();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning-foreground';
    return 'text-destructive';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-destructive';
  };

  const criticalIssues = issues.filter(i => i.severity === 'critical');

  return (
    <Card className={criticalIssues.length > 0 ? 'border-warning/50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Database className="w-4 h-4" />
            Độ tin cậy Dữ liệu
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground"
            onClick={() => navigate('/cdp/confidence')}
          >
            Chi tiết <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {/* Overall Score */}
          <div className="col-span-1">
            <p className="text-xs text-muted-foreground mb-1">Điểm tổng hợp</p>
            <p className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}%
            </p>
            <div className="flex items-center gap-1 mt-1">
              {overallScore >= 70 ? (
                <CheckCircle className="w-3 h-3 text-success" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-warning" />
              )}
              <span className="text-xs text-muted-foreground">
                {overallScore >= 70 ? 'Đáng tin cậy' : 'Cần cải thiện'}
              </span>
            </div>
          </div>

          {/* Identity Coverage */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Định danh KH</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{identityCoverage}%</span>
              </div>
              <Progress 
                value={identityCoverage} 
                className={`h-1.5 ${getProgressColor(identityCoverage)}`} 
              />
            </div>
          </div>

          {/* Match Accuracy */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Ghép chính xác</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{matchAccuracy}%</span>
              </div>
              <Progress 
                value={matchAccuracy} 
                className={`h-1.5 ${getProgressColor(matchAccuracy)}`} 
              />
            </div>
          </div>

          {/* Return Data */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Dữ liệu hoàn trả</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{returnDataCompleteness}%</span>
              </div>
              <Progress 
                value={returnDataCompleteness} 
                className={`h-1.5 ${getProgressColor(returnDataCompleteness)}`} 
              />
            </div>
          </div>

          {/* Freshness */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Độ mới</p>
            <div className="flex items-center gap-1">
              <span className={`font-medium ${dataFreshnessDays <= 1 ? 'text-success' : dataFreshnessDays <= 3 ? 'text-warning-foreground' : 'text-destructive'}`}>
                {dataFreshnessDays === 0 ? 'Hôm nay' : `${dataFreshnessDays} ngày`}
              </span>
            </div>
          </div>
        </div>

        {/* Issues */}
        {issues.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Vấn đề đang theo dõi</p>
            <div className="flex flex-wrap gap-2">
              {issues.slice(0, 4).map((issue) => (
                <Badge 
                  key={issue.id} 
                  variant="outline" 
                  className={`text-xs ${
                    issue.severity === 'critical' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                    issue.severity === 'warning' ? 'bg-warning/10 text-warning-foreground border-warning/20' :
                    'bg-muted text-muted-foreground'
                  }`}
                >
                  {issue.label}
                </Badge>
              ))}
              {issues.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{issues.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
