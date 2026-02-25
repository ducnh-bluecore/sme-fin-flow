import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  KNOWLEDGE_PACKS,
  QUERY_TEMPLATES,
  detectIntentPacks,
  buildTemplateSQL,
  validateSQL,
  injectTenantFilter,
  type KnowledgePack,
  type QueryTemplate,
} from '../_shared/cdp-schema.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Types ───────────────────────────────────────────────────────────
interface Message { role: 'user' | 'assistant' | 'system' | 'tool'; content: string; tool_call_id?: string; }
interface RequestBody { messages: Message[]; tenantId?: string; }
interface PackResult { pack: string; label: string; data: unknown; rows: number; drill_down_hint?: string; caveats?: string; }

// ─── TIER 1: Knowledge Pack Fetcher ─────────────────────────────────

async function fetchKnowledgePack(supabase: any, tenantId: string, packName: string): Promise<PackResult> {
  const pack = KNOWLEDGE_PACKS[packName];
  if (!pack) return { pack: packName, label: 'Unknown', data: null, rows: 0 };

  const allData: Record<string, unknown[]> = {};
  let totalRows = 0;

  // Fetch all sources in parallel
  const sourcePromises = pack.sources.map(async (src) => {
    try {
      let query = supabase.from(src.view).select(src.select || '*').eq('tenant_id', tenantId);

      // Special filters for specific packs
      if (packName === 'alerts') {
        query = query.eq('status', 'open').order('severity', { ascending: true });
      }
      if (packName === 'revenue') {
        // Calendar month: first day of current month, NOT last 30 days
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        query = query.in('metric_code', ['NET_REVENUE', 'ORDER_COUNT', 'AOV'])
          .eq('dimension_type', 'total')
          .gte('grain_date', firstOfMonth)
          .order('grain_date', { ascending: false });
      }

      if (src.orderBy) {
        const [col, dir] = src.orderBy.split('.');
        query = query.order(col, { ascending: dir !== 'desc' });
      }

      if (src.limit) query = query.limit(src.limit);

      const { data, error } = await query;
      if (error) {
        console.warn(`[cdp-qa] Pack ${packName}/${src.view} error:`, error.message);
        return { view: src.view, data: [], error: error.message };
      }
      return { view: src.view, data: data || [] };
    } catch (e) {
      console.warn(`[cdp-qa] Pack ${packName}/${src.view} exception:`, e);
      return { view: src.view, data: [], error: String(e) };
    }
  });

  const results = await Promise.all(sourcePromises);
  for (const r of results) {
    allData[r.view] = r.data;
    totalRows += r.data.length;
  }

  return {
    pack: pack.name,
    label: pack.label,
    data: pack.sources.length === 1 ? allData[pack.sources[0].view] : allData,
    rows: totalRows,
    drill_down_hint: pack.drill_down_hint,
  };
}

// ─── TIER 2: Focused Query Executor ─────────────────────────────────

async function executeFocusedQuery(supabase: any, tenantId: string, templateName: string, params: Record<string, unknown>): Promise<{ data: unknown; rows: number; labels: Record<string, string>; caveats?: string; error?: string }> {
  const template = QUERY_TEMPLATES[templateName];
  if (!template) return { data: null, rows: 0, labels: {}, error: `Unknown template: ${templateName}` };

  const { sql, error: buildError } = buildTemplateSQL(templateName, params, tenantId);
  if (buildError) return { data: null, rows: 0, labels: template.labels, error: buildError };

  console.log(`[cdp-qa] Tier 2 query: ${templateName}`, { params, sql: sql.slice(0, 200) });

  try {
    const { data, error } = await supabase.rpc('execute_readonly_query', { query_text: sql });
    if (error) return { data: null, rows: 0, labels: template.labels, error: error.message };
    const result = Array.isArray(data) ? data.slice(0, template.max_rows) : [];
    return { data: result, rows: result.length, labels: template.labels, caveats: template.caveats };
  } catch (e) {
    return { data: null, rows: 0, labels: template.labels, error: String(e) };
  }
}

