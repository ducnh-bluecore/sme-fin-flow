/**
 * SSOT Reconciliation Hooks
 * 
 * These hooks implement the SSOT reconciliation pattern:
 * - READ from views (v_invoice_settled_status, v_bank_txn_match_state)
 * - WRITE to ledger (reconciliation_links, settlement_allocations)
 * - NEVER mutate source tables (invoices, bank_transactions)
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveTenantId } from './useActiveTenantId';

// Types
export interface ReconciliationLink {
  id: string;
  tenant_id: string;
  bank_transaction_id: string | null;
  settlement_amount: number;
  currency: string;
  settlement_date: string;
  target_type: string;
  target_id: string;
  match_type: 'manual' | 'exact' | 'probabilistic' | 'aggregate';
  confidence: number;
  match_evidence: Record<string, any>;
  created_by: string | null;
  created_at: string;
  is_voided: boolean;
  void_reason: string | null;
  voided_at: string | null;
}

export interface InvoiceSettledStatus {
  invoice_id: string;
  tenant_id: string;
  invoice_number: string;
  total_amount: number;
  settled_paid_amount: number;
  remaining_amount: number;
  settled_status: 'paid' | 'partially_paid' | 'unpaid';
  truth_level: 'settled';
}

export interface BankTxnMatchState {
  bank_transaction_id: string;
  tenant_id: string;
  bank_amount: number;
  transaction_date: string;
  description: string | null;
  reference: string | null;
  matched_amount: number;
  unmatched_amount: number;
  match_state: 'unmatched' | 'partially_matched' | 'matched';
  link_count: number;
}

export interface MatchResult {
  invoiceId: string;
  transactionId: string;
  confidence: number;
  matchType: 'exact' | 'partial' | 'suggested';
  reason: string;
}

export interface ReconciliationStats {
  totalInvoices: number;
  matchedInvoices: number;
  partialMatches: number;
  unmatchedInvoices: number;
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  autoMatchRate: number;
}

// ============ READ HOOKS (from SSOT Views) ============

/**
 * Fetch invoice settled status from SSOT view
 * Replaces reading from invoices.paid_amount and invoices.status
 */
export function useInvoiceSettledStatus() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['invoice-settled-status', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_invoice_settled_status')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return data as InvoiceSettledStatus[];
    },
    staleTime: 30000,
    enabled: !!tenantId,
  });
}

/**
 * Fetch bank transaction match state from SSOT view
 * Replaces reading from bank_transactions.match_status
 */
export function useBankTxnMatchState() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['bank-txn-match-state', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_bank_txn_match_state')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return data as BankTxnMatchState[];
    },
    staleTime: 30000,
    enabled: !!tenantId,
  });
}

/**
 * Fetch reconciliation links (ledger entries)
 */
export function useReconciliationLinks(includeVoided: boolean = false) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['reconciliation-links', tenantId, includeVoided],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('reconciliation_links')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (!includeVoided) {
        query = query.eq('is_voided', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ReconciliationLink[];
    },
    staleTime: 30000,
    enabled: !!tenantId,
  });
}

// ============ WRITE HOOKS (to SSOT Ledger) ============

/**
 * Create a reconciliation link (SSOT match)
 * This is the ONLY way to record a match - append-only pattern
 */
export function useCreateReconciliationLink() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async ({
      bankTransactionId,
      invoiceId,
      settlementAmount,
      matchType,
      confidence,
      matchEvidence = {},
    }: {
      bankTransactionId: string | null;
      invoiceId: string;
      settlementAmount: number;
      matchType: 'manual' | 'exact' | 'probabilistic' | 'aggregate';
      confidence: number;
      matchEvidence?: Record<string, any>;
    }) => {
      if (!tenantId) throw new Error('No tenant selected');

      // Validate SSOT constraint
      if (matchType === 'manual' && bankTransactionId !== null) {
        throw new Error('Manual matches must not have a bank transaction');
      }
      if (matchType !== 'manual' && bankTransactionId === null) {
        throw new Error('Non-manual matches must have a bank transaction');
      }

      const { data, error } = await supabase
        .from('reconciliation_links')
        .insert({
          tenant_id: tenantId,
          bank_transaction_id: bankTransactionId,
          settlement_amount: settlementAmount,
          settlement_date: new Date().toISOString().split('T')[0],
          target_type: 'invoice',
          target_id: invoiceId,
          match_type: matchType,
          confidence,
          match_evidence: matchEvidence,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all SSOT views
      queryClient.invalidateQueries({ queryKey: ['invoice-settled-status'] });
      queryClient.invalidateQueries({ queryKey: ['bank-txn-match-state'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-links'] });
      // Also invalidate legacy queries for backward compatibility
      queryClient.invalidateQueries({ queryKey: ['invoices-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions-reconciliation'] });
      toast.success('Đối soát thành công');
    },
    onError: (error) => {
      toast.error('Lỗi đối soát: ' + error.message);
    },
  });
}

/**
 * Void a reconciliation link (SSOT unmatch)
 * We NEVER delete - only void with reason
 */
export function useVoidReconciliationLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkId,
      voidReason,
    }: {
      linkId: string;
      voidReason: string;
    }) => {
      const { data, error } = await supabase
        .from('reconciliation_links')
        .update({
          is_voided: true,
          void_reason: voidReason,
          voided_at: new Date().toISOString(),
        })
        .eq('id', linkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-settled-status'] });
      queryClient.invalidateQueries({ queryKey: ['bank-txn-match-state'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-links'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions-reconciliation'] });
      toast.success('Đã hủy đối soát');
    },
    onError: (error) => {
      toast.error('Lỗi hủy đối soát: ' + error.message);
    },
  });
}

