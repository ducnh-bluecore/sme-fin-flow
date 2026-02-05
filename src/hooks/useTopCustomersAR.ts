/**
 * useTopCustomersAR - Fetch top customers by AR from precomputed view
 * 
 * ⚠️ DB-FIRST: This hook ONLY fetches from v_customer_ar_summary.
 * NO client-side calculations.
 * 
 * Architecture v1.4.1: Uses useTenantQueryBuilder for automatic table mapping
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

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
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['top-customers-ar', tenantId, limit],
    queryFn: async (): Promise<CustomerARData[]> => {
      if (!tenantId) return [];

      // Use buildSelectQuery for automatic tenant filtering
      // v_customer_ar_summary is a view, table mapping handles it
      const { data, error } = await buildSelectQuery('v_customer_ar_summary', '*')
        .gt('total_ar', 0) // Only customers with outstanding AR
        .order('total_ar', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[useTopCustomersAR] Error:', error);
        return [];
      }

      if (!data?.length) return [];

      // Map DB columns to interface - NO CALCULATIONS
      return (data as unknown as Array<Record<string, unknown>>).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        email: row.email as string | undefined,
        phone: row.phone as string | undefined,
        totalAR: Number(row.total_ar) || 0,
        overdueAR: Number(row.overdue_ar) || 0,
        avgPaymentDays: Number(row.avg_payment_days) || 30,
        openInvoiceCount: Number(row.open_invoice_count) || 0,
        overdueInvoiceCount: Number(row.overdue_invoice_count) || 0,
        totalInvoiceCount: Number(row.total_invoice_count) || 0,
        lastInvoiceDate: row.last_invoice_date as string | undefined,
      }));
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
