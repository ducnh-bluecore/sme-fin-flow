/**
 * useBillsData - Bills and vendor payment management
 * 
 * Schema-per-Tenant Ready
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';
import { toast } from 'sonner';
import { getDateRangeFromFilter, formatDateForQuery } from '@/lib/dateUtils';

export interface Bill {
  id: string;
  tenant_id: string;
  bill_number: string;
  vendor_bill_number: string | null;
  vendor_id: string | null;
  vendor_name: string;
  bill_date: string;
  due_date: string;
  received_date: string | null;
  status: string;
  subtotal: number;
  vat_amount: number;
  discount_amount: number | null;
  total_amount: number;
  paid_amount: number | null;
  credit_note_amount: number | null;
  payment_terms: number | null;
  expense_category: string | null;
  notes: string | null;
  currency_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillItem {
  id: string;
  bill_id: string;
  tenant_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  vat_rate: number | null;
  product_id: string | null;
  gl_account_id: string | null;
}

export interface VendorPayment {
  id: string;
  tenant_id: string;
  bill_id: string | null;
  vendor_id: string | null;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference_code: string | null;
  notes: string | null;
  created_at: string;
}

export function useBills(dateRange?: string) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  const range = dateRange ? getDateRangeFromFilter(dateRange) : null;
  const startDateStr = range ? formatDateForQuery(range.startDate) : undefined;
  const endDateStr = range ? formatDateForQuery(range.endDate) : undefined;

  return useQuery({
    queryKey: ['bills', tenantId, dateRange, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = client
        .from('bills')
        .select('*')
        .order('created_at', { ascending: false });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      if (startDateStr && endDateStr) {
        query = query.gte('bill_date', startDateStr).lte('bill_date', endDateStr);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Bill[];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useBillDetail(billId: string | undefined) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['bill-detail', tenantId, billId],
    queryFn: async () => {
      if (!billId) return null;
      
      const [billResult, itemsResult, paymentsResult] = await Promise.all([
        client.from('bills').select('*').eq('id', billId).maybeSingle(),
        client.from('bill_items').select('*').eq('bill_id', billId),
        client.from('vendor_payments').select('*').eq('bill_id', billId),
      ]);
      
      if (billResult.error && billResult.error.code !== 'PGRST116') throw billResult.error;
      if (!billResult.data) return null;
      
      return {
        bill: billResult.data as Bill,
        items: (itemsResult.data || []) as BillItem[],
        payments: (paymentsResult.data || []) as VendorPayment[],
      };
    },
    enabled: !!billId && !!tenantId && isReady,
  });
}

export function useCreateBill() {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<Bill> & { items?: Partial<BillItem>[] }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { items, ...billData } = input;

      const { data: billNumber } = await client
        .rpc('generate_bill_number', { p_tenant_id: tenantId });

      const { data: bill, error: billError } = await client
        .from('bills')
        .insert({
          bill_number: billNumber || `BILL-${Date.now()}`,
          vendor_name: billData.vendor_name || 'Unknown',
          due_date: billData.due_date || new Date().toISOString().split('T')[0],
          tenant_id: tenantId,
          ...billData,
        })
        .select()
        .single();
      
      if (billError) throw billError;

      if (items && items.length > 0) {
        const { error: itemsError } = await client
          .from('bill_items')
          .insert(
            items.map(item => ({
              description: item.description || '',
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              amount: item.amount || 0,
              vat_rate: item.vat_rate,
              product_id: item.product_id,
              gl_account_id: item.gl_account_id,
              bill_id: bill.id,
              tenant_id: tenantId,
            }))
          );
        
        if (itemsError) throw itemsError;
      }

      return bill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Tạo hóa đơn mua hàng thành công');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useUpdateBillStatus() {
  const { client } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await client
        .from('bills')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bill-detail'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useCreateVendorPayment() {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<VendorPayment>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: paymentNumber } = await client
        .rpc('generate_payment_number', { p_tenant_id: tenantId, p_type: 'payment' });

      const { data, error } = await client
        .from('vendor_payments')
        .insert({
          payment_number: paymentNumber || `PC-${Date.now()}`,
          amount: input.amount || 0,
          tenant_id: tenantId,
          bill_id: input.bill_id,
          vendor_id: input.vendor_id,
          payment_date: input.payment_date,
          payment_method: input.payment_method,
          reference_code: input.reference_code,
          notes: input.notes,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bill-detail'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-payments'] });
      toast.success('Ghi nhận thanh toán thành công');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useVendors() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['vendors', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = client
        .from('vendors')
        .select('*')
        .order('name');

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && isReady,
  });
}

export function useAPAging() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['ap-aging', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = client
        .from('ap_aging')
        .select('*');

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && isReady,
  });
}
