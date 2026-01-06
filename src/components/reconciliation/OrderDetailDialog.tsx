import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Truck,
  MapPin,
  User,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  ShoppingBag,
  Wallet,
  ArrowRight,
  Box,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface DeliveryEvent {
  id: string;
  timestamp: string;
  status: string;
  description: string;
  location?: string;
}

interface OrderItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
}

interface OrderDetailData {
  // IDs
  trackingCode: string;
  orderId: string;
  platformOrderId?: string;
  
  // Platform/Carrier info
  type: 'ecommerce' | 'shipping';
  platform?: string;
  platformName?: string;
  platformLogo?: string;
  carrier?: string;
  carrierName?: string;
  carrierLogo?: string;
  
  // Customer info
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  
  // Order info
  orderDate: string;
  deliveredDate?: string;
  items?: OrderItem[];
  
  // Amounts
  subtotal?: number;
  shippingFee?: number;
  discount?: number;
  totalAmount: number;
  walletAmount?: number;
  estimatedAmount?: number;
  codAmount?: number;
  netAmount?: number;
  
  // Status
  orderStatus: string;
  reconcileStatus: string;
  
  // Delivery events
  deliveryEvents: DeliveryEvent[];
}

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderDetailData | null;
}

const orderStatusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  delivered: { label: 'Đã giao', color: 'text-success', bg: 'bg-success/10', icon: CheckCircle2 },
  shipping: { label: 'Đang giao', color: 'text-info', bg: 'bg-info/10', icon: Truck },
  returned: { label: 'Hoàn trả', color: 'text-destructive', bg: 'bg-destructive/10', icon: XCircle },
  cancelled: { label: 'Đã hủy', color: 'text-muted-foreground', bg: 'bg-muted', icon: XCircle },
  completed: { label: 'Hoàn thành', color: 'text-success', bg: 'bg-success/10', icon: CheckCircle2 },
  pending: { label: 'Chờ lấy', color: 'text-warning', bg: 'bg-warning/10', icon: Clock },
  picked_up: { label: 'Đã lấy', color: 'text-info', bg: 'bg-info/10', icon: Package },
};

const deliveryEventStatusConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  created: { color: 'text-muted-foreground', bg: 'bg-muted', icon: FileText },
  confirmed: { color: 'text-info', bg: 'bg-info/10', icon: CheckCircle2 },
  picking: { color: 'text-warning', bg: 'bg-warning/10', icon: RefreshCw },
  picked_up: { color: 'text-info', bg: 'bg-info/10', icon: Package },
  in_transit: { color: 'text-info', bg: 'bg-info/10', icon: Truck },
  out_for_delivery: { color: 'text-primary', bg: 'bg-primary/10', icon: Truck },
  delivered: { color: 'text-success', bg: 'bg-success/10', icon: CheckCircle2 },
  returned: { color: 'text-destructive', bg: 'bg-destructive/10', icon: XCircle },
  failed: { color: 'text-destructive', bg: 'bg-destructive/10', icon: XCircle },
};

