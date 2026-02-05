import { requireAuth, isErrorResponse, corsHeaders, jsonResponse, errorResponse } from '../_shared/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

interface SnapshotRequest {
  tenantId: string;
  metricCode: string;
  metricVersion?: number;
  entityType?: string;
  entityId?: string | null;
  dimensions?: Record<string, unknown>;
  value: number;
  currency?: string;
  truthLevel: 'settled' | 'provisional';
  authority: 'BANK' | 'MANUAL' | 'RULE' | 'ACCOUNTING' | 'GATEWAY' | 'CARRIER';
  confidence?: number;
  asOf?: string;
  derivedFrom?: Record<string, unknown>;
  supersedesId?: string | null;
}

interface DecisionSnapshot {
  id: string;
  tenant_id: string;
  metric_code: string;
  metric_version: number;
  entity_type: string;
  entity_id: string | null;
  dimensions: Record<string, unknown>;
  value: number;
  currency: string;
  truth_level: string;
  authority: string;
  confidence: number;
  as_of: string;
  derived_from: Record<string, unknown>;
  calculation_hash: string | null;
  created_by: string | null;
  created_at: string;
  supersedes_id: string | null;
}

// Cache staleness threshold (15 minutes)
const STALE_THRESHOLD_MS = 15 * 60 * 1000;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get auth user if available
  const authHeader = req.headers.get('Authorization');
  let userId: string | null = null;
  let userTenantId: string | null = null;
  
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData } = await supabase.auth.getClaims(token);
    if (claimsData?.claims) {
      userId = claimsData.claims.sub as string;
      
      // Get tenant from tenant_users
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', userId)
        .maybeSingle();
      userTenantId = tenantUser?.tenant_id || null;
    }
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/decision-snapshots', '');

  try {
    // POST /snapshots - Create new snapshot
    if (req.method === 'POST' && (path === '/snapshots' || path === '')) {
      const body: SnapshotRequest = await req.json();
      
      // Validate tenant access
      if (userTenantId && body.tenantId !== userTenantId) {
        return errorResponse('Cross-tenant access denied', 403);
      }
      
      // Validate truth_level/authority constraints
      if (body.truthLevel === 'provisional' && body.authority !== 'RULE') {
        return errorResponse('Provisional snapshots must have authority=RULE', 400);
      }
      
      if (body.truthLevel === 'settled' && !['BANK', 'MANUAL', 'ACCOUNTING', 'GATEWAY', 'CARRIER'].includes(body.authority)) {
        return errorResponse('Settled snapshots must have authority in [BANK, MANUAL, ACCOUNTING, GATEWAY, CARRIER]', 400);
      }

      const { data, error } = await supabase
        .from('decision_snapshots')
        .insert({
          tenant_id: body.tenantId,
          metric_code: body.metricCode,
          metric_version: body.metricVersion || 1,
          entity_type: body.entityType || 'tenant',
          entity_id: body.entityId || null,
          dimensions: body.dimensions || { currency: 'VND' },
          value: body.value,
          currency: body.currency || 'VND',
          truth_level: body.truthLevel,
          authority: body.authority,
          confidence: body.confidence ?? 100,
          as_of: body.asOf || new Date().toISOString(),
          derived_from: body.derivedFrom || {},
          created_by: userId,
          supersedes_id: body.supersedesId || null,
        })
        .select('id, created_at')
        .single();

      if (error) throw error;

      return jsonResponse({ id: data.id, createdAt: data.created_at });
    }

    // GET /latest - Get latest snapshot
    if (req.method === 'GET' && path === '/latest') {
      const tenantId = url.searchParams.get('tenantId');
      const metricCode = url.searchParams.get('metricCode');

      if (!tenantId || !metricCode) {
        return errorResponse('tenantId and metricCode are required', 400);
      }

      // Validate tenant access
      if (userTenantId && tenantId !== userTenantId) {
        return errorResponse('Cross-tenant access denied', 403);
      }

      const { data, error } = await supabase
        .from('v_decision_latest')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('metric_code', metricCode)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return jsonResponse(data || null);
    }

    // GET /explain/:id - Explain snapshot
    if (req.method === 'GET' && path.startsWith('/explain/')) {
      const snapshotId = path.replace('/explain/', '');

      const { data, error } = await supabase
        .from('decision_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .single();

      if (error) throw error;

      // Validate tenant access
      if (userTenantId && data.tenant_id !== userTenantId) {
        return errorResponse('Cross-tenant access denied', 403);
      }

      const snapshot = data as DecisionSnapshot;
      const derivedFrom = snapshot.derived_from as Record<string, unknown>;

      // Format explanation
      const explanation = {
        snapshot,
        formatted: {
          metricCode: snapshot.metric_code,
          value: snapshot.value,
          currency: snapshot.currency,
          truthLevel: snapshot.truth_level,
          authority: snapshot.authority,
          confidence: snapshot.confidence,
          asOf: snapshot.as_of,
          evidence: derivedFrom.evidence || [],
          assumptions: derivedFrom.assumptions || [],
          sources: derivedFrom.sources || [],
          formula: derivedFrom.formula || null,
          notes: derivedFrom.notes || null,
        }
      };

      return jsonResponse(explanation);
    }

    // POST /compute/cash - Compute and write cash snapshots
    if (req.method === 'POST' && path === '/compute/cash') {
      const body = await req.json();
      const tenantId = body.tenantId;

      if (!tenantId) {
        return errorResponse('tenantId is required', 400);
      }

      // Validate tenant access
      if (userTenantId && tenantId !== userTenantId) {
        return errorResponse('Cross-tenant access denied', 403);
      }

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // 1. Get bank accounts for cash_today
      const { data: bankAccounts, error: bankError } = await supabase
        .from('bank_accounts')
        .select('id, bank_name, current_balance, currency')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      if (bankError) throw bankError;

      const cashToday = (bankAccounts || []).reduce(
        (sum: number, acc: any) => sum + (acc.current_balance || 0), 0
      );

      // 2. Get bank transactions for cash_flow_today
      const { data: transactions, error: txnError } = await supabase
        .from('bank_transactions')
        .select('id, amount, transaction_type, transaction_date')
        .eq('tenant_id', tenantId)
        .gte('transaction_date', todayStr)
        .lte('transaction_date', todayStr);

      if (txnError) throw txnError;

      const credits = (transactions || [])
        .filter((t: any) => t.transaction_type === 'credit')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      const debits = (transactions || [])
        .filter((t: any) => t.transaction_type === 'debit')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      const cashFlowToday = credits - debits;

      // 3. Get AR, AP, weekly sales for cash_next_7d (provisional)
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('id, total_amount, paid_amount, status')
        .eq('tenant_id', tenantId)
        .not('status', 'in', '("paid","cancelled")');

      if (invError) throw invError;

      const totalAR = (invoices || []).reduce(
        (sum: number, inv: any) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0
      );

      const { data: bills, error: billError } = await supabase
        .from('bills')
        .select('id, total_amount, paid_amount, status')
        .eq('tenant_id', tenantId)
        .not('status', 'in', '("paid","cancelled")');

      if (billError) throw billError;

      const totalAP = (bills || []).reduce(
        (sum: number, bill: any) => sum + ((bill.total_amount || 0) - (bill.paid_amount || 0)), 0
      );

      // Estimate weekly sales from recent orders
      // Use init_tenant_session for schema-per-tenant isolation
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Initialize tenant session for proper schema routing
      await supabase.rpc('init_tenant_session', { p_tenant_id: tenantId });
      
      // Query master_orders (resolves via search_path to tenant schema)
      const { data: recentOrders, error: orderError } = await supabase
        .from('master_orders')
        .select('gross_revenue, order_at')
        .gte('order_at', sevenDaysAgo);

      if (orderError) throw orderError;

      const weeklySales = (recentOrders || []).reduce(
        (sum: number, o: any) => sum + (o.gross_revenue || 0), 0
      );

      // Cash Next 7 Days = cash_today + (15% AR) + (80% weekly sales) - (20% AP)
      const arCollection = totalAR * 0.15;
      const salesInflow = weeklySales * 0.80;
      const apPayment = totalAP * 0.20;
      const cashNext7d = cashToday + arCollection + salesInflow - apPayment;

      const asOf = now.toISOString();
      const snapshotIds: string[] = [];

      // Insert cash_today (settled/BANK)
      const { data: cashTodaySnap, error: e1 } = await supabase
        .from('decision_snapshots')
        .insert({
          tenant_id: tenantId,
          metric_code: 'cash_today',
          metric_version: 1,
          entity_type: 'tenant',
          dimensions: { currency: 'VND' },
          value: cashToday,
          currency: 'VND',
          truth_level: 'settled',
          authority: 'BANK',
          confidence: 100,
          as_of: asOf,
          derived_from: {
            evidence: (bankAccounts || []).map((acc: any) => ({
              type: 'bank_account',
              id: acc.id,
              name: acc.bank_name,
              balance: acc.current_balance
            })),
            formula: 'SUM(bank_accounts.current_balance)',
            sources: ['bank_accounts'],
          },
          created_by: userId,
        })
        .select('id')
        .single();

      if (e1) throw e1;
      snapshotIds.push(cashTodaySnap.id);

      // Insert cash_flow_today (settled/BANK)
      const { data: flowSnap, error: e2 } = await supabase
        .from('decision_snapshots')
        .insert({
          tenant_id: tenantId,
          metric_code: 'cash_flow_today',
          metric_version: 1,
          entity_type: 'tenant',
          dimensions: { currency: 'VND', date: todayStr },
          value: cashFlowToday,
          currency: 'VND',
          truth_level: 'settled',
          authority: 'BANK',
          confidence: 100,
          as_of: asOf,
          derived_from: {
            evidence: {
              credits,
              debits,
              transactionCount: (transactions || []).length,
            },
            formula: 'SUM(credits) - SUM(debits)',
            sources: ['bank_transactions'],
            window: todayStr,
          },
          created_by: userId,
        })
        .select('id')
        .single();

      if (e2) throw e2;
      snapshotIds.push(flowSnap.id);

      // Insert cash_next_7d (provisional/RULE)
      const { data: forecastSnap, error: e3 } = await supabase
        .from('decision_snapshots')
        .insert({
          tenant_id: tenantId,
          metric_code: 'cash_next_7d',
          metric_version: 1,
          entity_type: 'tenant',
          dimensions: { currency: 'VND' },
          value: cashNext7d,
          currency: 'VND',
          truth_level: 'provisional',
          authority: 'RULE',
          confidence: 75, // Lower confidence for forecasts
          as_of: asOf,
          derived_from: {
            assumptions: [
              { factor: 'ar_collection_rate', value: 0.15, description: '15% of AR collected in 7 days' },
              { factor: 'sales_collection_rate', value: 0.80, description: '80% of weekly sales collected' },
              { factor: 'ap_payment_rate', value: 0.20, description: '20% of AP paid in 7 days' },
            ],
            inputs: {
              cash_today: cashToday,
              total_ar: totalAR,
              weekly_sales: weeklySales,
              total_ap: totalAP,
            },
            calculation: {
              ar_collection: arCollection,
              sales_inflow: salesInflow,
              ap_payment: apPayment,
            },
            formula: 'cash_today + (AR * 0.15) + (weekly_sales * 0.80) - (AP * 0.20)',
            sources: ['bank_accounts', 'invoices', 'external_orders', 'bills'],
            window_days: 7,
          },
          created_by: userId,
        })
        .select('id')
        .single();

      if (e3) throw e3;
      snapshotIds.push(forecastSnap.id);

      return jsonResponse({
        success: true,
        snapshotIds,
        metrics: {
          cash_today: { value: cashToday, truthLevel: 'settled', authority: 'BANK' },
          cash_flow_today: { value: cashFlowToday, truthLevel: 'settled', authority: 'BANK' },
          cash_next_7d: { value: cashNext7d, truthLevel: 'provisional', authority: 'RULE', confidence: 75 },
        }
      });
    }

    // GET /check-stale - Check if snapshots are stale
    if (req.method === 'GET' && path === '/check-stale') {
      const tenantId = url.searchParams.get('tenantId');
      const metricCode = url.searchParams.get('metricCode');

      if (!tenantId) {
        return errorResponse('tenantId is required', 400);
      }

      // Validate tenant access
      if (userTenantId && tenantId !== userTenantId) {
        return errorResponse('Cross-tenant access denied', 403);
      }

      let query = supabase
        .from('v_decision_latest')
        .select('metric_code, as_of, created_at')
        .eq('tenant_id', tenantId);

      if (metricCode) {
        query = query.eq('metric_code', metricCode);
      } else {
        query = query.in('metric_code', ['cash_today', 'cash_flow_today', 'cash_next_7d']);
      }

      const { data, error } = await query;
      if (error) throw error;

      const now = Date.now();
      const staleMetrics: string[] = [];

      for (const snapshot of data || []) {
        const snapshotTime = new Date(snapshot.as_of).getTime();
        if (now - snapshotTime > STALE_THRESHOLD_MS) {
          staleMetrics.push(snapshot.metric_code);
        }
      }

      // Check for missing metrics
      const existingMetrics = (data || []).map((d: any) => d.metric_code);
      const requiredMetrics = ['cash_today', 'cash_flow_today', 'cash_next_7d'];
      const missingMetrics = requiredMetrics.filter(m => !existingMetrics.includes(m));

      return jsonResponse({
        isStale: staleMetrics.length > 0 || missingMetrics.length > 0,
        staleMetrics,
        missingMetrics,
        thresholdMs: STALE_THRESHOLD_MS,
      });
    }

    return errorResponse('Not found', 404);

  } catch (error) {
    console.error('Decision snapshots error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(message, 500);
  }
});
