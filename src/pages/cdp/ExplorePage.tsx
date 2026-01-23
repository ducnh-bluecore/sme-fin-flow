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
  Info,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { useCDPCustomerResearch, useCDPResearchStats, useCDPSavedViews } from '@/hooks/useCDPExplore';
import { formatVNDCompact } from '@/lib/formatters';

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-success" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<'customers' | 'filters' | 'saved'>('customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const { data: statsData, isLoading: statsLoading } = useCDPResearchStats();
  const { data: customersData, isLoading: customersLoading } = useCDPCustomerResearch(page, 10);
  const { data: savedViews, isLoading: savedViewsLoading } = useCDPSavedViews();

  const stats = statsData || {
    customerCount: 0,
    totalRevenue: 0,
    medianAOV: 0,
    medianRepurchaseCycle: 30,
    returnRate: 0,
    promotionDependency: 0,
  };

  const customers = customersData?.customers || [];
  const totalCount = customersData?.totalCount || 0;

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
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">{stats.customerCount.toLocaleString()}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">Tổng doanh thu</p>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">{formatVNDCompact(stats.totalRevenue)}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">AOV trung vị</p>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">{formatVNDCompact(stats.medianAOV)}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">Chu kỳ mua lại</p>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">{stats.medianRepurchaseCycle.toFixed(0)} ngày</p>
              )}
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
              Góc nhìn đã lưu ({savedViews?.length || 0})
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
                {customersLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : customers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Users className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm">Chưa có dữ liệu khách hàng</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {customers.map((customer) => (
                      <div key={customer.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{customer.anonymousId}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {customer.behaviorStatus === 'active' && 'Hoạt động'}
                              {customer.behaviorStatus === 'dormant' && 'Ngủ đông'}
                              {customer.behaviorStatus === 'at_risk' && 'Có rủi ro'}
                              {customer.behaviorStatus === 'new' && 'Mới'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="font-medium">{formatVNDCompact(customer.totalSpend)}</p>
                            <p className="text-xs text-muted-foreground">Tổng chi tiêu</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{customer.orderCount}</p>
                            <p className="text-xs text-muted-foreground">Đơn hàng</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatVNDCompact(customer.aov)}</p>
                            <p className="text-xs text-muted-foreground">AOV</p>
                          </div>
                          <TrendIndicator trend={customer.trend} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Hiển thị {customers.length} trong tổng số {totalCount.toLocaleString()} khách hàng</span>
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
                    <span className="text-muted-foreground">{stats.customerCount.toLocaleString()} khách hàng</span>
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
            {savedViewsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedViews && savedViews.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {savedViews.map((view) => (
                  <Card key={view.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{view.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Tạo bởi {view.creator || 'Unknown'} • {view.createdAt.toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="font-medium">{view.customerCount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Khách hàng</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{view.revenueShare.toFixed(1)}%</p>
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
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Save className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-sm font-medium mb-1">Chưa có góc nhìn nào được lưu</p>
                  <p className="text-xs text-muted-foreground">
                    Sử dụng bộ lọc để tạo góc nhìn nghiên cứu và lưu lại
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CDPLayout>
  );
}
