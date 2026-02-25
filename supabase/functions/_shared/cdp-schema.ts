/**
 * CDP Schema Helper - Shared utilities for CDP Q&A Edge Function
 * 
 * Defines:
 * - Knowledge Pack definitions (Tier 1)
 * - Focused Query Templates (Tier 2)
 * - Queryable views whitelist (Tier 3)
 * - SQL validation rules
 */

// ─── TIER 1: Knowledge Pack Definitions ─────────────────────────────

export interface KnowledgePack {
  name: string;
  label: string;
  description: string;
  /** Views/tables to fetch from */
  sources: { view: string; select?: string; orderBy?: string; limit?: number; filters?: Record<string, unknown> }[];
  /** Hint for AI when drill-down is needed */
  drill_down_hint?: string;
}

export const KNOWLEDGE_PACKS: Record<string, KnowledgePack> = {
  overview: {
    name: 'overview',
    label: 'Tổng quan tài chính & sức khỏe doanh nghiệp',
    description: 'Snapshot tài chính (FDP), Control Tower, sức khỏe tổng thể',
    sources: [
      { view: 'v_fdp_truth_snapshot', limit: 5 },
      { view: 'v_ct_truth_snapshot', limit: 5 },
      { view: 'v_executive_health_scores', limit: 10 },
    ],
    drill_down_hint: 'Nếu cần dữ liệu cửa hàng → gọi focused_query("store_performance"). Nếu cần chi tiết P&L → gọi focused_query("pl_trend").',
  },
  revenue: {
    name: 'revenue',
    label: 'KPI doanh thu 30 ngày',
    description: 'NET_REVENUE, ORDER_COUNT, AOV theo ngày (pre-aggregated)',
    sources: [
      { view: 'kpi_facts_daily', select: 'grain_date, metric_code, metric_value, dimension_value', limit: 500 },
    ],
    drill_down_hint: 'Dùng focused_query template "revenue_time_series" để xem chi tiết theo tuần/tháng dài hơn 30 ngày',
  },
  profitability: {
    name: 'profitability',
    label: 'P&L theo tháng',
    description: 'Doanh thu, COGS, lợi nhuận gộp, chi phí, lãi ròng theo tháng',
    sources: [
      { view: 'v_pl_monthly_summary', limit: 12, orderBy: 'year_month.desc' },
    ],
    drill_down_hint: 'Dùng focused_query template "pl_trend" để xem xu hướng P&L chi tiết hơn',
  },
  channels: {
    name: 'channels',
    label: 'P&L theo kênh bán hàng',
    description: 'Revenue, COGS, margin, marketing spend, contribution margin theo kênh',
    sources: [
      { view: 'v_channel_pl_summary', limit: 50 },
    ],
    drill_down_hint: 'Dùng focused_query template "channel_monthly_detail" để xem chi tiết theo tháng cho từng kênh',
  },
  products: {
    name: 'products',
    label: 'Top sản phẩm bán chạy 30 ngày',
    description: 'Top sản phẩm theo doanh thu, số lượng bán, margin',
    sources: [
      { view: 'v_top_products_30d', limit: 20, orderBy: 'total_revenue.desc' },
    ],
    drill_down_hint: 'Dùng focused_query template "product_deep_dive" để phân tích chi tiết 1 sản phẩm/danh mục',
  },
  marketing: {
    name: 'marketing',
    label: 'Marketing & quảng cáo',
    description: 'AD_SPEND, ROAS, hiệu quả marketing theo kênh',
    sources: [
      { view: 'v_mdp_truth_snapshot', limit: 5 },
      { view: 'v_mdp_ceo_snapshot', limit: 5 },
    ],
  },
  customers: {
    name: 'customers',
    label: 'Khách hàng & LTV',
    description: 'Tổng hợp LTV, segments, at-risk customers. ⚠️ Customer linking ~7.6%',
    sources: [
      { view: 'v_cdp_ltv_summary', limit: 5 },
      { view: 'v_cdp_equity_overview', limit: 5 },
    ],
    drill_down_hint: 'Dùng focused_query template "cohort_deep_dive" hoặc "rfm_analysis" để phân tích sâu',
  },
  alerts: {
    name: 'alerts',
    label: 'Cảnh báo đang mở',
    description: 'Alert instances với severity, impact, suggested action',
    sources: [
      { view: 'alert_instances', select: 'title, severity, category, impact_amount, message, suggested_action, created_at', limit: 10 },
    ],
  },
};

