import { Helmet } from 'react-helmet-async';
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
  Printer,
  X,
  Layers,
  Network,
  Lock,
  Globe,
  Server,
  FileJson,
  Workflow,
  Target,
  Award,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Circle,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

// Import screenshots
import dwDashboard from '@/assets/sales-kit/dw-dashboard.jpg';
import dwConnectors from '@/assets/sales-kit/dw-connectors.jpg';
import dwSchema from '@/assets/sales-kit/dw-schema.jpg';
import dwRealtime from '@/assets/sales-kit/dw-realtime.jpg';

// Features data
const coreFeatures = [
  {
    icon: Database,
    title: 'Multi-Source Integration',
    description: 'Kết nối trực tiếp với BigQuery, Shopee, Lazada, TikTok Shop, Haravan và 20+ nguồn dữ liệu khác',
    details: [
      'Pre-built connectors cho các platform phổ biến',
      'Custom API connector cho hệ thống riêng',
      'OAuth 2.0 authentication',
      'Webhook real-time updates'
    ]
  },
  {
    icon: RefreshCw,
    title: 'Automated Sync Engine',
    description: 'Đồng bộ dữ liệu tự động mỗi 15 phút, đảm bảo số liệu luôn cập nhật',
    details: [
      'Incremental sync (chỉ sync data mới)',
      'Full sync scheduled hàng tuần',
      'Retry logic tự động khi fail',
      'Sync history & audit trail'
    ]
  },
  {
    icon: Zap,
    title: 'Smart ETL Engine',
    description: 'Tự động transform, clean và normalize dữ liệu từ nhiều nguồn khác nhau',
    details: [
      'Data deduplication',
      'Currency conversion tự động',
      'Date/time normalization',
      'Custom transformation rules'
    ]
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Mã hóa end-to-end, row-level security, audit logs đầy đủ',
    details: [
      'AES-256 encryption at rest',
      'TLS 1.3 in transit',
      'Row-level security (RLS)',
      'SOC 2 Type II compliant'
    ]
  },
  {
    icon: BarChart3,
    title: 'Pre-built Data Models',
    description: '50+ data models sẵn có cho E-commerce, Retail, F&B, Manufacturing',
    details: [
      'Order & Revenue models',
      'Inventory & Stock models',
      'Customer & Cohort models',
      'Marketing & Attribution models'
    ]
  },
  {
    icon: Clock,
    title: 'Historical Analysis',
    description: 'Lưu trữ và phân tích dữ liệu lịch sử lên đến 5 năm',
    details: [
      'Time-series optimization',
      'YoY, MoM comparison',
      'Trend detection',
      'Seasonal pattern recognition'
    ]
  }
];

// Data sources
const dataSources = [
  { name: 'Shopee', category: 'E-commerce', status: 'live' },
  { name: 'Lazada', category: 'E-commerce', status: 'live' },
  { name: 'TikTok Shop', category: 'E-commerce', status: 'live' },
  { name: 'Tiki', category: 'E-commerce', status: 'live' },
  { name: 'Sendo', category: 'E-commerce', status: 'live' },
  { name: 'Haravan', category: 'E-commerce', status: 'live' },
  { name: 'Sapo', category: 'POS/ERP', status: 'live' },
  { name: 'KiotViet', category: 'POS/ERP', status: 'live' },
  { name: 'MISA', category: 'Accounting', status: 'live' },
  { name: 'Google BigQuery', category: 'Data Warehouse', status: 'live' },
  { name: 'Facebook Ads', category: 'Marketing', status: 'live' },
  { name: 'Google Ads', category: 'Marketing', status: 'live' },
  { name: 'TikTok Ads', category: 'Marketing', status: 'live' },
  { name: 'Vietcombank', category: 'Banking', status: 'beta' },
  { name: 'Techcombank', category: 'Banking', status: 'beta' },
  { name: 'Custom API', category: 'Custom', status: 'live' },
];

