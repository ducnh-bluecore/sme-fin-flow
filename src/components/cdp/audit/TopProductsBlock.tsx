import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Package } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TopProduct {
  productId: string;
  category: string;
  totalQty: number;
  totalRevenue: number;
  orderCount: number;
}

interface TopProductsBlockProps {
  products: TopProduct[];
  maxDisplay?: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}tr`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString('vi-VN');
}

export function TopProductsBlock({ products, maxDisplay = 5 }: TopProductsBlockProps) {
  if (!products || products.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Sản phẩm Mua nhiều nhất
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Chưa có dữ liệu sản phẩm
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayProducts = products.slice(0, maxDisplay);
  const maxQty = Math.max(...displayProducts.map(p => p.totalQty));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Sản phẩm Mua nhiều nhất
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Top {displayProducts.length} sản phẩm theo số lượng mua
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayProducts.map((product, index) => (
          <div key={product.productId} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-4">
                  #{index + 1}
                </span>
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{product.productId}</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {product.category}
                </Badge>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold">{product.totalQty} sp</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({product.orderCount} đơn)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                value={(product.totalQty / maxQty) * 100} 
                className="h-1.5 flex-1"
              />
              <span className="text-xs text-muted-foreground w-16 text-right">
                {formatCurrency(product.totalRevenue)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
