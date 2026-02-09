import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Types ───────────────────────────────────────────────────────────
interface Message { role: 'user' | 'assistant' | 'system' | 'tool'; content: string; tool_call_id?: string; }
interface RequestBody { messages: Message[]; tenantId?: string; }
interface ToolResult { data: unknown; source: string; rows: number; period?: string; note?: string; }

// ─── Tool Definitions (OpenAI function-calling format) ───────────────
const TOOL_DEFINITIONS = [
  {
    type: 'function', function: {
      name: 'get_revenue_kpis', description: 'Lấy KPI doanh thu: NET_REVENUE, ORDER_COUNT, AOV theo ngày. Dùng khi hỏi về doanh thu, đơn hàng, AOV.',
      parameters: { type: 'object', properties: { days: { type: 'number', description: 'Số ngày gần nhất (mặc định 30)', default: 30 } }, required: [] },
    },
  },
  {
    type: 'function', function: {
      name: 'get_profitability', description: 'Lấy COGS và GROSS_MARGIN theo ngày. Dùng khi hỏi về lợi nhuận, chi phí hàng bán, biên lợi nhuận.',
      parameters: { type: 'object', properties: { days: { type: 'number', default: 30 } }, required: [] },
    },
  },
  {
    type: 'function', function: {
      name: 'get_channel_breakdown', description: 'Doanh thu/đơn hàng CHIA THEO KÊNH (Shopee, Lazada, TikTok, Website...). Dùng khi hỏi kênh nào bán tốt nhất.',
      parameters: { type: 'object', properties: { days: { type: 'number', default: 30 } }, required: [] },
    },
  },
  {
    type: 'function', function: {
      name: 'get_marketing_kpis', description: 'Chi phí quảng cáo (AD_SPEND), ROAS, AD_IMPRESSIONS. Dùng khi hỏi về marketing, ads, hiệu quả quảng cáo.',
      parameters: { type: 'object', properties: { days: { type: 'number', default: 30 } }, required: [] },
    },
  },
  {
    type: 'function', function: {
      name: 'get_top_products', description: 'Top sản phẩm theo doanh thu 30 ngày gần nhất. Dùng khi hỏi sản phẩm bán chạy, top SKU.',
      parameters: { type: 'object', properties: { limit: { type: 'number', default: 10 } }, required: [] },
    },
  },
  {
    type: 'function', function: {
      name: 'get_inventory_health', description: 'Tồn kho hiện tại: sản phẩm có stock > 0. Dùng khi hỏi về tồn kho, hàng tồn.',
      parameters: { type: 'object', properties: { limit: { type: 'number', default: 20 } }, required: [] },
    },
  },
  {
    type: 'function', function: {
      name: 'get_active_alerts', description: 'Cảnh báo đang mở (open). Dùng khi hỏi "có vấn đề gì?", "alert nào đang mở?".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function', function: {
      name: 'get_customer_overview', description: 'Tổng hợp LTV khách hàng, segments, at-risk. Lưu ý: linking 7.6% nên kết quả mang tính tham khảo.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function', function: {
      name: 'get_cohort_analysis', description: 'Phân tích LTV theo cohort (tháng đầu mua). Dùng khi hỏi retention, cohort, LTV theo nhóm.',
      parameters: { type: 'object', properties: { limit: { type: 'number', default: 20 } }, required: [] },
    },
  },
  {
    type: 'function', function: {
      name: 'get_channel_pl', description: 'P&L theo kênh bán hàng (revenue, COGS, margin, fee). Dùng khi hỏi lãi/lỗ theo kênh.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function', function: {
      name: 'query_database', description: 'Truy vấn SQL tùy chỉnh cho câu hỏi phức tạp. CHỈ dùng SELECT trên các view v_* hoặc bảng được phép. Luôn filter theo tenant_id.',
      parameters: {
        type: 'object',
        properties: { sql: { type: 'string', description: 'Câu SQL SELECT. PHẢI có WHERE tenant_id = \'<TENANT_ID>\'. Chỉ dùng bảng/view được phép.' } },
        required: ['sql'],
      },
    },
  },
];

// ─── System Prompt ──────────────────────────────────────────────────
function buildSystemPrompt(tenantId: string): string {
  return `Bạn là Bluecore AI Analyst — trợ lý phân tích tài chính & kinh doanh cho CEO/CFO.
Trả lời bằng tiếng Việt, ngắn gọn, decision-grade.

## TOOLS — BẮT BUỘC
Bạn có 11 tools để lấy dữ liệu LIVE từ database. BẮT BUỘC gọi tool trước khi trả lời bất kỳ câu hỏi nào liên quan đến dữ liệu kinh doanh.
- Câu hỏi đơn giản (doanh thu, đơn hàng): gọi 1 tool
- Câu hỏi cross-domain (tại sao doanh thu giảm?): gọi 2-3 tools cùng lúc
- Chào hỏi / câu hỏi chung: không cần tool
- KHÔNG BAO GIỜ tự bịa số liệu. Nếu không có tool phù hợp, dùng query_database.
- LUÔN LUÔN gọi tool khi người dùng hỏi về số liệu, KPI, doanh thu, chi phí, sản phẩm, khách hàng.

## SCHEMA CATALOG (Top 20) — CỘT CHÍNH XÁC
=== TÀI CHÍNH ===
kpi_facts_daily: KPI theo ngày. Cols: tenant_id, grain_date, metric_code(NET_REVENUE/ORDER_COUNT/AOV/COGS/GROSS_MARGIN/AD_SPEND/ROAS), metric_value, dimension_type(total/channel), dimension_value
v_pl_monthly_summary: P&L hàng tháng. Cols: tenant_id, period_year, period_month, year_month, gross_sales, net_sales, cogs, gross_profit, total_opex, operating_income, net_income, gross_margin_pct, net_sales_m, cogs_m, gross_profit_m
v_financial_monthly_summary: Tổng hợp tài chính hàng tháng. Cols: tenant_id, period_month(date), invoice_revenue, invoice_paid, invoice_count, total_expense, cogs, salary_expense, marketing_expense
v_channel_pl_summary: P&L theo kênh. Cols: tenant_id, channel, period, order_count, unique_customers, gross_revenue, net_revenue, cogs, gross_margin, marketing_spend, contribution_margin, cm_percent, roas
v_fdp_truth_snapshot: Snapshot tài chính. Cols: tenant_id, snapshot_at, period_start, period_end, net_revenue, gross_profit, gross_margin_pct, contribution_margin, aov, total_orders

=== ĐƠN HÀNG ===
v_channel_daily_revenue: Doanh thu kênh theo ngày. Cols: tenant_id, channel, revenue_date, order_count, gross_revenue, net_revenue, cogs, gross_margin, avg_order_value
v_variance_orders_monthly: Biến động đơn hàng theo tháng
v_base_order_metrics: Metrics cơ bản đơn hàng

=== KHÁCH HÀNG ===
v_cdp_ltv_summary: Tổng hợp LTV (segments, at-risk). ⚠️ linking 7.6%
v_cdp_ltv_by_cohort: LTV theo cohort. 82 cohorts
v_cdp_ltv_by_source: LTV theo nguồn
v_cdp_rfm_segment_summary: Phân khúc RFM. 3 segments
v_cdp_customer_research: Tra cứu khách hàng chi tiết
v_cdp_equity_overview: Tổng quan giá trị khách hàng

=== SẢN PHẨM ===
v_top_products_30d: Top sản phẩm 30 ngày. ~13,000 SKU
v_cdp_product_benchmark: Benchmark sản phẩm

=== MARKETING ===
v_mdp_ceo_snapshot: Snapshot marketing cho CEO
v_mdp_platform_ads_summary: Tổng hợp quảng cáo theo nền tảng

=== CẢNH BÁO & CHẤT LƯỢNG ===
alert_instances: Cảnh báo đang mở
v_cdp_data_quality: Chất lượng dữ liệu CDP

⚠️ QUAN TRỌNG: Khi dùng query_database, PHẢI dùng ĐÚNG tên cột như liệt kê ở trên. KHÔNG đoán tên cột.
Với query_database, dùng tenant_id = '${tenantId}'

## QUY TẮC PHÂN TÍCH
1. SO SÁNH: Tăng/giảm bao nhiêu % so với kỳ trước?
2. NGUYÊN NHÂN: Nếu biến động > 10%, xác định kênh/sản phẩm gây ra
3. CROSS-CHECK: Doanh thu tăng + margin giảm = chi phí tăng. Đơn tăng + AOV giảm = bán rẻ hơn
4. ANOMALY: Số nào bất thường so với trung bình?
5. Format tiền VND (triệu, tỷ) cho dễ đọc

## QUY TẮC KINH DOANH (FDP/MDP)
- Doanh thu LUÔN phải đi kèm COGS/margin
- SKU margin âm + khóa cash → đề xuất STOP
- Giá trị marketing = Contribution Margin, không chỉ ROAS
- ROAS tốt + thu tiền chậm = RỦI RO

## ĐỘ TIN CẬY DỮ LIỆU
- ⚠️ Customer linking = 7.6% → "Dữ liệu khách hàng chưa đầy đủ, kết quả mang tính tham khảo"
- ⚠️ Expenses = 0 → "Chưa có dữ liệu chi phí, không thể tính Net Profit"
- ⚠️ Cash = 0 → "Chưa có dữ liệu dòng tiền"

## OUTPUT FORMAT
- Dùng emoji tiêu đề để dễ đọc
- Nếu phát hiện rủi ro: đề xuất hành động (STOP/INVEST/INVESTIGATE)
- Nêu rõ nguồn dữ liệu và kỳ thời gian
- Nếu data không đủ: nói rõ thiếu gì, KHÔNG bịa số

## CHART OUTPUT
Khi dữ liệu phù hợp để vẽ biểu đồ (trend, so sánh, phân bổ), trả về JSON trong block \`\`\`chart:
- Bar chart: so sánh theo tháng, theo kênh
- Line chart: trend theo thời gian
- Composed chart: bar + line kết hợp (VD: doanh thu bar + margin line)
- Pie chart: phân bổ tỷ lệ

Format:
\`\`\`chart
{"type":"bar","title":"Tiêu đề","data":[{"label":"T01","value":55960}],"series":[{"key":"value","name":"Doanh thu","color":"#3b82f6"}],"xKey":"label","yFormat":"vnd"}
\`\`\`

Lưu ý:
- VẪN kèm phân tích text trước/sau chart
- Mỗi chart tối đa 12-15 data points
- Luôn có title và đơn vị (yFormat: "vnd" | "percent" | "number")
- Composed chart: mỗi series cần "type": "bar" hoặc "line"
- Có thể trả về nhiều chart trong 1 câu trả lời`;
}

// ─── Tool Execution ─────────────────────────────────────────────────
async function executeTool(supabase: any, tenantId: string, name: string, args: Record<string, any>): Promise<ToolResult> {
  const days = args.days || 30;
  const limit = args.limit || 10;
  const fromDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  switch (name) {
    case 'get_revenue_kpis': {
      const { data, error } = await supabase
        .from('kpi_facts_daily')
        .select('grain_date, metric_code, metric_value, dimension_value')
        .eq('tenant_id', tenantId)
        .in('metric_code', ['NET_REVENUE', 'ORDER_COUNT', 'AOV'])
        .eq('dimension_type', 'total')
        .gte('grain_date', fromDate)
        .order('grain_date', { ascending: false })
        .limit(200);
      if (error) return { data: null, source: 'kpi_facts_daily', rows: 0, note: `Error: ${error.message}` };
      return { data, source: 'kpi_facts_daily', rows: data.length, period: `${days} ngày gần nhất` };
    }

    case 'get_profitability': {
      const { data, error } = await supabase
        .from('kpi_facts_daily')
        .select('grain_date, metric_code, metric_value')
        .eq('tenant_id', tenantId)
        .in('metric_code', ['COGS', 'GROSS_MARGIN'])
        .eq('dimension_type', 'total')
        .gte('grain_date', fromDate)
        .order('grain_date', { ascending: false })
        .limit(200);
      if (error) return { data: null, source: 'kpi_facts_daily', rows: 0, note: `Error: ${error.message}` };
      return { data, source: 'kpi_facts_daily', rows: data.length, period: `${days} ngày` };
    }

    case 'get_channel_breakdown': {
      const { data, error } = await supabase
        .from('kpi_facts_daily')
        .select('grain_date, metric_code, metric_value, dimension_value')
        .eq('tenant_id', tenantId)
        .eq('dimension_type', 'channel')
        .in('metric_code', ['NET_REVENUE', 'ORDER_COUNT', 'AOV'])
        .gte('grain_date', fromDate)
        .order('grain_date', { ascending: false })
        .limit(500);
      if (error) return { data: null, source: 'kpi_facts_daily', rows: 0, note: `Error: ${error.message}` };
      return { data, source: 'kpi_facts_daily (channel)', rows: data.length, period: `${days} ngày` };
    }

    case 'get_marketing_kpis': {
      const { data, error } = await supabase
        .from('kpi_facts_daily')
        .select('grain_date, metric_code, metric_value, dimension_value')
        .eq('tenant_id', tenantId)
        .in('metric_code', ['AD_SPEND', 'ROAS', 'AD_IMPRESSIONS'])
        .gte('grain_date', fromDate)
        .order('grain_date', { ascending: false })
        .limit(300);
      if (error) return { data: null, source: 'kpi_facts_daily', rows: 0, note: `Error: ${error.message}` };
      return { data, source: 'kpi_facts_daily (marketing)', rows: data.length, period: `${days} ngày` };
    }

    case 'get_top_products': {
      const { data, error } = await supabase
        .from('v_top_products_30d')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('total_revenue', { ascending: false })
        .limit(limit);
      if (error) return { data: null, source: 'v_top_products_30d', rows: 0, note: `Error: ${error.message}` };
      return { data, source: 'v_top_products_30d', rows: data.length, period: '30 ngày' };
    }

    case 'get_inventory_health': {
      const { data, error } = await supabase
        .from('products')
        .select('name, sku, stock_quantity, retail_price, cost_price, category')
        .eq('tenant_id', tenantId)
        .gt('stock_quantity', 0)
        .order('stock_quantity', { ascending: false })
        .limit(limit);
      if (error) return { data: null, source: 'products', rows: 0, note: `Error: ${error.message}` };
      return { data, source: 'products', rows: data.length };
    }

    case 'get_active_alerts': {
      const { data, error } = await supabase
        .from('alert_instances')
        .select('title, severity, category, impact_amount, message, suggested_action, created_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'open')
        .order('severity', { ascending: true })
        .limit(20);
      if (error) return { data: null, source: 'alert_instances', rows: 0, note: `Error: ${error.message}` };
      return { data, source: 'alert_instances', rows: data.length };
    }

    case 'get_customer_overview': {
      const { data, error } = await supabase
        .from('v_cdp_ltv_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(5);
      if (error) return { data: null, source: 'v_cdp_ltv_summary', rows: 0, note: `Error: ${error.message}` };
      return { data, source: 'v_cdp_ltv_summary', rows: data.length, note: '⚠️ Customer linking = 7.6%, kết quả mang tính tham khảo' };
    }

    case 'get_cohort_analysis': {
      const { data, error } = await supabase
        .from('v_cdp_ltv_by_cohort')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('cohort_month', { ascending: false })
        .limit(limit);
      if (error) return { data: null, source: 'v_cdp_ltv_by_cohort', rows: 0, note: `Error: ${error.message}` };
      return { data, source: 'v_cdp_ltv_by_cohort', rows: data.length, note: '⚠️ Customer linking = 7.6%' };
    }

    case 'get_channel_pl': {
      const { data, error } = await supabase
        .from('v_channel_pl_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(50);
      if (error) return { data: null, source: 'v_channel_pl_summary', rows: 0, note: `Error: ${error.message}` };
      return { data, source: 'v_channel_pl_summary', rows: data.length };
    }

    case 'query_database': {
      let sql = args.sql || '';
      // Inject tenant_id if placeholder present
      sql = sql.replace(/<TENANT_ID>/g, tenantId);
      const { data, error } = await supabase.rpc('execute_readonly_query', { query_text: sql });
      if (error) return { data: null, source: 'execute_readonly_query', rows: 0, note: `SQL Error: ${error.message}` };
      const result = Array.isArray(data) ? data : [];
      return { data: result.slice(0, 100), source: 'execute_readonly_query', rows: result.length };
    }

    default:
      return { data: null, source: 'unknown', rows: 0, note: `Unknown tool: ${name}` };
  }
}

// ─── AI Gateway helper ──────────────────────────────────────────────
async function callAI(apiKey: string, body: Record<string, unknown>): Promise<Response> {
  return await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function handleAIError(status: number): Response {
  if (status === 429) return new Response(JSON.stringify({ error: 'Quá nhiều request, vui lòng thử lại sau' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (status === 402) return new Response(JSON.stringify({ error: 'Hết credits AI' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({ error: 'Lỗi AI' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ─── Main Handler ───────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { messages, tenantId }: RequestBody = await req.json();
    if (!messages?.length) return new Response(JSON.stringify({ error: 'No messages provided' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Invalid authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Tenant resolution
    const headerTenantId = req.headers.get('x-tenant-id') || undefined;
    let activeTenantId = headerTenantId || tenantId;
    if (!activeTenantId) {
      const { data: profile } = await supabase.from('profiles').select('active_tenant_id').eq('id', user.id).maybeSingle();
      activeTenantId = profile?.active_tenant_id;
    }
    if (!activeTenantId) return new Response(JSON.stringify({ error: 'No tenant selected' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const systemPrompt = buildSystemPrompt(activeTenantId);
    const userMessages = messages.slice(-6);

    // ─── Pass 1: Tool-calling (non-streaming, max 2 turns) ────────
    let conversationMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...userMessages,
    ];
    let allToolResults: { name: string; result: ToolResult }[] = [];
    let turnCount = 0;
    const MAX_TURNS = 2;

    while (turnCount < MAX_TURNS) {
      turnCount++;
      const pass1Resp = await callAI(apiKey, {
        model: 'gpt-4o',
        messages: conversationMessages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        stream: false,
        max_tokens: 800,
        temperature: 0.1,
      });

      if (!pass1Resp.ok) {
        const errResp = handleAIError(pass1Resp.status);
        if (pass1Resp.status === 429 || pass1Resp.status === 402) return errResp;
        const t = await pass1Resp.text();
        console.error('[cdp-qa] Pass 1 error:', pass1Resp.status, t);
        // Fallback: skip tool-calling, go direct to Pass 2
        break;
      }

      const pass1Data = await pass1Resp.json();
      const choice = pass1Data.choices?.[0];
      if (!choice) break;

      const toolCalls = choice.message?.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // No tools needed — AI wants to answer directly
        // If we already have tool results, move to Pass 2
        // If no tool results and AI gave content, use it directly
        if (allToolResults.length === 0 && choice.message?.content) {
          // Simple answer (greeting, etc.) — stream it via Pass 2 for consistency
        }
        break;
      }

      // Execute tools in parallel
      conversationMessages.push(choice.message);
      const toolPromises = toolCalls.map(async (tc: any) => {
        const toolName = tc.function.name;
        let toolArgs: Record<string, any> = {};
        try { toolArgs = JSON.parse(tc.function.arguments || '{}'); } catch { /* empty */ }
        console.log(`[cdp-qa] Tool call: ${toolName}`, toolArgs);
        const result = await executeTool(supabase, activeTenantId!, toolName, toolArgs);
        allToolResults.push({ name: toolName, result });
        return { id: tc.id, name: toolName, result };
      });

      const toolOutputs = await Promise.all(toolPromises);
      for (const to of toolOutputs) {
        conversationMessages.push({
          role: 'tool',
          tool_call_id: to.id,
          content: JSON.stringify(to.result),
        });
      }
    }

    // ─── Pass 2: Streaming answer ─────────────────────────────────
    // Build Pass 2 messages: system + user messages + tool context summary
    const pass2Messages: any[] = [{ role: 'system', content: systemPrompt }];

    if (allToolResults.length > 0) {
      // Inject tool results as a system context message
      const toolSummary = allToolResults.map(tr =>
        `[${tr.name}] source=${tr.result.source}, rows=${tr.result.rows}${tr.result.period ? `, period=${tr.result.period}` : ''}${tr.result.note ? `, note=${tr.result.note}` : ''}\nData: ${JSON.stringify(tr.result.data)}`
      ).join('\n\n');

      pass2Messages.push({
        role: 'system',
        content: `DỮ LIỆU ĐÃ TRUY VẤN (dùng để trả lời, KHÔNG bịa thêm):\n\n${toolSummary}`,
      });
    }

    pass2Messages.push(...userMessages);

    const pass2Resp = await callAI(apiKey, {
      model: 'gpt-4o',
      messages: pass2Messages,
      stream: true,
      max_tokens: 2000,
      temperature: 0.3,
    });

    if (!pass2Resp.ok) {
      const errResp = handleAIError(pass2Resp.status);
      if (pass2Resp.status === 429 || pass2Resp.status === 402) return errResp;
      const t = await pass2Resp.text();
      console.error('[cdp-qa] Pass 2 error:', pass2Resp.status, t);
      return new Response(JSON.stringify({ error: 'Lỗi AI' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('[cdp-qa] 2-pass complete', {
      tenant: activeTenantId,
      toolsUsed: allToolResults.map(t => t.name),
      turns: turnCount,
    });

    return new Response(pass2Resp.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: unknown) {
    console.error('CDP-QA Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
