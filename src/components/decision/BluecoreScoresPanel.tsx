import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Info,
  Wallet,
  BarChart3,
  Target,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useBluecoreScores,
  SCORE_CONFIG,
  GRADE_CONFIG,
  ScoreType,
  ScoreGrade,
} from '@/hooks/useBluecoreScores';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Score type icons
const SCORE_ICONS: Record<ScoreType, typeof Wallet> = {
  CASH_HEALTH: Wallet,
  GROWTH_QUALITY: BarChart3,
  MARKETING_ACCOUNTABILITY: Target,
  CUSTOMER_VALUE_RISK: Users,
};

interface ScoreCardProps {
  type: ScoreType;
  value: number;
  grade: ScoreGrade;
  trend?: 'UP' | 'DOWN' | 'STABLE' | null;
  trendPercent?: number | null;
  primaryDriver?: string | null;
  recommendation?: string | null;
  compact?: boolean;
}

function ScoreCard({
  type,
  value,
  grade,
  trend,
  trendPercent,
  primaryDriver,
  recommendation,
  compact = false,
}: ScoreCardProps) {
  const config = SCORE_CONFIG[type];
  const gradeConfig = GRADE_CONFIG[grade];
  const Icon = SCORE_ICONS[type];

  // Determine score color based on value
  const getScoreColor = (val: number) => {
    if (val >= 80) return 'text-emerald-400';
    if (val >= 60) return 'text-blue-400';
    if (val >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getProgressColor = (val: number) => {
    if (val >= 80) return 'bg-emerald-500';
    if (val >= 60) return 'bg-blue-500';
    if (val >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        gradeConfig.bgColor,
        gradeConfig.borderColor
      )}>
        <div className={cn("p-2 rounded-lg", gradeConfig.bgColor)}>
          <Icon className={cn("h-5 w-5", gradeConfig.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{config.shortName}</span>
            <Badge variant="outline" className={cn("text-xs", gradeConfig.color)}>
              {gradeConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-2xl font-bold", getScoreColor(value))}>
              {value}
            </span>
            <span className="text-muted-foreground">/100</span>
            {trend && (
              <span className={cn(
                "flex items-center text-xs",
                trend === 'UP' && "text-green-400",
                trend === 'DOWN' && "text-red-400",
                trend === 'STABLE' && "text-muted-foreground"
              )}>
                {trend === 'UP' && <TrendingUp className="h-3 w-3" />}
                {trend === 'DOWN' && <TrendingDown className="h-3 w-3" />}
                {trend === 'STABLE' && <Minus className="h-3 w-3" />}
                {trendPercent && ` ${trendPercent > 0 ? '+' : ''}${trendPercent}%`}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("border", gradeConfig.borderColor)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", gradeConfig.bgColor)}>
              <Icon className={cn("h-5 w-5", gradeConfig.color)} />
            </div>
            <div>
              <CardTitle className="text-base">{config.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{config.question}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn(gradeConfig.bgColor, gradeConfig.color)}>
            {gradeConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Display */}
        <div className="flex items-end gap-4">
          <div className={cn("text-5xl font-bold", getScoreColor(value))}>
            {value}
          </div>
          <div className="flex flex-col gap-1 pb-1">
            <span className="text-muted-foreground text-sm">/100</span>
            {trend && (
              <span className={cn(
                "flex items-center text-sm",
                trend === 'UP' && "text-green-400",
                trend === 'DOWN' && "text-red-400",
                trend === 'STABLE' && "text-muted-foreground"
              )}>
                {trend === 'UP' && <TrendingUp className="h-4 w-4 mr-1" />}
                {trend === 'DOWN' && <TrendingDown className="h-4 w-4 mr-1" />}
                {trend === 'STABLE' && <Minus className="h-4 w-4 mr-1" />}
                {trendPercent ? `${trendPercent > 0 ? '+' : ''}${trendPercent}%` : 'Ổn định'}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500", getProgressColor(value))}
            style={{ width: `${value}%` }}
          />
          {/* Threshold markers */}
          <div className="absolute top-0 left-[40%] w-px h-full bg-yellow-500/50" />
          <div className="absolute top-0 left-[60%] w-px h-full bg-blue-500/50" />
          <div className="absolute top-0 left-[80%] w-px h-full bg-emerald-500/50" />
        </div>

        {/* Driver & Recommendation */}
        {primaryDriver && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="text-sm text-muted-foreground">Yếu tố chính: </span>
                <span className="text-sm font-medium">{primaryDriver}</span>
              </div>
            </div>
            {recommendation && (
              <div className="text-sm text-primary border-t border-border pt-2 mt-2">
                💡 {recommendation}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface BluecoreScoresPanelProps {
  layout?: 'grid' | 'row' | 'compact';
  showTitle?: boolean;
}

export function BluecoreScoresPanel({ layout = 'grid', showTitle = true }: BluecoreScoresPanelProps) {
  const { data: scores, isLoading, isCalculated } = useBluecoreScores();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {showTitle && <div className="h-6 w-48 bg-muted rounded" />}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const scoreTypes: ScoreType[] = [
    'CASH_HEALTH',
    'GROWTH_QUALITY',
    'MARKETING_ACCOUNTABILITY',
    'CUSTOMER_VALUE_RISK',
  ];

  const getScoreData = (type: ScoreType) => {
    const score = scores?.find(s => s.score_type === type);
    return score || {
      score_value: 50,
      score_grade: 'WARNING' as ScoreGrade,
      trend: null,
      trend_percent: null,
      primary_driver: null,
      recommendation: null,
    };
  };

  if (layout === 'compact') {
    return (
      <div className="space-y-3">
        {showTitle && (
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              Bluecore Scores™
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    4 chỉ số độc quyền của Bluecore đánh giá sức khỏe doanh nghiệp
                  </p>
                </TooltipContent>
              </Tooltip>
            </h3>
            {isCalculated && (
              <Badge variant="outline" className="text-xs">
                Real-time
              </Badge>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {scoreTypes.map((type) => {
            const data = getScoreData(type);
            return (
              <ScoreCard
                key={type}
                type={type}
                value={data.score_value}
                grade={data.score_grade}
                trend={data.trend as any}
                trendPercent={data.trend_percent}
                compact
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (layout === 'row') {
    return (
      <div className="space-y-4">
        {showTitle && (
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              Bluecore Scores™
              {isCalculated && (
                <Badge variant="outline" className="text-xs">
                  Real-time
                </Badge>
              )}
            </h3>
          </div>
        )}
        <div className="flex gap-4 overflow-x-auto pb-2">
          {scoreTypes.map((type) => {
            const data = getScoreData(type);
            return (
              <div key={type} className="min-w-[280px]">
                <ScoreCard
                  type={type}
                  value={data.score_value}
                  grade={data.score_grade}
                  trend={data.trend as any}
                  trendPercent={data.trend_percent}
                  primaryDriver={data.primary_driver}
                  recommendation={data.recommendation}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            Bluecore Scores™
            {isCalculated && (
              <Badge variant="outline" className="text-xs">
                Real-time calculated
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            4 chỉ số độc quyền đánh giá sức khỏe doanh nghiệp
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {scoreTypes.map((type) => {
          const data = getScoreData(type);
          return (
            <ScoreCard
              key={type}
              type={type}
              value={data.score_value}
              grade={data.score_grade}
              trend={data.trend as any}
              trendPercent={data.trend_percent}
              primaryDriver={data.primary_driver}
              recommendation={data.recommendation}
            />
          );
        })}
      </div>
    </div>
  );
}

export default BluecoreScoresPanel;