export function OrderDetailDialog({ open, onOpenChange, order }: OrderDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('info');

  if (!order) return null;

  const statusConfig = orderStatusConfig[order.orderStatus] || orderStatusConfig.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {order.type === 'ecommerce' ? (
              <span className="text-2xl">{order.platformLogo}</span>
            ) : (
              <span className="text-2xl">{order.carrierLogo}</span>
            )}
            Chi tiết đơn hàng
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" className="text-sm">
              <Package className="w-4 h-4 mr-1" />
              Thông tin đơn
            </TabsTrigger>
            <TabsTrigger value="delivery" className="text-sm">
              <Truck className="w-4 h-4 mr-1" />
              Lịch sử giao nhận
            </TabsTrigger>
            <TabsTrigger value="finance" className="text-sm">
              <Wallet className="w-4 h-4 mr-1" />
              Tài chính
            </TabsTrigger>
          </TabsList>

          {/* Order Info Tab */}
          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Status & IDs */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium', statusConfig.bg, statusConfig.color)}>
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.label}
                </div>
                <Badge variant={order.reconcileStatus === 'reconciled' ? 'default' : 'secondary'}>
                  {order.reconcileStatus === 'reconciled' ? 'Đã đối soát' : 'Chưa đối soát'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mã vận chuyển</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded font-mono font-medium">
                    {order.trackingCode}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mã đơn hàng</p>
                  <code className="text-sm bg-primary/10 text-primary px-2 py-1 rounded font-mono font-medium">
                    {order.orderId}
                  </code>
                </div>
                {order.platformOrderId && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mã sàn</p>
                    <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                      {order.platformOrderId}
                    </code>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {order.type === 'ecommerce' ? 'Sàn TMĐT' : 'Đơn vị vận chuyển'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{order.platformLogo || order.carrierLogo}</span>
                    <span className="font-medium">{order.platformName || order.carrierName}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Customer Info */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Thông tin khách hàng
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{order.customerName}</span>
                </div>
                {order.customerPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{order.customerPhone}</span>
                  </div>
                )}
                {order.customerAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{order.customerAddress}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Order Items */}
            {order.items && order.items.length > 0 && (
              <Card className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Box className="w-4 h-4" />
                  Sản phẩm ({order.items.length})
                </h4>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono">{formatCurrency(item.price)}</p>
                        <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Dates */}
            <Card className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ngày đặt hàng</p>
                    <p className="font-medium">{formatDate(order.orderDate)}</p>
                  </div>
                </div>
                {order.deliveredDate && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <div>
                      <p className="text-xs text-muted-foreground">Ngày giao hàng</p>
                      <p className="font-medium">{formatDate(order.deliveredDate)}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Delivery History Tab */}
          <TabsContent value="delivery" className="mt-4">
            <Card className="p-4">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Lịch sử giao nhận
              </h4>
              
              {order.deliveryEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Chưa có thông tin giao nhận</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline */}
                  <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" />
                  
                  <div className="space-y-4">
                    {order.deliveryEvents.map((event, index) => {
                      const eventConfig = deliveryEventStatusConfig[event.status] || deliveryEventStatusConfig.created;
                      const EventIcon = eventConfig.icon;
                      const isFirst = index === 0;
                      
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative flex gap-4"
                        >
                          {/* Icon */}
                          <div className={cn(
                            'relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                            eventConfig.bg,
                            isFirst && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                          )}>
                            <EventIcon className={cn('w-4 h-4', eventConfig.color)} />
                          </div>
                          
                          {/* Content */}
                          <div className={cn(
                            'flex-1 pb-4',
                            isFirst && 'font-medium'
                          )}>
                            <div className="flex items-center justify-between">
                              <p className={cn('text-sm', isFirst ? 'text-foreground' : 'text-muted-foreground')}>
                                {event.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(event.timestamp).toLocaleString('vi-VN')}
                              </span>
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {event.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance" className="mt-4">
            <Card className="p-4">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Thông tin tài chính
              </h4>
              
              <div className="space-y-3">
                {order.type === 'ecommerce' ? (
                  <>
                    {order.subtotal && (
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Tạm tính</span>
                        <span className="font-mono">{formatCurrency(order.subtotal)}</span>
                      </div>
                    )}
                    {order.shippingFee && (
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Phí vận chuyển</span>
                        <span className="font-mono">{formatCurrency(order.shippingFee)}</span>
                      </div>
                    )}
                    {order.discount && (
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Giảm giá</span>
                        <span className="font-mono text-destructive">-{formatCurrency(order.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Tổng đơn hàng</span>
                      <span className="font-mono font-medium">{formatCurrency(order.totalAmount)}</span>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Tiền tạm tính (từ sàn)</span>
                      <span className="font-mono">{formatCurrency(order.estimatedAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="font-medium">Tiền về ví</span>
                      <span className="font-mono font-bold text-success">{formatCurrency(order.walletAmount || 0)}</span>
                    </div>
                    {order.estimatedAmount && order.walletAmount && (
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Chênh lệch</span>
                        <span className={cn(
                          'font-mono font-medium',
                          (order.walletAmount - order.estimatedAmount) < 0 ? 'text-destructive' : 
                          (order.walletAmount - order.estimatedAmount) > 0 ? 'text-success' : 'text-muted-foreground'
                        )}>
                          {order.walletAmount - order.estimatedAmount !== 0 
                            ? ((order.walletAmount - order.estimatedAmount) > 0 ? '+' : '') + formatCurrency(order.walletAmount - order.estimatedAmount)
                            : '-'}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">COD thu hộ</span>
                      <span className="font-mono">{formatCurrency(order.codAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Phí vận chuyển</span>
                      <span className="font-mono text-destructive">-{formatCurrency(order.shippingFee || 0)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-medium">Thực nhận</span>
                      <span className="font-mono font-bold text-success">{formatCurrency(order.netAmount || 0)}</span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export type { OrderDetailData, DeliveryEvent, OrderItem };
