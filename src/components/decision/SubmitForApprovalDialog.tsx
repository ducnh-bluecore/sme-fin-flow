import { useState } from 'react';
import { format } from 'date-fns';
import { Send, Calendar, Target, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSubmitForApproval } from '@/hooks/usePendingDecisions';
import { DecisionAnalysis } from '@/hooks/useDecisionAnalyses';

interface SubmitForApprovalDialogProps {
  analysis: DecisionAnalysis;
}

export function SubmitForApprovalDialog({ analysis }: SubmitForApprovalDialogProps) {
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [deadline, setDeadline] = useState('');
  const [impact, setImpact] = useState('');
  const submitMutation = useSubmitForApproval();

  const handleSubmit = async () => {
    await submitMutation.mutateAsync({
      decisionId: analysis.id,
      priority,
      deadline: deadline || undefined,
      impact: impact || undefined,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Send className="h-3 w-3" />
          Gửi duyệt
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gửi yêu cầu phê duyệt</DialogTitle>
          <DialogDescription>
            Gửi phân tích "{analysis.title}" để CEO/Board xem xét và phê duyệt
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Mức độ ưu tiên
            </Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as 'high' | 'medium' | 'low')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">
                  <span className="text-red-500 font-medium">Cao - Cần quyết định ngay</span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className="text-yellow-500 font-medium">Trung bình</span>
                </SelectItem>
                <SelectItem value="low">
                  <span className="text-green-500 font-medium">Thấp - Có thể chờ</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Deadline quyết định
            </Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Tác động dự kiến
            </Label>
            <Input
              placeholder="VD: Revenue +15%, Cost -10%"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
            {submitMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
