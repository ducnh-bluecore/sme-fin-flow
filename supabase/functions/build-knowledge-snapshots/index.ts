import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
};

interface SnapshotResult {
  snapshot_type: string;
  data: Record<string, unknown>;
  summary_text: string;
}

// ── Snapshot Builders ──

async function buildRevenueSummary(supabase: any, tenantId: string): Promise<SnapshotResult> {
  const { data: rows } = await supabase
    .from('kpi_facts_daily')
    .select('grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value')
    .eq('tenant_id', tenantId)
    .in('metric_code', ['NET_REVENUE', 'ORDER_COUNT', 'AOV', 'GROSS_MARGIN'])
    .eq('dimension_type', 'total')
    .gte('grain_date', daysAgo(90))
    .order('grain_date', { ascending: false })
    .limit(500);

  const safe = rows || [];
  const grouped = groupByMetric(safe);
  const rev7 = sumMetric(grouped['NET_REVENUE'], 7);
  const rev30 = sumMetric(grouped['NET_REVENUE'], 30);
  const rev90 = sumMetric(grouped['NET_REVENUE'], 90);
  const orders30 = sumMetric(grouped['ORDER_COUNT'], 30);
  const margin30 = avgMetric(grouped['GROSS_MARGIN'], 30);
  const aov30 = avgMetric(grouped['AOV'], 30);

  // Period comparison
  const revPrev30 = sumMetricRange(grouped['NET_REVENUE'], 30, 60);
  const changePercent = revPrev30 > 0 ? ((rev30 - revPrev30) / revPrev30 * 100).toFixed(1) : 'N/A';

  const data = { rev7, rev30, rev90, orders30, margin30, aov30, revPrev30, changePercent };
  const summary_text = `=== DOANH THU (cập nhật: ${today()}) ===
- 7 ngày gần nhất: ${fmtVND(rev7)} (${fmtChange(rev7, sumMetricRange(grouped['NET_REVENUE'], 7, 14))} vs tuần trước)
- 30 ngày: ${fmtVND(rev30)} (${changePercent}% vs tháng trước)
- 90 ngày: ${fmtVND(rev90)}
- Đơn hàng 30 ngày: ${fmtNum(orders30)}
- AOV 30 ngày: ${fmtVND(aov30)}
- Gross Margin TB 30 ngày: ${margin30.toFixed(1)}%`;

  return { snapshot_type: 'revenue_summary', data, summary_text };
}

async function buildChannelBreakdown(supabase: any, tenantId: string): Promise<SnapshotResult> {
  const { data: rows } = await supabase
    .from('kpi_facts_daily')
    .select('grain_date, metric_code, dimension_type, dimension_value, metric_value')
    .eq('tenant_id', tenantId)
    .eq('metric_code', 'NET_REVENUE')
    .eq('dimension_type', 'channel')
    .gte('grain_date', daysAgo(30))
    .limit(500);

  const safe = rows || [];
  const byChannel: Record<string, number> = {};
  for (const r of safe) {
    const ch = r.dimension_value || 'unknown';
    byChannel[ch] = (byChannel[ch] || 0) + (r.metric_value || 0);
  }
  const total = Object.values(byChannel).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(byChannel).sort((a, b) => b[1] - a[1]);

  const lines = sorted.map(([ch, v]) => `- ${ch}: ${fmtVND(v)} (${total > 0 ? (v / total * 100).toFixed(1) : 0}%)`);
  const summary_text = `=== DOANH THU THEO KÊNH (30 ngày) ===\nTổng: ${fmtVND(total)}\n${lines.join('\n')}`;

  return { snapshot_type: 'channel_breakdown', data: { byChannel, total }, summary_text };
}

async function buildTopProducts(supabase: any, tenantId: string): Promise<SnapshotResult> {
  // Query pre-aggregated view that handles name fallback: products.name > order_items.product_name > SKU
  const { data: rows, error } = await supabase
    .from('v_top_products_30d')
    .select('sku, product_name, category, total_qty, total_revenue, order_count')
    .eq('tenant_id', tenantId)
    .order('total_revenue', { ascending: false })
    .limit(20);

  if (error) {
    console.error('v_top_products_30d query failed, falling back:', error.message);
    // Fallback: raw query with product_name from order items
    return buildTopProductsFallback(supabase, tenantId);
  }

  const top20 = (rows || []).map((r: any, i: number) => ({
    rank: i + 1,
    sku: r.sku,
    name: r.product_name || r.sku,
    category: r.category || 'N/A',
    qty: r.total_qty || 0,
    revenue: r.total_revenue || 0,
    orderCount: r.order_count || 0,
  }));

  const lines = top20.map(p =>
    `${p.rank}. ${p.name} (${p.sku}): ${fmtNum(p.qty)} sp, ${fmtVND(p.revenue)}, ${p.orderCount} đơn`
  );
  const summary_text = `=== TOP 20 SẢN PHẨM (theo doanh thu) ===\n${lines.join('\n')}`;

  return { snapshot_type: 'top_products', data: { top20 }, summary_text };
}

