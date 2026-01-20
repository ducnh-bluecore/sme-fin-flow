import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RiskMetric {
  metric: string;
  value: string;
  withinAppetite: boolean;
  domain: string;
}

// Map internal metrics to investor-safe descriptions
function sanitizeMetricForInvestor(
  metricCode: string,
  value: number,
  threshold: number,
  isBreached: boolean,
  unit: string
): RiskMetric {
  const mappings: Record<string, { metric: string; formatter: (v: number, u: string) => string }> = {
    'ar_overdue_ratio': { 
      metric: 'Revenue at risk from overdue receivables',
      formatter: (v, u) => `${v.toFixed(1)}${u === '%' ? '%' : ''}`
    },
    'ar_overdue_amount': {
      metric: 'Overdue receivables value',
      formatter: (v) => `$${(v / 1000000).toFixed(2)}M`
    },
    'false_auto_rate': {
      metric: 'Automated transaction accuracy',
      formatter: (v) => `${(100 - v).toFixed(1)}% accuracy`
    },
    'auto_reconciliation_rate': {
      metric: 'Transactions processed automatically',
      formatter: (v, u) => `${v.toFixed(1)}${u === '%' ? '%' : ''}`
    },
    'ml_accuracy': {
      metric: 'ML model performance',
      formatter: (v) => `${v.toFixed(1)}% accuracy`
    },
    'calibration_error': {
      metric: 'Prediction reliability',
      formatter: (v) => v < 0.05 ? 'High' : v < 0.1 ? 'Moderate' : 'Under review'
    },
    'cash_runway_days': {
      metric: 'Cash runway',
      formatter: (v) => `${Math.round(v)} days`
    },
    'pending_approvals': {
      metric: 'Governance queue',
      formatter: (v) => `${v} items pending review`
    },
  };

  const mapping = mappings[metricCode] || {
    metric: metricCode.replace(/_/g, ' '),
    formatter: (v: number, u: string) => `${v.toFixed(2)}${u}`
  };

  return {
    metric: mapping.metric,
    value: mapping.formatter(value, unit),
    withinAppetite: !isBreached,
    domain: getDomainLabel(metricCode),
  };
}

function getDomainLabel(metricCode: string): string {
  if (metricCode.startsWith('ar_')) return 'Receivables';
  if (metricCode.startsWith('ap_')) return 'Payables';
  if (metricCode.startsWith('cash_')) return 'Liquidity';
  if (metricCode.includes('auto') || metricCode.includes('reconciliation')) return 'Automation';
  if (metricCode.includes('ml') || metricCode.includes('calibration')) return 'AI/ML';
  return 'Governance';
}

function generateMitigations(breaches: RiskMetric[]): string[] {
  const mitigations: string[] = [];
  
  // Always include standard controls
  mitigations.push('Board-approved risk appetite framework in place');
  mitigations.push('Real-time monitoring and automated alerting');
  
  if (breaches.some(b => b.domain === 'Receivables')) {
    mitigations.push('Enhanced collection procedures activated for overdue accounts');
  }
  if (breaches.some(b => b.domain === 'Automation')) {
    mitigations.push('Human-in-the-loop review for all automated transactions');
    mitigations.push('Guardrails prevent autonomous processing above defined thresholds');
  }
  if (breaches.some(b => b.domain === 'AI/ML')) {
    mitigations.push('ML operates in advisory mode only - no autonomous decisions');
    mitigations.push('Continuous model monitoring with automatic fallback triggers');
  }
  if (breaches.some(b => b.domain === 'Liquidity')) {
    mitigations.push('Cash flow forecasting with scenario analysis');
  }
  
  return mitigations;
}

