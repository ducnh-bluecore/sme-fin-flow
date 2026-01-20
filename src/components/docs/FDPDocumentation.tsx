import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  Wallet,
  FileText,
  TrendingUp,
  RefreshCw,
  BarChart3,
  PieChart,
  Calculator,
  Building2,
  Receipt,
  CreditCard,
  Banknote,
  Target,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  Zap,
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
  features: {
    name: string;
    description: string;
    formula?: string;
    tips?: string[];
  }[];
  manifesto?: string[];
}

const fdpSections: DocSection[] = [
  {
    id: 'dashboard',
    title: 'CFO Dashboard',
    icon: BarChart3,
    path: '/dashboard',
    description: 'Trung tâm điều hành với các chỉ số tài chính cốt lõi cho CEO/CFO.',
    features: [
      {
        name: 'Revenue (Doanh thu)',
        description: 'Tổng doanh thu thuần sau khi trừ các khoản giảm trừ, hoàn trả.',
        formula: 'Net Revenue = Gross Revenue - Returns - Discounts - Platform Fees',
        tips: [
          'Revenue luôn là "Net Revenue" - không có phiên bản khác',
          'Mọi doanh thu đều đi kèm chi phí liên quan',
        ],
      },
      {
        name: 'Net Profit (Lợi nhuận ròng)',
        description: 'Lợi nhuận thực sau khi trừ tất cả chi phí.',
        formula: 'Net Profit = Revenue - COGS - Operating Expenses - Taxes',
      },
      {
        name: 'Cash Runway',
        description: 'Số ngày hoạt động còn lại dựa trên tốc độ đốt tiền hiện tại.',
        formula: 'Cash Runway = Current Cash / Average Daily Burn Rate',
        tips: [
          'Runway < 30 ngày = Critical Alert',
          'Runway < 90 ngày = Warning',
        ],
      },
      {
        name: 'Contribution Margin',
        description: 'Biên lợi nhuận gộp sau khi trừ chi phí biến đổi.',
        formula: 'CM = (Revenue - Variable Costs) / Revenue × 100%',
      },
    ],
    manifesto: [
      'SINGLE SOURCE OF TRUTH - 1 Net Revenue, 1 Contribution Margin, 1 Cash Position',
      'TRUTH > FLEXIBILITY - Không cho tự định nghĩa metric tùy tiện',
    ],
  },
  {
    id: 'reconciliation',
    title: 'Đối soát (Reconciliation)',
    icon: RefreshCw,
    path: '/reconciliation',
    description: 'Hệ thống đối soát tự động giữa tài khoản ngân hàng và hóa đơn.',
    features: [
      {
        name: 'Auto-Matching',
        description: 'Tự động đối soát giao dịch ngân hàng với hóa đơn dựa trên số tiền, ngày, và tham chiếu.',
        tips: [
          'Confidence Score > 85% = Auto-accept',
          'Score 60-85% = Human review required',
          'Score < 60% = Manual matching',
        ],
      },
      {
        name: 'Partial Settlement',
        description: 'Xử lý thanh toán một phần cho hóa đơn nhiều lần thanh toán.',
        formula: 'Remaining = Invoice Amount - Sum(Settlement Allocations)',
      },
      {
        name: 'Exception Queue',
        description: 'Danh sách các giao dịch không match tự động cần xử lý thủ công.',
      },
      {
        name: 'Audit Trail',
        description: 'Lịch sử đối soát hoàn chỉnh, không thể thay đổi (immutable ledger).',
      },
    ],
    manifesto: [
      'Source tables are never mutated - all truth is derived from append-only ledger',
    ],
  },
  {
    id: 'ar-operations',
    title: 'AR Operations (Công nợ phải thu)',
    icon: Receipt,
    path: '/ar-operations',
    description: 'Quản lý và theo dõi công nợ khách hàng.',
    features: [
      {
        name: 'AR Aging',
        description: 'Phân tích tuổi nợ theo bucket: Current, 1-30, 31-60, 61-90, >90 ngày.',
        tips: [
          'Nợ >90 ngày = High Risk (có thể provision)',
          'DSO tăng liên tục = Warning signal',
        ],
      },
      {
        name: 'Collection Tracking',
        description: 'Theo dõi quy trình thu hồi công nợ.',
      },
      {
        name: 'DSO (Days Sales Outstanding)',
        description: 'Số ngày trung bình để thu được tiền từ bán hàng.',
        formula: 'DSO = (Average AR / Net Credit Sales) × Days in Period',
      },
    ],
  },
  {
    id: 'cash-forecast',
    title: 'Cash Forecast (Dự báo dòng tiền)',
    icon: TrendingUp,
    path: '/cash-forecast',
    description: 'Dự báo dòng tiền 7, 30, 90 ngày tới.',
    features: [
      {
        name: 'Cash Position',
        description: 'Số dư tiền mặt thực tế tại thời điểm hiện tại.',
        tips: [
          'Phân biệt: Cash đã về / sẽ về / có nguy cơ không về / đang bị khóa',
        ],
      },
      {
        name: 'Inflow Forecast',
        description: 'Dự báo dòng tiền vào từ AR, orders đang pending.',
        formula: 'Expected Inflow = Sum(AR × Collection Probability)',
      },
      {
        name: 'Outflow Forecast',
        description: 'Dự báo dòng tiền ra từ AP, payroll, rent, taxes.',
      },
      {
        name: 'Scenario Analysis',
        description: 'Mô phỏng Best/Base/Worst case scenarios.',
      },
    ],
    manifesto: [
      'REAL CASH - Phân biệt tiền đã về, sẽ về, có nguy cơ, đang bị khóa',
    ],
  },
  {
    id: 'unit-economics',
    title: 'Unit Economics (theo SKU)',
    icon: Calculator,
    path: '/unit-economics',
    description: 'Phân tích lợi nhuận theo từng SKU/sản phẩm.',
    features: [
      {
        name: 'SKU Profitability',
        description: 'Lợi nhuận gộp theo từng SKU sau khi phân bổ chi phí.',
        formula: 'SKU Profit = Revenue - COGS - Allocated Expenses',
      },
      {
        name: 'Contribution Margin by SKU',
        description: 'Biên lợi nhuận đóng góp của từng SKU.',
        formula: 'CM% = (Price - Variable Cost) / Price × 100%',
        tips: [
          'SKU có CM < 0 + khóa cash + tăng risk → STOP bán',
        ],
      },
      {
        name: 'Cash Lock Analysis',
        description: 'Phân tích lượng tiền bị khóa trong tồn kho theo SKU.',
        formula: 'Cash Locked = Inventory Value + Days of Stock × Daily COGS',
      },
      {
        name: 'Cost Breakdown',
        description: 'Chi tiết phân bổ chi phí: Ads, Logistics, Platform Fees, Returns.',
      },
    ],
    manifesto: [
      'UNIT ECONOMICS → ACTION: SKU lỗ + khóa cash + tăng risk → phải nói STOP',
    ],
  },
  {
    id: 'working-capital',
    title: 'Working Capital Hub',
    icon: Wallet,
    path: '/working-capital-hub',
    description: 'Tối ưu hóa vốn lưu động: Inventory, AR, AP.',
    features: [
      {
        name: 'Cash Conversion Cycle (CCC)',
        description: 'Số ngày để chuyển đổi đầu tư thành tiền mặt.',
        formula: 'CCC = DIO + DSO - DPO',
        tips: [
          'DIO = Days Inventory Outstanding',
          'DSO = Days Sales Outstanding',
          'DPO = Days Payable Outstanding',
        ],
      },
      {
        name: 'Inventory Aging',
        description: 'Phân tích tồn kho theo tuổi: 0-30, 31-60, 61-90, >90 ngày.',
      },
      {
        name: 'AP Management',
        description: 'Quản lý và tối ưu lịch thanh toán nhà cung cấp.',
      },
    ],
  },
  {
    id: 'pl-report',
    title: 'P&L Report',
    icon: FileText,
    path: '/pl-report',
    description: 'Báo cáo Lãi/Lỗ chi tiết theo kỳ.',
    features: [
      {
        name: 'Revenue Breakdown',
        description: 'Phân tích doanh thu theo kênh, sản phẩm, khách hàng.',
      },
      {
        name: 'Cost Structure',
        description: 'Cấu trúc chi phí: COGS, OPEX, D&A, Interest, Tax.',
      },
      {
        name: 'Margin Analysis',
        description: 'Phân tích các mức margin: Gross, Operating, Net.',
        formula: 'Gross Margin = (Revenue - COGS) / Revenue\nOperating Margin = EBIT / Revenue\nNet Margin = Net Income / Revenue',
      },
    ],
  },
  {
    id: 'scenario-hub',
    title: 'Scenario Hub',
    icon: Target,
    path: '/scenario-hub',
    description: 'Mô phỏng các kịch bản What-if cho quyết định chiến lược.',
    features: [
      {
        name: 'What-If Analysis',
        description: 'Thay đổi biến số và xem tác động đến KPIs.',
      },
      {
        name: 'Scenario Comparison',
        description: 'So sánh nhiều kịch bản cạnh nhau.',
      },
      {
        name: 'Sensitivity Analysis',
        description: 'Phân tích độ nhạy của output với từng input.',
      },
    ],
  },
  {
    id: 'decision-center',
    title: 'Decision Center',
    icon: Zap,
    path: '/decision-center',
    description: 'Trung tâm ra quyết định dựa trên dữ liệu.',
    features: [
      {
        name: 'Decision Cards',
        description: 'Các thẻ quyết định được tự động tạo từ dữ liệu.',
        tips: [
          'Mỗi card phải có: Impact Amount, Deadline, Owner',
          'Không có hành động = không có card',
        ],
      },
      {
        name: 'Action Items',
        description: 'Danh sách hành động cần thực hiện với owner và deadline.',
      },
      {
        name: 'Decision History',
        description: 'Lịch sử các quyết định và kết quả.',
      },
    ],
    manifesto: [
      'TODAY\'s DECISION - Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng',
    ],
  },
];

