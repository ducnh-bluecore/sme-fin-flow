/**
 * CDP Product Forecast Page
 * Ước lượng doanh số sản phẩm mới dựa trên affinity matching + benchmark
 */
import { useState, useMemo } from 'react';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Users, Package, CalendarIcon } from 'lucide-react';
import { ProductForecastForm } from '@/components/cdp/product-forecast/ProductForecastForm';
import { ProductForecastList } from '@/components/cdp/product-forecast/ProductForecastList';
import { useProductForecasts, useCategoryConversionStats, useActiveCustomerCount } from '@/hooks/cdp/useProductForecast';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfQuarter, startOfYear } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// Date range presets
const DATE_PRESETS = {
  '30': { label: '30 ngày qua', getDates: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  '60': { label: '60 ngày qua', getDates: () => ({ from: subDays(new Date(), 59), to: new Date() }) },
  '90': { label: '90 ngày qua', getDates: () => ({ from: subDays(new Date(), 89), to: new Date() }) },
  '180': { label: '180 ngày qua', getDates: () => ({ from: subDays(new Date(), 179), to: new Date() }) },
  '365': { label: '1 năm qua', getDates: () => ({ from: subDays(new Date(), 364), to: new Date() }) },
  '730': { label: '2 năm qua', getDates: () => ({ from: subDays(new Date(), 729), to: new Date() }) },
  'this_month': { label: 'Tháng này', getDates: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  'last_month': { label: 'Tháng trước', getDates: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  'this_quarter': { label: 'Quý này', getDates: () => ({ from: startOfQuarter(new Date()), to: new Date() }) },
  'this_year': { label: 'Năm nay', getDates: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  'custom': { label: 'Tùy chỉnh', getDates: () => ({ from: subDays(new Date(), 89), to: new Date() }) },
} as const;

type DatePresetKey = keyof typeof DATE_PRESETS;

export default function ProductForecastPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DatePresetKey>('90');
  const [customFromDate, setCustomFromDate] = useState<Date>(subDays(new Date(), 89));
  const [customToDate, setCustomToDate] = useState<Date>(new Date());
  
  // Calculate dates from preset or custom
  const dateRange = useMemo(() => {
    if (selectedPreset === 'custom') {
      return { from: customFromDate, to: customToDate };
    }
    return DATE_PRESETS[selectedPreset].getDates();
  }, [selectedPreset, customFromDate, customToDate]);
  
  const { data: forecasts, isLoading: forecastsLoading } = useProductForecasts();
  const { data: categoryStats, isLoading: statsLoading } = useCategoryConversionStats();
  const { data: activeCustomerCount, isLoading: customerCountLoading } = useActiveCustomerCount(
    format(dateRange.from, 'yyyy-MM-dd'),
    format(dateRange.to, 'yyyy-MM-dd')
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
                    <Select value={selectedPreset} onValueChange={(v) => setSelectedPreset(v as DatePresetKey)}>
                      <SelectTrigger className="h-6 text-xs w-auto min-w-[120px] font-normal">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {Object.entries(DATE_PRESETS).map(([key, { label }]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Custom date pickers */}
                  {selectedPreset === 'custom' && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn("h-7 text-xs justify-start font-normal gap-1")}
                          >
                            <CalendarIcon className="h-3 w-3" />
                            {format(customFromDate, "dd/MM/yyyy", { locale: vi })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-popover" align="start">
                          <Calendar
                            mode="single"
                            selected={customFromDate}
                            onSelect={(date) => date && setCustomFromDate(date)}
                            disabled={(date) => date > customToDate || date > new Date()}
                            locale={vi}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      
                      <span className="text-xs text-muted-foreground">đến</span>
                      
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn("h-7 text-xs justify-start font-normal gap-1")}
                          >
                            <CalendarIcon className="h-3 w-3" />
                            {format(customToDate, "dd/MM/yyyy", { locale: vi })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-popover" align="start">
                          <Calendar
                            mode="single"
                            selected={customToDate}
                            onSelect={(date) => date && setCustomToDate(date)}
                            disabled={(date) => date < customFromDate || date > new Date()}
                            locale={vi}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
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
