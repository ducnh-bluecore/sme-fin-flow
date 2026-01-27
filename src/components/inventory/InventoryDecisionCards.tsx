import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Package, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useLanguage } from '@/contexts/LanguageContext';
import type { InventoryAgingBucket } from '@/hooks/useInventoryAging';

interface InventoryDecisionCardsProps {
  agingBuckets: InventoryAgingBucket[];
  summary: {
    totalItems: number;
    totalValue: number;
    slowMovingValue: number;
    slowMovingPercentage: number;
    avgAge: number;
  };
}

export function InventoryDecisionCards({ agingBuckets, summary }: InventoryDecisionCardsProps) {
  const { t } = useLanguage();
  
  // Calculate dead stock value (>180 days)
  const deadStockBucket = agingBuckets.find(b => b.minDays >= 181);
  const deadStockValue = deadStockBucket?.totalValue || 0;
  const deadStockCount = deadStockBucket?.items.length || 0;
  
  // Calculate aging 91-180 days (warning zone)
  const warningBucket = agingBuckets.find(b => b.minDays === 91);
  const warningValue = warningBucket?.totalValue || 0;
  const warningCount = warningBucket?.items.length || 0;
  
  // Calculate ABC classification (Pareto)
  const sortedItems = agingBuckets
    .flatMap(b => b.items)
    .sort((a, b) => b.total_value - a.total_value);
  
  let cumulativeValue = 0;
  let aClassCount = 0;
  let bClassCount = 0;
  const threshold80 = summary.totalValue * 0.8;
  const threshold95 = summary.totalValue * 0.95;
  
  for (const item of sortedItems) {
    cumulativeValue += item.total_value;
    if (cumulativeValue <= threshold80) aClassCount++;
    else if (cumulativeValue <= threshold95) bClassCount++;
  }
  const cClassCount = sortedItems.length - aClassCount - bClassCount;
  
  // Inventory turnover estimation (based on age)
  const avgDaysInStock = summary.avgAge || 1;
  const estimatedTurnover = 365 / avgDaysInStock;
  
  const cards = [
    {
      id: 'dead-stock',
      title: 'Hàng chết cần thanh lý',
      subtitle: '>180 ngày',
      value: formatCurrency(deadStockValue),
      subvalue: `${deadStockCount} SKU`,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      borderColor: deadStockValue > 0 ? 'border-red-500' : '',
      action: deadStockValue > 0 ? 'Đề xuất: Giảm giá 30-50% hoặc thanh lý' : null,
    },
    {
      id: 'warning-stock',
      title: 'Hàng tồn cảnh báo',
      subtitle: '91-180 ngày',
      value: formatCurrency(warningValue),
      subvalue: `${warningCount} SKU`,
      icon: TrendingDown,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      borderColor: warningValue > 0 ? 'border-orange-500' : '',
      action: warningValue > 0 ? 'Đề xuất: Combo với hàng bán chạy' : null,
    },
    {
      id: 'cash-locked',
      title: 'Tiền bị khóa trong tồn kho',
      subtitle: 'Slow-moving value',
      value: formatCurrency(summary.slowMovingValue),
      subvalue: `${summary.slowMovingPercentage.toFixed(1)}% tổng giá trị`,
      icon: DollarSign,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      borderColor: summary.slowMovingPercentage > 25 ? 'border-amber-500' : '',
      action: summary.slowMovingPercentage > 25 ? 'Cảnh báo: Cash đang bị khóa >25%' : null,
    },
    {
      id: 'abc-analysis',
      title: 'Phân loại ABC (Pareto)',
      subtitle: 'Theo giá trị tồn kho',
      value: `A: ${aClassCount} | B: ${bClassCount} | C: ${cClassCount}`,
      subvalue: `Turnover: ${estimatedTurnover.toFixed(1)} vòng/năm`,
      icon: Package,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      borderColor: '',
      action: cClassCount > sortedItems.length * 0.6 ? 'Đề xuất: Xem xét cắt giảm SKU nhóm C' : null,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.id} className={card.borderColor}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{card.value}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {card.subtitle}
                </Badge>
                <span className="text-xs text-muted-foreground">{card.subvalue}</span>
              </div>
              {card.action && (
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                  {card.action}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
