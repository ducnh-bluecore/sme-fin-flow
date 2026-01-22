import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Printer,
  Target,
  Wallet,
  AlertTriangle,
  Clock,
  TrendingUp,
  Shield,
  DollarSign,
  CheckCircle2,
  XCircle,
  BarChart3,
  PieChart,
  Layers,
  Eye,
  Ban,
  Scale,
  Zap,
  Users,
  Building2,
  ArrowRight,
  Quote,
  Lightbulb,
  Brain,
  Gauge,
  Calculator,
  FileText,
  Star,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// Import images
import fdpDashboard from '@/assets/sales-kit/fdp-dashboard.png';
import fdpDecisionCard from '@/assets/sales-kit/fdp-decision-card.png';
import fdpMeasurement from '@/assets/sales-kit/fdp-measurement.png';
import fdpPnlReport from '@/assets/sales-kit/fdp-pnl-report.png';
import fdpScenario from '@/assets/sales-kit/fdp-scenario.png';

/**
 * BLUECORE FDP - EXECUTIVE READING DOCUMENT
 * Rich content format for CEO reading (not presentation slides)
 */
export default function FDPExecutiveDeck() {
  const navigate = useNavigate();
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Helmet>
        <title>Bluecore FDP - Executive Brief | Financial Decision Platform</title>
        <meta name="description" content="Bluecore FDP - Nền tảng tài chính cho CEO/CFO điều hành. Single Source of Truth cho mọi quyết định kinh doanh." />
      </Helmet>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-950">
        {/* Navigation */}
        <nav className="no-print sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-slate-800">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('/portal')} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại Portal
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate('/sales-kit/mdp-executive')} className="border-slate-700 text-slate-300">
                Xem MDP Executive Brief
              </Button>
              <Button onClick={handlePrint} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Printer className="w-4 h-4 mr-2" />
                In / Export PDF
              </Button>
            </div>
          </div>
        </nav>

        {/* HERO SECTION */}
        <section className="relative py-20 px-6 bg-gradient-to-b from-emerald-950/30 via-slate-950 to-slate-950">
          <div className="max-w-5xl mx-auto">
            {/* Badge */}
            <div className="flex items-center gap-2 mb-8">
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium uppercase tracking-wider rounded-full border border-emerald-500/20">
                Financial Data Platform
              </span>
              <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-full border border-amber-500/20">
                ⚠️ Không phải phần mềm kế toán
              </span>
            </div>

            {/* Title */}
            <div className="flex items-start gap-6 mb-8">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-10 h-10 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-5xl font-bold text-white mb-4">
                  Bluecore FDP
                </h1>
                <p className="text-2xl text-slate-300 leading-relaxed max-w-3xl">
                  Nền tảng tài chính cho <strong className="text-emerald-400">CEO & CFO điều hành</strong> — 
                  Single Source of Truth cho mọi quyết định kinh doanh.
                </p>
              </div>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-4 gap-6 mt-12">
              {[
                { icon: Users, label: 'CFOs sử dụng', value: '200+' },
                { icon: DollarSign, label: 'Cash tracked', value: '₫500 tỷ+' },
                { icon: TrendingUp, label: 'Avg ROI', value: '18x' },
                { icon: Clock, label: 'Triển khai', value: '2-3 tuần' }
              ].map((stat, i) => (
                <div key={i} className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <stat.icon className="w-5 h-5 text-emerald-400 mb-3" />
                  <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* EXECUTIVE SUMMARY */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <FileText className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-white">Executive Summary</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Vấn đề CEO đang gặp
                </h3>
                <ul className="space-y-3 text-slate-300">
                  <li className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                    <span>Báo cáo tài chính cuối tháng - phát hiện vấn đề khi đã quá muộn</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                    <span>Không biết chính xác tiền đang ở đâu: bank, AR, inventory, ads?</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                    <span>SKU nào lãi, SKU nào lỗ - không có P&L chi tiết</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                    <span>Cash runway là bao lâu? Không ai trả lời chính xác được</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-xl bg-emerald-950/30 border border-emerald-900/30">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Bluecore FDP giải quyết
                </h3>
                <ul className="space-y-3 text-slate-300">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                    <span><strong className="text-white">Real-time visibility</strong> - Biết tình hình tài chính ngay hôm nay</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                    <span><strong className="text-white">Real Cash Breakdown</strong> - Tiền available, pending, locked, at risk</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                    <span><strong className="text-white">Unit Economics</strong> - P&L đến từng SKU, từng order</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                    <span><strong className="text-white">Cash Runway Alert</strong> - Cảnh báo sớm khi runway &lt; 3 tháng</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <Separator className="max-w-5xl mx-auto bg-slate-800" />

        {/* FDP MANIFESTO */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-white">FDP Manifesto</h2>
            </div>
            <p className="text-slate-400 mb-10 max-w-2xl">
              10 nguyên tắc bất biến của Financial Data Platform - đây là những cam kết mà Bluecore không bao giờ thỏa hiệp.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, icon: Ban, title: 'KHÔNG PHẢI PHẦN MỀM KẾ TOÁN', desc: 'Phục vụ CEO/CFO điều hành doanh nghiệp, không phải nộp báo cáo thuế' },
                { num: 2, icon: Target, title: 'SINGLE SOURCE OF TRUTH', desc: '1 Net Revenue, 1 Contribution Margin, 1 Cash Position. Không có phiên bản khác.' },
                { num: 3, icon: Scale, title: 'TRUTH > FLEXIBILITY', desc: 'Không cho tự định nghĩa metric tùy tiện, không "chọn số đẹp"' },
                { num: 4, icon: Wallet, title: 'REAL CASH', desc: 'Phân biệt rõ: Cash đã về / sẽ về / có nguy cơ không về / đang bị khóa' },
                { num: 5, icon: Layers, title: 'REVENUE ↔ COST', desc: 'Mọi doanh thu đều đi kèm chi phí. Không có doanh thu "đứng một mình"' },
                { num: 6, icon: AlertTriangle, title: 'UNIT ECONOMICS → ACTION', desc: 'SKU lỗ + khóa cash + tăng risk → phải nói STOP' },
                { num: 7, icon: Clock, title: "TODAY'S DECISION", desc: 'Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng' },
                { num: 8, icon: Eye, title: 'SURFACE PROBLEMS', desc: 'Không làm đẹp số, không che anomaly, chỉ ra vấn đề sớm' },
                { num: 9, icon: Zap, title: 'FEED CONTROL TOWER', desc: 'FDP là nguồn sự thật, Control Tower hành động dựa trên đó' },
                { num: 10, icon: Gauge, title: 'FINAL TEST', desc: 'Nếu không khiến quyết định rõ ràng hơn → FDP đã thất bại' },
              ].map((item) => (
                <div key={item.num} className="flex gap-4 p-4 rounded-lg bg-slate-900/30 border border-slate-800 hover:border-emerald-800/50 transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">
                      <span className="text-emerald-400 mr-2">#{item.num}</span>
                      {item.title}
                    </p>
                    <p className="text-sm text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator className="max-w-5xl mx-auto bg-slate-800" />

        {/* CORE CAPABILITIES */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Layers className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-white">Core Capabilities</h2>
            </div>
            <p className="text-slate-400 mb-10">
              Những năng lực cốt lõi giúp CEO/CFO điều hành doanh nghiệp hiệu quả hơn.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Target,
                  title: 'Single Source of Truth Dashboard',
                  desc: 'Một màn hình duy nhất cho tất cả KPIs quan trọng',
                  details: ['Net Revenue, Gross Margin, Contribution Margin', 'Cash Position realtime', 'Cash Runway calculation', 'Key alerts & anomalies'],
                  color: 'emerald'
                },
                {
                  icon: Wallet,
                  title: 'Real Cash Tracking',
                  desc: 'Phân loại cash theo trạng thái thực tế',
                  details: ['Cash đã về tài khoản', 'Cash sẽ về (AR pending)', 'Cash có nguy cơ không về', 'Cash đang bị khóa'],
                  color: 'blue'
                },
                {
                  icon: PieChart,
                  title: 'Unit Economics Engine',
                  desc: 'P&L đến từng SKU, từng order',
                  details: ['Revenue per SKU/Order', 'COGS + Variable costs', 'Contribution margin per unit', 'Identify loss-making SKUs'],
                  color: 'purple'
                },
                {
                  icon: TrendingUp,
                  title: 'Cash Forecast & Runway',
                  desc: 'Dự báo dòng tiền và cảnh báo sớm',
                  details: ['30/60/90 days forecast', 'Cash runway calculation', 'Burn rate analysis', 'Early warning alerts'],
                  color: 'amber'
                },
                {
                  icon: AlertTriangle,
                  title: 'Control Tower Integration',
                  desc: 'Kết nối với hệ thống cảnh báo thông minh',
                  details: ['Auto-detect anomalies', 'Financial alerts', 'Action recommendations', 'Alert escalation'],
                  color: 'red'
                },
                {
                  icon: Calculator,
                  title: 'Decision Support Tools',
                  desc: 'Công cụ hỗ trợ quyết định đầu tư',
                  details: ['ROI Analysis', 'NPV/IRR calculations', 'What-If Scenarios', 'Sensitivity analysis'],
                  color: 'cyan'
                }
              ].map((cap, i) => {
                const colorMap: Record<string, string> = {
                  emerald: 'border-emerald-800/50 bg-emerald-950/20',
                  blue: 'border-blue-800/50 bg-blue-950/20',
                  purple: 'border-purple-800/50 bg-purple-950/20',
                  amber: 'border-amber-800/50 bg-amber-950/20',
                  red: 'border-red-800/50 bg-red-950/20',
                  cyan: 'border-cyan-800/50 bg-cyan-950/20'
                };
                const iconColorMap: Record<string, string> = {
                  emerald: 'text-emerald-400 bg-emerald-500/10',
                  blue: 'text-blue-400 bg-blue-500/10',
                  purple: 'text-purple-400 bg-purple-500/10',
                  amber: 'text-amber-400 bg-amber-500/10',
                  red: 'text-red-400 bg-red-500/10',
                  cyan: 'text-cyan-400 bg-cyan-500/10'
                };
                return (
                  <div key={i} className={`p-6 rounded-xl border ${colorMap[cap.color]}`}>
                    <div className={`w-10 h-10 rounded-lg ${iconColorMap[cap.color]} flex items-center justify-center mb-4`}>
                      <cap.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{cap.title}</h3>
                    <p className="text-sm text-slate-400 mb-4">{cap.desc}</p>
                    <ul className="space-y-1">
                      {cap.details.map((d, j) => (
                        <li key={j} className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-slate-600" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <Separator className="max-w-5xl mx-auto bg-slate-800" />

        {/* PRODUCT SCREENSHOTS */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-white">Product Screenshots</h2>
            </div>
            <p className="text-slate-400 mb-10">
              Giao diện thực tế của Bluecore FDP - được thiết kế cho CEO/CFO sử dụng hàng ngày.
            </p>

            <div className="space-y-12">
              {[
                {
                  title: 'CFO Dashboard - Financial Truth',
                  desc: 'Tổng quan tài chính với Net Revenue, Contribution Margin, Cash Position, Cash Runway - Single Source of Truth cho mọi quyết định.',
                  image: fdpDashboard,
                  features: ['Real-time metrics', 'Cash breakdown', 'Trend indicators', 'Alert notifications']
                },
                {
                  title: 'Decision Card - AI-Powered',
                  desc: 'Chi tiết quyết định với AI Advisor khuyến nghị hành động, deadline và impact analysis. Mỗi card là một quyết định cụ thể cần CEO xử lý.',
                  image: fdpDecisionCard,
                  features: ['Clear recommendation', 'Financial impact', 'Action options', 'Deadline tracking']
                },
                {
                  title: 'Kết quả Đo lường Tự động',
                  desc: 'So sánh Before vs After - tracking outcome của mọi quyết định để học và cải thiện theo thời gian.',
                  image: fdpMeasurement,
                  features: ['Before/After comparison', 'Actual vs Expected', 'ROI calculation', 'Learning feedback']
                },
                {
                  title: 'Báo cáo P&L - AI Analysis',
                  desc: 'Profit & Loss Statement với AI phân tích tự động, breakdown chi tiết theo nguồn revenue và cost center.',
                  image: fdpPnlReport,
                  features: ['AI-generated insights', 'Channel breakdown', 'Cost allocation', 'Trend analysis']
                },
                {
                  title: 'Kịch bản & Mô phỏng What-If',
                  desc: 'Scenario Planning so sánh Thực tế vs Mục tiêu với các KPIs quan trọng - hỗ trợ quyết định đầu tư và chiến lược.',
                  image: fdpScenario,
                  features: ['Multiple scenarios', 'KPI comparison', 'Sensitivity analysis', 'Risk assessment']
                }
              ].map((item, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-slate-800">
                    <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400 mb-4">{item.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {item.features.map((f, j) => (
                        <span key={j} className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-900">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-full rounded-lg border border-slate-700 shadow-2xl"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator className="max-w-5xl mx-auto bg-slate-800" />

        {/* CASE STUDIES */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Award className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-white">Case Studies</h2>
            </div>
            <p className="text-slate-400 mb-10">
              Câu chuyện thực tế từ các doanh nghiệp đã triển khai Bluecore FDP.
            </p>

            <div className="space-y-8">
              {[
                {
                  industry: 'E-commerce Multi-channel',
                  company: 'Fashion Brand A',
                  size: '30-100 nhân viên · 30-100 tỷ/năm',
                  problem: 'ROAS trên platform ads là 3x nhưng cuối tháng vẫn lỗ. CFO không biết vấn đề ở đâu vì không có P&L chi tiết đến từng SKU. Marketing tiếp tục đốt budget vào những SKU margin âm.',
                  solution: 'FDP tính True Profit ROAS = (Revenue - COGS - Platform Fees - Shipping - Ads) / Ad Spend. Unit Economics engine phát hiện 40% SKUs có contribution margin < 0%. Auto-alert gửi cho CMO và CFO.',
                  results: [
                    { label: 'SKUs lỗ được cắt', value: '40%', desc: 'Loại bỏ hoàn toàn' },
                    { label: 'Net Profit', value: '+300%', desc: '2% → 8% margin' },
                    { label: 'Marketing ROI', value: '+133%', desc: '1.2x → 2.8x' }
                  ],
                  testimonial: '"Trước khi dùng FDP, chúng tôi cứ nghĩ đang profitable vì ROAS = 3x. FDP cho thấy sau khi trừ hết chi phí, 40% SKU đang lỗ. Sau 2 tháng optimize, profit margin tăng từ 2% lên 8%."',
                  author: 'Trần Văn D, CFO',
                  roi: '25x ROI trong 3 tháng'
                },
                {
                  industry: 'Retail Chain',
                  company: 'Retail Chain B',
                  size: '100-300 nhân viên · 100-300 tỷ/năm',
                  problem: 'Báo cáo P&L cuối tháng, khi biết cửa hàng lỗ thì đã lỗ 1 tháng rồi. Cash flow không rõ ràng - không biết tiền đang ở đâu. Inventory tie-up cash nhưng không quantify được.',
                  solution: 'FDP cung cấp daily P&L per store, contribution margin theo ngày. Real Cash Breakdown cho thấy 2.5 tỷ đang locked trong inventory (DIO = 45 ngày). Cash Runway alert khi < 3 tháng.',
                  results: [
                    { label: 'Phát hiện store lỗ', value: '-93%', desc: '30 ngày → 48 giờ' },
                    { label: 'Cash visibility', value: '100%', desc: 'Full transparency' },
                    { label: 'Tiết kiệm từ store lỗ', value: '₫2 tỷ/năm', desc: 'Saved' }
                  ],
                  testimonial: '"FDP cho tôi biết chính xác tiền đang ở đâu: 4.3 tỷ available, 2.5 tỷ locked trong inventory, 800 triệu pending từ B2B customers. Lần đầu tiên tôi có full visibility về cash."',
                  author: 'Nguyễn Thị E, CFO',
                  roi: '15x ROI trong 6 tháng'
                },
                {
                  industry: 'D2C Brand',
                  company: 'D2C Brand C',
                  size: '20-50 nhân viên · 20-50 tỷ/năm',
                  problem: 'Cash runway chỉ còn 2 tháng nhưng CEO/CFO không biết vì tiền nằm rải rác nhiều nơi: bank accounts, ad platforms, inventory. Gần bankrupt mà không có warning.',
                  solution: 'FDP tổng hợp cash from all sources: bank accounts (3 ngân hàng), AR pending, locked in ads credit (Facebook, Google), inventory at cost. Cash Runway = 1.8 tháng → RED ALERT.',
                  results: [
                    { label: 'Cash Runway visibility', value: 'Real-time', desc: 'Từ "không biết"' },
                    { label: 'Crisis warning', value: '+45 ngày', desc: 'Lead time' },
                    { label: 'Kết quả', value: 'Survived', desc: 'Tránh bankruptcy' }
                  ],
                  testimonial: '"FDP cứu công ty chúng tôi. Nếu không có Cash Runway alert, chúng tôi sẽ phát hiện crisis khi đã quá muộn. 45 ngày warning cho phép chúng tôi thương lượng với suppliers và cut spending kịp thời."',
                  author: 'Lê Văn F, CEO',
                  roi: 'Tránh được bankruptcy - Vô giá'
                }
              ].map((cs, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="p-6 border-b border-slate-800 flex items-start justify-between">
                    <div>
                      <span className="px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded mb-2 inline-block">{cs.industry}</span>
                      <h3 className="text-xl font-semibold text-white">{cs.company}</h3>
                      <p className="text-sm text-slate-400 mt-1">{cs.size}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 text-sm bg-emerald-500/20 text-emerald-400 rounded-full font-medium">
                        {cs.roi}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="mb-6">
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Vấn đề</p>
                        <p className="text-slate-300 text-sm">{cs.problem}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Giải pháp FDP</p>
                        <p className="text-slate-300 text-sm">{cs.solution}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Kết quả</p>
                      <div className="space-y-3 mb-6">
                        {cs.results.map((r, j) => (
                          <div key={j} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                            <span className="text-sm text-slate-300">{r.label}</span>
                            <div className="text-right">
                              <span className="text-lg font-bold text-emerald-400">{r.value}</span>
                              <span className="text-xs text-slate-500 ml-2">{r.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Testimonial */}
                  <div className="px-6 pb-6">
                    <div className="p-4 bg-emerald-950/30 border border-emerald-900/30 rounded-lg">
                      <Quote className="w-5 h-5 text-emerald-400 mb-2" />
                      <p className="text-slate-300 italic text-sm mb-2">{cs.testimonial}</p>
                      <p className="text-sm text-emerald-400 font-medium">— {cs.author}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator className="max-w-5xl mx-auto bg-slate-800" />

        {/* WHY BLUECORE */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-white">Tại sao chọn Bluecore FDP?</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
                <h3 className="text-lg font-semibold text-white mb-4">So sánh với Phần mềm Kế toán</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-slate-500 mt-1" />
                    <div>
                      <p className="text-slate-300 text-sm">Kế toán: Báo cáo cuối tháng/quý</p>
                      <p className="text-emerald-400 text-sm">FDP: Real-time / Daily</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-slate-500 mt-1" />
                    <div>
                      <p className="text-slate-300 text-sm">Kế toán: Số liệu cho thuế</p>
                      <p className="text-emerald-400 text-sm">FDP: Số liệu cho quyết định</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-slate-500 mt-1" />
                    <div>
                      <p className="text-slate-300 text-sm">Kế toán: Không có Unit Economics</p>
                      <p className="text-emerald-400 text-sm">FDP: P&L đến từng SKU</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
                <h3 className="text-lg font-semibold text-white mb-4">So sánh với BI Tools</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-slate-500 mt-1" />
                    <div>
                      <p className="text-slate-300 text-sm">BI: Cần 2-6 tháng setup</p>
                      <p className="text-emerald-400 text-sm">FDP: Go-live trong 2-3 tuần</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-slate-500 mt-1" />
                    <div>
                      <p className="text-slate-300 text-sm">BI: CEO cần analyze</p>
                      <p className="text-emerald-400 text-sm">FDP: Kết luận có sẵn, quyết định ngay</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-slate-500 mt-1" />
                    <div>
                      <p className="text-slate-300 text-sm">BI: Drill-down vô tận</p>
                      <p className="text-emerald-400 text-sm">FDP: Surface problems automatically</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 bg-gradient-to-t from-emerald-950/30 to-slate-950">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Sẵn sàng kiểm soát tài chính doanh nghiệp?
            </h2>
            <p className="text-lg text-slate-400 mb-8">
              Đặt lịch demo 30 phút để xem Bluecore FDP hoạt động với dữ liệu thực của bạn.
            </p>
            <div className="flex flex-wrap justify-center gap-4 no-print">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                Đăng ký Demo miễn phí
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-slate-700 text-slate-300">
                Liên hệ Sales: 1900 xxxx
              </Button>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-800">
              <p className="text-sm text-slate-500">
                © 2024 Bluecore. All rights reserved.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
