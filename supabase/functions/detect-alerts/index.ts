import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * SECURITY: JWT validation OR service role required
 * This function can be called by:
 * 1. Authenticated users (for their tenant)
 * 2. Scheduled functions (with service role)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertConfig {
  id: string;
  category: string;
  alert_type: string;
  severity: string;
  threshold_value: number | null;
  threshold_operator: string | null;
  threshold_unit: string | null;
  title: string;
  enabled: boolean;
}

interface IntelligentRule {
  id: string;
  rule_code: string;
  rule_name: string;
  rule_category: string;
  calculation_formula: string;
  threshold_type: string;
  threshold_config: any;
  severity: string;
  suggested_actions: any[];
  is_enabled: boolean;
  priority: number;
  applicable_channels?: string[];
  description?: string;
}

interface AlertObject {
  id: string;
  object_type: string;
  object_name: string;
  external_id: string;
  current_metrics: any;
  metadata: any;
  sales_velocity: number;
  days_of_stock: number;
  lead_time_days: number;
  safety_stock: number;
  avg_daily_sales: number;
  trend_direction: string;
  trend_percent: number;
  reorder_point: number;
  stockout_risk_days: number;
  last_sale_date: string;
}

interface DetectionResult {
  triggered: number;
  checked: number;
  errors: string[];
  calculations: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { tenant_id: requestedTenantId, use_precalculated = true } = await req.json();

    // SECURITY: Validate access to tenant
    let tenantId: string;
    
    const authHeader = req.headers.get('Authorization');
    const isServiceRole = authHeader === `Bearer ${supabaseKey}`;
    