// Intent mapping: keywords → pack names
export const INTENT_PACK_MAP: Record<string, string[]> = {
  'doanh thu|revenue|doanh so|net revenue|ban hang': ['overview', 'revenue', 'channels'],
  'loi nhuan|margin|p&l|profit|chi phi hang|cogs': ['overview', 'profitability', 'channels'],
  'kenh|shopee|lazada|tiktok|website|channel': ['channels', 'marketing'],
  'san pham|product|top|sku|hang ban chay': ['products', 'revenue'],
  'marketing|quang cao|ads|roas|ad spend|cpc': ['marketing', 'channels'],
  'khach hang|customer|ltv|cohort|rfm|retention': ['customers'],
  'canh bao|alert|van de|risk|nguy hiem|critical': ['alerts', 'overview'],
  'tong quan|tinh hinh|overview|snapshot|suc khoe': ['overview', 'channels', 'alerts'],
  'chi phi|expense|operating|opex': ['profitability', 'overview'],
  'cash|tien mat|dong tien|cash flow': ['overview', 'profitability'],
  'cua hang|store|chi nhanh': ['overview', 'channels'],
};

/**
 * Detect intent from user question and return relevant pack names.
 * Always includes 'overview' for context.
 */
export function detectIntentPacks(question: string): string[] {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matched = new Set<string>();
  
  for (const [pattern, packs] of Object.entries(INTENT_PACK_MAP)) {
    const keywords = pattern.split('|');
    if (keywords.some(kw => q.includes(kw))) {
      packs.forEach(p => matched.add(p));
    }
  }
  
  // Always include overview for context
  matched.add('overview');
  
  // If nothing matched, just overview
  if (matched.size <= 1) return ['overview'];
  
  // Cap at 4 packs max
  return Array.from(matched).slice(0, 4);
}


// ─── TIER 2: Focused Query Templates ────────────────────────────────

export interface QueryTemplate {
  name: string;
  description: string;
  /** SQL template with {{param}} placeholders */
  sql: string;
  /** Parameter definitions */
  params: Record<string, { type: string; description: string; required?: boolean; default?: unknown; enum?: string[] }>;
  /** Max rows to return */
  max_rows: number;
  /** Business labels for AI context */
  labels: Record<string, string>;
  /** Caveats AI should know */
  caveats?: string;
}

