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
  return `Bạn là Bluecore AI Analyst — trợ lý phân tích tài chính & kinh doanh thân thiện cho CEO/CFO.

## PHONG CÁCH TRẢ LỜI — LINH HOẠT THEO LOẠI CÂU HỎI
1. **Chào hỏi / trò chuyện**: Trả lời tự nhiên, thân thiện. Không cần data hay tool.
2. **Câu hỏi nhanh** (VD: "doanh thu tháng này?"): Trả lời ngắn 2-3 câu với số liệu chính.
3. **Câu hỏi phân tích** (VD: "tại sao margin giảm?"): Phân tích sâu, cross-domain, kèm chart nếu có >= 3 data points.

Trả lời bằng tiếng Việt. Dùng emoji tiêu đề để dễ đọc. Giọng văn tự nhiên, không máy móc.

## TOOLS
11 tools lấy dữ liệu LIVE. BẮT BUỘC gọi tool khi hỏi về số liệu. KHÔNG bịa số.
Câu hỏi cross-domain → gọi 2-3 tools cùng lúc. Không có tool phù hợp → dùng query_database.

## SCHEMA (dùng cho query_database)
★ kpi_facts_daily: grain_date, metric_code(NET_REVENUE/ORDER_COUNT/AOV/COGS/GROSS_MARGIN/AD_SPEND/ROAS), metric_value, dimension_type(total/channel), dimension_value
  ⚠️ Khi SUM: BẮT BUỘC filter dimension_type='total'. Khi phân tích theo kênh: filter dimension_type='channel'.
★ v_revenue_channel_daily: channel, order_date, total_gross_revenue, order_count
★ v_channel_pl_summary: channel, period, net_revenue, cogs, gross_margin, marketing_spend, contribution_margin, cm_percent, roas
★ v_pl_monthly_summary: year_month, gross_sales, net_sales, cogs, gross_profit, net_income
★ v_top_products_30d: ~13,000 SKU
★ v_cdp_ltv_summary, v_cdp_ltv_by_cohort, v_cdp_rfm_segment_summary (⚠️ linking 7.6%)
★ alert_instances, v_mdp_ceo_snapshot, v_mdp_platform_ads_summary
⚠️ v_financial_monthly_summary: TRỐNG, KHÔNG dùng.
Với query_database: tenant_id = '${tenantId}'

## METRIC CLASSIFICATION
CUMULATIVE (SUM): NET_REVENUE, ORDER_COUNT, AD_SPEND, COGS
AVERAGE/RATIO (weighted avg, KHÔNG SUM): AOV, ROAS, GROSS_MARGIN — AOV = Tổng Revenue / Tổng Orders
SNAPSHOT (latest): INVENTORY, CASH_POSITION

## QUY TẮC VÀNG
- **TUYỆT ĐỐI KHÔNG BỊA SỐ**: Nếu tool trả về data, CHỈ dùng số từ data đó. Nếu KHÔNG có data → nói rõ "Hiện chưa có dữ liệu về [X] trong hệ thống".
- **PHÂN BIỆT KHÁI NIỆM**: "Cửa hàng" ≠ "Kênh bán". Kênh = Shopee/Lazada/TikTok/Website. Cửa hàng = địa điểm vật lý. Không được nhầm lẫn. Nếu user hỏi về "cửa hàng" mà data chỉ có "kênh" → nói rõ "Hệ thống hiện có dữ liệu theo KÊNH BÁN, chưa có dữ liệu theo CỬA HÀNG" rồi gợi ý data kênh thay thế.
- **KHÔNG ĐOÁN MÒ**: Khi câu hỏi yêu cầu data không tồn tại trong hệ thống, PHẢI thừa nhận và gợi ý data có sẵn gần nhất.
- Format VND: <1M → nguyên, 1M~999M → "X triệu", 1B~999B → "X tỷ". 27,980,066,895 = 28 TỶ.
- Doanh thu LUÔN đi kèm COGS/margin. Marketing = Contribution Margin, không chỉ ROAS.
- ⚠️ Customer linking 7.6%, Expenses = 0 → nêu rõ hạn chế.
- Phát hiện rủi ro → đề xuất STOP/INVEST/INVESTIGATE.
- Cross-check: Revenue↑ + Margin↓ = chi phí↑. Orders↑ + AOV↓ = bán rẻ hơn.

## CHART
Khi có >= 3 data points, kèm chart:
\`\`\`chart
{"type":"bar","title":"...","data":[...],"series":[{"key":"value","name":"...","color":"#3b82f6"}],"xKey":"label","yFormat":"vnd"}
\`\`\`
Types: bar, line, composed (mỗi series cần "type"), pie. Max 12-15 points. yFormat: "vnd"|"percent"|"number".`;
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
        .limit(1000);
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

// ─── Lovable AI Gateway helper with retry ───────────────────────────
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