    if (isServiceRole) {
      // Called by scheduled function with service role - trust tenant_id param
      if (!requestedTenantId) {
        throw new Error('tenant_id is required for service role calls');
      }
      tenantId = requestedTenantId;
      console.log(`Service role call for tenant: ${tenantId}`);
    } else if (authHeader?.startsWith('Bearer ')) {
      // User call - validate JWT and tenant access
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized', code: 'INVALID_TOKEN' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userId = claimsData.claims.sub as string;
      
      // Get user's tenant
      const { data: tenantUser, error: tenantError } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (tenantError || !tenantUser?.tenant_id) {
        return new Response(JSON.stringify({ error: 'Forbidden - No tenant access', code: 'NO_TENANT' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // SECURITY: Verify requested tenant matches user's tenant
      if (requestedTenantId && requestedTenantId !== tenantUser.tenant_id) {
        console.error(`Cross-tenant access denied: user ${userId} tried to access ${requestedTenantId}`);
        return new Response(JSON.stringify({ error: 'Forbidden - Cross-tenant access denied', code: 'CROSS_TENANT' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      tenantId = tenantUser.tenant_id;
      console.log(`User ${userId} detecting alerts for tenant: ${tenantId}`);
    } else {
      return new Response(JSON.stringify({ error: 'Unauthorized', code: 'NO_AUTH' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result: DetectionResult = { triggered: 0, checked: 0, errors: [], calculations: [] };

    // Step 1: Get intelligent rules
    const { data: intelligentRules } = await supabase
      .from('intelligent_alert_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_enabled', true)
      .order('priority', { ascending: true });

    console.log(`Found ${intelligentRules?.length || 0} intelligent rules`);

    // Step 2: Get PRE-CALCULATED metrics (much faster!)
    if (use_precalculated) {
      console.log('Using pre-calculated metrics from object_calculated_metrics...');
      
      // Process alerts from pre-calculated metrics - SUPER FAST!
      const alertsFromPrecalc = await processFromPrecalculatedMetrics(supabase, tenantId, intelligentRules || []);
      result.triggered += alertsFromPrecalc.triggered;
      result.checked += alertsFromPrecalc.checked;
      result.calculations.push(...alertsFromPrecalc.calculations);
      
    } else {
      // Fallback to legacy calculation
      console.log('Using legacy on-demand calculations...');
      await updateDynamicCalculations(supabase, tenantId);
      
      const { data: objects } = await supabase
        .from('alert_objects')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_monitored', true)
        .limit(500);

      const additionalData = await fetchAdditionalData(supabase, tenantId);

      for (const rule of intelligentRules || []) {
        try {
          const alerts = await processUniversalRule(supabase, tenantId, rule, objects || [], additionalData);
          result.triggered += alerts.length;
          result.checked++;
          result.calculations.push({ rule: rule.rule_code, alerts_created: alerts.length });
        } catch (e) {
          result.errors.push(`Rule ${rule.rule_code}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    }

    // Step 3: Get additional data for cross-object detection
    const additionalData = await fetchAdditionalData(supabase, tenantId);

    // Step 4: Process basic alert configs  
    const { data: configs } = await supabase
      .from('extended_alert_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('enabled', true);

    console.log(`Found ${configs?.length || 0} basic alert configs`);

    // Get objects for basic config processing (limited)
    const { data: objectsForBasic } = await supabase
      .from('alert_objects')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_monitored', true)
      .limit(200);

    for (const config of configs || []) {
      try {
        const alerts = await detectAlertsForConfig(supabase, tenantId, config, objectsForBasic || []);
        result.triggered += alerts.length;
        result.checked++;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Unknown error';
        result.errors.push(`Config ${config.alert_type}: ${errMsg}`);
      }
    }

    // Step 5: Run cross-object detection using pre-calculated data
    const additionalAlerts = await runCrossObjectDetection(supabase, tenantId, objectsForBasic || [], additionalData);
    result.triggered += additionalAlerts;

    return new Response(JSON.stringify({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Detection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============= SMART ALERT AGGREGATION =============
// Strategy: Summary Alert + Top N Priority
// - 1 summary alert for overview ("642 sản phẩm sắp hết hàng")
// - Top 10-20 individual alerts for most critical items

const TOP_N_CRITICAL = 15; // Số cảnh báo chi tiết tối đa
const TOP_N_WARNING = 5;

async function processFromPrecalculatedMetrics(
  supabase: any,
  tenantId: string,
  rules: IntelligentRule[]
): Promise<{ triggered: number; checked: number; calculations: any[] }> {
  const result = { triggered: 0, checked: 0, calculations: [] as any[] };

  // Get COUNTS for summary
  const { count: criticalDOSCount } = await supabase
    .from('object_calculated_metrics')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('dos_status', 'critical');

  const { count: warningDOSCount } = await supabase
    .from('object_calculated_metrics')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('dos_status', 'warning');

  const { count: criticalRevenueCount } = await supabase
    .from('object_calculated_metrics')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('revenue_status', 'critical');

  console.log(`Pre-calc counts: ${criticalDOSCount || 0} critical DOS, ${warningDOSCount || 0} warning DOS, ${criticalRevenueCount || 0} critical revenue`);

  // Get TOP N most critical (sorted by stockout_risk, days_of_stock)
  const { data: topCriticalDOS } = await supabase
    .from('object_calculated_metrics')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('dos_status', 'critical')
    .order('days_of_stock', { ascending: true }) // Lower DOS = more urgent
    .limit(TOP_N_CRITICAL);

  const { data: topWarningDOS } = await supabase
    .from('object_calculated_metrics')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('dos_status', 'warning')
    .order('days_of_stock', { ascending: true })
    .limit(TOP_N_WARNING);

  const { data: topCriticalRevenue } = await supabase
    .from('object_calculated_metrics')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('revenue_status', 'critical')
    .order('target_progress', { ascending: true })
    .limit(TOP_N_WARNING);

  // Find matching rules
  const dosRule = rules.find(r => r.rule_code?.toLowerCase().includes('dos') || r.rule_code?.toLowerCase().includes('stockout'));
  const revenueRule = rules.find(r => r.rule_code?.toLowerCase().includes('revenue') || r.rule_code?.toLowerCase().includes('target'));

  // ========== 1. CREATE SUMMARY ALERT (if > TOP_N items) ==========
  if (dosRule && (criticalDOSCount || 0) > TOP_N_CRITICAL) {
    const summaryCreated = await createSummaryAlert(supabase, tenantId, dosRule, {
      totalCount: criticalDOSCount || 0,
      severity: 'critical',
      metricType: 'dos',
      topItems: topCriticalDOS || [],
    });
    if (summaryCreated) {
      result.triggered++;
      result.calculations.push({ 
        rule: dosRule.rule_code + '_summary', 
        alerts_created: 1, 
        source: 'summary_alert',
        total_affected: criticalDOSCount,
      });
    }
  }

  if (dosRule && (warningDOSCount || 0) > TOP_N_WARNING) {
    const summaryCreated = await createSummaryAlert(supabase, tenantId, dosRule, {
      totalCount: warningDOSCount || 0,
      severity: 'warning',
      metricType: 'dos',
      topItems: topWarningDOS || [],
    });
    if (summaryCreated) {
      result.triggered++;
      result.calculations.push({ 
        rule: dosRule.rule_code + '_warning_summary', 
        alerts_created: 1, 
        source: 'summary_alert',
        total_affected: warningDOSCount,
      });
    }
  }

  // ========== 2. CREATE TOP N INDIVIDUAL ALERTS ==========
  if (dosRule && topCriticalDOS?.length) {
    let alertsCreated = 0;
    for (const metric of topCriticalDOS) {
      const alert = await createAlertFromPrecalc(supabase, tenantId, dosRule, metric, 'critical', 'dos');
      if (alert) alertsCreated++;
    }
    result.triggered += alertsCreated;
    result.calculations.push({ 
      rule: dosRule.rule_code, 
      alerts_created: alertsCreated, 
      source: 'top_n_critical',
      top_n: TOP_N_CRITICAL,
    });
  }

  if (dosRule && topWarningDOS?.length) {
    let alertsCreated = 0;
    for (const metric of topWarningDOS) {
      const alert = await createAlertFromPrecalc(supabase, tenantId, dosRule, metric, 'warning', 'dos');
      if (alert) alertsCreated++;
    }
    result.triggered += alertsCreated;
    result.calculations.push({ 
      rule: dosRule.rule_code + '_warning', 
      alerts_created: alertsCreated, 
      source: 'top_n_warning',
    });
  }

  // Revenue alerts
  if (revenueRule && topCriticalRevenue?.length) {
    let alertsCreated = 0;
    for (const metric of topCriticalRevenue) {
      const alert = await createAlertFromPrecalc(supabase, tenantId, revenueRule, metric, 'critical', 'revenue');
      if (alert) alertsCreated++;
    }
    result.triggered += alertsCreated;
    result.calculations.push({ rule: revenueRule.rule_code, alerts_created: alertsCreated, source: 'top_n_revenue' });
  }

  // Mark other rules as checked
  for (const rule of rules) {
    result.checked++;
    if (!result.calculations.find(c => c.rule === rule.rule_code || c.rule?.startsWith(rule.rule_code))) {
      result.calculations.push({ rule: rule.rule_code, alerts_created: 0, source: 'precalc' });
    }
  }

  return result;
}

// ============= CREATE SUMMARY ALERT =============

async function createSummaryAlert(
  supabase: any,
  tenantId: string,
  rule: IntelligentRule,
  data: {
    totalCount: number;
    severity: string;
    metricType: 'dos' | 'revenue';
    topItems: any[];
  }
): Promise<boolean> {
  const { totalCount, severity, metricType, topItems } = data;
  const emoji = severity === 'critical' ? '🚨' : '⚠️';
  
  // Build summary message
  let title = '';
  let message = '';
  let topList = '';
  let impactAmount = 0;
  let impactDescription = '';
  
  if (metricType === 'dos') {
    title = `${emoji} ${totalCount} sản phẩm sắp hết hàng`;
    message = severity === 'critical' 
      ? `Có ${totalCount} sản phẩm có số ngày tồn kho < 3 ngày. Cần hành động ngay!`
      : `Có ${totalCount} sản phẩm có số ngày tồn kho < 7 ngày. Nên kiểm tra và chuẩn bị nhập hàng.`;
    
    // Calculate impact: estimate lost sales if stockout occurs
    // Each product's potential daily revenue * days at risk
    const avgDailyRevenue = topItems.reduce((sum, item) => {
      const velocity = item.sales_velocity || 0;
      const unitPrice = item.calculation_inputs?.unit_price || 200000; // Default 200K VND
      return sum + (velocity * unitPrice);
    }, 0) / Math.max(topItems.length, 1);
    
    impactAmount = Math.round(avgDailyRevenue * totalCount * (severity === 'critical' ? 3 : 7));
    impactDescription = `Doanh thu có thể mất nếu stockout: ₫${(impactAmount / 1000000).toFixed(1)}M`;
    
    // Top 5 most urgent
    topList = topItems.slice(0, 5).map((item, idx) => 
      `${idx + 1}. ${item.object_name}: ${Math.round(item.days_of_stock || 0)} ngày (velocity: ${(item.sales_velocity || 0).toFixed(1)}/ngày)`
    ).join('\n');
  } else {
    title = `${emoji} ${totalCount} đối tượng không đạt target`;
    message = `Có ${totalCount} đối tượng doanh thu dưới mức target. Cần xem xét chiến lược.`;
    
    // Calculate gap to target
    const gapToTarget = topItems.reduce((sum, item) => {
      const target = item.calculation_inputs?.target_revenue || 0;
      const actual = item.calculation_inputs?.current_revenue || 0;
      return sum + Math.max(0, target - actual);
    }, 0);
    
    impactAmount = gapToTarget > 0 ? gapToTarget : totalCount * 10000000; // Default 10M per item
    impactDescription = `Gap so với target: ₫${(impactAmount / 1000000).toFixed(1)}M`;
    
    topList = topItems.slice(0, 5).map((item, idx) => 
      `${idx + 1}. ${item.object_name}: ${Math.round(item.target_progress || 0)}% target`
    ).join('\n');
  }

  const fullMessage = `${message}\n\n**Top 5 cần ưu tiên:**\n${topList}\n\n💰 **Impact:** ${impactDescription}\n\n👉 Xem chi tiết tại Control Tower → Alerts`;

  const alertType = `${rule.rule_code}_summary_${severity}`;
  
  const alertData = {
    tenant_id: tenantId,
    alert_type: alertType,
    category: rule.rule_category || 'inventory',
    severity,
    title,
    message: fullMessage,
    object_type: 'summary',
    object_name: `${totalCount} items`,
    metric_name: metricType === 'dos' ? 'days_of_stock' : 'target_progress',
    current_value: totalCount,
    threshold_value: metricType === 'dos' ? (severity === 'critical' ? 3 : 7) : 80,
    status: 'active',
    priority: severity === 'critical' ? 0 : 1, // Highest priority for summary
    notification_sent: false,
    suggested_action: `Kiểm tra ${totalCount} ${metricType === 'dos' ? 'sản phẩm sắp hết hàng' : 'đối tượng không đạt target'}`,
    action_priority: severity === 'critical' ? 'urgent' : 'high',
    action_url: '/control-tower/alerts',
    impact_amount: impactAmount,
    impact_currency: 'VND',
    impact_description: impactDescription,
    deadline_at: new Date(Date.now() + (severity === 'critical' ? 24 : 72) * 60 * 60 * 1000).toISOString(),
    calculation_details: {
      source: 'aggregated_summary',
      total_affected: totalCount,
      top_items: topItems.slice(0, 5).map(i => ({ 
        id: i.object_id, 
        name: i.object_name, 
        value: metricType === 'dos' ? i.days_of_stock : i.target_progress 
      })),
      remaining_count: Math.max(0, totalCount - topItems.length),
      impact_calculation: {
        method: metricType === 'dos' ? 'potential_lost_sales' : 'target_gap',
        amount: impactAmount,
      },
    },
    metadata: {
      rule_id: rule.id,
      detected_at: new Date().toISOString(),
      is_summary: true,
      affected_count: totalCount,
    },
  };

  // Check existing summary alert (only 1 per type per day)
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('alert_instances')
    .select('id, current_value')
    .eq('tenant_id', tenantId)
    .eq('alert_type', alertType)
    .neq('status', 'resolved')
    .gte('created_at', today)
    .maybeSingle();

  if (existing) {
    // Update existing summary with new count
    if (existing.current_value !== totalCount) {
      await supabase.from('alert_instances')
        .update({ 
          current_value: totalCount, 
          message: fullMessage,
          title,
          impact_amount: impactAmount,
          impact_description: impactDescription,
          calculation_details: alertData.calculation_details,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      console.log(`Updated summary alert: ${title} | Impact: ${impactAmount}`);
    }
    return false;
  }

  const { error } = await supabase.from('alert_instances').insert(alertData);
  if (!error) {
    console.log(`Created summary alert: ${title} | Impact: ${impactAmount}`);
    return true;
  }
  return false;
}

// ============= CREATE INDIVIDUAL TOP-N ALERT =============

async function createAlertFromPrecalc(
  supabase: any,
  tenantId: string,
  rule: IntelligentRule,
  metric: any,
  severity: string,
  metricType: 'dos' | 'revenue'
): Promise<any> {
  const emoji = severity === 'critical' ? '🚨' : '⚠️';
  const currentValue = metricType === 'dos' ? metric.days_of_stock : metric.target_progress;
  const thresholdValue = metricType === 'dos' ? (severity === 'critical' ? 3 : 7) : (severity === 'critical' ? 60 : 80);
  
  // Calculate impact amount for this specific item
  let impactAmount = 0;
  let impactDescription = '';
  
  if (metricType === 'dos') {
    // Impact = potential lost sales if stockout
    const velocity = metric.sales_velocity || 0;
    const unitPrice = metric.calculation_inputs?.unit_price || 200000; // Default 200K VND
    const daysAtRisk = Math.max(0, thresholdValue - (currentValue || 0));
    impactAmount = Math.round(velocity * unitPrice * Math.max(daysAtRisk, 1) * 7); // 7 days potential loss
    impactDescription = `Doanh thu có thể mất: ₫${(impactAmount / 1000000).toFixed(1)}M`;
  } else {
    // Impact = gap to target
    const targetRevenue = metric.calculation_inputs?.target_revenue || 0;
    const currentRevenue = metric.calculation_inputs?.current_revenue || 0;
    impactAmount = Math.max(0, targetRevenue - currentRevenue);
    if (impactAmount === 0) impactAmount = 5000000; // Default 5M if no data
    impactDescription = `Gap so với target: ₫${(impactAmount / 1000000).toFixed(1)}M`;
  }
  
  const message = metricType === 'dos'
    ? `${metric.object_name}: Chỉ còn ${Math.round(currentValue || 0)} ngày tồn kho. Velocity: ${(metric.sales_velocity || 0).toFixed(1)}/ngày\n💰 ${impactDescription}`
    : `${metric.object_name}: Đạt ${Math.round(currentValue || 0)}% target.\n💰 ${impactDescription}`;

  const alertData = {
    tenant_id: tenantId,
    alert_type: rule.rule_code,
    category: rule.rule_category || 'inventory',
    severity,
    title: `${emoji} ${rule.rule_name}: ${metric.object_name}`,
    message,
    object_type: metric.object_type,
    object_name: metric.object_name,
    alert_object_id: metric.object_id,
    external_object_id: metric.external_id,
    metric_name: metricType === 'dos' ? 'days_of_stock' : 'target_progress',
    current_value: currentValue,
    threshold_value: thresholdValue,
    status: 'active',
    priority: severity === 'critical' ? 1 : 2,
    notification_sent: false,
    suggested_action: message,
    action_priority: severity === 'critical' ? 'urgent' : 'high',
    impact_amount: impactAmount,
    impact_currency: 'VND',
    impact_description: impactDescription,
    deadline_at: new Date(Date.now() + (severity === 'critical' ? 24 : 72) * 60 * 60 * 1000).toISOString(),
    calculation_details: {
      source: 'top_n_priority',
      precalculated_at: metric.last_calculated_at,
      inputs: metric.calculation_inputs,
      rank_by: metricType === 'dos' ? 'days_of_stock ASC' : 'target_progress ASC',
      impact_calculation: {
        velocity: metric.sales_velocity,
        unit_price: metric.calculation_inputs?.unit_price,
        days_at_risk: thresholdValue - (currentValue || 0),
        amount: impactAmount,
      },
    },
    metadata: {
      rule_id: rule.id,
      detected_at: new Date().toISOString(),
      is_top_priority: true,
    },
  };

  // Check existing
  const { data: existing } = await supabase
    .from('alert_instances')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('alert_type', rule.rule_code)
    .eq('alert_object_id', metric.object_id)
    .neq('status', 'resolved')
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from('alert_instances').insert(alertData);
    if (!error) {
      console.log(`Created top-N alert: ${alertData.title} | Impact: ${impactAmount}`);
      return alertData;
    }
  }
  return null;
}

// ============= FETCH ADDITIONAL DATA FOR CALCULATIONS =============

async function fetchAdditionalData(supabase: any, tenantId: string) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Fetch orders data
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('order_date', lastWeek);

  // Fetch invoices for revenue calculations
  const { data: recentInvoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('invoice_date', last30Days);

  // Fetch bank accounts for cash flow
  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  // Fetch upcoming bills
  const { data: upcomingBills } = await supabase
    .from('bills')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .gte('due_date', today)
    .lte('due_date', new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString());

  // Fetch daily revenues
  const { data: revenues } = await supabase
    .from('revenues')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('date', last30Days);

  // Fetch daily expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('date', last30Days);

  // Calculate aggregates
  const todayRevenue = revenues?.filter((r: any) => r.date === today).reduce((sum: number, r: any) => sum + (r.amount || 0), 0) || 0;
  const yesterdayRevenue = revenues?.filter((r: any) => r.date === yesterday).reduce((sum: number, r: any) => sum + (r.amount || 0), 0) || 0;
  const lastWeekRevenue = revenues?.filter((r: any) => r.date === lastWeek).reduce((sum: number, r: any) => sum + (r.amount || 0), 0) || 0;
  
  const totalCash = bankAccounts?.reduce((sum: number, acc: any) => sum + (acc.current_balance || 0), 0) || 0;
  const totalDue = upcomingBills?.reduce((sum: number, bill: any) => sum + ((bill.total_amount || 0) - (bill.paid_amount || 0)), 0) || 0;
  const avgDailyExpenses = expenses?.length > 0 
    ? expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) / Math.max(1, expenses.length)
    : 0;

  return {
    orders: recentOrders || [],
    invoices: recentInvoices || [],
    bankAccounts: bankAccounts || [],
    upcomingBills: upcomingBills || [],
    revenues: revenues || [],
    expenses: expenses || [],
    aggregates: {
      todayRevenue,
      yesterdayRevenue,
      lastWeekRevenue,
      totalCash,
      totalDue,
      avgDailyExpenses,
      cashCoverageDays: avgDailyExpenses > 0 ? totalCash / avgDailyExpenses : 999,
    },
    dates: { today, yesterday, lastWeek, last30Days },
  };
}

// ============= DYNAMIC CALCULATIONS =============

async function updateDynamicCalculations(supabase: any, tenantId: string) {
  // Skip dynamic calculations for large datasets - calculations should be done via scheduled job
  // Just get a sample to ensure objects exist
  const { count } = await supabase
    .from('alert_objects')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('object_type', 'product');

  if ((count || 0) > 100) {
    console.log(`Skipping dynamic calc for ${count} products - use scheduled job instead`);
    return;
  }

  // Get all product objects (only for small datasets)
  const { data: products } = await supabase
    .from('alert_objects')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('object_type', 'product')
    .limit(100);

  if (!products) return;

  // Batch update calculations
  const updates = products.map((product: any) => {
    const metrics = product.current_metrics || {};
    const totalStock = metrics.total_stock ?? 0;
    const salesLast30Days = metrics.sales_last_30_days ?? 10;
    const avgDailySales = salesLast30Days / 30;
    const daysOfStock = avgDailySales > 0 ? totalStock / avgDailySales : 999;
    const leadTimeDays = product.lead_time_days ?? 7;
    const safetyStock = product.safety_stock ?? 5;
    const reorderPoint = Math.ceil((leadTimeDays * avgDailySales) + safetyStock);
    const stockoutRiskDays = Math.max(0, Math.floor(daysOfStock - leadTimeDays));
    const previousSales = metrics.sales_previous_30_days ?? salesLast30Days * 0.9;
    const trendPercent = previousSales > 0 ? ((salesLast30Days - previousSales) / previousSales) * 100 : 0;
    const trendDirection = trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable';
    const lastSaleDate = product.last_sale_date || metrics.last_sale_date;
    const daysSinceLastSale = lastSaleDate ? Math.floor((Date.now() - new Date(lastSaleDate).getTime()) / (24 * 60 * 60 * 1000)) : 999;

    return {
      id: product.id,
      sales_velocity: avgDailySales,
      days_of_stock: daysOfStock,
      avg_daily_sales: avgDailySales,
      reorder_point: reorderPoint,
      stockout_risk_days: stockoutRiskDays,
      trend_direction: trendDirection,
      trend_percent: trendPercent,
    };
  });

  // Update in batches of 50
  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50);
    for (const upd of batch) {
      await supabase.from('alert_objects').update(upd).eq('id', upd.id);
    }
  }

  // Update store metrics
  const { data: stores } = await supabase
    .from('alert_objects')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('object_type', 'store');

  for (const store of stores || []) {
    const metrics = store.current_metrics || {};
    const target = metrics.target_revenue || 0;
    const actual = metrics.daily_revenue || 0;
    const targetProgress = target > 0 ? (actual / target) * 100 : 100;

    await supabase
      .from('alert_objects')
      .update({
        current_metrics: {
          ...metrics,
          target_progress: targetProgress,
          variance_percent: targetProgress - 100,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', store.id);
  }

  console.log(`Updated calculations for ${products.length} products and ${stores?.length || 0} stores`);
}

// ============= UNIVERSAL RULE PROCESSOR =============

async function processUniversalRule(
  supabase: any,
  tenantId: string,
  rule: IntelligentRule,
  objects: AlertObject[],
  additionalData: any
): Promise<any[]> {
  const alerts: any[] = [];
  const config = rule.threshold_config || {};
  const operator = config.operator || 'greater_than';
  const criticalThreshold = config.critical ?? config.critical_days ?? config.value ?? null;
  const warningThreshold = config.warning ?? config.warning_days ?? null;

  // Determine which objects to check based on rule category
  let targetObjects = getTargetObjects(rule, objects);
  
  // OPTIMIZATION: Limit objects per rule to prevent timeout
  const MAX_OBJECTS_PER_RULE = 200;
  if (targetObjects.length > MAX_OBJECTS_PER_RULE) {
    // Prioritize objects that are more likely to breach threshold
    targetObjects = targetObjects
      .sort((a, b) => {
        // Sort by stockout risk for inventory rules
        if (a.stockout_risk_days !== undefined && b.stockout_risk_days !== undefined) {
          return (a.stockout_risk_days || 999) - (b.stockout_risk_days || 999);
        }
        return 0;
      })
      .slice(0, MAX_OBJECTS_PER_RULE);
    console.log(`Limited ${rule.rule_code} to ${MAX_OBJECTS_PER_RULE} priority objects`);
  }

  let alertsCreatedForRule = 0;
  const MAX_ALERTS_PER_RULE = 20; // Limit alerts per rule

  for (const obj of targetObjects) {
    if (alertsCreatedForRule >= MAX_ALERTS_PER_RULE) {
      console.log(`Rule ${rule.rule_code} hit max alerts limit (${MAX_ALERTS_PER_RULE})`);
      break;
    }

    try {
      // Calculate the metric value based on the rule's formula
      const calculatedValue = calculateMetricValue(rule, obj, additionalData);
      
      if (calculatedValue === null || calculatedValue === undefined) continue;

      // Check if threshold is breached
      const { isCritical, isWarning, breached } = checkThreshold(
        calculatedValue, 
        operator, 
        criticalThreshold, 
        warningThreshold
      );

      if (breached) {
        const severity = isCritical ? 'critical' : 'warning';
        const thresholdValue = isCritical ? criticalThreshold : warningThreshold;
        
        const alert = await createIntelligentAlert(supabase, tenantId, rule, obj, {
          severity,
          current_value: calculatedValue,
          threshold_value: thresholdValue,
          suggested_action: generateSuggestedAction(rule, obj, calculatedValue, severity),
          action_priority: severity === 'critical' ? 'urgent' : 'high',
          auto_action_available: false,
          calculation_details: {
            formula: rule.calculation_formula,
            operator,
            inputs: extractInputValues(rule, obj, additionalData),
            result: calculatedValue,
            threshold: thresholdValue,
          },
        });

        if (alert) {
          alerts.push(alert);
          alertsCreatedForRule++;
        }
      }
    } catch (e) {
      console.error(`Error calculating rule ${rule.rule_code} for object ${obj.object_name}:`, e);
    }
  }

  // Also process rules that don't need objects (system-wide metrics)
  if (targetObjects.length === 0 && isSystemWideRule(rule)) {
    const systemValue = calculateSystemMetric(rule, additionalData);
    if (systemValue !== null) {
      const { isCritical, isWarning, breached } = checkThreshold(
        systemValue, 
        operator, 
        criticalThreshold, 
        warningThreshold
      );

      if (breached) {
        const severity = isCritical ? 'critical' : 'warning';
        const alert = await createSystemAlert(supabase, tenantId, rule, systemValue, severity, additionalData);
        if (alert) alerts.push(alert);
      }
    }
  }

  return alerts;
}

function getTargetObjects(rule: IntelligentRule, objects: AlertObject[]): AlertObject[] {
  const category = rule.rule_category?.toLowerCase() || '';
  const code = rule.rule_code?.toLowerCase() || '';

  // Inventory-related rules target products
  if (category === 'inventory' || 
      code.includes('stock') || 
      code.includes('inventory') ||
      code.includes('dead_stock') ||
      code.includes('expiry') ||
      code.includes('reorder')) {
    return objects.filter(o => o.object_type === 'product');
  }

  // Store-related rules target stores
  if (category === 'operations' && 
      (code.includes('store') || code.includes('pos') || code.includes('conversion'))) {
    return objects.filter(o => o.object_type === 'store');
  }

  // Fulfillment rules may target orders (handled separately)
  if (category === 'fulfillment') {
    return objects.filter(o => o.object_type === 'order');
  }

  // Service-related rules may target stores or products
  if (category === 'service') {
    return objects.filter(o => ['store', 'product'].includes(o.object_type));
  }

  // Revenue rules target stores or are system-wide
  if (category === 'revenue') {
    return objects.filter(o => o.object_type === 'store');
  }

  return objects;
}

function calculateMetricValue(rule: IntelligentRule, obj: AlertObject, additionalData: any): number | null {
  const metrics = obj.current_metrics || {};
  const code = rule.rule_code?.toUpperCase() || '';
  const formula = rule.calculation_formula?.toLowerCase() || '';

  // Inventory metrics
  if (code.includes('STOCKOUT') || formula === 'days_of_stock' || formula === 'current_stock / avg_daily_sales') {
    return obj.days_of_stock ?? (metrics.calculated_dos ?? null);
  }

  if (code.includes('DEAD_STOCK') || formula.includes('last_sale_date')) {
    const lastSaleDate = obj.last_sale_date || metrics.last_sale_date;
    if (lastSaleDate) {
      return Math.floor((Date.now() - new Date(lastSaleDate).getTime()) / (24 * 60 * 60 * 1000));
    }
    return metrics.days_since_last_sale ?? null;
  }

  if (code.includes('OVERSTOCK') && !code.includes('STOCKOUT')) {
    return obj.days_of_stock ?? metrics.calculated_dos ?? null;
  }

  if (code.includes('NEGATIVE_STOCK') || formula === 'current_stock') {
    return metrics.total_stock ?? metrics.stock_quantity ?? null;
  }

  if (code.includes('REORDER_POINT') || formula.includes('reorder_point')) {
    const stock = metrics.total_stock ?? 0;
    const reorderPoint = obj.reorder_point ?? metrics.reorder_point ?? 10;
    return stock - reorderPoint;
  }

  if (code.includes('SLOW_MOVING') || code.includes('VELOCITY')) {
    const currentVelocity = obj.sales_velocity ?? metrics.sales_velocity ?? 0;
    const previousVelocity = metrics.previous_velocity ?? currentVelocity * 0.8;
    return previousVelocity > 0 ? ((currentVelocity - previousVelocity) / previousVelocity) * 100 : 0;
  }

  if (code.includes('SYNC_MISMATCH') || formula.includes('system_stock - platform_stock')) {
    const systemStock = metrics.system_stock ?? metrics.total_stock ?? 0;
    const platformStock = metrics.platform_stock ?? systemStock;
    return Math.abs(systemStock - platformStock);
  }

  if (code.includes('EXPIRY') || formula.includes('expiry_date')) {
    return metrics.days_to_expiry ?? metrics.days_until_expiry ?? null;
  }

  // Revenue metrics
  if (code.includes('REVENUE_DROP') || formula.includes('today - same_day_last_week')) {
    const current = metrics.daily_revenue ?? additionalData.aggregates?.todayRevenue ?? 0;
    const previous = metrics.last_week_revenue ?? additionalData.aggregates?.lastWeekRevenue ?? current;
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  if (code.includes('MARGIN') || formula.includes('selling_price - cost')) {
    return metrics.gross_margin ?? metrics.margin_percent ?? null;
  }

  if (code.includes('AOV') || formula.includes('aov')) {
    const currentAov = metrics.current_aov ?? 0;
    const previousAov = metrics.previous_aov ?? currentAov;
    return previousAov > 0 ? ((currentAov - previousAov) / previousAov) * 100 : 0;
  }

  if (code.includes('CASH_FLOW') || formula.includes('current_cash / avg_daily_expenses')) {
    return additionalData.aggregates?.cashCoverageDays ?? null;
  }

  // Fulfillment metrics
  if (code.includes('DELIVERY_DELAYED') || formula.includes('delivery_days - platform_sla_days')) {
    return metrics.days_over_sla ?? metrics.delivery_delay_days ?? null;
  }

  if (code.includes('NOT_SHIPPED') || formula.includes('order_confirmed_at')) {
    return metrics.hours_since_confirmed ?? null;
  }

  if (code.includes('RETURN_NOT_COLLECTED') || formula.includes('return_created_at')) {
    return metrics.days_since_return ?? null;
  }

  if (code.includes('SURGE') || formula.includes('warehouse_capacity')) {
    const current = metrics.orders_per_hour ?? 0;
    const capacity = metrics.warehouse_capacity ?? current;
    return capacity > 0 ? (current / capacity) * 100 : 0;
  }

  if (code.includes('SHIPPING_COST') || code.includes('CARRIER')) {
    return metrics.shipping_cost_change ?? metrics.carrier_delay_rate ?? null;
  }

  if (code.includes('COD_NOT_RECEIVED')) {
    return metrics.days_since_delivered ?? null;
  }

  if (code.includes('FAILED_DELIVERY')) {
    return metrics.failed_delivery_rate ?? null;
  }

  // Service metrics
  if (code.includes('NEGATIVE_REVIEW') || code.includes('REVIEW')) {
    return metrics.negative_review_change ?? null;
  }

  if (code.includes('RESPONSE_TIME')) {
    return metrics.avg_response_minutes ?? null;
  }

  if (code.includes('COMPLAINT')) {
    return metrics.hours_since_opened ?? null;
  }

  if (code.includes('REFUND_RATE')) {
    return metrics.refund_rate ?? null;
  }

  if (code.includes('QUALITY_ISSUE')) {
    return metrics.quality_complaints_count ?? null;
  }

  if (code.includes('STORE_RATING')) {
    return metrics.store_rating ?? null;
  }

  if (code.includes('PENALTY')) {
    return metrics.active_penalty_count ?? null;
  }

  // Operations metrics
  if (code.includes('API_SYNC') || formula.includes('last_successful_sync')) {
    return metrics.minutes_since_last_sync ?? null;
  }

  if (code.includes('FLASH_SALE')) {
    const remaining = metrics.flash_sale_remaining ?? 0;
    const initial = metrics.flash_sale_initial ?? remaining;
    return initial > 0 ? (remaining / initial) * 100 : 100;
  }

  if (code.includes('LISTING_DEACTIVATED')) {
    return metrics.deactivated_listings_count ?? null;
  }

  if (code.includes('CAMPAIGN_ENDING')) {
    return metrics.hours_to_campaign_end ?? null;
  }

  if (code.includes('CART_ABANDON')) {
    return metrics.cart_abandon_rate ?? null;
  }

  if (code.includes('CHECKOUT_FAILURE')) {
    return metrics.checkout_failure_rate ?? null;
  }

  if (code.includes('TRAFFIC')) {
    const current = metrics.current_traffic ?? 0;
    const avg = metrics.avg_traffic ?? current;
    return avg > 0 ? (current / avg) * 100 : 100;
  }

  if (code.includes('PAGE_LOAD')) {
    return metrics.page_load_time ?? null;
  }

  if (code.includes('STORE_NO_SALES') || code.includes('WITHOUT_SALE')) {
    return metrics.hours_without_sale ?? metrics.hours_since_last_sale ?? null;
  }

  if (code.includes('POS_OFFLINE')) {
    return metrics.minutes_offline ?? null;
  }

  if (code.includes('CASH_DISCREPANCY')) {
    return metrics.cash_difference_amount ?? null;
  }

  if (code.includes('STAFF_OVERTIME')) {
    return metrics.overtime_hours ?? null;
  }

  if (code.includes('DISCOUNT_ABUSE') || code.includes('VOUCHER')) {
    return metrics.voucher_usage_count ?? null;
  }

  if (code.includes('PROMOTION_OVERSPEND')) {
    const actual = metrics.promotion_actual ?? 0;
    const budget = metrics.promotion_budget ?? actual;
    return budget > 0 ? (actual / budget) * 100 : 0;
  }

  if (code.includes('PLATFORM_FEE')) {
    return metrics.platform_fee_change ?? null;
  }

  if (code.includes('CHANNEL_REVENUE_IMBALANCE')) {
    return metrics.channel_revenue_share ?? null;
  }

  if (code.includes('CONVERSION')) {
    const footfall = metrics.footfall ?? 0;
    const transactions = metrics.transactions ?? 0;
    return footfall > 0 ? (transactions / footfall) * 100 : 0;
  }

  // Generic fallback - try to find metric by name
  const metricKey = rule.threshold_config?.metric;
  if (metricKey && metrics[metricKey] !== undefined) {
    return metrics[metricKey];
  }

  return null;
}

function isSystemWideRule(rule: IntelligentRule): boolean {
  const code = rule.rule_code?.toUpperCase() || '';
  return code.includes('CASH_FLOW') || 
         code.includes('SYSTEM_WIDE') ||
         code.includes('CHANNEL_IMBALANCE');
}

function calculateSystemMetric(rule: IntelligentRule, additionalData: any): number | null {
  const code = rule.rule_code?.toUpperCase() || '';
  
  if (code.includes('CASH_FLOW') || code.includes('CASH_COVERAGE')) {
    return additionalData.aggregates?.cashCoverageDays ?? null;
  }
  
  return null;
}

function checkThreshold(
  value: number, 
  operator: string, 
  critical: number | null, 
  warning: number | null
): { isCritical: boolean; isWarning: boolean; breached: boolean } {
  let isCritical = false;
  let isWarning = false;

  switch (operator) {
    case 'less_than':
    case 'less_than_or_equal':
      if (critical !== null && value <= critical) isCritical = true;
      else if (warning !== null && value <= warning) isWarning = true;
      break;
    case 'greater_than':
    case 'greater_than_or_equal':
      if (critical !== null && value >= critical) isCritical = true;
      else if (warning !== null && value >= warning) isWarning = true;
      break;
    case 'change_decrease':
      // For decrease, we expect negative values
      if (critical !== null && value <= critical) isCritical = true;
      else if (warning !== null && value <= warning) isWarning = true;
      break;
    case 'change_increase':
      // For increase, we expect positive values
      if (critical !== null && value >= critical) isCritical = true;
      else if (warning !== null && value >= warning) isWarning = true;
      break;
    case 'equals':
      if (critical !== null && value === critical) isCritical = true;
      else if (warning !== null && value === warning) isWarning = true;
      break;
    default:
      // Default to greater_than behavior
      if (critical !== null && value >= critical) isCritical = true;
      else if (warning !== null && value >= warning) isWarning = true;
  }

  return { isCritical, isWarning, breached: isCritical || isWarning };
}

function extractInputValues(rule: IntelligentRule, obj: AlertObject, additionalData: any): any {
  const metrics = obj.current_metrics || {};
  return {
    object_name: obj.object_name,
    object_type: obj.object_type,
    total_stock: metrics.total_stock,
    sales_velocity: obj.sales_velocity,
    days_of_stock: obj.days_of_stock,
    trend_percent: obj.trend_percent,
    reorder_point: obj.reorder_point,
    ...metrics,
  };
}

function generateSuggestedAction(rule: IntelligentRule, obj: AlertObject, value: number, severity: string): string {
  const emoji = severity === 'critical' ? '🚨' : '⚠️';
  const config = rule.threshold_config || {};
  const unit = config.unit || '';
  const actions = rule.suggested_actions || [];

  // Use the first suggested action if available
  if (actions.length > 0) {
    return `${emoji} ${obj.object_name}: ${actions[0]} (Hiện tại: ${formatValue(value, unit)})`;
  }

  // Generate based on rule code
  const code = rule.rule_code?.toUpperCase() || '';
  
  if (code.includes('STOCKOUT')) {
    return `${emoji} ${obj.object_name}: Chỉ còn ${Math.round(value)} ngày tồn kho. Đặt hàng ngay!`;
  }
  if (code.includes('DEAD_STOCK')) {
    return `${emoji} ${obj.object_name}: Không bán được ${Math.round(value)} ngày. Xem xét giảm giá hoặc thanh lý.`;
  }
  if (code.includes('OVERSTOCK')) {
    return `${emoji} ${obj.object_name}: Tồn kho ${Math.round(value)} ngày. Giảm giá hoặc điều chuyển sang kênh khác.`;
  }
  if (code.includes('REVENUE_DROP')) {
    return `${emoji} ${obj.object_name}: Doanh thu giảm ${Math.abs(Math.round(value))}%. Kiểm tra traffic và promotion.`;
  }
  if (code.includes('DELIVERY_DELAYED')) {
    return `${emoji} ${obj.object_name}: Giao trễ ${Math.round(value)} ngày so với SLA. Liên hệ ĐVVC ngay.`;
  }

  return `${emoji} ${obj.object_name}: ${rule.rule_name} - ${formatValue(value, unit)}`;
}

function formatValue(value: number, unit: string): string {
  const rounded = Math.round(value * 100) / 100;
  switch (unit) {
    case 'percent':
    case 'percentage':
    case 'percentage_points':
      return `${rounded}%`;
    case 'days':
      return `${rounded} ngày`;
    case 'hours':
      return `${rounded} giờ`;
    case 'minutes':
      return `${rounded} phút`;
    case 'seconds':
      return `${rounded} giây`;
    case 'items':
    case 'products':
      return `${rounded} sản phẩm`;
    case 'VND':
      return `${rounded.toLocaleString()} VND`;
    case 'stars':
      return `${rounded} sao`;
    default:
      return `${rounded} ${unit}`;
  }
}

async function createIntelligentAlert(
  supabase: any,
  tenantId: string,
  rule: IntelligentRule,
  object: AlertObject,
  details: {
    severity: string;
    current_value: number;
    threshold_value: number | null;
    suggested_action: string;
    action_priority: string;
    auto_action_available?: boolean;
    calculation_details: any;
  }
): Promise<any> {
  const emoji = details.severity === 'critical' ? '🚨' : details.severity === 'warning' ? '⚠️' : '💡';
  
  const alertData = {
    tenant_id: tenantId,
    alert_type: rule.rule_code,
    category: rule.rule_category,
    severity: details.severity,
    title: `${emoji} ${rule.rule_name}: ${object.object_name}`,
    message: details.suggested_action,
    object_type: object.object_type,
    object_name: object.object_name,
    alert_object_id: object.id,
    external_object_id: object.external_id,
    metric_name: rule.calculation_formula,
    current_value: details.current_value,
    threshold_value: details.threshold_value,
    status: 'active',
    priority: rule.priority || (details.severity === 'critical' ? 1 : 2),
    notification_sent: false,
    suggested_action: details.suggested_action,
    action_priority: details.action_priority,
    auto_action_available: details.auto_action_available ?? false,
    calculation_details: details.calculation_details,
    metadata: {
      rule_id: rule.id,
      detected_at: new Date().toISOString(),
      suggested_actions: rule.suggested_actions,
      applicable_channels: rule.applicable_channels,
    },
  };

  // Check for existing non-resolved alert
  const { data: existing } = await supabase
    .from('alert_instances')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('alert_type', rule.rule_code)
    .eq('external_object_id', object.external_id)
    .neq('status', 'resolved')
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from('alert_instances')
      .insert(alertData);

    if (error) {
      console.error('Insert intelligent alert error:', error);
    } else {
      console.log(`Created intelligent alert: ${alertData.title}`);
      
      // Log calculation
      await supabase.from('alert_calculations_log').insert({
        tenant_id: tenantId,
        rule_id: rule.id,
        object_id: object.id,
        calculation_type: rule.calculation_formula || rule.rule_code,
        input_values: details.calculation_details.inputs || {},
        output_value: details.current_value,
        threshold_value: details.threshold_value,
        is_triggered: true,
      });
    }
    return alertData;
  }
  return null;
}

async function createSystemAlert(
  supabase: any,
  tenantId: string,
  rule: IntelligentRule,
  value: number,
  severity: string,
  additionalData: any
): Promise<any> {
  const emoji = severity === 'critical' ? '🚨' : '⚠️';
  const config = rule.threshold_config || {};
  const unit = config.unit || '';
  
  const alertData = {
    tenant_id: tenantId,
    alert_type: rule.rule_code,
    category: rule.rule_category,
    severity: severity,
    title: `${emoji} ${rule.rule_name}`,
    message: `${rule.description || rule.rule_name}: ${formatValue(value, unit)}`,
    metric_name: rule.calculation_formula,
    current_value: value,
    threshold_value: severity === 'critical' ? config.critical : config.warning,
    status: 'active',
    priority: severity === 'critical' ? 1 : 2,
    notification_sent: false,
    suggested_action: rule.suggested_actions?.[0] || 'Kiểm tra và xử lý ngay',
    action_priority: severity === 'critical' ? 'urgent' : 'high',
    calculation_details: {
      formula: rule.calculation_formula,
      inputs: additionalData.aggregates,
      result: value,
    },
    metadata: {
      rule_id: rule.id,
      detected_at: new Date().toISOString(),
      suggested_actions: rule.suggested_actions,
    },
  };

  const { data: existing } = await supabase
    .from('alert_instances')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('alert_type', rule.rule_code)
    .neq('status', 'resolved')
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from('alert_instances')
      .insert(alertData);

    if (error) {
      console.error('Insert system alert error:', error);
      return null;
    }
    console.log(`Created system alert: ${alertData.title}`);
    return alertData;
  }
  return null;
}

// ============= BASIC ALERT DETECTION =============

async function detectAlertsForConfig(
  supabase: any,
  tenantId: string,
  config: AlertConfig,
  objects: AlertObject[]
): Promise<any[]> {
  const alerts: any[] = [];

  switch (config.alert_type) {
    case 'inventory_low':
      for (const product of objects.filter(o => o.object_type === 'product')) {
        const stock = product.current_metrics?.total_stock ?? 0;
        const threshold = config.threshold_value ?? 10;

        if (stock < threshold && stock > 0) {
          alerts.push(await insertBasicAlert(supabase, tenantId, config, product, {
            metric_name: 'stock_quantity',
            current_value: stock,
            threshold_value: threshold,
            message: `Tồn kho ${product.object_name} chỉ còn ${stock}`,
          }));
        }
      }
      break;

    case 'inventory_expired':
      for (const product of objects.filter(o => o.object_type === 'product')) {
        const daysUntilExpiry = product.current_metrics?.days_until_expiry;
        const threshold = config.threshold_value ?? 30;

        if (daysUntilExpiry !== undefined && daysUntilExpiry < threshold) {
          alerts.push(await insertBasicAlert(supabase, tenantId, config, product, {
            metric_name: 'days_until_expiry',
            current_value: daysUntilExpiry,
            threshold_value: threshold,
            message: `${product.object_name}: ${product.current_metrics?.total_stock || 0} sp hết hạn trong ${daysUntilExpiry} ngày`,
          }));
        }
      }
      break;

    case 'sales_drop':
    case 'sales_target_miss':
      for (const store of objects.filter(o => o.object_type === 'store')) {
        const metrics = store.current_metrics || {};
        const revenue = metrics.daily_revenue ?? 0;
        const target = metrics.target_revenue ?? 0;

        if (target > 0) {
          const progress = (revenue / target) * 100;
          const threshold = config.threshold_value ?? 80;

          if (progress < threshold) {
            const changePercent = Math.round(progress - 100);
            alerts.push(await insertBasicAlert(supabase, tenantId, config, store, {
              metric_name: 'target_progress',
              current_value: revenue,
              threshold_value: target * (threshold / 100),
              change_percent: changePercent,
              message: `${store.object_name}: Đạt ${progress.toFixed(0)}% target`,
            }));
          }
        }
      }
      break;

    case 'store_no_sales':
      for (const store of objects.filter(o => o.object_type === 'store')) {
        const metrics = store.current_metrics || {};
        const hoursSinceLastSale = metrics.hours_since_last_sale ?? 0;
        const threshold = config.threshold_value ?? 4;

        if (hoursSinceLastSale > threshold) {
          alerts.push(await insertBasicAlert(supabase, tenantId, config, store, {
            metric_name: 'hours_since_last_sale',
            current_value: hoursSinceLastSale,
            threshold_value: threshold,
            message: `${store.object_name}: ${hoursSinceLastSale}h không có đơn hàng`,
          }));
        }
      }
      break;
  }

  return alerts.filter(a => a !== null);
}

async function insertBasicAlert(
  supabase: any,
  tenantId: string,
  config: AlertConfig,
  object: AlertObject,
  details: {
    metric_name: string;
    current_value: number;
    threshold_value: number;
    message: string;
    change_percent?: number;
  }
) {
  const emoji = config.severity === 'critical' ? '🚨' : config.severity === 'warning' ? '⚠️' : 'ℹ️';

  const alertData = {
    tenant_id: tenantId,
    alert_config_id: config.id,
    alert_object_id: object.id,
    alert_type: config.alert_type,
    category: config.category,
    severity: config.severity,
    title: `${emoji} ${config.title}: ${object.object_name}`,
    message: details.message,
    object_type: object.object_type,
    object_name: object.object_name,
    external_object_id: object.external_id,
    metric_name: details.metric_name,
    current_value: details.current_value,
    threshold_value: details.threshold_value,
    threshold_operator: config.threshold_operator || 'less_than',
    change_percent: details.change_percent || null,
    status: 'active',
    priority: config.severity === 'critical' ? 1 : config.severity === 'warning' ? 2 : 3,
    notification_sent: false,
  };

  const { data: existing } = await supabase
    .from('alert_instances')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('alert_type', config.alert_type)
    .eq('external_object_id', object.external_id)
    .neq('status', 'resolved')
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from('alert_instances')
      .insert(alertData);

    if (error) {
      console.error('Insert basic alert error:', error);
      return null;
    }
    console.log(`Created basic alert: ${alertData.title}`);
    return alertData;
  }
  return null;
}

// ============= CROSS-OBJECT DETECTION =============

async function runCrossObjectDetection(
  supabase: any, 
  tenantId: string, 
  objects: AlertObject[],
  additionalData: any
): Promise<number> {
  let alertsCreated = 0;

  // 1. Multi-product stockout risk
  const productsNearReorder = objects.filter(o => 
    o.object_type === 'product' && 
    (o.stockout_risk_days || 0) <= 3 &&
    (o.current_metrics?.total_stock || 0) > 0
  );

  if (productsNearReorder.length >= 3) {
    const { data: existing } = await supabase
      .from('alert_instances')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('alert_type', 'multi_product_stockout_risk')
      .neq('status', 'resolved')
      .maybeSingle();

    if (!existing) {
      await supabase.from('alert_instances').insert({
        tenant_id: tenantId,
        alert_type: 'multi_product_stockout_risk',
        category: 'inventory',
        severity: 'critical',
        title: `🚨 ${productsNearReorder.length} sản phẩm sắp hết hàng trong 3 ngày`,
        message: `Các sản phẩm: ${productsNearReorder.slice(0, 5).map(p => p.object_name).join(', ')}${productsNearReorder.length > 5 ? '...' : ''}`,
        suggested_action: 'Tạo đơn đặt hàng gấp cho các sản phẩm này',
        action_priority: 'urgent',
        auto_action_available: true,
        metric_name: 'products_at_risk',
        current_value: productsNearReorder.length,
        threshold_value: 3,
        status: 'active',
        priority: 1,
        notification_sent: false,
        calculation_details: {
          products: productsNearReorder.map(p => ({
            name: p.object_name,
            dos: p.days_of_stock,
            stock: p.current_metrics?.total_stock,
          })),
        },
      });
      alertsCreated++;
    }
  }

  // 2. System-wide performance drop
  const stores = objects.filter(o => o.object_type === 'store');
  const underperformingStores = stores.filter(s => {
    const metrics = s.current_metrics || {};
    const progress = metrics.target_revenue > 0 
      ? (metrics.daily_revenue / metrics.target_revenue) * 100 
      : 100;
    return progress < 60;
  });

  if (underperformingStores.length > stores.length / 2 && stores.length > 0) {
    const { data: existing } = await supabase
      .from('alert_instances')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('alert_type', 'system_wide_performance_drop')
      .neq('status', 'resolved')
      .maybeSingle();

    if (!existing) {
      await supabase.from('alert_instances').insert({
        tenant_id: tenantId,
        alert_type: 'system_wide_performance_drop',
        category: 'revenue',
        severity: 'critical',
        title: `🚨 ${underperformingStores.length}/${stores.length} chi nhánh dưới 60% target`,
        message: 'Có thể có vấn đề hệ thống: nguồn cung, giá, cạnh tranh hoặc seasonal impact',
        suggested_action: 'Review ngay: promotions, competitor activity, supply chain issues',
        action_priority: 'urgent',
        metric_name: 'underperforming_ratio',
        current_value: (underperformingStores.length / stores.length) * 100,
        threshold_value: 50,
        status: 'active',
        priority: 1,
        notification_sent: false,
        calculation_details: {
          underperforming_stores: underperformingStores.map(s => s.object_name),
          total_stores: stores.length,
        },
      });
      alertsCreated++;
    }
  }

  // 3. Cash Flow Projection Alert
  const { totalCash, totalDue, cashCoverageDays } = additionalData.aggregates;

  if (cashCoverageDays < 7) {
    const { data: existing } = await supabase
      .from('alert_instances')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('alert_type', 'cash_coverage_warning')
      .neq('status', 'resolved')
      .maybeSingle();

    if (!existing && totalDue > 0) {
      const coverageRatio = (totalCash / totalDue) * 100;
      await supabase.from('alert_instances').insert({
        tenant_id: tenantId,
        alert_type: 'cash_coverage_warning',
        category: 'revenue',
        severity: coverageRatio < 100 ? 'critical' : 'warning',
        title: coverageRatio < 100 
          ? '🚨 Không đủ tiền thanh toán 14 ngày tới'
          : '⚠️ Tiền mặt chỉ đủ thanh toán sát sao',
        message: `Cash: ${(totalCash/1000000).toFixed(1)}M. Phải trả: ${(totalDue/1000000).toFixed(1)}M. Coverage: ${coverageRatio.toFixed(0)}%`,
        suggested_action: coverageRatio < 100 
          ? 'Thu hồi công nợ khẩn cấp hoặc đàm phán giãn nợ NCC'
          : 'Theo dõi sát dòng tiền, chuẩn bị phương án dự phòng',
        action_priority: coverageRatio < 100 ? 'urgent' : 'high',
        metric_name: 'cash_coverage_ratio',
        current_value: coverageRatio,
        threshold_value: 120,
        status: 'active',
        priority: coverageRatio < 100 ? 1 : 2,
        notification_sent: false,
        calculation_details: {
          total_cash: totalCash,
          total_due: totalDue,
          coverage_ratio: coverageRatio,
          coverage_days: cashCoverageDays,
        },
      });
      alertsCreated++;
    }
  }

  // 4. Dead stock accumulation
  const deadStockProducts = objects.filter(o => {
    if (o.object_type !== 'product') return false;
    const daysSinceLastSale = o.current_metrics?.days_since_last_sale ?? 0;
    return daysSinceLastSale >= 30 && (o.current_metrics?.total_stock || 0) > 0;
  });

  if (deadStockProducts.length >= 5) {
    const { data: existing } = await supabase
      .from('alert_instances')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('alert_type', 'dead_stock_accumulation')
      .neq('status', 'resolved')
      .maybeSingle();

    if (!existing) {
      const totalValue = deadStockProducts.reduce((sum, p) => {
        const stock = p.current_metrics?.total_stock || 0;
        const cost = p.current_metrics?.unit_cost || 0;
        return sum + (stock * cost);
      }, 0);

      await supabase.from('alert_instances').insert({
        tenant_id: tenantId,
        alert_type: 'dead_stock_accumulation',
        category: 'inventory',
        severity: 'warning',
        title: `⚠️ ${deadStockProducts.length} SKU không bán được ≥30 ngày`,
        message: `Tổng giá trị tồn: ${(totalValue/1000000).toFixed(1)}M. Xem xét khuyến mãi hoặc thanh lý.`,
        suggested_action: 'Tạo chương trình khuyến mãi, bundle hoặc thanh lý cho các SKU này',
        action_priority: 'medium',
        auto_action_available: true,
        metric_name: 'dead_stock_count',
        current_value: deadStockProducts.length,
        threshold_value: 5,
        status: 'active',
        priority: 2,
        notification_sent: false,
        calculation_details: {
          products: deadStockProducts.slice(0, 10).map(p => ({
            name: p.object_name,
            days_without_sale: p.current_metrics?.days_since_last_sale,
            stock: p.current_metrics?.total_stock,
          })),
          total_value: totalValue,
        },
      });
      alertsCreated++;
    }
  }

  return alertsCreated;
}