interface FDPDocumentationProps {
  searchQuery: string;
}

export function FDPDocumentation({ searchQuery }: FDPDocumentationProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('dashboard');

  const filteredSections = fdpSections.filter((section) => {
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

  return (
    <div className="space-y-4">
      {/* FDP Manifesto */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-emerald-500" />
            FDP Manifesto - Nguyên tắc bất biến
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span><strong>FDP KHÔNG PHẢI PHẦN MỀM KẾ TOÁN</strong> - Phục vụ CEO/CFO điều hành, không nộp báo cáo thuế</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span><strong>SINGLE SOURCE OF TRUTH</strong> - 1 Net Revenue, 1 Contribution Margin, 1 Cash Position</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span><strong>SURFACE PROBLEMS</strong> - Không làm đẹp số, không che anomaly, chỉ ra vấn đề sớm</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span><strong>FINAL TEST</strong> - Nếu không khiến quyết định rõ ràng hơn → FDP đã thất bại</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Sections */}
      {filteredSections.map((section) => {
        const Icon = section.icon;
        const isExpanded = expandedSection === section.id;

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
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Icon className="h-5 w-5 text-emerald-500" />
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
                          <ArrowRight className="h-4 w-4 text-emerald-500" />
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
      })}
    </div>
  );
}