export const QUERY_TEMPLATES: Record<string, QueryTemplate> = {
  revenue_time_series: {
    name: 'revenue_time_series',
    description: 'Xu hướng doanh thu theo ngày/tuần/tháng. Dùng khi user hỏi trend, xu hướng doanh thu qua thời gian.',
    sql: `SELECT 
      {{granularity_expr}} as period,
      SUM(CASE WHEN metric_code = 'NET_REVENUE' THEN metric_value ELSE 0 END) as net_revenue,
      SUM(CASE WHEN metric_code = 'ORDER_COUNT' THEN metric_value ELSE 0 END) as order_count,
      CASE WHEN SUM(CASE WHEN metric_code = 'ORDER_COUNT' THEN metric_value ELSE 0 END) > 0 
        THEN SUM(CASE WHEN metric_code = 'NET_REVENUE' THEN metric_value ELSE 0 END) / SUM(CASE WHEN metric_code = 'ORDER_COUNT' THEN metric_value ELSE 0 END)
        ELSE 0 END as aov
    FROM kpi_facts_daily
    WHERE tenant_id = '{{tenant_id}}'::uuid
      AND dimension_type = 'total'
      AND grain_date >= CURRENT_DATE - INTERVAL '{{days}} days'
    GROUP BY period
    ORDER BY period`,
    params: {
      granularity: { type: 'string', description: 'day, week, hoặc month', required: true, enum: ['day', 'week', 'month'] },
      days: { type: 'number', description: 'Số ngày nhìn lại (7-365)', required: true, default: 30 },
      channel: { type: 'string', description: 'Filter theo kênh cụ thể (optional)', required: false },
    },
    max_rows: 365,
    labels: { net_revenue: 'Doanh thu thuần (VND)', order_count: 'Số đơn hàng', aov: 'Giá trị đơn trung bình (VND)' },
  },

  channel_monthly_detail: {
    name: 'channel_monthly_detail',
    description: 'Chi tiết P&L theo tháng cho 1 hoặc tất cả kênh. Dùng khi cần so sánh kênh chi tiết.',
    sql: `SELECT * FROM v_channel_pl_summary 
    WHERE tenant_id = '{{tenant_id}}'::uuid
    {{channel_filter}}
    ORDER BY period DESC
    LIMIT {{limit}}`,
    params: {
      channel: { type: 'string', description: 'Tên kênh (Shopee, Lazada, TikTok, Website...)', required: false },
      months: { type: 'number', description: 'Số tháng (1-12)', required: false, default: 6 },
    },
    max_rows: 100,
    labels: { net_revenue: 'Doanh thu thuần', cogs: 'Giá vốn', gross_margin: 'Biên lợi nhuận gộp', contribution_margin: 'Biên đóng góp' },
  },

  product_deep_dive: {
    name: 'product_deep_dive',
    description: 'Phân tích chi tiết sản phẩm/danh mục: doanh thu, số lượng bán, margin theo thời gian.',
    sql: `SELECT p.name as product_name, p.category, p.sku,
      SUM(oi.line_revenue) as total_revenue,
      SUM(oi.qty) as total_qty,
      COUNT(DISTINCT oi.order_id) as order_count
    FROM cdp_order_items oi
    JOIN products p ON p.id = oi.product_id AND p.tenant_id = oi.tenant_id
    JOIN cdp_orders o ON o.id = oi.order_id AND o.tenant_id = oi.tenant_id
    WHERE oi.tenant_id = '{{tenant_id}}'::uuid
      AND o.order_at >= CURRENT_DATE - INTERVAL '{{days}} days'
      {{product_filter}}
    GROUP BY p.name, p.category, p.sku
    ORDER BY total_revenue DESC
    LIMIT {{limit}}`,
    params: {
      product_name: { type: 'string', description: 'Tên sản phẩm (tìm kiếm ILIKE)', required: false },
      category: { type: 'string', description: 'Danh mục sản phẩm', required: false },
      days: { type: 'number', description: 'Số ngày (mặc định 30)', required: false, default: 30 },
    },
    max_rows: 200,
    labels: { total_revenue: 'Doanh thu (VND)', total_qty: 'Số lượng bán', order_count: 'Số đơn hàng' },
    caveats: 'Dữ liệu từ cdp_order_items - đây là doanh thu thực tế từ đơn hàng.',
  },

  customer_segment_detail: {
    name: 'customer_segment_detail',
    description: 'Chi tiết khách hàng theo segment RFM. Dùng khi cần phân tích nhóm khách hàng cụ thể.',
    sql: `SELECT * FROM v_cdp_rfm_segments
    WHERE tenant_id = '{{tenant_id}}'::uuid
    {{segment_filter}}
    LIMIT {{limit}}`,
    params: {
      segment: { type: 'string', description: 'platinum, gold, silver, bronze, hoặc at_risk', required: false, enum: ['platinum', 'gold', 'silver', 'bronze', 'at_risk'] },
    },
    max_rows: 100,
    labels: {},
    caveats: '⚠️ Customer linking ~7.6%, kết quả mang tính tham khảo.',
  },

  expense_breakdown: {
    name: 'expense_breakdown',
    description: 'Chi phí hoạt động theo danh mục và tháng.',
    sql: `SELECT * FROM v_expenses_by_category_monthly
    WHERE tenant_id = '{{tenant_id}}'::uuid
    {{category_filter}}
    ORDER BY month DESC
    LIMIT {{limit}}`,
    params: {
      months: { type: 'number', description: 'Số tháng', required: false, default: 6 },
      category: { type: 'string', description: 'Danh mục chi phí', required: false },
    },
    max_rows: 50,
    labels: {},
    caveats: '⚠️ Chi phí có thể chưa đầy đủ nếu chưa được nhập liệu.',
  },

  cash_flow_analysis: {
    name: 'cash_flow_analysis',
    description: 'Phân tích dòng tiền theo tháng.',
    sql: `SELECT * FROM v_cash_flow_monthly
    WHERE tenant_id = '{{tenant_id}}'::uuid
    ORDER BY month DESC
    LIMIT {{limit}}`,
    params: {
      months: { type: 'number', description: 'Số tháng (mặc định 6)', required: false, default: 6 },
    },
    max_rows: 24,
    labels: {},
  },

  pl_trend: {
    name: 'pl_trend',
    description: 'Xu hướng P&L theo tháng (3-12 tháng).',
    sql: `SELECT * FROM v_pl_monthly_summary
    WHERE tenant_id = '{{tenant_id}}'::uuid
    ORDER BY year_month DESC
    LIMIT {{limit}}`,
    params: {
      months: { type: 'number', description: 'Số tháng (3-12)', required: false, default: 6 },
    },
    max_rows: 12,
    labels: { gross_sales: 'Doanh thu gộp', net_sales: 'Doanh thu thuần', cogs: 'Giá vốn', gross_profit: 'Lợi nhuận gộp', net_income: 'Lãi ròng' },
  },

  alert_history: {
    name: 'alert_history',
    description: 'Lịch sử cảnh báo theo severity, category, thời gian.',
    sql: `SELECT title, severity, category, impact_amount, message, status, created_at, resolved_at
    FROM alert_instances
    WHERE tenant_id = '{{tenant_id}}'::uuid
    {{severity_filter}}
    {{category_filter}}
      AND created_at >= CURRENT_DATE - INTERVAL '{{days}} days'
    ORDER BY created_at DESC
    LIMIT {{limit}}`,
    params: {
      severity: { type: 'string', description: 'critical, warning, hoặc info', required: false, enum: ['critical', 'warning', 'info'] },
      category: { type: 'string', description: 'Danh mục alert', required: false },
      days: { type: 'number', description: 'Số ngày', required: false, default: 30 },
    },
    max_rows: 50,
    labels: {},
  },

  cohort_deep_dive: {
    name: 'cohort_deep_dive',
    description: 'Phân tích LTV theo cohort (tháng gia nhập).',
    sql: `SELECT * FROM v_cdp_ltv_by_cohort
    WHERE tenant_id = '{{tenant_id}}'::uuid
    {{cohort_filter}}
    ORDER BY cohort_month DESC
    LIMIT {{limit}}`,
    params: {
      cohort_month: { type: 'string', description: 'Tháng cohort cụ thể (YYYY-MM)', required: false },
    },
    max_rows: 20,
    labels: { estimated_ltv_12m: 'LTV 12 tháng (ước tính)', retention_rate_3m: 'Tỷ lệ giữ chân 3 tháng' },
    caveats: '⚠️ Customer linking ~7.6%',
  },

  store_performance: {
    name: 'store_performance',
    description: 'Hiệu suất cửa hàng vật lý: doanh thu ước tính, velocity, metrics.',
    sql: `SELECT s.store_name, s.store_code, s.address, s.is_active,
      r.est_revenue, r.estimated_pct,
      m.total_sold, m.avg_velocity, m.active_fcs
    FROM inv_stores s
    LEFT JOIN v_inv_store_revenue r ON r.store_id = s.id AND r.tenant_id = s.tenant_id
    LEFT JOIN v_inv_store_metrics m ON m.store_id = s.id AND m.tenant_id = s.tenant_id
    WHERE s.tenant_id = '{{tenant_id}}'::uuid
    {{store_filter}}
    ORDER BY r.est_revenue DESC NULLS LAST
    LIMIT {{limit}}`,
    params: {
      store_id: { type: 'string', description: 'ID cửa hàng cụ thể', required: false },
    },
    max_rows: 50,
    labels: { est_revenue: 'Doanh thu ước tính (VND) - KHÔNG phải doanh thu thực', estimated_pct: 'Tỷ lệ ước tính (%)' },
    caveats: '⚠️ est_revenue là doanh thu ƯỚC TÍNH dựa trên tồn kho đã bán, KHÔNG phải doanh thu thực tế POS.',
  },

  category_pl: {
    name: 'category_pl',
    description: 'P&L theo danh mục sản phẩm.',
    sql: `SELECT * FROM v_category_pl_summary
    WHERE tenant_id = '{{tenant_id}}'::uuid
    ORDER BY net_revenue DESC NULLS LAST
    LIMIT {{limit}}`,
    params: {
      months: { type: 'number', description: 'Số tháng', required: false, default: 6 },
    },
    max_rows: 50,
    labels: {},
  },

  rfm_analysis: {
    name: 'rfm_analysis',
    description: 'Phân tích RFM segments: số lượng, giá trị, đặc điểm từng segment.',
    sql: `SELECT * FROM v_cdp_rfm_segment_summary
    WHERE tenant_id = '{{tenant_id}}'::uuid
    LIMIT 20`,
    params: {},
    max_rows: 20,
    labels: {},
    caveats: '⚠️ Customer linking ~7.6%',
  },
};

