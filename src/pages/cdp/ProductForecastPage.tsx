/**
 * CDP Product Forecast Page
 * Ước lượng doanh số sản phẩm mới dựa trên affinity matching + benchmark
 */
import { useState } from 'react';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Users, Package, CalendarIcon } from 'lucide-react';
import { ProductForecastForm } from '@/components/cdp/product-forecast/ProductForecastForm';
import { ProductForecastList } from '@/components/cdp/product-forecast/ProductForecastList';
import { useProductForecasts, useCategoryConversionStats, useActiveCustomerCount } from '@/hooks/cdp/useProductForecast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

export default function ProductForecastPage() {
  const [showForm, setShowForm] = useState(false);
  
  // Default: last 90 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 90),
    to: new Date(),
  });
  
  const { data: forecasts, isLoading: forecastsLoading } = useProductForecasts();
  const { data: categoryStats, isLoading: statsLoading } = useCategoryConversionStats();
  const { data: activeCustomerCount, isLoading: customerCountLoading } = useActiveCustomerCount(
    dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
  );

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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-muted-foreground">KH active trong</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-6 text-xs justify-start font-normal",
                            !dateRange && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "dd/MM/yy", { locale: vi })} - {format(dateRange.to, "dd/MM/yy", { locale: vi })}
                              </>
                            ) : (
                              format(dateRange.from, "dd/MM/yy", { locale: vi })
                            )
                          ) : (
                            <span>Chọn khoảng thời gian</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange?.from}
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={2}
                          locale={vi}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
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
