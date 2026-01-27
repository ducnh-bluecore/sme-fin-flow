import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, PlayCircle, ChevronRight, Sparkles, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AIInsight {
  id?: string;
  type: 'tip' | 'warning' | 'opportunity' | 'success' | 'critical' | 'info';
  title?: string;
  message: string;
  action?: string | {
    label: string;
    onClick: () => void;
  };
}

export interface InlineAIAdvisorProps {
  insights: AIInsight[];
  onDismiss?: (id: string) => void;
  className?: string;
}

export function InlineAIAdvisor({ insights, onDismiss, className }: InlineAIAdvisorProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    onDismiss?.(id);
  };

  // Add IDs to insights if missing
  const insightsWithIds = insights.map((insight, i) => ({
    ...insight,
    id: insight.id || `insight-${i}`,
    title: insight.title || getDefaultTitle(insight.type),
  }));

  const visibleInsights = insightsWithIds.filter((i) => !dismissedIds.has(i.id));

  if (visibleInsights.length === 0) return null;

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence>
        {visibleInsights.map((insight, index) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ delay: index * 0.1 }}
            className="mb-3 last:mb-0"
          >
            <AIInsightCard insight={insight} onDismiss={() => handleDismiss(insight.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function getDefaultTitle(type: AIInsight['type']): string {
  switch (type) {
    case 'tip': return 'Gợi ý';
    case 'warning': return 'Cảnh báo';
    case 'critical': return 'Cảnh báo nghiêm trọng';
    case 'success': return 'Tín hiệu tích cực';
    case 'opportunity': return 'Cơ hội';
    case 'info': return 'Thông tin';
    default: return 'AI Insight';
  }
}

interface AIInsightCardProps {
  insight: AIInsight & { id: string; title: string };
  onDismiss: () => void;
}

function AIInsightCard({ insight, onDismiss }: AIInsightCardProps) {
  const typeConfig = {
    tip: {
      icon: Lightbulb,
      bg: 'bg-primary/5 border-primary/20',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-500/5 border-blue-500/20',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-yellow-500/5 border-yellow-500/20',
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-500',
    },
    critical: {
      icon: AlertTriangle,
      bg: 'bg-red-500/5 border-red-500/20',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
    },
    success: {
      icon: CheckCircle,
      bg: 'bg-green-500/5 border-green-500/20',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
    },
    opportunity: {
      icon: Sparkles,
      bg: 'bg-green-500/5 border-green-500/20',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
    },
  };

  const config = typeConfig[insight.type] || typeConfig.tip;
  const Icon = config.icon;

  const actionConfig = typeof insight.action === 'string' 
    ? { label: insight.action, onClick: () => {} }
    : insight.action;

  return (
    <div className={cn('relative rounded-xl border p-4', config.bg)}>
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>

      <div className="flex gap-3">
        <motion.div 
          className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', config.iconBg)}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Icon className={cn('h-5 w-5', config.iconColor)} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{insight.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{insight.message}</p>

          {actionConfig && (
            <Button
              variant="ghost"
              size="sm"
              onClick={actionConfig.onClick}
              className="mt-2 -ml-2 text-xs h-7"
            >
              <PlayCircle className="h-3 w-3 mr-1" />
              {actionConfig.label}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Floating insight tooltip for chart annotations
interface FloatingInsightProps {
  insight: AIInsight & { position?: { x: number; y: number } };
  onDismiss: () => void;
}

export function FloatingInsight({ insight, onDismiss }: FloatingInsightProps) {
  const position = insight.position || { x: 50, y: 50 };
  const title = insight.title || getDefaultTitle(insight.type);
  const actionConfig = typeof insight.action === 'string' 
    ? { label: insight.action, onClick: () => {} }
    : insight.action;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="absolute z-20 w-64"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="relative">
        {/* Arrow pointing down */}
        <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-card" />
        
        <div className="bg-card rounded-xl shadow-elevated border p-4">
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">{insight.message}</p>
              
              {actionConfig && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="text-xs h-7" onClick={actionConfig.onClick}>
                    {actionConfig.label}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={onDismiss}>
                    Bỏ qua
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Hook to generate contextual insights based on analysis data
export function useDecisionInsights(analysisType: string, context: Record<string, any>) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const generateInsights = (): AIInsight[] => {
    const insights: AIInsight[] = [];

    if (analysisType === 'make-vs-buy') {
      const { makeTotalCost, buyTotalCost, breakEvenVolume, volume } = context;
      
      if (volume < breakEvenVolume * 0.5) {
        insights.push({
          id: 'breakeven-far',
          type: 'tip',
          title: 'Điểm hòa vốn còn xa',
          message: `Với sản lượng hiện tại ${volume?.toLocaleString()}, bạn chỉ đạt ${((volume / breakEvenVolume) * 100).toFixed(0)}% điểm hòa vốn. Thuê ngoài là lựa chọn an toàn hơn.`,
          action: {
            label: 'Chạy mô phỏng',
            onClick: () => console.log('Run simulation'),
          },
        });
      }

      if (Math.abs(makeTotalCost - buyTotalCost) / Math.max(makeTotalCost, buyTotalCost) < 0.1) {
        insights.push({
          id: 'close-margin',
          type: 'warning',
          title: 'Chênh lệch nhỏ',
          message: 'Hai phương án có chi phí gần bằng nhau. Cân nhắc thêm các yếu tố phi tài chính như kiểm soát chất lượng, thời gian giao hàng.',
        });
      }
    }

    if (analysisType === 'roi') {
      const { roi, annualizedROI } = context;
      
      if (roi > 50) {
        insights.push({
          id: 'high-roi',
          type: 'opportunity',
          title: 'ROI hấp dẫn',
          message: `ROI ${roi?.toFixed(1)}% vượt xa benchmark ngành (20-30%). Đây là cơ hội đầu tư tốt nếu rủi ro được kiểm soát.`,
        });
      }
    }

    return insights.filter((i) => !dismissedIds.has(i.id || ''));
  };

  const dismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  return {
    insights: generateInsights(),
    dismiss,
  };
}
