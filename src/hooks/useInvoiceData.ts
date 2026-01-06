import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { getDateRangeFromFilter, formatDateForQuery } from '@/lib/dateUtils';

export interface InvoiceWithCustomer {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  issue_date: string;
  due_date: string;
  subtotal: number;
  vat_amount: number;
  discount_amount: number | null;
  total_amount: number;
  paid_amount: number | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customers: {
    name: string;
    email: string | null;
    phone: string | null;
    address?: string | null;
    tax_code?: string | null;
  } | null;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number | null;
  amount: number;
}

export interface Payment {
  id: string;
  invoice_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference_code: string | null;
  notes: string | null;
}

export interface CollectionStats {
  total: number;
  collected: number;
  pending: number;
  overdue: number;
}

// Fetch all invoices with customer info and date range filter
export function useInvoices(dateRange?: string) {
  const { data: tenantId } = useActiveTenantId();

  const range = dateRange ? getDateRangeFromFilter(dateRange) : null;
  const startDateStr = range ? formatDateForQuery(range.startDate) : undefined;
  const endDateStr = range ? formatDateForQuery(range.endDate) : undefined;

  return useQuery({
    // Include concrete bounds so `custom` ranges refetch correctly
    queryKey: ['invoices-all', tenantId, dateRange, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('invoices')
        .select(`
          *,
          customers (name, email, phone, address, tax_code)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Apply date filter if provided
      if (startDateStr && endDateStr) {
        query = query.gte('issue_date', startDateStr).lte('issue_date', endDateStr);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InvoiceWithCustomer[];
    },
    staleTime: 30000,
    enabled: !!tenantId,
  });
}

// Fetch single invoice with full details - OPTIMIZED with parallel queries
export function useInvoiceDetail(invoiceId: string | undefined) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['invoice-detail', tenantId, invoiceId],
    queryFn: async () => {
      if (!invoiceId || !tenantId) return null;

      // Fetch all data in parallel for better performance
      const [invoiceResult, itemsResult, paymentsResult, promotionsResult] = await Promise.all([
        supabase
          .from('invoices')
          .select(`
            *,
            customers (id, name, email, phone, address, tax_code)
          `)
          .eq('id', invoiceId)
          .eq('tenant_id', tenantId)
          .maybeSingle(),
        supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', invoiceId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: true }),
        supabase
          .from('payments')
          .select('*')
          .eq('invoice_id', invoiceId)
          .eq('tenant_id', tenantId)
          .order('payment_date', { ascending: false }),
        supabase
          .from('invoice_promotions')
          .select('*')
          .eq('invoice_id', invoiceId)
          .eq('tenant_id', tenantId)
      ]);

      if (invoiceResult.error) throw invoiceResult.error;
      if (!invoiceResult.data) return null;

      if (itemsResult.error) throw itemsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (promotionsResult.error) throw promotionsResult.error;

      return {
        ...invoiceResult.data,
        items: itemsResult.data || [],
        payments: paymentsResult.data || [],
        promotions: promotionsResult.data || [],
      };
    },
    staleTime: 30000,
    enabled: !!invoiceId && !!tenantId,
  });
}

// Calculate collection stats with date range filter
export function useCollectionStats(dateRange?: string) {
  const { data: invoices, isLoading, error } = useInvoices(dateRange);

  const stats: CollectionStats = {
    total: 0,
    collected: 0,
    pending: 0,
    overdue: 0,
  };

  if (invoices) {
    invoices.forEach((inv) => {
      stats.total += inv.total_amount || 0;
      const paidAmount = inv.paid_amount || 0;
      
      if (inv.status === 'paid' || inv.status === 'closed') {
        stats.collected += inv.total_amount || 0;
      } else if (inv.status === 'overdue') {
        stats.overdue += (inv.total_amount - paidAmount);
      } else {
        stats.pending += (inv.total_amount - paidAmount);
      }
    });
  }

  return { stats, invoices, isLoading, error };
}

// Get invoice tracking data with days overdue calculation and date range filter
export function useInvoiceTracking(dateRange?: string) {
  const { data: invoices, isLoading, error } = useInvoices(dateRange);

  const trackingData = invoices?.map((inv) => {
    const dueDate = new Date(inv.due_date);
    const today = new Date();
    const daysOverdue = inv.status === 'overdue' || inv.status === 'issued' 
      ? Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      ...inv,
      daysOverdue,
      remindersSent: Math.floor(daysOverdue / 7),
      lastContact: daysOverdue > 0 ? new Date(today.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
    };
  });

  return { invoices: trackingData, isLoading, error };
}
