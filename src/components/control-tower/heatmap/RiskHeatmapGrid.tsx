import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { HeatmapCell, HeatmapCellData } from './HeatmapCell';
import { CascadeLines } from './CascadeLines';

interface RiskHeatmapGridProps {
  data: HeatmapCellData[];
  cascades?: Array<{
    from: { module: string; dimension: string };
    to: { module: string; dimension: string };
    label: string;
  }>;
  onCellClick?: (module: string, dimension: string) => void;
  showCascade?: boolean;
  className?: string;
}

const MODULES = ['FDP', 'MDP', 'CDP'] as const;
const DIMENSIONS = ['Revenue', 'Cash', 'Operations'] as const;

function getIntensityLabel(intensity: number): string {
  if (intensity <= 20) return 'Safe';
  if (intensity <= 50) return 'Monitor';
  if (intensity <= 80) return 'Warning';
  return 'Critical';
}

export function RiskHeatmapGrid({ 
  data, 
  cascades = [],
  onCellClick, 
  showCascade = true,
  className 
}: RiskHeatmapGridProps) {
  // Create a lookup map for quick access
  const dataMap = new Map(
    data.map(d => [`${d.module}-${d.dimension}`, d])
  );

  // Get cell data with fallback
  const getCellData = (module: string, dimension: string): HeatmapCellData => {
    const key = `${module}-${dimension}`;
    return dataMap.get(key) || {
      module,
      dimension,
      intensity: 0,
      label: `${module} ${dimension}`,
      detail: 'Không có dữ liệu',
    };
  };

  // Calculate average intensity per module and dimension
  const moduleAvg = MODULES.map(mod => {
    const cells = DIMENSIONS.map(dim => getCellData(mod, dim));
    const avg = cells.reduce((sum, c) => sum + c.intensity, 0) / cells.length;
    return { module: mod, avg: Math.round(avg) };
  });

  const dimensionAvg = DIMENSIONS.map(dim => {
    const cells = MODULES.map(mod => getCellData(mod, dim));
    const avg = cells.reduce((sum, c) => sum + c.intensity, 0) / cells.length;
    return { dimension: dim, avg: Math.round(avg) };
  });

  return (
    <div className={cn('space-y-4', className)}>
      {/* Legend */}
      <div className="flex items-center gap-4 justify-end text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Risk Level:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-emerald-500 opacity-50" />
            <span>Safe</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-yellow-500 opacity-60" />
            <span>Monitor</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-orange-500 opacity-75" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-red-500 opacity-90" />
            <span>Critical</span>
          </div>
        </div>
      </div>

      {/* Grid with cascade overlay */}
      <div className="relative">
        <motion.div 
          className="grid gap-2"
          style={{ 
            gridTemplateColumns: '80px repeat(3, 1fr)',
            gridTemplateRows: 'auto repeat(3, auto)'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Empty top-left corner */}
          <div />

          {/* Dimension headers */}
          {DIMENSIONS.map((dim, i) => (
            <motion.div
              key={dim}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-1 pb-2"
            >
              <span className="font-semibold text-sm">{dim}</span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                dimensionAvg[i].avg <= 20 && 'bg-emerald-500/20 text-emerald-600',
                dimensionAvg[i].avg > 20 && dimensionAvg[i].avg <= 50 && 'bg-yellow-500/20 text-yellow-600',
                dimensionAvg[i].avg > 50 && dimensionAvg[i].avg <= 80 && 'bg-orange-500/20 text-orange-600',
                dimensionAvg[i].avg > 80 && 'bg-red-500/20 text-red-600'
              )}>
                Avg: {dimensionAvg[i].avg}
              </span>
            </motion.div>
          ))}

          {/* Module rows */}
          {MODULES.map((mod, rowIdx) => (
            <>
              {/* Module label */}
              <motion.div
                key={`label-${mod}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: rowIdx * 0.1 }}
                className="flex flex-col items-center justify-center gap-1 pr-2"
              >
                <span className="font-semibold text-sm">{mod}</span>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  moduleAvg[rowIdx].avg <= 20 && 'bg-emerald-500/20 text-emerald-600',
                  moduleAvg[rowIdx].avg > 20 && moduleAvg[rowIdx].avg <= 50 && 'bg-yellow-500/20 text-yellow-600',
                  moduleAvg[rowIdx].avg > 50 && moduleAvg[rowIdx].avg <= 80 && 'bg-orange-500/20 text-orange-600',
                  moduleAvg[rowIdx].avg > 80 && 'bg-red-500/20 text-red-600'
                )}>
                  {getIntensityLabel(moduleAvg[rowIdx].avg)}
                </span>
              </motion.div>

              {/* Cells */}
              {DIMENSIONS.map((dim, colIdx) => (
                <motion.div
                  key={`${mod}-${dim}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (rowIdx * 3 + colIdx) * 0.05 }}
                  className="flex justify-center"
                >
                  <HeatmapCell
                    data={getCellData(mod, dim)}
                    onClick={() => onCellClick?.(mod, dim)}
                    size="md"
                  />
                </motion.div>
              ))}
            </>
          ))}
        </motion.div>

        {/* Cascade lines overlay */}
        {showCascade && cascades.length > 0 && (
          <CascadeLines cascades={cascades} />
        )}
      </div>
    </div>
  );
}
