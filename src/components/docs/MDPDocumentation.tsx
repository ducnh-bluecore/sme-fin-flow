import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Target,
  Megaphone,
  BarChart3,
  Layers,
  TrendingUp,
  DollarSign,
  Wallet,
  AlertTriangle,
  Zap,
  LineChart,
  PieChart,
  Users,
  Gauge,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DocSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  path: string;
  mode: 'marketing' | 'cmo';
  features: {
    name: string;
    description: string;
    formula?: string;
    tips?: string[];
  }[];
  manifesto?: string[];
}

const mdpSections: DocSection[] = [
  // Marketing Mode (Execution)
  {
    id: 'marketing-mode',
    title: 'Marketing Mode',
    icon: Megaphone,
    path: '/mdp/marketing-mode',
    mode: 'marketing',
    description: 'Chế độ thực thi cho đội ngũ Marketing - Theo dõi campaigns hàng ngày.',
    features: [
      {
        name: 'Performance Overview',
        description: 'Tổng quan hiệu suất: Spend, Revenue, ROAS, Conversions.',
      },
      {
        name: 'Real-time Monitoring',
        description: 'Theo dõi thời gian thực các chỉ số marketing.',
      },
    ],
  },
  {
    id: 'campaigns',
    title: 'Campaign Performance',
    icon: BarChart3,
    path: '/mdp/campaigns',
    mode: 'marketing',
    description: 'Hiệu suất chi tiết từng chiến dịch marketing.',
    features: [
      {
        name: 'Campaign Metrics',
        description: 'CTR, CPC, CPM, Conversion Rate, ROAS cho từng campaign.',
        formula: 'ROAS = Revenue / Ad Spend\nCTR = Clicks / Impressions × 100%',
      },
      {
        name: 'Budget Utilization',
        description: 'Tỷ lệ sử dụng ngân sách và tốc độ tiêu budget.',
      },
      {
        name: 'Pause/Resume Actions',
        description: 'Hành động nhanh để dừng hoặc tiếp tục campaign.',
        tips: [
          'Campaign với ROAS < 1 nên được xem xét tạm dừng',
        ],
      },
    ],
  },
  {
    id: 'channels',
    title: 'Channel Analysis',
    icon: Layers,
    path: '/mdp/channels',
    mode: 'marketing',
    description: 'Phân tích hiệu suất theo từng kênh marketing.',
    features: [
      {
        name: 'Channel Comparison',
        description: 'So sánh hiệu suất giữa các kênh: Google, Facebook, TikTok, Shopee...',
      },
      {
        name: 'Channel Mix',
        description: 'Tỷ trọng phân bổ ngân sách theo kênh.',
      },
      {
        name: 'Cross-Channel Attribution',
        description: 'Attribution đa kênh cho customer journey.',
      },
    ],
  },
  {
    id: 'funnel',
    title: 'Marketing Funnel',
    icon: TrendingUp,
    path: '/mdp/funnel',
    mode: 'marketing',
    description: 'Phân tích phễu chuyển đổi từ Awareness đến Purchase.',
    features: [
      {
        name: 'Funnel Stages',
        description: 'Impressions → Clicks → Add to Cart → Checkout → Purchase.',
      },
      {
        name: 'Drop-off Analysis',
        description: 'Phân tích điểm rớt và tỷ lệ chuyển đổi từng giai đoạn.',
        formula: 'Conversion Rate = Next Stage / Current Stage × 100%',
      },
      {
        name: 'Funnel Optimization',
        description: 'Gợi ý cải thiện cho các điểm nghẽn.',
      },
    ],
  },
  {
    id: 'ab-testing',
    title: 'A/B Testing',
    icon: Gauge,
    path: '/mdp/ab-testing',
    mode: 'marketing',
    description: 'Quản lý và phân tích các thử nghiệm A/B.',
    features: [
      {
        name: 'Test Management',
        description: 'Tạo, quản lý và theo dõi các test A/B.',
      },
      {
        name: 'Statistical Significance',
        description: 'Tính toán mức độ tin cậy thống kê của kết quả.',
      },
      {
        name: 'Winner Declaration',
        description: 'Tự động xác định variant thắng cuộc.',
      },
    ],
  },
  {
    id: 'roi-analytics',
    title: 'ROI Analytics',
    icon: LineChart,
    path: '/mdp/roi-analytics',
    mode: 'marketing',
    description: 'Phân tích Return on Investment chi tiết.',
    features: [
      {
        name: 'ROI by Campaign',
        description: 'ROI chi tiết theo từng campaign.',
        formula: 'ROI = (Revenue - Cost) / Cost × 100%',
      },
      {
        name: 'Payback Period',
        description: 'Thời gian hoàn vốn cho mỗi chiến dịch.',
      },
    ],
  },
  {
    id: 'customer-ltv',
    title: 'Customer LTV',
    icon: Users,
    path: '/mdp/customer-ltv',
    mode: 'marketing',
    description: 'Phân tích giá trị vòng đời khách hàng.',
    features: [
      {
        name: 'LTV Calculation',
        description: 'Giá trị vòng đời dự kiến của khách hàng.',
        formula: 'LTV = Average Order Value × Purchase Frequency × Customer Lifespan',
      },
      {
        name: 'CAC:LTV Ratio',
        description: 'Tỷ lệ chi phí thu hút so với giá trị khách hàng.',
        formula: 'CAC:LTV = Customer Acquisition Cost / Lifetime Value',
        tips: [
          'Ratio nên > 3:1 để sustainable',
          'Ratio < 1:1 = đang mất tiền cho mỗi khách hàng',
        ],
      },
      {
        name: 'Cohort Analysis',
        description: 'Phân tích LTV theo cohort thời gian.',
      },
    ],
  },

  // CMO Mode (Decision)
  {
    id: 'cmo-mode',
    title: 'CMO Mode',
    icon: Target,
    path: '/mdp/cmo-mode',
    mode: 'cmo',
    description: 'Chế độ ra quyết định cho CMO/CEO - Focus on Profit & Cash.',
    features: [
      {
        name: 'Profit-First View',
        description: 'Xem marketing qua lăng kính lợi nhuận, không phải metrics.',
      },
      {
        name: 'Cash Impact Summary',
        description: 'Tổng quan tác động của marketing đến dòng tiền.',
      },
    ],
    manifesto: [
      'MDP KHÔNG PHẢI MARTECH - Không chạy quảng cáo, không quản lý campaign',
      'ĐO LƯỜNG GIÁ TRỊ TÀI CHÍNH THẬT CỦA MARKETING',
    ],
  },
  {
    id: 'profit-attribution',
    title: 'Profit Attribution',
    icon: DollarSign,
    path: '/mdp/profit',
    mode: 'cmo',
    description: 'Phân bổ LỢI NHUẬN (không phải revenue) cho từng kênh marketing.',
    features: [
      {
        name: 'Profit by Channel',
        description: 'Lợi nhuận thực sau khi trừ tất cả chi phí theo kênh.',
        formula: 'Channel Profit = Revenue - COGS - Ad Spend - Platform Fees - Returns',
      },
      {
        name: 'Contribution Margin by Campaign',
        description: 'Biên lợi nhuận đóng góp của từng campaign.',
        tips: [
          'Không có ROAS chưa tính logistics, return, payment',
          'Mọi campaign đều bị truy đến contribution margin',
        ],
      },
      {
        name: 'True Cost Visibility',
        description: 'Chi phí thực bao gồm: Ads, Platform Fees, Shipping, Returns, Payment Fees.',
      },
    ],
    manifesto: [
      'MDP KHÔNG LÀ CLICK ATTRIBUTION - MDP LÀ PROFIT ATTRIBUTION',
    ],
  },
  {
    id: 'cash-impact',
    title: 'Cash Impact',
    icon: Wallet,
    path: '/mdp/cash-impact',
    mode: 'cmo',
    description: 'Tác động của marketing đến dòng tiền doanh nghiệp.',
    features: [
      {
        name: 'Cash Cycle Analysis',
        description: 'Phân tích vòng quay tiền: Ad Spend → Revenue → Cash Collected.',
        tips: [
          'Tiền về nhanh hay chậm?',
          'Có bị hoàn/refund không?',
          'Có khóa cash không?',
        ],
      },
      {
        name: 'Working Capital Impact',
        description: 'Marketing ảnh hưởng đến vốn lưu động như thế nào.',
      },
      {
        name: 'Cash-Adjusted ROAS',
        description: 'ROAS điều chỉnh theo thời gian thu tiền thực.',
        formula: 'Cash-ROAS = Cash Collected / Ad Spend (within period)',
      },
    ],
    manifesto: [
      'Marketing không chỉ bán hàng – marketing TIÊU TIỀN',
    ],
  },
  {
    id: 'risks',
    title: 'Marketing Risks',
    icon: AlertTriangle,
    path: '/mdp/risks',
    mode: 'cmo',
    description: 'Cảnh báo rủi ro từ hoạt động marketing.',
    features: [
      {
        name: 'Burn Rate Alert',
        description: 'Cảnh báo khi tốc độ đốt tiền marketing vượt ngưỡng.',
      },
      {
        name: 'ROAS Degradation',
        description: 'Phát hiện sớm khi ROAS bắt đầu giảm.',
      },
      {
        name: 'Channel Concentration Risk',
        description: 'Rủi ro phụ thuộc quá nhiều vào một kênh.',
      },
    ],
    manifesto: [
      'MDP ƯU TIÊN RỦI RO HƠN THÀNH TÍCH',
      'MDP tồn tại để ngăn doanh nghiệp chết vì marketing',
    ],
  },
  {
    id: 'budget-optimizer',
    title: 'Budget Optimizer',
    icon: Zap,
    path: '/mdp/budget-optimizer',
    mode: 'cmo',
    description: 'Tối ưu phân bổ ngân sách marketing tự động.',
    features: [
      {
        name: 'AI-Powered Allocation',
        description: 'Gợi ý phân bổ ngân sách dựa trên dữ liệu lịch sử và mục tiêu.',
      },
      {
        name: 'Scenario Comparison',
        description: 'So sánh các phương án phân bổ khác nhau.',
      },
      {
        name: 'Constraint-Based Optimization',
        description: 'Tối ưu với các ràng buộc: Budget cap, Min spend per channel.',
      },
    ],
  },
  {
    id: 'decisions',
    title: 'Decision Center',
    icon: Target,
    path: '/mdp/decisions',
    mode: 'cmo',
    description: 'Trung tâm ra quyết định marketing dựa trên dữ liệu.',
    features: [
      {
        name: 'Decision Cards',
        description: 'Các quyết định cần đưa ra với đầy đủ context.',
        tips: [
          'Mỗi quyết định marketing phải trả lời: Lãi hay lỗ? Cash impact? Rủi ro ở đâu?',
        ],
      },
      {
        name: 'Scale/Stop Recommendations',
        description: 'Gợi ý scale hoặc dừng campaign dựa trên profit.',
      },
    ],
    manifesto: [
      'Không có scale campaign vô điều kiện',
      'Không có "để thử thêm"',
    ],
  },
  {
    id: 'scenario-planner',
    title: 'Scenario Planner',
    icon: LineChart,
    path: '/mdp/scenario-planner',
    mode: 'cmo',
    description: 'Mô phỏng các kịch bản marketing.',
    features: [
      {
        name: 'What-If Scenarios',
        description: 'Mô phỏng: Nếu tăng budget 20%? Nếu dừng channel X?',
      },
      {
        name: 'Impact Projection',
        description: 'Dự báo tác động đến Revenue, Profit, Cash.',
      },
    ],
  },
];

