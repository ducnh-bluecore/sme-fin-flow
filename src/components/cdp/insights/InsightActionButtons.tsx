/**
 * Insight Action Buttons Component
 * 
 * Provides dismiss/snooze/reactivate actions for CDP insights.
 * Phase 6.1 - UI Polish.
 */

import { useState } from 'react';
import { 
  EyeOff, 
  Clock, 
  RefreshCw,
  Loader2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  useDismissInsight, 
  useSnoozeInsight, 
  useReactivateInsight 
} from '@/hooks/useInsightActions';

interface InsightActionButtonsProps {
  insightEventId: string;
  status: 'active' | 'dismissed' | 'snoozed' | 'cooldown';
  variant?: 'default' | 'compact';
}

export function InsightActionButtons({ 
  insightEventId, 
  status,
  variant = 'default' 
}: InsightActionButtonsProps) {
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [snoozeDays, setSnoozeDays] = useState('7');

  const dismissMutation = useDismissInsight();
  const snoozeMutation = useSnoozeInsight();
  const reactivateMutation = useReactivateInsight();

  const isLoading = dismissMutation.isPending || snoozeMutation.isPending || reactivateMutation.isPending;

  const handleDismiss = () => {
    dismissMutation.mutate(
      { insightEventId, reason: reason || undefined },
      { onSuccess: () => {
        setDismissDialogOpen(false);
        setReason('');
      }}
    );
  };

  const handleSnooze = () => {
    snoozeMutation.mutate(
      { insightEventId, snoozeDays: parseInt(snoozeDays), reason: reason || undefined },
      { onSuccess: () => {
        setSnoozeDialogOpen(false);
        setReason('');
        setSnoozeDays('7');
      }}
    );
  };

  const handleReactivate = () => {
    reactivateMutation.mutate({ insightEventId });
  };

  // Dismissed or snoozed - show reactivate
  if (status === 'dismissed' || status === 'snoozed') {
    return (
      <Button
        variant="outline"
        size={variant === 'compact' ? 'sm' : 'default'}
        onClick={handleReactivate}
        disabled={isLoading}
        className="text-primary"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4 mr-2" />
        )}
        Kích hoạt lại
      </Button>
    );
  }

  // Active - show dismiss/snooze
  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size={variant === 'compact' ? 'sm' : 'default'}
          onClick={() => setDismissDialogOpen(true)}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground"
        >
          {variant === 'compact' ? (
            <X className="w-4 h-4" />
          ) : (
            <>
              <EyeOff className="w-4 h-4 mr-2" />
              Bỏ qua
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size={variant === 'compact' ? 'sm' : 'default'}
          onClick={() => setSnoozeDialogOpen(true)}
          disabled={isLoading}
        >
          {variant === 'compact' ? (
            <Clock className="w-4 h-4" />
          ) : (
            <>
              <Clock className="w-4 h-4 mr-2" />
              Tạm ẩn
            </>
          )}
        </Button>
      </div>

      {/* Dismiss Dialog */}
      <Dialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bỏ qua insight này?</DialogTitle>
            <DialogDescription>
              Insight sẽ không còn hiển thị trong danh sách chờ xử lý. 
              Bạn có thể kích hoạt lại sau nếu cần.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Lý do bỏ qua (tùy chọn)</Label>
              <Textarea
                placeholder="VD: Đã xử lý qua kênh khác, Không liên quan..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDismissDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleDismiss}
              disabled={dismissMutation.isPending}
            >
              {dismissMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Xác nhận bỏ qua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snooze Dialog */}
      <Dialog open={snoozeDialogOpen} onOpenChange={setSnoozeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạm ẩn insight</DialogTitle>
            <DialogDescription>
              Insight sẽ được ẩn đi và tự động hiển thị lại sau thời gian bạn chọn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tạm ẩn trong</Label>
              <Select value={snoozeDays} onValueChange={setSnoozeDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 ngày</SelectItem>
                  <SelectItem value="3">3 ngày</SelectItem>
                  <SelectItem value="7">7 ngày</SelectItem>
                  <SelectItem value="14">14 ngày</SelectItem>
                  <SelectItem value="30">30 ngày</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lý do (tùy chọn)</Label>
              <Textarea
                placeholder="VD: Đang chờ dữ liệu thêm, Xem xét sau..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSnoozeDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleSnooze}
              disabled={snoozeMutation.isPending}
            >
              {snoozeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Xác nhận tạm ẩn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