// Use cases
const useCases = [
  {
    industry: 'E-commerce Multi-channel',
    companySize: '50-200 nhân viên',
    revenue: '50-200 tỷ/năm',
    problem: 'Dữ liệu từ Shopee, Lazada, TikTok Shop nằm rời rạc trong Excel. Team phải mất 3 ngày để tổng hợp báo cáo tuần. Không thể so sánh hiệu suất kênh real-time.',
    solution: 'Data Warehouse tự động pull data từ tất cả kênh mỗi 15 phút. Unified order model chuẩn hóa format từ các platform khác nhau. Dashboard real-time cho cross-channel comparison.',
    implementation: '2 tuần',
    results: [
      { metric: 'Thời gian làm báo cáo', before: '3 ngày/tuần', after: '5 phút/tuần', improvement: '-99.7%' },
      { metric: 'Phát hiện kênh lỗ', before: '2 tuần sau', after: '24 giờ', improvement: '-93%' },
      { metric: 'FTE cho reporting', before: '2 người', after: '0.2 người', improvement: '-90%' },
    ],
    testimonial: '"Trước đây team tôi mất 3 ngày để tổng hợp báo cáo từ các kênh. Giờ số liệu có sẵn real-time, tôi có thể ra quyết định trong ngày."',
    author: 'Nguyễn Văn A, CEO - Fashion Brand X',
    roi: '15x ROI trong 6 tháng'
  },
  {
    industry: 'Retail Chain',
    companySize: '100-500 nhân viên',
    revenue: '100-500 tỷ/năm',
    problem: 'Có 15 cửa hàng, mỗi cửa hàng dùng POS khác nhau (KiotViet, Sapo, Haravan). Không có cái nhìn tổng quan về inventory. Hàng chết nằm im ở store này trong khi store kia đang out of stock.',
    solution: 'Kết nối tất cả POS systems vào Data Warehouse. Unified inventory model tính Days of Stock, Reorder Points cho từng SKU tại từng store. Automated alerts khi inventory anomaly.',
    implementation: '4 tuần',
    results: [
      { metric: 'Dead stock', before: '25% inventory', after: '8% inventory', improvement: '-68%' },
      { metric: 'Stockout events', before: '45 lần/tháng', after: '12 lần/tháng', improvement: '-73%' },
      { metric: 'Inventory turnover', before: '4x/năm', after: '7x/năm', improvement: '+75%' },
    ],
    testimonial: '"Data Warehouse giúp chúng tôi nhìn thấy inventory từ 15 cửa hàng trong 1 màn hình. Điều chuyển hàng giữa các store giờ dựa trên data thay vì cảm tính."',
    author: 'Trần Thị B, COO - Retail Chain Y',
    roi: '10x ROI trong 12 tháng'
  },
  {
    industry: 'D2C Brand',
    companySize: '20-50 nhân viên',
    revenue: '20-50 tỷ/năm',
    problem: 'Chi phí marketing phân tán trên Facebook, Google, TikTok. ROAS từ mỗi platform riêng lẻ nhìn đẹp (3-4x) nhưng cuối tháng vẫn lỗ. Không biết kênh nào thực sự profitable sau khi tính hết chi phí.',
    solution: 'Tích hợp ad platforms với order data trong Data Warehouse. Tính True Profit ROAS = (Revenue - COGS - Fees - Shipping) / Ad Spend. Attribution model cross-channel.',
    implementation: '2 tuần',
    results: [
      { metric: 'Marketing budget waste', before: '40% budget', after: '15% budget', improvement: '-62%' },
      { metric: 'Profit per order', before: '45K đ', after: '78K đ', improvement: '+73%' },
      { metric: 'Decision speed', before: '7 ngày', after: 'Same day', improvement: '-86%' },
    ],
    testimonial: '"Bluecore cho thấy 60% budget Facebook của chúng tôi đang đổ vào những SKU margin âm. Sau khi tối ưu, profit tăng 45% với cùng budget."',
    author: 'Lê Văn C, CMO - D2C Brand Z',
    roi: '20x ROI trong 3 tháng'
  }
];

