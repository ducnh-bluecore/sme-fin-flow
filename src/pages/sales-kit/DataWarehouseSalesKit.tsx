import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  HardDrive, 
  Database, 
  Zap, 
  RefreshCw, 
  Shield, 
  TrendingUp,
  Check,
  ArrowRight,
  BarChart3,
  Clock,
  DollarSign,
  Users,
  Building2,
  ArrowLeft,
  Printer
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const features = [
  {
    icon: Database,
    title: 'Multi-Source Integration',
    description: 'Kết nối trực tiếp với BigQuery, Shopee, Lazada, TikTok Shop, Haravan và 20+ nguồn dữ liệu khác'
  },
  {
    icon: RefreshCw,
    title: 'Real-time Sync',
    description: 'Đồng bộ dữ liệu tự động mỗi 15 phút, đảm bảo số liệu luôn cập nhật'
  },
  {
    icon: Zap,
    title: 'Smart ETL Engine',
    description: 'Tự động transform, clean và normalize dữ liệu từ nhiều nguồn khác nhau'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Mã hóa end-to-end, row-level security, audit logs đầy đủ'
  },
  {
    icon: BarChart3,
    title: 'Pre-built Data Models',
    description: '50+ data models sẵn có cho E-commerce, Retail, F&B, Manufacturing'
  },
  {
    icon: Clock,
    title: 'Historical Analysis',
    description: 'Lưu trữ và phân tích dữ liệu lịch sử lên đến 5 năm'
  }
];

const useCases = [
  {
    industry: 'E-commerce Multi-channel',
    problem: 'Dữ liệu từ Shopee, Lazada, TikTok Shop nằm rời rạc, không thể so sánh hiệu suất kênh',
    solution: 'Data Warehouse tự động tổng hợp đơn hàng, doanh thu, chi phí từ tất cả kênh vào một nơi',
    result: 'Tiết kiệm 20 giờ/tuần cho team báo cáo, phát hiện kênh lỗ trong 24h thay vì 2 tuần',
    roi: '15x ROI trong 6 tháng'
  },
  {
    industry: 'Retail Chain (5+ cửa hàng)',
    problem: 'Mỗi cửa hàng dùng POS khác nhau, không có cái nhìn tổng quan về inventory',
    solution: 'Kết nối tất cả POS systems, tự động tính Days of Stock, Reorder Points',
    result: 'Giảm 35% hàng tồn kho chết, tăng 18% inventory turnover',
    roi: '10x ROI trong 12 tháng'
  },
  {
    industry: 'D2C Brand',
    problem: 'Chi phí marketing phân tán trên Facebook, Google, TikTok - không biết kênh nào profitable',
    solution: 'Tích hợp ad platforms với order data, tính Profit ROAS thực tế',
    result: 'Cắt 40% budget cho kênh lỗ, tăng 25% overall profit',
    roi: '20x ROI trong 3 tháng'
  }
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '4.990.000',
    period: '/tháng',
    description: 'Dành cho SME với 1-3 nguồn dữ liệu',
    features: [
      '3 data sources',
      '1 triệu rows/tháng',
      'Sync mỗi 1 giờ',
      '30 ngày data retention',
      'Email support'
    ],
    highlighted: false
  },
  {
    name: 'Growth',
    price: '12.990.000',
    period: '/tháng',
    description: 'Dành cho doanh nghiệp đang scale nhanh',
    features: [
      '10 data sources',
      '10 triệu rows/tháng',
      'Sync mỗi 15 phút',
      '1 năm data retention',
      'Slack + Phone support',
      'Custom data models',
      'API access'
    ],
    highlighted: true
  },
  {
    name: 'Enterprise',
    price: 'Liên hệ',
    period: '',
    description: 'Dành cho doanh nghiệp lớn với yêu cầu đặc thù',
    features: [
      'Unlimited data sources',
      'Unlimited rows',
      'Real-time sync',
      '5 năm data retention',
      'Dedicated success manager',
      'On-premise deployment option',
      'Custom SLA',
      'SSO integration'
    ],
    highlighted: false
  }
];

export default function DataWarehouseSalesKit() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Helmet>
        <title>Data Warehouse - Sales Kit | Bluecore</title>
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
        <section className="relative bg-gradient-to-br from-primary/10 via-background to-blue-500/10 py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                <HardDrive className="w-8 h-8 text-primary" />
              </div>
              <div>
                <Badge variant="secondary" className="mb-2">DATA WAREHOUSE</Badge>
                <h1 className="text-4xl font-bold text-foreground">
                  Bluecore Data Warehouse
                </h1>
              </div>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mb-8">
              Nền tảng tập trung dữ liệu doanh nghiệp, biến dữ liệu rời rạc từ 
              hàng chục nguồn thành một Single Source of Truth.
            </p>
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span><strong>500+</strong> doanh nghiệp đang sử dụng</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <span><strong>2 tỷ+</strong> rows dữ liệu xử lý/tháng</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span><strong>99.9%</strong> uptime SLA</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-2">Tính năng nổi bật</h2>
            <p className="text-muted-foreground mb-8">Mọi thứ bạn cần để quản lý dữ liệu doanh nghiệp</p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="border-border/50">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
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
            <p className="text-muted-foreground mb-8">Kết quả thực tế từ khách hàng đang sử dụng</p>
            
            <div className="space-y-6">
              {useCases.map((useCase, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-4">
                      <div className="bg-primary/5 p-6 flex flex-col justify-center">
                        <Badge variant="outline" className="w-fit mb-2">
                          <Building2 className="w-3 h-3 mr-1" />
                          {useCase.industry}
                        </Badge>
                        <div className="mt-4 flex items-center gap-2 text-green-600 font-bold">
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
                          <span className="text-xs font-medium text-blue-500 uppercase">Giải pháp</span>
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
            <p className="text-muted-foreground mb-8">Chọn gói phù hợp với quy mô doanh nghiệp</p>
            
            <div className="grid md:grid-cols-3 gap-6">
              {pricingPlans.map((plan, index) => (
                <Card 
                  key={index} 
                  className={`relative ${plan.highlighted ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-border/50'}`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Phổ biến nhất</Badge>
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
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full mt-6 no-print ${plan.highlighted ? '' : 'variant-outline'}`}
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

        {/* CTA Section */}
        <section className="py-16 px-6 bg-primary/5 no-print">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Sẵn sàng tập trung dữ liệu doanh nghiệp?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Đăng ký demo 30 phút để xem Data Warehouse hoạt động với dữ liệu thực của bạn
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg">
                Đăng ký Demo miễn phí
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline">
                Xem tài liệu kỹ thuật
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
