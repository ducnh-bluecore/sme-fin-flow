import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SchemaStatus } from '@/hooks/useTenantSchemaStatus';

interface TenantSchemaStatusProps {
  status: SchemaStatus;
  isLoading?: boolean;
  className?: string;
}

const statusConfig: Record<SchemaStatus, {
  label: string;
  labelVi: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: typeof CheckCircle2;
  className: string;
}> = {
  provisioned: {
    label: 'Provisioned',
    labelVi: 'Đã khởi tạo',
    variant: 'default',
    icon: CheckCircle2,
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  pending: {
    label: 'Pending',
    labelVi: 'Chưa khởi tạo',
    variant: 'secondary',
    icon: Clock,
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  error: {
    label: 'Error',
    labelVi: 'Lỗi',
    variant: 'destructive',
    icon: AlertCircle,
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
};

export function TenantSchemaStatus({ status, isLoading, className }: TenantSchemaStatusProps) {
  if (isLoading) {
    return (
      <Badge variant="outline" className={cn('gap-1.5', className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Đang kiểm tra...</span>
      </Badge>
    );
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn('gap-1.5', config.className, className)}
    >
      <Icon className="w-3 h-3" />
      <span>{config.labelVi}</span>
    </Badge>
  );
}