// ─── Tool Definitions (Tier 2 + Tier 3 only) ────────────────────────

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'focused_query',
      description: `Truy vấn dữ liệu chi tiết bằng template có sẵn. Dùng khi Knowledge Pack data không đủ chi tiết (drill-down, time-series dài, filter cụ thể).

Available templates:
${Object.values(QUERY_TEMPLATES).map(t => `- ${t.name}: ${t.description} | Params: ${Object.entries(t.params).map(([k, v]) => `${k}(${v.type}${v.required ? ',required' : ''})`).join(', ')}`).join('\n')}`,
      parameters: {
        type: 'object',
        properties: {
          template: {
            type: 'string',
            description: 'Tên template',
            enum: Object.keys(QUERY_TEMPLATES),
          },
          params: {
            type: 'object',
            description: 'Parameters cho template',
          },
        },
        required: ['template'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_database',
      description: `[TIER 3 - FALLBACK] Truy vấn SQL tùy chỉnh. CHỈ dùng khi Knowledge Pack VÀ focused_query templates đều KHÔNG đủ. 
Phải ghi lý do tại sao Tier 1+2 không đủ.
CHỈ SELECT trên views được phép. Max 50 rows. tenant_id = '<TENANT_ID>'.`,
      parameters: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'SQL SELECT query' },
          reason: { type: 'string', description: 'Lý do tại sao Tier 1+2 không đủ cho câu hỏi này' },
        },
        required: ['sql', 'reason'],
      },
    },
  },
];

// ─── System Prompt ──────────────────────────────────────────────────

function buildSystemPrompt(tenantId: string): string {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
  const currentDate = now.toISOString().slice(0, 10);
  
  return `Bạn là Bluecore AI Analyst — trợ lý phân tích tài chính & kinh doanh cho CEO/CFO.

## NGÀY HIỆN TẠI: ${currentDate}
"Tháng này" = tháng ${now.getMonth() + 1}/${now.getFullYear()} (từ ngày 01 đến hôm nay ${currentDate}). KHÔNG phải 30 ngày gần nhất.

## DỮ LIỆU CỦA BẠN
Bạn được cung cấp [KNOWLEDGE PACKS] chứa dữ liệu THỰC từ database. Đây là nguồn sự thật duy nhất.
Knowledge Pack "revenue" đã chứa data calendar month (từ ngày 01 tháng này).

## 3-TIER DATA ACCESS
1. **Tier 1 (Knowledge Packs)**: Dữ liệu đã có sẵn trong [KNOWLEDGE PACKS] bên dưới. ƯU TIÊN dùng đầu tiên.
2. **Tier 2 (Focused Query)**: Nếu cần chi tiết hơn (drill-down, time-series, filter, PHÂN TÍCH THEO KÊNH) → GỌI focused_query NGAY.
3. **Tier 3 (Dynamic SQL)**: CHỈ khi Tier 1+2 KHÔNG đủ → gọi query_database. PHẢI ghi lý do.

## QUY TẮC VÀNG (BẮT BUỘC)
1. **KHÔNG BỊA SỐ**: CHỈ dùng số từ Knowledge Packs hoặc tool results. Không có → nói "chưa có dữ liệu".
2. **KHÔNG hiển thị tên bảng/SQL/metadata**: Chỉ trả lời KẾT QUẢ KINH DOANH.
3. **Trả lời bằng tiếng Việt**, trực tiếp vào vấn đề.
4. **Doanh thu LUÔN đi kèm chi phí/margin** khi có dữ liệu.
5. **Phân biệt**: revenue thực vs ước tính, SUM vs weighted average.
6. **Format VND**: <1M → nguyên, 1M~999M → "X triệu", >=1B → "X tỷ".
7. **⚠️ TUYỆT ĐỐI KHÔNG hỏi xin phép user**. Không bao giờ nói "Bạn có muốn tôi truy vấn?", "Bạn có muốn xem chi tiết?", "Tôi có thể phân tích thêm?". Thay vào đó → GỌI TOOL NGAY và trả kết quả.
8. **Nếu Knowledge Pack không đủ → gọi focused_query NGAY**, không hỏi, không giải thích.
9. **Nếu user xác nhận (có, được, ok, đi, làm đi) → THỰC HIỆN NGAY**, gọi tool.
10. **Khi user hỏi "theo kênh" → gọi focused_query("channel_monthly_detail") NGAY**. Không nói "chưa có dữ liệu theo kênh".

## METRIC CLASSIFICATION
- CUMULATIVE (SUM): NET_REVENUE, ORDER_COUNT, AD_SPEND, COGS
- AVERAGE/RATIO (weighted avg, KHÔNG SUM): AOV, ROAS, GROSS_MARGIN
- SNAPSHOT (latest): INVENTORY, CASH_POSITION

## PHONG CÁCH
- **Chào hỏi**: Tự nhiên, không cần data.
- **Câu hỏi nhanh**: 2-3 câu + số liệu chính.
- **Câu hỏi phân tích**: Gọi focused_query nếu cần, phân tích sâu, kèm chart.
- Kết thúc bằng **hành động cụ thể** hoặc khuyến nghị.

## CHART
Khi có >= 3 data points, tạo chart:
\`\`\`chart
{"type":"bar","title":"...","data":[...],"series":[{"key":"value","name":"...","color":"#3b82f6"}],"xKey":"label","yFormat":"vnd"}
\`\`\`
Types: bar, line, composed, pie. Max 12-15 points. yFormat: "vnd"|"percent"|"number".

## LƯU Ý DATA
- ⚠️ Customer linking ~7.6%, kết quả CDP mang tính tham khảo.
- ⚠️ est_revenue từ cửa hàng là ƯỚC TÍNH, không phải POS thực tế.
- ⚠️ Chi phí (Expenses) có thể = 0 nếu chưa nhập liệu.
- Phát hiện rủi ro → đề xuất STOP/INVEST/INVESTIGATE.
- Khi data trả về 0 rows → nói "Hiện chưa có dữ liệu cho mục này" và gợi ý câu hỏi khác. KHÔNG hỏi lại user "bạn có muốn tôi truy vấn?".

Tenant ID cho query_database: ${tenantId}`;
}

