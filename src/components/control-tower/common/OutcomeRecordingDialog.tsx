import { useState } from 'react';
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
import { CalendarIcon, CheckCircle2, Clock } from 'lucide-react';
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

export function OutcomeRecordingDialog({
  open,
  onOpenChange,
  alert,
}: OutcomeRecordingDialogProps) {
  const [verdict, setVerdict] = useState<OutcomeVerdict>('as_expected');
  const [actualImpact, setActualImpact] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [followupDate, setFollowupDate] = useState<Date | undefined>(addDays(new Date(), 14));

  const { mutate: recordOutcome, isPending } = useRecordOutcome();

  const predictedImpact = alert.impact_amount || 0;

  const handleSubmit = () => {
    recordOutcome(
      {
        alertId: alert.id,
        decisionTitle: alert.title,
        decisionType: alert.category?.toUpperCase() || 'SYSTEM',
        predictedImpactAmount: predictedImpact,
        actualImpactAmount: actualImpact ? parseFloat(actualImpact) : undefined,
        outcomeVerdict: verdict,
        outcomeNotes: notes || undefined,
        followupDueDate: verdict === 'pending_followup' && followupDate 
          ? followupDate.toISOString() 
          : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          // Reset form
          setVerdict('as_expected');
          setActualImpact('');
          setNotes('');
          setFollowupDate(addDays(new Date(), 14));
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Resolve Decision
          </DialogTitle>
          <DialogDescription>
            Ghi nhận kết quả thực tế của quyết định này để cải thiện độ chính xác trong tương lai.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Decision Info */}
          <div className="rounded-lg bg-muted p-3">
            <p className="font-medium">{alert.title}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Predicted Impact: {formatCurrency(predictedImpact)}
            </p>
          </div>

          {/* Outcome Verdict */}
          <div className="space-y-2">
            <Label>Kết quả thực tế</Label>
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
                <Label htmlFor="better" className="flex-1 cursor-pointer">
                  Tốt hơn kỳ vọng
                </Label>
              </div>
              <div className={cn(
                "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                verdict === 'as_expected' && "border-primary bg-primary/5"
              )}>
                <RadioGroupItem value="as_expected" id="expected" />
                <Label htmlFor="expected" className="flex-1 cursor-pointer">
                  Đúng như kỳ vọng
                </Label>
              </div>
              <div className={cn(
                "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                verdict === 'worse_than_expected' && "border-destructive bg-destructive/5"
              )}>
                <RadioGroupItem value="worse_than_expected" id="worse" />
                <Label htmlFor="worse" className="flex-1 cursor-pointer">
                  Kém hơn kỳ vọng
                </Label>
              </div>
              <div className={cn(
                "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                verdict === 'pending_followup' && "border-amber-500 bg-amber-500/5"
              )}>
                <RadioGroupItem value="pending_followup" id="pending" />
                <Label htmlFor="pending" className="flex-1 cursor-pointer flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Chưa thể đo lường (theo dõi sau)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Follow-up Date (only if pending) */}
          {verdict === 'pending_followup' && (
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

          {/* Actual Impact (optional) */}
          {verdict !== 'pending_followup' && (
            <div className="space-y-2">
              <Label htmlFor="actualImpact">Impact thực tế (nếu biết)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₫</span>
                <Input
                  id="actualImpact"
                  type="number"
                  placeholder="0"
                  value={actualImpact}
                  onChange={(e) => setActualImpact(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          )}

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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Đang lưu...' : 'Ghi nhận & Resolve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
