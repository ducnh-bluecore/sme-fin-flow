import { motion } from 'framer-motion';
import { Sparkles, Brain, TrendingUp, ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * AI Prediction Card - AI Advisor Integration
 * 
 * Shows:
 * - Confidence score with animated bar
 * - Top recommendation
 * - Predicted outcome
 * - Quick action button
 */

interface AIPrediction {
  id: string;
  confidence: number; // 0-100
  recommendation: string;
  action: string;
  predictedImpact: number;
  predictedOutcome: 'positive' | 'negative' | 'neutral';
  basedOnPatterns: number;
  reasoning?: string;
}

interface AIPredictionCardProps {
  prediction?: AIPrediction;
  onAction?: (prediction: AIPrediction) => void;
  isLoading?: boolean;
}

// Demo prediction when no real data
const demoPrediction: AIPrediction = {
  id: 'demo-1',
  confidence: 87,
  recommendation: 'Tạm dừng TikTok Ads campaign #1234',
  action: 'PAUSE_CAMPAIGN',
  predictedImpact: 45_000_000,
  predictedOutcome: 'positive',
  basedOnPatterns: 23,
  reasoning: 'ROAS giảm 40% trong 3 ngày qua, tương tự 23 patterns trước đó đều dẫn đến lỗ thêm nếu tiếp tục.',
};

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000_000) return `₫${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `₫${(amount / 1_000_000).toFixed(0)}M`;
  return `₫${amount.toLocaleString('vi-VN')}`;
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 80) return 'text-emerald-500';
  if (confidence >= 60) return 'text-amber-500';
  return 'text-muted-foreground';
};

const getConfidenceBarColor = (confidence: number) => {
  if (confidence >= 80) return 'bg-emerald-500';
  if (confidence >= 60) return 'bg-amber-500';
  return 'bg-muted-foreground';
};

export function AIPredictionCard({ 
  prediction = demoPrediction, 
  onAction,
  isLoading 
}: AIPredictionCardProps) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Advisor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-8 bg-muted rounded" />
          <div className="h-10 bg-muted rounded w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        {/* Animated accent line */}
        <motion.div
          className="h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{ transformOrigin: 'left' }}
        />

        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="h-4 w-4 text-primary" />
              </motion.div>
              AI Advisor
            </CardTitle>
            <Badge 
              variant="outline" 
              className="text-xs bg-primary/10 border-primary/30"
            >
              <Brain className="h-3 w-3 mr-1" />
              {prediction.basedOnPatterns} patterns
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Confidence Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Confidence</span>
              <motion.span
                className={cn('font-bold', getConfidenceColor(prediction.confidence))}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {prediction.confidence}%
              </motion.span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full',
                  getConfidenceBarColor(prediction.confidence)
                )}
                initial={{ width: 0 }}
                animate={{ width: `${prediction.confidence}%` }}
                transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
              />
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ left: ['-25%', '125%'] }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity, 
                  repeatDelay: 2,
                  ease: 'easeInOut'
                }}
              />
            </div>
          </div>

          {/* Recommendation */}
          <motion.div
            className="bg-card border rounded-lg p-3 space-y-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Đề xuất
            </p>
            <p className="font-medium">{prediction.recommendation}</p>
            {prediction.reasoning && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {prediction.reasoning}
              </p>
            )}
          </motion.div>

          {/* Predicted Impact */}
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className={cn(
                'h-4 w-4',
                prediction.predictedOutcome === 'positive' ? 'text-emerald-500' : 
                prediction.predictedOutcome === 'negative' ? 'text-destructive' : 
                'text-muted-foreground'
              )} />
              <span className="text-sm text-muted-foreground">Predicted Save</span>
            </div>
            <motion.span
              className={cn(
                'text-lg font-bold',
                prediction.predictedOutcome === 'positive' ? 'text-emerald-500' : 
                prediction.predictedOutcome === 'negative' ? 'text-destructive' : 
                'text-foreground'
              )}
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            >
              {formatCurrency(prediction.predictedImpact)}
            </motion.span>
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Button 
              className="w-full group"
              onClick={() => onAction?.(prediction)}
            >
              <span>Thực hiện đề xuất</span>
              <motion.div
                className="ml-2"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="h-4 w-4" />
              </motion.div>
            </Button>
          </motion.div>

          {/* Timestamp */}
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Cập nhật {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
