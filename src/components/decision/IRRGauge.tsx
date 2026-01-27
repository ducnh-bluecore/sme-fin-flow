import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface IRRGaugeProps {
  irr: number;
  wacc: number;
  minRate?: number;
  maxRate?: number;
}

export function IRRGauge({ 
  irr, 
  wacc, 
  minRate = 0, 
  maxRate = 30 
}: IRRGaugeProps) {
  const isAcceptable = irr > wacc;
  const spread = irr - wacc;
  
  // Calculate needle angle (180 degrees for semicircle, from left to right)
  const getNeedleAngle = (value: number) => {
    const clampedValue = Math.max(minRate, Math.min(maxRate, value));
    const percentage = (clampedValue - minRate) / (maxRate - minRate);
    return -90 + (percentage * 180); // -90 (left) to 90 (right)
  };

  const irrAngle = getNeedleAngle(irr);
  const waccAngle = getNeedleAngle(wacc);

  // Generate tick marks
  const ticks = useMemo(() => {
    const tickCount = 7;
    return Array.from({ length: tickCount }).map((_, i) => {
      const value = minRate + (i * (maxRate - minRate) / (tickCount - 1));
      const percentage = i / (tickCount - 1);
      const angle = -90 + (percentage * 180);
      const radians = (angle - 90) * (Math.PI / 180);
      const innerRadius = 65;
      const outerRadius = 75;
      const labelRadius = 85;
      
      return {
        value: Math.round(value),
        x1: 100 + Math.cos(radians) * innerRadius,
        y1: 100 + Math.sin(radians) * innerRadius,
        x2: 100 + Math.cos(radians) * outerRadius,
        y2: 100 + Math.sin(radians) * outerRadius,
        labelX: 100 + Math.cos(radians) * labelRadius,
        labelY: 100 + Math.sin(radians) * labelRadius,
      };
    });
  }, [minRate, maxRate]);

  // Generate colored arc segments
  const generateArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    const x1 = 100 + Math.cos(startRad) * radius;
    const y1 = 100 + Math.sin(startRad) * radius;
    const x2 = 100 + Math.cos(endRad) * radius;
    const y2 = 100 + Math.sin(endRad) * radius;
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  };

  const waccPosition = ((wacc - minRate) / (maxRate - minRate)) * 180 - 90;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">IRR vs WACC</CardTitle>
          <Badge 
            variant={isAcceptable ? 'default' : 'destructive'}
            className="flex items-center gap-1"
          >
            {isAcceptable ? (
              <>
                <TrendingUp className="h-3 w-3" />
                Đáng đầu tư
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3" />
                Không đạt
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <svg width="200" height="130" viewBox="0 0 200 130">
            {/* Background arc - red zone (below WACC) */}
            <path
              d={generateArcPath(-90, waccPosition, 60)}
              fill="none"
              stroke="hsl(var(--destructive) / 0.3)"
              strokeWidth="20"
              strokeLinecap="round"
            />
            
            {/* Green zone (above WACC) */}
            <path
              d={generateArcPath(waccPosition, 90, 60)}
              fill="none"
              stroke="hsl(142 76% 36% / 0.3)"
              strokeWidth="20"
              strokeLinecap="round"
            />

            {/* Tick marks and labels */}
            {ticks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                  stroke="hsl(var(--foreground))"
                  strokeWidth="2"
                />
                <text
                  x={tick.labelX}
                  y={tick.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[10px] fill-muted-foreground"
                >
                  {tick.value}%
                </text>
              </g>
            ))}

            {/* WACC marker line */}
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <line
                x1="100"
                y1="100"
                x2={100 + Math.cos((waccAngle - 90) * Math.PI / 180) * 70}
                y2={100 + Math.sin((waccAngle - 90) * Math.PI / 180) * 70}
                stroke="hsl(var(--foreground))"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <text
                x={100 + Math.cos((waccAngle - 90) * Math.PI / 180) * 50}
                y={100 + Math.sin((waccAngle - 90) * Math.PI / 180) * 50 - 8}
                textAnchor="middle"
                className="text-[9px] fill-muted-foreground font-medium"
              >
                WACC
              </text>
            </motion.g>

            {/* IRR Needle */}
            <motion.g
              initial={{ rotate: -90, originX: '100px', originY: '100px' }}
              animate={{ rotate: irrAngle }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 60, damping: 10 }}
              style={{ transformOrigin: '100px 100px' }}
            >
              <polygon
                points="100,40 96,100 104,100"
                fill={isAcceptable ? 'hsl(142 76% 36%)' : 'hsl(var(--destructive))'}
              />
            </motion.g>

            {/* Center circle */}
            <circle
              cx="100"
              cy="100"
              r="12"
              fill="hsl(var(--background))"
              stroke="hsl(var(--border))"
              strokeWidth="2"
            />

            {/* IRR value in center */}
            <text
              x="100"
              y="100"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-bold fill-foreground"
            >
              {irr.toFixed(0)}%
            </text>
          </svg>
        </div>

        {/* Stats below gauge */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t text-center">
          <div>
            <p className="text-xs text-muted-foreground">IRR</p>
            <p className={`text-lg font-bold ${isAcceptable ? 'text-green-500' : 'text-red-500'}`}>
              {irr.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">WACC</p>
            <p className="text-lg font-bold text-foreground">
              {wacc.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Spread</p>
            <p className={`text-lg font-bold ${spread > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {spread > 0 ? '+' : ''}{spread.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
