import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, BarChart3, Activity, DollarSign, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatVNDCompact } from '@/lib/formatters';
import { ScenarioBudgetYTD } from '@/hooks/useScenarioBudgetData';

interface Props {
  summary: ScenarioBudgetYTD;
  scenarioName: string;
}

export function ScenarioBudgetSummary({ summary, scenarioName }: Props) {
  const getVarianceColor = (variance: number, isExpense = false) => {
    const favorable = isExpense ? variance > 0 : variance > 0;
    if (Math.abs(variance) < 1) return 'text-muted-foreground';
    return favorable ? 'text-green-500' : 'text-red-500';
  };

  const getVarianceIcon = (variance: number, isExpense = false) => {
    const favorable = isExpense ? variance > 0 : variance > 0;
    if (Math.abs(variance) < 1) return <Minus className="h-4 w-4" />;
    return favorable ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Revenue */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Doanh thu YTD</span>
            </div>
            <p className="text-2xl font-bold">{formatVNDCompact(summary.actualRevenue)}</p>
            <div className="flex items-center gap-1 mt-1">
              {getVarianceIcon(summary.revenueVariance)}
              <span className={`text-xs ${getVarianceColor(summary.revenueVariance)}`}>
                {summary.revenueVariance >= 0 ? '+' : ''}{formatVNDCompact(summary.revenueVariance)}
                {' '}({summary.revenueVariancePct >= 0 ? '+' : ''}{summary.revenueVariancePct.toFixed(1)}%)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              KH: {formatVNDCompact(summary.plannedRevenue)}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* OPEX */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Chi phí YTD</span>
            </div>
            <p className="text-2xl font-bold">{formatVNDCompact(summary.actualOpex)}</p>
            <div className="flex items-center gap-1 mt-1">
              {getVarianceIcon(summary.opexVariance, true)}
              <span className={`text-xs ${getVarianceColor(summary.opexVariance, true)}`}>
                {summary.opexVariance >= 0 ? 'Tiết kiệm ' : 'Vượt '}
                {formatVNDCompact(Math.abs(summary.opexVariance))}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              KH: {formatVNDCompact(summary.plannedOpex)}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* EBITDA */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className={`bg-gradient-to-br ${summary.ebitdaVariance >= 0 ? 'from-green-500/10 to-green-500/5 border-green-500/20' : 'from-red-500/10 to-red-500/5 border-red-500/20'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">EBITDA YTD</span>
            </div>
            <p className={`text-2xl font-bold ${summary.actualEbitda >= 0 ? '' : 'text-red-500'}`}>
              {formatVNDCompact(summary.actualEbitda)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {getVarianceIcon(summary.ebitdaVariance)}
              <span className={`text-xs ${getVarianceColor(summary.ebitdaVariance)}`}>
                {summary.ebitdaVariance >= 0 ? '+' : ''}{formatVNDCompact(summary.ebitdaVariance)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              KH: {formatVNDCompact(summary.plannedEbitda)}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* YTD Progress */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Tiến độ năm</span>
            </div>
            <p className="text-2xl font-bold">{summary.progress.toFixed(0)}%</p>
            <Progress value={summary.progress} className="h-1.5 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Kịch bản: {scenarioName}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Status */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Trạng thái</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                <TrendingUp className="h-3 w-3 mr-1" />
                {summary.favorableCount} thuận lợi
              </Badge>
              <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                <TrendingDown className="h-3 w-3 mr-1" />
                {summary.unfavorableCount} bất lợi
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
