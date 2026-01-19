import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
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
  Calculator
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const features = [
  {
    icon: Target,
    title: 'Single Source of Truth',
    description: '1 Net Revenue, 1 Contribution Margin, 1 Cash Position. Không có phiên bản khác.'
  },
  {
    icon: Wallet,
    title: 'Real Cash Tracking',
    description: 'Phân biệt rõ: Cash đã về / sẽ về / có nguy cơ không về / đang bị khóa (tồn kho, ads)'
  },
  {
    icon: PieChart,
    title: 'Unit Economics',
    description: 'SKU-level P&L: biết chính xác sản phẩm nào lãi, sản phẩm nào lỗ'
  },
  {
    icon: LineChart,
    title: 'Cash Runway & Forecast',
    description: 'Dự báo dòng tiền 30/60/90 ngày, cảnh báo sớm khi cash runway < 3 tháng'
  },
  {
    icon: AlertTriangle,
    title: 'Control Tower Integration',
    description: 'Kết nối với Control Tower để tự động phát hiện anomaly và đề xuất action'
  },
  {
    icon: Calculator,
    title: 'Decision Support',
    description: 'ROI, NPV, IRR analysis - hỗ trợ quyết định đầu tư với số liệu thực'
  }
];

const manifestoPoints = [
  'FDP KHÔNG PHẢI PHẦN MỀM KẾ TOÁN - Phục vụ CEO/CFO điều hành, không nộp báo cáo thuế',
  'TRUTH > FLEXIBILITY - Không cho tự định nghĩa metric, không "chọn số đẹp"',
  'REVENUE ↔ COST - Mọi doanh thu đều đi kèm chi phí. Không có doanh thu "đứng một mình"',
  'UNIT ECONOMICS → ACTION - SKU lỗ + khóa cash → phải nói STOP',
  'TODAY\'S DECISION - Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng'
];

