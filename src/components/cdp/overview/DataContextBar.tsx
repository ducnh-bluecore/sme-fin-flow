import { Calendar, Database, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DataContextBarProps {
  lastUpdated: Date;
  periodStart: Date;
  periodEnd: Date;
  dataFreshness: 'fresh' | 'stale' | 'warning';
}

export function DataContextBar({ 
  lastUpdated, 
  periodStart, 
  periodEnd, 
  dataFreshness 
}: DataContextBarProps) {
  const freshnessStyles = {
    fresh: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning-foreground border-warning/20',
    stale: 'bg-destructive/10 text-destructive border-destructive/20'
  };

  const freshnessLabels = {
    fresh: 'Dữ liệu mới',
    warning: 'Cần cập nhật',
    stale: 'Dữ liệu cũ'
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Kỳ phân tích:</span>
          <span className="font-medium text-foreground">
            {formatDate(periodStart)} – {formatDate(periodEnd)}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <Database className="w-4 h-4" />
          <span>Cập nhật:</span>
          <span className="font-medium text-foreground">
            {formatDate(lastUpdated)} lúc {formatTime(lastUpdated)}
          </span>
        </div>
      </div>

      <Badge variant="outline" className={freshnessStyles[dataFreshness]}>
        <RefreshCw className="w-3 h-3 mr-1" />
        {freshnessLabels[dataFreshness]}
      </Badge>
    </div>
  );
}
