import { Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DecisionQueueFiltersProps {
  statusFilter: string;
  ownerFilter: string;
  severityFilter: string;
  onStatusChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  onClearFilters: () => void;
  counts: {
    new: number;
    reviewing: number;
    decided: number;
    archived: number;
  };
}

export function DecisionQueueFilters({
  statusFilter,
  ownerFilter,
  severityFilter,
  onStatusChange,
  onOwnerChange,
  onSeverityChange,
  onClearFilters,
  counts
}: DecisionQueueFiltersProps) {
  const hasFilters = statusFilter !== 'all' || ownerFilter !== 'all' || severityFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Summary Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge 
          variant={statusFilter === 'new' ? 'default' : 'outline'} 
          className="cursor-pointer"
          onClick={() => onStatusChange(statusFilter === 'new' ? 'all' : 'new')}
        >
          Mới ({counts.new})
        </Badge>
        <Badge 
          variant={statusFilter === 'reviewing' ? 'default' : 'outline'} 
          className="cursor-pointer bg-warning/10 text-warning-foreground border-warning/20 hover:bg-warning/20"
          onClick={() => onStatusChange(statusFilter === 'reviewing' ? 'all' : 'reviewing')}
        >
          Đang xem xét ({counts.reviewing})
        </Badge>
        <Badge 
          variant={statusFilter === 'decided' ? 'default' : 'outline'} 
          className="cursor-pointer bg-success/10 text-success border-success/20 hover:bg-success/20"
          onClick={() => onStatusChange(statusFilter === 'decided' ? 'all' : 'decided')}
        >
          Đã quyết ({counts.decided})
        </Badge>
        <Badge 
          variant={statusFilter === 'archived' ? 'default' : 'outline'} 
          className="cursor-pointer"
          onClick={() => onStatusChange(statusFilter === 'archived' ? 'all' : 'archived')}
        >
          Lưu trữ ({counts.archived})
        </Badge>
      </div>

      {/* Filter Dropdowns */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Lọc:</span>
        </div>

        <Select value={ownerFilter} onValueChange={onOwnerChange}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả vai trò</SelectItem>
            <SelectItem value="CEO">CEO</SelectItem>
            <SelectItem value="CFO">CFO</SelectItem>
            <SelectItem value="COO">COO</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={onSeverityChange}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Mức độ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả mức độ</SelectItem>
            <SelectItem value="high">Cao</SelectItem>
            <SelectItem value="medium">Trung bình</SelectItem>
            <SelectItem value="low">Thấp</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Xóa bộ lọc
          </Button>
        )}
      </div>
    </div>
  );
}
