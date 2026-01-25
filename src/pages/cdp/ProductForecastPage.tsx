/**
 * CDP Product Forecast Page
 * Ước lượng doanh số sản phẩm mới dựa trên affinity matching + benchmark
 */
import { useState } from 'react';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Users, Package } from 'lucide-react';
import { ProductForecastForm } from '@/components/cdp/product-forecast/ProductForecastForm';
import { ProductForecastList } from '@/components/cdp/product-forecast/ProductForecastList';
import { useProductForecasts, useCategoryConversionStats, useActiveCustomerCount } from '@/hooks/cdp/useProductForecast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TIMEFRAME_OPTIONS = [
  { value: '30', label: '30 ngày' },
  { value: '60', label: '60 ngày' },
  { value: '90', label: '90 ngày' },
  { value: '180', label: '180 ngày' },
  { value: '365', label: '365 ngày' },
];

export default function ProductForecastPage() {
  const [showForm, setShowForm] = useState(false);
  const [activeTimeframeDays, setActiveTimeframeDays] = useState<number>(90);
  
  const { data: forecasts, isLoading: forecastsLoading } = useProductForecasts();
  const { data: categoryStats, isLoading: statsLoading } = useCategoryConversionStats();
  const { data: activeCustomerCount, isLoading: customerCountLoading } = useActiveCustomerCount(activeTimeframeDays);

  const isLoading = forecastsLoading || statsLoading || customerCountLoading;

  // Summary stats
  const totalForecasts = forecasts?.length || 0;
  const activeForecasts = forecasts?.filter(f => f.status === 'active').length || 0;
  const totalCategories = categoryStats?.length || 0;

  return (
    <CDPLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dự báo Sản phẩm</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ước lượng doanh số sản phẩm mới dựa trên dữ liệu khách hàng và sản phẩm tương tự
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Tạo Dự báo mới
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{activeForecasts}</p>
                  <p className="text-sm text-muted-foreground">Dự báo đang theo dõi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-semibold">
                    {activeCustomerCount?.toLocaleString() || 0}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">KH active trong</p>
                    <Select 
                      value={String(activeTimeframeDays)} 
                      onValueChange={(v) => setActiveTimeframeDays(Number(v))}
                    >
                      <SelectTrigger className="h-6 w-[90px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEFRAME_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Package className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{totalCategories}</p>
                  <p className="text-sm text-muted-foreground">Danh mục có dữ liệu</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {showForm ? (
          <ProductForecastForm onClose={() => setShowForm(false)} />
        ) : (
          <>
            {isLoading ? (
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                </CardContent>
              </Card>
            ) : totalForecasts === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Chưa có dự báo nào</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tạo dự báo đầu tiên để ước lượng doanh số sản phẩm mới
                  </p>
                  <Button onClick={() => setShowForm(true)}>Tạo Dự báo mới</Button>
                </CardContent>
              </Card>
            ) : (
              <ProductForecastList forecasts={forecasts || []} />
            )}
          </>
        )}
      </div>
    </CDPLayout>
  );
}