/**
 * Build SQL from template + params. Returns validated SQL string.
 */
export function buildTemplateSQL(templateName: string, params: Record<string, unknown>, tenantId: string): { sql: string; error?: string } {
  const template = QUERY_TEMPLATES[templateName];
  if (!template) return { sql: '', error: `Unknown template: ${templateName}` };

  let sql = template.sql;

  // Replace tenant_id
  sql = sql.replace(/\{\{tenant_id\}\}/g, tenantId);

  // Replace limit
  const limit = Math.min(Number(params.limit) || template.max_rows, template.max_rows);
  sql = sql.replace(/\{\{limit\}\}/g, String(limit));

  // Template-specific param handling
  switch (templateName) {
    case 'revenue_time_series': {
      const gran = params.granularity || 'day';
      const granMap: Record<string, string> = {
        day: "grain_date::text",
        week: "to_char(date_trunc('week', grain_date), 'YYYY-\"W\"IW')",
        month: "to_char(grain_date, 'YYYY-MM')",
      };
      sql = sql.replace('{{granularity_expr}}', granMap[gran as string] || granMap.day);
      sql = sql.replace('{{days}}', String(Math.min(Number(params.days) || 30, 365)));
      // Optional channel filter
      if (params.channel) {
        sql = sql.replace("dimension_type = 'total'", `dimension_type = 'channel' AND dimension_value ILIKE '%${sanitize(params.channel as string)}%'`);
      }
      break;
    }
    case 'channel_monthly_detail': {
      const channelFilter = params.channel ? `AND channel ILIKE '%${sanitize(params.channel as string)}%'` : '';
      sql = sql.replace('{{channel_filter}}', channelFilter);
      break;
    }
    case 'product_deep_dive': {
      const filters: string[] = [];
      if (params.product_name) filters.push(`AND p.name ILIKE '%${sanitize(params.product_name as string)}%'`);
      if (params.category) filters.push(`AND p.category ILIKE '%${sanitize(params.category as string)}%'`);
      sql = sql.replace('{{product_filter}}', filters.join(' '));
      sql = sql.replace('{{days}}', String(Math.min(Number(params.days) || 30, 365)));
      break;
    }
    case 'customer_segment_detail': {
      const segFilter = params.segment ? `AND segment = '${sanitize(params.segment as string)}'` : '';
      sql = sql.replace('{{segment_filter}}', segFilter);
      break;
    }
    case 'expense_breakdown': {
      const catFilter = params.category ? `AND category ILIKE '%${sanitize(params.category as string)}%'` : '';
      sql = sql.replace('{{category_filter}}', catFilter);
      break;
    }
    case 'alert_history': {
      const sevFilter = params.severity ? `AND severity = '${sanitize(params.severity as string)}'` : '';
      const catFilter2 = params.category ? `AND category ILIKE '%${sanitize(params.category as string)}%'` : '';
      sql = sql.replace('{{severity_filter}}', sevFilter);
      sql = sql.replace('{{category_filter}}', catFilter2);
      sql = sql.replace('{{days}}', String(Math.min(Number(params.days) || 30, 365)));
      break;
    }
    case 'cohort_deep_dive': {
      const cohortFilter = params.cohort_month ? `AND cohort_month = '${sanitize(params.cohort_month as string)}'` : '';
      sql = sql.replace('{{cohort_filter}}', cohortFilter);
      break;
    }
    case 'store_performance': {
      const storeFilter = params.store_id ? `AND s.id = '${sanitize(params.store_id as string)}'::uuid` : '';
      sql = sql.replace('{{store_filter}}', storeFilter);
      break;
    }
    default:
      break;
  }

  // Clean up any remaining unused placeholders
  sql = sql.replace(/\{\{[a-z_]+\}\}/g, '');

  return { sql };
}

