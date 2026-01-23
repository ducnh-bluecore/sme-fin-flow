import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, ShoppingBag, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineOrder {
  id: string;
  orderAt: string;
  channel: string;
  items: Array<{
    productId: string;
    category: string;
    revenue: number;
    qty: number;
  }>;
  totalRevenue: number;
}

interface PurchaseTimelineBlockProps {
  orders: TimelineOrder[];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}tr`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString('vi-VN');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const channelColors: Record<string, string> = {
  shopee: 'bg-orange-100 text-orange-700 border-orange-200',
  lazada: 'bg-blue-100 text-blue-700 border-blue-200',
  tiktok: 'bg-slate-100 text-slate-700 border-slate-200',
  sapo: 'bg-green-100 text-green-700 border-green-200',
  default: 'bg-muted text-muted-foreground',
};

const categoryColors: Record<string, string> = {
  fashion: 'bg-pink-100 text-pink-700',
  accessories: 'bg-purple-100 text-purple-700',
  electronics: 'bg-blue-100 text-blue-700',
  others: 'bg-gray-100 text-gray-700',
  default: 'bg-muted text-muted-foreground',
};

export function PurchaseTimelineBlock({ orders }: PurchaseTimelineBlockProps) {
  if (!orders || orders.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Lịch sử Mua hàng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Chưa có lịch sử đơn hàng
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Lịch sử Mua hàng
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Timeline các đơn hàng với category tags
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {orders.map((order, index) => (
              <div key={order.id} className="relative pl-8">
                {/* Timeline dot */}
                <div className={cn(
                  "absolute left-1.5 top-2 w-3 h-3 rounded-full border-2 border-background",
                  index === 0 ? "bg-primary" : "bg-muted-foreground/50"
                )} />
                
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{formatDate(order.orderAt)}</span>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs capitalize", channelColors[order.channel] || channelColors.default)}
                      >
                        {order.channel}
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(order.totalRevenue)}</span>
                  </div>
                  
                  {/* Categories in this order */}
                  <div className="flex flex-wrap gap-1.5">
                    {order.items.map((item, itemIndex) => (
                      <Badge 
                        key={itemIndex}
                        variant="secondary"
                        className={cn("text-xs capitalize", categoryColors[item.category] || categoryColors.default)}
                      >
                        <Package className="w-3 h-3 mr-1" />
                        {item.category} ({item.qty})
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