async function buildTopProductsFallback(supabase: any, tenantId: string): Promise<SnapshotResult> {
  const { data: items } = await supabase
    .from('cdp_order_items')
    .select('sku, product_name, qty, line_revenue')
    .eq('tenant_id', tenantId)
    .gt('line_revenue', 0)
    .limit(5000);

  const { data: products } = await supabase
    .from('products')
    .select('sku, name, category')
    .eq('tenant_id', tenantId)
    .limit(500);

  const productMap = new Map((products || []).map((p: any) => [p.sku, p]));
  const skuAgg: Record<string, { qty: number; revenue: number; name: string; category: string }> = {};

  for (const item of (items || [])) {
    if (!item.sku) continue;
    if (!skuAgg[item.sku]) {
      const prod = productMap.get(item.sku);
      skuAgg[item.sku] = {
        qty: 0, revenue: 0,
        name: prod?.name || item.product_name || item.sku,
        category: prod?.category || 'N/A',
      };
    }
    skuAgg[item.sku].qty += item.qty || 0;
    skuAgg[item.sku].revenue += item.line_revenue || 0;
  }

  const top20 = Object.entries(skuAgg)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 20)
    .map(([sku, d], i) => ({
      rank: i + 1, sku, name: d.name, category: d.category,
      qty: d.qty, revenue: d.revenue,
    }));

  const lines = top20.map(p => `${p.rank}. ${p.name} (${p.sku}): ${fmtNum(p.qty)} sp, ${fmtVND(p.revenue)}`);
  const summary_text = `=== TOP 20 SẢN PHẨM (theo doanh thu) ===\n${lines.join('\n')}`;
  return { snapshot_type: 'top_products', data: { top20 }, summary_text };
}

async function buildCustomerOverview(supabase: any, tenantId: string): Promise<SnapshotResult> {
  const { data: summary } = await supabase
    .from('v_cdp_ltv_summary')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const s = summary || {};
  const data = {
    total_customers: s.total_customers || 0,
    total_equity_12m: s.total_equity_12m || 0,
    total_equity_24m: s.total_equity_24m || 0,
    avg_ltv_12m: s.avg_ltv_12m || 0,
    at_risk_equity: s.at_risk_equity || 0,
    at_risk_count: s.at_risk_count || 0,
    platinum: s.platinum_count || 0,
    gold: s.gold_count || 0,
    silver: s.silver_count || 0,
    bronze: s.bronze_count || 0,
  };

  const summary_text = `=== KHÁCH HÀNG ===
- Tổng: ${fmtNum(data.total_customers)}
- Equity 12m: ${fmtVND(data.total_equity_12m)}, 24m: ${fmtVND(data.total_equity_24m)}
- LTV TB 12m: ${fmtVND(data.avg_ltv_12m)}
- At-risk: ${fmtNum(data.at_risk_count)} KH, ${fmtVND(data.at_risk_equity)} (${data.total_equity_12m > 0 ? (data.at_risk_equity / data.total_equity_12m * 100).toFixed(1) : 0}%)
- Phân loại: Platinum ${fmtNum(data.platinum)}, Gold ${fmtNum(data.gold)}, Silver ${fmtNum(data.silver)}, Bronze ${fmtNum(data.bronze)}`;

  return { snapshot_type: 'customer_overview', data, summary_text };
}

async function buildCohortAnalysis(supabase: any, tenantId: string): Promise<SnapshotResult> {
  const { data: cohorts } = await supabase
    .from('v_cdp_ltv_by_cohort')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('cohort_month', { ascending: false })
    .limit(24);

  const safe = cohorts || [];
  const lines = safe.slice(0, 12).map((c: any) =>
    `- ${c.cohort_month}: ${fmtNum(c.cohort_size)} KH, LTV 12m: ${fmtVND(c.estimated_ltv_12m)}, Retention 3m: ${(c.retention_rate_3m || 0).toFixed(1)}%`
  );

  const summary_text = `=== COHORT LTV (12 tháng gần nhất) ===\n${lines.join('\n')}`;
  return { snapshot_type: 'cohort_analysis', data: { cohorts: safe }, summary_text };
}

