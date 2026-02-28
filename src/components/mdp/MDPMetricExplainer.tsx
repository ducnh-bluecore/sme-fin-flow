import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { 
  Info, 
  Calculator, 
  TrendingUp, 
  DollarSign,
  Percent,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ MDP METRIC DEFINITIONS ============
// Theo MDP Manifesto: "Simple Attribution - Logic rõ ràng, CFO tin được"

export interface MetricDefinition {
  key: string;
  name: string;
  formula: string;
  explanation: string;
  dataSources: string[];
  interpretation: {
    good: string;
    warning: string;
    bad: string;
  };
  thresholds?: {
    good: number;
    warning: number;
  };
  unit: 'currency' | 'percent' | 'ratio' | 'days' | 'number';
  category: 'revenue' | 'cost' | 'profit' | 'cash' | 'performance';
}

export const MDP_METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // === REVENUE METRICS ===
  gross_revenue: {
    key: 'gross_revenue',
    name: 'Gross Revenue',
    formula: 'SUM(order.total_amount) trước chiết khấu',
    explanation: 'Tổng doanh thu từ đơn hàng trước khi trừ bất kỳ chi phí hay chiết khấu nào. Đây là con số "headline" nhưng KHÔNG phản ánh tiền thực nhận.',
    dataSources: ['external_orders.total_amount', 'external_order_items.total_amount'],
    interpretation: {
      good: 'Tăng trưởng đều đặn qua các kỳ',
      warning: 'Tăng mạnh nhưng margin giảm = dấu hiệu tăng trưởng giả',
      bad: 'Giảm liên tục hoặc tăng đột biến không bền vững',
    },
    unit: 'currency',
    category: 'revenue',
  },
  
  net_revenue: {
    key: 'net_revenue',
    name: 'Net Revenue',
    formula: 'Gross Revenue - Discounts - Refunds',
    explanation: 'Doanh thu sau khi trừ chiết khấu và hoàn trả. Đây là số tiền thực sự mà business giữ lại từ khách hàng.',
    dataSources: [
      'external_orders.total_amount',
      'promotion_campaigns.total_discount_given',
      'channel_settlements.total_refunds',
    ],
    interpretation: {
      good: 'Net/Gross ratio > 90%',
      warning: 'Net/Gross ratio 80-90%',
      bad: 'Net/Gross ratio < 80% = quá nhiều discount/refund',
    },
    unit: 'currency',
    category: 'revenue',
  },

  // === COST METRICS ===
  cogs: {
    key: 'cogs',
    name: 'COGS (Giá vốn)',
    formula: 'SUM(order_items.quantity × product.cost_price)',
    explanation: 'Giá vốn hàng bán - chi phí thực tế để mua/sản xuất sản phẩm. Lấy từ external_products.cost_price, KHÔNG dùng estimate.',
    dataSources: ['external_order_items.unit_cogs', 'external_products.cost_price'],
    interpretation: {
      good: 'COGS/Net Revenue < 50%',
      warning: 'COGS/Net Revenue 50-65%',
      bad: 'COGS/Net Revenue > 65% = margin quá mỏng',
    },
    thresholds: { good: 50, warning: 65 },
    unit: 'currency',
    category: 'cost',
  },

  platform_fees: {
    key: 'platform_fees',
    name: 'Platform Fees',
    formula: 'SUM(channel_fees.amount) WHERE fee_type IN (commission, service)',
    explanation: 'Phí sàn TMĐT bao gồm: commission (hoa hồng), service fee, flash sale fee, voucher fee. Lấy từ channel_fees hoặc channel_settlements.',
    dataSources: ['channel_fees.amount', 'channel_settlements.total_commission', 'channel_settlements.total_service_fee'],
    interpretation: {
      good: 'Platform fees < 12% net revenue',
      warning: 'Platform fees 12-18%',
      bad: 'Platform fees > 18% = cần negotiate với sàn',
    },
    thresholds: { good: 12, warning: 18 },
    unit: 'currency',
    category: 'cost',
  },

  logistics_cost: {
    key: 'logistics_cost',
    name: 'Logistics Cost',
    formula: 'SUM(channel_fees.amount) WHERE fee_type = shipping + Return handling cost',
    explanation: 'Chi phí vận chuyển và xử lý hàng hoàn. Bao gồm: ship đến khách, ship hoàn, phí đóng gói, xử lý return.',
    dataSources: ['channel_fees.amount (shipping)', 'channel_settlements.total_shipping_fee'],
    interpretation: {
      good: 'Logistics < 8% net revenue',
      warning: 'Logistics 8-12%',
      bad: 'Logistics > 12% = cần tối ưu fulfillment',
    },
    thresholds: { good: 8, warning: 12 },
    unit: 'currency',
    category: 'cost',
  },

  payment_fees: {
    key: 'payment_fees',
    name: 'Payment Fees',
    formula: 'SUM(channel_fees.amount) WHERE fee_type = payment',
    explanation: 'Phí thanh toán từ các cổng thanh toán (VNPay, Momo, COD collection). Thường từ 1.5-3% giá trị giao dịch.',
    dataSources: ['channel_fees.amount (payment)', 'channel_settlements.total_payment_fee'],
    interpretation: {
      good: 'Payment fees < 2%',
      warning: 'Payment fees 2-3%',
      bad: 'Payment fees > 3%',
    },
    thresholds: { good: 2, warning: 3 },
    unit: 'currency',
    category: 'cost',
  },

  ad_spend: {
    key: 'ad_spend',
    name: 'Ad Spend',
    formula: 'SUM(marketing_expenses.amount) + promotion_campaigns.actual_cost',
    explanation: 'Tổng chi phí quảng cáo cho campaign. Bao gồm: Shopee Ads, Lazada Ads, TikTok Ads, Facebook Ads...',
    dataSources: ['promotion_campaigns.actual_cost', 'marketing_expenses.amount'],
    interpretation: {
      good: 'Ad Spend < 15% net revenue',
      warning: 'Ad Spend 15-25%',
      bad: 'Ad Spend > 25% = đốt tiền quảng cáo',
    },
    thresholds: { good: 15, warning: 25 },
    unit: 'currency',
    category: 'cost',
  },

  // === PROFIT METRICS ===
  contribution_margin: {
    key: 'contribution_margin',
    name: 'Contribution Margin (CM)',
    formula: 'Net Revenue - COGS - Platform Fees - Logistics - Payment Fees - Ad Spend',
    explanation: 'Lợi nhuận đóng góp sau TẤT CẢ chi phí biến đổi. Đây là số tiền THỰC SỰ còn lại để cover chi phí cố định và profit. FDP truth metric.',
    dataSources: [
      'external_orders (revenue)',
      'external_order_items (COGS)',
      'channel_fees (all fees)',
      'marketing_expenses (ad spend)',
    ],
    interpretation: {
      good: 'CM > 0 và CM% > 15%',
      warning: 'CM > 0 nhưng CM% < 10%',
      bad: 'CM < 0 = ĐANG LỖ TIỀN THẬT',
    },
    thresholds: { good: 15, warning: 10 },
    unit: 'currency',
    category: 'profit',
  },

  contribution_margin_percent: {
    key: 'contribution_margin_percent',
    name: 'CM%',
    formula: '(Contribution Margin / Net Revenue) × 100',
    explanation: 'Tỷ lệ lợi nhuận đóng góp. Cho biết mỗi 100đ net revenue, còn lại bao nhiêu sau tất cả chi phí biến đổi.',
    dataSources: ['Calculated from CM and Net Revenue'],
    interpretation: {
      good: 'CM% ≥ 15% = healthy business',
      warning: 'CM% 5-15% = thin margin, cần optimize',
      bad: 'CM% < 5% hoặc âm = unsustainable',
    },
    thresholds: { good: 15, warning: 5 },
    unit: 'percent',
    category: 'profit',
  },

  profit_roas: {
    key: 'profit_roas',
    name: 'Profit ROAS',
    formula: 'Contribution Margin / Ad Spend',
    explanation: 'ROAS thực - tính trên PROFIT chứ không phải revenue. Đây mới là con số CFO cần, không phải ROAS ảo từ ads platform.',
    dataSources: ['CM (calculated)', 'Ad Spend'],
    interpretation: {
      good: 'P-ROAS ≥ 0.5 = mỗi 1đ ads tạo 0.5đ profit',
      warning: 'P-ROAS 0.2-0.5 = barely profitable',
      bad: 'P-ROAS < 0.2 hoặc âm = ads đốt tiền',
    },
    thresholds: { good: 0.5, warning: 0.2 },
    unit: 'ratio',
    category: 'profit',
  },

  // === CASH METRICS ===
  cash_received: {
    key: 'cash_received',
    name: 'Cash Received',
    formula: 'SUM(channel_settlements.net_amount) đã payout',
    explanation: 'Tiền thực tế đã về tài khoản từ các sàn TMĐT. Khác với revenue - đây là CASH đã nhận.',
    dataSources: ['channel_settlements.net_amount WHERE status = paid'],
    interpretation: {
      good: 'Cash/Revenue > 80%',
      warning: 'Cash/Revenue 60-80%',
      bad: 'Cash/Revenue < 60% = tiền bị kẹt',
    },
    unit: 'currency',
    category: 'cash',
  },

  cash_conversion_rate: {
    key: 'cash_conversion_rate',
    name: 'Cash Conversion Rate',
    formula: 'Cash Received / (Cash Received + Pending + Refunded) × 100',
    explanation: 'Tỷ lệ chuyển đổi thành tiền thực. Phản ánh khả năng thu hồi tiền từ doanh thu.',
    dataSources: ['channel_settlements (net_amount, pending)', 'external_orders (payment_status)'],
    interpretation: {
      good: 'CCR ≥ 85%',
      warning: 'CCR 70-85%',
      bad: 'CCR < 70% = serious cash flow issue',
    },
    thresholds: { good: 85, warning: 70 },
    unit: 'percent',
    category: 'cash',
  },

  avg_days_to_cash: {
    key: 'avg_days_to_cash',
    name: 'Days to Cash',
    formula: 'AVG(settlement.payout_date - order.order_date)',
    explanation: 'Số ngày trung bình từ lúc có đơn hàng đến lúc tiền về tài khoản. Ảnh hưởng trực tiếp đến working capital.',
    dataSources: ['channel_settlements.payout_date', 'external_orders.order_date'],
    interpretation: {
      good: 'D2C ≤ 14 days',
      warning: 'D2C 15-21 days',
      bad: 'D2C > 21 days = cần push sàn',
    },
    thresholds: { good: 14, warning: 21 },
    unit: 'days',
    category: 'cash',
  },

  // === PERFORMANCE METRICS ===
  roas: {
    key: 'roas',
    name: 'Standard ROAS',
    formula: 'Revenue / Ad Spend',
    explanation: 'ROAS thông thường từ ads platform. CẢNH BÁO: Con số này KHÔNG phản ánh profit thực vì không tính COGS và fees.',
    dataSources: ['promotion_campaigns.total_revenue', 'promotion_campaigns.actual_cost'],
    interpretation: {
      good: 'ROAS ≥ 4.0',
      warning: 'ROAS 2.0-4.0',
      bad: 'ROAS < 2.0',
    },
    thresholds: { good: 4, warning: 2 },
    unit: 'ratio',
    category: 'performance',
  },

  cpa: {
    key: 'cpa',
    name: 'CPA (Cost Per Acquisition)',
    formula: 'Ad Spend / Total Orders',
    explanation: 'Chi phí để có một đơn hàng. Cần so sánh với AOV và margin để đánh giá efficiency.',
    dataSources: ['promotion_campaigns.actual_cost', 'promotion_campaigns.total_orders'],
    interpretation: {
      good: 'CPA < 20% AOV',
      warning: 'CPA 20-30% AOV',
      bad: 'CPA > 30% AOV = acquisition quá đắt',
    },
    unit: 'currency',
    category: 'performance',
  },
};

