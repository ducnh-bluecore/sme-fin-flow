/**
 * CDP Schema Helper - Shared utilities for CDP Q&A Edge Function
 * 
 * Defines queryable views/tables and SQL validation rules.
 * Covers L2 Master, L3 KPI, L4 Alert/CDP layers + CDP views.
 */

// Tables and views that are safe to query via natural language
export const CDP_QUERYABLE_VIEWS = [
  // L2 Master
  'cdp_orders',
  'cdp_customers',
  'cdp_order_items',
  'products',
  // L3 KPI
  'kpi_facts_daily',
  // L4 Alert & CDP Equity
  'alert_instances',
  'cdp_customer_equity_computed',
  // CDP Aggregated Views
  'v_cdp_ltv_by_cohort',
  'v_cdp_ltv_by_source', 
  'v_cdp_ltv_summary',
  'v_cdp_equity_distribution',
  'v_cdp_equity_overview',
  'v_cdp_equity_drivers',
  'v_cdp_population_catalog',
] as const;

export type CDPQueryableView = typeof CDP_QUERYABLE_VIEWS[number];

// Schema descriptions for AI context
export const CDP_SCHEMA_DESCRIPTIONS: Record<CDPQueryableView, string> = {
  // ── L2 Master ──
  'cdp_orders': `
    Bảng đơn hàng chính (L2 Master) - 1.1M+ rows
    Columns: tenant_id, id, order_key, customer_id, order_at (timestamp), channel, 
    net_revenue, cogs, gross_margin, status, shop_name, province_name, 
    payment_method, discount_amount, platform_fee, shipping_fee, created_at
    ⚠️ Bảng lớn - luôn dùng LIMIT và WHERE khi query trực tiếp.
    Prefer kpi_facts_daily cho aggregate questions.
  `,
  'cdp_customers': `
    Bảng khách hàng (L2 Master) - 310K+ rows  
    Columns: tenant_id, id, name, phone, email, province, acquisition_source,
    first_order_at, last_order_at, status, lifetime_value, created_at
  `,
  'cdp_order_items': `
    Chi tiết line item đơn hàng (L2 Master) - 189K+ rows
    Columns: tenant_id, id, order_id, product_id, qty, unit_price, 
    line_revenue, discount_amount
    JOIN: cdp_order_items.order_id -> cdp_orders.id
    ⚠️ Bảng lớn - luôn dùng LIMIT.
  `,
  'products': `
    Danh mục sản phẩm (L2 Master)
    Columns: tenant_id, id, sku, name, category, brand, cost_price, 
    selling_price, current_stock, avg_daily_sales, is_active, created_at
  `,

  // ── L3 KPI ──
  'kpi_facts_daily': `
    KPI tổng hợp hàng ngày (L3 - pre-aggregated, NHANH)
    Columns: tenant_id, grain_date (date), metric_code, dimension_type, 
    dimension_value, metric_value, comparison_value, period_type
    metric_code values: NET_REVENUE, ORDER_COUNT, AOV, COGS, GROSS_MARGIN, 
    AD_SPEND, ROAS, CPA, IMPRESSIONS, CLICKS, CTR, CPC
    dimension_type values: total, channel, campaign
    ✅ ƯU TIÊN dùng bảng này cho câu hỏi tổng hợp doanh thu, KPI theo ngày/tháng.
  `,

  // ── L4 Alert & CDP Equity ──
  'alert_instances': `
    Cảnh báo hoạt động (L4 Alert)
    Columns: tenant_id, id, alert_type, category, severity (critical/warning/info),
    title, message, metric_name, current_value, threshold_value, change_percent,
    status (open/acknowledged/resolved), priority, created_at, resolved_at
  `,
  'cdp_customer_equity_computed': `
    Giá trị khách hàng đã tính toán (L4 CDP Equity)
    Columns: tenant_id, customer_id, as_of_date, orders_30d, orders_90d, orders_180d,
    net_revenue_30d, net_revenue_90d, net_revenue_180d, equity_12m, equity_24m,
    churn_risk_score, risk_level (low/medium/high), equity_confidence
  `,

  // ── CDP Aggregated Views ──
  'v_cdp_ltv_by_cohort': `
    Phân tích LTV theo cohort (tháng gia nhập khách hàng)
    Columns: tenant_id, cohort_month, cohort_size, avg_revenue, avg_profit, avg_orders,
    estimated_ltv_12m, estimated_ltv_24m, retention_rate_3m, retention_rate_6m, 
    retention_rate_12m, ltv_trend_vs_prev, quality_score
  `,
  'v_cdp_ltv_by_source': `
    Phân tích LTV theo nguồn khách hàng (acquisition source)
    Columns: tenant_id, acquisition_source, customer_count, avg_revenue, avg_profit,
    avg_orders, avg_ltv_12m, avg_ltv_24m, estimated_cac, ltv_cac_ratio, payback_months
  `,
  'v_cdp_ltv_summary': `
    Tổng quan LTV của toàn bộ khách hàng
    Columns: tenant_id, total_customers, total_equity_12m, total_equity_24m,
    avg_ltv_12m, avg_ltv_24m, median_ltv_12m, median_ltv_24m, at_risk_equity,
    at_risk_count, platinum_count, gold_count, silver_count, bronze_count
  `,
  'v_cdp_equity_distribution': `
    Phân bổ giá trị khách hàng theo tier/segment
    Columns: tenant_id, segment_name, segment_type, equity, share_percent,
    customer_count, avg_ltv, risk_level
  `,
  'v_cdp_equity_overview': `
    Tổng quan về giá trị khách hàng
    Columns: tenant_id, total_equity_12m, total_equity_24m, at_risk_value,
    at_risk_percent, model_version, last_updated
  `,
  'v_cdp_equity_drivers': `
    Các yếu tố ảnh hưởng đến giá trị khách hàng
    Columns: tenant_id, factor, description, impact, direction, severity, trend
  `,
  'v_cdp_population_catalog': `
    Danh sách các tập khách hàng (population/segment)
    Columns: tenant_id, population_id, name, description, customer_count,
    total_revenue, avg_order_value, created_at
  `,
};

