import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DateRangeIndicatorProps {
  className?: string;
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'badge';
}

/**
 * Component hiển thị khoảng thời gian dữ liệu đang được sử dụng
 * Đảm bảo người dùng luôn biết dữ liệu đang xem thuộc khoảng thời gian nào
 */
export function DateRangeIndicator({ 
  className, 
  showIcon = true,
  variant = 'default' 
}: DateRangeIndicatorProps) {
  const { startDate, endDate, dateRange } = useDateRangeForQuery();

  const formatDate = (date: Date) => {
    try {
      return format(date, 'dd/MM/yyyy', { locale: vi });
    } catch {
      return '-';
    }
  };

  const getPresetLabel = (range: string): string => {
    const labels: Record<string, string> = {
      'today': 'Hôm nay',
      '7': '7 ngày qua',
      '14': '14 ngày qua',
      '30': '30 ngày qua',
      '60': '60 ngày qua',
      '90': '90 ngày qua',
      'this_month': 'Tháng này',
      'last_month': 'Tháng trước',
      'this_quarter': 'Quý này',
      'this_year': 'Năm nay',
      'last_year': 'Năm trước',
      '2024': 'Năm 2024',
      '2025': 'Năm 2025',
      '2026': 'Năm 2026',
      'all': 'Tất cả thời gian',
      'all_time': 'Tất cả thời gian',
      'custom': 'Tùy chỉnh',
    };
    return labels[range] || range;
  };

  if (variant === 'badge') {
    return (
      <Badge variant="outline" className={cn('gap-1.5', className)}>
        {showIcon && <Calendar className="h-3 w-3" />}
        <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
      </Badge>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        {showIcon && <Clock className="h-3 w-3" />}
        <span>{getPresetLabel(dateRange)}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      {showIcon && <Calendar className="h-4 w-4" />}
      <span>
        Dữ liệu từ <span className="font-medium text-foreground">{formatDate(startDate)}</span>
        {' đến '}
        <span className="font-medium text-foreground">{formatDate(endDate)}</span>
      </span>
    </div>
  );
}

/**
 * Component hiển thị cả selector và indicator cùng lúc
 */
interface DateRangeWithIndicatorProps {
  className?: string;
}

export function DateRangeWithIndicator({ className }: DateRangeWithIndicatorProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <DateRangeIndicator variant="compact" />
    </div>
  );
}
