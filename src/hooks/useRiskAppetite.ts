/**
 * useRiskAppetite - Risk Appetite Management
 * 
 * Refactored to Schema-per-Tenant architecture.
 * Uses useTenantSupabaseCompat for tenant-aware queries.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { toast } from 'sonner';

// Types
export interface RiskAppetite {
  id: string;
  tenant_id: string;
  version: number;
  status: 'draft' | 'active' | 'retired';
  name: string;
  description: string | null;
  effective_from: string;
  effective_to: string | null;
  defined_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  rule_count?: number;
  active_breaches?: number;
}

export interface RiskAppetiteRule {
  id: string;
  tenant_id: string;
  risk_appetite_id: string;
  risk_domain: 'CASH' | 'AR' | 'AP' | 'RECONCILIATION' | 'AUTOMATION' | 'ML' | 'GOVERNANCE';
  metric_code: string;
  metric_label: string;
  operator: '<' | '<=' | '>' | '>=' | '=';
  threshold: number;
  unit: string;
  action_on_breach: 'ALERT' | 'REQUIRE_APPROVAL' | 'BLOCK_AUTOMATION' | 'DISABLE_ML' | 'ESCALATE_TO_BOARD';
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_enabled: boolean;
  created_at: string;
}

export interface RiskBreachEvent {
  id: string;
  tenant_id: string;
  risk_appetite_id: string;
  rule_id: string;
  metric_code: string;
  metric_value: number;
  threshold: number;
  breached_at: string;
  action_taken: string;
  action_result: Record<string, unknown> | null;
  severity: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  risk_appetite_rules?: {
    metric_label: string;
    risk_domain: string;
  };
}

export interface RuleEvaluation {
  ruleId: string;
  domain: string;
  metricCode: string;
  metricLabel: string;
  currentValue: number;
  threshold: number;
  operator: string;
  unit: string;
  isBreached: boolean;
  severity: string;
  actionOnBreach: string;
  source: string;
}

export interface EvaluationResult {
  hasActiveAppetite: boolean;
  appetiteId?: string;
  version?: number;
  name?: string;
  evaluations: RuleEvaluation[];
  breachCount: number;
  evaluatedAt: string;
}

// Fetch active risk appetite
export function useActiveRiskAppetite() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['risk-appetite-active', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      let query = client
        .from('v_active_risk_appetite')
        .select('*');

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data as RiskAppetite | null;
    },
    enabled: !!tenantId && isReady,
  });
}

// Fetch all risk appetites
export function useRiskAppetites() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['risk-appetites', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('risk_appetites')
        .select('*');

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.order('version', { ascending: false });

      if (error) throw error;
      return data as RiskAppetite[];
    },
    enabled: !!tenantId && isReady,
  });
}

// Fetch rules for a risk appetite
export function useRiskAppetiteRules(appetiteId: string | null) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['risk-appetite-rules', tenantId, appetiteId],
    queryFn: async () => {
      if (!tenantId || !appetiteId) return [];

      let query = client
        .from('risk_appetite_rules')
        .select('*')
        .eq('risk_appetite_id', appetiteId);

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.order('risk_domain', { ascending: true });

      if (error) throw error;
      return data as RiskAppetiteRule[];
    },
    enabled: !!tenantId && !!appetiteId && isReady,
  });
}

// Evaluate rules against current metrics
export function useEvaluateRiskAppetite() {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['risk-appetite-evaluation', tenantId],
    queryFn: async (): Promise<EvaluationResult | null> => {
      if (!tenantId) return null;

      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) return null;

      const response = await client.functions.invoke('risk-appetite/evaluate', {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    enabled: !!tenantId && isReady,
    refetchInterval: 5 * 60 * 1000, // Every 5 minutes
  });
}

// Fetch breach events
export function useRiskBreaches(unresolved = false) {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['risk-breaches', tenantId, unresolved],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) return [];

      const params = new URLSearchParams();
      if (unresolved) params.set('unresolved', 'true');

      const response = await client.functions.invoke(`risk-appetite/breaches?${params}`, {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);
      return (response.data?.breaches || []) as RiskBreachEvent[];
    },
    enabled: !!tenantId && isReady,
  });
}

// Create risk appetite
export function useCreateRiskAppetite() {
  const queryClient = useQueryClient();
  const { client, tenantId, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      effective_from: string;
      status?: 'draft' | 'active';
    }) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      // Get latest version
      let versionQuery = client
        .from('risk_appetites')
        .select('version')
        .order('version', { ascending: false })
        .limit(1);

      if (shouldAddTenantFilter) {
        versionQuery = versionQuery.eq('tenant_id', tenantId);
      }

      const { data: latest } = await versionQuery.maybeSingle();

      const newVersion = (latest?.version || 0) + 1;

      // If activating, retire existing active appetite
      if (data.status === 'active') {
        let updateQuery = client
          .from('risk_appetites')
          .update({ status: 'retired', effective_to: new Date().toISOString().split('T')[0] })
          .eq('status', 'active');

        if (shouldAddTenantFilter) {
          updateQuery = updateQuery.eq('tenant_id', tenantId);
        }

        await updateQuery;
      }

      const { data: appetite, error } = await client
        .from('risk_appetites')
        .insert({
          tenant_id: tenantId,
          version: newVersion,
          name: data.name,
          description: data.description,
          effective_from: data.effective_from,
          status: data.status || 'draft',
          defined_by: sessionData.session.user.id,
          approved_by: data.status === 'active' ? sessionData.session.user.id : null,
          approved_at: data.status === 'active' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return appetite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetites'] });
      queryClient.invalidateQueries({ queryKey: ['risk-appetite-active'] });
      toast.success('Risk appetite created');
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });
}

// Update risk appetite status (activate/retire)
export function useUpdateRiskAppetiteStatus() {
  const queryClient = useQueryClient();
  const { client, tenantId, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ appetiteId, status }: { appetiteId: string; status: 'active' | 'retired' }) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      if (status === 'active') {
        // Retire current active
        let retireQuery = client
          .from('risk_appetites')
          .update({ status: 'retired', effective_to: new Date().toISOString().split('T')[0] })
          .eq('status', 'active');

        if (shouldAddTenantFilter) {
          retireQuery = retireQuery.eq('tenant_id', tenantId);
        }

        await retireQuery;
      }

      let updateQuery = client
        .from('risk_appetites')
        .update({
          status,
          approved_by: status === 'active' ? sessionData.session.user.id : null,
          approved_at: status === 'active' ? new Date().toISOString() : null,
          effective_to: status === 'retired' ? new Date().toISOString().split('T')[0] : null,
        })
        .eq('id', appetiteId);

      if (shouldAddTenantFilter) {
        updateQuery = updateQuery.eq('tenant_id', tenantId);
      }

      const { error } = await updateQuery;

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetites'] });
      queryClient.invalidateQueries({ queryKey: ['risk-appetite-active'] });
      queryClient.invalidateQueries({ queryKey: ['risk-appetite-evaluation'] });
      toast.success(status === 'active' ? 'Risk appetite activated' : 'Risk appetite retired');
    },
  });
}

// Add rule to appetite
export function useAddRiskRule() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (rule: Omit<RiskAppetiteRule, 'id' | 'tenant_id' | 'created_at'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await client
        .from('risk_appetite_rules')
        .insert({ ...rule, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetite-rules'] });
      queryClient.invalidateQueries({ queryKey: ['risk-appetite-evaluation'] });
      toast.success('Rule added');
    },
  });
}

// Update rule
export function useUpdateRiskRule() {
  const queryClient = useQueryClient();
  const { client, tenantId, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ ruleId, updates }: { ruleId: string; updates: Partial<RiskAppetiteRule> }) => {
      let query = client
        .from('risk_appetite_rules')
        .update(updates)
        .eq('id', ruleId);

      if (shouldAddTenantFilter && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetite-rules'] });
      queryClient.invalidateQueries({ queryKey: ['risk-appetite-evaluation'] });
      toast.success('Rule updated');
    },
  });
}

// Delete rule
export function useDeleteRiskRule() {
  const queryClient = useQueryClient();
  const { client, tenantId, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      let query = client
        .from('risk_appetite_rules')
        .delete()
        .eq('id', ruleId);

      if (shouldAddTenantFilter && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-appetite-rules'] });
      toast.success('Rule deleted');
    },
  });
}

// Run breach detection
export function useDetectBreaches() {
  const queryClient = useQueryClient();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const response = await client.functions.invoke('risk-appetite/detect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['risk-breaches'] });
      queryClient.invalidateQueries({ queryKey: ['risk-appetite-evaluation'] });
      
      if (data.newBreaches?.length > 0) {
        toast.warning(`${data.newBreaches.length} new risk breach(es) detected`);
      } else {
        toast.success('No new breaches detected');
      }
    },
  });
}

// Resolve breach
export function useResolveBreach() {
  const queryClient = useQueryClient();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ breachId, notes }: { breachId: string; notes?: string }) => {
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const response = await client.functions.invoke('risk-appetite/resolve', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        body: { breachId, notes },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-breaches'] });
      queryClient.invalidateQueries({ queryKey: ['risk-appetite-active'] });
      toast.success('Breach resolved');
    },
  });
}

// Helper functions
export function getDomainLabel(domain: string): string {
  const labels: Record<string, string> = {
    CASH: 'Cash & Liquidity',
    AR: 'Accounts Receivable',
    AP: 'Accounts Payable',
    RECONCILIATION: 'Reconciliation',
    AUTOMATION: 'Automation',
    ML: 'Machine Learning',
    GOVERNANCE: 'Governance',
  };
  return labels[domain] || domain;
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    ALERT: 'Create Alert',
    REQUIRE_APPROVAL: 'Require Approval',
    BLOCK_AUTOMATION: 'Block Automation',
    DISABLE_ML: 'Disable ML',
    ESCALATE_TO_BOARD: 'Escalate to Board',
  };
  return labels[action] || action;
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    critical: 'bg-red-500/10 text-red-500 border-red-500/30',
  };
  return colors[severity] || 'bg-muted text-muted-foreground';
}

export function formatMetricValue(value: number, unit: string): string {
  if (unit === '%') return `${value.toFixed(2)}%`;
  if (unit === 'days') return `${Math.round(value)} days`;
  if (unit === 'ratio') return value.toFixed(4);
  if (unit === 'amount') return new Intl.NumberFormat('vi-VN').format(value);
  return String(value);
}

// Available metrics for rule creation
export const AVAILABLE_METRICS = [
  { code: 'ar_overdue_ratio', label: 'AR Overdue Ratio', domain: 'AR', unit: '%' },
  { code: 'ar_overdue_amount', label: 'AR Overdue Amount', domain: 'AR', unit: 'amount' },
  { code: 'cash_runway_days', label: 'Cash Runway', domain: 'CASH', unit: 'days' },
  { code: 'cash_position', label: 'Cash Position', domain: 'CASH', unit: 'amount' },
  { code: 'false_auto_rate', label: 'False Auto Rate', domain: 'AUTOMATION', unit: '%' },
  { code: 'auto_reconciliation_rate', label: 'Auto Reconciliation Rate', domain: 'AUTOMATION', unit: '%' },
  { code: 'guardrail_block_rate', label: 'Guardrail Block Rate', domain: 'AUTOMATION', unit: '%' },
  { code: 'ml_accuracy', label: 'ML Accuracy', domain: 'ML', unit: '%' },
  { code: 'calibration_error', label: 'Calibration Error', domain: 'ML', unit: 'ratio' },
  { code: 'drift_signal_count', label: 'Active Drift Signals', domain: 'ML', unit: 'count' },
  { code: 'pending_approvals', label: 'Pending Approvals', domain: 'GOVERNANCE', unit: 'count' },
  { code: 'open_exceptions', label: 'Open Exceptions', domain: 'GOVERNANCE', unit: 'count' },
];
