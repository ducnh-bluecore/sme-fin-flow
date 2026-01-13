import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Zap,
  Eye
} from 'lucide-react';
import { FDP_THRESHOLDS, analyzeSKU } from '@/lib/fdp-formulas';
import { DecisionDetailDialog, DecisionDetail, DecisionOption } from './DecisionDetailDialog';
import { toast } from '@/hooks/use-toast';

interface SKUMetricInput {
  sku: string;
  product_name?: string;
  channel: string;
  profit: number;
  margin_percent: number;
  revenue: number;
  cogs: number;
  fees: number;
}

interface TodayDecisionSummaryProps {
  skuMetrics?: SKUMetricInput[];
  cashPosition?: {
    bankBalance: number;
    currentAR: number;
    overdueAR: number;
    inventoryValue: number;
  };
  overdueInvoices?: Array<{
    customer_name: string;
    amount: number;
    days_overdue: number;
  }>;
}

interface Decision {
  id: string;
  category: 'sku' | 'cash' | 'ar' | 'inventory' | 'ads';
  urgency: 'immediate' | 'today' | 'this_week';
  title: string;
  description: string;
  impact: string;
  impactAmount?: number;
  action: 'stop' | 'reduce' | 'review' | 'collect' | 'negotiate';
  actionLabel: string;
  relatedItems?: string[];
  // For detail dialog
  reasons: string[];
  formula?: string;
  currentValue?: number;
  threshold?: number;
  options: DecisionOption[];
}

const urgencyConfig = {
  immediate: {
    label: 'NGAY BÂY GIỜ',
    color: 'bg-red-500 text-white',
    icon: Zap,
    borderColor: 'border-red-500'
  },
  today: {
    label: 'HÔM NAY',
    color: 'bg-orange-500 text-white',
    icon: Clock,
    borderColor: 'border-orange-500'
  },
  this_week: {
    label: 'TUẦN NÀY',
    color: 'bg-yellow-500 text-black',
    icon: Clock,
    borderColor: 'border-yellow-500'
  }
};

const actionConfig = {
  stop: { label: 'DỪNG NGAY', icon: XCircle, color: 'bg-red-600 hover:bg-red-700' },
  reduce: { label: 'GIẢM', icon: TrendingDown, color: 'bg-orange-600 hover:bg-orange-700' },
  review: { label: 'XEM XÉT', icon: AlertTriangle, color: 'bg-yellow-600 hover:bg-yellow-700' },
  collect: { label: 'THU HỒI', icon: DollarSign, color: 'bg-blue-600 hover:bg-blue-700' },
  negotiate: { label: 'ĐÀM PHÁN', icon: Package, color: 'bg-purple-600 hover:bg-purple-700' }
};

const categoryIcons = {
  sku: Package,
  cash: DollarSign,
  ar: DollarSign,
  inventory: Package,
  ads: TrendingDown
};

