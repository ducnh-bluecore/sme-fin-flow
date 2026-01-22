import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { 
  Users,
  Search,
  Filter,
  Save,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CDPLayout } from '@/components/layout/CDPLayout';

// Mock customer data
const mockCustomers = [
  { id: 'C001', name: 'Nguyễn Văn A', totalRevenue: 15200000, orders: 8, avgOrderValue: 1900000, lastPurchase: '2025-01-15', trend: 'up' as const },
  { id: 'C002', name: 'Trần Thị B', totalRevenue: 8500000, orders: 5, avgOrderValue: 1700000, lastPurchase: '2025-01-10', trend: 'stable' as const },
  { id: 'C003', name: 'Lê Hoàng C', totalRevenue: 25000000, orders: 12, avgOrderValue: 2083333, lastPurchase: '2025-01-18', trend: 'up' as const },
  { id: 'C004', name: 'Phạm Thị D', totalRevenue: 4200000, orders: 3, avgOrderValue: 1400000, lastPurchase: '2024-12-20', trend: 'down' as const },
  { id: 'C005', name: 'Hoàng Văn E', totalRevenue: 18900000, orders: 10, avgOrderValue: 1890000, lastPurchase: '2025-01-17', trend: 'stable' as const },
];

// Mock saved views
const mockSavedViews = [
  { id: 'V001', name: 'Top 20% giá trị', creator: 'Admin', createdAt: '2025-01-10', customerCount: 245, revenueShare: 65 },
  { id: 'V002', name: 'Khách hàng có rủi ro hoàn trả cao', creator: 'CFO', createdAt: '2025-01-15', customerCount: 89, revenueShare: 12 },
  { id: 'V003', name: 'Cohort Q4-2024', creator: 'Growth', createdAt: '2025-01-08', customerCount: 456, revenueShare: 18 },
];

function formatCurrency(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString('vi-VN');
}

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-success" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<'customers' | 'filters' | 'saved'>('customers');
  const [searchTerm, setSearchTerm] = useState('');

  // Summary stats
  const summaryStats = {
    totalCustomers: mockCustomers.length,
    totalRevenue: mockCustomers.reduce((sum, c) => sum + c.totalRevenue, 0),
    avgAOV: mockCustomers.reduce((sum, c) => sum + c.avgOrderValue, 0) / mockCustomers.length,
    avgOrders: mockCustomers.reduce((sum, c) => sum + c.orders, 0) / mockCustomers.length,
  };

  return (
    <CDPLayout>
      <Helmet>
        <title>Khám phá | CDP - Bluecore</title>
        <meta name="description" content="Khám phá và nghiên cứu dữ liệu khách hàng" />
      </Helmet>

      <div className="space-y-6 max-w-6xl">
        {/* Page Header */}
        <div>
          <h1 className="text-xl font-semibold mb-1">Khám phá</h1>
          <p className="text-sm text-muted-foreground">Chế độ nghiên cứu dữ liệu khách hàng</p>
        </div>

        {/* Explainer */}
        <Card className="border-border bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">
                  Chế độ nghiên cứu cho phép bạn tự tìm insight mới từ dữ liệu
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Xem danh sách khách hàng, áp dụng bộ lọc hành vi, và lưu các góc nhìn nghiên cứu. 
                  Dữ liệu chỉ đọc - không có hành động export, trigger hoặc gán nhiệm vụ.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">Số khách hàng</p>
              <p className="text-2xl font-bold">{summaryStats.totalCustomers.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">Tổng doanh thu</p>
              <p className="text-2xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">AOV trung bình</p>
              <p className="text-2xl font-bold">{formatCurrency(summaryStats.avgAOV)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">Số đơn TB</p>
              <p className="text-2xl font-bold">{summaryStats.avgOrders.toFixed(1)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Danh sách Khách hàng
            </TabsTrigger>
            <TabsTrigger value="filters" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Bộ lọc Hành vi
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Góc nhìn đã lưu ({mockSavedViews.length})
            </TabsTrigger>
          </TabsList>

          {/* Customer List */}
          <TabsContent value="customers" className="mt-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Tìm kiếm khách hàng..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Bộ lọc
              </Button>
            </div>

            <Card>
              <ScrollArea className="h-[400px]">
                <div className="divide-y">
                  {mockCustomers.map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">ID: {customer.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(customer.totalRevenue)}</p>
                          <p className="text-xs text-muted-foreground">Doanh thu</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{customer.orders}</p>
                          <p className="text-xs text-muted-foreground">Đơn hàng</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(customer.avgOrderValue)}</p>
                          <p className="text-xs text-muted-foreground">AOV</p>
                        </div>
                        <TrendIndicator trend={customer.trend} />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Hiển thị 1-{mockCustomers.length} trong tổng số {mockCustomers.length} khách hàng</span>
              <span className="text-xs">Chỉ đọc • Không export • Không trigger</span>
            </div>
          </TabsContent>

          {/* Behavioral Filters */}
          <TabsContent value="filters" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bộ lọc Hành vi</CardTitle>
                <CardDescription>Lọc khách hàng theo các tiêu chí hành vi và giá trị</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tần suất mua</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option>Tất cả</option>
                      <option>≥ 5 lần / năm</option>
                      <option>≥ 10 lần / năm</option>
                      <option>≤ 2 lần / năm</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Xu hướng chi tiêu</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option>Tất cả</option>
                      <option>Tăng &gt; 20%</option>
                      <option>Giảm &gt; 20%</option>
                      <option>Ổn định</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Thời gian mua lại</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option>Tất cả</option>
                      <option>≤ 30 ngày</option>
                      <option>31-60 ngày</option>
                      <option>&gt; 90 ngày</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tỷ lệ hoàn trả</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option>Tất cả</option>
                      <option>&lt; 5%</option>
                      <option>5-15%</option>
                      <option>&gt; 15%</option>
                    </select>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">Kết quả: </span>
                    <span className="text-muted-foreground">2,456 khách hàng • 42% doanh thu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Xem danh sách
                    </Button>
                    <Button size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      Lưu góc nhìn
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Saved Views */}
          <TabsContent value="saved" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {mockSavedViews.map((view) => (
                <Card key={view.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{view.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tạo bởi {view.creator} • {view.createdAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-medium">{view.customerCount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Khách hàng</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{view.revenueShare}%</p>
                          <p className="text-xs text-muted-foreground">Tỷ trọng DT</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Xem
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </CDPLayout>
  );
}