// Competitor comparison
const competitorComparison = [
  { 
    feature: 'Giá khởi điểm', 
    bluecore: '4.9 triệu/tháng', 
    fivetran: '$720/tháng (~18 triệu)', 
    stitch: '$100/tháng (~2.5 triệu)',
    inhouse: '15-30 triệu/tháng (dev cost)',
    winner: 'bluecore'
  },
  { 
    feature: 'Vietnam E-commerce connectors', 
    bluecore: '✓ Shopee, Lazada, Tiki, Sendo, TikTok Shop', 
    fivetran: '✗ Không hỗ trợ', 
    stitch: '✗ Không hỗ trợ',
    inhouse: '✓ Tự build (mất 2-4 tháng)',
    winner: 'bluecore'
  },
  { 
    feature: 'Vietnam POS/ERP connectors', 
    bluecore: '✓ Haravan, Sapo, KiotViet, MISA', 
    fivetran: '✗ Không hỗ trợ', 
    stitch: '✗ Không hỗ trợ',
    inhouse: '✓ Tự build (mất 1-2 tháng)',
    winner: 'bluecore'
  },
  { 
    feature: 'Pre-built Retail Data Models', 
    bluecore: '✓ 50+ models sẵn có', 
    fivetran: '✗ Chỉ raw data', 
    stitch: '✗ Chỉ raw data',
    inhouse: '△ Tự build',
    winner: 'bluecore'
  },
  { 
    feature: 'Hỗ trợ tiếng Việt', 
    bluecore: '✓ 24/7 Việt Nam', 
    fivetran: '✗ English only', 
    stitch: '✗ English only',
    inhouse: '✓',
    winner: 'bluecore'
  },
  { 
    feature: 'Thời gian triển khai', 
    bluecore: '1-2 tuần', 
    fivetran: '2-4 tuần', 
    stitch: '2-4 tuần',
    inhouse: '3-6 tháng',
    winner: 'bluecore'
  },
  { 
    feature: 'Data transformation', 
    bluecore: '✓ Có sẵn + Custom', 
    fivetran: '△ Cần dbt riêng', 
    stitch: '✗ Không có',
    inhouse: '✓ Tự build',
    winner: 'bluecore'
  },
];

// Pricing plans
const pricingPlans = [
  {
    name: 'Starter',
    price: '4.990.000',
    period: '/tháng',
    description: 'Dành cho SME với 1-3 nguồn dữ liệu',
    bestFor: 'Doanh nghiệp nhỏ bắt đầu data-driven',
    features: [
      { text: '3 data sources', included: true },
      { text: '1 triệu rows/tháng', included: true },
      { text: 'Sync mỗi 1 giờ', included: true },
      { text: '30 ngày data retention', included: true },
      { text: 'Email support (SLA 24h)', included: true },
      { text: '5 pre-built data models', included: true },
      { text: 'Custom data models', included: false },
      { text: 'API access', included: false },
      { text: 'Dedicated success manager', included: false },
    ],
    highlighted: false
  },
  {
    name: 'Growth',
    price: '12.990.000',
    period: '/tháng',
    description: 'Dành cho doanh nghiệp đang scale nhanh',
    bestFor: 'Doanh nghiệp vừa với multi-channel',
    features: [
      { text: '10 data sources', included: true },
      { text: '10 triệu rows/tháng', included: true },
      { text: 'Sync mỗi 15 phút', included: true },
      { text: '1 năm data retention', included: true },
      { text: 'Slack + Phone support (SLA 4h)', included: true },
      { text: '25 pre-built data models', included: true },
      { text: 'Custom data models (5)', included: true },
      { text: 'API access', included: true },
      { text: 'Dedicated success manager', included: false },
    ],
    highlighted: true
  },
  {
    name: 'Enterprise',
    price: 'Liên hệ',
    period: '',
    description: 'Dành cho doanh nghiệp lớn với yêu cầu đặc thù',
    bestFor: 'Doanh nghiệp lớn, tập đoàn',
    features: [
      { text: 'Unlimited data sources', included: true },
      { text: 'Unlimited rows', included: true },
      { text: 'Real-time sync', included: true },
      { text: '5 năm data retention', included: true },
      { text: 'Dedicated success manager', included: true },
      { text: '50+ pre-built data models', included: true },
      { text: 'Unlimited custom data models', included: true },
      { text: 'API access + Webhooks', included: true },
      { text: 'On-premise deployment option', included: true },
      { text: 'Custom SLA (99.9%)', included: true },
      { text: 'SSO integration', included: true },
    ],
    highlighted: false
  }
];

