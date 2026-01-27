import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatVNDCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface SensitivityHeatmapProps {
  baseRevenue: number;
  baseCogs: number;
  baseOpex: number;
  className?: string;
}

interface HeatmapCell {
  revenueChange: number;
  cogsChange: number;
  profit: number;
  profitMargin: number;
}

export function SensitivityHeatmap({
  baseRevenue,
  baseCogs,
  baseOpex,
  className,
}: SensitivityHeatmapProps) {
  const [xAxis, setXAxis] = useState<'revenue' | 'cogs' | 'opex'>('revenue');
  const [yAxis, setYAxis] = useState<'revenue' | 'cogs' | 'opex'>('cogs');

  const changes = [-20, -10, 0, 10, 20];

  const heatmapData = useMemo(() => {
    const data: HeatmapCell[][] = [];

    for (const yChange of changes) {
      const row: HeatmapCell[] = [];
      for (const xChange of changes) {
        let revenue = baseRevenue;
        let cogs = baseCogs;
        let opex = baseOpex;

        // Apply x-axis change
        if (xAxis === 'revenue') revenue *= (1 + xChange / 100);
        else if (xAxis === 'cogs') cogs *= (1 + xChange / 100);
        else opex *= (1 + xChange / 100);

        // Apply y-axis change
        if (yAxis === 'revenue') revenue *= (1 + yChange / 100);
        else if (yAxis === 'cogs') cogs *= (1 + yChange / 100);
        else opex *= (1 + yChange / 100);

        const profit = revenue - cogs - opex;
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

        row.push({
          revenueChange: xChange,
          cogsChange: yChange,
          profit,
          profitMargin,
        });
      }
      data.push(row);
    }

    return data;
  }, [baseRevenue, baseCogs, baseOpex, xAxis, yAxis]);

  const getColorIntensity = (profitMargin: number) => {
    if (profitMargin >= 20) return 'bg-success text-success-foreground';
    if (profitMargin >= 10) return 'bg-success/70 text-white';
    if (profitMargin >= 0) return 'bg-success/40 text-foreground';
    if (profitMargin >= -10) return 'bg-warning/50 text-foreground';
    if (profitMargin >= -20) return 'bg-destructive/50 text-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  const axisLabels = {
    revenue: 'Doanh thu',
    cogs: 'COGS',
    opex: 'OPEX',
  };

  const baseProfit = baseRevenue - baseCogs - baseOpex;
  const baseProfitMargin = baseRevenue > 0 ? (baseProfit / baseRevenue) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Heatmap độ nhạy lợi nhuận</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Hiển thị lợi nhuận ròng khi thay đổi 2 biến số. Màu xanh = lãi, màu đỏ = lỗ.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <Select value={yAxis} onValueChange={(v) => setYAxis(v as any)}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue placeholder="Y-axis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Doanh thu</SelectItem>
                <SelectItem value="cogs">COGS</SelectItem>
                <SelectItem value="opex">OPEX</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">vs</span>
            <Select value={xAxis} onValueChange={(v) => setXAxis(v as any)}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue placeholder="X-axis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Doanh thu</SelectItem>
                <SelectItem value="cogs">COGS</SelectItem>
                <SelectItem value="opex">OPEX</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            {/* X-axis label */}
            <div className="flex justify-center mb-2">
              <Badge variant="outline" className="text-xs">
                {axisLabels[xAxis]} →
              </Badge>
            </div>

            <div className="flex">
              {/* Y-axis label */}
              <div className="flex items-center justify-center w-12 -rotate-90 origin-center">
                <Badge variant="outline" className="text-xs whitespace-nowrap">
                  {axisLabels[yAxis]} ↑
                </Badge>
              </div>

              <div className="flex-1">
                {/* X-axis values header */}
                <div className="flex ml-12">
                  {changes.map((change) => (
                    <div
                      key={`x-${change}`}
                      className="flex-1 text-center text-xs font-medium text-muted-foreground py-1"
                    >
                      {change > 0 ? `+${change}%` : `${change}%`}
                    </div>
                  ))}
                </div>

                {/* Heatmap grid */}
                <div className="flex flex-col gap-1">
                  {heatmapData.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex items-center gap-1">
                      {/* Y-axis value label */}
                      <div className="w-12 text-right text-xs font-medium text-muted-foreground pr-2">
                        {changes[rowIndex] > 0 ? `+${changes[rowIndex]}%` : `${changes[rowIndex]}%`}
                      </div>

                      {/* Cells */}
                      {row.map((cell, colIndex) => {
                        const isCenter = rowIndex === 2 && colIndex === 2;
                        
                        return (
                          <TooltipProvider key={colIndex}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: (rowIndex * 5 + colIndex) * 0.02 }}
                                  className={cn(
                                    'flex-1 aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 hover:z-10 hover:shadow-lg',
                                    getColorIntensity(cell.profitMargin),
                                    isCenter && 'ring-2 ring-foreground ring-offset-2'
                                  )}
                                >
                                  <span className="text-xs font-bold">
                                    {formatVNDCompact(cell.profit)}
                                  </span>
                                  <span className="text-[10px] opacity-80">
                                    {cell.profitMargin.toFixed(1)}%
                                  </span>
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  <p className="font-semibold">
                                    {axisLabels[xAxis]}: {changes[colIndex] > 0 ? '+' : ''}{changes[colIndex]}%
                                    {' | '}
                                    {axisLabels[yAxis]}: {changes[rowIndex] > 0 ? '+' : ''}{changes[rowIndex]}%
                                  </p>
                                  <p>Lợi nhuận: {formatVNDCompact(cell.profit)}</p>
                                  <p>Margin: {cell.profitMargin.toFixed(1)}%</p>
                                  {isCenter && <p className="text-muted-foreground">(Kịch bản hiện tại)</p>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-destructive" />
                <span className="text-xs text-muted-foreground">Lỗ nặng</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-warning/50" />
                <span className="text-xs text-muted-foreground">Hòa vốn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-success" />
                <span className="text-xs text-muted-foreground">Lãi cao</span>
              </div>
            </div>

            {/* Base scenario info */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground">
                Kịch bản cơ sở: Lợi nhuận{' '}
                <span className={cn(
                  'font-semibold',
                  baseProfit >= 0 ? 'text-success' : 'text-destructive'
                )}>
                  {formatVNDCompact(baseProfit)}
                </span>
                {' '}({baseProfitMargin.toFixed(1)}% margin)
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