// === COMPONENT INTERFACES ===
interface MetricExplainerProps {
  metricKey: string;
  value?: number;
  variant?: 'tooltip' | 'hovercard' | 'inline';
  showIcon?: boolean;
  className?: string;
}

interface MetricExplainerPanelProps {
  metrics: string[];
  title?: string;
}

// === HELPER FUNCTIONS ===
const getCategoryIcon = (category: MetricDefinition['category']) => {
  switch (category) {
    case 'revenue': return TrendingUp;
    case 'cost': return DollarSign;
    case 'profit': return Calculator;
    case 'cash': return Zap;
    case 'performance': return Percent;
    default: return Info;
  }
};

const getCategoryColor = (category: MetricDefinition['category']) => {
  switch (category) {
    case 'revenue': return 'text-blue-400';
    case 'cost': return 'text-orange-400';
    case 'profit': return 'text-green-400';
    case 'cash': return 'text-purple-400';
    case 'performance': return 'text-yellow-400';
    default: return 'text-muted-foreground';
  }
};

const getValueStatus = (
  value: number | undefined, 
  thresholds: { good: number; warning: number } | undefined,
  higherIsBetter: boolean = true
): 'good' | 'warning' | 'bad' => {
  if (value === undefined || !thresholds) return 'warning';
  
  if (higherIsBetter) {
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.warning) return 'warning';
    return 'bad';
  } else {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.warning) return 'warning';
    return 'bad';
  }
};