// ============ COMPOSITE HOOKS ============

/**
 * SSOT Auto-match hook
 * Uses SSOT views for reading, ledger for writing
 */
export function useAutoMatchSSOT() {
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  
  // Read from SSOT views
  const { data: invoiceStatus } = useInvoiceSettledStatus();
  const { data: bankTxnState } = useBankTxnMatchState();
  
  // Also fetch full invoice/transaction data for matching algorithm
  const { data: invoices } = useQuery({
    queryKey: ['invoices-for-matching'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions-for-matching'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*, bank_accounts(bank_name, account_number)')
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createLink = useCreateReconciliationLink();

  // Auto-match algorithm using SSOT state
  const findMatches = useCallback((): MatchResult[] => {
    if (!invoices || !transactions || !invoiceStatus || !bankTxnState) {
      return [];
    }

    const results: MatchResult[] = [];
    
    // Use SSOT views to determine what's unmatched
    const unmatchedTxnIds = new Set(
      bankTxnState
        .filter(t => t.match_state === 'unmatched')
        .map(t => t.bank_transaction_id)
    );
    
    const unpaidInvoiceIds = new Set(
      invoiceStatus
        .filter(i => i.settled_status !== 'paid')
        .map(i => i.invoice_id)
    );

    // Filter to unmatched items
    const unmatchedTransactions = transactions.filter(t => unmatchedTxnIds.has(t.id));
    const unpaidInvoices = invoices.filter(i => unpaidInvoiceIds.has(i.id));

    // Get remaining amounts from SSOT view
    const invoiceRemainingMap = new Map(
      invoiceStatus.map(i => [i.invoice_id, i.remaining_amount])
    );

    for (const txn of unmatchedTransactions) {
      const txnAmount = Math.abs(txn.amount);
      const txnDesc = (txn.description || '').toLowerCase();
      const txnRef = (txn.reference || '').toLowerCase();

      for (const inv of unpaidInvoices) {
        const remaining = invoiceRemainingMap.get(inv.id) || inv.total_amount;
        
        if (remaining <= 0) continue;

        let confidence = 0;
        let matchType: 'exact' | 'partial' | 'suggested' = 'suggested';
        const reasons: string[] = [];

        // Amount matching
        if (Math.abs(txnAmount - remaining) < 1) {
          confidence += 50;
          matchType = 'exact';
          reasons.push('Số tiền khớp chính xác');
        } else if (txnAmount <= remaining && txnAmount > 0) {
          confidence += 30;
          matchType = 'partial';
          reasons.push('Số tiền khớp một phần');
        } else if (txnAmount > remaining) {
          continue;
        }

        // Invoice number match
        const invNum = inv.invoice_number.toLowerCase();
        if (txnDesc.includes(invNum) || txnRef.includes(invNum)) {
          confidence += 40;
          reasons.push('Mã hóa đơn khớp');
        }

        // Customer name match
        const customerName = (inv.customers?.name || '').toLowerCase();
        if (customerName && (txnDesc.includes(customerName) || txnRef.includes(customerName.slice(0, 10)))) {
          confidence += 25;
          reasons.push('Tên khách hàng khớp');
        }

        // Date proximity
        const invDue = new Date(inv.due_date);
        const txnDate = new Date(txn.transaction_date);
        const daysDiff = Math.abs((txnDate.getTime() - invDue.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 7) {
          confidence += 15;
          reasons.push('Ngày giao dịch gần hạn thanh toán');
        } else if (daysDiff <= 30) {
          confidence += 5;
        }

        if (confidence >= 40) {
          results.push({
            invoiceId: inv.id,
            transactionId: txn.id,
            confidence: Math.min(confidence, 100),
            matchType,
            reason: reasons.join(', '),
          });
        }
      }
    }

    // Deduplicate
    return results
      .sort((a, b) => b.confidence - a.confidence)
      .reduce((acc, curr) => {
        if (!acc.find(r => r.transactionId === curr.transactionId)) {
          acc.push(curr);
        }
        return acc;
      }, [] as MatchResult[]);
  }, [invoices, transactions, invoiceStatus, bankTxnState]);

  /**
   * GOVERNANCE FIX (v3.1): Auto-match NO LONGER writes to ledger
   * 
   * High-confidence matches are SUGGESTED ONLY - ledger writes only via:
   * 1. User explicitly confirms via applyMatch()
   * 2. Guardrails auto-confirm path (with audit trail)
   * 
   * This ensures enterprise safety and prevents bypass of governance controls.
   */
  const runAutoMatch = useCallback(async (_autoApply: boolean = false) => {
    // GOVERNANCE: autoApply parameter is now ignored - all matches are suggestions only
    if (!invoices || !transactions) {
      toast.error('Dữ liệu chưa sẵn sàng');
      return [];
    }

    setIsMatching(true);

    try {
      const matches = findMatches();
      setMatchResults(matches);

      const highConfidenceCount = matches.filter(m => m.confidence >= 80).length;

      if (matches.length > 0) {
        // GOVERNANCE: Never auto-apply - only suggest
        toast.info(
          `Tìm thấy ${matches.length} giao dịch có thể khớp` +
          (highConfidenceCount > 0 ? ` (${highConfidenceCount} độ tin cậy cao)` : '')
        );
      } else {
        toast.info('Không tìm thấy giao dịch phù hợp để khớp');
      }

      return matches;
    } catch (error) {
      toast.error('Lỗi khi chạy đối soát tự động');
      return [];
    } finally {
      setIsMatching(false);
    }
  }, [invoices, transactions, findMatches]);

  const applyMatch = useCallback(async (match: MatchResult) => {
    if (!transactions) return;

    const txn = transactions.find(t => t.id === match.transactionId);
    if (!txn) return;

    await createLink.mutateAsync({
      bankTransactionId: txn.id,
      invoiceId: match.invoiceId,
      settlementAmount: Math.abs(txn.amount),
      matchType: match.matchType === 'exact' ? 'exact' : 'probabilistic',
      confidence: match.confidence,
      matchEvidence: {
        source: 'manual_apply',
        reason: match.reason,
        algorithm_version: '2.0_ssot',
      },
    });

    setMatchResults(prev => prev.filter(r => r.transactionId !== match.transactionId));
  }, [transactions, createLink]);

  const getStats = useCallback((): ReconciliationStats => {
    if (!invoiceStatus || !bankTxnState) {
      return {
        totalInvoices: 0,
        matchedInvoices: 0,
        partialMatches: 0,
        unmatchedInvoices: 0,
        totalTransactions: 0,
        matchedTransactions: 0,
        unmatchedTransactions: 0,
        autoMatchRate: 0,
      };
    }

    const paidInvoices = invoiceStatus.filter(i => i.settled_status === 'paid').length;
    const partialInvoices = invoiceStatus.filter(i => i.settled_status === 'partially_paid').length;
    const matchedTxn = bankTxnState.filter(t => t.match_state === 'matched').length;
    const totalTxn = bankTxnState.length;

    return {
      totalInvoices: invoiceStatus.length,
      matchedInvoices: paidInvoices,
      partialMatches: partialInvoices,
      unmatchedInvoices: invoiceStatus.length - paidInvoices - partialInvoices,
      totalTransactions: totalTxn,
      matchedTransactions: matchedTxn,
      unmatchedTransactions: totalTxn - matchedTxn,
      autoMatchRate: totalTxn > 0 ? Math.round((matchedTxn / totalTxn) * 100) : 0,
    };
  }, [invoiceStatus, bankTxnState]);

  return {
    isMatching,
    matchResults,
    runAutoMatch,
    applyMatch,
    getStats,
    invoices,
    transactions,
    // SSOT data
    invoiceStatus,
    bankTxnState,
  };
}
