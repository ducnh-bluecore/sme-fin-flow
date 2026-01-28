/**
 * Alert Resolution Workflow Component
 * 
 * Provides a complete resolution workflow for Control Tower alerts.
 * Phase 6.2 - UI Polish.
 */

import { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Clock,
  User,
  FileText,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  useStartAlertResolution,
  useCompleteAlertResolution,
  useMarkAlertFalsePositive,
  AlertWithResolution,
} from '@/hooks/useAlertResolution';

interface AlertResolutionWorkflowProps {
  alert: AlertWithResolution;
  variant?: 'card' | 'inline';
}

const resolutionTypeLabels: Record<string, string> = {
  action_taken: 'Đã xử lý',
  root_cause_fixed: 'Đã khắc phục nguyên nhân',
  monitoring: 'Đang theo dõi',
  false_positive: 'False Positive',
  escalated: 'Đã leo thang',
  auto_resolved: 'Tự động giải quyết',
};

const statusConfig = {
  pending: { label: 'Chờ xử lý', className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'Đang xử lý', className: 'bg-warning/10 text-warning-foreground border-warning/30' },
  resolved: { label: 'Đã xử lý', className: 'bg-success/10 text-success border-success/30' },
  escalated: { label: 'Đã leo thang', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  false_positive: { label: 'False Positive', className: 'bg-muted text-muted-foreground' },
};

export function AlertResolutionWorkflow({ alert, variant = 'card' }: AlertResolutionWorkflowProps) {
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [falsePositiveDialogOpen, setFalsePositiveDialogOpen] = useState(false);
  const [resolutionType, setResolutionType] = useState<string>('action_taken');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [falsePositiveReason, setFalsePositiveReason] = useState('');

  const startMutation = useStartAlertResolution();
  const completeMutation = useCompleteAlertResolution();
  const falsePositiveMutation = useMarkAlertFalsePositive();

  const isLoading = startMutation.isPending || completeMutation.isPending || falsePositiveMutation.isPending;
  const status = statusConfig[alert.resolution_status as keyof typeof statusConfig] || statusConfig.pending;

  const handleStart = () => {
    startMutation.mutate({ alertId: alert.id });
  };

  const handleComplete = () => {
    completeMutation.mutate(
      {
        alertId: alert.id,
        resolutionType: resolutionType as any,
        resolutionNotes: resolutionNotes || undefined,
        rootCause: rootCause || undefined,
      },
      {
        onSuccess: () => {
          setResolveDialogOpen(false);
          setResolutionNotes('');
          setRootCause('');
        },
      }
    );
  };

  const handleFalsePositive = () => {
    falsePositiveMutation.mutate(
      { alertId: alert.id, reason: falsePositiveReason },
      {
        onSuccess: () => {
          setFalsePositiveDialogOpen(false);
          setFalsePositiveReason('');
        },
      }
    );
  };

  const formatTime = (minutes: number | null) => {
    if (minutes === null) return '-';
    if (minutes < 60) return `${Math.round(minutes)} phút`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(1)} giờ`;
    return `${(minutes / 1440).toFixed(1)} ngày`;
  };

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2">
        <Badge className={cn('text-xs', status.className)}>{status.label}</Badge>
        
        {alert.resolution_status === 'pending' && (
          <Button size="sm" onClick={handleStart} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          </Button>
        )}
        
        {alert.resolution_status === 'in_progress' && (
          <Button size="sm" onClick={() => setResolveDialogOpen(true)} disabled={isLoading}>
            <CheckCircle2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Trạng thái xử lý</CardTitle>
            <Badge className={cn('text-xs', status.className)}>{status.label}</Badge>
          </div>
          <CardDescription>
            Theo dõi tiến trình xử lý alert
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Đã tạo: {formatTime(alert.minutes_since_created)}</span>
            </div>
            {alert.minutes_in_progress !== null && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Đang xử lý: {formatTime(alert.minutes_in_progress)}</span>
              </div>
            )}
          </div>

          {/* Resolution info if resolved */}
          {alert.resolved_at && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="font-medium">
                    {resolutionTypeLabels[alert.resolution_type || ''] || alert.resolution_type}
                  </span>
                </div>
                {alert.resolution_notes && (
                  <p className="text-muted-foreground pl-6">{alert.resolution_notes}</p>
                )}
                {alert.root_cause && (
                  <div className="pl-6">
                    <span className="text-muted-foreground">Nguyên nhân: </span>
                    <span>{alert.root_cause}</span>
                  </div>
                )}
                {alert.time_to_resolve_minutes !== null && (
                  <div className="pl-6 text-muted-foreground">
                    Thời gian xử lý: {formatTime(alert.time_to_resolve_minutes)}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Action buttons */}
          {alert.resolution_status === 'pending' && (
            <div className="flex items-center gap-2">
              <Button onClick={handleStart} disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Bắt đầu xử lý
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setFalsePositiveDialogOpen(true)} 
                disabled={isLoading}
              >
                <AlertTriangle className="w-4 h-4" />
              </Button>
            </div>
          )}

          {alert.resolution_status === 'in_progress' && (
            <div className="flex items-center gap-2">
              <Button onClick={() => setResolveDialogOpen(true)} disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Hoàn thành xử lý
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setFalsePositiveDialogOpen(true)} 
                disabled={isLoading}
              >
                <AlertTriangle className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hoàn thành xử lý Alert</DialogTitle>
            <DialogDescription>
              Ghi nhận kết quả xử lý để theo dõi và phân tích sau này.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Loại xử lý</Label>
              <Select value={resolutionType} onValueChange={setResolutionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="action_taken">Đã xử lý - Thực hiện hành động</SelectItem>
                  <SelectItem value="root_cause_fixed">Đã khắc phục nguyên nhân gốc</SelectItem>
                  <SelectItem value="monitoring">Tiếp tục theo dõi</SelectItem>
                  <SelectItem value="escalated">Leo thang lên cấp cao hơn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nguyên nhân (tùy chọn)</Label>
              <Input
                placeholder="VD: Lỗi cấu hình giá, Data lag..."
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ghi chú xử lý (tùy chọn)</Label>
              <Textarea
                placeholder="Mô tả chi tiết các bước đã thực hiện..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResolveDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleComplete} disabled={completeMutation.isPending}>
              {completeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Xác nhận hoàn thành
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* False Positive Dialog */}
      <Dialog open={falsePositiveDialogOpen} onOpenChange={setFalsePositiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đánh dấu False Positive</DialogTitle>
            <DialogDescription>
              Alert này không thực sự là vấn đề và sẽ được loại khỏi thống kê.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Lý do</Label>
              <Textarea
                placeholder="VD: Dữ liệu test, Số liệu đúng theo kế hoạch..."
                value={falsePositiveReason}
                onChange={(e) => setFalsePositiveReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFalsePositiveDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleFalsePositive} 
              disabled={falsePositiveMutation.isPending || !falsePositiveReason.trim()}
            >
              {falsePositiveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