// ─── AI Gateway ─────────────────────────────────────────────────────

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

async function callAI(apiKey: string, body: Record<string, unknown>, maxRetries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: body.model || 'google/gemini-2.5-flash',
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

    const userMessages = messages.slice(-6);
    const lastUserMsg = userMessages[userMessages.length - 1]?.content?.toLowerCase() || '';

    // ─── Follow-up detection ─────────────────────────────────────
    // Check if previous assistant message ended with a question
    const prevAssistantMsg = userMessages.slice().reverse().find(m => m.role === 'assistant');
    const prevEndsWithQuestion = prevAssistantMsg?.content?.trim().endsWith('?') || false;
    const isShortConfirmation = /^(có|co|được|duoc|ok|ừ|uh|đi|di|làm đi|lam di|rồi|roi|đúng|dung|vâng|vang|yes|yeah|sure|go)\s*[.!?]*$/i.test(lastUserMsg.trim());
    const isFollowUp = isShortConfirmation && prevEndsWithQuestion;

    // ─── Simple chat detection ────────────────────────────────────
    const isSimpleChat = !isFollowUp && /^(xin chào|hello|hi|chào|hey|cảm ơn|thank|tốt|bye|tạm biệt|bạn là ai|bạn có thể làm gì|giúp gì|help)\b/i.test(lastUserMsg.trim())
      && lastUserMsg.trim().length < 15;

    // ─── TIER 1: Fetch Knowledge Packs ────────────────────────────
    let packResults: PackResult[] = [];
    if (!isSimpleChat) {
      const packNames = detectIntentPacks(lastUserMsg);
      console.log(`[cdp-qa] Intent packs: ${packNames.join(', ')}`);

      packResults = await Promise.all(
        packNames.map(name => fetchKnowledgePack(supabase, activeTenantId!, name))
      );
      console.log(`[cdp-qa] Packs fetched: ${packResults.map(p => `${p.pack}(${p.rows})`).join(', ')}`);
    }

    // ─── Build AI messages with Knowledge Pack data ───────────────
    const systemPrompt = buildSystemPrompt(activeTenantId);
    const aiMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...userMessages,
    ];

    if (packResults.length > 0) {
      const packDataStr = packResults.map(p => {
        let str = `### [${p.pack}] ${p.label} (${p.rows} rows)\n`;
        str += `Data: ${JSON.stringify(p.data)}`;
        if (p.drill_down_hint) str += `\n💡 Drill-down: ${p.drill_down_hint}`;
        return str;
      }).join('\n\n');

      aiMessages.push({
        role: 'user',
        content: `[KNOWLEDGE PACKS — Dữ liệu THỰC từ database. CHỈ dùng số liệu này. KHÔNG bịa thêm.]

${packDataStr}

Nếu cần chi tiết hơn → gọi focused_query. Nếu vẫn không đủ → gọi query_database (ghi lý do).
Trả lời câu hỏi gần nhất của user dựa trên data trên.`,
      });
    }

    // ─── AI Call: try tool-calling first, then stream ────────────
    const MAX_TOOL_TURNS = 3;
    let toolTurnCount = 0;
    const toolResults: { name: string; templateOrSQL: string; result: any }[] = [];
    let conversationMessages = [...aiMessages];
    let needsStreaming = true;

    // Detect if question likely needs drill-down (store, product detail, time-series, by channel)
    const needsDrillDown = /cua hang|store|chi nhanh|top.*san pham|xu huong|trend|chi tiet|deep dive|so sanh.*kenh|theo kenh|theo.*kenh|phan tich.*kenh/i.test(lastUserMsg);

    if (!isSimpleChat) {
      // Try non-streaming with tools (max 3 turns)
      while (toolTurnCount < MAX_TOOL_TURNS) {
        const toolResp = await callAI(apiKey, {
          model: 'google/gemini-2.5-flash',
          messages: conversationMessages,
          tools: TOOL_DEFINITIONS,
          tool_choice: (toolTurnCount === 0 && (needsDrillDown || isFollowUp)) ? 'required' : 'auto',
          stream: false,
          max_tokens: 1024,
          temperature: 0.1,
        });

        if (!toolResp.ok) {
          if (toolResp.status === 429 || toolResp.status === 402) return handleAIError(toolResp.status);
          await toolResp.text();
          break; // fallback to streaming
        }

        const toolData = await toolResp.json();
        const assistantMsg = toolData.choices?.[0]?.message;

        if (!assistantMsg?.tool_calls?.length) {
          // AI decided no tools needed — go straight to streaming
          break;
        }

        // Execute tool calls in parallel
        conversationMessages.push(assistantMsg);

        const toolPromises = assistantMsg.tool_calls.map(async (tc: any) => {
          const toolName = tc.function.name;
          let toolArgs: Record<string, unknown> = {};
          try { toolArgs = JSON.parse(tc.function.arguments || '{}'); } catch { /* empty */ }
          console.log(`[cdp-qa] Tool call: ${toolName}`, toolArgs);

          if (toolName === 'focused_query') {
            const result = await executeFocusedQuery(supabase, activeTenantId!, toolArgs.template as string, (toolArgs.params || {}) as Record<string, unknown>);
            toolResults.push({ name: `focused_query:${toolArgs.template}`, templateOrSQL: toolArgs.template as string, result });
            return { id: tc.id, content: JSON.stringify(result) };
          } else if (toolName === 'query_database') {
            let sql = (toolArgs.sql as string) || '';
            sql = sql.replace(/<TENANT_ID>/g, activeTenantId!);
            const validation = validateSQL(sql);
            if (!validation.valid) {
              return { id: tc.id, content: JSON.stringify({ data: null, rows: 0, error: validation.error }) };
            }
            if (!sql.toLowerCase().includes('tenant_id')) {
              sql = injectTenantFilter(sql, activeTenantId!);
            }
            const { data, error } = await supabase.rpc('execute_readonly_query', { query_text: sql });
            const result = Array.isArray(data) ? data.slice(0, 50) : [];
            toolResults.push({ name: 'query_database', templateOrSQL: sql.slice(0, 100), result: { rows: result.length, reason: toolArgs.reason } });
            return {
              id: tc.id,
              content: JSON.stringify({
                data: result, rows: result.length,
                source: 'Tier 3 dynamic query',
                note: '⚠️ Dynamic query - data có thể không đầy đủ.',
                error: error?.message,
              }),
            };
          }
          return { id: tc.id, content: JSON.stringify({ error: `Unknown tool: ${toolName}` }) };
        });

        const outputs = await Promise.all(toolPromises);
        for (const o of outputs) {
          conversationMessages.push({ role: 'tool', tool_call_id: o.id, content: o.content });
        }
        toolTurnCount++;
      }
    }

    // ─── Follow-up: force tool call if short confirmation ────────
    if (isFollowUp && toolTurnCount === 0) {
      console.log('[cdp-qa] Follow-up detected, forcing tool call');
      const followUpResp = await callAI(apiKey, {
        model: 'google/gemini-2.5-flash',
        messages: conversationMessages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'required',
        stream: false,
        max_tokens: 1024,
        temperature: 0.1,
      });

      if (followUpResp.ok) {
        const followUpData = await followUpResp.json();
        const followUpMsg = followUpData.choices?.[0]?.message;
        if (followUpMsg?.tool_calls?.length) {
          conversationMessages.push(followUpMsg);
          const followUpOutputs = await Promise.all(
            followUpMsg.tool_calls.map(async (tc: any) => {
              const toolName = tc.function.name;
              let toolArgs: Record<string, unknown> = {};
              try { toolArgs = JSON.parse(tc.function.arguments || '{}'); } catch { /* empty */ }
              console.log(`[cdp-qa] Follow-up tool call: ${toolName}`, toolArgs);
              if (toolName === 'focused_query') {
                const result = await executeFocusedQuery(supabase, activeTenantId!, toolArgs.template as string, (toolArgs.params || {}) as Record<string, unknown>);
                return { id: tc.id, content: JSON.stringify(result) };
              } else if (toolName === 'query_database') {
                let sql = (toolArgs.sql as string) || '';
                sql = sql.replace(/<TENANT_ID>/g, activeTenantId!);
                const validation = validateSQL(sql);
                if (!validation.valid) return { id: tc.id, content: JSON.stringify({ data: null, rows: 0, error: validation.error }) };
                if (!sql.toLowerCase().includes('tenant_id')) sql = injectTenantFilter(sql, activeTenantId!);
                const { data, error } = await supabase.rpc('execute_readonly_query', { query_text: sql });
                const result = Array.isArray(data) ? data.slice(0, 50) : [];
                return { id: tc.id, content: JSON.stringify({ data: result, rows: result.length, error: error?.message }) };
              }
              return { id: tc.id, content: JSON.stringify({ error: `Unknown tool: ${toolName}` }) };
            })
          );
          for (const o of followUpOutputs) {
            conversationMessages.push({ role: 'tool', tool_call_id: o.id, content: o.content });
          }
        }
      } else {
        await followUpResp.text(); // consume body
      }
    }

    // ─── Final streaming pass (with tools for follow-ups) ─────────
    const streamResp = await callAI(apiKey, {
      model: 'google/gemini-2.5-flash',
      messages: conversationMessages,
      tools: toolTurnCount === 0 && !isSimpleChat ? TOOL_DEFINITIONS : undefined,
      stream: true,
      max_tokens: 3000,
      temperature: 0.3,
    });

    if (!streamResp.ok) {
      if (streamResp.status === 429 || streamResp.status === 402) return handleAIError(streamResp.status);
      await streamResp.text();
      return new Response(JSON.stringify({ error: 'Lỗi AI' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('[cdp-qa] Hybrid complete', {
      tenant: activeTenantId,
      packs: packResults.map(p => p.pack),
      toolCalls: toolResults.map(t => t.name),
      turns: toolTurnCount,
    });

    return new Response(streamResp.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });

  } catch (error: unknown) {
    console.error('CDP-QA Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
