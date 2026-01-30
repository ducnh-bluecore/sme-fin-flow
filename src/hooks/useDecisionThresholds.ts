/**
 * Decision Threshold Configuration
 * 
 * @architecture Schema-per-Tenant
 * @domain Control Tower/Decisions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';
import { toast } from 'sonner';
import { FDP_THRESHOLDS } from '@/lib/fdp-formulas';

/**
 * Decision Threshold Configuration
 * Cho phép tenant tùy chỉnh ngưỡng khẩn cấp trong Decision Center
 */
export interface DecisionThresholdConfig {
  id: string;
  tenant_id: string;
  
  // Financial Thresholds
  runway_critical_months: number;
  runway_warning_months: number;
  
  // Contribution Margin (%)
  cm_critical_percent: number;
  cm_warning_percent: number;
  cm_good_percent: number;
  
  // ROAS
  roas_critical: number;
  roas_warning: number;
  roas_good: number;
  
  // SKU Margin (%)
  sku_stop_margin_percent: number;
  sku_critical_margin_percent: number;
  sku_review_margin_percent: number;
  
  // Days thresholds
  dso_warning_days: number;
  dso_critical_days: number;
  ccc_warning_days: number;
  ccc_critical_days: number;
  inventory_warning_days: number;
  inventory_critical_days: number;
  
  // AR thresholds (%)
  ar_overdue_warning_percent: number;
  ar_overdue_critical_percent: number;
  ar_aging_90_critical_percent: number;
  
  // Channel Fee (%)
  channel_fee_warning_percent: number;
  channel_fee_critical_percent: number;
  
  // Gross Margin (%)
  gross_margin_warning_percent: number;
  gross_margin_critical_percent: number;
  
  // Impact approval threshold
  impact_approval_threshold: number;
  
  // LTV:CAC
  ltv_cac_critical: number;
  ltv_cac_warning: number;
  ltv_cac_good: number;
  
  // Customer churn risk (days)
  customer_risk_medium_days: number;
  customer_risk_high_days: number;
  customer_risk_critical_days: number;
  
  created_at: string;
  updated_at: string;
}

// Default thresholds matching FDP_THRESHOLDS
export const DEFAULT_THRESHOLDS: Omit<DecisionThresholdConfig, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
  runway_critical_months: FDP_THRESHOLDS.RUNWAY_CRITICAL_MONTHS,
  runway_warning_months: FDP_THRESHOLDS.RUNWAY_WARNING_MONTHS,
  cm_critical_percent: FDP_THRESHOLDS.CM_CRITICAL_PERCENT,
  cm_warning_percent: FDP_THRESHOLDS.CM_WARNING_PERCENT,
  cm_good_percent: FDP_THRESHOLDS.CM_GOOD_PERCENT,
  roas_critical: FDP_THRESHOLDS.ROAS_CRITICAL,
  roas_warning: FDP_THRESHOLDS.ROAS_WARNING,
  roas_good: FDP_THRESHOLDS.ROAS_GOOD,
  sku_stop_margin_percent: FDP_THRESHOLDS.SKU_STOP_MARGIN_PERCENT,
  sku_critical_margin_percent: FDP_THRESHOLDS.SKU_CRITICAL_MARGIN_PERCENT,
  sku_review_margin_percent: FDP_THRESHOLDS.SKU_REVIEW_MARGIN_PERCENT,
  dso_warning_days: FDP_THRESHOLDS.DSO_WARNING_DAYS,
  dso_critical_days: FDP_THRESHOLDS.DSO_CRITICAL_DAYS,
  ccc_warning_days: FDP_THRESHOLDS.CCC_WARNING_DAYS,
  ccc_critical_days: FDP_THRESHOLDS.CCC_CRITICAL_DAYS,
  inventory_warning_days: FDP_THRESHOLDS.INVENTORY_WARNING_DAYS,
  inventory_critical_days: FDP_THRESHOLDS.INVENTORY_CRITICAL_DAYS,
  ar_overdue_warning_percent: FDP_THRESHOLDS.AR_OVERDUE_WARNING_PERCENT,
  ar_overdue_critical_percent: FDP_THRESHOLDS.AR_OVERDUE_CRITICAL_PERCENT,
  ar_aging_90_critical_percent: FDP_THRESHOLDS.AR_AGING_90_CRITICAL_PERCENT,
  channel_fee_warning_percent: FDP_THRESHOLDS.CHANNEL_FEE_WARNING_PERCENT,
  channel_fee_critical_percent: FDP_THRESHOLDS.CHANNEL_FEE_CRITICAL_PERCENT,
  gross_margin_warning_percent: FDP_THRESHOLDS.GROSS_MARGIN_WARNING_PERCENT,
  gross_margin_critical_percent: FDP_THRESHOLDS.GROSS_MARGIN_CRITICAL_PERCENT,
  impact_approval_threshold: 50000000, // 50M VND
  ltv_cac_critical: FDP_THRESHOLDS.LTV_CAC_CRITICAL,
  ltv_cac_warning: FDP_THRESHOLDS.LTV_CAC_WARNING,
  ltv_cac_good: FDP_THRESHOLDS.LTV_CAC_GOOD,
  customer_risk_medium_days: 30,
  customer_risk_high_days: 60,
  customer_risk_critical_days: 90,
};

