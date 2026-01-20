import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Generate evidence hash for tamper detection
function generateEvidenceHash(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// Convert to CSV format
function toCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val).replace(/"/g, '""');
      return String(val).replace(/"/g, '""');
    }).map(v => `"${v}"`).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const path = url.pathname.replace('/audit', '');
    const tenantId = req.headers.get('x-tenant-id');

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /audit/events - List audit events with filters
    if (req.method === 'GET' && path === '/events') {
      const startDate = url.searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = url.searchParams.get('end') || new Date().toISOString();
      const action = url.searchParams.get('action');
      const resourceType = url.searchParams.get('resource_type');
      const actorType = url.searchParams.get('actor_type');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('audit_events')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (action) query = query.eq('action', action);
      if (resourceType) query = query.eq('resource_type', resourceType);
      if (actorType) query = query.eq('actor_type', actorType);

      const { data: events, count, error } = await query;

      if (error) {
        console.error('Error fetching audit events:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch audit events' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          events: events || [],
          total: count || 0,
          limit,
          offset,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /audit/export - Export audit events
    if (req.method === 'GET' && path === '/export') {
      const startDate = url.searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = url.searchParams.get('end') || new Date().toISOString();
      const format = url.searchParams.get('format') || 'json';
      const action = url.searchParams.get('action');
      const resourceType = url.searchParams.get('resource_type');

      let query = supabase
        .from('audit_events')
        .select('id, created_at, actor_type, actor_id, actor_role, action, resource_type, resource_id, decision_context, reason_code, reason_detail')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (action) query = query.eq('action', action);
      if (resourceType) query = query.eq('resource_type', resourceType);

      const { data: events, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to export audit events' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the export
      const authHeader = req.headers.get('Authorization');
      let userId = null;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      }

      await supabase.from('audit_exports').insert({
        tenant_id: tenantId,
        requested_by: userId,
        export_type: 'EVENTS',
        period_start: startDate,
        period_end: endDate,
        filters: { action, resource_type: resourceType },
        record_count: events?.length || 0,
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      });

      if (format === 'csv') {
        const csv = toCSV(events || []);
        return new Response(csv, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit-export-${new Date().toISOString()}.csv"`,
          },
        });
      }

      return new Response(
        JSON.stringify({
          events: events || [],
          exportedAt: new Date().toISOString(),
          periodStart: startDate,
          periodEnd: endDate,
          recordCount: events?.length || 0,
          evidenceHash: generateEvidenceHash(events),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /audit/evidence-pack/{period} - Generate evidence pack
    if (req.method === 'GET' && path.startsWith('/evidence-pack')) {
      const period = path.split('/')[2] || '30d';
      const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      // Gather all evidence
      const [
        { data: auditEvents },
        { data: reconciliationLinks },
        { data: decisionSnapshots },
        { data: guardrailEvents },
        { data: mlPredictions },
        { data: driftSignals },
        { data: suggestionOutcomes },
      ] = await Promise.all([
        supabase.from('audit_events')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false }),
        supabase.from('reconciliation_links')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabase.from('decision_snapshots')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabase.from('reconciliation_guardrail_events')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabase.from('reconciliation_ml_predictions')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabase.from('ml_drift_signals')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('detected_at', startDate)
          .lte('detected_at', endDate),
        supabase.from('reconciliation_suggestion_outcomes')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate),
      ]);

      // Calculate summary stats
      const autoReconciliations = (auditEvents || []).filter(
        (e: any) => e.decision_context === 'AUTO_CONFIRM'
      ).length;
      const manualReconciliations = (auditEvents || []).filter(
        (e: any) => e.decision_context === 'MANUAL_CONFIRM'
      ).length;
      const guardrailBlocks = (guardrailEvents || []).filter(
        (e: any) => e.action === 'BLOCK'
      ).length;
      const voidedLinks = (reconciliationLinks || []).filter(
        (l: any) => l.is_voided
      ).length;

      const evidencePack = {
        metadata: {
          generatedAt: new Date().toISOString(),
          periodStart: startDate,
          periodEnd: endDate,
          tenantId,
          version: '1.0',
        },
        summary: {
          totalAuditEvents: auditEvents?.length || 0,
          totalReconciliations: reconciliationLinks?.length || 0,
          autoReconciliations,
          manualReconciliations,
          voidedReconciliations: voidedLinks,
          guardrailBlocks,
          mlPredictions: mlPredictions?.length || 0,
          driftSignals: driftSignals?.length || 0,
          decisionSnapshots: decisionSnapshots?.length || 0,
        },
        evidence: {
          auditEvents: auditEvents || [],
          reconciliationLinks: reconciliationLinks || [],
          decisionSnapshots: decisionSnapshots || [],
          guardrailEvents: guardrailEvents || [],
          mlPredictions: mlPredictions || [],
          driftSignals: driftSignals || [],
          suggestionOutcomes: suggestionOutcomes || [],
        },
        integrity: {
          evidenceHash: '',
          recordCounts: {
            auditEvents: auditEvents?.length || 0,
            reconciliationLinks: reconciliationLinks?.length || 0,
            decisionSnapshots: decisionSnapshots?.length || 0,
            guardrailEvents: guardrailEvents?.length || 0,
            mlPredictions: mlPredictions?.length || 0,
            driftSignals: driftSignals?.length || 0,
          },
        },
      };

      // Generate hash for integrity
      evidencePack.integrity.evidenceHash = generateEvidenceHash(evidencePack.evidence);

      // Log the export
      const authHeader = req.headers.get('Authorization');
      let userId = null;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      }

      await supabase.from('audit_exports').insert({
        tenant_id: tenantId,
        requested_by: userId,
        export_type: 'EVIDENCE_PACK',
        period_start: startDate,
        period_end: endDate,
        record_count: auditEvents?.length || 0,
        file_hash: evidencePack.integrity.evidenceHash,
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify(evidencePack),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /audit/summary - Get audit summary stats
    if (req.method === 'GET' && path === '/summary') {
      const days = parseInt(url.searchParams.get('days') || '30');
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data: events } = await supabase
        .from('audit_events')
        .select('action, actor_type, resource_type, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate);

      // Group by action
      const byAction: Record<string, number> = {};
      const byActorType: Record<string, number> = {};
      const byResourceType: Record<string, number> = {};
      const byDay: Record<string, number> = {};

      (events || []).forEach((e: any) => {
        byAction[e.action] = (byAction[e.action] || 0) + 1;
        byActorType[e.actor_type] = (byActorType[e.actor_type] || 0) + 1;
        byResourceType[e.resource_type] = (byResourceType[e.resource_type] || 0) + 1;
        
        const day = new Date(e.created_at).toISOString().split('T')[0];
        byDay[day] = (byDay[day] || 0) + 1;
      });

      return new Response(
        JSON.stringify({
          totalEvents: events?.length || 0,
          periodDays: days,
          byAction,
          byActorType,
          byResourceType,
          byDay,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /audit/controls - Get SOC control attestations
    if (req.method === 'GET' && path === '/controls') {
      const { data: controls, error } = await supabase
        .from('soc_control_attestations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('control_id');

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch controls' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ controls: controls || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /audit/log - Manually log an audit event
    if (req.method === 'POST' && path === '/log') {
      const body = await req.json();
      const {
        actorType,
        actorId,
        actorRole,
        action,
        resourceType,
        resourceId,
        decisionContext,
        reasonCode,
        reasonDetail,
        beforeState,
        afterState,
      } = body;

      if (!action || !resourceType) {
        return new Response(
          JSON.stringify({ error: 'action and resourceType are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('audit_events')
        .insert({
          tenant_id: tenantId,
          actor_type: actorType || 'SYSTEM',
          actor_id: actorId,
          actor_role: actorRole,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          decision_context: decisionContext,
          reason_code: reasonCode,
          reason_detail: reasonDetail,
          before_state: beforeState,
          after_state: afterState,
        })
        .select()
        .single();

      if (error) {
        console.error('Error logging audit event:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to log audit event' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, eventId: data.id }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Audit API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
