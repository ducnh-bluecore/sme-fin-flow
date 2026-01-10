import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface DetectionResult {
  triggered: number;
  checked: number;
  errors: string[];
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
      throw new Error('tenant_id is required');
    }

    const result: DetectionResult = { triggered: 0, checked: 0, errors: [] };

    // Get enabled alert configs
    const { data: configs, error: configError } = await supabase
      .from('extended_alert_configs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('enabled', true);

    if (configError) throw configError;

    console.log(`Found ${configs?.length || 0} enabled alert configs`);

    // Get all monitored objects
    const { data: objects, error: objectsError } = await supabase
      .from('alert_objects')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_monitored', true);

    if (objectsError) throw objectsError;

    console.log(`Found ${objects?.length || 0} monitored objects`);

    // Process each config against relevant objects
    for (const config of configs || []) {
      try {
        const alerts = await detectAlertsForConfig(supabase, tenant_id, config, objects || []);
        result.triggered += alerts.length;
        result.checked++;

        // Insert new alerts
        for (const alert of alerts) {
          // Check if similar alert already exists (not resolved)
          const { data: existing } = await supabase
            .from('alert_instances')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('alert_type', alert.alert_type)
            .eq('external_object_id', alert.external_object_id)
            .neq('status', 'resolved')
            .maybeSingle();

          if (!existing) {
            const { error: insertError } = await supabase
              .from('alert_instances')
              .insert(alert);

            if (insertError) {
              console.error('Insert error:', insertError);
              result.errors.push(`Failed to insert alert: ${insertError.message}`);
            } else {
              console.log(`Created alert: ${alert.title}`);
            }
          }
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Unknown error';
        result.errors.push(`Config ${config.alert_type}: ${errMsg}`);
      }
    }

    // Run additional detection rules
    const additionalAlerts = await runAdditionalDetection(supabase, tenant_id);
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

async function detectAlertsForConfig(
  supabase: any,
  tenantId: string,
  config: AlertConfig,
  objects: any[]
): Promise<any[]> {
  const alerts: any[] = [];

  switch (config.alert_type) {
    case 'inventory_low':
      // Check products with low stock
      const products = objects.filter(o => o.object_type === 'product');
      for (const product of products) {
        const metrics = product.current_metrics || {};
        const stock = metrics.total_stock ?? 0;
        const threshold = config.threshold_value ?? 10;

        if (stock < threshold) {
          alerts.push(createAlert(tenantId, config, product, {
            metric_name: 'stock_quantity',
            current_value: stock,
            threshold_value: threshold,
            message: `Tồn kho ${product.object_name} chỉ còn ${stock} (ngưỡng: ${threshold})`,
            action_url: `/inventory?sku=${product.external_id}`,
          }));
        }
      }
      break;

    case 'inventory_expired':
      // Check products nearing expiry
      for (const product of objects.filter(o => o.object_type === 'product')) {
        const metrics = product.current_metrics || {};
        const daysUntilExpiry = metrics.days_until_expiry;
        const threshold = config.threshold_value ?? 30;

        if (daysUntilExpiry !== undefined && daysUntilExpiry < threshold) {
          const severity = daysUntilExpiry < 7 ? 'critical' : 'warning';
          alerts.push(createAlert(tenantId, { ...config, severity }, product, {
            metric_name: 'days_until_expiry',
            current_value: daysUntilExpiry,
            threshold_value: threshold,
            message: `${product.object_name}: ${metrics.total_stock || 0} sản phẩm sẽ hết hạn trong ${daysUntilExpiry} ngày`,
            action_url: '/inventory?expiring=true',
          }));
        }
      }
      break;

    case 'sales_drop':
    case 'sales_target_miss':
      // Check stores with low performance
      const stores = objects.filter(o => o.object_type === 'store');
      for (const store of stores) {
        const metrics = store.current_metrics || {};
        const revenue = metrics.daily_revenue ?? 0;
        const target = metrics.target_revenue ?? 0;

        if (target > 0) {
          const progress = (revenue / target) * 100;
          const threshold = config.threshold_value ?? 80;

          if (progress < threshold) {
            const severity = progress < 50 ? 'critical' : 'warning';
            const changePercent = Math.round(progress - 100);

            alerts.push(createAlert(tenantId, { ...config, severity }, store, {
              metric_name: config.alert_type === 'sales_drop' ? 'daily_revenue' : 'target_progress',
              current_value: revenue,
              threshold_value: target * (threshold / 100),
              change_percent: changePercent,
              message: `${store.object_name}: Đạt ${progress.toFixed(0)}% mục tiêu (₫${(revenue/1000000).toFixed(1)}M/₫${(target/1000000).toFixed(0)}M)`,
              action_url: `/control-tower/stores?id=${store.external_id}`,
            }));
          }
        }
      }
      break;

    case 'store_performance_low':
      // Check store KPIs
      for (const store of objects.filter(o => o.object_type === 'store')) {
        const metrics = store.current_metrics || {};
        const staffOnline = metrics.staff_online ?? 0;
        const staffTotal = metrics.staff_total ?? 1;
        const staffRate = (staffOnline / staffTotal) * 100;

        if (staffRate < 80) {
          alerts.push(createAlert(tenantId, { ...config, severity: 'warning', alert_type: 'staff_shortage' }, store, {
            metric_name: 'staff_online_rate',
            current_value: staffRate,
            threshold_value: 80,
            message: `${store.object_name}: Chỉ ${staffOnline}/${staffTotal} nhân viên online`,
            action_url: '/control-tower/team',
          }));
        }
      }
      break;

    case 'product_slow_moving':
      // Check slow moving products
      for (const product of objects.filter(o => o.object_type === 'product')) {
        const metrics = product.current_metrics || {};
        const daysSinceLastSale = metrics.days_since_last_sale;
        const threshold = config.threshold_value ?? 30;

        if (daysSinceLastSale !== undefined && daysSinceLastSale > threshold) {
          alerts.push(createAlert(tenantId, config, product, {
            metric_name: 'days_since_last_sale',
            current_value: daysSinceLastSale,
            threshold_value: threshold,
            message: `${product.object_name}: ${daysSinceLastSale} ngày không bán. Tồn: ${metrics.total_stock || 0}`,
            action_url: '/inventory?slow-moving=true',
          }));
        }
      }
      break;
  }

  return alerts;
}

function createAlert(
  tenantId: string,
  config: AlertConfig,
  object: any,
  details: {
    metric_name: string;
    current_value: number;
    threshold_value: number;
    message: string;
    action_url?: string;
    change_percent?: number;
  }
): any {
  const severityPriority = { critical: 1, warning: 2, info: 3 };
  const emoji = config.severity === 'critical' ? '🚨' : config.severity === 'warning' ? '⚠️' : 'ℹ️';

  return {
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
    priority: severityPriority[config.severity as keyof typeof severityPriority] || 3,
    notification_sent: false,
    action_url: details.action_url,
    metadata: {
      detected_at: new Date().toISOString(),
      object_metadata: object.metadata,
      current_metrics: object.current_metrics,
    },
  };
}

async function runAdditionalDetection(supabase: any, tenantId: string): Promise<number> {
  let alertsCreated = 0;

  // Check for delayed orders from external_orders
  const { data: delayedOrders } = await supabase
    .from('external_orders')
    .select('id, order_number, order_date, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'processing')
    .lt('order_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (delayedOrders && delayedOrders.length > 5) {
    const { data: existing } = await supabase
      .from('alert_instances')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('alert_type', 'fulfillment_delayed')
      .neq('status', 'resolved')
      .maybeSingle();

    if (!existing) {
      await supabase.from('alert_instances').insert({
        tenant_id: tenantId,
        alert_type: 'fulfillment_delayed',
        category: 'fulfillment',
        severity: delayedOrders.length > 10 ? 'critical' : 'warning',
        title: `⚠️ ${delayedOrders.length} đơn hàng quá hạn giao 24h+`,
        message: `Có ${delayedOrders.length} đơn hàng đang xử lý quá 24 giờ. Khách hàng có thể hủy đơn.`,
        object_type: 'order_batch',
        object_name: 'Đơn hàng Online',
        metric_name: 'delayed_orders',
        current_value: delayedOrders.length,
        threshold_value: 5,
        threshold_operator: 'greater_than',
        status: 'active',
        priority: 2,
        notification_sent: false,
        action_url: '/orders?status=delayed',
        metadata: { order_ids: delayedOrders.map((o: any) => o.id) },
      });
      alertsCreated++;
    }
  }

  // Check cash flow issues
  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('current_balance')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (bankAccounts) {
    const totalCash = bankAccounts.reduce((sum: number, acc: any) => sum + (acc.current_balance || 0), 0);
    
    // Get upcoming bills
    const { data: upcomingBills } = await supabase
      .from('bills')
      .select('total_amount, paid_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'approved')
      .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

    if (upcomingBills) {
      const totalDue = upcomingBills.reduce(
        (sum: number, bill: any) => sum + ((bill.total_amount || 0) - (bill.paid_amount || 0)), 
        0
      );

      if (totalDue > totalCash * 0.8) {
        const { data: existing } = await supabase
          .from('alert_instances')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('alert_type', 'cash_flow_risk')
          .neq('status', 'resolved')
          .maybeSingle();

        if (!existing) {
          await supabase.from('alert_instances').insert({
            tenant_id: tenantId,
            alert_type: 'cash_flow_risk',
            category: 'cashflow',
            severity: totalDue > totalCash ? 'critical' : 'warning',
            title: '⚠️ Rủi ro dòng tiền trong 7 ngày tới',
            message: `Tiền mặt: ₫${(totalCash/1000000).toFixed(1)}M. Phải trả: ₫${(totalDue/1000000).toFixed(1)}M`,
            metric_name: 'cash_coverage_ratio',
            current_value: totalCash,
            threshold_value: totalDue,
            status: 'active',
            priority: 1,
            notification_sent: false,
            action_url: '/cash-forecast',
            metadata: { total_cash: totalCash, total_due: totalDue },
          });
          alertsCreated++;
        }
      }
    }
  }

  return alertsCreated;
}