// Threshold category groups for UI
export const THRESHOLD_CATEGORIES = {
  financial: {
    label: 'Tài chính & Dòng tiền',
    icon: 'DollarSign',
    thresholds: ['runway_critical_months', 'runway_warning_months', 'cm_critical_percent', 'cm_warning_percent', 'cm_good_percent', 'gross_margin_warning_percent', 'gross_margin_critical_percent'],
  },
  marketing: {
    label: 'Marketing & ROAS',
    icon: 'TrendingUp',
    thresholds: ['roas_critical', 'roas_warning', 'roas_good', 'ltv_cac_critical', 'ltv_cac_warning', 'ltv_cac_good'],
  },
  sku: {
    label: 'SKU & Sản phẩm',
    icon: 'Package',
    thresholds: ['sku_stop_margin_percent', 'sku_critical_margin_percent', 'sku_review_margin_percent', 'inventory_warning_days', 'inventory_critical_days'],
  },
  receivables: {
    label: 'Công nợ (AR/DSO)',
    icon: 'FileText',
    thresholds: ['dso_warning_days', 'dso_critical_days', 'ar_overdue_warning_percent', 'ar_overdue_critical_percent', 'ar_aging_90_critical_percent'],
  },
  operations: {
    label: 'Vận hành',
    icon: 'Settings',
    thresholds: ['ccc_warning_days', 'ccc_critical_days', 'channel_fee_warning_percent', 'channel_fee_critical_percent'],
  },
  customer: {
    label: 'Khách hàng',
    icon: 'Users',
    thresholds: ['customer_risk_medium_days', 'customer_risk_high_days', 'customer_risk_critical_days'],
  },
  approval: {
    label: 'Phê duyệt',
    icon: 'Shield',
    thresholds: ['impact_approval_threshold'],
  },
} as const;