function generateComplianceStatement(
  breachCount: number,
  totalRules: number,
  appetiteVersion: number
): string {
  if (breachCount === 0) {
    return `All risk metrics are within Board-approved appetite thresholds (v${appetiteVersion}). The organization maintains full compliance with its risk framework.`;
  }
  const complianceRate = ((totalRules - breachCount) / totalRules * 100).toFixed(0);
  return `${complianceRate}% of risk metrics are within Board-approved thresholds (v${appetiteVersion}). ${breachCount} metric(s) require management attention with active mitigation measures in place.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: tenantUser } = await supabaseClient
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!tenantUser) {
      return new Response(JSON.stringify({ error: 'No active tenant' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantId = tenantUser.tenant_id;
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean).pop();

    // GET /generate - Generate disclosure from current risk appetite
    if (req.method === 'GET' && path === 'generate') {
      const period = url.searchParams.get('period') || 'Q1';
      
      // Call risk-appetite/evaluate to get current state
      const evaluateResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/risk-appetite/evaluate`,
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!evaluateResponse.ok) {
        return new Response(JSON.stringify({ 
          error: 'Failed to evaluate risk appetite' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const evaluation = await evaluateResponse.json();
      
      if (!evaluation.hasActiveAppetite) {
        return new Response(JSON.stringify({ 
          error: 'No active risk appetite defined',
          suggestion: 'Please configure a Board-approved risk appetite first'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Transform evaluations to investor-safe metrics
      const keyRisks: RiskMetric[] = evaluation.evaluations.map((e: {
        metricCode: string;
        currentValue: number;
        threshold: number;
        isBreached: boolean;
        unit: string;
      }) => 
        sanitizeMetricForInvestor(e.metricCode, e.currentValue, e.threshold, e.isBreached, e.unit)
      );

      const breaches = keyRisks.filter(r => !r.withinAppetite);
      const mitigations = generateMitigations(breaches);
      const complianceStatement = generateComplianceStatement(
        evaluation.breachCount,
        evaluation.evaluations.length,
        evaluation.version
      );

      // Generate summary narrative
      const summary = breaches.length === 0
        ? `For ${period}, the organization operated within all Board-defined risk parameters. Financial controls remain effective with ${keyRisks.filter(r => r.domain === 'Automation').length > 0 ? 'automation safeguards' : 'manual oversight'} ensuring transaction integrity.`
        : `For ${period}, ${breaches.length} risk metric(s) exceeded Board thresholds. Management has implemented targeted mitigations. All automated processes include human oversight and approval requirements.`;

      return new Response(JSON.stringify({
        period,
        riskAppetiteVersion: evaluation.version,
        summary,
        keyRisks,
        mitigations,
        complianceStatement,
        generatedAt: new Date().toISOString(),
        status: 'draft',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /save - Save disclosure draft
    if (req.method === 'POST' && path === 'save') {
      const body = await req.json();
      const {
        riskAppetiteVersion,
        periodStart,
        periodEnd,
        summary,
        keyRisks,
        mitigations,
        complianceStatement,
      } = body;

      const { data: disclosure, error } = await supabaseClient
        .from('investor_risk_disclosures')
        .insert({
          tenant_id: tenantId,
          risk_appetite_version: riskAppetiteVersion,
          disclosure_period_start: periodStart,
          disclosure_period_end: periodEnd,
          summary,
          key_risks: keyRisks,
          mitigations,
          compliance_statement: complianceStatement,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(disclosure), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /approve - Approve disclosure
    if (req.method === 'POST' && path === 'approve') {
      const body = await req.json();
      const { disclosureId } = body;

      const { data: disclosure, error } = await supabaseClient
        .from('investor_risk_disclosures')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', disclosureId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Audit log
      await supabaseClient.from('audit_events').insert({
        tenant_id: tenantId,
        actor_type: 'USER',
        actor_id: user.id,
        action: 'APPROVE_INVESTOR_DISCLOSURE',
        resource_type: 'investor_risk_disclosure',
        resource_id: disclosureId,
      });

      return new Response(JSON.stringify(disclosure), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /publish - Publish disclosure
    if (req.method === 'POST' && path === 'publish') {
      const body = await req.json();
      const { disclosureId } = body;

      const { data: disclosure, error } = await supabaseClient
        .from('investor_risk_disclosures')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', disclosureId)
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(disclosure), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /list - List all disclosures
    if (req.method === 'GET' && path === 'list') {
      const status = url.searchParams.get('status');
      
      let query = supabaseClient
        .from('investor_risk_disclosures')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('disclosure_period_end', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: disclosures, error } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ disclosures }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /:id - Get single disclosure
    if (req.method === 'GET' && path !== 'generate' && path !== 'list') {
      const { data: disclosure, error } = await supabaseClient
        .from('investor_risk_disclosures')
        .select('*')
        .eq('id', path)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: 'Disclosure not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(disclosure), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
