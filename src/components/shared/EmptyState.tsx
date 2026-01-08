import { ReactNode } from 'react';
import { FileText, LucideIcon, Plus, Upload, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'search' | 'upload' | 'create';
  className?: string;
}

const variantConfig = {
  default: {
    icon: FileText,
    title: 'Chưa có dữ liệu',
    description: 'Dữ liệu sẽ hiển thị khi có thông tin',
  },
  search: {
    icon: Search,
    title: 'Không tìm thấy kết quả',
    description: 'Thử thay đổi từ khóa hoặc bộ lọc',
  },
  upload: {
    icon: Upload,
    title: 'Chưa có file nào',
    description: 'Tải lên file để bắt đầu',
  },
  create: {
    icon: Plus,
    title: 'Bắt đầu tạo mới',
    description: 'Nhấn nút bên dưới để tạo mục đầu tiên',
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const Icon = icon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center px-4',
        className
      )}
    >
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="relative mb-6"
      >
        {/* Decorative rings */}
        <div className="absolute inset-0 w-20 h-20 rounded-full bg-primary/5 animate-ping" />
        <div className="absolute inset-2 w-16 h-16 rounded-full bg-primary/10" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-lg">
          <Icon className="w-10 h-10 text-muted-foreground" />
        </div>
      </motion.div>

      <motion.h3 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-semibold mb-2 text-foreground"
      >
        {displayTitle}
      </motion.h3>

      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-muted-foreground max-w-md mb-6"
      >
        {displayDescription}
      </motion.p>

      {(action || (actionLabel && onAction)) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {action || (
            <Button onClick={onAction} className="gap-2">
              {variant === 'upload' && <Upload className="w-4 h-4" />}
              {variant === 'create' && <Plus className="w-4 h-4" />}
              {actionLabel}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