/** Simple sanitize to prevent SQL injection in template params */
function sanitize(input: string): string {
  return input.replace(/[';\-\\]/g, '').trim().slice(0, 100);
}


// ─── TIER 3: Queryable Views Whitelist ──────────────────────────────

export const CDP_QUERYABLE_VIEWS = [
  // L2 Master
  'cdp_orders', 'cdp_customers', 'cdp_order_items', 'products',
  // L3 KPI
  'kpi_facts_daily',
  // L4 Alert & CDP Equity
  'alert_instances', 'cdp_customer_equity_computed',
  // CDP Views
  'v_cdp_ltv_by_cohort', 'v_cdp_ltv_by_source', 'v_cdp_ltv_summary',
  'v_cdp_equity_distribution', 'v_cdp_equity_overview', 'v_cdp_equity_drivers',
  'v_cdp_population_catalog', 'v_cdp_rfm_segments', 'v_cdp_rfm_segment_summary',
  // Financial Views
  'v_pl_monthly_summary', 'v_channel_pl_summary', 'v_category_pl_summary',
  'v_cash_flow_monthly', 'v_expenses_by_category_monthly',
  'v_fdp_truth_snapshot', 'v_ct_truth_snapshot', 'v_executive_health_scores',
  // Marketing Views
  'v_mdp_truth_snapshot', 'v_mdp_ceo_snapshot', 'v_mdp_campaign_performance',
  // Store/Inventory Views
  'inv_stores', 'v_inv_store_revenue', 'v_inv_store_metrics',
  // Products
  'v_top_products_30d',
] as const;

export type CDPQueryableView = typeof CDP_QUERYABLE_VIEWS[number];

// Forbidden SQL patterns
const FORBIDDEN_PATTERNS = [
  /\bINSERT\b/i, /\bUPDATE\b/i, /\bDELETE\b/i, /\bDROP\b/i,
  /\bALTER\b/i, /\bCREATE\b/i, /\bTRUNCATE\b/i, /\bGRANT\b/i,
  /\bREVOKE\b/i, /\bEXECUTE\b/i, /--/, /\/\*/, /;/,
];

export function validateSQL(sql: string): { valid: boolean; error?: string } {
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT')) return { valid: false, error: 'Only SELECT queries are allowed' };

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sql)) return { valid: false, error: `Forbidden pattern detected: ${pattern}` };
  }

  const tableMatches: string[] = [];
  const allFromMatches = sql.matchAll(/\bFROM\s+([a-z_][a-z_0-9]*)/gi);
  for (const m of allFromMatches) {
    const matchIndex = m.index ?? 0;
    const preceding = sql.slice(Math.max(0, matchIndex - 20), matchIndex);
    if (/\(\s*[A-Z_]+\s*$/i.test(preceding)) continue;
    tableMatches.push(m[1].toLowerCase());
  }
  const joinMatches = sql.matchAll(/\bJOIN\s+([a-z_][a-z_0-9]*)/gi);
  for (const m of joinMatches) tableMatches.push(m[1].toLowerCase());

  for (const tableName of tableMatches) {
    if (!CDP_QUERYABLE_VIEWS.includes(tableName as CDPQueryableView)) {
      return { valid: false, error: `Table/view '${tableName}' is not allowed` };
    }
  }
  return { valid: true };
}

