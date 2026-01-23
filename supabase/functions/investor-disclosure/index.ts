import { requireAuth, isErrorResponse, corsHeaders, jsonResponse, errorResponse } from '../_shared/auth.ts';

/**
 * GOVERNANCE PATCH v3.1 - Investor Disclosure Sanitization
 * 
 * CRITICAL SANITIZATION RULES:
 * Investor disclosures MUST NEVER include:
 * - Customer names
 * - Invoice numbers
 * - Bank references
 * - Any PII or transaction-level details
 * 
 * ALLOWED content:
 * - Ratios
 * - Percentages
 * - Buckets (e.g., "0-30 days", "30-60 days")
 * - Status statements (e.g., "within appetite", "breached")
 */

interface RiskMetric {
  metric: string;
  value: string;
  withinAppetite: boolean;
  domain: string;
}

// Sanitization patterns to detect and block
const SENSITIVE_PATTERNS = [
  /invoice[_\s-]*(number|num|no|id)/i,
  /customer[_\s-]*(name|id)/i,
  /bank[_\s-]*(reference|ref|account)/i,
  /transaction[_\s-]*(id|ref)/i,
  /order[_\s-]*(number|num|id)/i,
  /[A-Z]{2,4}[-_]?\d{4,}/i, // Invoice/order numbers like INV-12345
  /@[a-zA-Z0-9]+\.[a-zA-Z]+/i, // Email addresses
  /\d{10,}/i, // Long numbers (account numbers, phone numbers)
];

/**
 * Check if a value contains sensitive information
 */
function containsSensitiveData(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Recursively sanitize an object, removing any sensitive fields
 */
function sanitizeForInvestor<T>(obj: T, path = ''): T {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    if (containsSensitiveData(obj)) {
      console.warn(`[DISCLOSURE SANITIZATION] Blocked sensitive data at ${path}`);
      return '[REDACTED]' as T;
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item, i) => sanitizeForInvestor(item, `${path}[${i}]`)) as T;
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Block known sensitive field names
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('customer') ||
        lowerKey.includes('invoice_number') ||
        lowerKey.includes('bank_reference') ||
        lowerKey.includes('transaction_id') ||
        lowerKey.includes('account_number')
      ) {
        console.warn(`[DISCLOSURE SANITIZATION] Blocked field: ${key}`);
        continue; // Skip this field entirely
      }
      result[key] = sanitizeForInvestor(value, `${path}.${key}`);
    }
    return result as T;
  }
  
  return obj;
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
      // Sanitize to bucket, not exact amount
      formatter: (v) => v > 1000000 ? '>$1M' : v > 500000 ? '$500K-$1M' : v > 100000 ? '$100K-$500K' : '<$100K'
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
      // Bucket, not exact days
      formatter: (v) => v > 180 ? '>6 months' : v > 90 ? '3-6 months' : v > 30 ? '1-3 months' : '<1 month'
    },
    'pending_approvals': {
      metric: 'Governance queue',
      formatter: (v) => v === 0 ? 'Clear' : v < 5 ? 'Minimal' : v < 10 ? 'Moderate' : 'High volume'
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
  // Use shared auth - handles CORS and JWT validation
  const authResult = await requireAuth(req);
  if (isErrorResponse(authResult)) return authResult;
  
  const { supabase: supabaseClient, tenantId, userId } = authResult;

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean).pop();

    // GET /generate - Generate disclosure from current risk appetite
    if (req.method === 'GET' && path === 'generate') {
      const period = url.searchParams.get('period') || 'Q1';
      const authHeader = req.headers.get('Authorization');
      
      // Call risk-appetite/evaluate to get current state
      const evaluateResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/risk-appetite/evaluate`,
        {
          headers: {
            'Authorization': authHeader || '',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!evaluateResponse.ok) {
        return errorResponse('Failed to evaluate risk appetite', 500);
      }

      const evaluation = await evaluateResponse.json();
      
      if (!evaluation.hasActiveAppetite) {
        return jsonResponse({ 
          error: 'No active risk appetite defined',
          suggestion: 'Please configure a Board-approved risk appetite first'
        }, 400);
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

      return jsonResponse({
        period,
        riskAppetiteVersion: evaluation.version,
        summary,
        keyRisks,
        mitigations,
        complianceStatement,
        generatedAt: new Date().toISOString(),
        status: 'draft',
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
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        return errorResponse(error.message, 400);
      }

      return jsonResponse(disclosure);
    }

    // POST /approve - Approve disclosure
    if (req.method === 'POST' && path === 'approve') {
      const body = await req.json();
      const { disclosureId } = body;

      const { data: disclosure, error } = await supabaseClient
        .from('investor_risk_disclosures')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', disclosureId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return errorResponse(error.message, 400);
      }

      // Audit log
      await supabaseClient.from('audit_events').insert({
        tenant_id: tenantId,
        actor_type: 'USER',
        actor_id: userId,
        action: 'APPROVE_INVESTOR_DISCLOSURE',
        resource_type: 'investor_risk_disclosure',
        resource_id: disclosureId,
      });

      return jsonResponse(disclosure);
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
        return errorResponse(error.message, 400);
      }

      return jsonResponse(disclosure);
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
        return errorResponse(error.message, 400);
      }

      return jsonResponse({ disclosures });
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
        return errorResponse('Disclosure not found', 404);
      }

      return jsonResponse(disclosure);
    }

    return errorResponse('Not found', 404);

  } catch (error: any) {
    return errorResponse(error?.message || 'Unknown error', 500);
  }
});
