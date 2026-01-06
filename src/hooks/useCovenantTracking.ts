import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';

export interface BankCovenant {
  id: string;
  tenant_id: string;
  covenant_name: string;
  covenant_type: 'debt_equity' | 'current_ratio' | 'dscr' | 'interest_coverage' | 'leverage' | 'liquidity' | 'custom';
  lender_name: string;
  threshold_value: number;
  threshold_operator: '>=' | '<=' | '>' | '<' | '=';
  warning_threshold: number | null;
  current_value: number;
  status: 'compliant' | 'warning' | 'breach' | 'waiver';
  compliance_margin: number;
  measurement_frequency: 'monthly' | 'quarterly' | 'annually';
  next_measurement_date: string | null;
  last_measured_at: string | null;
  waiver_end_date: string | null;
  waiver_notes: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface CovenantMeasurement {
  id: string;
  covenant_id: string;
  measurement_date: string;
  measured_value: number;
  status: 'compliant' | 'warning' | 'breach' | 'waiver';
  numerator_value: number | null;
  denominator_value: number | null;
  calculation_details: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

export interface CovenantSummary {
  total: number;
  compliant: number;
  warning: number;
  breach: number;
  waiver: number;
  overallHealth: 'good' | 'caution' | 'critical';
  upcomingMeasurements: BankCovenant[];
}

const COVENANT_TYPE_LABELS: Record<string, string> = {
  debt_equity: 'Nợ/Vốn chủ sở hữu',
  current_ratio: 'Tỷ số thanh toán hiện hành',
  dscr: 'Tỷ số khả năng trả nợ (DSCR)',
  interest_coverage: 'Tỷ số thanh toán lãi vay',
  leverage: 'Đòn bẩy tài chính',
  liquidity: 'Tỷ số thanh khoản',
  custom: 'Tùy chỉnh',
};

export const getCovenantTypeLabel = (type: string) => COVENANT_TYPE_LABELS[type] || type;

export function useCovenants() {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['bank-covenants', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_covenants')
        .select('*')
        .eq('is_active', true)
        .order('status', { ascending: false })
        .order('next_measurement_date', { ascending: true });
      
      if (error) throw error;
      return data as BankCovenant[];
    },
    enabled: !!tenantId,
  });
}

export function useCovenantSummary() {
  const { data: covenants, isLoading } = useCovenants();
  
  const summary: CovenantSummary = {
    total: 0,
    compliant: 0,
    warning: 0,
    breach: 0,
    waiver: 0,
    overallHealth: 'good',
    upcomingMeasurements: [],
  };
  
  if (!covenants) return { data: summary, isLoading };
  
  summary.total = covenants.length;
  covenants.forEach(c => {
    summary[c.status as keyof Pick<CovenantSummary, 'compliant' | 'warning' | 'breach' | 'waiver'>]++;
  });
  
  // Determine overall health
  if (summary.breach > 0) {
    summary.overallHealth = 'critical';
  } else if (summary.warning > 0) {
    summary.overallHealth = 'caution';
  } else {
    summary.overallHealth = 'good';
  }
  
  // Get upcoming measurements (next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  summary.upcomingMeasurements = covenants.filter(c => 
    c.next_measurement_date && 
    new Date(c.next_measurement_date) <= thirtyDaysFromNow
  );
  
  return { data: summary, isLoading };
}

export function useCovenantMeasurements(covenantId: string) {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['covenant-measurements', covenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('covenant_measurements')
        .select('*')
        .eq('covenant_id', covenantId)
        .order('measurement_date', { ascending: false })
        .limit(12);
      
      if (error) throw error;
      return data as CovenantMeasurement[];
    },
    enabled: !!tenantId && !!covenantId,
  });
}

export function useCreateCovenant() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();
  
  return useMutation({
    mutationFn: async (covenant: Omit<BankCovenant, 'id' | 'tenant_id' | 'created_at' | 'compliance_margin'>) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const { data, error } = await supabase
        .from('bank_covenants')
        .insert({ ...covenant, tenant_id: tenantId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-covenants'] });
      toast.success('Đã thêm covenant');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useUpdateCovenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BankCovenant> & { id: string }) => {
      const { data, error } = await supabase
        .from('bank_covenants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-covenants'] });
      toast.success('Đã cập nhật covenant');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useRecordMeasurement() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();
  
  return useMutation({
    mutationFn: async ({ 
      covenantId, 
      measuredValue,
      notes,
      numeratorValue,
      denominatorValue,
    }: { 
      covenantId: string;
      measuredValue: number;
      notes?: string;
      numeratorValue?: number;
      denominatorValue?: number;
    }) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      // Get covenant to determine status
      const { data: covenant } = await supabase
        .from('bank_covenants')
        .select('*')
        .eq('id', covenantId)
        .single();
      
      if (!covenant) throw new Error('Covenant not found');
      
      // Determine status
      let status: CovenantMeasurement['status'] = 'compliant';
      const threshold = covenant.threshold_value;
      const warning = covenant.warning_threshold;
      const op = covenant.threshold_operator;
      
      const checkCompliance = (val: number, thresh: number, operator: string) => {
        switch (operator) {
          case '>=': return val >= thresh;
          case '<=': return val <= thresh;
          case '>': return val > thresh;
          case '<': return val < thresh;
          case '=': return val === thresh;
          default: return true;
        }
      };
      
      if (!checkCompliance(measuredValue, threshold, op)) {
        status = 'breach';
      } else if (warning && !checkCompliance(measuredValue, warning, op)) {
        status = 'warning';
      }
      
      // Insert measurement
      const { error: measurementError } = await supabase
        .from('covenant_measurements')
        .insert({
          tenant_id: tenantId,
          covenant_id: covenantId,
          measurement_date: new Date().toISOString().split('T')[0],
          measured_value: measuredValue,
          status,
          numerator_value: numeratorValue,
          denominator_value: denominatorValue,
          notes,
        });
      
      if (measurementError) throw measurementError;
      
      // Update covenant current value and status
      const nextMeasurement = new Date();
      switch (covenant.measurement_frequency) {
        case 'monthly':
          nextMeasurement.setMonth(nextMeasurement.getMonth() + 1);
          break;
        case 'quarterly':
          nextMeasurement.setMonth(nextMeasurement.getMonth() + 3);
          break;
        case 'annually':
          nextMeasurement.setFullYear(nextMeasurement.getFullYear() + 1);
          break;
      }
      
      const { error: updateError } = await supabase
        .from('bank_covenants')
        .update({
          current_value: measuredValue,
          status,
          last_measured_at: new Date().toISOString(),
          next_measurement_date: nextMeasurement.toISOString().split('T')[0],
        })
        .eq('id', covenantId);
      
      if (updateError) throw updateError;
      
      return { status, measuredValue };
    },
    onSuccess: ({ status }) => {
      queryClient.invalidateQueries({ queryKey: ['bank-covenants'] });
      queryClient.invalidateQueries({ queryKey: ['covenant-measurements'] });
      
      if (status === 'breach') {
        toast.error('Cảnh báo: Vi phạm covenant!');
      } else if (status === 'warning') {
        toast.warning('Lưu ý: Gần ngưỡng cảnh báo');
      } else {
        toast.success('Đã ghi nhận đo lường');
      }
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}