async function callAI(apiKey: string, body: Record<string, unknown>, maxRetries = 5): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: body.model || 'google/gemini-2.5-pro',
        messages: body.messages,
        tools: body.tools,
        tool_choice: body.tool_choice,
        stream: body.stream,
        max_tokens: body.max_tokens,
        temperature: body.temperature,
      }),
    });
    if (resp.status !== 429 || attempt === maxRetries) return resp;
    const retryAfter = resp.headers.get('retry-after');
    const waitSec = retryAfter ? Math.min(parseInt(retryAfter, 10) || 5, 30) : Math.min(2 ** attempt * 3, 30);
    console.warn(`[cdp-qa] 429 rate limit, retry ${attempt + 1}/${maxRetries} in ${waitSec}s`);
    await new Promise(r => setTimeout(r, waitSec * 1000));
  }
  throw new Error('Max retries exceeded');
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

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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

    // ─── Simple query detection: skip Pass 1 for greetings/chat ───
    const lastUserMsg = userMessages[userMessages.length - 1]?.content?.toLowerCase() || '';
    const isSimpleChat = /^(xin chào|hello|hi|chào|hey|cảm ơn|thank|ok|được|tốt|bye|tạm biệt|bạn là ai|bạn có thể làm gì|giúp gì|help)\b/i.test(lastUserMsg.trim()) 
      || lastUserMsg.trim().length < 10;

    let allToolResults: { name: string; result: ToolResult }[] = [];
    let turnCount = 0;

    if (!isSimpleChat) {
    // ─── Pass 1: Tool-calling (non-streaming, max 2 turns) ────────
    // Uses faster model for tool selection only
    const MAX_TURNS = 2;
    let conversationMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...userMessages,
    ];

    while (turnCount < MAX_TURNS) {
      turnCount++;
      const pass1Resp = await callAI(apiKey, {
        model: 'google/gemini-2.5-flash',
        messages: conversationMessages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        stream: false,
        max_tokens: 1024,
        temperature: 0.1,
      });

      if (!pass1Resp.ok) {
        const errResp = handleAIError(pass1Resp.status);
        if (pass1Resp.status === 429 || pass1Resp.status === 402) return errResp;
        const t = await pass1Resp.text();
        console.error('[cdp-qa] Pass 1 error:', pass1Resp.status, t);
        break;
      }

      const pass1Data = await pass1Resp.json();
      const choice = pass1Data.choices?.[0];
      const assistantMsg = choice?.message;

      if (!assistantMsg?.tool_calls?.length) {
        // No tools needed
        break;
      }

      // Add assistant message with tool_calls to conversation
      conversationMessages.push(assistantMsg);

      // Execute tools in parallel
      const toolPromises = assistantMsg.tool_calls.map(async (tc: any) => {
        const toolName = tc.function.name;
        let toolArgs = {};
        try { toolArgs = JSON.parse(tc.function.arguments || '{}'); } catch { /* empty */ }
        console.log(`[cdp-qa] Tool call: ${toolName}`, toolArgs);
        const result = await executeTool(supabase, activeTenantId!, toolName, toolArgs);
        allToolResults.push({ name: toolName, result });
        return { id: tc.id, name: toolName, result };
      });

      const toolOutputs = await Promise.all(toolPromises);
      // Add tool results as tool messages (OpenAI format)
      for (const to of toolOutputs) {
        conversationMessages.push({
          role: 'tool',
          tool_call_id: to.id,
          content: JSON.stringify(to.result),
        });
      }
    }
    } // end if (!isSimpleChat)

    // ─── Pass 2: Streaming answer ─────────────────────────────────
    const pass2Messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...userMessages,
    ];

    if (allToolResults.length > 0) {
      const toolSummary = allToolResults.map(tr =>
        `[${tr.name}] source=${tr.result.source}, rows=${tr.result.rows}${tr.result.period ? `, period=${tr.result.period}` : ''}${tr.result.note ? `, note=${tr.result.note}` : ''}\nData: ${JSON.stringify(tr.result.data)}`
      ).join('\n\n');

      pass2Messages.push({
        role: 'user',
        content: `[HỆ THỐNG - KHÔNG HIỂN THỊ CHO NGƯỜI DÙNG]
Dưới đây là dữ liệu đã truy vấn từ database. Hãy dùng dữ liệu này để trả lời câu hỏi phía trên.

${toolSummary}

BẮT BUỘC TUÂN THỦ:

1. XÁC ĐỊNH loại metric (cumulative/average/snapshot) rồi áp dụng cách tính ĐÚNG theo quy tắc PHÂN LOẠI METRIC ở system prompt.
2. KHÔNG ÁP DỤNG CÙNG MỘT TEMPLATE CHO MỌI CÂU HỎI.

Với CUMULATIVE metrics (Revenue, Orders, Ad Spend, COGS):
- Tổng kỳ, tăng trưởng MoM, tháng đỉnh/đáy, nguyên nhân

Với AVERAGE/RATIO metrics (AOV, ROAS, Margin):
- KHÔNG BAO GIỜ tính "tổng AOV" hay "tổng ROAS" — vô nghĩa
- Weighted average qua kỳ (AOV = Tổng Revenue / Tổng Orders)
- Xu hướng lên/xuống và ý nghĩa kinh doanh
- VD: AOV giảm + Orders tăng = bán rẻ hơn nhưng nhiều hơn → margin bị ảnh hưởng?

Với SNAPSHOT metrics (Inventory, Cash):
- Giá trị hiện tại và thay đổi so với kỳ trước

3. PHÂN TÍCH CROSS-DOMAIN (quan trọng nhất):
- Revenue tăng nhưng AOV giảm → đang bán rẻ?
- Orders tăng nhưng Margin giảm → chi phí tăng?
- ROAS tốt nhưng cash chậm → rủi ro dòng tiền?

4. KẾT LUẬN phải là HÀNH ĐỘNG cụ thể cho CEO/CFO, không phải tóm tắt số.

5. Nếu data có >= 3 data points, PHẢI kèm chart block.

TUYỆT ĐỐI KHÔNG được chỉ liệt kê số rồi dừng. Người dùng cần PHÂN TÍCH và HÀNH ĐỘNG.`,
      });
    }

    const pass2Resp = await callAI(apiKey, {
      model: 'google/gemini-2.5-pro',
      messages: pass2Messages,
      stream: true,
      max_tokens: 10000,
      temperature: 0.4,
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

    // Lovable AI returns OpenAI-compatible SSE — pass through directly
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
