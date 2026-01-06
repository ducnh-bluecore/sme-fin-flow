import { Link } from 'react-router-dom';
import { FileSpreadsheet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DataSourceNoticeProps {
  variant?: 'green' | 'blue' | 'orange' | 'purple';
  title?: string;
  description?: string;
  showTimestamp?: boolean;
  integrationCount?: number;
  className?: string;
}

const variantStyles = {
  green: 'border-green-500/20 bg-green-500/5 text-green-500',
  blue: 'border-blue-500/20 bg-blue-500/5 text-blue-500',
  orange: 'border-orange-500/20 bg-orange-500/5 text-orange-500',
  purple: 'border-purple-500/20 bg-purple-500/5 text-purple-500',
};

export function DataSourceNotice({
  variant = 'green',
  title = 'Dữ liệu được đồng bộ từ các nguồn tích hợp',
  description = 'Để thêm dữ liệu mới, vui lòng kết nối với hệ thống hoặc import file tại',
  showTimestamp = false,
  integrationCount,
  className,
}: DataSourceNoticeProps) {
  const iconColor = variantStyles[variant].split(' ').pop();
  
  return (
    <Card className={cn(variantStyles[variant].replace(/text-.*$/, ''), className)}>
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className={cn('w-5 h-5', iconColor)} />
          <div className="flex-1">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">
              {description}{' '}
              <Link to="/data-integration" className="text-primary underline">
                Data Integration Hub
              </Link>
            </p>
          </div>
          {showTimestamp && (
            <Badge variant="outline" className={cn('border-current/50', iconColor)}>
              Cập nhật: {format(new Date(), 'HH:mm dd/MM', { locale: vi })}
            </Badge>
          )}
          {integrationCount !== undefined && (
            <Badge variant="outline" className={cn('border-current/50', iconColor)}>
              {integrationCount > 0 ? `${integrationCount} nguồn đang kết nối` : 'Chưa kết nối'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
