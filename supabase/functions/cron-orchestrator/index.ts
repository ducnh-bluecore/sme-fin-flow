/**
 * cron-orchestrator
 * 
 * Central orchestrator called by pg_cron. Discovers all active tenants
 * and triggers the appropriate pipeline functions for each.
 * 
 * Actions:
 *   - daily_kpi:       compute-kpi-pipeline for each tenant
 *   - daily_inventory:  inventory-kpi-engine for each tenant
 *   - daily_lifecycle:  sync-lifecycle-batches for each tenant (with BQ)
 *   - daily_snapshots:  build-knowledge-snapshots (already multi-tenant)
 *   - daily_cdp:        cdp full pipeline for each tenant
 *   - daily_product_dates: sync-product-created-date for each tenant
 *   - daily_color_sync: sync-color-from-bigquery for each tenant
 *   - refresh_views:    refresh materialized views for each tenant
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'daily_kpi';
    const today = new Date().toISOString().split('T')[0];

    console.log(`[cron-orchestrator] action=${action}`);

    // Discover all active tenants
    const { data: tenants, error: tenantErr } = await supabase
      .from('tenants')
      .select('id, name')
      .limit(100);

    if (tenantErr) throw new Error(`Failed to fetch tenants: ${tenantErr.message}`);
    if (!tenants?.length) {
      return jsonResponse({ success: true, message: 'No tenants found', action });
    }

    console.log(`[cron-orchestrator] Found ${tenants.length} tenants`);

    const results: Record<string, { status: string; error?: string; data?: any }> = {};

    for (const tenant of tenants) {
      try {
        console.log(`[cron-orchestrator] ${action} for tenant ${tenant.id} (${tenant.name})`);

        // Init tenant session for schema routing
        await supabase.rpc('init_tenant_session', { p_tenant_id: tenant.id }).catch(() => {});

        switch (action) {
          case 'daily_kpi': {
            const res = await callFunction(supabaseUrl, serviceKey, 'compute-kpi-pipeline', {
              tenant_id: tenant.id,
              start_date: addDays(today, -7),
              end_date: today,
            });
            results[tenant.id] = { status: 'ok', data: res };
            break;
          }

          case 'daily_inventory': {
            const res = await callFunction(supabaseUrl, serviceKey, 'inventory-kpi-engine', {
              tenant_id: tenant.id,
              as_of_date: today,
            });
            results[tenant.id] = { status: 'ok', data: res };
            break;
          }

          case 'daily_lifecycle': {
            const res = await callFunction(supabaseUrl, serviceKey, 'sync-lifecycle-batches', {
              tenant_id: tenant.id,
            });
            results[tenant.id] = { status: 'ok', data: res };
            break;
          }

          case 'daily_snapshots': {
            // build-knowledge-snapshots already handles all tenants if no tenant_id
            // But we call per tenant for consistency and error isolation
            const res = await callFunction(supabaseUrl, serviceKey, 'build-knowledge-snapshots', {
              tenantId: tenant.id,
            });
            results[tenant.id] = { status: 'ok', data: res };
            break;
          }

          case 'daily_cdp': {
            const { data, error } = await supabase.rpc('cdp_run_full_daily_pipeline', {
              p_tenant_id: tenant.id,
              p_as_of_date: today,
            });
            results[tenant.id] = error
              ? { status: 'error', error: error.message }
              : { status: 'ok', data };
            break;
          }

          case 'daily_product_dates': {
            const res = await callFunction(supabaseUrl, serviceKey, 'sync-product-created-date', {
              tenant_id: tenant.id,
            });
            results[tenant.id] = { status: 'ok', data: res };
            break;
          }

          case 'daily_color_sync': {
            const res = await callFunction(supabaseUrl, serviceKey, 'sync-color-from-bigquery', {
              tenant_id: tenant.id,
            });
            results[tenant.id] = { status: 'ok', data: res };
            break;
          }

          case 'refresh_views': {
            const rpcs = [
              'refresh_finance_snapshot',
              'refresh_working_capital_snapshot',
              'refresh_finance_expenses_snapshot',
            ];
            const rpcResults: Record<string, any> = {};
            for (const rpc of rpcs) {
              const { data, error } = await supabase.rpc(rpc, { p_tenant_id: tenant.id });
              rpcResults[rpc] = error ? { error: error.message } : data;
            }
            results[tenant.id] = { status: 'ok', data: rpcResults };
            break;
          }

          case 'detect_alerts': {
            const { data, error } = await supabase.rpc('detect_threshold_breaches', {
              p_tenant_id: tenant.id,
              p_date: today,
            });
            results[tenant.id] = error
              ? { status: 'error', error: error.message }
              : { status: 'ok', data };
            break;
          }

          case 'daily_ads_sync': {
            const res = await callFunction(supabaseUrl, serviceKey, 'ads-sync-campaigns', {
              tenant_id: tenant.id,
            });
            results[tenant.id] = { status: 'ok', data: res };
            break;
          }

          case 'daily_bigquery_sync': {
            const res = await callFunction(supabaseUrl, serviceKey, 'daily-bigquery-sync', {
              tenant_id: tenant.id,
              triggered_by: 'cron-orchestrator',
            });
            results[tenant.id] = { status: 'ok', data: res };
            break;
          }

          case 'refresh_concentration_risk': {
            // Global materialized view refresh (not per-tenant)
            break;
          }

          default:
            results[tenant.id] = { status: 'skipped', error: `Unknown action: ${action}` };
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[cron-orchestrator] ${action} failed for ${tenant.id}:`, msg);
        results[tenant.id] = { status: 'error', error: msg };
      }
    }

    const successCount = Object.values(results).filter(r => r.status === 'ok').length;
    const errorCount = Object.values(results).filter(r => r.status === 'error').length;
    const duration = Date.now() - startTime;

    console.log(`[cron-orchestrator] Done: ${successCount} ok, ${errorCount} errors, ${duration}ms`);

    return jsonResponse({
      success: errorCount === 0,
      action,
      tenants_processed: tenants.length,
      success_count: successCount,
      error_count: errorCount,
      duration_ms: duration,
      results,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron-orchestrator] FATAL:', msg);
    return jsonResponse({ success: false, error: msg }, 500);
  }
});

// ── Helpers ──

async function callFunction(
  supabaseUrl: string,
  serviceKey: string,
  functionName: string,
  body: Record<string, unknown>,
): Promise<any> {
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${functionName} returned ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json();
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Content-Type': 'application/json',
    },
  });
}
