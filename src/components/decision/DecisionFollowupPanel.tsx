import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ClipboardCheck, 
  Clock, 
  AlertTriangle, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  Eye,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { usePendingFollowups, useRecordOutcome, type PendingFollowup } from '@/hooks/useDecisionOutcomes';
import { useAutoMeasureOutcome, useSaveMeasuredOutcome } from '@/hooks/useAutoMeasureOutcome';

const formatCurrency = (value: number | null) => {
  if (value == null) return '-';
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (absValue >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString();
};

const URGENCY_CONFIG = {
  overdue: { label: 'Quá hạn', color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle },
  due_today: { label: 'Hôm nay', color: 'bg-orange-500 text-white', icon: Clock },
  due_soon: { label: 'Sắp đến hạn', color: 'bg-yellow-500 text-black', icon: Calendar },
  upcoming: { label: 'Sắp tới', color: 'bg-muted text-muted-foreground', icon: Calendar },
};

const OUTCOME_STATUS_CONFIG = {
  positive: { label: 'Tích cực', icon: TrendingUp, color: 'text-green-500' },
  neutral: { label: 'Trung lập', icon: Minus, color: 'text-muted-foreground' },
  negative: { label: 'Tiêu cực', icon: TrendingDown, color: 'text-destructive' },
  too_early: { label: 'Còn sớm', icon: Clock, color: 'text-yellow-500' },
};

export function DecisionFollowupPanel() {
  const { data: pendingFollowups = [], isLoading } = usePendingFollowups();
  const recordOutcome = useRecordOutcome();
  const autoMeasure = useAutoMeasureOutcome();
  const saveMeasured = useSaveMeasuredOutcome();
  
  const [selectedFollowup, setSelectedFollowup] = useState<PendingFollowup | null>(null);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [measurementResult, setMeasurementResult] = useState<any>(null);
  
  // Form state
  const [outcomeStatus, setOutcomeStatus] = useState<'positive' | 'neutral' | 'negative' | 'too_early'>('positive');
  const [outcomeSummary, setOutcomeSummary] = useState('');
  const [actualImpact, setActualImpact] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [wouldRepeat, setWouldRepeat] = useState(true);

  const openOutcomeDialog = async (followup: PendingFollowup) => {
    setSelectedFollowup(followup);
    setOutcomeDialogOpen(true);
    setMeasurementResult(null);
    
    // Auto-measure khi mở dialog
    try {
      const result = await autoMeasure.mutateAsync(followup.id);
      setMeasurementResult(result);
      setOutcomeStatus(result.suggestedStatus);
      setOutcomeSummary(result.summary);
    } catch {
      // Fallback to manual if auto-measure fails
    }
    
    setLessonsLearned('');
    setWouldRepeat(true);
  };

  const handleRecordOutcome = async () => {
    if (!selectedFollowup || !outcomeSummary) return;

    if (measurementResult) {
      // Use auto-measured data
      await saveMeasured.mutateAsync({
        decisionAuditId: selectedFollowup.id,
        measurementResult,
        outcomeSummary,
        outcomeStatus,
        lessonsLearned: lessonsLearned || undefined,
        wouldRepeat,
      });
    } else {
      // Manual entry
      await recordOutcome.mutateAsync({
        decisionAuditId: selectedFollowup.id,
        actualImpactAmount: actualImpact ? parseFloat(actualImpact) : undefined,
        expectedImpactAmount: selectedFollowup.expected_impact_amount ?? undefined,
        outcomeStatus,
        outcomeSummary,
        lessonsLearned: lessonsLearned || undefined,
        wouldRepeat,
      });
    }

    setOutcomeDialogOpen(false);
    setSelectedFollowup(null);
    setMeasurementResult(null);
  };

  // Group by urgency
  const overdueItems = pendingFollowups.filter(f => f.urgency === 'overdue');
  const dueTodayItems = pendingFollowups.filter(f => f.urgency === 'due_today');
  const dueSoonItems = pendingFollowups.filter(f => f.urgency === 'due_soon');
  const upcomingItems = pendingFollowups.filter(f => f.urgency === 'upcoming');

  const renderFollowupItem = (followup: PendingFollowup) => {
    const urgencyConfig = URGENCY_CONFIG[followup.urgency];
    const UrgencyIcon = urgencyConfig.icon;

    return (
      <div 
        key={followup.id}
        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${urgencyConfig.color}`}>
            <UrgencyIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{followup.entity_label || followup.entity_id}</span>
              <Badge variant="outline" className="shrink-0">
                {followup.selected_action_type || followup.card_type}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>Đã quyết định {formatDistanceToNow(new Date(followup.decided_at), { addSuffix: true, locale: vi })}</span>
              {followup.expected_impact_amount && (
                <>
                  <span>•</span>
                  <span>Kỳ vọng: {formatCurrency(followup.expected_impact_amount)}đ</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right text-sm">
            <div className="font-medium">{format(new Date(followup.follow_up_date), 'dd/MM')}</div>
            <div className="text-muted-foreground text-xs">{urgencyConfig.label}</div>
          </div>
          <Button size="sm" onClick={() => openOutcomeDialog(followup)}>
            <ClipboardCheck className="h-4 w-4 mr-1" />
            Ghi nhận
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Theo dõi quyết định
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Đang tải...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Theo dõi quyết định
            </div>
            {pendingFollowups.length > 0 && (
              <Badge variant={overdueItems.length > 0 ? 'destructive' : 'secondary'}>
                {pendingFollowups.length} cần theo dõi
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingFollowups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mb-2 opacity-50" />
              <p>Không có quyết định nào cần theo dõi</p>
              <p className="text-sm">Các quyết định mới sẽ xuất hiện ở đây sau 7 ngày</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {overdueItems.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-destructive mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Quá hạn ({overdueItems.length})
                    </h4>
                    <div className="space-y-2">
                      {overdueItems.map(renderFollowupItem)}
                    </div>
                  </div>
                )}
                
                {dueTodayItems.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-orange-500 mb-2">
                      Hôm nay ({dueTodayItems.length})
                    </h4>
                    <div className="space-y-2">
                      {dueTodayItems.map(renderFollowupItem)}
                    </div>
                  </div>
                )}
                
                {dueSoonItems.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-yellow-600 mb-2">
                      Sắp đến hạn ({dueSoonItems.length})
                    </h4>
                    <div className="space-y-2">
                      {dueSoonItems.map(renderFollowupItem)}
                    </div>
                  </div>
                )}
                
                {upcomingItems.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Sắp tới ({upcomingItems.length})
                    </h4>
                    <div className="space-y-2">
                      {upcomingItems.map(renderFollowupItem)}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Outcome Recording Dialog */}
      <Dialog open={outcomeDialogOpen} onOpenChange={setOutcomeDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {autoMeasure.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang đo lường tự động...
                </>
              ) : measurementResult ? (
                <>
                  <Sparkles className="h-5 w-5 text-primary" />
                  Kết quả đo lường tự động
                </>
              ) : (
                'Ghi nhận kết quả quyết định'
              )}
            </DialogTitle>
            <DialogDescription>
              Hệ thống tự động so sánh metrics trước và sau quyết định. Bạn có thể chỉnh sửa trước khi lưu.
            </DialogDescription>
          </DialogHeader>
          
          {selectedFollowup && (
            <div className="space-y-4">
              {/* Decision context */}
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{selectedFollowup.entity_label || selectedFollowup.entity_id}</div>
                <div className="text-sm text-muted-foreground">
                  Hành động: <span className="font-medium">{selectedFollowup.selected_action_label || selectedFollowup.selected_action_type}</span>
                </div>
                {selectedFollowup.expected_outcome && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Kỳ vọng: {selectedFollowup.expected_outcome}
                  </div>
                )}
              </div>

              {/* Auto-measured Variance Display */}
              {measurementResult && measurementResult.variance && (
                <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">So sánh Trước vs Sau</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(measurementResult.variance).map(([key, v]: [string, any]) => {
                      if (v.baseline === 0 && v.current === 0) return null;
                      const isPositive = v.change > 0;
                      const isNegative = v.change < 0;
                      // For some metrics, negative is good (e.g., monthly_burn)
                      const invertedMetrics = ['monthly_burn'];
                      const displayPositive = invertedMetrics.includes(key) ? isNegative : isPositive;
                      
                      return (
                        <div key={key} className="flex items-center justify-between p-2 rounded bg-background/50">
                          <span className="text-sm text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono">{formatCurrency(v.baseline)}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-sm font-mono font-medium">{formatCurrency(v.current)}</span>
                            <Badge 
                              variant="outline" 
                              className={displayPositive ? 'text-green-600 border-green-600/30' : isNegative ? 'text-red-600 border-red-600/30' : ''}
                            >
                              {v.changePercent >= 0 ? '+' : ''}{v.changePercent}%
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Loading state */}
              {autoMeasure.isPending && (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Đang đo lường metrics hiện tại...
                </div>
              )}

              {/* Outcome status */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Kết quả thực tế
                  {measurementResult && (
                    <Badge variant="secondary" className="text-xs">
                      Gợi ý: {OUTCOME_STATUS_CONFIG[measurementResult.suggestedStatus]?.label}
                    </Badge>
                  )}
                </Label>
                <Select value={outcomeStatus} onValueChange={(v: any) => setOutcomeStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OUTCOME_STATUS_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${config.color}`} />
                            {config.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Actual impact - hide if auto-measured */}
              {!measurementResult && (
                <div className="space-y-2">
                  <Label>Tác động thực tế (VND)</Label>
                  <Input 
                    type="number"
                    placeholder="Nhập số tiền tác động thực tế"
                    value={actualImpact}
                    onChange={(e) => setActualImpact(e.target.value)}
                  />
                  {selectedFollowup.expected_impact_amount && (
                    <p className="text-sm text-muted-foreground">
                      Kỳ vọng ban đầu: {formatCurrency(selectedFollowup.expected_impact_amount)}đ
                    </p>
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Tóm tắt kết quả *
                  {measurementResult && (
                    <Badge variant="outline" className="text-xs text-primary">
                      Tự động tạo
                    </Badge>
                  )}
                </Label>
                <Textarea
                  placeholder="Mô tả ngắn gọn kết quả của quyết định này..."
                  value={outcomeSummary}
                  onChange={(e) => setOutcomeSummary(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Lessons learned */}
              <div className="space-y-2">
                <Label>Bài học kinh nghiệm</Label>
                <Textarea
                  placeholder="Bạn học được gì từ quyết định này?"
                  value={lessonsLearned}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Would repeat */}
              <div className="flex items-center justify-between">
                <Label>Nếu gặp lại, bạn có ra quyết định tương tự?</Label>
                <Switch checked={wouldRepeat} onCheckedChange={setWouldRepeat} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOutcomeDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleRecordOutcome}
              disabled={!outcomeSummary || recordOutcome.isPending || saveMeasured.isPending || autoMeasure.isPending}
              className="gap-2"
            >
              {(recordOutcome.isPending || saveMeasured.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : measurementResult ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Xác nhận kết quả
                </>
              ) : (
                'Ghi nhận'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
