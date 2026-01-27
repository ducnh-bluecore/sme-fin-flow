import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatVNDCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface HeatmapDataPoint {
  x: number;
  y: number;
  value: number;
}

interface SensitivityHeatmapProps {
  // Option 1: Provide raw financial data
  baseRevenue?: number;
  baseCogs?: number;
  baseOpex?: number;
  // Option 2: Provide pre-calculated data
  data?: HeatmapDataPoint[];
  xLabel?: string;
  yLabel?: string;
  valueLabel?: string;
  title?: string;
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
  data: externalData,
  xLabel = 'Doanh thu',
  yLabel = 'COGS',
  valueLabel = 'Margin',
  title = 'Heatmap độ nhạy lợi nhuận',
  className,
}: SensitivityHeatmapProps) {
  const [xAxis, setXAxis] = useState<'revenue' | 'cogs' | 'opex'>('revenue');
  const [yAxis, setYAxis] = useState<'revenue' | 'cogs' | 'opex'>('cogs');

  const changes = [-20, -10, 0, 10, 20];

  // If external data is provided, use it; otherwise calculate from base values
  const useExternalData = externalData && externalData.length > 0;

  const heatmapData = useMemo(() => {
    if (useExternalData) {
      // Convert external data to grid format
      const gridData: HeatmapCell[][] = [];
      const xValues = [...new Set(externalData!.map(d => d.x))].sort((a, b) => b - a);
      const yValues = [...new Set(externalData!.map(d => d.y))].sort((a, b) => b - a);
      
      for (const yVal of yValues) {
        const row: HeatmapCell[] = [];
        for (const xVal of xValues) {
          const point = externalData!.find(d => d.x === xVal && d.y === yVal);
          row.push({
            revenueChange: xVal,
            cogsChange: yVal,
            profit: point?.value || 0,
            profitMargin: point?.value || 0,
          });
        }
        gridData.push(row);
      }
      return gridData;
    }

    // Calculate from base values
    if (!baseRevenue || !baseCogs || !baseOpex) return [];

    const data: HeatmapCell[][] = [];

    for (const yChange of [...changes].reverse()) {
      const row: HeatmapCell[] = [];
      for (const xChange of changes) {
        let revenue = baseRevenue;
        let cogs = baseCogs;
        let opex = baseOpex;

        if (xAxis === 'revenue') revenue *= (1 + xChange / 100);
        else if (xAxis === 'cogs') cogs *= (1 + xChange / 100);
        else opex *= (1 + xChange / 100);

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
  }, [baseRevenue, baseCogs, baseOpex, xAxis, yAxis, useExternalData, externalData]);

  const getColorIntensity = (value: number) => {
    // For external data, assume value is already the metric to color by
    if (useExternalData) {
      if (value >= 0.5) return 'bg-green-500 text-white';
      if (value >= 0.2) return 'bg-green-400 text-white';
      if (value >= 0) return 'bg-green-300 text-foreground';
      if (value >= -0.2) return 'bg-yellow-400 text-foreground';
      if (value >= -0.5) return 'bg-red-400 text-white';
      return 'bg-red-500 text-white';
    }

    // For margin-based coloring
    if (value >= 20) return 'bg-green-500 text-white';
    if (value >= 10) return 'bg-green-400 text-white';
    if (value >= 0) return 'bg-green-300 text-foreground';
    if (value >= -10) return 'bg-yellow-400 text-foreground';
    if (value >= -20) return 'bg-red-400 text-white';
    return 'bg-red-500 text-white';
  };

  const axisLabels = {
    revenue: 'Doanh thu',
    cogs: 'COGS',
    opex: 'OPEX',
  };

  const displayChanges = useExternalData 
    ? [...new Set(externalData!.map(d => d.x))].sort((a, b) => a - b)
    : changes;
  
  const yDisplayChanges = useExternalData
    ? [...new Set(externalData!.map(d => d.y))].sort((a, b) => b - a)
    : [...changes].reverse();

  const baseProfit = baseRevenue && baseCogs && baseOpex 
    ? baseRevenue - baseCogs - baseOpex 
    : 0;
  const baseProfitMargin = baseRevenue && baseProfit 
    ? (baseProfit / baseRevenue) * 100 
    : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Hiển thị giá trị khi thay đổi 2 biến số. Màu xanh = tốt, màu đỏ = xấu.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {!useExternalData && (
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
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            {/* X-axis label */}
            <div className="flex justify-center mb-2">
              <Badge variant="outline" className="text-xs">
                {useExternalData ? xLabel : axisLabels[xAxis]} →
              </Badge>
            </div>

            <div className="flex">
              {/* Y-axis label */}
              <div className="flex items-center justify-center w-12 -rotate-90 origin-center">
                <Badge variant="outline" className="text-xs whitespace-nowrap">
                  {useExternalData ? yLabel : axisLabels[yAxis]} ↑
                </Badge>
              </div>

              <div className="flex-1">
                {/* X-axis values header */}
                <div className="flex ml-12">
                  {displayChanges.map((change) => (
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
                        {yDisplayChanges[rowIndex] > 0 ? `+${yDisplayChanges[rowIndex]}%` : `${yDisplayChanges[rowIndex]}%`}
                      </div>

                      {/* Cells */}
                      {row.map((cell, colIndex) => {
                        const isCenter = rowIndex === Math.floor(heatmapData.length / 2) && colIndex === Math.floor(row.length / 2);
                        const displayValue = useExternalData ? cell.profit : cell.profitMargin;
                        
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
                                    getColorIntensity(displayValue),
                                    isCenter && 'ring-2 ring-foreground ring-offset-2'
                                  )}
                                >
                                  <span className="text-xs font-bold">
                                    {useExternalData 
                                      ? displayValue.toFixed(2)
                                      : formatVNDCompact(cell.profit)
                                    }
                                  </span>
                                  {!useExternalData && (
                                    <span className="text-[10px] opacity-80">
                                      {cell.profitMargin.toFixed(1)}%
                                    </span>
                                  )}
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  <p className="font-semibold">
                                    X: {displayChanges[colIndex] > 0 ? '+' : ''}{displayChanges[colIndex]}%
                                    {' | '}
                                    Y: {yDisplayChanges[rowIndex] > 0 ? '+' : ''}{yDisplayChanges[rowIndex]}%
                                  </p>
                                  <p>{valueLabel}: {displayValue.toFixed(2)}</p>
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
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-xs text-muted-foreground">Xấu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-yellow-400" />
                <span className="text-xs text-muted-foreground">Trung bình</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-xs text-muted-foreground">Tốt</span>
              </div>
            </div>

            {/* Base scenario info */}
            {baseRevenue && baseCogs && baseOpex && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">
                  Kịch bản cơ sở: Lợi nhuận{' '}
                  <span className={cn(
                    'font-semibold',
                    baseProfit >= 0 ? 'text-green-500' : 'text-red-500'
                  )}>
                    {formatVNDCompact(baseProfit)}
                  </span>
                  {' '}({baseProfitMargin.toFixed(1)}% margin)
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
