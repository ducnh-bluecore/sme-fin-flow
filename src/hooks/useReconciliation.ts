/**
 * useReconciliation - Bank transaction reconciliation
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * @domain FDP/Banking
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';

interface MatchResult {
  invoiceId: string;
  transactionId: string;
  confidence: number;
  matchType: 'exact' | 'partial' | 'suggested';
  reason: string;
}

interface ReconciliationStats {
  totalInvoices: number;
  matchedInvoices: number;
  partialMatches: number;
  unmatchedInvoices: number;
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  autoMatchRate: number;
}

// Fetch invoices with customer info
export function useInvoices() {
  const { tenantId, isReady, buildSelectQuery } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['invoices-reconciliation', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const query = buildSelectQuery('invoices', `
          *,
          customers (name)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as any[];
    },
    staleTime: 30000,
    enabled: !!tenantId && isReady,
  });
}

// Fetch bank transactions
export function useBankTransactions() {
  const { tenantId, isReady, buildSelectQuery } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['bank-transactions-reconciliation', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const query = buildSelectQuery('bank_transactions', `
          *,
          bank_accounts (bank_name, account_number)
        `)
        .order('transaction_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as any[];
    },
    staleTime: 30000,
    enabled: !!tenantId && isReady,
  });
}

// Auto-match algorithm
function findMatches(
  invoices: any[],
  transactions: any[]
): MatchResult[] {
  const results: MatchResult[] = [];
  const unmatchedTransactions = transactions.filter(t => t.match_status === 'unmatched');
  const unmatchedInvoices = invoices.filter(i => 
    i.status !== 'paid' && i.status !== 'closed'
  );

  for (const txn of unmatchedTransactions) {
    const txnAmount = Math.abs(txn.amount);
    const txnDesc = (txn.description || '').toLowerCase();
    const txnRef = (txn.reference || '').toLowerCase();

    for (const inv of unmatchedInvoices) {
      const invAmount = inv.total_amount - (inv.paid_amount || 0);
      const remaining = invAmount;
      
      if (remaining <= 0) continue;

      let confidence = 0;
      let matchType: 'exact' | 'partial' | 'suggested' = 'suggested';
      const reasons: string[] = [];

      if (Math.abs(txnAmount - remaining) < 1) {
        confidence += 50;
        matchType = 'exact';
        reasons.push('Số tiền khớp chính xác');
      } 
      else if (txnAmount <= remaining && txnAmount > 0) {
        confidence += 30;
        matchType = 'partial';
        reasons.push('Số tiền khớp một phần');
      }
      else if (txnAmount > remaining) {
        continue;
      }

      const invNum = inv.invoice_number.toLowerCase();
      if (txnDesc.includes(invNum) || txnRef.includes(invNum)) {
        confidence += 40;
        reasons.push('Mã hóa đơn khớp');
      }

      const customerName = (inv.customers?.name || '').toLowerCase();
      if (customerName && (txnDesc.includes(customerName) || txnRef.includes(customerName.slice(0, 10)))) {
        confidence += 25;
        reasons.push('Tên khách hàng khớp');
      }

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
          reason: reasons.join(', ')
        });
      }
    }
  }

  const uniqueResults = results
    .sort((a, b) => b.confidence - a.confidence)
    .reduce((acc, curr) => {
      if (!acc.find(r => r.transactionId === curr.transactionId)) {
        acc.push(curr);
      }
      return acc;
    }, [] as MatchResult[]);

  return uniqueResults;
}

// Match mutation
export function useMatchTransaction() {
  const { client } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      invoiceId, 
      transactionId, 
      amount 
    }: { 
      invoiceId: string; 
      transactionId: string;
      amount: number;
    }) => {
      const { error: txnError } = await client
        .from('bank_transactions')
        .update({
          match_status: 'matched',
          matched_invoice_id: invoiceId
        })
        .eq('id', transactionId);

      if (txnError) throw txnError;

      const { data: invoice, error: invFetchError } = await client
        .from('invoices')
        .select('paid_amount, total_amount')
        .eq('id', invoiceId)
        .single();

      if (invFetchError) throw invFetchError;

      const newPaidAmount = (invoice.paid_amount || 0) + amount;
      const newStatus = newPaidAmount >= invoice.total_amount ? 'paid' : 'issued';

      const { error: invError } = await client
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          status: newStatus
        })
        .eq('id', invoiceId);

      if (invError) throw invError;

      const { error: paymentError } = await client
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          amount: amount,
          payment_method: 'bank_transfer',
          notes: 'Auto-matched từ giao dịch ngân hàng'
        });

      if (paymentError) throw paymentError;

      return { invoiceId, transactionId, amount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions-reconciliation'] });
      toast.success('Đối soát thành công');
    },
    onError: (error) => {
      toast.error('Lỗi đối soát: ' + error.message);
    }
  });
}

// Auto-match hook
export function useAutoMatch() {
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const { data: invoices } = useInvoices();
  const { data: transactions } = useBankTransactions();
  const matchMutation = useMatchTransaction();
  const queryClient = useQueryClient();

  /**
   * GOVERNANCE FIX (v3.1): Auto-match NO LONGER writes to ledger
   */
  const runAutoMatch = useCallback(async (_autoApply: boolean = false) => {
    if (!invoices || !transactions) {
      toast.error('Dữ liệu chưa sẵn sàng');
      return [];
    }

    setIsMatching(true);
    
    try {
      const matches = findMatches(invoices, transactions);
      setMatchResults(matches);

      const highConfidenceCount = matches.filter(m => m.confidence >= 80).length;

      if (matches.length > 0) {
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
  }, [invoices, transactions]);

  const applyMatch = useCallback(async (match: MatchResult) => {
    if (!transactions) return;
    
    const txn = transactions.find(t => t.id === match.transactionId);
    if (!txn) return;

    await matchMutation.mutateAsync({
      invoiceId: match.invoiceId,
      transactionId: match.transactionId,
      amount: Math.abs(txn.amount)
    });

    setMatchResults(prev => prev.filter(r => r.transactionId !== match.transactionId));
  }, [transactions, matchMutation]);

  const getStats = useCallback((): ReconciliationStats => {
    if (!invoices || !transactions) {
      return {
        totalInvoices: 0,
        matchedInvoices: 0,
        partialMatches: 0,
        unmatchedInvoices: 0,
        totalTransactions: 0,
        matchedTransactions: 0,
        unmatchedTransactions: 0,
        autoMatchRate: 0
      };
    }

    const matchedTxn = transactions.filter(t => t.match_status === 'matched').length;
    const totalTxn = transactions.length;
    const paidInvoices = invoices.filter(i => i.status === 'paid' || i.status === 'closed').length;
    const partialInvoices = invoices.filter(i => 
      (i.paid_amount || 0) > 0 && 
      (i.paid_amount || 0) < i.total_amount
    ).length;

    return {
      totalInvoices: invoices.length,
      matchedInvoices: paidInvoices,
      partialMatches: partialInvoices,
      unmatchedInvoices: invoices.length - paidInvoices - partialInvoices,
      totalTransactions: totalTxn,
      matchedTransactions: matchedTxn,
      unmatchedTransactions: totalTxn - matchedTxn,
      autoMatchRate: totalTxn > 0 ? Math.round((matchedTxn / totalTxn) * 100) : 0
    };
  }, [invoices, transactions]);

  return {
    isMatching,
    matchResults,
    runAutoMatch,
    applyMatch,
    getStats,
    invoices,
    transactions
  };
}
