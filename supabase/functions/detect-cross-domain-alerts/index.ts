import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrossDomainRule {
  id: string;
  tenant_id: string;
  rule_name: string;
  rule_code: string;
  conditions: Array<{
    metric: string;
    operator: string;
    value: number;
    period?: string;
  }>;
  condition_logic: 'AND' | 'OR';
  impact_formula: string;
  alert_title_template: string;
  alert_message_template: string;
  suggested_action: string;
  severity: string;
}

interface MetricData {
  [key: string]: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { tenant_id } = await req.json();
    
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CrossDomain] Starting detection for tenant: ${tenant_id}`);

    // Get enabled cross-domain rules
    const { data: rules, error: rulesError } = await supabase
      .from('cross_domain_alert_rules')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_enabled', true);

    if (rulesError) {
      console.error('[CrossDomain] Error fetching rules:', rulesError);
      throw rulesError;
    }

    // If no custom rules, use default rules
    const activeRules: CrossDomainRule[] = rules?.length > 0 ? rules : getDefaultRules(tenant_id);
    
    console.log(`[CrossDomain] Processing ${activeRules.length} rules`);

    // Fetch metrics data for analysis
    const metrics = await fetchMetricsData(supabase, tenant_id);
    console.log('[CrossDomain] Fetched metrics:', Object.keys(metrics));

    const triggeredAlerts: any[] = [];

    for (const rule of activeRules) {
      const isTriggered = evaluateRule(rule, metrics);
      
      if (isTriggered) {
        console.log(`[CrossDomain] Rule triggered: ${rule.rule_code}`);
        
        const impact = calculateImpact(rule, metrics);
        const alert = await createCrossDomainAlert(supabase, tenant_id, rule, metrics, impact);
        
        if (alert) {
          triggeredAlerts.push(alert);
        }
      }
    }

    // Update last_checked_at for processed rules
    if (rules?.length) {
      await supabase
        .from('cross_domain_alert_rules')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('tenant_id', tenant_id)
        .eq('is_enabled', true);
    }

    console.log(`[CrossDomain] Completed. Triggered ${triggeredAlerts.length} alerts`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        triggered: triggeredAlerts.length,
        alerts: triggeredAlerts 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CrossDomain] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getDefaultRules(tenantId: string): CrossDomainRule[] {
  return [
    {
      id: 'default-1',
      tenant_id: tenantId,
      rule_name: 'Ads tăng nhưng Margin giảm',
      rule_code: 'ads_up_margin_down',
      conditions: [
        { metric: 'ads_spend_change_pct', operator: '>', value: 15 },
        { metric: 'contribution_margin_change_pct', operator: '<', value: -5 }
      ],
      condition_logic: 'AND',
      impact_formula: 'ads_spend_7d * 0.3',
      alert_title_template: '🔥 Chi phí Ads tăng {ads_spend_change_pct}% nhưng Margin giảm {contribution_margin_change_pct}%',
      alert_message_template: 'Chi tiêu quảng cáo tăng mạnh nhưng không mang lại hiệu quả. Contribution margin đang giảm, có thể do đang quảng cáo sản phẩm margin thấp hoặc CAC tăng cao.',
      suggested_action: 'Review lại campaigns, pause các ads có ROAS < 2, focus vào high-margin SKUs',
      severity: 'critical'
    },
    {
      id: 'default-2',
      tenant_id: tenantId,
      rule_name: 'Revenue tăng nhưng Cash giảm',
      rule_code: 'revenue_up_cash_down',
      conditions: [
        { metric: 'revenue_change_pct', operator: '>', value: 10 },
        { metric: 'cash_inflow_change_pct', operator: '<', value: -10 }
      ],
      condition_logic: 'AND',
      impact_formula: 'ar_outstanding * 0.1',
      alert_title_template: '💰 Doanh thu tăng {revenue_change_pct}% nhưng tiền thu về giảm {cash_inflow_change_pct}%',
      alert_message_template: 'Doanh số tốt nhưng dòng tiền thu về đang chậm lại. Có thể do AR tăng, platform settlement delay, hoặc khách COD không nhận hàng.',
      suggested_action: 'Check AR aging, liên hệ platform về settlement, review tỷ lệ COD fail',
      severity: 'warning'
    },
    {
      id: 'default-3',
      tenant_id: tenantId,
      rule_name: 'Inventory tăng + Sales chậm',
      rule_code: 'inventory_up_sales_down',
      conditions: [
        { metric: 'inventory_value_change_pct', operator: '>', value: 20 },
        { metric: 'sales_velocity_change_pct', operator: '<', value: -10 }
      ],
      condition_logic: 'AND',
      impact_formula: 'excess_inventory_value',
      alert_title_template: '📦 Tồn kho tăng {inventory_value_change_pct}% nhưng tốc độ bán giảm {sales_velocity_change_pct}%',
      alert_message_template: 'Vốn đang bị khóa trong hàng tồn kho. Inventory value tăng trong khi sales velocity giảm - risk hàng tồn lâu, cash flow bị ảnh hưởng.',
      suggested_action: 'Chạy flash sale cho slow-moving SKUs, pause PO mới, review min-stock levels',
      severity: 'critical'
    },
    {
      id: 'default-4',
      tenant_id: tenantId,
      rule_name: 'Orders delay + Potential churn',
      rule_code: 'ops_delay_churn_risk',
      conditions: [
        { metric: 'order_delay_rate', operator: '>', value: 15 },
        { metric: 'negative_review_rate', operator: '>', value: 5 }
      ],
      condition_logic: 'AND',
      impact_formula: 'delayed_orders_value * 0.2',
      alert_title_template: '🚚 Tỷ lệ delay {order_delay_rate}% + Review tiêu cực {negative_review_rate}%',
      alert_message_template: 'Ops đang có vấn đề nghiêm trọng. Tỷ lệ delay cao kết hợp với review tiêu cực tăng - nguy cơ mất khách và bị phạt bởi platform.',
      suggested_action: 'Kiểm tra fulfillment capacity, review carrier performance, escalate tới ops manager',
      severity: 'critical'
    },
    {
      id: 'default-5',
      tenant_id: tenantId,
      rule_name: 'High return rate + Low margin',
      rule_code: 'returns_high_margin_low',
      conditions: [
        { metric: 'return_rate', operator: '>', value: 10 },
        { metric: 'gross_margin', operator: '<', value: 15 }
      ],
      condition_logic: 'AND',
      impact_formula: 'return_value * 1.5',
      alert_title_template: '↩️ Tỷ lệ hoàn {return_rate}% cao + Margin chỉ {gross_margin}%',
      alert_message_template: 'Chi phí xử lý hoàn hàng đang ăn mòn lợi nhuận. Với margin thấp và return rate cao, nhiều đơn hàng thực tế đang lỗ.',
      suggested_action: 'Review top returned SKUs, cải thiện product description/images, tăng giá hoặc ngừng bán low-margin high-return items',
      severity: 'warning'
    }
  ];
}

async function fetchMetricsData(supabase: any, tenantId: string): Promise<MetricData> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  // Fetch various metrics in parallel
  const [
    ordersRecent,
    ordersPrevious,
    channelPL,
    inventory,
    bankAccounts,
    arData
  ] = await Promise.all([
    // Recent 7 days orders (SSOT: cdp_orders)
    supabase
      .from('cdp_orders')
      .select('gross_revenue, order_at')
      .eq('tenant_id', tenantId)
      .gte('order_at', sevenDaysAgo.toISOString())
      .lt('order_at', now.toISOString()),
    
    // Previous 7 days orders (for comparison)
    supabase
      .from('cdp_orders')
      .select('gross_revenue, order_at')
      .eq('tenant_id', tenantId)
      .gte('order_at', fourteenDaysAgo.toISOString())
      .lt('order_at', sevenDaysAgo.toISOString()),
    
    // Channel P&L for margin data
    supabase
      .from('channel_pl_monthly')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('period', { ascending: false })
      .limit(2),
    
    // Inventory data
    supabase
      .from('alert_objects')
      .select('current_metrics, object_type')
      .eq('tenant_id', tenantId)
      .eq('object_type', 'product'),
    
    // Cash position
    supabase
      .from('bank_accounts')
      .select('current_balance')
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
    
    // AR data
    supabase
      .from('invoices')
      .select('total_amount, status, due_date')
      .eq('tenant_id', tenantId)
      .in('status', ['sent', 'overdue'])
  ]);

  // Calculate metrics
  const recentRevenue = ordersRecent.data?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;
  const previousRevenue = ordersPrevious.data?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;
  const revenueChange = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  // Delayed orders
  const delayedOrders = ordersRecent.data?.filter((o: any) => 
    o.shipping_status === 'delayed' || o.shipping_status === 'failed'
  ) || [];
  const orderDelayRate = ordersRecent.data?.length > 0 
    ? (delayedOrders.length / ordersRecent.data.length) * 100 
    : 0;

  // Channel P&L metrics
  const currentPL = channelPL.data?.[0];
  const previousPL = channelPL.data?.[1];
  
  const adsSpend7d = currentPL?.ads_cost || 0;
  const adsSpendPrev = previousPL?.ads_cost || 0;
  const adsSpendChange = adsSpendPrev > 0 ? ((adsSpend7d - adsSpendPrev) / adsSpendPrev) * 100 : 0;

  const currentMargin = currentPL?.margin_percent || 0;
  const previousMargin = previousPL?.margin_percent || 0;
  const marginChange = previousMargin > 0 ? ((currentMargin - previousMargin) / previousMargin) * 100 : currentMargin - previousMargin;

  // Inventory value
  const inventoryValue = inventory.data?.reduce((sum: number, item: any) => {
    const metrics = item.current_metrics || {};
    return sum + (metrics.stock_value || 0);
  }, 0) || 0;

  // Cash and AR
  const cashBalance = bankAccounts.data?.reduce((sum: number, a: any) => sum + (a.current_balance || 0), 0) || 0;
  const arOutstanding = arData.data?.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) || 0;

  return {
    // Revenue metrics
    revenue_7d: recentRevenue,
    revenue_prev_7d: previousRevenue,
    revenue_change_pct: Math.round(revenueChange * 10) / 10,
    
    // Ads metrics
    ads_spend_7d: adsSpend7d,
    ads_spend_change_pct: Math.round(adsSpendChange * 10) / 10,
    
    // Margin metrics
    contribution_margin: currentMargin,
    contribution_margin_change_pct: Math.round(marginChange * 10) / 10,
    gross_margin: currentMargin,
    
    // Cash metrics
    cash_balance: cashBalance,
    cash_inflow_change_pct: revenueChange, // Simplified, should calc from bank transactions
    ar_outstanding: arOutstanding,
    
    // Inventory metrics
    inventory_value: inventoryValue,
    inventory_value_change_pct: 0, // Would need historical data
    sales_velocity_change_pct: revenueChange,
    excess_inventory_value: inventoryValue * 0.2, // Estimate 20% as excess
    
    // Ops metrics
    order_delay_rate: Math.round(orderDelayRate * 10) / 10,
    delayed_orders_value: delayedOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0),
    negative_review_rate: 0, // Would need review data
    
    // Returns
    return_rate: 0, // Would need return data
    return_value: 0,
  };
}

function evaluateRule(rule: CrossDomainRule, metrics: MetricData): boolean {
  const results = rule.conditions.map(condition => {
    const metricValue = metrics[condition.metric] ?? 0;
    
    switch (condition.operator) {
      case '>': return metricValue > condition.value;
      case '<': return metricValue < condition.value;
      case '>=': return metricValue >= condition.value;
      case '<=': return metricValue <= condition.value;
      case '==': return metricValue === condition.value;
      case '!=': return metricValue !== condition.value;
      default: return false;
    }
  });

  if (rule.condition_logic === 'AND') {
    return results.every(r => r);
  } else {
    return results.some(r => r);
  }
}

function calculateImpact(rule: CrossDomainRule, metrics: MetricData): number {
  if (!rule.impact_formula) return 0;
  
  try {
    // Simple formula evaluation - replace metric names with values
    let formula = rule.impact_formula;
    for (const [key, value] of Object.entries(metrics)) {
      formula = formula.replace(new RegExp(key, 'g'), String(value));
    }
    
    // Evaluate simple math (only basic operations for security)
    const result = Function(`"use strict"; return (${formula})`)();
    return typeof result === 'number' && !isNaN(result) ? Math.round(result) : 0;
  } catch (e) {
    console.error('[CrossDomain] Error calculating impact:', e);
    return 0;
  }
}

function interpolateTemplate(template: string, metrics: MetricData): string {
  let result = template;
  for (const [key, value] of Object.entries(metrics)) {
    const formatted = typeof value === 'number' 
      ? (Math.abs(value) >= 1000000 
          ? `${(value / 1000000).toFixed(1)}M` 
          : Math.abs(value) >= 1000 
            ? `${(value / 1000).toFixed(0)}K`
            : value.toFixed(1))
      : String(value);
    result = result.replace(new RegExp(`{${key}}`, 'g'), formatted);
  }
  return result;
}

async function createCrossDomainAlert(
  supabase: any, 
  tenantId: string, 
  rule: CrossDomainRule, 
  metrics: MetricData,
  impact: number
): Promise<any> {
  // Check for recent similar alerts (cooldown)
  const cooldownMinutes = 1440; // 24 hours
  const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000);
  
  const { data: existingAlerts } = await supabase
    .from('alert_instances')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('alert_type', `cross_domain_${rule.rule_code}`)
    .gte('created_at', cooldownTime.toISOString())
    .limit(1);

  if (existingAlerts?.length > 0) {
    console.log(`[CrossDomain] Skipping ${rule.rule_code} - cooldown active`);
    return null;
  }

  const title = interpolateTemplate(rule.alert_title_template, metrics);
  const message = interpolateTemplate(rule.alert_message_template, metrics);

  const { data: alert, error } = await supabase
    .from('alert_instances')
    .insert({
      tenant_id: tenantId,
      alert_type: `cross_domain_${rule.rule_code}`,
      category: 'business',
      severity: rule.severity,
      title,
      message,
      suggested_action: rule.suggested_action,
      status: 'active',
      impact_amount: impact,
      impact_currency: 'VND',
      impact_description: `Estimated financial impact: ${(impact / 1000000).toFixed(1)}M VND`,
      calculation_details: {
        rule_code: rule.rule_code,
        metrics_snapshot: metrics,
        conditions_evaluated: rule.conditions,
        is_cross_domain: true
      },
      metadata: {
        cross_domain: true,
        rule_name: rule.rule_name
      }
    })
    .select()
    .single();

  if (error) {
    console.error('[CrossDomain] Error creating alert:', error);
    return null;
  }

  console.log(`[CrossDomain] Created alert: ${alert.id} with impact ${impact}`);
  return alert;
}
