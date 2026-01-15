import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';
import { addMonths, format, startOfMonth } from 'date-fns';
import { useCentralFinancialMetrics } from './useCentralFinancialMetrics';

export interface RollingForecastItem {
  id: string;
  tenant_id: string;
  forecast_month: string;
  forecast_type: 'revenue' | 'expense' | 'cash_inflow' | 'cash_outflow';
  original_budget: number;
  current_forecast: number;
  actual_amount: number;
  variance_amount: number;
  variance_percent: number;
  category: string | null;
  channel: string | null;
  notes: string | null;
  confidence_level: 'low' | 'medium' | 'high';
  last_revised_at: string;
  created_at: string;
}

export interface RollingForecastSummary {
  totalBudget: number;
  totalForecast: number;
  totalActual: number;
  totalVariance: number;
  averageConfidence: number;
  byType: Record<string, { budget: number; forecast: number; actual: number }>;
  byMonth: { month: string; revenue: number; expense: number; netCash: number }[];
  forecastAccuracy: number;
}

const FORECAST_MONTHS = 18;

export function useRollingForecasts() {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['rolling-forecasts', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rolling_forecasts')
        .select('*')
        .order('forecast_month', { ascending: true });
      
      if (error) throw error;
      return data as RollingForecastItem[];
    },
    enabled: !!tenantId,
  });
}

export function useRollingForecastSummary() {
  const { data: forecasts, isLoading } = useRollingForecasts();
  
  const summary: RollingForecastSummary = {
    totalBudget: 0,
    totalForecast: 0,
    totalActual: 0,
    totalVariance: 0,
    averageConfidence: 0,
    byType: {},
    byMonth: [],
    forecastAccuracy: 0,
  };
  
  if (!forecasts || forecasts.length === 0) {
    return { data: summary, isLoading };
  }
  
  // Calculate totals
  const confidenceMap = { low: 1, medium: 2, high: 3 };
  let totalConfidence = 0;
  
  forecasts.forEach(f => {
    summary.totalBudget += f.original_budget;
    summary.totalForecast += f.current_forecast;
    summary.totalActual += f.actual_amount || 0;
    summary.totalVariance += f.variance_amount;
    totalConfidence += confidenceMap[f.confidence_level];
    
    // By type
    if (!summary.byType[f.forecast_type]) {
      summary.byType[f.forecast_type] = { budget: 0, forecast: 0, actual: 0 };
    }
    summary.byType[f.forecast_type].budget += f.original_budget;
    summary.byType[f.forecast_type].forecast += f.current_forecast;
    summary.byType[f.forecast_type].actual += f.actual_amount || 0;
  });
  
  summary.averageConfidence = totalConfidence / forecasts.length;
  
  // Calculate accuracy for items with actuals
  const withActuals = forecasts.filter(f => f.actual_amount && f.actual_amount > 0);
  if (withActuals.length > 0) {
    const accuracies = withActuals.map(f => {
      const error = Math.abs(f.current_forecast - f.actual_amount) / f.actual_amount;
      return Math.max(0, 1 - error) * 100;
    });
    summary.forecastAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  }
  
  // Group by month
  const monthMap = new Map<string, { revenue: number; expense: number }>();
  forecasts.forEach(f => {
    const existing = monthMap.get(f.forecast_month) || { revenue: 0, expense: 0 };
    if (f.forecast_type === 'revenue' || f.forecast_type === 'cash_inflow') {
      existing.revenue += f.current_forecast;
    } else {
      existing.expense += f.current_forecast;
    }
    monthMap.set(f.forecast_month, existing);
  });
  
  summary.byMonth = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      revenue: data.revenue,
      expense: data.expense,
      netCash: data.revenue - data.expense,
    }));
  
  return { data: summary, isLoading };
}

export function useSaveRollingForecast() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();
  
  return useMutation({
    mutationFn: async (forecast: Partial<RollingForecastItem> & { 
      forecast_month: string;
      forecast_type: string;
    }) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const { data, error } = await supabase
        .from('rolling_forecasts')
        .upsert({
          ...forecast,
          tenant_id: tenantId,
          last_revised_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id,forecast_month,forecast_type,category,channel',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolling-forecasts'] });
      toast.success('Đã lưu dự báo');
    },
    onError: (error) => {
      toast.error('Lỗi khi lưu dự báo: ' + error.message);
    },
  });
}

/**
 * Generate Rolling Forecast - Refactored to use SSOT
 * Now uses useCentralFinancialMetrics for baseline revenue/expense
 * instead of calculating independently.
 */
export function useGenerateRollingForecast() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();
  const { data: centralMetrics } = useCentralFinancialMetrics();
  
  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');
      
      // Generate 18 months of forecasts based on SSOT data
      const startDate = startOfMonth(new Date());
      const forecasts: Partial<RollingForecastItem>[] = [];
      
      // Use SSOT metrics for baseline (monthly averages from central source)
      // If centralMetrics available, calculate monthly average; otherwise use defaults
      const avgRevenue = centralMetrics 
        ? (centralMetrics.netRevenue / Math.max(centralMetrics.daysInPeriod / 30, 1))
        : 100000000; // Default 100M VND/month
        
      const avgExpense = centralMetrics
        ? (centralMetrics.totalOpex / Math.max(centralMetrics.daysInPeriod / 30, 1))
        : 80000000; // Default 80M VND/month
      
      // Generate forecasts with growth assumptions
      for (let i = 0; i < FORECAST_MONTHS; i++) {
        const month = format(addMonths(startDate, i), 'yyyy-MM-01');
        const growthFactor = 1 + (i * 0.02); // 2% monthly growth
        
        // Revenue forecast
        forecasts.push({
          forecast_month: month,
          forecast_type: 'revenue',
          original_budget: Math.round(avgRevenue * growthFactor),
          current_forecast: Math.round(avgRevenue * growthFactor),
          confidence_level: i < 3 ? 'high' : i < 9 ? 'medium' : 'low',
        });
        
        // Expense forecast
        forecasts.push({
          forecast_month: month,
          forecast_type: 'expense',
          original_budget: Math.round(avgExpense * (1 + i * 0.015)), // 1.5% expense growth
          current_forecast: Math.round(avgExpense * (1 + i * 0.015)),
          confidence_level: i < 3 ? 'high' : i < 9 ? 'medium' : 'low',
        });
      }
      
      // Bulk insert - cast to required type
      const insertData = forecasts.map(f => ({ 
        ...f, 
        tenant_id: tenantId as string,
        forecast_month: f.forecast_month as string,
        forecast_type: f.forecast_type as string,
      }));
      
      const { error } = await supabase
        .from('rolling_forecasts')
        .upsert(insertData, { onConflict: 'tenant_id,forecast_month,forecast_type,category,channel' });
      
      if (error) throw error;
      return forecasts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['rolling-forecasts'] });
      toast.success(`Đã tạo ${count} dòng dự báo cho 18 tháng tới`);
    },
    onError: (error) => {
      toast.error('Lỗi khi tạo dự báo: ' + error.message);
    },
  });
}
