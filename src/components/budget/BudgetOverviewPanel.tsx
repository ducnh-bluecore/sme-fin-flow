import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3, 
  Activity, 
  DollarSign, 
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PieChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatVNDCompact } from '@/lib/formatters';
import { ScenarioBudgetResult, ScenarioBudgetMonth } from '@/hooks/useScenarioBudgetData';

interface Props {
  data: ScenarioBudgetResult;
}

export function BudgetOverviewPanel({ data }: Props) {
  const { ytd, monthly, quarterly, scenarioName, year } = data;
  
  // Calculate additional metrics
  const currentMonth = new Date().getMonth() + 1;
  const ytdMonths = monthly.filter(m => m.month <= currentMonth);
  
  // Performance ratings
  const revenuePerformance = ytd.revenueVariancePct >= 5 ? 'excellent' : 
    ytd.revenueVariancePct >= 0 ? 'good' : 
    ytd.revenueVariancePct >= -10 ? 'warning' : 'critical';
  
  const opexPerformance = ytd.opexVariancePct >= 5 ? 'excellent' :
    ytd.opexVariancePct >= 0 ? 'good' :
    ytd.opexVariancePct >= -10 ? 'warning' : 'critical';
  
  const ebitdaPerformance = ytd.ebitdaVariancePct >= 5 ? 'excellent' :
    ytd.ebitdaVariancePct >= 0 ? 'good' :
    ytd.ebitdaVariancePct >= -10 ? 'warning' : 'critical';

  // Find best and worst months
  const monthsWithData = ytdMonths.filter(m => m.actualRevenue > 0 || m.plannedRevenue > 0);
  const bestRevenueMonth = monthsWithData.reduce((best, curr) => 
    curr.revenueVariance > (best?.revenueVariance || -Infinity) ? curr : best, monthsWithData[0]);
  const worstRevenueMonth = monthsWithData.reduce((worst, curr) => 
    curr.revenueVariance < (worst?.revenueVariance || Infinity) ? curr : worst, monthsWithData[0]);

  // Calculate trends - compare Q2 to Q1, Q3 to Q2, etc.
  const currentQuarter = Math.ceil(currentMonth / 3);
  const quarterlyTrend = currentQuarter > 1 
    ? ((quarterly[currentQuarter - 1]?.actualRevenue || 0) - (quarterly[currentQuarter - 2]?.actualRevenue || 0)) 
    : 0;

  // Monthly consistency score
  const monthsOnTarget = ytdMonths.filter(m => m.revenueVariancePct >= 0).length;
  const consistencyScore = ytdMonths.length > 0 ? (monthsOnTarget / ytdMonths.length) * 100 : 0;

  // Projected full year based on current run rate
  const avgMonthlyRevenue = ytdMonths.length > 0 
    ? ytd.actualRevenue / ytdMonths.length : 0;
  const projectedYearRevenue = avgMonthlyRevenue * 12;
  const fullYearPlanned = monthly.reduce((s, m) => s + m.plannedRevenue, 0);
  const projectedVsPlanned = fullYearPlanned > 0 
    ? ((projectedYearRevenue - fullYearPlanned) / fullYearPlanned) * 100 : 0;

  const getPerformanceColor = (perf: string) => {
    switch (perf) {
      case 'excellent': return 'text-green-500 bg-green-500/10';
      case 'good': return 'text-blue-500 bg-blue-500/10';
      case 'warning': return 'text-yellow-500 bg-yellow-500/10';
      case 'critical': return 'text-red-500 bg-red-500/10';
      default: return 'text-muted-foreground';
    }
  };

  const getPerformanceLabel = (perf: string) => {
    switch (perf) {
      case 'excellent': return 'Xuất sắc';
      case 'good': return 'Tốt';
      case 'warning': return 'Cần chú ý';
      case 'critical': return 'Cần hành động';
      default: return 'N/A';
    }
  };

  const monthNames = ['', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tổng quan Ngân sách & Thực tế {year}</h3>
          <p className="text-sm text-muted-foreground">Kịch bản: {scenarioName}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {ytd.favorableCount} thuận lợi
          </Badge>
          <Badge variant="outline" className="gap-1">
            <XCircle className="h-3 w-3 text-red-500" />
            {ytd.unfavorableCount} bất lợi
          </Badge>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue YTD */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">Doanh thu YTD</span>
                </div>
                <Badge className={getPerformanceColor(revenuePerformance)}>
                  {getPerformanceLabel(revenuePerformance)}
                </Badge>
              </div>
              <p className="text-2xl font-bold">{formatVNDCompact(ytd.actualRevenue)}</p>
              <div className="flex items-center gap-1 mt-1">
                {ytd.revenueVariance >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm ${ytd.revenueVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {ytd.revenueVariance >= 0 ? '+' : ''}{formatVNDCompact(ytd.revenueVariance)}
                  {' '}({ytd.revenueVariancePct >= 0 ? '+' : ''}{ytd.revenueVariancePct.toFixed(1)}%)
                </span>
              </div>
              <div className="mt-2 pt-2 border-t">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>KH: {formatVNDCompact(ytd.plannedRevenue)}</span>
                  <span>TT: {formatVNDCompact(ytd.actualRevenue)}</span>
                </div>
                <Progress 
                  value={ytd.plannedRevenue > 0 ? Math.min((ytd.actualRevenue / ytd.plannedRevenue) * 100, 150) : 0} 
                  className="h-1.5 mt-1" 
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* OPEX YTD */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Wallet className="h-4 w-4 text-orange-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">Chi phí YTD</span>
                </div>
                <Badge className={getPerformanceColor(opexPerformance)}>
                  {getPerformanceLabel(opexPerformance)}
                </Badge>
              </div>
              <p className="text-2xl font-bold">{formatVNDCompact(ytd.actualOpex)}</p>
              <div className="flex items-center gap-1 mt-1">
                {ytd.opexVariance >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm ${ytd.opexVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {ytd.opexVariance >= 0 ? 'Tiết kiệm ' : 'Vượt '}
                  {formatVNDCompact(Math.abs(ytd.opexVariance))}
                  {' '}({ytd.opexVariancePct >= 0 ? '+' : ''}{ytd.opexVariancePct.toFixed(1)}%)
                </span>
              </div>
              <div className="mt-2 pt-2 border-t">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>KH: {formatVNDCompact(ytd.plannedOpex)}</span>
                  <span>TT: {formatVNDCompact(ytd.actualOpex)}</span>
                </div>
                <Progress 
                  value={ytd.plannedOpex > 0 ? Math.min((ytd.actualOpex / ytd.plannedOpex) * 100, 150) : 0} 
                  className="h-1.5 mt-1" 
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* EBITDA YTD */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Activity className="h-4 w-4 text-purple-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">EBITDA YTD</span>
                </div>
                <Badge className={getPerformanceColor(ebitdaPerformance)}>
                  {getPerformanceLabel(ebitdaPerformance)}
                </Badge>
              </div>
              <p className={`text-2xl font-bold ${ytd.actualEbitda < 0 ? 'text-red-500' : ''}`}>
                {formatVNDCompact(ytd.actualEbitda)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {ytd.ebitdaVariance >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm ${ytd.ebitdaVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {ytd.ebitdaVariance >= 0 ? '+' : ''}{formatVNDCompact(ytd.ebitdaVariance)}
                  {' '}({ytd.ebitdaVariancePct >= 0 ? '+' : ''}{ytd.ebitdaVariancePct.toFixed(1)}%)
                </span>
              </div>
              <div className="mt-2 pt-2 border-t">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>KH: {formatVNDCompact(ytd.plannedEbitda)}</span>
                  <span>TT: {formatVNDCompact(ytd.actualEbitda)}</span>
                </div>
                <Progress 
                  value={ytd.plannedEbitda > 0 ? Math.min((ytd.actualEbitda / ytd.plannedEbitda) * 100, 150) : 0} 
                  className="h-1.5 mt-1" 
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Year Progress */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="h-full">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Target className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">Tiến độ năm</span>
                </div>
              </div>
              <p className="text-2xl font-bold">{ytd.progress.toFixed(0)}%</p>
              <Progress value={ytd.progress} className="h-2 mt-2" />
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Đạt mục tiêu DT:</span>
                  <span className={consistencyScore >= 50 ? 'text-green-500' : 'text-yellow-500'}>
                    {monthsOnTarget}/{ytdMonths.length} tháng ({consistencyScore.toFixed(0)}%)
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">DT dự kiến cả năm:</span>
                  <span className={projectedVsPlanned >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {formatVNDCompact(projectedYearRevenue)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quarterly Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Hiệu suất theo Quý
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quarterly.map((q, idx) => {
                const isCurrentOrPast = idx + 1 <= currentQuarter;
                const variance = q.plannedRevenue > 0 
                  ? ((q.actualRevenue - q.plannedRevenue) / q.plannedRevenue) * 100 : 0;
                return (
                  <div key={q.quarter} className={!isCurrentOrPast ? 'opacity-50' : ''}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Q{q.quarter}</span>
                      <span className={`text-xs ${variance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex gap-1 text-xs text-muted-foreground">
                      <span>KH: {formatVNDCompact(q.plannedRevenue)}</span>
                      <span>|</span>
                      <span>TT: {formatVNDCompact(q.actualRevenue)}</span>
                    </div>
                    <Progress 
                      value={q.plannedRevenue > 0 ? Math.min((q.actualRevenue / q.plannedRevenue) * 100, 100) : 0}
                      className="h-1 mt-1"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Best/Worst Performance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                Phân tích theo Tháng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bestRevenueMonth && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Tháng tốt nhất: {monthNames[bestRevenueMonth.month]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    DT: {formatVNDCompact(bestRevenueMonth.actualRevenue)} 
                    {' '}(+{formatVNDCompact(bestRevenueMonth.revenueVariance)} so với KH)
                  </p>
                </div>
              )}
              {worstRevenueMonth && worstRevenueMonth !== bestRevenueMonth && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">
                      Tháng cần cải thiện: {monthNames[worstRevenueMonth.month]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    DT: {formatVNDCompact(worstRevenueMonth.actualRevenue)} 
                    {' '}({formatVNDCompact(worstRevenueMonth.revenueVariance)} so với KH)
                  </p>
                </div>
              )}
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Xu hướng Quý</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {quarterlyTrend >= 0 ? (
                    <span className="text-green-500">
                      ↑ Tăng {formatVNDCompact(quarterlyTrend)} so với quý trước
                    </span>
                  ) : (
                    <span className="text-red-500">
                      ↓ Giảm {formatVNDCompact(Math.abs(quarterlyTrend))} so với quý trước
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Key Insights */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Điểm cần lưu ý
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Revenue insight */}
              <div className="flex items-start gap-2">
                {ytd.revenueVariancePct >= 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                )}
                <p className="text-sm">
                  {ytd.revenueVariancePct >= 5 
                    ? `Doanh thu vượt ${ytd.revenueVariancePct.toFixed(1)}% so với KH - Cân nhắc điều chỉnh mục tiêu`
                    : ytd.revenueVariancePct >= 0
                    ? `Doanh thu đạt kế hoạch (+${ytd.revenueVariancePct.toFixed(1)}%)`
                    : `Doanh thu thấp hơn KH ${Math.abs(ytd.revenueVariancePct).toFixed(1)}% - Cần tăng cường bán hàng`
                  }
                </p>
              </div>

              {/* OPEX insight */}
              <div className="flex items-start gap-2">
                {ytd.opexVariancePct >= 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                )}
                <p className="text-sm">
                  {ytd.opexVariancePct >= 5 
                    ? `Chi phí tiết kiệm ${ytd.opexVariancePct.toFixed(1)}% - Kiểm tra có thiếu đầu tư không`
                    : ytd.opexVariancePct >= 0
                    ? `Chi phí trong tầm kiểm soát (+${ytd.opexVariancePct.toFixed(1)}%)`
                    : `Chi phí vượt KH ${Math.abs(ytd.opexVariancePct).toFixed(1)}% - Cần rà soát chi tiêu`
                  }
                </p>
              </div>

              {/* Margin insight */}
              <div className="flex items-start gap-2">
                {ytd.actualRevenue > 0 ? (
                  <>
                    {((ytd.actualEbitda / ytd.actualRevenue) * 100) >= 10 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    )}
                    <p className="text-sm">
                      Biên lợi nhuận: {((ytd.actualEbitda / ytd.actualRevenue) * 100).toFixed(1)}%
                      {((ytd.actualEbitda / ytd.actualRevenue) * 100) < 10 && ' - Cần cải thiện hiệu quả'}
                    </p>
                  </>
                ) : (
                  <>
                    <Minus className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu doanh thu</p>
                  </>
                )}
              </div>

              {/* Projection */}
              <div className="flex items-start gap-2">
                {projectedVsPlanned >= 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                )}
                <p className="text-sm">
                  Dự kiến cả năm: {formatVNDCompact(projectedYearRevenue)}
                  {projectedVsPlanned >= 0 
                    ? ` (vượt ${projectedVsPlanned.toFixed(1)}% so với KH năm)`
                    : ` (thiếu ${Math.abs(projectedVsPlanned).toFixed(1)}% so với KH năm)`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
