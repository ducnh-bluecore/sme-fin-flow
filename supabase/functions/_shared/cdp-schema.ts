/**
 * CDP Schema Helper - Shared utilities for CDP Q&A Edge Function
 * 
 * Defines queryable views and SQL validation rules
 */

// Views that are safe to query via natural language
export const CDP_QUERYABLE_VIEWS = [
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
  const fromMatch = sql.match(/FROM\s+([a-z_0-9]+)/gi);
  if (fromMatch) {
    for (const match of fromMatch) {
      const tableName = match.replace(/FROM\s+/i, '').toLowerCase();
      if (!CDP_QUERYABLE_VIEWS.includes(tableName as CDPQueryableView)) {
        return { valid: false, error: `Table/view '${tableName}' is not allowed` };
      }
    }
  }
  
  return { valid: true };
}

// Inject tenant filter into SQL
export function injectTenantFilter(sql: string, tenantId: string): string {
  // Simple injection - add WHERE tenant_id = ? if not present
  const upperSql = sql.toUpperCase();
  
  if (upperSql.includes('WHERE')) {
    // Add to existing WHERE
    return sql.replace(/WHERE/i, `WHERE tenant_id = '${tenantId}' AND `);
  } else if (upperSql.includes('GROUP BY')) {
    // Add before GROUP BY
    return sql.replace(/GROUP BY/i, `WHERE tenant_id = '${tenantId}' GROUP BY`);
  } else if (upperSql.includes('ORDER BY')) {
    // Add before ORDER BY
    return sql.replace(/ORDER BY/i, `WHERE tenant_id = '${tenantId}' ORDER BY`);
  } else if (upperSql.includes('LIMIT')) {
    // Add before LIMIT
    return sql.replace(/LIMIT/i, `WHERE tenant_id = '${tenantId}' LIMIT`);
  } else {
    // Add at end
    return `${sql} WHERE tenant_id = '${tenantId}'`;
  }
}

// Build schema context for AI
export function buildSchemaContext(): string {
  let context = 'Available database views for querying customer data:\n\n';
  
  for (const [view, description] of Object.entries(CDP_SCHEMA_DESCRIPTIONS)) {
    context += `### ${view}\n${description}\n\n`;
  }
  
  return context;
}

// Common question patterns
export const SUGGESTED_QUESTIONS = [
  'Tổng giá trị khách hàng hiện tại là bao nhiêu?',
  'Cohort nào có LTV cao nhất?',
  'Nguồn khách hàng nào đang mang lại giá trị tốt nhất?',
  'Bao nhiêu phần trăm khách hàng đang ở trạng thái rủi ro?',
  'So sánh LTV của các tier khách hàng',
  'Retention rate trung bình của các cohort gần đây?',
  'Kênh nào có LTV:CAC ratio tốt nhất?',
  'Top 5 segment có giá trị cao nhất?',
];
