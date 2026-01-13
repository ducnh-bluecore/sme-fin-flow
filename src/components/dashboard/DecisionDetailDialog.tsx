import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingDown,
  DollarSign,
  Package,
  Zap,
  FileText,
  Calculator
} from 'lucide-react';
import { formatVND } from '@/lib/formatters';

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  impact: string;
  risk: 'low' | 'medium' | 'high';
}

export interface DecisionDetail {
  id: string;
  category: 'sku' | 'cash' | 'ar' | 'inventory' | 'ads';
  urgency: 'immediate' | 'today' | 'this_week';
  title: string;
  description: string;
  impact: string;
  impactAmount?: number;
  
  // Detail fields
  reasons: string[];
  formula?: string;
  currentValue?: number;
  threshold?: number;
  
  // Options
  options: DecisionOption[];
  
  // Related data
  relatedItems?: string[];
}

interface DecisionDetailDialogProps {
  decision: DecisionDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDecide: (decisionId: string, selectedOption: string, notes: string) => void;
}

const urgencyConfig = {
  immediate: {
    label: 'NGAY BÂY GIỜ',
    color: 'bg-red-500 text-white',
    icon: Zap,
  },
  today: {
    label: 'HÔM NAY',
    color: 'bg-orange-500 text-white',
    icon: Clock,
  },
  this_week: {
    label: 'TUẦN NÀY',
    color: 'bg-yellow-500 text-black',
    icon: Clock,
  }
};

const categoryConfig = {
  sku: { label: 'SKU/Sản phẩm', icon: Package, color: 'text-blue-500' },
  cash: { label: 'Dòng tiền', icon: DollarSign, color: 'text-green-500' },
  ar: { label: 'Công nợ', icon: DollarSign, color: 'text-orange-500' },
  inventory: { label: 'Tồn kho', icon: Package, color: 'text-purple-500' },
  ads: { label: 'Quảng cáo', icon: TrendingDown, color: 'text-pink-500' }
};

const riskColors = {
  low: 'bg-green-500/10 text-green-600 border-green-500/30',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  high: 'bg-red-500/10 text-red-600 border-red-500/30'
};

export const DecisionDetailDialog: React.FC<DecisionDetailDialogProps> = ({
  decision,
  open,
  onOpenChange,
  onDecide
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!decision) return null;

  const urgency = urgencyConfig[decision.urgency];
  const category = categoryConfig[decision.category];
  const CategoryIcon = category.icon;
  const UrgencyIcon = urgency.icon;

  const handleDecide = async () => {
    if (!selectedOption) return;
    
    setIsSubmitting(true);
    try {
      await onDecide(decision.id, selectedOption, notes);
      setSelectedOption('');
      setNotes('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Badge className={urgency.color}>
              <UrgencyIcon className="h-3 w-3 mr-1" />
              {urgency.label}
            </Badge>
            <Badge variant="outline" className={category.color}>
              <CategoryIcon className="h-3 w-3 mr-1" />
              {category.label}
            </Badge>
          </div>
          <DialogTitle className="text-xl">{decision.title}</DialogTitle>
          <DialogDescription>{decision.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Impact Summary */}
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="font-semibold text-red-600">Tác động tài chính</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {decision.impactAmount ? formatVND(decision.impactAmount) : decision.impact}
            </p>
          </div>

          {/* Reasons */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-semibold">Lý do cần quyết định</h4>
            </div>
            <ul className="space-y-2">
              {decision.reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Formula Reference */}
          {decision.formula && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Công thức FDP</span>
                <Badge variant="outline" className="text-xs">🔒 Locked</Badge>
              </div>
              <code className="text-xs text-muted-foreground block">
                {decision.formula}
              </code>
              {decision.currentValue !== undefined && decision.threshold !== undefined && (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Giá trị hiện tại: </span>
                  <span className={decision.currentValue < decision.threshold ? 'text-red-500 font-medium' : 'text-green-500'}>
                    {decision.currentValue.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground"> (ngưỡng: {decision.threshold}%)</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Decision Options */}
          <div>
            <h4 className="font-semibold mb-3">Chọn hành động</h4>
            <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
              <div className="space-y-3">
                {decision.options.map((option) => (
                  <div 
                    key={option.id}
                    className={`relative flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${selectedOption === option.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'}`}
                    onClick={() => setSelectedOption(option.id)}
                  >
                    <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{option.label}</span>
                        <Badge variant="outline" className={riskColors[option.risk]}>
                          Rủi ro: {option.risk === 'low' ? 'Thấp' : option.risk === 'medium' ? 'TB' : 'Cao'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                      <p className="text-sm text-primary mt-1">📊 {option.impact}</p>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="mb-2 block">Ghi chú quyết định (tùy chọn)</Label>
            <Textarea
              id="notes"
              placeholder="Thêm ghi chú về lý do chọn option này..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Để sau
          </Button>
          <Button 
            onClick={handleDecide} 
            disabled={!selectedOption || isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Đang lưu...' : 'Xác nhận quyết định'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DecisionDetailDialog;
