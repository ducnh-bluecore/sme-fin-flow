import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  Trash2,
  MoreVertical,
  Database,
  Clock,
  Play,
  Pause,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Database as DBTypes } from '@/integrations/supabase/types';

type ConnectorIntegration = DBTypes['public']['Tables']['connector_integrations']['Row'];

const CONNECTOR_LOGOS: Record<string, string> = {
  haravan: 'https://cdn.haravan.com/media/logo/haravan-icon.png',
  sapo: 'https://www.sapo.vn/Themes/Portal/Default/StylesV2/images/logo/Sapo-logo.svg',
  kiotviet: 'https://www.kiotviet.vn/wp-content/uploads/2019/05/logo-kiotviet.png',
  shopee: 'https://product.hstatic.net/200000404175/product/untitled__12__4e2b3a1ee80b4cd1ba53f54af5137d8b_grande.png',
  lazada: 'https://product.hstatic.net/200000404175/product/untitled__11__d2b76efb45e64984a84aa834388130ba_grande.png',
  tiktok_shop: 'https://product.hstatic.net/200000404175/product/tiktokshop_c892dcc83f354ebc9f84ba3e12691f1b_grande.png',
  woocommerce: 'https://woocommerce.com/wp-content/themes/flavor/assets/images/woo_logo.svg',
};

const STATUS_CONFIG = {
  active: { label: 'Đang hoạt động', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  inactive: { label: 'Chưa kích hoạt', icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
  error: { label: 'Lỗi kết nối', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  syncing: { label: 'Đang đồng bộ', icon: RefreshCw, color: 'text-primary', bg: 'bg-primary/10' },
};

interface IntegrationCardProps {
  integration: ConnectorIntegration;
  onSync: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, newStatus: 'active' | 'inactive') => void;
  isSyncing?: boolean;
}

export function IntegrationCard({ 
  integration, 
  onSync, 
  onDelete, 
  onToggleStatus,
  isSyncing 
}: IntegrationCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const status = (isSyncing ? 'syncing' : integration.status) as keyof typeof STATUS_CONFIG;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  const StatusIcon = statusConfig.icon;
  const logo = CONNECTOR_LOGOS[integration.connector_type] || '/placeholder.svg';

  const lastSync = integration.last_sync_at 
    ? formatDistanceToNow(new Date(integration.last_sync_at), { addSuffix: true, locale: vi })
    : 'Chưa đồng bộ';

  const handleDelete = () => {
    onDelete(integration.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Card className={cn(
          "p-4 bg-card hover:shadow-lg transition-all",
          status === 'active' && "border-success/30",
          status === 'error' && "border-destructive/30"
        )}>
          <div className="flex items-start justify-between gap-4">
            {/* Left: Logo and Info */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted/50 p-1.5 flex items-center justify-center">
                <img 
                  src={logo}
                  alt={integration.connector_name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{integration.shop_name || integration.connector_name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {integration.connector_name}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <StatusIcon className={cn('w-3 h-3', statusConfig.color, status === 'syncing' && 'animate-spin')} />
                    <span className={statusConfig.color}>{statusConfig.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{lastSync}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSync(integration.id)}
                disabled={isSyncing}
                className="gap-1"
              >
                <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ'}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {integration.status === 'active' ? (
                    <DropdownMenuItem onClick={() => onToggleStatus(integration.id, 'inactive')}>
                      <Pause className="w-4 h-4 mr-2" />
                      Tạm dừng
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => onToggleStatus(integration.id, 'active')}>
                      <Play className="w-4 h-4 mr-2" />
                      Kích hoạt
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Cài đặt
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa kết nối
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Error Message */}
          {integration.error_message && (
            <div className="mt-3 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
              ⚠️ {integration.error_message}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa kết nối</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa kết nối "{integration.shop_name || integration.connector_name}"? 
              Hành động này không thể hoàn tác và sẽ xóa tất cả dữ liệu đã đồng bộ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Xóa kết nối
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
