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

    const { tenant_id } = await req.json();

    if (!tenant_id) {
      throw new Error('tenant_id is required');
    }

    const result: DetectionResult = { triggered: 0, checked: 0, errors: [], calculations: [] };

    // Step 1: Update dynamic calculations for all objects
    console.log('Step 1: Updating dynamic calculations...');
    await updateDynamicCalculations(supabase, tenant_id);

    // Step 2: Get intelligent rules
    const { data: intelligentRules } = await supabase
      .from('intelligent_alert_rules')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_enabled', true)
      .order('priority', { ascending: true });

    console.log(`Found ${intelligentRules?.length || 0} intelligent rules`);

    // Step 3: Get all monitored objects with updated metrics
    const { data: objects, error: objectsError } = await supabase
      .from('alert_objects')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_monitored', true);

    if (objectsError) throw objectsError;
    console.log(`Found ${objects?.length || 0} monitored objects`);

    // Step 4: Process intelligent rules
    for (const rule of intelligentRules || []) {
      try {
        const alerts = await processIntelligentRule(supabase, tenant_id, rule, objects || []);
        result.triggered += alerts.length;
        result.checked++;
        result.calculations.push({
          rule: rule.rule_code,
          alerts_created: alerts.length,
        });
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Unknown error';
        result.errors.push(`Rule ${rule.rule_code}: ${errMsg}`);
      }
    }

    // Step 5: Process basic alert configs
    const { data: configs } = await supabase
      .from('extended_alert_configs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('enabled', true);

    console.log(`Found ${configs?.length || 0} basic alert configs`);

    for (const config of configs || []) {
      try {
        const alerts = await detectAlertsForConfig(supabase, tenant_id, config, objects || []);
        result.triggered += alerts.length;
        result.checked++;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Unknown error';
        result.errors.push(`Config ${config.alert_type}: ${errMsg}`);
      }
    }

    // Step 6: Run cross-object detection
    const additionalAlerts = await runCrossObjectDetection(supabase, tenant_id, objects || []);
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

// ============= DYNAMIC CALCULATIONS =============

async function updateDynamicCalculations(supabase: any, tenantId: string) {
  // Get all product objects
  const { data: products } = await supabase
    .from('alert_objects')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('object_type', 'product');

  if (!products) return;

  for (const product of products) {
    const metrics = product.current_metrics || {};
    const totalStock = metrics.total_stock ?? 0;
    
    // Get sales data from last 30 days (simulated from metadata or calculated)
    const salesLast30Days = metrics.sales_last_30_days ?? (Math.random() * 100);
    const avgDailySales = salesLast30Days / 30;
    
    // Calculate Days of Stock
    const daysOfStock = avgDailySales > 0 ? totalStock / avgDailySales : 999;
    
    // Calculate Sales Velocity (units per day)
    const salesVelocity = avgDailySales;
    
    // Calculate Reorder Point = (Lead Time × Daily Sales) + Safety Stock
    const leadTimeDays = product.lead_time_days ?? 7;
    const safetyStock = product.safety_stock ?? 5;
    const reorderPoint = Math.ceil((leadTimeDays * avgDailySales) + safetyStock);
    
    // Calculate Stockout Risk (days until stockout)
    const stockoutRiskDays = Math.max(0, Math.floor(daysOfStock - leadTimeDays));
    
    // Calculate Trend
    const previousSales = metrics.sales_previous_30_days ?? salesLast30Days * 0.9;
    const trendPercent = previousSales > 0 
      ? ((salesLast30Days - previousSales) / previousSales) * 100 
      : 0;
    const trendDirection = trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable';

    // Update the object with calculated values
    await supabase
      .from('alert_objects')
      .update({
        sales_velocity: salesVelocity,
        days_of_stock: daysOfStock,
        avg_daily_sales: avgDailySales,
        reorder_point: reorderPoint,
        stockout_risk_days: stockoutRiskDays,
        trend_direction: trendDirection,
        trend_percent: trendPercent,
        current_metrics: {
          ...metrics,
          calculated_dos: daysOfStock,
          calculated_velocity: salesVelocity,
          calculated_reorder_point: reorderPoint,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', product.id);
  }

  console.log(`Updated calculations for ${products.length} products`);
}

// ============= INTELLIGENT RULE PROCESSING =============

async function processIntelligentRule(
  supabase: any,
  tenantId: string,
  rule: IntelligentRule,
  objects: AlertObject[]
): Promise<any[]> {
  const alerts: any[] = [];
  const config = rule.threshold_config || {};

  switch (rule.calculation_formula) {
    case 'days_of_stock':
      // Days of Stock based alert
      for (const obj of objects.filter(o => o.object_type === 'product')) {
        const dos = obj.days_of_stock ?? 999;
        const threshold = config.critical_days ?? 7;
        const warningThreshold = config.warning_days ?? 14;

        if (dos <= threshold) {
          alerts.push(await createIntelligentAlert(supabase, tenantId, rule, obj, {
            severity: 'critical',
            current_value: dos,
            threshold_value: threshold,
            suggested_action: `Đặt hàng ngay! Chỉ còn ${Math.round(dos)} ngày tồn kho. Velocity: ${obj.sales_velocity?.toFixed(1)} sp/ngày`,
            action_priority: 'urgent',
            calculation_details: {
              formula: 'current_stock / avg_daily_sales',
              inputs: { stock: obj.current_metrics?.total_stock, velocity: obj.sales_velocity },
              result: dos,
            },
          }));
        } else if (dos <= warningThreshold) {
          alerts.push(await createIntelligentAlert(supabase, tenantId, rule, obj, {
            severity: 'warning',
            current_value: dos,
            threshold_value: warningThreshold,
            suggested_action: `Chuẩn bị đặt hàng. Còn ${Math.round(dos)} ngày tồn. Reorder point: ${obj.reorder_point}`,
            action_priority: 'high',
            calculation_details: {
              formula: 'current_stock / avg_daily_sales',
              inputs: { stock: obj.current_metrics?.total_stock, velocity: obj.sales_velocity },
              result: dos,
            },
          }));
        }
      }
      break;

    case 'dead_stock':
      // Dead Stock Detection - velocity too low
      for (const obj of objects.filter(o => o.object_type === 'product')) {
        const velocity = obj.sales_velocity ?? 0;
        const stock = obj.current_metrics?.total_stock ?? 0;
        const minVelocity = config.min_velocity ?? 0.1; // less than 0.1 units/day
        const dos = obj.days_of_stock ?? 0;

        if (velocity < minVelocity && stock > 0 && dos > (config.max_dos ?? 90)) {
          alerts.push(await createIntelligentAlert(supabase, tenantId, rule, obj, {
            severity: 'warning',
            current_value: velocity,
            threshold_value: minVelocity,
            suggested_action: `KHÔNG NÊN TÁI NHẬP. Hàng tồn ${Math.round(dos)} ngày, velocity chỉ ${velocity.toFixed(2)}/ngày. Xem xét markdown hoặc thanh lý.`,
            action_priority: 'medium',
            auto_action_available: true,
            calculation_details: {
              formula: 'sales_velocity < threshold AND days_of_stock > max_dos',
              inputs: { velocity, dos, stock },
              suggestion: 'no_restock',
            },
          }));
        }
      }
      break;

    case 'fast_mover':
      // Fast Mover Detection - velocity increasing
      for (const obj of objects.filter(o => o.object_type === 'product')) {
        const trendPercent = obj.trend_percent ?? 0;
        const velocity = obj.sales_velocity ?? 0;
        const minTrend = config.min_trend_percent ?? 30;

        if (trendPercent >= minTrend && velocity > 1) {
          alerts.push(await createIntelligentAlert(supabase, tenantId, rule, obj, {
            severity: 'info',
            current_value: trendPercent,
            threshold_value: minTrend,
            suggested_action: `Sản phẩm HOT! Tăng +${Math.round(trendPercent)}%. Đề xuất tăng số lượng đặt hàng lên ${Math.ceil(velocity * 14 * 1.3)} cho 2 tuần.`,
            action_priority: 'medium',
            calculation_details: {
              formula: 'trend_percent >= threshold',
              inputs: { trend: trendPercent, velocity },
              suggestion: 'increase_reorder_qty',
            },
          }));
        }
      }
      break;

    case 'overstock':
      // Overstock Detection - too much inventory
      for (const obj of objects.filter(o => o.object_type === 'product')) {
        const dos = obj.days_of_stock ?? 0;
        const threshold = config.max_dos ?? 60;
        const stock = obj.current_metrics?.total_stock ?? 0;
        const velocity = obj.sales_velocity ?? 0;

        if (dos > threshold && stock > 0 && velocity > 0) {
          alerts.push(await createIntelligentAlert(supabase, tenantId, rule, obj, {
            severity: 'warning',
            current_value: dos,
            threshold_value: threshold,
            suggested_action: `Tồn kho quá mức: ${Math.round(dos)} ngày (ngưỡng ${threshold}). Đề xuất: Giảm giá 10-20% hoặc bundle với sản phẩm khác.`,
            action_priority: 'low',
            auto_action_available: true,
            calculation_details: {
              formula: 'days_of_stock > max_threshold',
              inputs: { dos, stock, velocity },
              excess_stock: Math.round(stock - (velocity * threshold)),
            },
          }));
        }
      }
      break;

    case 'reorder_point':
      // Reorder Point Based Alert
      for (const obj of objects.filter(o => o.object_type === 'product')) {
        const stock = obj.current_metrics?.total_stock ?? 0;
        const reorderPoint = obj.reorder_point ?? 10;

        if (stock <= reorderPoint && stock > 0) {
          alerts.push(await createIntelligentAlert(supabase, tenantId, rule, obj, {
            severity: 'warning',
            current_value: stock,
            threshold_value: reorderPoint,
            suggested_action: `Đạt điểm tái đặt hàng. Số lượng đề xuất: ${Math.ceil(obj.avg_daily_sales * (obj.lead_time_days + 14))} (cho ${obj.lead_time_days + 14} ngày)`,
            action_priority: 'high',
            auto_action_available: true,
            calculation_details: {
              formula: 'stock <= reorder_point',
              inputs: { stock, reorderPoint, leadTime: obj.lead_time_days },
              suggested_qty: Math.ceil((obj.avg_daily_sales || 1) * ((obj.lead_time_days || 7) + 14)),
            },
          }));
        }
      }
      break;

    case 'store_revenue_velocity':
      // Store revenue velocity analysis
      for (const obj of objects.filter(o => o.object_type === 'store')) {
        const metrics = obj.current_metrics || {};
        const hourlyRevenue = metrics.hourly_revenue ?? 0;
        const expectedHourly = (metrics.target_revenue ?? 0) / 10; // assuming 10 operating hours
        const variance = expectedHourly > 0 ? ((hourlyRevenue - expectedHourly) / expectedHourly) * 100 : 0;

        if (variance < (config.min_variance ?? -30)) {
          alerts.push(await createIntelligentAlert(supabase, tenantId, rule, obj, {
            severity: 'critical',
            current_value: variance,
            threshold_value: config.min_variance ?? -30,
            suggested_action: `Doanh thu theo giờ thấp ${Math.round(variance)}%. Kiểm tra: footfall, staff performance, promotion.`,
            action_priority: 'urgent',
            calculation_details: {
              formula: '(hourly_revenue - expected) / expected * 100',
              inputs: { hourlyRevenue, expectedHourly },
              variance,
            },
          }));
        }
      }
      break;

    case 'conversion_rate':
      // Conversion rate analysis
      for (const obj of objects.filter(o => o.object_type === 'store')) {
        const metrics = obj.current_metrics || {};
        const footfall = metrics.footfall ?? 0;
        const transactions = metrics.transactions ?? 0;
        const conversionRate = footfall > 0 ? (transactions / footfall) * 100 : 0;
        const benchmark = config.benchmark ?? 15;

        if (conversionRate < benchmark && footfall > 50) {
          alerts.push(await createIntelligentAlert(supabase, tenantId, rule, obj, {
            severity: 'warning',
            current_value: conversionRate,
            threshold_value: benchmark,
            suggested_action: `Conversion thấp ${conversionRate.toFixed(1)}% (benchmark ${benchmark}%). Đề xuất: Training staff, review sản phẩm trưng bày.`,
            action_priority: 'medium',
            calculation_details: {
              formula: 'transactions / footfall * 100',
              inputs: { footfall, transactions },
              conversionRate,
            },
          }));
        }
      }
      break;
  }

  return alerts;
}

async function createIntelligentAlert(
  supabase: any,
  tenantId: string,
  rule: IntelligentRule,
  object: AlertObject,
  details: {
    severity: string;
    current_value: number;
    threshold_value: number;
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
    priority: rule.priority,
    notification_sent: false,
    suggested_action: details.suggested_action,
    action_priority: details.action_priority,
    auto_action_available: details.auto_action_available ?? false,
    calculation_details: details.calculation_details,
    metadata: {
      rule_id: rule.id,
      detected_at: new Date().toISOString(),
      suggested_actions: rule.suggested_actions,
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
        calculation_type: rule.calculation_formula,
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

async function runCrossObjectDetection(supabase: any, tenantId: string, objects: AlertObject[]): Promise<number> {
  let alertsCreated = 0;

  // 1. Supplier Lead Time Risk
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
        category: 'product',
        severity: 'critical',
        title: `🚨 ${productsNearReorder.length} sản phẩm sắp hết hàng trong 3 ngày`,
        message: `Các sản phẩm: ${productsNearReorder.map(p => p.object_name).join(', ')}`,
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

  // 2. Category Performance Drop
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
        category: 'business',
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
  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('current_balance')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (bankAccounts) {
    const totalCash = bankAccounts.reduce((sum: number, acc: any) => sum + (acc.current_balance || 0), 0);

    const { data: upcomingBills } = await supabase
      .from('bills')
      .select('total_amount, paid_amount, due_date')
      .eq('tenant_id', tenantId)
      .eq('status', 'approved')
      .lte('due_date', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());

    if (upcomingBills) {
      const totalDue = upcomingBills.reduce(
        (sum: number, bill: any) => sum + ((bill.total_amount || 0) - (bill.paid_amount || 0)), 
        0
      );

      const coverageRatio = totalDue > 0 ? (totalCash / totalDue) * 100 : 100;

      if (coverageRatio < 120) {
        const { data: existing } = await supabase
          .from('alert_instances')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('alert_type', 'cash_coverage_warning')
          .neq('status', 'resolved')
          .maybeSingle();

        if (!existing) {
          await supabase.from('alert_instances').insert({
            tenant_id: tenantId,
            alert_type: 'cash_coverage_warning',
            category: 'cashflow',
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
              bills_count: upcomingBills.length,
            },
          });
          alertsCreated++;
        }
      }
    }
  }

  return alertsCreated;
}
