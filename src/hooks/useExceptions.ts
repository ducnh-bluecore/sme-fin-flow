import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';

// Types
export interface Exception {
  id: string;
  tenant_id: string;
  exception_type: 'ORPHAN_BANK_TXN' | 'AR_OVERDUE' | 'PARTIAL_MATCH_STUCK';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ref_type: 'bank_transaction' | 'invoice' | 'reconciliation_link';
  ref_id: string;
  currency: string;
  impact_amount: number;
  status: 'open' | 'triaged' | 'snoozed' | 'resolved';
  detected_at: string;
  last_seen_at: string;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  payload: Record<string, unknown>;
  assigned_to: string | null;
  triage_notes: string | null;
  snoozed_until: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface ExceptionStats {
  total: number;
  open: number;
  triaged: number;
  snoozed: number;
  resolved: number;
  by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  by_type: {
    ORPHAN_BANK_TXN: number;
    AR_OVERDUE: number;
    PARTIAL_MATCH_STUCK: number;
  };
  total_impact: number;
}

export interface ExceptionExplanation {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  impact: {
    amount: number;
    currency: string;
  };
  aging_days: number;
  detected_at: string;
  last_seen_at: string;
  evidence: Record<string, unknown>;
  payload: Record<string, unknown>;
  ref_data: unknown;
  suggested_actions: string[];
  assigned_to: string | null;
  triage_notes: string | null;
  snoozed_until: string | null;
}

export interface ExceptionFilters {
  status?: 'open' | 'triaged' | 'snoozed' | 'resolved' | 'all';
  type?: 'ORPHAN_BANK_TXN' | 'AR_OVERDUE' | 'PARTIAL_MATCH_STUCK';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  sort?: 'impact' | 'aging' | 'detected';
  limit?: number;
}

// Hook: Fetch exceptions list
export function useExceptions(filters: ExceptionFilters = {}) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['exceptions', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('exceptions_queue')
        .select('*');
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      } else if (!filters.status) {
        query = query.eq('status', 'open');
      }

      if (filters.type) {
        query = query.eq('exception_type', filters.type);
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      // Sorting
      if (filters.sort === 'impact') {
        query = query.order('impact_amount', { ascending: false });
      } else if (filters.sort === 'aging') {
        query = query.order('detected_at', { ascending: true });
      } else {
        query = query.order('detected_at', { ascending: false });
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Exception[];
    },
    staleTime: 30000,
    enabled: !!tenantId && isReady,
  });
}

// Hook: Fetch exception stats
export function useExceptionStats() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['exception-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      let query = client
        .from('exceptions_queue')
        .select('status, severity, exception_type, impact_amount');
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats: ExceptionStats = {
        total: data?.length || 0,
        open: data?.filter(e => e.status === 'open').length || 0,
        triaged: data?.filter(e => e.status === 'triaged').length || 0,
        snoozed: data?.filter(e => e.status === 'snoozed').length || 0,
        resolved: data?.filter(e => e.status === 'resolved').length || 0,
        by_severity: {
          critical: data?.filter(e => e.status === 'open' && e.severity === 'critical').length || 0,
          high: data?.filter(e => e.status === 'open' && e.severity === 'high').length || 0,
          medium: data?.filter(e => e.status === 'open' && e.severity === 'medium').length || 0,
          low: data?.filter(e => e.status === 'open' && e.severity === 'low').length || 0,
        },
        by_type: {
          ORPHAN_BANK_TXN: data?.filter(e => e.status === 'open' && e.exception_type === 'ORPHAN_BANK_TXN').length || 0,
          AR_OVERDUE: data?.filter(e => e.status === 'open' && e.exception_type === 'AR_OVERDUE').length || 0,
          PARTIAL_MATCH_STUCK: data?.filter(e => e.status === 'open' && e.exception_type === 'PARTIAL_MATCH_STUCK').length || 0,
        },
        total_impact: data?.filter(e => e.status === 'open').reduce((sum, e) => sum + (Number(e.impact_amount) || 0), 0) || 0,
      };

      return stats;
    },
    staleTime: 30000,
    enabled: !!tenantId && isReady,
  });
}

