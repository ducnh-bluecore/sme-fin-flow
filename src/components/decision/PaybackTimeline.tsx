import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle, X } from 'lucide-react';

interface PaybackTimelineProps {
  simplePayback: number;
  discountedPayback: number;
  targetPayback: number;
  maxYears?: number;
}

export function PaybackTimeline({ 
  simplePayback, 
  discountedPayback, 
  targetPayback,
  maxYears = 10 
}: PaybackTimelineProps) {
  const getPaybackPosition = (years: number) => {
    return Math.min((years / maxYears) * 100, 100);
  };

  const isOnTarget = simplePayback <= targetPayback;
  const isNearTarget = simplePayback <= targetPayback * 1.25;

  const getZoneColor = (position: number) => {
    const targetPosition = (targetPayback / maxYears) * 100;
    if (position <= targetPosition * 0.8) return 'bg-green-500';
    if (position <= targetPosition) return 'bg-green-400';
    if (position <= targetPosition * 1.25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Timeline Thu hồi vốn</CardTitle>
          <Badge 
            variant={isOnTarget ? 'default' : isNearTarget ? 'secondary' : 'destructive'}
            className="flex items-center gap-1"
          >
            {isOnTarget ? (
              <>
                <Check className="h-3 w-3" />
                Đạt mục tiêu
              </>
            ) : isNearTarget ? (
              <>
                <AlertTriangle className="h-3 w-3" />
                Gần mục tiêu
              </>
            ) : (
              <>
                <X className="h-3 w-3" />
                Vượt mục tiêu
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Main Timeline Container */}
        <div className="relative py-8">
          {/* Background gradient bar */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400" />
          
          {/* Target zone indicator */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 h-3 bg-green-500/30 rounded-l-full"
            style={{ width: `${getPaybackPosition(targetPayback)}%` }}
          />

          {/* Year markers */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
            {Array.from({ length: maxYears + 1 }).map((_, i) => (
              <div 
                key={i}
                className="absolute flex flex-col items-center"
                style={{ left: `${(i / maxYears) * 100}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-0.5 h-4 bg-foreground/20" />
                <span className="text-xs text-muted-foreground mt-1">Y{i}</span>
              </div>
            ))}
          </div>

          {/* Target Payback Marker */}
          <motion.div
            className="absolute -translate-x-1/2 flex flex-col items-center"
            style={{ 
              left: `${getPaybackPosition(targetPayback)}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <div className="absolute -top-10 flex flex-col items-center">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Mục tiêu</span>
              <span className="text-sm font-bold text-foreground">{targetPayback} năm</span>
            </div>
            <div className="w-1 h-8 bg-foreground/60" />
          </motion.div>

          {/* Simple Payback Marker */}
          <motion.div
            className="absolute -translate-x-1/2"
            style={{ 
              left: `${getPaybackPosition(simplePayback)}%`,
              top: '50%',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: -20 }}
            transition={{ delay: 0.4, type: 'spring' }}
          >
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full ${getZoneColor(getPaybackPosition(simplePayback))} border-2 border-white shadow-lg`} />
              <div className="mt-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                Simple: {simplePayback.toFixed(1)} năm
              </div>
            </div>
          </motion.div>

          {/* Discounted Payback Marker */}
          <motion.div
            className="absolute -translate-x-1/2"
            style={{ 
              left: `${getPaybackPosition(discountedPayback)}%`,
              top: '50%',
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 40 }}
            transition={{ delay: 0.6, type: 'spring' }}
          >
            <div className="flex flex-col items-center">
              <div className="mb-2 bg-purple-500 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                Discounted: {discountedPayback.toFixed(1)} năm
              </div>
              <div className={`w-5 h-5 rounded-full ${getZoneColor(getPaybackPosition(discountedPayback))} border-2 border-white shadow-lg`} />
            </div>
          </motion.div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-6 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Tốt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-muted-foreground">Cận kề</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Rủi ro</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
