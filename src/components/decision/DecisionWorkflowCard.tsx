import { useState, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  RotateCcw, 
  History, 
  Send, 
  Clock, 
  User,
  MessageSquare,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatVNDCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MetricItem {
  label: string;
  value: string;
}

interface DecisionWorkflowCardProps {
  recommendation: string;
  confidence: number;
  metrics?: MetricItem[];
  savings?: number;
  breakEvenVolume?: number;
  analysisType?: string;
  onApprove?: () => void;
  onRequestData?: () => void;
  onViewHistory?: () => void;
  status?: 'pending' | 'approved' | 'rejected';
  icon?: ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'neutral';
  className?: string;
}

export function DecisionWorkflowCard({
  recommendation,
  confidence,
  metrics = [],
  savings,
  breakEvenVolume,
  analysisType = 'Decision Analysis',
  onApprove,
  onRequestData,
  onViewHistory,
  status = 'pending',
  icon,
  variant = 'neutral',
  className,
}: DecisionWorkflowCardProps) {
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const variantConfig = {
    success: {
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
    },
    warning: {
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
    },
    danger: {
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    neutral: {
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/20',
    },
  };

  const config = variantConfig[variant];
  const confidenceLevel = confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low';

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onApprove?.();
      toast.success('Quyết định đã được phê duyệt và lưu lại!');
      setApprovalOpen(false);
    } catch (error) {
      toast.error('Có lỗi xảy ra khi phê duyệt');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Card className={cn('overflow-hidden', config.border, className)}>
      <CardHeader className={cn('pb-4', config.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className={cn('h-12 w-12 rounded-xl flex items-center justify-center', config.bg)}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {icon || <Sparkles className={cn('h-6 w-6', config.color)} />}
            </motion.div>
            <div>
              <CardTitle className="text-base">Khuyến nghị quyết định</CardTitle>
              <p className="text-sm text-muted-foreground">{analysisType}</p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              'px-3 py-1',
              confidenceLevel === 'high' && 'border-green-500 text-green-500',
              confidenceLevel === 'medium' && 'border-yellow-500 text-yellow-500',
              confidenceLevel === 'low' && 'border-muted-foreground text-muted-foreground'
            )}
          >
            {confidence.toFixed(0)}% tin cậy
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Main recommendation */}
        <div className="text-center">
          <h2 className={cn('text-2xl font-bold', config.color)}>
            {recommendation}
          </h2>
          {(savings !== undefined || breakEvenVolume !== undefined) && (
            <div className="mt-2 flex items-center justify-center gap-3 text-sm text-muted-foreground">
              {savings !== undefined && savings > 0 && (
                <span>
                  Tiết kiệm: <strong className="text-foreground">{formatVNDCompact(savings)}</strong>
                </span>
              )}
              {breakEvenVolume !== undefined && (
                <>
                  {savings !== undefined && <span className="text-border">|</span>}
                  <span>
                    Hòa vốn: <strong className="text-foreground">{breakEvenVolume.toLocaleString()} đơn vị</strong>
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Metrics grid */}
        {metrics.length > 0 && (
          <div className={cn('grid gap-3', metrics.length <= 2 ? 'grid-cols-2' : 'grid-cols-4')}>
            {metrics.map((metric, i) => (
              <div key={i} className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="text-sm font-bold mt-1">{metric.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Confidence bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Độ tin cậy</span>
            <span className={cn(
              'font-medium',
              confidenceLevel === 'high' && 'text-green-500',
              confidenceLevel === 'medium' && 'text-yellow-500',
              confidenceLevel === 'low' && 'text-muted-foreground'
            )}>
              {confidenceLevel === 'high' ? 'Cao' : confidenceLevel === 'medium' ? 'Trung bình' : 'Thấp'}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                confidenceLevel === 'high' && 'bg-green-500',
                confidenceLevel === 'medium' && 'bg-yellow-500',
                confidenceLevel === 'low' && 'bg-muted-foreground'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
            <DialogTrigger asChild>
              <Button className="flex-col h-auto py-4 gap-2" variant="default">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-xs">Duyệt & Lưu</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Phê duyệt quyết định</DialogTitle>
                <DialogDescription>
                  Xác nhận phê duyệt khuyến nghị và lưu vào lịch sử.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className={cn('p-4 rounded-lg', config.bg)}>
                  <div className="flex items-center gap-3">
                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', config.bg)}>
                      {icon || <Sparkles className={cn('h-5 w-5', config.color)} />}
                    </div>
                    <div>
                      <p className="font-semibold">{recommendation}</p>
                      <p className="text-sm text-muted-foreground">
                        Confidence: {confidence.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Ghi chú (tùy chọn)</label>
                  <Textarea
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder="Thêm ghi chú cho quyết định này..."
                    className="mt-2"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApprovalOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleApprove} disabled={isApproving}>
                  {isApproving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                      </motion.div>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Phê duyệt
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            className="flex-col h-auto py-4 gap-2"
            onClick={onRequestData}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs">Yêu cầu thêm</span>
          </Button>

          <Button 
            variant="outline" 
            className="flex-col h-auto py-4 gap-2"
            onClick={onViewHistory}
          >
            <History className="h-5 w-5" />
            <span className="text-xs">Lịch sử</span>
          </Button>
        </div>

        {/* Assignment info */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Assigned to: <strong className="text-foreground">CFO</strong></span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Due: <strong className="text-foreground">3 ngày</strong></span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