// Forbidden SQL patterns
const FORBIDDEN_PATTERNS = [
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bDELETE\b/i,
  /\bDROP\b/i,
  /\bALTER\b/i,
  /\bCREATE\b/i,
  /\bTRUNCATE\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bEXECUTE\b/i,
  /--/,  // SQL comments
  /\/\*/,  // Block comments
  /;/,  // Any semicolon (prevents statement chaining + parser edge cases)
];

// Validate that SQL is SELECT only and uses allowed views
export function validateSQL(sql: string): { valid: boolean; error?: string } {
  const trimmed = sql.trim().toUpperCase();
  
  // Must start with SELECT
  if (!trimmed.startsWith('SELECT')) {
    return { valid: false, error: 'Only SELECT queries are allowed' };
  }
  
  // Check for forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sql)) {
      return { valid: false, error: `Forbidden pattern detected: ${pattern}` };
    }
  }
  
  // Check that only allowed views are queried
  const tableMatches: string[] = [];
  
  const allFromMatches = sql.matchAll(/\bFROM\s+([a-z_][a-z_0-9]*)/gi);
  for (const m of allFromMatches) {
    const tableName = m[1].toLowerCase();
    const matchIndex = m.index ?? 0;
    
    // Check if this FROM is preceded by '(' within ~20 chars (EXTRACT, DATE_PART, etc.)
    const preceding = sql.slice(Math.max(0, matchIndex - 20), matchIndex);
    if (/\(\s*[A-Z_]+\s*$/i.test(preceding)) {
      continue;
    }
    
    tableMatches.push(tableName);
  }
  
  // Also check JOIN targets
  const joinMatches = sql.matchAll(/\bJOIN\s+([a-z_][a-z_0-9]*)/gi);
  for (const m of joinMatches) {
    tableMatches.push(m[1].toLowerCase());
  }
  
  for (const tableName of tableMatches) {
    if (!CDP_QUERYABLE_VIEWS.includes(tableName as CDPQueryableView)) {
      return { valid: false, error: `Table/view '${tableName}' is not allowed` };
    }
  }
  
  return { valid: true };
}

// Inject tenant filter into SQL
export function injectTenantFilter(sql: string, tenantId: string): string {
  // Detect first table alias to qualify tenant_id (avoids ambiguity in JOINs)
  const fromMatch = sql.match(/\bFROM\s+([a-z_][a-z_0-9]*)\s+([a-z_][a-z_0-9]*)?/i);
  const qualifier = fromMatch?.[2] || fromMatch?.[1] || '';
  const tenantCol = qualifier ? `${qualifier}.tenant_id` : 'tenant_id';
  const tenantFilter = `${tenantCol} = '${tenantId}'::uuid`;

  const upperSql = sql.toUpperCase();
  
  if (upperSql.includes('WHERE')) {
    return sql.replace(/WHERE/i, `WHERE ${tenantFilter} AND `);
  } else if (upperSql.includes('GROUP BY')) {
    return sql.replace(/GROUP BY/i, `WHERE ${tenantFilter} GROUP BY`);
  } else if (upperSql.includes('ORDER BY')) {
    return sql.replace(/ORDER BY/i, `WHERE ${tenantFilter} ORDER BY`);
  } else if (upperSql.includes('LIMIT')) {
    return sql.replace(/LIMIT/i, `WHERE ${tenantFilter} LIMIT`);
  } else {
    return `${sql} WHERE ${tenantFilter}`;
  }
}

// Build schema context for AI
export function buildSchemaContext(): string {
  let context = `Available database tables and views for querying.
  
QUAN TRỌNG - QUERY HINTS:
- Cho câu hỏi tổng hợp doanh thu/KPI theo ngày/tháng: ƯU TIÊN dùng kpi_facts_daily (pre-aggregated, nhanh hơn nhiều so với cdp_orders)
- Cho câu hỏi chi tiết đơn hàng cụ thể: dùng cdp_orders
- Khi query cdp_orders hoặc cdp_order_items: LUÔN thêm LIMIT 100
- JOIN guidance: cdp_orders.customer_id -> cdp_customers.id, cdp_order_items.order_id -> cdp_orders.id, cdp_order_items.product_id -> products.id

`;
  
  for (const [view, description] of Object.entries(CDP_SCHEMA_DESCRIPTIONS)) {
    context += `### ${view}\n${description}\n\n`;
  }
  
  return context;
}

// Suggested questions covering all data layers
export const SUGGESTED_QUESTIONS = [
  // L3 KPI (fastest)
  'Tổng doanh thu 30 ngày gần nhất theo từng kênh?',
  'ROAS trung bình 7 ngày gần nhất?',
  'So sánh NET_REVENUE tháng này vs tháng trước?',
  // L2 Orders & Products
  'Top 10 sản phẩm bán chạy nhất?',
  'Kênh nào có gross margin cao nhất?',
  // L4 Alerts & Equity
  'Có bao nhiêu alert critical đang open?',
  'Top 20 khách hàng có equity cao nhất?',
  'Bao nhiêu khách hàng có risk level = high?',
  // CDP Views
  'Cohort nào có LTV cao nhất?',
  'Nguồn khách hàng nào có LTV:CAC ratio tốt nhất?',
];