interface MDPDocumentationProps {
  searchQuery: string;
}

export function MDPDocumentation({ searchQuery }: MDPDocumentationProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('cmo-mode');

  const filteredSections = mdpSections.filter((section) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      section.title.toLowerCase().includes(query) ||
      section.description.toLowerCase().includes(query) ||
      section.features.some(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query)
      )
    );
  });

  const marketingModeSections = filteredSections.filter((s) => s.mode === 'marketing');
  const cmoModeSections = filteredSections.filter((s) => s.mode === 'cmo');

  const renderSection = (section: DocSection) => {
    const Icon = section.icon;
    const isExpanded = expandedSection === section.id;
    const colorClass = section.mode === 'marketing' ? 'text-blue-500' : 'text-purple-500';
    const bgClass = section.mode === 'marketing' ? 'bg-blue-500/10' : 'bg-purple-500/10';

    return (
      <motion.div
        key={section.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border rounded-lg overflow-hidden bg-card"
      >
        <button
          onClick={() => setExpandedSection(isExpanded ? null : section.id)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", bgClass)}>
              <Icon className={cn("h-5 w-5", colorClass)} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">{section.title}</h3>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {section.path}
            </Badge>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t"
            >
              <div className="p-4 space-y-4">
                {section.manifesto && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">NGUYÊN TẮC</p>
                    {section.manifesto.map((item, i) => (
                      <p key={i} className="text-sm">{item}</p>
                    ))}
                  </div>
                )}

                {section.features.map((feature, idx) => (
                  <div key={idx} className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <ArrowRight className={cn("h-4 w-4", colorClass)} />
                      {feature.name}
                    </h4>
                    <p className="text-sm text-muted-foreground pl-6">
                      {feature.description}
                    </p>
                    {feature.formula && (
                      <div className="ml-6 bg-muted/50 rounded-md p-2 font-mono text-xs">
                        {feature.formula.split('\n').map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    )}
                    {feature.tips && (
                      <div className="ml-6 space-y-1">
                        {feature.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* MDP Manifesto */}
      <Card className="border-purple-500/30 bg-purple-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-purple-500" />
            MDP Manifesto - Profit before Performance. Cash before Clicks.
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <span><strong>MDP KHÔNG PHẢI MARTECH</strong> - Không tồn tại để chạy quảng cáo hay quản lý campaign</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <span><strong>PHỤC VỤ CEO & CFO TRƯỚC</strong> - CFO hiểu, CEO quyết, marketer buộc phải điều chỉnh</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <span><strong>KHÔNG CHO PHÉP "TĂNG TRƯỞNG KHÔNG TRÁCH NHIỆM"</strong> - Mỗi quyết định phải trả lời: lãi/lỗ, cash impact, risk</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <span><strong>FINAL TEST</strong> - Nếu không làm quyết định marketing rõ ràng hơn → MDP đã thất bại</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CMO Mode Section */}
      {cmoModeSections.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30">
              CMO Mode (Decision)
            </Badge>
            <span className="text-sm text-muted-foreground">Dành cho lãnh đạo - Focus on Profit & Cash</span>
          </div>
          <div className="space-y-3">
            {cmoModeSections.map(renderSection)}
          </div>
        </div>
      )}

      {/* Marketing Mode Section */}
      {marketingModeSections.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">
              Marketing Mode (Execution)
            </Badge>
            <span className="text-sm text-muted-foreground">Dành cho đội ngũ thực thi hàng ngày</span>
          </div>
          <div className="space-y-3">
            {marketingModeSections.map(renderSection)}
          </div>
        </div>
      )}
    </div>
  );
}