// Standard options for each action type
const getOptionsForAction = (action: string, context: { sku?: string; amount?: number }): DecisionOption[] => {
  switch (action) {
    case 'stop':
      return [
        {
          id: 'stop_immediately',
          label: 'Dừng bán ngay lập tức',
          description: `Ngừng bán SKU ${context.sku || ''} trên tất cả kênh`,
          impact: 'Dừng lỗ ngay, giải phóng tồn kho dần',
          risk: 'low'
        },
        {
          id: 'clearance_sale',
          label: 'Bán xả hàng tồn',
          description: 'Giảm giá mạnh để xả hết tồn kho rồi dừng',
          impact: 'Lỗ thêm 1-2 tuần nhưng thu hồi vốn tồn kho',
          risk: 'medium'
        },
        {
          id: 'wait_more_data',
          label: 'Chờ thêm dữ liệu',
          description: 'Theo dõi thêm 7 ngày trước khi quyết định',
          impact: 'Có thể lỗ thêm nếu trend không đổi',
          risk: 'high'
        }
      ];
    case 'reduce':
      return [
        {
          id: 'reduce_50',
          label: 'Giảm 50% budget ads',
          description: 'Cắt một nửa ngân sách quảng cáo cho SKU này',
          impact: 'Tiết kiệm chi phí, doanh thu có thể giảm 20-30%',
          risk: 'low'
        },
        {
          id: 'pause_ads',
          label: 'Tạm dừng ads hoàn toàn',
          description: 'Dừng quảng cáo, chỉ bán organic',
          impact: 'Tiết kiệm tối đa, doanh thu giảm đáng kể',
          risk: 'medium'
        },
        {
          id: 'optimize_targeting',
          label: 'Tối ưu targeting thay vì giảm',
          description: 'Giữ nguyên budget, tối ưu audience',
          impact: 'Có thể cải thiện ROAS mà không giảm reach',
          risk: 'medium'
        }
      ];
    case 'review':
      return [
        {
          id: 'increase_price',
          label: 'Tăng giá bán 10-15%',
          description: 'Điều chỉnh giá để cải thiện margin',
          impact: 'Margin tăng, sales volume có thể giảm nhẹ',
          risk: 'medium'
        },
        {
          id: 'negotiate_supplier',
          label: 'Đàm phán lại với supplier',
          description: 'Thương lượng giảm giá nhập hoặc MOQ',
          impact: 'Giảm COGS 5-10%, cần thời gian',
          risk: 'low'
        },
        {
          id: 'bundle_product',
          label: 'Bundle với sản phẩm khác',
          description: 'Bán kèm sản phẩm margin cao',
          impact: 'Tăng AOV và overall margin',
          risk: 'low'
        }
      ];
    case 'collect':
      return [
        {
          id: 'call_immediately',
          label: 'Liên hệ khách hàng ngay',
          description: 'Gọi điện/email đòi nợ trong hôm nay',
          impact: `Thu hồi: ${context.amount?.toLocaleString() || 0}đ`,
          risk: 'low'
        },
        {
          id: 'offer_discount',
          label: 'Đề xuất chiết khấu thanh toán sớm',
          description: 'Giảm 2-3% nếu thanh toán trong 3 ngày',
          impact: 'Thu nhanh hơn, chấp nhận mất 2-3%',
          risk: 'medium'
        },
        {
          id: 'escalate_legal',
          label: 'Chuyển pháp lý',
          description: 'Gửi thông báo pháp lý cho nợ quá hạn lâu',
          impact: 'Áp lực cao, có thể ảnh hưởng quan hệ',
          risk: 'high'
        }
      ];
    default:
      return [
        {
          id: 'take_action',
          label: 'Thực hiện hành động',
          description: 'Xử lý theo khuyến nghị',
          impact: 'Giải quyết vấn đề',
          risk: 'low'
        }
      ];
  }
};