async function buildSourcePerformance(supabase: any, tenantId: string): Promise<SnapshotResult> {
  const { data: sources } = await supabase
    .from('v_cdp_ltv_by_source')
    .select('*')
    .eq('tenant_id', tenantId)
    .limit(20);

  const safe = sources || [];
  const lines = safe.map((s: any) =>
    `- ${s.acquisition_source || 'N/A'}: ${fmtNum(s.customer_count)} KH, LTV 12m: ${fmtVND(s.avg_ltv_12m)}, LTV:CAC = ${(s.ltv_cac_ratio || 0).toFixed(1)}x`
  );

  const summary_text = `=== HIỆU QUẢ NGUỒN KHÁCH ===\n${lines.join('\n')}`;
  return { snapshot_type: 'source_performance', data: { sources: safe }, summary_text };
}

async function buildAlertDigest(supabase: any, tenantId: string): Promise<SnapshotResult> {
  const { data: alerts } = await supabase
    .from('alert_instances')
    .select('alert_type, category, severity, title, message, status, created_at')
    .eq('tenant_id', tenantId)
    .in('status', ['open', 'acknowledged'])
    .order('created_at', { ascending: false })
    .limit(20);

  const safe = alerts || [];
  const critical = safe.filter((a: any) => a.severity === 'critical');
  const warning = safe.filter((a: any) => a.severity === 'warning');

  const lines = safe.slice(0, 10).map((a: any) =>
    `- [${a.severity?.toUpperCase()}] ${a.title}: ${a.message?.slice(0, 100) || ''}`
  );

  const summary_text = `=== CẢNH BÁO ĐANG ACTIVE ===
- Tổng: ${safe.length} (Critical: ${critical.length}, Warning: ${warning.length})
${lines.join('\n')}`;

  return { snapshot_type: 'alert_digest', data: { total: safe.length, critical: critical.length, warning: warning.length, alerts: safe }, summary_text };
}

async function buildMarketingKPI(supabase: any, tenantId: string): Promise<SnapshotResult> {
  const { data: rows } = await supabase
    .from('kpi_facts_daily')
    .select('grain_date, metric_code, dimension_type, dimension_value, metric_value')
    .eq('tenant_id', tenantId)
    .in('metric_code', ['AD_SPEND', 'ROAS', 'CPA', 'IMPRESSIONS', 'CLICKS', 'CTR', 'CPC'])
    .eq('dimension_type', 'total')
    .gte('grain_date', daysAgo(30))
    .limit(500);

  const safe = rows || [];
  const grouped = groupByMetric(safe);
  const adSpend30 = sumMetric(grouped['AD_SPEND'], 30);
  const roas30 = avgMetric(grouped['ROAS'], 30);
  const cpa30 = avgMetric(grouped['CPA'], 30);

  const summary_text = `=== MARKETING KPI (30 ngày) ===
- Ad Spend: ${fmtVND(adSpend30)}
- ROAS TB: ${roas30.toFixed(2)}
- CPA TB: ${fmtVND(cpa30)}`;

  return { snapshot_type: 'marketing_kpi', data: { adSpend30, roas30, cpa30 }, summary_text };
}