const useCases = [
  {
    industry: 'E-commerce Multi-channel',
    problem: 'ROAS trên platform ads là 3x nhưng cuối tháng vẫn lỗ. Không biết vấn đề ở đâu.',
    solution: 'FDP tính True Profit ROAS = (Revenue - COGS - Fees - Shipping) / Ad Spend, phát hiện margin thực chỉ 8%',
    result: 'Cắt 60% SKUs lỗ, tập trung vào top 20% profitable SKUs, tăng net profit 45%',
    roi: '25x ROI trong 3 tháng'
  },
  {
    industry: 'Retail Chain (10+ cửa hàng)',
    problem: 'Báo cáo P&L cuối tháng, khi biết cửa hàng lỗ thì đã lỗ 1 tháng rồi',
    solution: 'FDP cung cấp daily P&L per store, contribution margin theo ngày',
    result: 'Phát hiện store lỗ trong 48h, tiết kiệm 2 tỷ đồng tiền lỗ/năm',
    roi: '15x ROI trong 6 tháng'
  },
  {
    industry: 'D2C Brand với Marketing Heavy',
    problem: 'Cash runway chỉ còn 2 tháng nhưng CFO không biết vì tiền nằm rải rác nhiều nơi',
    solution: 'FDP tổng hợp cash from bank accounts, AR, locked in ads, inventory cost',
    result: 'Cảnh báo cash crisis sớm 45 ngày, kịp thương lượng với supplier và cut spending',
    roi: 'Tránh được bankruptcy - Vô giá'
  }
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '7.990.000',
    period: '/tháng',
    description: 'Dành cho SME muốn quản lý tài chính chuyên nghiệp',
    features: [
      'CFO Dashboard',
      'Cash Flow Tracking',
      'P&L by Channel',
      'AR/AP Management',
      '30-day forecast',
      'Email support'
    ],
    highlighted: false
  },
  {
    name: 'Growth',
    price: '19.990.000',
    period: '/tháng',
    description: 'Dành cho doanh nghiệp scale nhanh cần visibility cao',
    features: [
      'Mọi tính năng Starter',
      'Unit Economics (SKU-level)',
      'Control Tower Integration',
      '90-day Cash Forecast',
      'What-If Scenarios',
      'Decision Support (ROI/NPV)',
      'Slack + Phone support',
      'Custom alerts'
    ],
    highlighted: true
  },
  {
    name: 'Enterprise',
    price: 'Liên hệ',
    period: '',
    description: 'Dành cho tập đoàn với multi-entity',
    features: [
      'Mọi tính năng Growth',
      'Multi-entity consolidation',
      'Board-ready reports',
      'Custom KPIs',
      'Bank integration (read-only)',
      'Dedicated success manager',
      'On-premise deployment',
      'Custom SLA'
    ],
    highlighted: false
  }
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
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              In / Export PDF
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-emerald-500/10 via-background to-primary/10 py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <Badge variant="secondary" className="mb-2 bg-emerald-500/10 text-emerald-700">
                  FINANCIAL DATA PLATFORM
                </Badge>
                <h1 className="text-4xl font-bold text-foreground">
                  Bluecore FDP
                </h1>
              </div>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mb-8">
              Nền tảng tài chính cho CEO & CFO điều hành - Single Source of Truth 
              cho mọi quyết định kinh doanh. Không phải phần mềm kế toán.
            </p>
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span><strong>200+</strong> CFOs đang sử dụng</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span><strong>15 nghìn tỷ</strong> GMV được tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span><strong>2.5x</strong> faster decision making</span>
              </div>
            </div>
          </div>
        </section>

        {/* Manifesto Section */}
        <section className="py-12 px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              FDP Manifesto - Nguyên tắc bất biến
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {manifestoPoints.map((point, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-2">Tính năng nổi bật</h2>
            <p className="text-muted-foreground mb-8">Công cụ tài chính cho quyết định thực tế, không phải báo cáo đẹp</p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="border-border/50">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
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
            <h2 className="text-2xl font-bold text-foreground mb-2">Case Studies & ROI</h2>
            <p className="text-muted-foreground mb-8">Kết quả thực tế từ CEO/CFO đang sử dụng FDP</p>
            
            <div className="space-y-6">
              {useCases.map((useCase, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-4">
                      <div className="bg-emerald-500/5 p-6 flex flex-col justify-center">
                        <Badge variant="outline" className="w-fit mb-2 border-emerald-500/30">
                          <Building2 className="w-3 h-3 mr-1" />
                          {useCase.industry}
                        </Badge>
                        <div className="mt-4 flex items-center gap-2 text-emerald-600 font-bold">
                          <DollarSign className="w-5 h-5" />
                          {useCase.roi}
                        </div>
                      </div>
                      <div className="md:col-span-3 p-6 grid gap-4">
                        <div>
                          <span className="text-xs font-medium text-red-500 uppercase">Vấn đề</span>
                          <p className="text-sm text-muted-foreground">{useCase.problem}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-blue-500 uppercase">Giải pháp FDP</span>
                          <p className="text-sm text-muted-foreground">{useCase.solution}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-green-500 uppercase">Kết quả</span>
                          <p className="text-sm text-foreground font-medium">{useCase.result}</p>
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

        {/* Pricing Section */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-2">Bảng giá</h2>
            <p className="text-muted-foreground mb-8">Đầu tư cho visibility tài chính = đầu tư cho survival</p>
            
            <div className="grid md:grid-cols-3 gap-6">
              {pricingPlans.map((plan, index) => (
                <Card 
                  key={index} 
                  className={`relative ${plan.highlighted ? 'border-emerald-500 shadow-lg ring-2 ring-emerald-500/20' : 'border-border/50'}`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-500 text-white">Phổ biến nhất</Badge>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                    <div className="mb-6">
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <ul className="space-y-3">
                      {plan.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
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
          </div>
        </section>

        {/* Comparison Section */}
        <section className="py-12 px-6 bg-muted/30 print-break">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-bold text-foreground mb-6">FDP vs Phần mềm kế toán truyền thống</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Tiêu chí</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Kế toán truyền thống</th>
                    <th className="text-center py-3 px-4 font-medium text-emerald-600">Bluecore FDP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-3 px-4">Mục đích</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">Nộp báo cáo thuế</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-medium">Điều hành doanh nghiệp</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Tần suất cập nhật</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">Cuối tháng</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-medium">Real-time / Daily</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Unit Economics</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">❌ Không có</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-medium">✓ SKU-level P&L</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Cash Forecast</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">❌ Không có</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-medium">✓ 90-day forecast</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Decision Support</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">❌ Không có</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-medium">✓ ROI/NPV/What-If</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-6 bg-emerald-500/5 no-print">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Sẵn sàng có Single Source of Truth cho tài chính?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Đăng ký demo 45 phút để xem FDP hoạt động với dữ liệu thực của bạn. 
              Chúng tôi sẽ show bạn Unit Economics và Cash Runway ngay lập tức.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600">
                Đăng ký Demo miễn phí
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline">
                Xem FDP Documentation
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-border">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div>© 2026 Bluecore Technologies. All rights reserved.</div>
            <div className="flex gap-6">
              <span>Email: sales@bluecore.vn</span>
              <span>Hotline: 1900 xxxx</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