export const TodayDecisionSummary: React.FC<TodayDecisionSummaryProps> = ({
  skuMetrics = [],
  cashPosition,
  overdueInvoices = []
}) => {
  const [completedDecisions, setCompletedDecisions] = useState<Set<string>>(new Set());
  const [selectedDecision, setSelectedDecision] = useState<DecisionDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Generate decisions based on data
  const decisions: Decision[] = useMemo(() => {
    const result: Decision[] = [];

    // SKU decisions using FDP formula
    skuMetrics.forEach(sku => {
      const analysis = analyzeSKU(
        sku.margin_percent,
        sku.revenue,
        sku.cogs,
        sku.fees,
        sku.profit
      );

      if (analysis.decision === 'stop_immediately') {
        result.push({
          id: `sku-stop-${sku.sku}`,
          category: 'sku',
          urgency: 'immediate',
          title: `DỪNG BÁN: ${sku.product_name || sku.sku}`,
          description: `SKU ${sku.sku} đang lỗ ${Math.abs(sku.margin_percent).toFixed(1)}% - tiếp tục bán = đốt tiền`,
          impact: `Tổn thất: ${Math.abs(sku.profit).toLocaleString()}đ/tháng`,
          impactAmount: Math.abs(sku.profit),
          action: 'stop',
          actionLabel: 'Dừng bán ngay',
          relatedItems: [sku.channel],
          reasons: analysis.reason,
          formula: 'Margin % = (Revenue - COGS - Fees) / Revenue × 100',
          currentValue: sku.margin_percent,
          threshold: FDP_THRESHOLDS.SKU_STOP_MARGIN_PERCENT,
          options: getOptionsForAction('stop', { sku: sku.sku })
        });
      } else if (analysis.decision === 'review') {
        result.push({
          id: `sku-review-${sku.sku}`,
          category: 'sku',
          urgency: 'today',
          title: `XEM XÉT GIÁ: ${sku.product_name || sku.sku}`,
          description: `Margin thấp (${sku.margin_percent.toFixed(1)}%) - cần tăng giá hoặc giảm chi phí`,
          impact: `Tiềm năng cải thiện: ${(sku.revenue * 0.05).toLocaleString()}đ`,
          impactAmount: sku.revenue * 0.05,
          action: 'review',
          actionLabel: 'Xem xét pricing',
          relatedItems: [sku.channel],
          reasons: analysis.reason,
          formula: 'Contribution Margin = Net Revenue - COGS - Variable Costs',
          currentValue: sku.margin_percent,
          threshold: 10,
          options: getOptionsForAction('review', { sku: sku.sku })
        });
      } else if (analysis.decision === 'reduce_ads') {
        result.push({
          id: `sku-ads-${sku.sku}`,
          category: 'ads',
          urgency: 'today',
          title: `GIẢM ADS: ${sku.product_name || sku.sku}`,
          description: `Chi phí ads cao so với margin - cần optimize hoặc giảm budget`,
          impact: `Tiết kiệm ước tính: ${(sku.fees * 0.3).toLocaleString()}đ`,
          impactAmount: sku.fees * 0.3,
          action: 'reduce',
          actionLabel: 'Giảm ads budget',
          relatedItems: [sku.channel],
          reasons: analysis.reason,
          formula: 'ROAS = Revenue / Ads Spend',
          options: getOptionsForAction('reduce', { sku: sku.sku })
        });
      }
    });

    // Cash position decisions
    if (cashPosition) {
      const { bankBalance, overdueAR, inventoryValue } = cashPosition;
      
      // Calculate cash runway
      const monthlyBurn = 50000000; // This should come from actual data
      const cashRunway = bankBalance / monthlyBurn;

      if (cashRunway < FDP_THRESHOLDS.RUNWAY_CRITICAL_MONTHS) {
        result.push({
          id: 'cash-danger',
          category: 'cash',
          urgency: 'immediate',
          title: 'KHẨN CẤP: Cash Runway < 3 tháng',
          description: `Chỉ còn ${cashRunway.toFixed(1)} tháng cash - cần hành động khẩn cấp`,
          impact: `Cash hiện tại: ${bankBalance.toLocaleString()}đ`,
          impactAmount: bankBalance,
          action: 'collect',
          actionLabel: 'Thu hồi AR ngay',
          relatedItems: ['Tất cả kênh'],
          reasons: [
            `Cash runway chỉ còn ${cashRunway.toFixed(1)} tháng`,
            `Burn rate: ${monthlyBurn.toLocaleString()}đ/tháng`,
            'Cần thu hồi công nợ hoặc cắt giảm chi phí'
          ],
          formula: 'Cash Runway = Bank Balance / Monthly Burn Rate',
          currentValue: cashRunway,
          threshold: FDP_THRESHOLDS.RUNWAY_CRITICAL_MONTHS,
          options: getOptionsForAction('collect', { amount: overdueAR })
        });
      }

      // Overdue AR decisions
      if (overdueAR > bankBalance * 0.3) {
        result.push({
          id: 'ar-overdue',
          category: 'ar',
          urgency: 'immediate',
          title: 'THU HỒI: AR quá hạn cao',
          description: `${overdueAR.toLocaleString()}đ AR quá hạn (>${((overdueAR/bankBalance)*100).toFixed(0)}% bank balance)`,
          impact: `Thu hồi được: ${overdueAR.toLocaleString()}đ`,
          impactAmount: overdueAR,
          action: 'collect',
          actionLabel: 'Liên hệ khách hàng',
          relatedItems: overdueInvoices.slice(0, 3).map(inv => inv.customer_name),
          reasons: [
            `AR quá hạn: ${overdueAR.toLocaleString()}đ`,
            `Chiếm ${((overdueAR/bankBalance)*100).toFixed(0)}% bank balance`,
            'Rủi ro mất vốn cao nếu không thu hồi'
          ],
          formula: 'AR Risk = Overdue AR / Bank Balance',
          options: getOptionsForAction('collect', { amount: overdueAR })
        });
      }

      // Inventory decisions
      if (inventoryValue > bankBalance * 0.5) {
        result.push({
          id: 'inventory-high',
          category: 'inventory',
          urgency: 'this_week',
          title: 'GIẢM: Tồn kho cao',
          description: `Tồn kho ${inventoryValue.toLocaleString()}đ chiếm >${((inventoryValue/bankBalance)*100).toFixed(0)}% bank balance`,
          impact: `Cash bị khóa: ${inventoryValue.toLocaleString()}đ`,
          impactAmount: inventoryValue,
          action: 'review',
          actionLabel: 'Review tồn kho',
          relatedItems: [],
          reasons: [
            `Tồn kho: ${inventoryValue.toLocaleString()}đ`,
            `Chiếm ${((inventoryValue/bankBalance)*100).toFixed(0)}% bank balance`,
            'Cash bị khóa trong hàng hóa'
          ],
          formula: 'Inventory Lock = Inventory Value / Bank Balance',
          options: [
            {
              id: 'flash_sale',
              label: 'Chạy flash sale',
              description: 'Giảm giá để xả tồn kho nhanh',
              impact: 'Thu hồi cash nhanh, chấp nhận margin thấp',
              risk: 'medium'
            },
            {
              id: 'stop_reorder',
              label: 'Dừng đặt hàng mới',
              description: 'Không nhập thêm hàng cho đến khi tồn giảm',
              impact: 'Giảm inventory dần, có thể thiếu hàng',
              risk: 'low'
            },
            {
              id: 'bundle_slow',
              label: 'Bundle hàng chậm',
              description: 'Bán kèm với sản phẩm bán chạy',
              impact: 'Xả tồn mà không giảm giá',
              risk: 'low'
            }
          ]
        });
      }
    }

    // Sort by urgency and impact
    const urgencyOrder = { immediate: 0, today: 1, this_week: 2 };
    return result.sort((a, b) => {
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return (b.impactAmount || 0) - (a.impactAmount || 0);
    });
  }, [skuMetrics, cashPosition, overdueInvoices]);

  // Filter out completed decisions
  const activeDecisions = decisions.filter(d => !completedDecisions.has(d.id));
  
  // Group by urgency
  const immediateDecisions = activeDecisions.filter(d => d.urgency === 'immediate');
  const todayDecisions = activeDecisions.filter(d => d.urgency === 'today');
  const weekDecisions = activeDecisions.filter(d => d.urgency === 'this_week');

  const totalImpact = activeDecisions.reduce((sum, d) => sum + (d.impactAmount || 0), 0);

  const handleViewDetail = (decision: Decision) => {
    setSelectedDecision({
      ...decision,
      reasons: decision.reasons || [],
      options: decision.options || []
    });
    setDialogOpen(true);
  };

  const handleDecide = (decisionId: string, selectedOption: string, notes: string) => {
    setCompletedDecisions(prev => new Set([...prev, decisionId]));
    toast({
      title: "Đã ghi nhận quyết định",
      description: `Option: ${selectedOption}${notes ? ` - Ghi chú: ${notes}` : ''}`,
    });
  };

  if (activeDecisions.length === 0) {
    return (
      <Card className="border-2 border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            Không có quyết định khẩn cấp hôm nay
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Tất cả metrics đang trong ngưỡng an toàn. Tiếp tục monitor.
          </p>
          {completedDecisions.size > 0 && (
            <p className="text-sm text-green-600 mt-2">
              ✅ Đã hoàn thành {completedDecisions.size} quyết định
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-2 border-red-500/30 bg-gradient-to-br from-red-500/5 to-orange-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
              QUYẾT ĐỊNH HÔM NAY
            </CardTitle>
            <div className="text-right">
              <div className="text-2xl font-bold text-red-600">
                {activeDecisions.length} quyết định
              </div>
              <div className="text-sm text-muted-foreground">
                Tác động: {totalImpact.toLocaleString()}đ
              </div>
              {completedDecisions.size > 0 && (
                <div className="text-xs text-green-600">
                  ✅ {completedDecisions.size} đã hoàn thành
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Immediate Actions */}
          {immediateDecisions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={urgencyConfig.immediate.color}>
                  <Zap className="h-3 w-3 mr-1" />
                  {urgencyConfig.immediate.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {immediateDecisions.length} việc cần làm ngay
                </span>
              </div>
              <div className="space-y-2">
                {immediateDecisions.map(decision => (
                  <DecisionCard 
                    key={decision.id} 
                    decision={decision} 
                    onViewDetail={() => handleViewDetail(decision)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Today Actions */}
          {todayDecisions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={urgencyConfig.today.color}>
                  <Clock className="h-3 w-3 mr-1" />
                  {urgencyConfig.today.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {todayDecisions.length} việc cần hoàn thành hôm nay
                </span>
              </div>
              <div className="space-y-2">
                {todayDecisions.slice(0, 3).map(decision => (
                  <DecisionCard 
                    key={decision.id} 
                    decision={decision} 
                    compact 
                    onViewDetail={() => handleViewDetail(decision)}
                  />
                ))}
                {todayDecisions.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                    +{todayDecisions.length - 3} quyết định khác
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* This Week Actions */}
          {weekDecisions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={urgencyConfig.this_week.color}>
                  {urgencyConfig.this_week.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {weekDecisions.length} việc cần xem xét trong tuần
                </span>
              </div>
              <div className="text-sm text-muted-foreground pl-4 border-l-2 border-yellow-500/30">
                {weekDecisions.map(d => d.title).slice(0, 2).join(' • ')}
                {weekDecisions.length > 2 && ` và ${weekDecisions.length - 2} khác`}
              </div>
            </div>
          )}

          {/* Formula Reference */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="font-mono bg-muted px-1 rounded">🔒</span>
              Quyết định dựa trên công thức FDP chuẩn - không thể chỉnh sửa
            </p>
          </div>
        </CardContent>
      </Card>

      <DecisionDetailDialog
        decision={selectedDecision}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDecide={handleDecide}
      />
    </>
  );
};

interface DecisionCardProps {
  decision: Decision;
  compact?: boolean;
  onViewDetail: () => void;
}

const DecisionCard: React.FC<DecisionCardProps> = ({ 
  decision, 
  compact = false,
  onViewDetail
}) => {
  const CategoryIcon = categoryIcons[decision.category];
  const actionCfg = actionConfig[decision.action];

  if (compact) {
    return (
      <div className="flex items-center justify-between p-2 bg-background/50 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-2">
          <CategoryIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{decision.title}</span>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onViewDetail}>
          <Eye className="h-3 w-3 mr-1" />
          Chi tiết
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3 bg-background/80 rounded-lg border-2 border-red-500/20 hover:border-red-500/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <CategoryIcon className="h-5 w-5 text-red-500" />
            <h4 className="font-semibold text-foreground">{decision.title}</h4>
          </div>
          <p className="text-sm text-muted-foreground">{decision.description}</p>
          <p className="text-sm font-medium text-red-600">{decision.impact}</p>
          {decision.relatedItems && decision.relatedItems.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {decision.relatedItems.map((item, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button 
          size="sm" 
          className={`${actionCfg.color} text-white shrink-0`}
          onClick={onViewDetail}
        >
          <Eye className="h-4 w-4 mr-1" />
          Xem & Quyết định
        </Button>
      </div>
    </div>
  );
};

export default TodayDecisionSummary;
