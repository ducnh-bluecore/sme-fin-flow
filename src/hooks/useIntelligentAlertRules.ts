/**
 * Hook for fetching and managing Intelligent Alert Rules
 * These are the advanced rules with dynamic calculations, formulas, and detailed descriptions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveTenantId } from './useActiveTenantId';

// ============= Types =============

export interface IntelligentAlertRule {
  id: string;
  tenant_id: string;
  rule_code: string;
  rule_name: string;
  rule_category: string;
  description: string | null;
  object_type: string | null;
  severity: string;
  is_enabled: boolean;
  priority: number;
  threshold_type: string;
  threshold_config: {
    critical?: number;
    warning?: number;
    info?: number;
    operator?: string;
    unit?: string;
    benchmark?: number;
    min_variance?: number;
    critical_days?: number;
    warning_days?: number;
    [key: string]: any;
  };
  calculation_formula: string | {
    type: string;
    formula: string;
    data_sources?: string[];
    period_type?: string;
    trend_periods?: number;
    [key: string]: any;
  };
  suggested_actions: string[];
  cooldown_hours: number;
  created_at: string;
  updated_at: string;
}

// ============= Labels & Constants =============

export const ruleCategoryLabels: Record<string, string> = {
  product: 'Sản phẩm & Tồn kho',
  cashflow: 'Dòng tiền',
  kpi: 'KPI Tài chính',
  customer: 'Khách hàng',
  fulfillment: 'Giao hàng & Vận chuyển',
  business: 'Kinh doanh',
  operations: 'Vận hành',
  store: 'Cửa hàng',
};

export const severityLabels: Record<string, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Nguy cấp', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  high: { label: 'Cao', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  medium: { label: 'Trung bình', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  warning: { label: 'Cảnh báo', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  low: { label: 'Thấp', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  info: { label: 'Thông tin', color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
};

// ============= Query Keys =============

const QUERY_KEY = 'intelligent-alert-rules';

// ============= Main Hook =============

export function useIntelligentAlertRules() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const queryClient = useQueryClient();

  // Fetch all intelligent alert rules
  const rulesQuery = useQuery({
    queryKey: [QUERY_KEY, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('intelligent_alert_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('rule_category', { ascending: true })
        .order('priority', { ascending: true });

      if (error) throw error;
      
      // Parse calculation_formula if it's a JSON string
      return (data || []).map(rule => ({
        ...rule,
        calculation_formula: typeof rule.calculation_formula === 'string' 
          ? tryParseJSON(rule.calculation_formula)
          : rule.calculation_formula,
        threshold_config: rule.threshold_config || {},
        suggested_actions: rule.suggested_actions || [],
      })) as IntelligentAlertRule[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Group rules by category
  const rulesByCategory = (rulesQuery.data || []).reduce((acc, rule) => {
    const category = rule.rule_category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(rule);
    return acc;
  }, {} as Record<string, IntelligentAlertRule[]>);

  // Toggle rule enabled/disabled
  const toggleRule = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { data, error } = await supabase
        .from('intelligent_alert_rules')
        .update({ is_enabled, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(variables.is_enabled ? 'Đã bật rule' : 'Đã tắt rule');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  // Update rule
  const updateRule = useMutation({
    mutationFn: async (rule: { id: string; is_enabled?: boolean; severity?: string; priority?: number; description?: string }) => {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (rule.is_enabled !== undefined) updateData.is_enabled = rule.is_enabled;
      if (rule.severity !== undefined) updateData.severity = rule.severity;
      if (rule.priority !== undefined) updateData.priority = rule.priority;
      if (rule.description !== undefined) updateData.description = rule.description;

      const { data, error } = await supabase
        .from('intelligent_alert_rules')
        .update(updateData)
        .eq('id', rule.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Đã cập nhật rule');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  // Stats
  const stats = {
    total: rulesQuery.data?.length || 0,
    enabled: rulesQuery.data?.filter(r => r.is_enabled).length || 0,
    critical: rulesQuery.data?.filter(r => r.is_enabled && (r.severity === 'critical' || r.severity === 'high')).length || 0,
    warning: rulesQuery.data?.filter(r => r.is_enabled && (r.severity === 'warning' || r.severity === 'medium')).length || 0,
  };

  return {
    rules: rulesQuery.data || [],
    rulesByCategory,
    isLoading: tenantLoading || rulesQuery.isLoading,
    error: rulesQuery.error,
    stats,
    toggleRule,
    updateRule,
    refetch: rulesQuery.refetch,
  };
}

// Helper function to safely parse JSON
function tryParseJSON(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