// === MAIN COMPONENTS ===

export function MetricExplainer({ 
  metricKey, 
  value, 
  variant = 'tooltip',
  showIcon = true,
  className 
}: MetricExplainerProps) {
  const metric = MDP_METRIC_DEFINITIONS[metricKey];
  
  if (!metric) {
    return <span className="text-muted-foreground text-xs">{metricKey}</span>;
  }

  const CategoryIcon = getCategoryIcon(metric.category);
  const status = getValueStatus(value, metric.thresholds);

  const content = (
    <div className="space-y-3 max-w-sm">
      <div className="flex items-center gap-2">
        <CategoryIcon className={cn("h-4 w-4", getCategoryColor(metric.category))} />
        <span className="font-semibold">{metric.name}</span>
        <Badge variant="outline" className="text-xs capitalize">
          {metric.category}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Công thức:</p>
          <code className="text-xs bg-muted/50 px-2 py-1 rounded block">
            {metric.formula}
          </code>
        </div>
        
        <p className="text-xs text-muted-foreground">{metric.explanation}</p>
        
        <div className="border-t border-border/50 pt-2">
          <p className="text-xs text-muted-foreground mb-1">Nguồn dữ liệu:</p>
          <div className="flex flex-wrap gap-1">
            {metric.dataSources.slice(0, 3).map((source, i) => (
              <Badge key={i} variant="outline" className="text-[10px] font-mono">
                {source.split('.')[0]}
              </Badge>
            ))}
          </div>
        </div>

        <div className="border-t border-border/50 pt-2 space-y-1">
          <div className="flex items-start gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
            <span className="text-xs text-green-400">{metric.interpretation.good}</span>
          </div>
          <div className="flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 text-yellow-400 mt-0.5 shrink-0" />
            <span className="text-xs text-yellow-400">{metric.interpretation.warning}</span>
          </div>
          <div className="flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
            <span className="text-xs text-red-400">{metric.interpretation.bad}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (variant === 'tooltip') {
    return (
      <Tooltip>
        <TooltipTrigger className={cn("inline-flex items-center gap-1", className)}>
          {showIcon && <Info className="h-3 w-3 text-muted-foreground hover:text-foreground" />}
        </TooltipTrigger>
        <TooltipContent side="top" className="p-3 max-w-sm">
          {content}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'hovercard') {
    return (
      <HoverCard>
        <HoverCardTrigger className={cn("inline-flex items-center gap-1 cursor-help", className)}>
          {showIcon && <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground" />}
        </HoverCardTrigger>
        <HoverCardContent side="top" className="p-3 w-80">
          {content}
        </HoverCardContent>
      </HoverCard>
    );
  }

  // inline variant
  return (
    <div className={cn("p-3 rounded-lg border border-border/50 bg-muted/20", className)}>
      {content}
    </div>
  );
}

export function MetricExplainerPanel({ metrics, title = "Giải thích Metrics" }: MetricExplainerPanelProps) {
  const categoryGroups: Record<string, MetricDefinition[]> = {};
  for (const key of metrics) {
    const metric = MDP_METRIC_DEFINITIONS[key];
    if (!metric) continue;
    const category = metric.category;
    if (!categoryGroups[category]) categoryGroups[category] = [];
    categoryGroups[category].push(metric);
  }

  const categoryLabels: Record<string, string> = {
    revenue: 'Doanh thu',
    cost: 'Chi phí',
    profit: 'Lợi nhuận',
    cash: 'Dòng tiền',
    performance: 'Hiệu suất',
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant="outline" className="text-xs">
            MDP Manifesto
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          "Simple Attribution - Logic rõ ràng, giả định bảo thủ, kết quả CFO tin được"
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(categoryGroups).map(([category, categoryMetrics]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2">
              {(() => {
                const Icon = getCategoryIcon(category as MetricDefinition['category']);
                return <Icon className={cn("h-4 w-4", getCategoryColor(category as MetricDefinition['category']))} />;
              })()}
              <span className="text-sm font-medium">{categoryLabels[category] || category}</span>
            </div>
            <div className="grid gap-2">
              {categoryMetrics.map((metric) => (
                <div 
                  key={metric.key}
                  className="p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{metric.name}</span>
                    <MetricExplainer metricKey={metric.key} variant="tooltip" />
                  </div>
                  <code className="text-xs text-muted-foreground block mb-1">
                    {metric.formula}
                  </code>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {metric.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Quick inline explainer badge
export function MetricBadge({ 
  metricKey, 
  value, 
  showValue = true 
}: { 
  metricKey: string; 
  value?: number; 
  showValue?: boolean;
}) {
  const metric = MDP_METRIC_DEFINITIONS[metricKey];
  if (!metric) return null;

  const formatValue = (val: number) => {
    switch (metric.unit) {
      case 'currency':
        if (Math.abs(val) >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
        if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
        if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
        return val.toLocaleString();
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'ratio':
        return `${val.toFixed(2)}x`;
      case 'days':
        return `${val.toFixed(0)} days`;
      default:
        return val.toLocaleString();
    }
  };

  const status = getValueStatus(value, metric.thresholds);
  const statusColors = {
    good: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    bad: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <HoverCard>
      <HoverCardTrigger>
        <Badge 
          variant="outline" 
          className={cn(
            "cursor-help text-xs",
            value !== undefined && statusColors[status]
          )}
        >
          {metric.name}
          {showValue && value !== undefined && `: ${formatValue(value)}`}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-3">
        <MetricExplainer metricKey={metricKey} value={value} variant="inline" showIcon={false} />
      </HoverCardContent>
    </HoverCard>
  );
}

export default MetricExplainer;
