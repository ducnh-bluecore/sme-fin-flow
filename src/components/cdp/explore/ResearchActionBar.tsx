import { Save, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface ResearchActionBarProps {
  currentFiltersCount: number;
  matchingCustomers: number;
  revenueShare: number;
  onSaveView: () => void;
  onCreateDecisionCard: () => void;
}

export function ResearchActionBar({
  currentFiltersCount,
  matchingCustomers,
  revenueShare,
  onSaveView,
  onCreateDecisionCard,
}: ResearchActionBarProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {currentFiltersCount > 0 
              ? `${currentFiltersCount} bộ lọc đang áp dụng`
              : 'Chưa áp dụng bộ lọc'
            }
          </span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="text-sm">
          <span className="font-medium">{matchingCustomers.toLocaleString()}</span>
          <span className="text-muted-foreground"> khách hàng • </span>
          <span className="font-medium">{revenueShare.toFixed(1)}%</span>
          <span className="text-muted-foreground"> tỷ trọng doanh thu</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onSaveView}
          disabled={currentFiltersCount === 0}
        >
          <Save className="w-4 h-4 mr-2" />
          Lưu góc nhìn nghiên cứu
        </Button>
        <Button 
          size="sm"
          onClick={onCreateDecisionCard}
        >
          <FileText className="w-4 h-4 mr-2" />
          Tạo Thẻ Quyết định
        </Button>
      </div>
    </div>
  );
}