// Screenshots data
const screenshots = [
  {
    title: 'Data Hub Dashboard',
    description: 'Trung tâm quản lý tất cả data sources, theo dõi sync status và data quality',
    image: dwDashboard
  },
  {
    title: 'API Connectors',
    description: 'Kết nối với Shopee, Lazada, TikTok và 20+ nguồn dữ liệu khác',
    image: dwConnectors
  },
  {
    title: 'Schema Manager',
    description: 'Xem và quản lý schema của tất cả tables trong warehouse',
    image: dwSchema
  },
  {
    title: 'Real-time Sync',
    description: 'Theo dõi sync progress và data streaming real-time',
    image: dwRealtime
  }
];

// Implementation timeline
const implementationSteps = [
  { week: 1, phase: 'Discovery & Setup', tasks: ['Kick-off meeting', 'Data source audit', 'Connector configuration', 'Initial sync test'] },
  { week: 2, phase: 'Data Modeling', tasks: ['Review pre-built models', 'Custom model requirements', 'Data validation', 'User training'] },
  { week: 3, phase: 'Go-Live & Optimization', tasks: ['Production deployment', 'Dashboard setup', 'Alert configuration', 'Handover & documentation'] },
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
              <Link to="/sales-kit/fdp">
                <Button variant="outline" size="sm">
                  Xem FDP Sales Kit
                </Button>
              </Link>
              <Button onClick={handlePrint} size="sm">
                <Printer className="w-4 h-4 mr-2" />
                In / Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Cover Page */}
        <section className="relative min-h-[70vh] bg-gradient-to-br from-primary/10 via-background to-blue-500/10 py-16 px-6 flex items-center">
          <div className="max-w-6xl mx-auto w-full">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <HardDrive className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <Badge variant="secondary" className="mb-2">ENTERPRISE DATA PLATFORM</Badge>
                    <h1 className="text-4xl lg:text-5xl font-bold text-foreground">
                      Bluecore Data Warehouse
                    </h1>
                  </div>
                </div>
                <p className="text-xl text-muted-foreground mb-8">
                  Nền tảng tập trung dữ liệu doanh nghiệp, biến dữ liệu rời rạc từ 
                  hàng chục nguồn thành một <strong className="text-foreground">Single Source of Truth</strong>.
                </p>
                <div className="flex flex-wrap gap-6 text-sm mb-8">
                  <div className="flex items-center gap-2 bg-card/50 px-4 py-2 rounded-full border border-border">
                    <Users className="w-5 h-5 text-primary" />
                    <span><strong>500+</strong> doanh nghiệp</span>
                  </div>
                  <div className="flex items-center gap-2 bg-card/50 px-4 py-2 rounded-full border border-border">
                    <Database className="w-5 h-5 text-primary" />
                    <span><strong>2 tỷ+</strong> rows/tháng</span>
                  </div>
                  <div className="flex items-center gap-2 bg-card/50 px-4 py-2 rounded-full border border-border">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span><strong>99.9%</strong> uptime</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 no-print">
                  <Button size="lg">
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
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-3xl blur-3xl" />
                  <Card className="relative bg-card/80 backdrop-blur border-primary/20">
                    <CardContent className="p-8">
                      <div className="text-center mb-6">
                        <div className="text-5xl font-bold text-primary mb-2">15x</div>
                        <div className="text-muted-foreground">Average ROI</div>
                      </div>
                      <Separator className="my-6" />
                      <div className="grid grid-cols-2 gap-6 text-center">
                        <div>
                          <div className="text-2xl font-bold text-foreground">2 tuần</div>
                          <div className="text-sm text-muted-foreground">Thời gian triển khai</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-foreground">20+</div>
                          <div className="text-sm text-muted-foreground">Data sources</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-foreground">50+</div>
                          <div className="text-sm text-muted-foreground">Pre-built models</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-foreground">24/7</div>
                          <div className="text-sm text-muted-foreground">VN Support</div>
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
                { num: '01', title: 'Tính năng chi tiết', page: '3-5' },
                { num: '02', title: 'Data Sources & Connectors', page: '6' },
                { num: '03', title: 'Screenshots sản phẩm', page: '7-8' },
                { num: '04', title: 'Case Studies & ROI', page: '9-11' },
                { num: '05', title: 'So sánh với đối thủ', page: '12-13' },
                { num: '06', title: 'Bảng giá', page: '14-15' },
                { num: '07', title: 'Lộ trình triển khai', page: '16' },
                { num: '08', title: 'Liên hệ', page: '17' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                  <span className="text-2xl font-bold text-primary/50">{item.num}</span>
                  <div>
                    <div className="font-medium text-foreground">{item.title}</div>
                    <div className="text-xs text-muted-foreground">Trang {item.page}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core Features Section */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-bold text-primary/30">01</span>
              <h2 className="text-2xl font-bold text-foreground">Tính năng chi tiết</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">Mọi thứ bạn cần để quản lý dữ liệu doanh nghiệp</p>
            
            <div className="space-y-6">
              {coreFeatures.map((feature, index) => (
                <Card key={index} className="print-avoid-break">
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="md:col-span-1">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <feature.icon className="w-6 h-6 text-primary" />
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
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
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

        {/* Data Sources Section */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-bold text-primary/30">02</span>
              <h2 className="text-2xl font-bold text-foreground">Data Sources & Connectors</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">Kết nối với hầu hết các platform phổ biến tại Việt Nam</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dataSources.map((source, index) => (
                <Card key={index} className={`${source.status === 'beta' ? 'border-amber-500/30' : 'border-green-500/30'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">{source.name}</span>
                      <Badge variant={source.status === 'live' ? 'default' : 'secondary'} className="text-xs">
                        {source.status === 'live' ? 'Live' : 'Beta'}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{source.category}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Không thấy source bạn cần?</strong> Bluecore hỗ trợ Custom API Connector 
                để kết nối với bất kỳ hệ thống nào có REST API. Thời gian setup: 3-5 ngày làm việc.
              </p>
            </div>
          </div>
        </section>

        <Separator className="max-w-6xl mx-auto" />

        {/* Screenshots Section */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-bold text-primary/30">03</span>
              <h2 className="text-2xl font-bold text-foreground">Screenshots sản phẩm</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">Giao diện thực tế của Data Warehouse</p>
            
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
                    <h3 className="font-semibold text-foreground">{screenshot.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{screenshot.description}</p>
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
              <span className="text-4xl font-bold text-primary/30">04</span>
              <h2 className="text-2xl font-bold text-foreground">Case Studies & ROI</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">Kết quả thực tế từ khách hàng đang sử dụng</p>
            
            <div className="space-y-8">
              {useCases.map((useCase, index) => (
                <Card key={index} className="overflow-hidden print-avoid-break">
                  <CardHeader className="bg-muted/30 border-b border-border">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{useCase.industry}</CardTitle>
                          <p className="text-sm text-muted-foreground">{useCase.companySize} • {useCase.revenue}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="border-green-500/50 text-green-600">
                          <Clock className="w-3 h-3 mr-1" />
                          {useCase.implementation} triển khai
                        </Badge>
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
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
                          <span className="text-sm font-medium text-blue-500 uppercase">Giải pháp</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{useCase.solution}</p>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-500 uppercase">Kết quả đạt được</span>
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
                              <Badge variant="outline" className={result.improvement.startsWith('+') ? 'text-green-500 border-green-500/30' : 'text-blue-500 border-blue-500/30'}>
                                {result.improvement}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
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
              <span className="text-4xl font-bold text-primary/30">05</span>
              <h2 className="text-2xl font-bold text-foreground">So sánh với đối thủ</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">Tại sao Bluecore là lựa chọn tốt nhất cho doanh nghiệp Việt Nam</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Tiêu chí</th>
                    <th className="text-center py-4 px-4 font-bold text-primary bg-primary/5">Bluecore</th>
                    <th className="text-center py-4 px-4 font-medium text-muted-foreground">Fivetran</th>
                    <th className="text-center py-4 px-4 font-medium text-muted-foreground">Stitch</th>
                    <th className="text-center py-4 px-4 font-medium text-muted-foreground">In-house Build</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {competitorComparison.map((row, index) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="py-4 px-4 font-medium">{row.feature}</td>
                      <td className={`py-4 px-4 text-center bg-primary/5 ${row.winner === 'bluecore' ? 'font-bold text-primary' : ''}`}>
                        {row.bluecore}
                        {row.winner === 'bluecore' && <Award className="w-4 h-4 inline ml-1 text-yellow-500" />}
                      </td>
                      <td className="py-4 px-4 text-center text-muted-foreground">{row.fivetran}</td>
                      <td className="py-4 px-4 text-center text-muted-foreground">{row.stitch}</td>
                      <td className="py-4 px-4 text-center text-muted-foreground">{row.inhouse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-8 grid md:grid-cols-3 gap-6">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-primary mb-2">70%</div>
                  <div className="text-sm text-muted-foreground">Chi phí thấp hơn Fivetran</div>
                </CardContent>
              </Card>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-primary mb-2">100%</div>
                  <div className="text-sm text-muted-foreground">VN E-commerce coverage</div>
                </CardContent>
              </Card>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-primary mb-2">3x</div>
                  <div className="text-sm text-muted-foreground">Nhanh hơn self-build</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <Separator className="max-w-6xl mx-auto" />

        {/* Pricing Section */}
        <section className="py-16 px-6 print-break">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-bold text-primary/30">06</span>
              <h2 className="text-2xl font-bold text-foreground">Bảng giá</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">Chọn gói phù hợp với quy mô doanh nghiệp</p>
            
            <div className="grid md:grid-cols-3 gap-6">
              {pricingPlans.map((plan, index) => (
                <Card 
                  key={index} 
                  className={`relative print-avoid-break ${plan.highlighted ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-border/50'}`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Phổ biến nhất</Badge>
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
                            <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                          )}
                          <span className={feature.included ? 'text-muted-foreground' : 'text-muted-foreground/50'}>{feature.text}</span>
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
            
            <div className="mt-8 p-6 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-foreground mb-4">Chính sách thanh toán</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-muted-foreground">Thanh toán theo tháng hoặc năm (giảm 15% khi thanh toán năm)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-muted-foreground">Chấp nhận chuyển khoản ngân hàng và thẻ tín dụng</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-muted-foreground">Xuất hóa đơn VAT đầy đủ</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-muted-foreground">Dùng thử miễn phí 14 ngày (không cần thẻ tín dụng)</span>
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
              <span className="text-4xl font-bold text-primary/30">07</span>
              <h2 className="text-2xl font-bold text-foreground">Lộ trình triển khai</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">Từ kick-off đến go-live trong 2-3 tuần</p>
            
            <div className="relative">
              <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-8">
                {implementationSteps.map((step, index) => (
                  <div key={index} className="relative flex gap-6">
                    <div className="relative z-10 w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                      W{step.week}
                    </div>
                    <Card className="flex-1">
                      <CardContent className="p-6">
                        <h3 className="font-semibold text-foreground text-lg mb-4">{step.phase}</h3>
                        <div className="grid md:grid-cols-2 gap-3">
                          {step.tasks.map((task, tIndex) => (
                            <div key={tIndex} className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
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
        <section className="py-16 px-6 bg-primary/5 print-break">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-bold text-primary/30">08</span>
              <h2 className="text-2xl font-bold text-foreground">Liên hệ</h2>
            </div>
            <p className="text-muted-foreground mb-8 ml-14">Sẵn sàng tập trung dữ liệu doanh nghiệp?</p>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-foreground mb-6">Đăng ký Demo miễn phí</h3>
                  <p className="text-muted-foreground mb-6">
                    Đăng ký demo 30 phút để xem Data Warehouse hoạt động với dữ liệu thực của bạn. 
                    Chúng tôi sẽ setup sandbox với data mẫu từ industry của bạn.
                  </p>
                  <div className="space-y-4 no-print">
                    <Button className="w-full" size="lg">
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
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Hotline</div>
                        <div className="font-medium text-foreground">1900 xxxx (8h-18h T2-T6)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Email</div>
                        <div className="font-medium text-foreground">sales@bluecore.vn</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-primary" />
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
              <HardDrive className="w-5 h-5 text-primary" />
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
