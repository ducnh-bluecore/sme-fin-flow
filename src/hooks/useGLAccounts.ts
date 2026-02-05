import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';

export interface GLAccount {
  id: string;
  tenant_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype: string | null;
  normal_balance: string;
  parent_account_id: string | null;
  level: number;
  is_header: boolean;
  is_active: boolean;
  is_system: boolean;
  current_balance: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface GLAccountInput {
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype?: string | null;
  normal_balance: string;
  parent_account_id?: string | null;
  level?: number;
  is_header?: boolean;
  is_active?: boolean;
  description?: string | null;
}

export function useGLAccounts() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['gl-accounts', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await buildSelectQuery('gl_accounts', '*')
        .order('account_code');
      
      if (error) throw error;
      return data as unknown as GLAccount[];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useGLAccountTree() {
  const { data: accounts, ...rest } = useGLAccounts();

  const buildTree = (accounts: GLAccount[]): (GLAccount & { children: GLAccount[] })[] => {
    const accountMap = new Map<string, GLAccount & { children: GLAccount[] }>();
    const roots: (GLAccount & { children: GLAccount[] })[] = [];

    accounts?.forEach(account => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    accounts?.forEach(account => {
      const node = accountMap.get(account.id)!;
      if (account.parent_account_id) {
        const parent = accountMap.get(account.parent_account_id);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  return {
    ...rest,
    data: accounts,
    tree: accounts ? buildTree(accounts) : [],
  };
}

export function useCreateGLAccount() {
  const queryClient = useQueryClient();
  const { buildInsertQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (input: GLAccountInput) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await buildInsertQuery('gl_accounts', input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl-accounts'] });
      toast.success('Tạo tài khoản thành công');
    },
    onError: (error) => {
      toast.error('Lỗi tạo tài khoản: ' + error.message);
    },
  });
}

export function useUpdateGLAccount() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ id, ...input }: GLAccountInput & { id: string }) => {
      const { data, error } = await buildUpdateQuery('gl_accounts', input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl-accounts'] });
      toast.success('Cập nhật tài khoản thành công');
    },
    onError: (error) => {
      toast.error('Lỗi cập nhật: ' + error.message);
    },
  });
}

export function useDeleteGLAccount() {
  const queryClient = useQueryClient();
  const { buildDeleteQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await buildDeleteQuery('gl_accounts')
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl-accounts'] });
      toast.success('Xóa tài khoản thành công');
    },
    onError: (error) => {
      toast.error('Lỗi xóa: ' + error.message);
    },
  });
}

export function useTrialBalance() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['trial-balance', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await buildSelectQuery(
        'gl_accounts',
        'id, account_code, account_name, account_type, is_active'
      ).eq('is_active', true);
      
      if (error) throw error;
      return ((data as unknown as any[]) || []).map(acc => ({
        account_id: acc.id,
        account_code: acc.account_code,
        account_name: acc.account_name,
        account_type: acc.account_type,
        debit: 0,
        credit: 0,
      }));
    },
    enabled: !!tenantId && isReady,
  });
}
