/**
 * useTopCustomersAR - Fetch top customers by AR from precomputed view
 * 
 * ⚠️ DB-FIRST: This hook ONLY fetches from v_customer_ar_summary.
 * NO client-side calculations.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

export interface CustomerARData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalAR: number;
  overdueAR: number;
  avgPaymentDays: number;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  totalInvoiceCount: number;
  lastInvoiceDate?: string;
}

export function useTopCustomersAR(limit: number = 10) {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();

  return useQuery({
    queryKey: ['top-customers-ar', tenantId, limit],
    queryFn: async (): Promise<CustomerARData[]> => {
      if (!tenantId) return [];

      // Fetch from precomputed view - NO CALCULATIONS
      const { data, error } = await supabase
        .from('v_customer_ar_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .gt('total_ar', 0) // Only customers with outstanding AR
        .order('total_ar', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[useTopCustomersAR] Error:', error);
        return [];
      }

      if (!data?.length) return [];

      // Map DB columns to interface - NO CALCULATIONS
      return data.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        totalAR: Number(row.total_ar) || 0,
        overdueAR: Number(row.overdue_ar) || 0,
        avgPaymentDays: Number(row.avg_payment_days) || 30,
        openInvoiceCount: Number(row.open_invoice_count) || 0,
        overdueInvoiceCount: Number(row.overdue_invoice_count) || 0,
        totalInvoiceCount: Number(row.total_invoice_count) || 0,
        lastInvoiceDate: row.last_invoice_date,
      }));
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