export function injectTenantFilter(sql: string, tenantId: string): string {
  const fromMatch = sql.match(/\bFROM\s+([a-z_][a-z_0-9]*)\s+([a-z_][a-z_0-9]*)?/i);
  const qualifier = fromMatch?.[2] || fromMatch?.[1] || '';
  const tenantCol = qualifier ? `${qualifier}.tenant_id` : 'tenant_id';
  const tenantFilter = `${tenantCol} = '${tenantId}'::uuid`;

  const upperSql = sql.toUpperCase();
  if (upperSql.includes('WHERE')) return sql.replace(/WHERE/i, `WHERE ${tenantFilter} AND `);
  if (upperSql.includes('GROUP BY')) return sql.replace(/GROUP BY/i, `WHERE ${tenantFilter} GROUP BY`);
  if (upperSql.includes('ORDER BY')) return sql.replace(/ORDER BY/i, `WHERE ${tenantFilter} ORDER BY`);
  if (upperSql.includes('LIMIT')) return sql.replace(/LIMIT/i, `WHERE ${tenantFilter} LIMIT`);
  return `${sql} WHERE ${tenantFilter}`;
}

// Suggested questions
export const SUGGESTED_QUESTIONS = [
  'Tổng quan tình hình kinh doanh tháng này?',
  'So sánh doanh thu các kênh 30 ngày gần nhất?',
  'Top 10 sản phẩm bán chạy nhất?',
  'Xu hướng doanh thu 6 tháng theo tuần?',
  'Kênh nào có biên lợi nhuận cao nhất?',
  'Có bao nhiêu alert critical đang mở?',
  'Phân tích LTV khách hàng theo cohort?',
  'Chi phí marketing và ROAS hiện tại?',
  'P&L theo tháng 6 tháng gần nhất?',
  'Cửa hàng nào có doanh thu cao nhất?',
];