// Threshold metadata for UI display
export const THRESHOLD_METADATA: Record<string, { label: string; description: string; unit: string; min?: number; max?: number; step?: number }> = {
  runway_critical_months: { label: 'Runway khẩn cấp', description: 'Số tháng còn lại trước khi hết tiền - mức nguy hiểm', unit: 'tháng', min: 1, max: 12, step: 1 },
  runway_warning_months: { label: 'Runway cảnh báo', description: 'Số tháng còn lại - mức cần chú ý', unit: 'tháng', min: 2, max: 24, step: 1 },
  cm_critical_percent: { label: 'CM khẩn cấp', description: 'Contribution Margin dưới mức này là lỗ', unit: '%', min: -50, max: 50, step: 1 },
  cm_warning_percent: { label: 'CM cảnh báo', description: 'Contribution Margin cần cải thiện', unit: '%', min: 0, max: 50, step: 1 },
  cm_good_percent: { label: 'CM tốt', description: 'Contribution Margin ổn định', unit: '%', min: 5, max: 80, step: 1 },
  roas_critical: { label: 'ROAS khẩn cấp', description: 'ROAS dưới mức này = lỗ marketing', unit: 'x', min: 0.5, max: 3, step: 0.1 },
  roas_warning: { label: 'ROAS cảnh báo', description: 'ROAS cần cải thiện', unit: 'x', min: 1, max: 5, step: 0.1 },
  roas_good: { label: 'ROAS tốt', description: 'ROAS ổn định', unit: 'x', min: 2, max: 10, step: 0.1 },
  sku_stop_margin_percent: { label: 'SKU STOP', description: 'Biên lợi nhuận dưới mức này = dừng bán', unit: '%', min: -30, max: 0, step: 1 },
  sku_critical_margin_percent: { label: 'SKU khẩn cấp', description: 'Biên lợi nhuận cực kỳ thấp', unit: '%', min: -50, max: -5, step: 1 },
  sku_review_margin_percent: { label: 'SKU cần review', description: 'Biên lợi nhuận cần xem xét', unit: '%', min: 0, max: 20, step: 1 },
  dso_warning_days: { label: 'DSO cảnh báo', description: 'Số ngày thu tiền trung bình - cần chú ý', unit: 'ngày', min: 15, max: 90, step: 5 },
  dso_critical_days: { label: 'DSO khẩn cấp', description: 'Số ngày thu tiền quá lâu', unit: 'ngày', min: 30, max: 120, step: 5 },
  ccc_warning_days: { label: 'CCC cảnh báo', description: 'Cash Conversion Cycle - cần chú ý', unit: 'ngày', min: 30, max: 120, step: 5 },
  ccc_critical_days: { label: 'CCC khẩn cấp', description: 'Cash Conversion Cycle quá dài', unit: 'ngày', min: 60, max: 180, step: 5 },
  inventory_warning_days: { label: 'Tồn kho cảnh báo', description: 'Số ngày tồn kho - cần chú ý', unit: 'ngày', min: 30, max: 120, step: 5 },
  inventory_critical_days: { label: 'Tồn kho khẩn cấp', description: 'Số ngày tồn kho quá lâu', unit: 'ngày', min: 60, max: 180, step: 5 },
  ar_overdue_warning_percent: { label: 'AR quá hạn cảnh báo', description: '% công nợ quá hạn - cần chú ý', unit: '%', min: 5, max: 30, step: 1 },
  ar_overdue_critical_percent: { label: 'AR quá hạn khẩn cấp', description: '% công nợ quá hạn nghiêm trọng', unit: '%', min: 15, max: 50, step: 1 },
  ar_aging_90_critical_percent: { label: 'AR >90 ngày', description: '% công nợ quá hạn trên 90 ngày', unit: '%', min: 5, max: 30, step: 1 },
  channel_fee_warning_percent: { label: 'Phí kênh cảnh báo', description: '% phí kênh bán hàng - cần chú ý', unit: '%', min: 10, max: 25, step: 1 },
  channel_fee_critical_percent: { label: 'Phí kênh khẩn cấp', description: '% phí kênh quá cao', unit: '%', min: 15, max: 35, step: 1 },
  gross_margin_warning_percent: { label: 'Gross Margin cảnh báo', description: 'Biên lợi nhuận gộp - cần chú ý', unit: '%', min: 10, max: 50, step: 1 },
  gross_margin_critical_percent: { label: 'Gross Margin khẩn cấp', description: 'Biên lợi nhuận gộp quá thấp', unit: '%', min: 5, max: 30, step: 1 },
  impact_approval_threshold: { label: 'Ngưỡng phê duyệt', description: 'Quyết định có impact trên mức này cần CEO/CFO phê duyệt', unit: 'VND', min: 10000000, max: 500000000, step: 5000000 },
  ltv_cac_critical: { label: 'LTV/CAC khẩn cấp', description: 'Tỷ lệ LTV/CAC thấp = CAC quá đắt', unit: 'x', min: 0.5, max: 2, step: 0.1 },
  ltv_cac_warning: { label: 'LTV/CAC cảnh báo', description: 'Tỷ lệ LTV/CAC cần cải thiện', unit: 'x', min: 1, max: 3, step: 0.1 },
  ltv_cac_good: { label: 'LTV/CAC tốt', description: 'Tỷ lệ LTV/CAC ổn định', unit: 'x', min: 2, max: 5, step: 0.1 },
  customer_risk_medium_days: { label: 'Rủi ro KH trung bình', description: 'Số ngày không mua hàng - rủi ro trung bình', unit: 'ngày', min: 14, max: 60, step: 7 },
  customer_risk_high_days: { label: 'Rủi ro KH cao', description: 'Số ngày không mua hàng - rủi ro cao', unit: 'ngày', min: 30, max: 90, step: 7 },
  customer_risk_critical_days: { label: 'Rủi ro KH khẩn cấp', description: 'Số ngày không mua hàng - sắp mất KH', unit: 'ngày', min: 60, max: 180, step: 7 },
};

