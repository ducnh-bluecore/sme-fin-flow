/**
 * DataSourceBadge - Shows whether data is from actual expenses or estimates
 */
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DataSourceBadgeProps {
  source: 'actual' | 'estimate' | undefined;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}

export function DataSourceBadge({ 
  source, 
  size = 'sm',
  showTooltip = true,
}: DataSourceBadgeProps) {
  if (!source || source === 'actual') {
    return null; // Don't show badge for actual data (it's the default)
  }

  const badge = (
    <Badge 
      variant="outline" 
      className={cn(
        'bg-amber-50 text-amber-700 border-amber-300',
        size === 'sm' && 'text-[10px] px-1 py-0 h-4',
        size === 'md' && 'text-xs px-1.5 py-0.5'
      )}
    >
      Tạm tính
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">
            Số liệu tạm tính từ định nghĩa chi phí. 
            Sẽ được thay thế khi có chi phí thực tế.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
