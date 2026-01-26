import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save } from 'lucide-react';
import type { ResearchFilters } from '@/hooks/useCDPExplore';

interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ResearchFilters;
  customerCount: number;
  onSave: (name: string, description: string) => void;
  isSaving: boolean;
}

export function SaveViewDialog({
  open,
  onOpenChange,
  filters,
  customerCount,
  onSave,
  isSaving,
}: SaveViewDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const generateAutoDescription = () => {
    const parts: string[] = [];
    if (filters.orderCount && filters.orderCount !== 'all') {
      parts.push(`Số đơn: ${filters.orderCount}`);
    }
    if (filters.lastPurchase && filters.lastPurchase !== 'all') {
      parts.push(`Lần mua gần nhất: ${filters.lastPurchase}`);
    }
    if (filters.repurchaseCycle && filters.repurchaseCycle !== 'all') {
      parts.push(`Chu kỳ mua: ${filters.repurchaseCycle}`);
    }
    if (filters.totalSpend && filters.totalSpend !== 'all') {
      parts.push(`Tổng chi tiêu: ${filters.totalSpend}`);
    }
    if (filters.aov && filters.aov !== 'all') {
      parts.push(`AOV: ${filters.aov}`);
    }
    return parts.length > 0 ? parts.join(' | ') : 'Tập khách hàng nghiên cứu';
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name, description || generateAutoDescription());
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setName('');
      setDescription('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lưu góc nhìn nghiên cứu</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="view-name">Tên góc nhìn *</Label>
            <Input
              id="view-name"
              placeholder="VD: Khách VIP mua trên 10 đơn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="view-description">Mô tả (tùy chọn)</Label>
            <Textarea
              id="view-description"
              placeholder={generateAutoDescription()}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Số khách hàng phù hợp: </span>
            <span className="font-medium">{customerCount.toLocaleString()}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Lưu góc nhìn
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
