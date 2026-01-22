import { Receipt, Calendar, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface TransactionMilestone {
  id: string;
  type: 'order' | 'return';
  date: string;
  value: number;
  orderNumber?: string;
}

interface TransactionSummaryBlockProps {
  totalSpend: number;
  orderCount: number;
  aov: number;
  daysSinceLastPurchase: number;
  milestones?: TransactionMilestone[];
}

function formatCurrency(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}tr`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString('vi-VN');
}

export function TransactionSummaryBlock({
  totalSpend,
  orderCount,
  aov,
  daysSinceLastPurchase,
  milestones = []
}: TransactionSummaryBlockProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Dữ liệu Giao dịch
            </CardTitle>
            <CardDescription>
              Tổng hợp giao dịch từ tất cả nguồn (chỉ đọc)
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-normal text-xs">
            Chỉ đọc
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalSpend)}</p>
            <p className="text-xs text-muted-foreground mt-1">Tổng chi tiêu</p>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{orderCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Số đơn hàng</p>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(aov)}</p>
            <p className="text-xs text-muted-foreground mt-1">Giá trị TB/đơn</p>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{daysSinceLastPurchase}</p>
            <p className="text-xs text-muted-foreground mt-1">Ngày từ lần mua cuối</p>
          </div>
        </div>

        {/* Timeline Milestones */}
        {milestones.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Các mốc giao dịch chính
              </h4>
              <div className="space-y-2">
                {milestones.slice(0, 5).map((milestone) => (
                  <div 
                    key={milestone.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        milestone.type === 'order' ? 'bg-success' : 'bg-warning'
                      }`} />
                      <div>
                        <span className="text-sm font-medium">
                          {milestone.type === 'order' ? 'Đơn hàng' : 'Hoàn trả'}
                        </span>
                        {milestone.orderNumber && (
                          <span className="text-xs text-muted-foreground ml-2">
                            #{milestone.orderNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-medium tabular-nums ${
                        milestone.type === 'return' ? 'text-warning' : ''
                      }`}>
                        {milestone.type === 'return' ? '-' : ''}{formatCurrency(milestone.value)}
                      </span>
                      <span className="text-xs text-muted-foreground">{milestone.date}</span>
                    </div>
                  </div>
                ))}
              </div>
              {milestones.length > 5 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Hiển thị 5/{milestones.length} mốc gần nhất
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
