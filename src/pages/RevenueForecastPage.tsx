import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRevenueForecast, type ForecastParams, type ForecastMonth } from '@/hooks/useRevenueForecast';
import { useBacktestActuals } from '@/hooks/useBacktestActuals';
import { ForecastInputPanel } from '@/components/revenue-forecast/ForecastInputPanel';
import { ForecastSummaryCards } from '@/components/revenue-forecast/ForecastSummaryCards';
import { ForecastChart } from '@/components/revenue-forecast/ForecastChart';
import { CohortBreakdownTable } from '@/components/revenue-forecast/CohortBreakdownTable';
import { ForecastMethodologyInfo } from '@/components/revenue-forecast/ForecastMethodologyInfo';
import { Loader2, TrendingUp } from 'lucide-react';

export default function RevenueForecastPage() {
  const { t } = useLanguage();
  const [params, setParams] = useState<ForecastParams>({
    horizonMonths: 3,
    adsSpend: 0,
    roasOverride: null,
    growthAdj: 0,
  });

  const { data, isLoading, error } = useRevenueForecast(params);

  const isBacktest = !!params.asOfDate;
  const forecastMonths = useMemo(() => data?.map((d) => d.month) || [], [data]);

  const { data: actualsMap, isLoading: actualsLoading } = useBacktestActuals(
    forecastMonths,
    isBacktest && !!data && data.length > 0,
  );

  // Merge actual data into forecast data
  const mergedData = useMemo<ForecastMonth[] | null>(() => {
    if (!data) return null;
    if (!isBacktest || !actualsMap) return data;
    return data.map((fm) => ({
      ...fm,
      actual_revenue: actualsMap[fm.month] ?? undefined,
    }));
  }, [data, actualsMap, isBacktest]);

  const hasAdsData = mergedData?.[0]?.has_ads_data ?? false;
  const historicalAvgAdsSpend = mergedData?.[0]?.historical_avg_ads_spend ?? null;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Dự báo Doanh thu</h1>
        <span className="text-xs text-muted-foreground ml-2">Cohort-based Forecast</span>
      </div>

      <ForecastMethodologyInfo hasAdsData={hasAdsData} />

      <ForecastInputPanel
        params={params}
        onChange={setParams}
        isLoading={isLoading}
        historicalAvgAdsSpend={historicalAvgAdsSpend}
        hasAdsData={hasAdsData}
      />

      {(isLoading || actualsLoading) && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Đang tính toán dự báo...</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Lỗi khi tính toán: {(error as Error).message}
        </div>
      )}

      {mergedData && mergedData.length > 0 && (
        <>
          <ForecastSummaryCards data={mergedData} isBacktest={isBacktest} />
          <ForecastChart data={mergedData} isBacktest={isBacktest} />
          <CohortBreakdownTable data={mergedData} isBacktest={isBacktest} />
        </>
      )}

      {mergedData && mergedData.length === 0 && !isLoading && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Chưa có dữ liệu đơn hàng để tạo dự báo. Vui lòng đồng bộ dữ liệu trước.
        </div>
      )}
    </div>
  );
}
