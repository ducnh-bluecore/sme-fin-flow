import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { 
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Info,
  Settings,
  ChevronRight,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { CDPLayout } from '@/components/layout/CDPLayout';

function formatCurrency(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString('vi-VN') + ' đ';
}

// Mock data
const equityData = {
  total12M: 45000000000, // 45 tỷ
  total24M: 72000000000, // 72 tỷ
  atRiskPercent: 18,
  atRiskValue: 8100000000, // 8.1 tỷ
  growthPercent: 12,
};

const segmentEquity = [
  { name: 'TOP10', equity: 22500000000, share: 50, risk: 'low', customers: 1200 },
  { name: 'TOP20', equity: 9000000000, share: 20, risk: 'low', customers: 1200 },
  { name: 'TOP30', equity: 6750000000, share: 15, risk: 'medium', customers: 1200 },
  { name: 'Còn lại', equity: 6750000000, share: 15, risk: 'high', customers: 8400 },
];

const valueDrivers = [
  { factor: 'Chậm mua lại', impact: -2100000000, direction: 'down' as const, severity: 'high' },
  { factor: 'Giảm AOV', impact: -1500000000, direction: 'down' as const, severity: 'medium' },
  { factor: 'Tăng hoàn trả', impact: -800000000, direction: 'down' as const, severity: 'medium' },
  { factor: 'Phụ thuộc KM', impact: -600000000, direction: 'down' as const, severity: 'low' },
];

const ltmScenarios = [
  { name: 'Thận trọng', value: 38000000000, description: 'Giả định retention thấp, AOV giảm 10%' },
  { name: 'Cơ sở', value: 45000000000, description: 'Giữ nguyên xu hướng hiện tại' },
  { name: 'Lạc quan', value: 54000000000, description: 'Retention tăng 5%, AOV tăng 8%' },
];

export default function CustomerEquityPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'model' | 'drivers' | 'evidence'>('overview');

  return (
    <CDPLayout>
      <Helmet>
        <title>Giá trị Khách hàng | CDP - Bluecore</title>
        <meta name="description" content="Customer Equity - Giá trị tài sản khách hàng" />
      </Helmet>

      <div className="space-y-6 max-w-6xl">
        {/* Page Header */}
        <div>
          <h1 className="text-xl font-semibold mb-1">Giá trị Khách hàng</h1>
          <p className="text-sm text-muted-foreground">Customer Equity - Tài sản doanh thu tương lai</p>
        </div>

        {/* Explainer */}
        <Card className="border-border bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">
                  Customer Equity = Tổng giá trị kỳ vọng từ khách hàng hiện tại
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Đây là dự báo doanh thu tương lai dựa trên mô hình LTV. Giá trị có thể thay đổi 
                  khi điều chỉnh giả định hoặc khi hành vi khách hàng thay đổi.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">Tổng Equity (12 tháng)</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(equityData.total12M)}</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-success" />
                <span className="text-xs text-success">+{equityData.growthPercent}% YoY</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">Tổng Equity (24 tháng)</p>
              <p className="text-2xl font-bold">{formatCurrency(equityData.total24M)}</p>
            </CardContent>
          </Card>
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">Giá trị có rủi ro</p>
              <p className="text-2xl font-bold text-warning-foreground">{formatCurrency(equityData.atRiskValue)}</p>
              <span className="text-xs text-warning-foreground">{equityData.atRiskPercent}% tổng equity</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">Mô hình đang dùng</p>
              <p className="text-lg font-bold">LTV Cơ sở</p>
              <span className="text-xs text-muted-foreground">v2.1 • Cập nhật 15/01</span>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="model" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Mô hình Giả định
            </TabsTrigger>
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Động lực Ảnh hưởng
            </TabsTrigger>
            <TabsTrigger value="evidence" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Bằng chứng
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Phân bổ Equity theo Tập khách hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {segmentEquity.map((segment) => (
                    <div key={segment.name} className="flex items-center gap-4">
                      <div className="w-20 font-medium">{segment.name}</div>
                      <div className="flex-1">
                        <Progress value={segment.share} className="h-3" />
                      </div>
                      <div className="w-32 text-right font-medium">{formatCurrency(segment.equity)}</div>
                      <div className="w-16 text-right text-sm text-muted-foreground">{segment.share}%</div>
                      <Badge 
                        variant="outline" 
                        className={
                          segment.risk === 'low' ? 'bg-success/10 text-success border-success/20' :
                          segment.risk === 'medium' ? 'bg-warning/10 text-warning-foreground border-warning/20' :
                          'bg-destructive/10 text-destructive border-destructive/20'
                        }
                      >
                        {segment.risk === 'low' ? 'Thấp' : segment.risk === 'medium' ? 'TB' : 'Cao'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LTV Model */}
          <TabsContent value="model" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Các kịch bản LTV</CardTitle>
                <CardDescription>So sánh giá trị equity dưới các giả định khác nhau</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ltmScenarios.map((scenario, idx) => (
                    <Card key={scenario.name} className={idx === 1 ? 'border-primary' : ''}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{scenario.name}</h3>
                              {idx === 1 && <Badge variant="outline" className="text-xs">Đang dùng</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{scenario.description}</p>
                          </div>
                          <p className="text-xl font-bold">{formatCurrency(scenario.value)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Công thức LTV đang dùng</p>
                  <code className="text-xs text-muted-foreground">
                    LTV = AOV × Tần suất mua/năm × Số năm dự kiến × (1 - Tỷ lệ hoàn trả)
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Value Drivers */}
          <TabsContent value="drivers" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Các yếu tố làm giảm Equity</CardTitle>
                <CardDescription>Phân tích các động lực ảnh hưởng đến giá trị khách hàng</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {valueDrivers.map((driver) => (
                    <div key={driver.factor} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          driver.severity === 'high' ? 'bg-destructive/10' : 'bg-warning/10'
                        }`}>
                          <TrendingDown className={`w-4 h-4 ${
                            driver.severity === 'high' ? 'text-destructive' : 'text-warning-foreground'
                          }`} />
                        </div>
                        <span className="font-medium">{driver.factor}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-destructive font-medium">{formatCurrency(driver.impact)}</span>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evidence */}
          <TabsContent value="evidence" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Khách hàng đại diện</CardTitle>
                <CardDescription>3-5 khách hàng minh họa cho phân bổ equity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Nguyễn Văn A', segment: 'TOP10', ltv: 15200000, risk: false },
                    { name: 'Trần Thị B', segment: 'TOP10', ltv: 12800000, risk: false },
                    { name: 'Lê Hoàng C', segment: 'TOP20', ltv: 8500000, risk: true },
                    { name: 'Phạm Văn D', segment: 'TOP30', ltv: 4200000, risk: true },
                    { name: 'Hoàng Thị E', segment: 'Còn lại', ltv: 1200000, risk: false },
                  ].map((customer) => (
                    <div key={customer.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.segment}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(customer.ltv)}</p>
                          <p className="text-xs text-muted-foreground">LTV ước tính</p>
                        </div>
                        {customer.risk && (
                          <AlertTriangle className="w-4 h-4 text-warning-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Timeline hành vi chi tiết: Chỉ đọc • Không có hành động
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CDPLayout>
  );
}
