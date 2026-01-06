import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';

export interface CreditNote {
  id: string;
  tenant_id: string;
  credit_note_number: string;
  invoice_id: string | null;
  customer_id: string | null;
  credit_note_date: string;
  reason: string;
  description: string | null;
  status: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  currency_code: string | null;
  approved_by: string | null;
  approved_at: string | null;
  applied_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditNoteItem {
  id: string;
  credit_note_id: string;
  tenant_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  vat_rate: number | null;
  product_id: string | null;
  invoice_item_id: string | null;
}

export interface DebitNote {
  id: string;
  tenant_id: string;
  debit_note_number: string;
  invoice_id: string | null;
  customer_id: string | null;
  debit_note_date: string;
  reason: string;
  description: string | null;
  status: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  currency_code: string | null;
  approved_by: string | null;
  approved_at: string | null;
  applied_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DebitNoteItem {
  id: string;
  debit_note_id: string;
  tenant_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  vat_rate: number | null;
  product_id: string | null;
  invoice_item_id: string | null;
}

// Credit Notes
export function useCreditNotes() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['credit-notes', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('credit_notes')
        .select('*, customers(name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useCreditNoteDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['credit-note-detail', id],
    queryFn: async () => {
      if (!id) return null;
      
      const [noteResult, itemsResult] = await Promise.all([
        supabase.from('credit_notes').select('*, customers(name), invoices(invoice_number)').eq('id', id).single(),
        supabase.from('credit_note_items').select('*').eq('credit_note_id', id),
      ]);
      
      if (noteResult.error) throw noteResult.error;
      
      return {
        note: noteResult.data,
        items: itemsResult.data || [],
      };
    },
    enabled: !!id,
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (input: Partial<CreditNote> & { items?: Partial<CreditNoteItem>[] }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { items, ...noteData } = input;

      const { data: noteNumber } = await supabase
        .rpc('generate_credit_note_number', { p_tenant_id: tenantId });

      const { data: note, error: noteError } = await supabase
        .from('credit_notes')
        .insert({
          credit_note_number: noteNumber || `CN-${Date.now()}`,
          reason: noteData.reason || 'Điều chỉnh',
          tenant_id: tenantId,
          invoice_id: noteData.invoice_id,
          customer_id: noteData.customer_id,
          credit_note_date: noteData.credit_note_date,
          description: noteData.description,
          status: noteData.status,
          subtotal: noteData.subtotal,
          vat_amount: noteData.vat_amount,
          total_amount: noteData.total_amount,
          currency_code: noteData.currency_code,
          notes: noteData.notes,
        })
        .select()
        .single();
      
      if (noteError) throw noteError;

      if (items && items.length > 0) {
        const { error: itemsError } = await supabase
          .from('credit_note_items')
          .insert(
            items.map(item => ({
              description: item.description || '',
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              amount: item.amount || 0,
              vat_rate: item.vat_rate,
              product_id: item.product_id,
              invoice_item_id: item.invoice_item_id,
              credit_note_id: note.id,
              tenant_id: tenantId,
            }))
          );
        
        if (itemsError) throw itemsError;
      }

      return note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      toast.success('Tạo phiếu giảm giá thành công');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useUpdateCreditNoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('credit_notes')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      queryClient.invalidateQueries({ queryKey: ['credit-note-detail'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

// Debit Notes
export function useDebitNotes() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['debit-notes', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('debit_notes')
        .select('*, customers(name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useDebitNoteDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['debit-note-detail', id],
    queryFn: async () => {
      if (!id) return null;
      
      const [noteResult, itemsResult] = await Promise.all([
        supabase.from('debit_notes').select('*, customers(name), invoices(invoice_number)').eq('id', id).single(),
        supabase.from('debit_note_items').select('*').eq('debit_note_id', id),
      ]);
      
      if (noteResult.error) throw noteResult.error;
      
      return {
        note: noteResult.data,
        items: itemsResult.data || [],
      };
    },
    enabled: !!id,
  });
}

export function useCreateDebitNote() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (input: Partial<DebitNote> & { items?: Partial<DebitNoteItem>[] }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { items, ...noteData } = input;

      const { data: noteNumber } = await supabase
        .rpc('generate_debit_note_number', { p_tenant_id: tenantId });

      const { data: note, error: noteError } = await supabase
        .from('debit_notes')
        .insert({
          debit_note_number: noteNumber || `DN-${Date.now()}`,
          reason: noteData.reason || 'Điều chỉnh',
          tenant_id: tenantId,
          invoice_id: noteData.invoice_id,
          customer_id: noteData.customer_id,
          debit_note_date: noteData.debit_note_date,
          description: noteData.description,
          status: noteData.status,
          subtotal: noteData.subtotal,
          vat_amount: noteData.vat_amount,
          total_amount: noteData.total_amount,
          currency_code: noteData.currency_code,
          notes: noteData.notes,
        })
        .select()
        .single();
      
      if (noteError) throw noteError;

      if (items && items.length > 0) {
        const { error: itemsError } = await supabase
          .from('debit_note_items')
          .insert(
            items.map(item => ({
              description: item.description || '',
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              amount: item.amount || 0,
              vat_rate: item.vat_rate,
              product_id: item.product_id,
              invoice_item_id: item.invoice_item_id,
              debit_note_id: note.id,
              tenant_id: tenantId,
            }))
          );
        
        if (itemsError) throw itemsError;
      }

      return note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debit-notes'] });
      toast.success('Tạo phiếu phụ thu thành công');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useUpdateDebitNoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('debit_notes')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debit-notes'] });
      queryClient.invalidateQueries({ queryKey: ['debit-note-detail'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

// Invoice adjustments summary
export function useInvoiceAdjustments() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['invoice-adjustments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('invoice_adjustments_summary')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}