/**
 * Hook để fetch và cache threshold config cho tenant hiện tại
 * Trả về DEFAULT_THRESHOLDS nếu chưa có config
 */
export function useDecisionThresholds() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['decision-thresholds', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      let query = client
        .from('decision_threshold_configs')
        .select('*');

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      
      // Return data or default if not found
      if (data) return data as DecisionThresholdConfig;
      
      return null;
    },
    enabled: !!tenantId && isReady,
  });
}

/**
 * Get effective thresholds (config hoặc default)
 */
export function useEffectiveThresholds() {
  const { data: config, isLoading } = useDecisionThresholds();
  
  const thresholds = config || DEFAULT_THRESHOLDS;
  
  return {
    thresholds,
    isLoading,
    isDefault: !config,
  };
}

/**
 * Hook để save/update threshold config
 */
export function useSaveDecisionThresholds() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (config: Partial<DecisionThresholdConfig>) => {
      if (!tenantId) throw new Error('No tenant selected');

      // Check if config exists
      const { data: existing } = await client
        .from('decision_threshold_configs')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await client
          .from('decision_threshold_configs')
          .update({
            ...config,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await client
          .from('decision_threshold_configs')
          .insert({
            tenant_id: tenantId,
            ...DEFAULT_THRESHOLDS,
            ...config,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      // Invalidate thresholds to refetch the saved config
      queryClient.invalidateQueries({ queryKey: ['decision-thresholds', tenantId] });
      // Force re-render of auto decision cards with new thresholds
      queryClient.invalidateQueries({ queryKey: ['all-problematic-skus'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['mdp-data'] });
      toast.success('Đã lưu cấu hình ngưỡng - Các quyết định sẽ được cập nhật');
    },
    onError: (error) => {
      console.error('Error saving thresholds:', error);
      toast.error('Không thể lưu cấu hình');
    },
  });
}

/**
 * Hook để reset về default
 */
export function useResetDecisionThresholds() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      const { error } = await client
        .from('decision_threshold_configs')
        .delete()
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-thresholds', tenantId] });
      // Force re-render of auto decision cards with default thresholds
      queryClient.invalidateQueries({ queryKey: ['all-problematic-skus'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['mdp-data'] });
      toast.success('Đã khôi phục về ngưỡng mặc định - Các quyết định sẽ được cập nhật');
    },
    onError: (error) => {
      console.error('Error resetting thresholds:', error);
      toast.error('Không thể khôi phục cài đặt');
    },
  });
}
