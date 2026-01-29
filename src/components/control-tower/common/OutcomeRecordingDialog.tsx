import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, BarChart3, ArrowRight, ArrowLeft, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRecordOutcome, OutcomeVerdict } from '@/hooks/control-tower';

interface OutcomeRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: {
    id: string;
    title: string;
    category?: string;
    impact_amount?: number | null;
  };
}

const formatCurrency = (amount: number): string => {
  if (Math.abs(amount) >= 1_000_000_000) return `₫${(amount / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(amount) >= 1_000_000) return `₫${(amount / 1_000_000).toFixed(0)}M`;
  return `₫${amount.toLocaleString('vi-VN')}`;
};

type Step = 'input' | 'confirm';

export function OutcomeRecordingDialog({
  open,
  onOpenChange,
  alert,
}: OutcomeRecordingDialogProps) {
  const [step, setStep] = useState<Step>('input');
  const [cannotMeasure, setCannotMeasure] = useState(false);
  const [actualImpact, setActualImpact] = useState<string>('');
  const [verdict, setVerdict] = useState<OutcomeVerdict>('as_expected');
  const [notes, setNotes] = useState<string>('');
  const [followupDate, setFollowupDate] = useState<Date | undefined>(addDays(new Date(), 14));

  const { mutate: recordOutcome, isPending } = useRecordOutcome();

  const predictedImpact = alert.impact_amount || 0;
  const actualValue = actualImpact ? parseFloat(actualImpact) : 0;
  
  // Computed metrics
  const hasActual = actualImpact && actualValue > 0;
  const variance = hasActual && predictedImpact !== 0
    ? ((actualValue - predictedImpact) / Math.abs(predictedImpact)) * 100 
    : 0;
  const accuracy = hasActual && (actualValue > 0 || predictedImpact > 0)
    ? (Math.min(actualValue, predictedImpact) / Math.max(actualValue, predictedImpact)) * 100
    : 0;
  const varianceAmount = hasActual ? actualValue - predictedImpact : 0;

  // Auto-suggest verdict based on variance
  const suggestedVerdict: OutcomeVerdict = 
    variance > 10 ? 'better_than_expected' :
    variance < -10 ? 'worse_than_expected' :
    'as_expected';

  // Set suggested verdict when entering confirm step
  useEffect(() => {
    if (step === 'confirm' && hasActual) {
      setVerdict(suggestedVerdict);
    }
  }, [step, suggestedVerdict, hasActual]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('input');
      setCannotMeasure(false);
      setActualImpact('');
      setVerdict('as_expected');
      setNotes('');
      setFollowupDate(addDays(new Date(), 14));
    }
  }, [open]);

  const handleFollowupSubmit = () => {
    recordOutcome(
      {
        alertId: alert.id,
        decisionTitle: alert.title,
        decisionType: alert.category?.toUpperCase() || 'SYSTEM',
        predictedImpactAmount: predictedImpact,
        outcomeVerdict: 'pending_followup',
        outcomeNotes: notes || undefined,
        followupDueDate: followupDate?.toISOString(),
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  const handleSubmit = () => {
    recordOutcome(
      {
        alertId: alert.id,
        decisionTitle: alert.title,
        decisionType: alert.category?.toUpperCase() || 'SYSTEM',
        predictedImpactAmount: predictedImpact,
        actualImpactAmount: actualValue,
        outcomeVerdict: verdict,
        outcomeNotes: notes || undefined,
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  const canProceedToConfirm = !cannotMeasure && actualImpact && actualValue > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'input' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Đo lường kết quả
              </DialogTitle>
              <DialogDescription>
                Nhập kết quả thực tế để so sánh với dự đoán ban đầu.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Decision Info */}
              <div className="rounded-lg bg-muted p-4">
                <p className="font-medium">{alert.title}</p>
                <p className="text-lg font-bold mt-2">
                  Dự đoán: {formatCurrency(predictedImpact)}
                </p>
              </div>

              {/* Actual Input */}
              <div className="space-y-3">
                <Label htmlFor="actualImpact">Impact thực tế là bao nhiêu?</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₫</span>
                  <Input
                    id="actualImpact"
                    type="number"
                    placeholder="0"
                    value={actualImpact}
                    onChange={(e) => setActualImpact(e.target.value)}
                    disabled={cannotMeasure}
                    className="pl-8"
                  />
                </div>

                {/* Cannot Measure Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cannotMeasure"
                    checked={cannotMeasure}
                    onCheckedChange={(checked) => setCannotMeasure(checked === true)}
                  />
                  <Label htmlFor="cannotMeasure" className="text-sm cursor-pointer">
                    Chưa thể đo lường (theo dõi sau)
                  </Label>
                </div>
              </div>

              {/* Follow-up Date (only if cannot measure) */}
              {cannotMeasure && (
                <div className="space-y-2">
                  <Label>Ngày theo dõi</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !followupDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {followupDate ? format(followupDate, "PPP", { locale: vi }) : "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={followupDate}
                        onSelect={setFollowupDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              {cannotMeasure ? (
                <Button onClick={handleFollowupSubmit} disabled={isPending}>
                  {isPending ? 'Đang lưu...' : 'Đặt lịch theo dõi'}
                </Button>
              ) : (
                <Button 
                  onClick={() => setStep('confirm')} 
                  disabled={!canProceedToConfirm}
                >
                  Xem kết quả <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Kết quả so sánh
              </DialogTitle>
              <DialogDescription>
                Xác nhận đánh giá dựa trên kết quả so sánh.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Side-by-side Comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Dự đoán</p>
                  <p className="text-xl font-bold">{formatCurrency(predictedImpact)}</p>
                </div>
                <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Thực tế</p>
                  <p className="text-xl font-bold">{formatCurrency(actualValue)}</p>
                </div>
              </div>

              {/* Metrics */}
              <div className="rounded-lg bg-muted p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    {variance >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    Variance
                  </span>
                  <span className={cn(
                    "font-medium",
                    variance > 0 ? "text-emerald-600" : variance < 0 ? "text-destructive" : ""
                  )}>
                    {variance > 0 ? '+' : ''}{formatCurrency(varianceAmount)} ({variance > 0 ? '+' : ''}{variance.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Accuracy
                  </span>
                  <span className="font-medium">{accuracy.toFixed(1)}%</span>
                </div>
              </div>

              {/* Verdict Selection */}
              <div className="space-y-2">
                <Label>Xác nhận đánh giá</Label>
                <RadioGroup
                  value={verdict}
                  onValueChange={(v) => setVerdict(v as OutcomeVerdict)}
                  className="grid grid-cols-1 gap-2"
                >
                  <div className={cn(
                    "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    verdict === 'better_than_expected' && "border-emerald-500 bg-emerald-500/5"
                  )}>
                    <RadioGroupItem value="better_than_expected" id="better" />
                    <Label htmlFor="better" className="flex-1 cursor-pointer flex items-center justify-between">
                      <span>Tốt hơn kỳ vọng</span>
                      {suggestedVerdict === 'better_than_expected' && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">
                          Gợi ý
                        </span>
                      )}
                    </Label>
                  </div>
                  <div className={cn(
                    "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    verdict === 'as_expected' && "border-primary bg-primary/5"
                  )}>
                    <RadioGroupItem value="as_expected" id="expected" />
                    <Label htmlFor="expected" className="flex-1 cursor-pointer flex items-center justify-between">
                      <span>Đúng như kỳ vọng</span>
                      {suggestedVerdict === 'as_expected' && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Gợi ý
                        </span>
                      )}
                    </Label>
                  </div>
                  <div className={cn(
                    "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    verdict === 'worse_than_expected' && "border-destructive bg-destructive/5"
                  )}>
                    <RadioGroupItem value="worse_than_expected" id="worse" />
                    <Label htmlFor="worse" className="flex-1 cursor-pointer flex items-center justify-between">
                      <span>Kém hơn kỳ vọng</span>
                      {suggestedVerdict === 'worse_than_expected' && (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                          Gợi ý
                        </span>
                      )}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
                <Textarea
                  id="notes"
                  placeholder="Thêm ghi chú về kết quả..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('input')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? 'Đang lưu...' : 'Ghi nhận & Resolve'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
