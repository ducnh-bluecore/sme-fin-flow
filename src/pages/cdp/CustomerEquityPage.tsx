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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { CDPEmptyState, CDPManifestoNotice } from '@/components/cdp/CDPEmptyState';
import { 
  useCDPEquityOverview, 
  useCDPEquityDistribution, 
  useCDPEquityDrivers,
  useCDPLTVModels,
  useCDPEquityEvidence
} from '@/hooks/useCDPEquity';
import { CDP_MINIMUM_THRESHOLDS, type CDPDataQuality, createUnavailableMetric } from '@/types/cdp-ssot';
import { useNavigate } from 'react-router-dom';

function formatCurrency(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString('vi-VN') + ' đ';
}

export default function CustomerEquityPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'model' | 'drivers' | 'evidence'>('overview');
  const navigate = useNavigate();

  // DB-First: All data from pre-computed views
  const { data: equityData, isLoading: isLoadingEquity, error: equityError } = useCDPEquityOverview();
  const { data: distribution, isLoading: isLoadingDistribution } = useCDPEquityDistribution();
  const { data: drivers, isLoading: isLoadingDrivers } = useCDPEquityDrivers();
  const { data: ltvModels, isLoading: isLoadingModels } = useCDPLTVModels();
  const { data: evidence, isLoading: isLoadingEvidence } = useCDPEquityEvidence();

  const isLoading = isLoadingEquity || isLoadingDistribution || isLoadingDrivers;

  // CDP Manifesto: Show empty state if no data - NO FALLBACKS
  if (!isLoading && (!equityData || equityError)) {
    const dataQuality: CDPDataQuality = {
      overall_score: 0,
      quality_level: 'insufficient',
      identity_coverage: createUnavailableMetric(0, 'Không có dữ liệu'),
      cogs_coverage: createUnavailableMetric(0, 'Không có dữ liệu'),
      order_coverage: createUnavailableMetric(0, 'Không có dữ liệu'),
      days_since_last_order: 999,
      data_freshness_level: 'very_stale',
      minimum_customers_required: CDP_MINIMUM_THRESHOLDS.MIN_CUSTOMERS_FOR_EQUITY,
      minimum_orders_required: CDP_MINIMUM_THRESHOLDS.MIN_ORDERS_FOR_LTV,
      actual_customers: 0,
      actual_orders: 0,
      is_sufficient_for_insights: false,
      is_sufficient_for_equity: false,
      issues: [{
        id: 'no_equity_data',
        severity: 'critical',
        label: 'Chưa có dữ liệu Customer Equity',
        action: 'Import dữ liệu đơn hàng để tính toán LTV'
      }]
    };

    return (
      <CDPLayout>
        <Helmet>
          <title>Giá trị Khách hàng | CDP - Bluecore</title>
        </Helmet>
        <div className="space-y-6 max-w-6xl">
          <div>
            <h1 className="text-xl font-semibold mb-1">Giá trị Khách hàng</h1>
            <p className="text-sm text-muted-foreground">Customer Equity - Tài sản doanh thu tương lai</p>
          </div>
          <CDPEmptyState
            reason="Chưa đủ dữ liệu để tính Customer Equity. Cần import đơn hàng khách hàng để CDP có thể phân tích LTV."
            dataQuality={dataQuality}
            onImportClick={() => navigate('/connectors')}
          />
          <CDPManifestoNotice />
        </div>
      </CDPLayout>
    );
  }

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

        {/* Key Metrics - FROM DB */}
        {isLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : equityData && (
          <div className="grid grid-cols-4 gap-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground mb-1">Tổng Equity (12 tháng)</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(equityData.total_equity_12m)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {equityData.equity_change >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-success" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-destructive" />
                  )}
                  <span className={`text-xs ${equityData.equity_change >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {equityData.equity_change >= 0 ? '+' : ''}{equityData.equity_change.toFixed(1)}% YoY
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground mb-1">Tổng Equity (24 tháng)</p>
                <p className="text-2xl font-bold">{formatCurrency(equityData.total_equity_24m)}</p>
              </CardContent>
            </Card>
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground mb-1">Giá trị có rủi ro</p>
                <p className="text-2xl font-bold text-warning-foreground">{formatCurrency(equityData.at_risk_value)}</p>
                <span className="text-xs text-warning-foreground">{equityData.at_risk_percent.toFixed(1)}% tổng equity</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground mb-1">Cập nhật lần cuối</p>
                <p className="text-lg font-bold">LTV Cơ sở</p>
                <span className="text-xs text-muted-foreground">
                  {equityData.last_updated ? new Date(equityData.last_updated).toLocaleDateString('vi-VN') : 'N/A'}
                </span>
              </CardContent>
            </Card>
          </div>
        )}

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

          {/* Overview - FROM DB */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Phân bổ Equity theo Tập khách hàng</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingDistribution ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : distribution && distribution.length > 0 ? (
                  <div className="space-y-4">
                    {distribution.map((segment) => (
                      <div key={segment.segment_id} className="flex items-center gap-4">
                        <div className="w-20 font-medium">{segment.segment_name}</div>
                        <div className="flex-1">
                          <Progress value={segment.share_percent} className="h-3" />
                        </div>
                        <div className="w-32 text-right font-medium">{formatCurrency(segment.equity)}</div>
                        <div className="w-16 text-right text-sm text-muted-foreground">{segment.share_percent}%</div>
                        <Badge 
                          variant="outline" 
                          className={
                            segment.display_status === 'normal' ? 'bg-success/10 text-success border-success/20' :
                            segment.display_status === 'at_risk' ? 'bg-warning/10 text-warning-foreground border-warning/20' :
                            'bg-destructive/10 text-destructive border-destructive/20'
                          }
                        >
                          {segment.display_status === 'normal' ? 'Thấp' : segment.display_status === 'at_risk' ? 'TB' : 'Cao'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu phân bổ equity</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LTV Model - FROM DB */}
          <TabsContent value="model" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Các kịch bản LTV</CardTitle>
                <CardDescription>So sánh giá trị equity dưới các giả định khác nhau</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingModels ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : ltvModels && ltvModels.length > 0 ? (
                  <div className="space-y-4">
                    {ltvModels.map((model) => (
                      <Card key={model.model_id} className={model.is_active ? 'border-primary' : ''}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{model.name}</h3>
                                {model.is_active && <Badge variant="outline" className="text-xs">Đang dùng</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
                            </div>
                            <p className="text-xl font-bold">{formatCurrency(model.total_equity)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Chưa có mô hình LTV nào</p>
                )}

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Công thức LTV đang dùng</p>
                  <code className="text-xs text-muted-foreground">
                    LTV = AOV × Tần suất mua/năm × Số năm dự kiến × (1 - Tỷ lệ hoàn trả)
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Value Drivers - FROM DB */}
          <TabsContent value="drivers" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Các yếu tố làm giảm Equity</CardTitle>
                <CardDescription>Phân tích các động lực ảnh hưởng đến giá trị khách hàng</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDrivers ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : drivers && drivers.length > 0 ? (
                  <div className="space-y-4">
                    {drivers.map((driver) => (
                      <div key={driver.driver_id} className="flex items-center justify-between p-3 border rounded-lg">
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
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu về các yếu tố ảnh hưởng</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evidence - FROM DB */}
          <TabsContent value="evidence" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Khách hàng đại diện</CardTitle>
                <CardDescription>3-5 khách hàng minh họa cho phân bổ equity</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingEvidence ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : evidence && evidence.length > 0 ? (
                  <div className="space-y-3">
                    {evidence.map((customer) => (
                      <div key={customer.customer_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{customer.anonymized_id}</p>
                            <p className="text-xs text-muted-foreground">{customer.segment}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(customer.estimated_ltv)}</p>
                            <p className="text-xs text-muted-foreground">LTV ước tính</p>
                          </div>
                          {customer.behavior_status === 'at_risk' && (
                            <AlertTriangle className="w-4 h-4 text-warning-foreground" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu khách hàng đại diện</p>
                )}

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