// Hook: Fetch single exception detail
export function useExceptionDetail(exceptionId: string | null) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['exception-detail', tenantId, exceptionId],
    queryFn: async () => {
      if (!exceptionId || !tenantId) return null;

      let query = client
        .from('exceptions_queue')
        .select('*')
        .eq('id', exceptionId);
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data: exception, error } = await query.single();

      if (error) throw error;
      if (!exception) return null;

      // Get additional context based on ref_type
      let refData = null;
      if (exception.ref_type === 'invoice') {
        let invoiceQuery = client
          .from('invoices')
          .select(`
            *,
            customers (name, email, phone)
          `)
          .eq('id', exception.ref_id);
        const { data: invoice } = await invoiceQuery.single();
        refData = invoice;
      } else if (exception.ref_type === 'bank_transaction') {
        let txnQuery = client
          .from('bank_transactions')
          .select('*')
          .eq('id', exception.ref_id);
        const { data: txn } = await txnQuery.single();
        refData = txn;
      }

      const aging = Math.floor((Date.now() - new Date(exception.detected_at).getTime()) / (1000 * 60 * 60 * 24));

      const explanation: ExceptionExplanation = {
        id: exception.id,
        type: exception.exception_type,
        severity: exception.severity,
        status: exception.status,
        title: exception.title,
        description: exception.description,
        impact: {
          amount: Number(exception.impact_amount),
          currency: exception.currency,
        },
        aging_days: aging,
        detected_at: exception.detected_at,
        last_seen_at: exception.last_seen_at,
        evidence: exception.evidence as Record<string, unknown>,
        payload: exception.payload as Record<string, unknown>,
        ref_data: refData,
        suggested_actions: getSuggestedActions(exception.exception_type),
        assigned_to: exception.assigned_to,
        triage_notes: exception.triage_notes,
        snoozed_until: exception.snoozed_until,
      };

      return explanation;
    },
    staleTime: 30000,
    enabled: !!exceptionId && !!tenantId && isReady,
  });
}

// Hook: Triage exception
export function useTriageException() {
  const queryClient = useQueryClient();
  const { client, tenantId, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ 
      exceptionId, 
      assignedTo, 
      triageNotes 
    }: { 
      exceptionId: string; 
      assignedTo?: string; 
      triageNotes?: string;
    }) => {
      let query = client
        .from('exceptions_queue')
        .update({
          status: 'triaged',
          assigned_to: assignedTo || null,
          triage_notes: triageNotes || null,
        })
        .eq('id', exceptionId);
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['exception-stats'] });
      queryClient.invalidateQueries({ queryKey: ['exception-detail'] });
    },
  });
}

// Hook: Snooze exception
export function useSnoozeException() {
  const queryClient = useQueryClient();
  const { client, tenantId, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ 
      exceptionId, 
      snoozedUntil 
    }: { 
      exceptionId: string; 
      snoozedUntil: string;
    }) => {
      let query = client
        .from('exceptions_queue')
        .update({
          status: 'snoozed',
          snoozed_until: snoozedUntil,
        })
        .eq('id', exceptionId);
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['exception-stats'] });
      queryClient.invalidateQueries({ queryKey: ['exception-detail'] });
    },
  });
}

// Hook: Resolve exception
export function useResolveException() {
  const queryClient = useQueryClient();
  const { client, tenantId, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ 
      exceptionId, 
      resolvedReason 
    }: { 
      exceptionId: string; 
      resolvedReason?: string;
    }) => {
      const { data: { user } } = await client.auth.getUser();

      let query = client
        .from('exceptions_queue')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id || null,
          triage_notes: resolvedReason ? `Resolved: ${resolvedReason}` : 'Manually resolved',
        })
        .eq('id', exceptionId);
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['exception-stats'] });
      queryClient.invalidateQueries({ queryKey: ['exception-detail'] });
    },
  });
}

// Helper function
function getSuggestedActions(type: string): string[] {
  switch (type) {
    case 'ORPHAN_BANK_TXN':
      return [
        'Go to Reconciliation Board to match this transaction',
        'Check if this is a duplicate or erroneous entry',
        'Contact bank for clarification if reference is unclear',
      ];
    case 'AR_OVERDUE':
      return [
        'Send payment reminder to customer',
        'Review customer payment history',
        'Consider escalation to collections',
        'Check if partial payment was received',
      ];
    case 'PARTIAL_MATCH_STUCK':
      return [
        'Complete the reconciliation in Reconciliation Board',
        'Check for additional invoices to match',
        'Review if remaining amount is a bank fee or adjustment',
      ];
    default:
      return ['Review and take appropriate action'];
  }
}
