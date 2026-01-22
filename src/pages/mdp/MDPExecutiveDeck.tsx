import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Printer,
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle2,
  XCircle,
  BarChart3,
  PieChart,
  Zap,
  Users,
  ArrowRight,
  Quote,
  Lightbulb,
  AlertTriangle,
  Clock,
  Layers,
  Eye,
  Award,
  Shield,
  Activity,
  Wallet,
  Calculator,
  Star,
  FileText,
  Ban,
  Gauge,
  Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

/**
 * BLUECORE MDP - EXECUTIVE READING DOCUMENT
 * Rich content format for CEO/CMO reading (not presentation slides)
 * Focus: Marketing Financial Accountability
 */
export default function MDPExecutiveDeck() {
  const navigate = useNavigate();
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Helmet>
        <title>Bluecore MDP - Executive Brief | Marketing Decision Platform</title>
        <meta name="description" content="Bluecore MDP - Đo lường giá trị tài chính thật của Marketing. Profit before Performance. Cash before Clicks." />
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
              <Button variant="outline" size="sm" onClick={() => navigate('/sales-kit/fdp-executive')} className="border-slate-700 text-slate-300">
                Xem FDP Executive Brief
              </Button>
              <Button onClick={handlePrint} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Printer className="w-4 h-4 mr-2" />
                In / Export PDF
              </Button>
            </div>
          </div>
        </nav>

        {/* HERO SECTION */}
        <section className="relative py-20 px-6 bg-gradient-to-b from-blue-950/30 via-slate-950 to-slate-950">
          <div className="max-w-5xl mx-auto">
            {/* Badge */}
            <div className="flex items-center gap-2 mb-8">
              <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium uppercase tracking-wider rounded-full border border-blue-500/20">
                Marketing Data Platform
              </span>
              <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-full border border-amber-500/20">
                Profit before Performance
              </span>
            </div>

            {/* Title */}
            <div className="flex items-start gap-6 mb-8">
              <div className="w-20 h-20 rounded-2xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Activity className="w-10 h-10 text-blue-400" />
              </div>
              <div>
                <h1 className="text-5xl font-bold text-white mb-4">
                  Bluecore MDP
                </h1>
                <p className="text-2xl text-slate-300 leading-relaxed max-w-3xl">
                  Đo lường <strong className="text-blue-400">giá trị tài chính thật</strong> của Marketing — 
                  Profit ROAS, không phải Vanity ROAS.
                </p>
              </div>
            </div>

            {/* Tagline */}
            <div className="flex items-center gap-4 mb-12 p-4 bg-slate-900/50 rounded-lg border border-slate-800 max-w-2xl">
              <Lightbulb className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <p className="text-lg text-slate-300">
                <strong className="text-white">Cash before Clicks</strong> — Marketing không chỉ bán hàng, marketing tiêu tiền.
              </p>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-4 gap-6">
              {[
                { icon: Users, label: 'CMOs sử dụng', value: '150+' },
                { icon: DollarSign, label: 'Ad spend tracked', value: '₫200 tỷ+' },
                { icon: TrendingUp, label: 'Avg Cost Saved', value: '35%' },
                { icon: Clock, label: 'Triển khai', value: '2 tuần' }
              ].map((stat, i) => (
                <div key={i} className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <stat.icon className="w-5 h-5 text-blue-400 mb-3" />
                  <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* THE CORE PROBLEM */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold text-white">Vấn đề CEO thường gặp</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Marketing Report */}
              <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-900/30">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-emerald-400">Marketing Report</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-emerald-900/20 rounded-lg">
                    <span className="text-slate-300">ROAS (Ads Manager)</span>
                    <span className="text-emerald-400 font-bold">3.5x ↑</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-900/20 rounded-lg">
                    <span className="text-slate-300">Revenue tháng này</span>
                    <span className="text-emerald-400 font-bold">₫5 tỷ ✓</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-900/20 rounded-lg">
                    <span className="text-slate-300">So với KPI</span>
                    <span className="text-emerald-400 font-bold">Vượt 20%</span>
                  </div>
                </div>
                <p className="mt-4 text-sm text-emerald-300/70 italic">
                  "Campaign rất thành công, xin scale budget"
                </p>
              </div>

              {/* Finance Report */}
              <div className="p-6 rounded-xl bg-red-950/20 border border-red-900/30">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  <h3 className="text-lg font-semibold text-red-400">Finance Report</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg">
                    <span className="text-slate-300">Net Profit Margin</span>
                    <span className="text-red-400 font-bold">-8% ↓</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg">
                    <span className="text-slate-300">Cash Flow Gap</span>
                    <span className="text-red-400 font-bold">₫1.2 tỷ thiếu</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg">
                    <span className="text-slate-300">AR Outstanding</span>
                    <span className="text-red-400 font-bold">45 ngày</span>
                  </div>
                </div>
                <p className="mt-4 text-sm text-red-300/70 italic">
                  "Tháng này lỗ nặng, phải cắt chi tiêu"
                </p>
              </div>
            </div>

            {/* CEO Dilemma */}
            <div className="mt-8 p-6 bg-slate-900/50 rounded-xl border border-slate-800 text-center">
              <p className="text-2xl text-white font-semibold mb-2">
                Ai đúng? Ai sai? CEO không biết tin ai.
              </p>
              <p className="text-slate-400">
                Marketing và Finance đang nói hai ngôn ngữ khác nhau. MDP là cầu nối.
              </p>
            </div>
          </div>
        </section>

        <Separator className="max-w-5xl mx-auto bg-slate-800" />

        {/* VANITY VS PROFIT ROAS */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Vanity ROAS ≠ Profit ROAS</h2>
            </div>
            <p className="text-slate-400 mb-10 max-w-2xl">
              Đây là lý do tại sao Marketing báo thắng nhưng Finance báo lỗ.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Vanity ROAS */}
              <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-900/30">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Vanity ROAS</h3>
                  <span className="text-3xl font-bold text-emerald-400">3.5x</span>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Công thức:</span>
                    <span className="text-slate-300">Revenue / Ad Spend</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Nguồn:</span>
                    <span className="text-slate-300">Facebook / Google Ads Manager</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-amber-400 font-medium mb-2">⚠ Chi phí chưa tính:</p>
                  <ul className="space-y-1 text-sm text-slate-400">
                    <li>• COGS (giá vốn)</li>
                    <li>• Platform fees: 15-25%</li>
                    <li>• Return rate: 8-15%</li>
                    <li>• Shipping subsidy: 20-40k/đơn</li>
                    <li>• Packaging: 5-10k/đơn</li>
                    <li>• Payment processing fees</li>
                  </ul>
                </div>
              </div>

              {/* Profit ROAS */}
              <div className="p-6 rounded-xl bg-red-950/20 border border-red-900/30">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Profit ROAS (Bluecore)</h3>
                  <span className="text-3xl font-bold text-red-400">0.6x</span>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Công thức:</span>
                    <span className="text-slate-300">(Revenue - All Costs) / Ad Spend</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Nguồn:</span>
                    <span className="text-slate-300">Bluecore MDP (reconciled data)</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-emerald-400 font-medium mb-2">✓ Đã tính đủ:</p>
                  <ul className="space-y-1 text-sm text-slate-400">
                    <li>• COGS thực tế</li>
                    <li>• Platform fees thực tế</li>
                    <li>• Returns & refunds</li>
                    <li>• Logistics costs</li>
                    <li>• Operations overhead</li>
                    <li>• Payment processing</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Warning Box */}
            <div className="mt-8 p-6 bg-amber-950/30 rounded-xl border border-amber-900/30">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-lg font-semibold text-white mb-2">
                    Vanity ROAS 3.5x có thể = Profit ROAS 0.6x
                  </p>
                  <p className="text-slate-300">
                    Nghĩa là: <strong className="text-red-400">Càng scale càng lỗ.</strong> Mỗi đồng bạn đổ vào quảng cáo, bạn mất thêm 40 xu tiền thật.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator className="max-w-5xl mx-auto bg-slate-800" />

        {/* CASH CONVERSION GAP */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Cash Conversion Gap</h2>
            </div>
            <p className="text-slate-400 mb-10 max-w-2xl">
              Marketing tiêu tiền ngay (D+0), nhưng tiền về chậm 30-45 ngày. Đây là rủi ro thanh khoản ẩn.
            </p>

            {/* Timeline Visualization */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Dòng tiền của một Campaign</h3>
              
              <div className="space-y-4">
                {[
                  { day: 'D+0', label: 'Chi tiền ads', amount: '-₫890 triệu', color: 'red', percent: 100 },
                  { day: 'D+7', label: 'Tiền về đợt 1', amount: '+₫320 triệu (36%)', color: 'amber', percent: 36 },
                  { day: 'D+14', label: 'Tiền về đợt 2', amount: '+₫534 triệu (60%)', color: 'amber', percent: 60 },
                  { day: 'D+30', label: 'Tiền về đợt 3', amount: '+₫712 triệu (80%)', color: 'emerald', percent: 80 },
                  { day: 'D+45', label: 'Returns & Refunds', amount: '-₫89 triệu (-10%)', color: 'red', percent: 10 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="w-12 text-sm font-mono text-slate-500">{item.day}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-slate-300">{item.label}</span>
                        <span className={`text-sm font-medium ${
                          item.color === 'red' ? 'text-red-400' : 
                          item.color === 'amber' ? 'text-amber-400' : 
                          'text-emerald-400'
                        }`}>{item.amount}</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            item.color === 'red' ? 'bg-red-500/50' : 
                            item.color === 'amber' ? 'bg-amber-500/50' : 
                            'bg-emerald-500/50'
                          }`}
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-amber-950/30 rounded-lg border border-amber-900/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-amber-400 font-medium">Cash Gap 30 ngày: ₫178 triệu</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Scale nhanh = Cash gap lớn = Rủi ro thanh khoản. MDP giúp bạn nhìn thấy gap này trước khi quá muộn.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator className="max-w-5xl mx-auto bg-slate-800" />

        {/* MDP MANIFESTO */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">MDP Manifesto</h2>
            </div>
            <p className="text-slate-400 mb-10 max-w-2xl">
              10 nguyên tắc bất biến của Marketing Data Platform.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, icon: Ban, title: 'MDP KHÔNG PHẢI MARTECH', desc: 'Không chạy ads, không quản lý campaign. Đó là việc của Ads Manager.' },
                { num: 2, icon: DollarSign, title: 'MỘT VAI TRÒ DUY NHẤT', desc: 'Đo lường giá trị tài chính thật của marketing.' },
                { num: 3, icon: Users, title: 'CEO & CFO TRƯỚC', desc: 'CFO hiểu, CEO quyết, marketer buộc phải điều chỉnh.' },
                { num: 4, icon: Calculator, title: 'PROFIT ATTRIBUTION', desc: 'Không có click attribution. Chỉ có profit attribution.' },
                { num: 5, icon: Wallet, title: 'GẮN VỚI CASHFLOW', desc: 'Tiền về nhanh hay chậm? Có bị hoàn không? Có khóa cash không?' },
                { num: 6, icon: Layers, title: 'NUÔI FDP & CONTROL TOWER', desc: 'MDP là nguồn tín hiệu cho unit economics và risk alerts.' },
                { num: 7, icon: AlertTriangle, title: 'ƯU TIÊN RỦI RO', desc: 'Phát hiện marketing đốt tiền, tăng trưởng giả, doanh thu làm chết cashflow.' },
                { num: 8, icon: Eye, title: 'ĐƠN GIẢN HÓA ATTRIBUTION', desc: 'Logic rõ ràng, giả định bảo thủ, CFO tin được.' },
                { num: 9, icon: Scale, title: 'KHÔNG TĂNG TRƯỞNG VÔ TRÁCH NHIỆM', desc: 'Mỗi quyết định marketing phải trả lời: lãi hay lỗ?' },
                { num: 10, icon: Gauge, title: 'FINAL TEST', desc: 'Nếu không làm quyết định marketing rõ ràng hơn → MDP thất bại.' },
              ].map((item) => (
                <div key={item.num} className="flex gap-4 p-4 rounded-lg bg-slate-900/30 border border-slate-800 hover:border-blue-800/50 transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">
                      <span className="text-blue-400 mr-2">#{item.num}</span>
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

        {/* WHAT MDP DOES */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">MDP làm gì?</h2>
            </div>
            <p className="text-slate-400 mb-10">
              4 năng lực cốt lõi để đo lường giá trị tài chính thật của Marketing.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: PieChart,
                  title: 'Profit Attribution',
                  desc: 'Mỗi campaign, mỗi kênh → Contribution Margin thật',
                  details: ['Revenue sau khi trừ hết chi phí', 'ROAS thật (không phải vanity)', 'Margin per channel/campaign', 'True CAC calculation'],
                  color: 'blue'
                },
                {
                  icon: Wallet,
                  title: 'Cash Impact',
                  desc: 'Marketing đang tạo ra hay khóa bao nhiêu tiền mặt',
                  details: ['Cash conversion timeline', 'Working capital impact', 'Float calculation', 'Liquidity risk score'],
                  color: 'emerald'
                },
                {
                  icon: Users,
                  title: 'True CAC & LTV',
                  desc: 'Chi phí có khách hàng thật sau returns, sau fraud',
                  details: ['CAC sau returns/refunds', 'CAC sau fraud deduction', 'LTV:CAC ratio thật', 'Cohort analysis'],
                  color: 'purple'
                },
                {
                  icon: Activity,
                  title: 'Channel Health Score',
                  desc: 'Đánh giá sức khỏe từng kênh marketing',
                  details: ['Profit ROAS trend', 'Cash conversion rate', 'Margin sustainability', 'Risk indicators'],
                  color: 'amber'
                }
              ].map((cap, i) => {
                const colorMap: Record<string, string> = {
                  blue: 'border-blue-800/50 bg-blue-950/20',
                  emerald: 'border-emerald-800/50 bg-emerald-950/20',
                  purple: 'border-purple-800/50 bg-purple-950/20',
                  amber: 'border-amber-800/50 bg-amber-950/20'
                };
                const iconColorMap: Record<string, string> = {
                  blue: 'text-blue-400 bg-blue-500/10',
                  emerald: 'text-emerald-400 bg-emerald-500/10',
                  purple: 'text-purple-400 bg-purple-500/10',
                  amber: 'text-amber-400 bg-amber-500/10'
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
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
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

        {/* MARKETING DECISION CARD */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Marketing Decision Card</h2>
            </div>
            <p className="text-slate-400 mb-10">
              Mỗi campaign được đánh giá bằng số liệu tài chính thật, dẫn đến 3 loại quyết định.
            </p>

            {/* Decision Card Mockup */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl max-w-2xl mx-auto mb-10">
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-widest text-slate-500">Marketing Decision</span>
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded font-medium">STOP</span>
                </div>
                <h3 className="text-xl text-white font-semibold">Campaign: TikTok Flash Sale Q1</h3>
                <p className="text-sm text-slate-400 mt-1">Chiến dịch đang phá hủy margin</p>
              </div>

              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Revenue</span>
                  <span className="text-emerald-400 font-medium">↑ ₫2.4 tỷ</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Marketing Spend</span>
                  <span className="text-slate-300">₫890 triệu</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-900/20 rounded-lg border border-emerald-800/30">
                  <span className="text-slate-400">Vanity ROAS</span>
                  <span className="text-emerald-400 font-bold">2.7x ✓</span>
                </div>
                <Separator className="bg-slate-700" />
                <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-800/30">
                  <span className="text-white font-medium">Profit ROAS</span>
                  <span className="text-red-400 font-bold">0.4x ✗</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Contribution Margin</span>
                  <span className="text-red-400">-12%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Cash Conversion @D+14</span>
                  <span className="text-amber-400">38%</span>
                </div>
              </div>

              <div className="p-6 border-t border-slate-800">
                <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-lg mb-4">
                  <p className="text-red-400 font-medium">💰 Đã mất: ₫534 triệu tiền thật</p>
                  <p className="text-red-300 text-sm mt-1">Nếu tiếp tục 7 ngày: mất thêm ₫267 triệu</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">
                    STOP ngay
                  </button>
                  <button className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm">
                    Cap budget 50%
                  </button>
                </div>
              </div>
            </div>

            {/* 3 Decision Types */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-800/50 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-emerald-400 mb-2">SCALE</h3>
                <p className="text-sm text-slate-400">
                  Profit ROAS &gt; 1.2x<br />
                  CM &gt; 0%<br />
                  Cash conversion &gt; 60%
                </p>
                <p className="text-xs text-emerald-400 mt-4 font-medium">→ Tăng budget, expand audience</p>
              </div>

              <div className="p-6 rounded-xl bg-amber-950/20 border border-amber-800/50 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-amber-400 mb-2">PAUSE</h3>
                <p className="text-sm text-slate-400">
                  Profit ROAS 0.8x-1.2x<br />
                  CM ±5%<br />
                  Need investigation
                </p>
                <p className="text-xs text-amber-400 mt-4 font-medium">→ Giữ nguyên, phân tích thêm</p>
              </div>

              <div className="p-6 rounded-xl bg-red-950/20 border border-red-800/50 text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-red-400 mb-2">STOP</h3>
                <p className="text-sm text-slate-400">
                  Profit ROAS &lt; 0.8x<br />
                  CM &lt; -5%<br />
                  Cash gap increasing
                </p>
                <p className="text-xs text-red-400 mt-4 font-medium">→ Dừng ngay, cut losses</p>
              </div>
            </div>
          </div>
        </section>

        <Separator className="max-w-5xl mx-auto bg-slate-800" />

        {/* CASE STUDIES */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Award className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Case Studies</h2>
            </div>
            <p className="text-slate-400 mb-10">
              Câu chuyện thực tế từ các doanh nghiệp đã triển khai Bluecore MDP.
            </p>

            <div className="space-y-8">
              {[
                {
                  industry: 'E-commerce Multi-channel',
                  company: 'Fashion Brand X',
                  size: '50-100 nhân viên · 50-100 tỷ/năm',
                  problem: 'Facebook ROAS = 4x, TikTok ROAS = 3.5x nhưng profit margin giảm từ 12% xuống 3% trong 6 tháng. Marketing báo "đang làm rất tốt", Finance không giải thích được margin đi đâu.',
                  solution: 'MDP phân tích cho thấy: Facebook có 60% traffic vào SKUs margin âm. TikTok có return rate 25% (vs 8% organic). True Profit ROAS: Facebook 0.7x, TikTok 0.5x.',
                  results: [
                    { label: 'Marketing budget waste cut', value: '-45%', desc: 'Tiết kiệm' },
                    { label: 'Profit margin', value: '3% → 11%', desc: '+267%' },
                    { label: 'Time to insight', value: '30 ngày → 1 ngày', desc: '-97%' }
                  ],
                  testimonial: '"MDP cho thấy 60% budget Facebook đang đổ vào những SKU margin âm. Khi optimize, profit tăng gần 4x với cùng revenue."',
                  author: 'Nguyễn Văn A, CMO',
                  roi: '20x ROI trong 3 tháng'
                },
                {
                  industry: 'D2C Brand',
                  company: 'Beauty Brand Y',
                  size: '30-50 nhân viên · 30-50 tỷ/năm',
                  problem: 'Scale TikTok Shop từ 500tr lên 2 tỷ/tháng trong 3 tháng. ROAS duy trì 3x. Nhưng cash flow âm liên tục, phải vay ngắn hạn để trả ads và suppliers.',
                  solution: 'MDP phát hiện: Cash conversion chỉ 35% @D+14 (TikTok payout chậm). Marketing scale = cash gap grow. Profit ROAS chỉ 0.8x sau khi tính hết chi phí.',
                  results: [
                    { label: 'Cash gap identified', value: '₫1.2 tỷ', desc: 'Trước đó: không biết' },
                    { label: 'Scale strategy', value: 'Pause → Optimize', desc: 'Thay đổi' },
                    { label: 'Working capital saved', value: '₫800 triệu', desc: 'Giảm vay' }
                  ],
                  testimonial: '"Trước MDP, chúng tôi cứ scale vì ROAS đẹp mà không biết cash gap đang lớn dần. MDP cho thấy bức tranh thật: scale = chết nhanh hơn."',
                  author: 'Trần Thị B, CFO',
                  roi: '15x ROI trong 6 tháng'
                },
                {
                  industry: 'Retail Chain',
                  company: 'Electronics Chain Z',
                  size: '100-200 nhân viên · 100-200 tỷ/năm',
                  problem: 'Chi 2 tỷ/tháng cho digital marketing trên 4 kênh. Mỗi team kênh báo ROAS 2-3x nhưng tổng công ty vẫn lỗ 500tr/tháng từ marketing channel.',
                  solution: 'MDP centralized attribution: phát hiện overlap 30% giữa các kênh (cùng 1 khách đếm 3-4 lần). True incremental revenue chỉ 60% reported. 2 kênh có true ROAS < 0.5x.',
                  results: [
                    { label: 'Duplicate attribution removed', value: '30%', desc: 'Trước: không biết' },
                    { label: 'Kênh lỗ stopped', value: '2/4', desc: 'Cut spending' },
                    { label: 'Monthly profit swing', value: '-500tr → +300tr', desc: '+800tr' }
                  ],
                  testimonial: '"Mỗi team marketing đều claim thành tích trên cùng một đơn hàng. MDP cho thấy incremental value thật của từng kênh. 2 kênh hóa ra đang âm."',
                  author: 'Lê Văn C, CEO',
                  roi: '10x ROI trong 4 tháng'
                }
              ].map((cs, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-slate-800 flex items-start justify-between">
                    <div>
                      <span className="px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded mb-2 inline-block">{cs.industry}</span>
                      <h3 className="text-xl font-semibold text-white">{cs.company}</h3>
                      <p className="text-sm text-slate-400 mt-1">{cs.size}</p>
                    </div>
                    <span className="px-3 py-1 text-sm bg-blue-500/20 text-blue-400 rounded-full font-medium">
                      {cs.roi}
                    </span>
                  </div>

                  <div className="p-6 grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="mb-6">
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Vấn đề</p>
                        <p className="text-slate-300 text-sm">{cs.problem}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Giải pháp MDP</p>
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
                              <span className="text-lg font-bold text-blue-400">{r.value}</span>
                              <span className="text-xs text-slate-500 ml-2">{r.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6">
                    <div className="p-4 bg-blue-950/30 border border-blue-900/30 rounded-lg">
                      <Quote className="w-5 h-5 text-blue-400 mb-2" />
                      <p className="text-slate-300 italic text-sm mb-2">{cs.testimonial}</p>
                      <p className="text-sm text-blue-400 font-medium">— {cs.author}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator className="max-w-5xl mx-auto bg-slate-800" />

        {/* WHY MDP */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Tại sao chọn Bluecore MDP?</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
                <Shield className="w-8 h-8 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">CFO-Grade Data</h3>
                <p className="text-sm text-slate-400">
                  Số liệu được reconcile, không phải số liệu từ marketing dashboard. CFO tin được.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
                <Zap className="w-8 h-8 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">2 tuần Go-live</h3>
                <p className="text-sm text-slate-400">
                  Không cần 6 tháng implement. Connect data sources, configure rules, go live.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
                <Target className="w-8 h-8 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Decision-First</h3>
                <p className="text-sm text-slate-400">
                  Không phải dashboard xem cho biết. Mỗi insight dẫn đến một quyết định cụ thể.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 bg-gradient-to-t from-blue-950/30 to-slate-950">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Sẵn sàng biết giá trị thật của Marketing?
            </h2>
            <p className="text-lg text-slate-400 mb-8">
              Đặt lịch demo 30 phút để xem Bluecore MDP phân tích marketing data của bạn.
            </p>
            <div className="flex flex-wrap justify-center gap-4 no-print">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
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
