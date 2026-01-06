import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveTenantId } from './useActiveTenantId';

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string | null;
  currency: string | null;
  current_balance: number | null;
  status: string | null;
  last_sync_at: string | null;
  created_at: string;
}

export interface BankTransaction {
  id: string;
  bank_account_id: string | null;
  transaction_date: string;
  amount: number;
  transaction_type: string;
  reference: string | null;
  description: string | null;
  match_status: string | null;
  matched_invoice_id: string | null;
  created_at: string;
  bank_accounts?: {
    bank_name: string;
    account_number: string;
  } | null;
}

// Fetch all bank accounts
export function useBankAccounts() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['bank-accounts', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('bank_name', { ascending: true });

      if (error) throw error;
      return data as BankAccount[];
    },
    staleTime: 30000,
    enabled: !!tenantId,
  });
}

// Fetch bank transactions
export function useBankTransactions(bankAccountId?: string) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['bank-transactions', tenantId, bankAccountId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('bank_transactions')
        .select(`
          *,
          bank_accounts (bank_name, account_number)
        `)
        .eq('tenant_id', tenantId)
        .order('transaction_date', { ascending: false });

      if (bankAccountId) {
        query = query.eq('bank_account_id', bankAccountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BankTransaction[];
    },
    staleTime: 30000,
    enabled: !!tenantId,
  });
}

// Get bank account stats
export function useBankStats() {
  const { data: accounts, isLoading: loadingAccounts } = useBankAccounts();
  const { data: transactions, isLoading: loadingTxns } = useBankTransactions();

  const stats = {
    totalAccounts: 0,
    activeAccounts: 0,
    totalBalance: 0,
    totalTransactions: 0,
    matchedTransactions: 0,
    unmatchedTransactions: 0,
  };

  if (accounts) {
    stats.totalAccounts = accounts.length;
    stats.activeAccounts = accounts.filter(a => a.status === 'active').length;
    stats.totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
  }

  if (transactions) {
    stats.totalTransactions = transactions.length;
    stats.matchedTransactions = transactions.filter(t => t.match_status === 'matched').length;
    stats.unmatchedTransactions = transactions.filter(t => t.match_status === 'unmatched').length;
  }

  return { 
    stats, 
    accounts, 
    transactions,
    isLoading: loadingAccounts || loadingTxns 
  };
}

// Update bank account
export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BankAccount> }) => {
      const { error } = await supabase
        .from('bank_accounts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Cập nhật thành công');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    }
  });
}
