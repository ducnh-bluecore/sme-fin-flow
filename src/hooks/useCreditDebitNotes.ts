/**
 * useCreditDebitNotes - Credit/Debit notes management
 * 
 * @architecture Schema-per-Tenant
 * @domain Finance/AR
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';
import { toast } from 'sonner';

// Unified adjustment note type
export interface AdjustmentNote {
  id: string;
  tenant_id: string;
  note_type: 'credit_note' | 'debit_note' | 'vendor_credit_note' | 'vendor_debit_note';
  direction: 'customer' | 'vendor';
  note_number: string;
  reference_number: string | null;
  note_date: string;
  due_date: string | null;
  party_id: string | null;
  party_name: string | null;
  party_email: string | null;
  party_address: string | null;
  party_tax_code: string | null;
  original_invoice_id: string | null;
  original_bill_id: string | null;
  original_order_id: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  applied_amount: number;
  remaining_amount: number;
  currency: string;
  exchange_rate: number;
  reason: string | null;
  description: string | null;
  notes: string | null;
  terms: string | null;
  status: 'draft' | 'pending' | 'approved' | 'applied' | 'cancelled' | 'voided';
  approved_by: string | null;
  approved_at: string | null;
  gl_account_id: string | null;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdjustmentNoteItem {
  id: string;
  tenant_id: string;
  adjustment_note_id: string;
  product_id: string | null;
  external_product_id: string | null;
  sku: string | null;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  gl_account_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// Legacy interfaces for backward compatibility
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
  customers?: { name: string };
  invoices?: { invoice_number: string };
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
  customers?: { name: string };
  invoices?: { invoice_number: string };
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

// Helper to transform adjustment_notes to legacy CreditNote format
function toOldCreditNoteFormat(note: AdjustmentNote): CreditNote {
  return {
    id: note.id,
    tenant_id: note.tenant_id,
    credit_note_number: note.note_number,
    invoice_id: note.original_invoice_id,
    customer_id: note.party_id,
    credit_note_date: note.note_date,
    reason: note.reason || '',
    description: note.description,
    status: note.status,
    subtotal: note.subtotal,
    vat_amount: note.tax_amount,
    total_amount: note.total_amount,
    currency_code: note.currency,
    approved_by: note.approved_by,
    approved_at: note.approved_at,
    applied_at: note.status === 'applied' ? note.updated_at : null,
    notes: note.notes,
    created_at: note.created_at,
    updated_at: note.updated_at,
    customers: note.party_name ? { name: note.party_name } : undefined,
  };
}

// Helper to transform adjustment_notes to legacy DebitNote format
function toOldDebitNoteFormat(note: AdjustmentNote): DebitNote {
  return {
    id: note.id,
    tenant_id: note.tenant_id,
    debit_note_number: note.note_number,
    invoice_id: note.original_invoice_id,
    customer_id: note.party_id,
    debit_note_date: note.note_date,
    reason: note.reason || '',
    description: note.description,
    status: note.status,
    subtotal: note.subtotal,
    vat_amount: note.tax_amount,
    total_amount: note.total_amount,
    currency_code: note.currency,
    approved_by: note.approved_by,
    approved_at: note.approved_at,
    applied_at: note.status === 'applied' ? note.updated_at : null,
    notes: note.notes,
    created_at: note.created_at,
    updated_at: note.updated_at,
    customers: note.party_name ? { name: note.party_name } : undefined,
  };
}

// Credit Notes (using new adjustment_notes table)
export function useCreditNotes() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['credit-notes', tenantId],
    queryFn: async (): Promise<CreditNote[]> => {
      if (!tenantId) return [];
      
      let query = client
        .from('adjustment_notes')
        .select('*')
        .eq('note_type', 'credit_note')
        .order('created_at', { ascending: false });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []).map(toOldCreditNoteFormat);
    },
    enabled: !!tenantId && isReady,
  });
}

export function useCreditNoteDetail(id: string | undefined) {
  const { client, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['credit-note-detail', id],
    queryFn: async () => {
      if (!id) return null;
      
      const [noteResult, itemsResult] = await Promise.all([
        client.from('adjustment_notes').select('*').eq('id', id).maybeSingle(),
        client.from('adjustment_note_items').select('*').eq('adjustment_note_id', id),
      ]);
      
      // Note not found - return null instead of throwing
      if (noteResult.error && noteResult.error.code !== 'PGRST116') throw noteResult.error;
      if (!noteResult.data) return null;
      
      return {
        note: toOldCreditNoteFormat(noteResult.data as AdjustmentNote),
        items: (itemsResult.data || []).map(item => ({
          id: item.id,
          credit_note_id: item.adjustment_note_id,
          tenant_id: item.tenant_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          vat_rate: item.tax_rate,
          product_id: item.product_id,
          invoice_item_id: null,
        })),
      };
    },
    enabled: !!id && isReady,
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (input: Partial<CreditNote> & { items?: Partial<CreditNoteItem>[] }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { items, ...noteData } = input;

      // Generate note number
      const noteNumber = `CN-${Date.now()}`;

      const { data: note, error: noteError } = await client
        .from('adjustment_notes')
        .insert({
          note_number: noteNumber,
          note_type: 'credit_note',
          direction: 'customer',
          tenant_id: tenantId,
          original_invoice_id: noteData.invoice_id,
          party_id: noteData.customer_id,
          note_date: noteData.credit_note_date || new Date().toISOString().split('T')[0],
          reason: noteData.reason || 'Điều chỉnh',
          description: noteData.description,
          status: (noteData.status as any) || 'draft',
          subtotal: noteData.subtotal || 0,
          tax_amount: noteData.vat_amount || 0,
          total_amount: noteData.total_amount || 0,
          currency: noteData.currency_code || 'VND',
          notes: noteData.notes,
        })
        .select()
        .single();
      
      if (noteError) throw noteError;

      if (items && items.length > 0) {
        const { error: itemsError } = await client
          .from('adjustment_note_items')
          .insert(
            items.map(item => ({
              description: item.description || '',
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              amount: item.amount || 0,
              tax_rate: item.vat_rate || 0,
              product_id: item.product_id,
              adjustment_note_id: note.id,
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
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await client
        .from('adjustment_notes')
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

// Debit Notes (using new adjustment_notes table)
export function useDebitNotes() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['debit-notes', tenantId],
    queryFn: async (): Promise<DebitNote[]> => {
      if (!tenantId) return [];
      
      let query = client
        .from('adjustment_notes')
        .select('*')
        .eq('note_type', 'debit_note')
        .order('created_at', { ascending: false });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []).map(toOldDebitNoteFormat);
    },
    enabled: !!tenantId && isReady,
  });
}

export function useDebitNoteDetail(id: string | undefined) {
  const { client, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['debit-note-detail', id],
    queryFn: async () => {
      if (!id) return null;
      
      const [noteResult, itemsResult] = await Promise.all([
        client.from('adjustment_notes').select('*').eq('id', id).maybeSingle(),
        client.from('adjustment_note_items').select('*').eq('adjustment_note_id', id),
      ]);
      
      // Note not found - return null instead of throwing
      if (noteResult.error && noteResult.error.code !== 'PGRST116') throw noteResult.error;
      if (!noteResult.data) return null;
      
      return {
        note: toOldDebitNoteFormat(noteResult.data as AdjustmentNote),
        items: (itemsResult.data || []).map(item => ({
          id: item.id,
          debit_note_id: item.adjustment_note_id,
          tenant_id: item.tenant_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          vat_rate: item.tax_rate,
          product_id: item.product_id,
          invoice_item_id: null,
        })),
      };
    },
    enabled: !!id && isReady,
  });
}

export function useCreateDebitNote() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (input: Partial<DebitNote> & { items?: Partial<DebitNoteItem>[] }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { items, ...noteData } = input;

      // Generate note number
      const noteNumber = `DN-${Date.now()}`;

      const { data: note, error: noteError } = await client
        .from('adjustment_notes')
        .insert({
          note_number: noteNumber,
          note_type: 'debit_note',
          direction: 'customer',
          tenant_id: tenantId,
          original_invoice_id: noteData.invoice_id,
          party_id: noteData.customer_id,
          note_date: noteData.debit_note_date || new Date().toISOString().split('T')[0],
          reason: noteData.reason || 'Điều chỉnh',
          description: noteData.description,
          status: (noteData.status as any) || 'draft',
          subtotal: noteData.subtotal || 0,
          tax_amount: noteData.vat_amount || 0,
          total_amount: noteData.total_amount || 0,
          currency: noteData.currency_code || 'VND',
          notes: noteData.notes,
        })
        .select()
        .single();
      
      if (noteError) throw noteError;

      if (items && items.length > 0) {
        const { error: itemsError } = await client
          .from('adjustment_note_items')
          .insert(
            items.map(item => ({
              description: item.description || '',
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              amount: item.amount || 0,
              tax_rate: item.vat_rate || 0,
              product_id: item.product_id,
              adjustment_note_id: note.id,
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
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await client
        .from('adjustment_notes')
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
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['invoice-adjustments', tenantId],
    queryFn: async () => {
      if (!tenantId) return { creditNotes: [], debitNotes: [] };
      
      let query = client
        .from('adjustment_notes')
        .select('*')
        .in('note_type', ['credit_note', 'debit_note'])
        .order('created_at', { ascending: false });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const creditNotes = (data || [])
        .filter(n => n.note_type === 'credit_note')
        .map(toOldCreditNoteFormat);
      const debitNotes = (data || [])
        .filter(n => n.note_type === 'debit_note')
        .map(toOldDebitNoteFormat);
      
      return { creditNotes, debitNotes };
    },
    enabled: !!tenantId && isReady,
  });
}

// Vendor Credit Notes
export function useVendorCreditNotes() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['vendor-credit-notes', tenantId],
    queryFn: async (): Promise<AdjustmentNote[]> => {
      if (!tenantId) return [];
      
      let query = client
        .from('adjustment_notes')
        .select('*')
        .eq('note_type', 'vendor_credit_note')
        .order('created_at', { ascending: false });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as AdjustmentNote[];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useCreateVendorCreditNote() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (input: Partial<AdjustmentNote> & { items?: Partial<AdjustmentNoteItem>[] }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { items, ...noteData } = input;

      const noteNumber = `VCN-${Date.now()}`;

      const { data: note, error: noteError } = await client
        .from('adjustment_notes')
        .insert({
          note_number: noteNumber,
          note_type: 'vendor_credit_note',
          direction: 'vendor',
          tenant_id: tenantId,
          original_bill_id: noteData.original_bill_id,
          party_id: noteData.party_id,
          party_name: noteData.party_name,
          note_date: noteData.note_date || new Date().toISOString().split('T')[0],
          reason: noteData.reason || 'Điều chỉnh',
          description: noteData.description,
          status: 'draft',
          subtotal: noteData.subtotal || 0,
          tax_amount: noteData.tax_amount || 0,
          total_amount: noteData.total_amount || 0,
          currency: noteData.currency || 'VND',
          notes: noteData.notes,
        })
        .select()
        .single();
      
      if (noteError) throw noteError;

      if (items && items.length > 0) {
        const { error: itemsError } = await client
          .from('adjustment_note_items')
          .insert(
            items.map(item => ({
              description: item.description || '',
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              amount: item.amount || 0,
              tax_rate: item.tax_rate || 0,
              product_id: item.product_id,
              adjustment_note_id: note.id,
              tenant_id: tenantId,
            }))
          );
        
        if (itemsError) throw itemsError;
      }

      return note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-credit-notes'] });
      toast.success('Tạo phiếu giảm giá NCC thành công');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}
