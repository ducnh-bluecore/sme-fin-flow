import { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Scale, 
  Target, 
  TrendingUp, 
  Calculator, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  usePendingDecisions, 
  useApproveDecision, 
  useRejectDecision,
  PendingDecision 
} from '@/hooks/usePendingDecisions';

const analysisTypeIcons: Record<string, typeof Scale> = {
  make_vs_buy: Scale,
  break_even: Target,
  roi: TrendingUp,
  npv_irr: Calculator,
  payback: Clock,
  sensitivity: TrendingUp,
  // Marketing decision types
  marketing_scale: TrendingUp,
  marketing_pause: XCircle,
  marketing_reduce: TrendingUp,
  marketing_investigate: AlertTriangle,
};

const analysisTypeLabels: Record<string, string> = {
  make_vs_buy: 'Make vs Buy',
  break_even: 'Break-even',
  roi: 'ROI',
  npv_irr: 'NPV/IRR',
  payback: 'Payback',
  sensitivity: 'Sensitivity',
  // Marketing decision types
  marketing_scale: 'MKT Scale',
  marketing_pause: 'MKT Pause',
  marketing_reduce: 'MKT Reduce',
  marketing_investigate: 'MKT Review',
};

const priorityConfig = {
  high: { label: 'Ưu tiên cao', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  medium: { label: 'Trung bình', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  low: { label: 'Thấp', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
};

function DecisionCard({ 
  decision,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: { 
  decision: PendingDecision;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const Icon = analysisTypeIcons[decision.analysis_type] || Scale;
  const priority = priorityConfig[decision.priority || 'medium'];

  const handleReject = () => {
    onReject(decision.id, rejectReason);
    setShowRejectDialog(false);
    setRejectReason('');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {analysisTypeLabels[decision.analysis_type] || decision.analysis_type}
                </Badge>
                <Badge variant="outline" className={priority.color}>
                  {priority.label}
                </Badge>
              </div>
              <h4 className="font-medium line-clamp-1">{decision.title}</h4>
              {decision.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {decision.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          {decision.impact && (
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {decision.impact}
            </span>
          )}
          {decision.deadline && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(decision.deadline), 'dd/MM/yyyy', { locale: vi })}
            </span>
          )}
        </div>

        {decision.recommendation && (
          <div className="p-2 rounded bg-primary/5 border border-primary/10 mb-3">
            <p className="text-xs font-medium text-primary">Khuyến nghị:</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {decision.recommendation}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onApprove(decision.id)}
            disabled={isApproving || isRejecting}
            className="gap-1"
          >
            {isApproving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            Phê duyệt
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRejectDialog(true)}
            disabled={isApproving || isRejecting}
            className="gap-1"
          >
            {isRejecting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            Từ chối
          </Button>
          <Link to="/decision-support" className="ml-auto">
            <Button size="sm" variant="ghost" className="gap-1">
              <ExternalLink className="h-3 w-3" />
              Chi tiết
            </Button>
          </Link>
        </div>
      </motion.div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối quyết định</DialogTitle>
            <DialogDescription>
              Vui lòng nêu lý do từ chối để người đề xuất có thể điều chỉnh
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Lý do từ chối (tùy chọn)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PendingDecisionsPanel() {
  const { data: decisions, isLoading } = usePendingDecisions();
  const approveMutation = useApproveDecision();
  const rejectMutation = useRejectDecision();

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: string, reason?: string) => {
    rejectMutation.mutate({ decisionId: id, reason });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Quyết định cần đưa ra
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Đang tải...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Quyết định cần đưa ra
            </CardTitle>
            <CardDescription>
              {decisions?.length || 0} quyết định đang chờ phê duyệt
            </CardDescription>
          </div>
          <Link to="/decision-support">
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="h-4 w-4" />
              Xem tất cả
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {!decisions || decisions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
            <p className="font-medium">Không có quyết định nào đang chờ</p>
            <p className="text-sm">Tất cả đã được xử lý</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {decisions.map((decision) => (
                <DecisionCard
                  key={decision.id}
                  decision={decision}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isApproving={approveMutation.isPending}
                  isRejecting={rejectMutation.isPending}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
