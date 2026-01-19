import { Helmet } from 'react-helmet-async';
import { 
  BarChart3, 
  Target, 
  Zap, 
  Shield, 
  TrendingUp,
  Check,
  ArrowRight,
  Wallet,
  Clock,
  DollarSign,
  Users,
  Building2,
  ArrowLeft,
  Printer,
  AlertTriangle,
  PieChart,
  LineChart,
  Calculator,
  X,
  Phone,
  Mail,
  Globe,
  Calendar,
  CheckCircle2,
  Award,
  FileText,
  Scale,
  Eye,
  Lightbulb,
  Ban,
  Gauge,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Import screenshots
import fdpDashboard from '@/assets/sales-kit/fdp-dashboard.jpg';
import fdpAlerts from '@/assets/sales-kit/fdp-alerts.jpg';
import fdpReports from '@/assets/sales-kit/fdp-reports.jpg';
import fdpDecisions from '@/assets/sales-kit/fdp-decisions.jpg';

// FDP Manifesto Points
const manifestoPoints = [
  { 
    num: 1, 
    title: 'KHÔNG PHẢI PHẦN MỀM KẾ TOÁN', 
    description: 'Phục vụ CEO/CFO điều hành doanh nghiệp, không phải nộp báo cáo thuế',
    icon: Ban
  },
  { 
    num: 2, 
    title: 'SINGLE SOURCE OF TRUTH', 
    description: '1 Net Revenue, 1 Contribution Margin, 1 Cash Position. Không có phiên bản khác.',
    icon: Target
  },
  { 
    num: 3, 
    title: 'TRUTH > FLEXIBILITY', 
    description: 'Không cho tự định nghĩa metric tùy tiện, không "chọn số đẹp"',
    icon: Scale
  },
  { 
    num: 4, 
    title: 'REAL CASH', 
    description: 'Phân biệt rõ: Cash đã về / sẽ về / có nguy cơ không về / đang bị khóa',
    icon: Wallet
  },
  { 
    num: 5, 
    title: 'REVENUE ↔ COST', 
    description: 'Mọi doanh thu đều đi kèm chi phí. Không có doanh thu "đứng một mình"',
    icon: Layers
  },
  { 
    num: 6, 
    title: 'UNIT ECONOMICS → ACTION', 
    description: 'SKU lỗ + khóa cash + tăng risk → phải nói STOP',
    icon: AlertTriangle
  },
  { 
    num: 7, 
    title: "TODAY'S DECISION", 
    description: 'Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng',
    icon: Clock
  },
  { 
    num: 8, 
    title: 'SURFACE PROBLEMS', 
    description: 'Không làm đẹp số, không che anomaly, chỉ ra vấn đề sớm',
    icon: Eye
  },
];

// Core features
const coreFeatures = [
  {
    icon: Target,
    title: 'Single Source of Truth Dashboard',
    description: 'Một màn hình duy nhất cho tất cả KPIs quan trọng',
    details: [
      'Net Revenue, Gross Margin, Contribution Margin',
      'Cash Position realtime',
      'Cash Runway calculation',
      'Key alerts & anomalies'
    ]
  },
  {
    icon: Wallet,
    title: 'Real Cash Tracking',
    description: 'Phân loại cash theo trạng thái thực tế',
    details: [
      'Cash đã về tài khoản',
      'Cash sẽ về (AR pending)',
      'Cash có nguy cơ không về (bad debt)',
      'Cash đang bị khóa (inventory, ads)'
    ]
  },
  {
    icon: PieChart,
    title: 'Unit Economics Engine',
    description: 'P&L đến từng SKU, từng order',
    details: [
      'Revenue per SKU/Order',
      'COGS + Variable costs allocation',
      'Contribution margin per unit',
      'Identify loss-making SKUs'
    ]
  },
  {
    icon: LineChart,
    title: 'Cash Forecast & Runway',
    description: 'Dự báo dòng tiền và cảnh báo sớm',
    details: [
      '30/60/90 days cash forecast',
      'Cash runway calculation',
      'Burn rate analysis',
      'Early warning when runway < 3 months'
    ]
  },
  {
    icon: AlertTriangle,
    title: 'Control Tower Integration',
    description: 'Kết nối với hệ thống cảnh báo thông minh',
    details: [
      'Auto-detect anomalies',
      'Financial alerts (margin drop, cash crisis)',
      'Action recommendations',
      'Alert ownership & escalation'
    ]
  },
  {
    icon: Calculator,
    title: 'Decision Support Tools',
    description: 'Công cụ hỗ trợ quyết định đầu tư',
    details: [
      'ROI Analysis',
      'NPV/IRR calculations',
      'What-If Scenarios',
      'Sensitivity analysis'
    ]
  }
];

// Screenshots
const screenshots = [
  {
    title: 'CFO Dashboard',
    description: 'Tổng quan tài chính với Net Revenue, Cash Position, Contribution Margin, Cash Runway',
    image: fdpDashboard
  },
  {
    title: 'Control Tower - Alerts',
    description: 'Hệ thống cảnh báo thông minh với severity levels và action tracking',
    image: fdpAlerts
  },
  {
    title: 'Financial Reports',
    description: 'Báo cáo P&L, Financial Statement với charts và tables chi tiết',
    image: fdpReports
  },
  {
    title: 'Decision Support Center',
    description: 'AI-powered recommendations với Approve/Reject workflow',
    image: fdpDecisions
  }
];

// Use cases
const useCases = [
  {
    industry: 'E-commerce Multi-channel',
    companySize: '30-100 nhân viên',
    revenue: '30-100 tỷ/năm',
    problem: 'ROAS trên platform ads là 3x nhưng cuối tháng vẫn lỗ. CFO không biết vấn đề ở đâu vì không có P&L chi tiết đến từng SKU. Marketing tiếp tục đốt budget vào những SKU margin âm.',
    solution: 'FDP tính True Profit ROAS = (Revenue - COGS - Platform Fees - Shipping - Ads) / Ad Spend. Unit Economics engine phát hiện 40% SKUs có contribution margin < 0%. Auto-alert gửi cho CMO và CFO.',
    implementation: '2 tuần',
    results: [
      { metric: 'SKUs lỗ được cắt', before: '0%', after: '40%', improvement: 'Loại bỏ' },
      { metric: 'Net Profit', before: '2% margin', after: '8% margin', improvement: '+300%' },
      { metric: 'Marketing ROI', before: '1.2x', after: '2.8x', improvement: '+133%' },
    ],
    testimonial: '"Trước khi dùng FDP, chúng tôi cứ nghĩ đang profitable vì ROAS = 3x. FDP cho thấy sau khi trừ hết chi phí, 40% SKU đang lỗ. Sau 2 tháng optimize, profit margin tăng từ 2% lên 8%."',
    author: 'Trần Văn D, CFO - E-commerce Brand A',
    roi: '25x ROI trong 3 tháng'
  },
  {
    industry: 'Retail Chain (10+ cửa hàng)',
    companySize: '100-300 nhân viên',
    revenue: '100-300 tỷ/năm',
    problem: 'Báo cáo P&L cuối tháng, khi biết cửa hàng lỗ thì đã lỗ 1 tháng rồi. Cash flow không rõ ràng - không biết tiền đang ở đâu. Inventory tie-up cash nhưng không quantify được.',
    solution: 'FDP cung cấp daily P&L per store, contribution margin theo ngày. Real Cash Breakdown cho thấy 2.5 tỷ đang locked trong inventory (DIO = 45 ngày). Cash Runway alert khi < 3 tháng.',
    implementation: '3 tuần',
    results: [
      { metric: 'Phát hiện store lỗ', before: '30 ngày sau', after: '48 giờ', improvement: '-93%' },
      { metric: 'Cash visibility', before: '0%', after: '100%', improvement: 'Full' },
      { metric: 'Tiết kiệm từ store lỗ', before: '0 đ', after: '2 tỷ/năm', improvement: 'Saved' },
    ],
    testimonial: '"FDP cho tôi biết chính xác tiền đang ở đâu: 4.3 tỷ available, 2.5 tỷ locked trong inventory, 800 triệu pending từ B2B customers. Lần đầu tiên tôi có full visibility về cash."',
    author: 'Nguyễn Thị E, CFO - Retail Chain B',
    roi: '15x ROI trong 6 tháng'
  },
  {
    industry: 'D2C Brand với Marketing Heavy',
    companySize: '20-50 nhân viên',
    revenue: '20-50 tỷ/năm',
    problem: 'Cash runway chỉ còn 2 tháng nhưng CEO/CFO không biết vì tiền nằm rải rác nhiều nơi: bank accounts, ad platforms, inventory. Gần bankrupt mà không có warning.',
    solution: 'FDP tổng hợp cash from all sources: bank accounts (3 ngân hàng), AR pending, locked in ads credit (Facebook, Google), inventory at cost. Cash Runway = 1.8 tháng → RED ALERT.',
    implementation: '2 tuần',
    results: [
      { metric: 'Cash Runway visibility', before: 'Không biết', after: 'Real-time', improvement: 'New' },
      { metric: 'Crisis warning lead time', before: '0 ngày', after: '45 ngày', improvement: '+45 days' },
      { metric: 'Cash saved', before: 'Near bankruptcy', after: 'Stabilized', improvement: 'Survived' },
    ],
    testimonial: '"FDP cứu công ty chúng tôi. Nếu không có Cash Runway alert, chúng tôi sẽ phát hiện crisis khi đã quá muộn. 45 ngày warning cho phép chúng tôi thương lượng với suppliers và cut spending kịp thời."',
    author: 'Lê Văn F, CEO - D2C Brand C',
    roi: 'Tránh được bankruptcy - Vô giá'
  }
];

// Competitor comparison
const competitorComparison = [
  { 
    feature: 'Mục đích sử dụng', 
    fdp: 'Điều hành doanh nghiệp (CEO/CFO)', 
    accounting: 'Nộp báo cáo thuế', 
    bi: 'Business Intelligence / Reporting',
    erp: 'Operations Management',
    winner: 'fdp'
  },
  { 
    feature: 'Tần suất cập nhật', 
    fdp: 'Real-time / Daily', 
    accounting: 'Cuối tháng / Cuối quý', 
    bi: 'Depends on data source',
    erp: 'Real-time (operations only)',
    winner: 'fdp'
  },
  { 
    feature: 'Unit Economics (SKU-level P&L)', 
    fdp: '✓ Có sẵn', 
    accounting: '✗ Không có', 
    bi: '△ Cần build riêng',
    erp: '✗ Không có',
    winner: 'fdp'
  },
  { 
    feature: 'Cash Runway & Forecast', 
    fdp: '✓ 30/60/90 days', 
    accounting: '✗ Không có', 
    bi: '△ Cần build riêng',
    erp: '✗ Không có',
    winner: 'fdp'
  },
  { 
    feature: 'Real Cash Breakdown', 
    fdp: '✓ Available/Pending/Locked', 
    accounting: '✗ Chỉ có total', 
    bi: '△ Cần build riêng',
    erp: '△ Partial',
    winner: 'fdp'
  },
  { 
    feature: 'Decision Support (ROI/NPV)', 
    fdp: '✓ Có sẵn + AI', 
    accounting: '✗ Không có', 
    bi: '△ Cần build riêng',
    erp: '✗ Không có',
    winner: 'fdp'
  },
  { 
    feature: 'Alert & Control Tower', 
    fdp: '✓ Integrated', 
    accounting: '✗ Không có', 
    bi: '△ Cần setup riêng',
    erp: '△ Basic alerts',
    winner: 'fdp'
  },
  { 
    feature: 'Time to value', 
    fdp: '2-3 tuần', 
    accounting: 'N/A (different purpose)', 
    bi: '2-6 tháng',
    erp: '6-12 tháng',
    winner: 'fdp'
  },
];

// Pricing plans
const pricingPlans = [
  {
    name: 'Starter',
    price: '7.990.000',
    period: '/tháng',
    description: 'Dành cho SME muốn quản lý tài chính chuyên nghiệp',
    bestFor: 'Doanh nghiệp 20-50 nhân viên',
    features: [
      { text: 'CFO Dashboard', included: true },
      { text: 'Cash Flow Tracking', included: true },
      { text: 'P&L by Channel', included: true },
      { text: 'AR/AP Management', included: true },
      { text: '30-day Cash Forecast', included: true },
      { text: 'Email support (SLA 24h)', included: true },
      { text: 'Unit Economics (SKU-level)', included: false },
      { text: 'Control Tower Integration', included: false },
      { text: 'Decision Support (ROI/NPV)', included: false },
    ],
    highlighted: false
  },
  {
    name: 'Growth',
    price: '19.990.000',
    period: '/tháng',
    description: 'Dành cho doanh nghiệp scale nhanh cần visibility cao',
    bestFor: 'Doanh nghiệp 50-200 nhân viên',
    features: [
      { text: 'Mọi tính năng Starter', included: true },
      { text: 'Unit Economics (SKU-level)', included: true },
      { text: 'Control Tower Integration', included: true },
      { text: '90-day Cash Forecast', included: true },
      { text: 'What-If Scenarios', included: true },
      { text: 'Decision Support (ROI/NPV)', included: true },
      { text: 'Slack + Phone support (SLA 4h)', included: true },
      { text: 'Custom alerts', included: true },
      { text: 'Board-ready reports', included: false },
    ],
    highlighted: true
  },
  {
    name: 'Enterprise',
    price: 'Liên hệ',
    period: '',
    description: 'Dành cho tập đoàn với multi-entity',
    bestFor: 'Doanh nghiệp 200+ nhân viên',
    features: [
      { text: 'Mọi tính năng Growth', included: true },
      { text: 'Multi-entity consolidation', included: true },
      { text: 'Board-ready reports', included: true },
      { text: 'Custom KPIs', included: true },
      { text: 'Bank integration (read-only)', included: true },
      { text: 'Dedicated success manager', included: true },
      { text: 'On-premise deployment', included: true },
      { text: 'Custom SLA (99.9%)', included: true },
      { text: 'SSO integration', included: true },
    ],
    highlighted: false
  }
];

// Implementation timeline
const implementationSteps = [
  { week: 1, phase: 'Discovery & Data Audit', tasks: ['Kick-off meeting với CEO/CFO', 'Data source audit', 'Chart of Accounts review', 'KPI definition workshop'] },
  { week: 2, phase: 'Configuration & Integration', tasks: ['Connect data sources', 'Configure P&L structure', 'Set up Unit Economics rules', 'Cash categorization'] },
  { week: 3, phase: 'Validation & Training', tasks: ['Data validation với team Finance', 'Dashboard customization', 'User training (CEO/CFO/Finance)', 'Alert rules configuration'] },
  { week: 4, phase: 'Go-Live & Optimization', tasks: ['Production deployment', 'Daily check-ins (Week 1)', 'Fine-tune thresholds', 'Handover documentation'] },
];

export default function FDPSalesKit() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Helmet>
        <title>FDP - Financial Data Platform - Sales Kit | Bluecore</title>
      </Helmet>

      {/* Print-friendly styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-avoid-break { page-break-inside: avoid; }
        }
      `}</style>

      <div className="min-h-screen bg-background">
        {/* Navigation - No Print */}
        <div className="no-print sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/portal">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại Portal
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/sales-kit/data-warehouse">
                <Button variant="outline" size="sm">
                  Xem Data Warehouse Sales Kit
                </Button>
              </Link>
              <Button onClick={handlePrint} size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                <Printer className="w-4 h-4 mr-2" />
                In / Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Cover Page */}
        <section className="relative min-h-[70vh] bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10 py-16 px-6 flex items-center">
          <div className="max-w-6xl mx-auto w-full">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                    <BarChart3 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <div>
                    <Badge variant="secondary" className="mb-2 bg-emerald-500/10 text-emerald-700">
                      FINANCIAL DATA PLATFORM
                    </Badge>
                    <h1 className="text-4xl lg:text-5xl font-bold text-foreground">
                      Bluecore FDP
                    </h1>
                  </div>
                </div>
                <p className="text-xl text-muted-foreground mb-4">
                  Nền tảng tài chính cho <strong className="text-foreground">CEO & CFO điều hành</strong> - 
                  Single Source of Truth cho mọi quyết định kinh doanh.
                </p>
                <p className="text-lg text-emerald-600 font-medium mb-8">
                  ⚠️ Đây KHÔNG PHẢI phần mềm kế toán.
                </p>
                <div className="flex flex-wrap gap-6 text-sm mb-8">
                  <div className="flex items-center gap-2 bg-card/50 px-4 py-2 rounded-full border border-emerald-500/30">
                    <Users className="w-5 h-5 text-emerald-600" />
                    <span><strong>200+</strong> CFOs</span>
                  </div>
                  <div className="flex items-center gap-2 bg-card/50 px-4 py-2 rounded-full border border-emerald-500/30">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    <span><strong>15K tỷ</strong> GMV tracked</span>
                  </div>
                  <div className="flex items-center gap-2 bg-card/50 px-4 py-2 rounded-full border border-emerald-500/30">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <span><strong>2.5x</strong> faster decisions</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 no-print">
                  <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600">
                    Đăng ký Demo miễn phí
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button size="lg" variant="outline">
                    <Phone className="w-4 h-4 mr-2" />
                    Hotline: 1900 xxxx
                  </Button>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-3xl blur-3xl" />
                  <Card className="relative bg-card/80 backdrop-blur border-emerald-500/20">
                    <CardContent className="p-8">
                      <div className="text-center mb-6">
                        <div className="text-5xl font-bold text-emerald-600 mb-2">20x</div>
                        <div className="text-muted-foreground">Average ROI</div>
                      </div>
                      <Separator className="my-6" />
                      <div className="grid grid-cols-2 gap-6 text-center">
                        <div>
                          <div className="text-2xl font-bold text-foreground">3 tuần</div>
                          <div className="text-sm text-muted-foreground">Thời gian triển khai</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-foreground">Real-time</div>
                          <div className="text-sm text-muted-foreground">Cash visibility</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-foreground">SKU-level</div>
                          <div className="text-sm text-muted-foreground">Unit Economics</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-foreground">90 ngày</div>
                          <div className="text-sm text-muted-foreground">Cash Forecast</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Table of Contents */}
        <section className="py-12 px-6 bg-muted/30 print-break">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-bold text-foreground mb-6">Mục lục</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { num: '01', title: 'FDP Manifesto', page: '3' },
                { num: '02', title: 'Tính năng chi tiết', page: '4-6' },
                { num: '03', title: 'Screenshots sản phẩm', page: '7-8' },
                { num: '04', title: 'Case Studies & ROI', page: '9-12' },
                { num: '05', title: 'So sánh với alternatives', page: '13-14' },
                { num: '06', title: 'Bảng giá', page: '15-16' },
                { num: '07', title: 'Lộ trình triển khai', page: '17' },
                { num: '08', title: 'Liên hệ', page: '18' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                  <span className="text-2xl font-bold text-emerald-500/50">{item.num}</span>
                  <div>
                    <div className="font-medium text-foreground">{item.title}</div>
                    <div className="text-xs text-muted-foreground">Trang {item.page}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Manifesto Section */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-bold text-emerald-500/30">01</span>
              <h2 className="text-2xl font-bold text-foreground">FDP Manifesto - Nguyên tắc bất biến</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">8 nguyên tắc định hình cách FDP hoạt động</p>
            
            <div className="grid md:grid-cols-2 gap-4">
              {manifestoPoints.map((point, index) => (
                <Card key={index} className="print-avoid-break border-emerald-500/20">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <point.icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-emerald-500">#{point.num}</span>
                          <h3 className="font-semibold text-foreground text-sm">{point.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{point.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card className="mt-8 bg-emerald-500/5 border-emerald-500/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Lightbulb className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Tại sao Manifesto quan trọng?</h3>
                    <p className="text-sm text-muted-foreground">
                      FDP được thiết kế với triết lý rõ ràng: <strong>Truth over Flexibility</strong>. 
                      Chúng tôi không cho phép users tự định nghĩa metrics hoặc "chọn số đẹp" để báo cáo. 
                      Mục tiêu duy nhất là giúp CEO/CFO ra quyết định đúng dựa trên sự thật tài chính.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="max-w-6xl mx-auto" />

        {/* Core Features Section */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-bold text-emerald-500/30">02</span>
              <h2 className="text-2xl font-bold text-foreground">Tính năng chi tiết</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">Công cụ tài chính cho quyết định thực tế, không phải báo cáo đẹp</p>
            
            <div className="space-y-6">
              {coreFeatures.map((feature, index) => (
                <Card key={index} className="print-avoid-break">
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="md:col-span-1">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <feature.icon className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground text-lg">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="grid grid-cols-2 gap-3">
                          {feature.details.map((detail, dIndex) => (
                            <div key={dIndex} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                              <span className="text-sm text-muted-foreground">{detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <Separator className="max-w-6xl mx-auto" />

        {/* Screenshots Section */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-bold text-emerald-500/30">03</span>
              <h2 className="text-2xl font-bold text-foreground">Screenshots sản phẩm</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">Giao diện thực tế của FDP</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              {screenshots.map((screenshot, index) => (
                <Card key={index} className="overflow-hidden print-avoid-break">
                  <div className="h-52 overflow-hidden">
                    <img 
                      src={screenshot.image} 
                      alt={screenshot.title}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground text-sm">{screenshot.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{screenshot.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <Separator className="max-w-6xl mx-auto" />

        {/* Use Cases Section */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-bold text-emerald-500/30">04</span>
              <h2 className="text-2xl font-bold text-foreground">Case Studies & ROI</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">Kết quả thực tế từ CEO/CFO đang sử dụng FDP</p>
            
            <div className="space-y-8">
              {useCases.map((useCase, index) => (
                <Card key={index} className="overflow-hidden print-avoid-break">
                  <CardHeader className="bg-emerald-500/5 border-b border-border">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{useCase.industry}</CardTitle>
                          <p className="text-sm text-muted-foreground">{useCase.companySize} • {useCase.revenue}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-600">
                          <Clock className="w-3 h-3 mr-1" />
                          {useCase.implementation} triển khai
                        </Badge>
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {useCase.roi}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium text-red-500 uppercase">Vấn đề</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{useCase.problem}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-blue-500 uppercase">Giải pháp FDP</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{useCase.solution}</p>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-emerald-500 uppercase">Kết quả đạt được</span>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        {useCase.results.map((result, rIndex) => (
                          <div key={rIndex} className="bg-muted/50 rounded-lg p-4">
                            <div className="text-xs text-muted-foreground mb-2">{result.metric}</div>
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm text-muted-foreground line-through">{result.before}</span>
                                <ArrowRight className="w-3 h-3 inline mx-2 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">{result.after}</span>
                              </div>
                              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                                {result.improvement}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-emerald-500/5 rounded-lg p-4 border-l-4 border-emerald-500">
                      <p className="text-sm italic text-muted-foreground mb-2">{useCase.testimonial}</p>
                      <p className="text-sm font-medium text-foreground">— {useCase.author}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <Separator className="max-w-6xl mx-auto" />

        {/* Competitor Comparison Section */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-bold text-emerald-500/30">05</span>
              <h2 className="text-2xl font-bold text-foreground">So sánh với alternatives</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">FDP vs Kế toán vs BI vs ERP - Khác nhau ở đâu?</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-emerald-500">
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Tiêu chí</th>
                    <th className="text-center py-4 px-4 font-bold text-emerald-600 bg-emerald-500/5">FDP</th>
                    <th className="text-center py-4 px-4 font-medium text-muted-foreground">Phần mềm kế toán</th>
                    <th className="text-center py-4 px-4 font-medium text-muted-foreground">BI Tools</th>
                    <th className="text-center py-4 px-4 font-medium text-muted-foreground">ERP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {competitorComparison.map((row, index) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="py-4 px-4 font-medium">{row.feature}</td>
                      <td className={`py-4 px-4 text-center bg-emerald-500/5 ${row.winner === 'fdp' ? 'font-bold text-emerald-600' : ''}`}>
                        {row.fdp}
                        {row.winner === 'fdp' && <Award className="w-4 h-4 inline ml-1 text-yellow-500" />}
                      </td>
                      <td className="py-4 px-4 text-center text-muted-foreground">{row.accounting}</td>
                      <td className="py-4 px-4 text-center text-muted-foreground">{row.bi}</td>
                      <td className="py-4 px-4 text-center text-muted-foreground">{row.erp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <Card className="mt-8 bg-emerald-500/5 border-emerald-500/30">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Kết luận: FDP bổ sung, không thay thế</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span className="text-muted-foreground">Vẫn cần kế toán để nộp thuế và compliance</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span className="text-muted-foreground">FDP lấy data từ accounting software + operations</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span className="text-muted-foreground">FDP chuyên về decision-making, không phải record-keeping</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="max-w-6xl mx-auto" />

        {/* Pricing Section */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-bold text-emerald-500/30">06</span>
              <h2 className="text-2xl font-bold text-foreground">Bảng giá</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">Đầu tư cho visibility tài chính = đầu tư cho survival</p>
            
            <div className="grid md:grid-cols-3 gap-6">
              {pricingPlans.map((plan, index) => (
                <Card 
                  key={index} 
                  className={`relative print-avoid-break ${plan.highlighted ? 'border-emerald-500 shadow-lg ring-2 ring-emerald-500/20' : 'border-border/50'}`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-500 text-white">Phổ biến nhất</Badge>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-1">{plan.description}</p>
                    <Badge variant="outline" className="mb-4 text-xs">{plan.bestFor}</Badge>
                    <div className="mb-6">
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <ul className="space-y-3">
                      {plan.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start gap-2 text-sm">
                          {feature.included ? (
                            <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                          )}
                          <span className={feature.included ? 'text-muted-foreground' : 'text-muted-foreground/50'}>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full mt-6 no-print ${plan.highlighted ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                      variant={plan.highlighted ? 'default' : 'outline'}
                    >
                      {plan.price === 'Liên hệ' ? 'Liên hệ tư vấn' : 'Bắt đầu dùng thử'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="mt-8 p-6 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-foreground mb-4">ROI Calculator</h4>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-foreground">20 giờ</div>
                  <div className="text-xs text-muted-foreground">Tiết kiệm/tháng cho reporting</div>
                </div>
                <div className="text-center p-4 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-foreground">45 ngày</div>
                  <div className="text-xs text-muted-foreground">Early warning lead time</div>
                </div>
                <div className="text-center p-4 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-foreground">3-5%</div>
                  <div className="text-xs text-muted-foreground">Profit margin improvement</div>
                </div>
                <div className="text-center p-4 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">15-25x</div>
                  <div className="text-xs text-muted-foreground">Average ROI</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator className="max-w-6xl mx-auto" />

        {/* Implementation Timeline Section */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-bold text-emerald-500/30">07</span>
              <h2 className="text-2xl font-bold text-foreground">Lộ trình triển khai</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">Từ kick-off đến go-live trong 3-4 tuần</p>
            
            <div className="relative">
              <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-emerald-500/30" />
              <div className="space-y-8">
                {implementationSteps.map((step, index) => (
                  <div key={index} className="relative flex gap-6">
                    <div className="relative z-10 w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shrink-0">
                      W{step.week}
                    </div>
                    <Card className="flex-1">
                      <CardContent className="p-6">
                        <h3 className="font-semibold text-foreground text-lg mb-4">{step.phase}</h3>
                        <div className="grid md:grid-cols-2 gap-3">
                          {step.tasks.map((task, tIndex) => (
                            <div key={tIndex} className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span className="text-sm text-muted-foreground">{task}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Separator className="max-w-6xl mx-auto" />

        {/* Contact Section */}
        <section className="py-16 px-6 bg-emerald-500/5 print-break">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-bold text-emerald-500/30">08</span>
              <h2 className="text-2xl font-bold text-foreground">Liên hệ</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">Sẵn sàng có Single Source of Truth cho tài chính?</p>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-foreground mb-6">Đăng ký Demo miễn phí</h3>
                  <p className="text-muted-foreground mb-6">
                    Đăng ký demo 45 phút để xem FDP hoạt động với dữ liệu thực của bạn. 
                    Chúng tôi sẽ show bạn Unit Economics và Cash Runway ngay lập tức.
                  </p>
                  <div className="space-y-4 no-print">
                    <Button className="w-full bg-emerald-500 hover:bg-emerald-600" size="lg">
                      <Calendar className="w-4 h-4 mr-2" />
                      Đặt lịch Demo
                    </Button>
                    <Button className="w-full" variant="outline" size="lg">
                      <Mail className="w-4 h-4 mr-2" />
                      Gửi yêu cầu qua Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-foreground mb-6">Thông tin liên hệ</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Hotline</div>
                        <div className="font-medium text-foreground">1900 xxxx (8h-18h T2-T6)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Email</div>
                        <div className="font-medium text-foreground">sales@bluecore.vn</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Website</div>
                        <div className="font-medium text-foreground">www.bluecore.vn</div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Sales Representative</p>
                    <p className="font-medium text-foreground">Nguyễn Văn Sales</p>
                    <p className="text-sm text-muted-foreground">sales@bluecore.vn | 0909 xxx xxx</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-border">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <span>© 2026 Bluecore Technologies. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Version 2.5 | January 2026</span>
              <Badge variant="outline">Confidential</Badge>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