async function buildInventoryHealth(supabase: any, tenantId: string): Promise<SnapshotResult> {
  const { data: products } = await supabase
    .from('products')
    .select('sku, name, category, current_stock, avg_daily_sales, cost_price, selling_price, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('current_stock', { ascending: true })
    .limit(100);

  const safe = products || [];
  const lowStock = safe.filter((p: any) => p.current_stock > 0 && p.avg_daily_sales > 0 && (p.current_stock / p.avg_daily_sales) < 14);
  const outOfStock = safe.filter((p: any) => (p.current_stock || 0) <= 0);
  const totalStockValue = safe.reduce((sum: number, p: any) => sum + (p.current_stock || 0) * (p.cost_price || 0), 0);

  const lines = lowStock.slice(0, 10).map((p: any) => {
    const dos = p.avg_daily_sales > 0 ? (p.current_stock / p.avg_daily_sales).toFixed(0) : '∞';
    return `- ${p.sku} ${p.name}: tồn ${p.current_stock}, còn ~${dos} ngày`;
  });

  const summary_text = `=== TỒN KHO ===
- Tổng SKU active: ${safe.length}
- Giá trị tồn kho: ${fmtVND(totalStockValue)}
- Hết hàng: ${outOfStock.length} SKU
- Sắp hết (<14 ngày): ${lowStock.length} SKU
${lines.join('\n')}`;

  return { snapshot_type: 'inventory_health', data: { totalSKU: safe.length, totalStockValue, outOfStock: outOfStock.length, lowStock: lowStock.length }, summary_text };
}

async function buildOrderTrends(supabase: any, tenantId: string): Promise<SnapshotResult> {
  const { data: rows } = await supabase
    .from('kpi_facts_daily')
    .select('grain_date, metric_code, metric_value')
    .eq('tenant_id', tenantId)
    .in('metric_code', ['ORDER_COUNT', 'AOV', 'NET_REVENUE'])
    .eq('dimension_type', 'total')
    .gte('grain_date', daysAgo(30))
    .order('grain_date', { ascending: false })
    .limit(200);

  const safe = rows || [];
  const grouped = groupByMetric(safe);

  // Daily trend for last 7 days
  const dailyRevenue = (grouped['NET_REVENUE'] || []).slice(0, 7).map((r: any) => ({
    date: r.grain_date, value: r.metric_value
  }));

  const summary_text = `=== XU HƯỚNG ĐƠN HÀNG (30 ngày) ===
- Tổng đơn: ${fmtNum(sumMetric(grouped['ORDER_COUNT'], 30))}
- Doanh thu: ${fmtVND(sumMetric(grouped['NET_REVENUE'], 30))}
- AOV TB: ${fmtVND(avgMetric(grouped['AOV'], 30))}
- 7 ngày gần nhất (doanh thu/ngày): ${dailyRevenue.map((d: any) => `${d.date}: ${fmtVND(d.value)}`).join(', ')}`;

  return { snapshot_type: 'order_trends', data: { dailyRevenue }, summary_text };
}

// ── Utility Functions ──

function today(): string { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function groupByMetric(rows: any[]): Record<string, any[]> {
  const m: Record<string, any[]> = {};
  for (const r of rows) {
    const k = r.metric_code;
    if (!m[k]) m[k] = [];
    m[k].push(r);
  }
  return m;
}

function sumMetric(rows: any[] | undefined, days: number): number {
  if (!rows) return 0;
  const cutoff = daysAgo(days);
  return rows.filter(r => r.grain_date >= cutoff).reduce((s, r) => s + (r.metric_value || 0), 0);
}

function sumMetricRange(rows: any[] | undefined, fromDays: number, toDays: number): number {
  if (!rows) return 0;
  const from = daysAgo(toDays);
  const to = daysAgo(fromDays);
  return rows.filter(r => r.grain_date >= from && r.grain_date < to).reduce((s, r) => s + (r.metric_value || 0), 0);
}

function avgMetric(rows: any[] | undefined, days: number): number {
  if (!rows) return 0;
  const cutoff = daysAgo(days);
  const filtered = rows.filter(r => r.grain_date >= cutoff && r.metric_value != null);
  if (filtered.length === 0) return 0;
  return filtered.reduce((s, r) => s + (r.metric_value || 0), 0) / filtered.length;
}

function fmtVND(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} tỷ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} triệu`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

function fmtNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toString();
}

function fmtChange(current: number, previous: number): string {
  if (previous === 0) return 'N/A';
  const pct = ((current - previous) / previous * 100).toFixed(1);
  return Number(pct) >= 0 ? `+${pct}%` : `${pct}%`;
}

// ── Main Handler ──

const ALL_BUILDERS = [
  buildRevenueSummary,
  buildChannelBreakdown,
  buildTopProducts,
  buildCustomerOverview,
  buildCohortAnalysis,
  buildSourcePerformance,
  buildAlertDigest,
  buildMarketingKPI,
  buildInventoryHealth,
  buildOrderTrends,
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get tenant_id from header or body
    let tenantId = req.headers.get('x-tenant-id') || undefined;
    if (!tenantId) {
      try {
        const body = await req.json();
        tenantId = body.tenantId;
      } catch { /* no body */ }
    }

    if (!tenantId) {
      // Build for ALL tenants
      const { data: tenants } = await supabase.from('tenants').select('id').limit(50);
      const results: Record<string, number> = {};
      for (const t of (tenants || [])) {
        const count = await buildSnapshotsForTenant(supabase, t.id);
        results[t.id] = count;
      }
      return new Response(JSON.stringify({ success: true, tenants: results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const count = await buildSnapshotsForTenant(supabase, tenantId);
    return new Response(JSON.stringify({ success: true, tenant: tenantId, snapshots: count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('build-knowledge-snapshots error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function buildSnapshotsForTenant(supabase: any, tenantId: string): Promise<number> {
  const snapshotDate = today();
  let count = 0;

  for (const builder of ALL_BUILDERS) {
    try {
      const result = await builder(supabase, tenantId);
      await supabase.from('knowledge_snapshots').upsert({
        tenant_id: tenantId,
        snapshot_type: result.snapshot_type,
        snapshot_date: snapshotDate,
        data: result.data,
        summary_text: result.summary_text,
      }, { onConflict: 'tenant_id,snapshot_type,snapshot_date' });
      count++;
    } catch (e) {
      console.error(`Snapshot ${builder.name} failed for ${tenantId}:`, e);
    }
  }

  console.log(`[build-knowledge-snapshots] tenant=${tenantId}, built=${count}/${ALL_BUILDERS.length}`);
  return count;
}
