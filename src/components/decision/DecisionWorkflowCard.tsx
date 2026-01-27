import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  RotateCcw, 
  History, 
  Send, 
  Clock, 
  User,
  MessageSquare,
  ChevronRight,
  Sparkles
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
import { formatVNDCompact, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DecisionWorkflowCardProps {
  recommendation: 'make' | 'buy' | 'invest' | 'reject' | 'hold';
  savings: number;
  breakEvenVolume?: number;
  confidenceScore: number;
  analysisType: string;
  onApprove?: () => void;
  onRequestMore?: () => void;
  onViewHistory?: () => void;
  className?: string;
}

const recommendationLabels = {
  make: { label: 'Tự sản xuất', color: 'text-primary', bg: 'bg-primary/10' },
  buy: { label: 'Thuê ngoài', color: 'text-success', bg: 'bg-success/10' },
  invest: { label: 'Nên đầu tư', color: 'text-success', bg: 'bg-success/10' },
  reject: { label: 'Không đầu tư', color: 'text-destructive', bg: 'bg-destructive/10' },
  hold: { label: 'Chờ thêm dữ liệu', color: 'text-warning', bg: 'bg-warning/10' },
};

export function DecisionWorkflowCard({
  recommendation,
  savings,
  breakEvenVolume,
  confidenceScore,
  analysisType,
  onApprove,
  onRequestMore,
  onViewHistory,
  className,
}: DecisionWorkflowCardProps) {
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const recConfig = recommendationLabels[recommendation];
  const confidenceLevel = confidenceScore >= 80 ? 'high' : confidenceScore >= 65 ? 'medium' : 'low';

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onApprove?.();
      toast.success('Quyết định đã được phê duyệt và thông báo đến team!');
      setApprovalOpen(false);
    } catch (error) {
      toast.error('Có lỗi xảy ra khi phê duyệt');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn('pb-4', recConfig.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className={cn('h-12 w-12 rounded-xl flex items-center justify-center', recConfig.bg)}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Sparkles className={cn('h-6 w-6', recConfig.color)} />
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
              confidenceLevel === 'high' && 'border-success text-success',
              confidenceLevel === 'medium' && 'border-warning text-warning',
              confidenceLevel === 'low' && 'border-muted-foreground text-muted-foreground'
            )}
          >
            {confidenceScore.toFixed(0)}% tin cậy
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Main recommendation */}
        <div className="text-center">
          <h2 className={cn('text-2xl font-bold', recConfig.color)}>
            {recConfig.label.toUpperCase()}
          </h2>
          <div className="mt-2 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            {savings > 0 && (
              <span>
                Tiết kiệm: <strong className="text-foreground">{formatVNDCompact(savings)}</strong>
              </span>
            )}
            {breakEvenVolume && (
              <>
                <span className="text-border">|</span>
                <span>
                  Hòa vốn: <strong className="text-foreground">{breakEvenVolume.toLocaleString()} đơn vị</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Confidence bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Độ tin cậy</span>
            <span className={cn(
              'font-medium',
              confidenceLevel === 'high' && 'text-success',
              confidenceLevel === 'medium' && 'text-warning',
              confidenceLevel === 'low' && 'text-muted-foreground'
            )}>
              {confidenceLevel === 'high' ? 'Cao' : confidenceLevel === 'medium' ? 'Trung bình' : 'Thấp'}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                confidenceLevel === 'high' && 'bg-success',
                confidenceLevel === 'medium' && 'bg-warning',
                confidenceLevel === 'low' && 'bg-muted-foreground'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${confidenceScore}%` }}
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
                <span className="text-xs">Duyệt & Thông báo</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Phê duyệt quyết định</DialogTitle>
                <DialogDescription>
                  Xác nhận phê duyệt khuyến nghị "{recConfig.label}" và thông báo đến team.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', recConfig.bg)}>
                      <Sparkles className={cn('h-5 w-5', recConfig.color)} />
                    </div>
                    <div>
                      <p className="font-semibold">{recConfig.label}</p>
                      <p className="text-sm text-muted-foreground">
                        Tiết kiệm {formatVNDCompact(savings)}
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
            onClick={onRequestMore}
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
