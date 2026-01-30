/**
 * useRollingForecast - Rolling forecast management hooks
 * 
 * Refactored to use Schema-per-Tenant architecture.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { toast } from 'sonner';
import { addMonths, format, startOfMonth } from 'date-fns';
import { useFinanceTruthSnapshot } from './useFinanceTruthSnapshot';

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
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  
  return useQuery({
    queryKey: ['rolling-forecasts', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = client
        .from('rolling_forecasts')
        .select('*')
        .order('forecast_month', { ascending: true });
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as RollingForecastItem[];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useRollingForecastSummary() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  
  return useQuery({
    queryKey: ['rolling-forecast-summary', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      let query = client
        .from('v_rolling_forecast_summary')
        .select('*');
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      
      // Thin wrapper - NO client-side calculations
      const summary: RollingForecastSummary = {
        totalBudget: Number(data?.total_budget) || 0,
        totalForecast: Number(data?.total_forecast) || 0,
        totalActual: Number(data?.total_actual) || 0,
        totalVariance: Number(data?.total_variance) || 0,
        averageConfidence: Number(data?.average_confidence) || 0,
        byType: {
          revenue: { 
            budget: Number(data?.revenue_budget) || 0, 
            forecast: Number(data?.revenue_forecast) || 0, 
            actual: Number(data?.revenue_actual) || 0 
          },
          expense: { 
            budget: Number(data?.expense_budget) || 0, 
            forecast: Number(data?.expense_forecast) || 0, 
            actual: Number(data?.expense_actual) || 0 
          },
        },
        byMonth: (data?.by_month_data as { month: string; revenue: number; expense: number; netCash: number }[]) || [],
        forecastAccuracy: Number(data?.forecast_accuracy) || 0,
      };
      
      return summary;
    },
    enabled: !!tenantId && isReady,
  });
}

export function useSaveRollingForecast() {
  const queryClient = useQueryClient();
  const { client, tenantId, isReady } = useTenantSupabaseCompat();
  
  return useMutation({
    mutationFn: async (forecast: Partial<RollingForecastItem> & { 
      forecast_month: string;
      forecast_type: string;
    }) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const { data, error } = await client
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
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  const { data: snapshot } = useFinanceTruthSnapshot();
  
  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');
      
      // Delete existing forecasts for this tenant first to avoid duplicates
      let deleteQuery = client
        .from('rolling_forecasts')
        .delete();
      
      if (shouldAddTenantFilter) {
        deleteQuery = deleteQuery.eq('tenant_id', tenantId);
      }
      
      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;
      
      // Generate 18 months of forecasts based on SSOT data
      const startDate = startOfMonth(new Date());
      const forecasts: Partial<RollingForecastItem>[] = [];
      
      // Use SSOT snapshot for baseline (90 days = 3 months)
      const avgRevenue = snapshot 
        ? (snapshot.netRevenue / 3)
        : 100000000; // Default 100M VND/month
        
      // Derive OpEx from gross profit - EBITDA
      const totalOpex = snapshot ? (snapshot.grossProfit - snapshot.ebitda) : 0;
      const avgExpense = snapshot
        ? (totalOpex / 3)
        : 80000000; // Default 80M VND/month
      
      // Generate forecasts with growth assumptions
      for (let i = 0; i < FORECAST_MONTHS; i++) {
        const month = format(addMonths(startDate, i), 'yyyy-MM-01');
        const growthFactor = 1 + (i * 0.02); // 2% monthly growth
        
        // Revenue forecast - do NOT include variance_amount/variance_percent (generated columns)
        forecasts.push({
          forecast_month: month,
          forecast_type: 'revenue',
          original_budget: Math.round(avgRevenue * growthFactor),
          current_forecast: Math.round(avgRevenue * growthFactor),
          actual_amount: 0,
          confidence_level: i < 3 ? 'high' : i < 9 ? 'medium' : 'low',
        });
        
        // Expense forecast
        forecasts.push({
          forecast_month: month,
          forecast_type: 'expense',
          original_budget: Math.round(avgExpense * (1 + i * 0.015)), // 1.5% expense growth
          current_forecast: Math.round(avgExpense * (1 + i * 0.015)),
          actual_amount: 0,
          confidence_level: i < 3 ? 'high' : i < 9 ? 'medium' : 'low',
        });
      }
      
      // Bulk insert
      const insertData = forecasts.map(f => ({ 
        ...f, 
        tenant_id: tenantId as string,
        forecast_month: f.forecast_month as string,
        forecast_type: f.forecast_type as string,
      }));
      
      const { error } = await client
        .from('rolling_forecasts')
        .insert(insertData);
      
      if (error) throw error;
      return forecasts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['rolling-forecasts'] });
      queryClient.invalidateQueries({ queryKey: ['rolling-forecast-summary'] });
      toast.success(`Đã tạo ${count} dòng dự báo cho 18 tháng tới`);
    },
    onError: (error) => {
      toast.error('Lỗi khi tạo dự báo: ' + error.message);
    },
  });
}
