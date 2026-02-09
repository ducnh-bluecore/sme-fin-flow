import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  CDP_QUERYABLE_VIEWS, 
  validateSQL,
  injectTenantFilter,
  buildSchemaContext,
} from '../_shared/cdp-schema.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestBody {
  messages: Message[];
  tenantId?: string;
}

function buildSqlGenerationPrompt(schemaContext: string): string {
  return `Bạn là Bluecore AI Agent - trợ lý dữ liệu tài chính & khách hàng.

MỤC TIÊU:
- Chuyển câu hỏi tiếng Việt thành 1 câu SQL SELECT để truy vấn dữ liệu.

RÀNG BUỘC BẮT BUỘC:
1) CHỈ TRẢ VỀ DUY NHẤT 1 câu SQL (plain text). Không markdown, không giải thích, không JSON.
2) SQL phải là SELECT.
3) CHỈ được query các table/view trong whitelist:
${CDP_QUERYABLE_VIEWS.map(v => `- ${v}`).join('\n')}
4) Luôn chọn các cột đúng theo schema mô tả.
5) Tuyệt đối KHÔNG dùng 'LIMIT 0'. Nếu câu hỏi không thể trả lời đầy đủ, vẫn trả về SQL hợp lệ với 'LIMIT 50'.
6) Khi query cdp_orders hoặc cdp_order_items: LUÔN thêm LIMIT 100 (trừ khi đã có aggregate).
7) Cho câu hỏi tổng hợp doanh thu/KPI: ƯU TIÊN dùng kpi_facts_daily thay vì cdp_orders.

QUY TẮC VỀ DATE/TIME:
- Nếu cần dùng mốc tháng mà bạn viết dạng YYYY-MM thì PHẢI chuyển thành ngày hợp lệ: 'YYYY-MM-01'.
- Khi so sánh theo năm: KHÔNG dùng EXTRACT/DATE_PART. Luôn dùng filter theo khoảng ngày:
  <date_column> >= 'YYYY-01-01' AND <date_column> < 'YYYY+1-01-01'.

JOIN GUIDANCE (quan trọng - tránh lỗi type mismatch):
- cdp_orders.customer_id = cdp_customers.id::text
- cdp_order_items.order_id = cdp_orders.id::text  
- cdp_order_items.product_id = products.id::text
- Lý do: các cột FK lưu dạng text, cần cast cột UUID sang text (KHÔNG cast text sang uuid vì có thể không hợp lệ).

SCHEMA CONTEXT:
${schemaContext}
`;
}

function sanitizeGeneratedSql(sql: string): string {
  let s = sql.trim().replace(/;/g, '');
  s = s.replace(/'([0-9]{4})-([0-9]{2})'\b/g, "'$1-$2-01'");
  s = s.replace(/\bLIMIT\s+0\b/gi, 'LIMIT 50');
  return s.trim();
}

function rejectSqlThatWillBreakReadonlyValidator(sql: string): { ok: true } | { ok: false; reason: string } {
  if (/\bEXTRACT\s*\(/i.test(sql)) {
    return { ok: false, reason: "Không dùng EXTRACT(...). Hãy lọc theo khoảng ngày." };
  }
  if (/\bDATE_PART\s*\(/i.test(sql)) {
    return { ok: false, reason: "Không dùng DATE_PART(...). Hãy lọc theo khoảng ngày." };
  }
  return { ok: true };
}

function buildAnswerPrompt(params: {
  question: string;
  sql: string;
  rowCount: number;
  sampleRows: unknown;
}): string {
  const { question, sql, rowCount, sampleRows } = params;
  return `Bạn là Bluecore AI Agent - hỗ trợ CEO/CFO ra quyết định dựa trên dữ liệu tài chính & khách hàng.

NHIỆM VỤ:
- Trả lời câu hỏi bằng tiếng Việt ngắn gọn, quyết định-được (decision-grade).
- CHỈ dùng số liệu trong "KẾT QUẢ TRUY VẤN".
- Nếu rowCount = 0 hoặc dữ liệu thiếu: nói rõ "Không có dữ liệu" và nêu rõ table/field nào đang thiếu.

QUY TẮC:
1) Không bịa số.
2) Format tiền VND (triệu, tỷ) nếu có.
3) Nếu phát hiện rủi ro/giảm giá trị: đề xuất hành động (STOP/INVEST/INVESTIGATE).
4) Dùng emoji tiêu đề để dễ đọc.

CÂU HỎI:
${question}

SQL ĐÃ CHẠY:
${sql}

KẾT QUẢ TRUY VẤN:
- rowCount: ${rowCount}
- sampleRows(JSON): ${JSON.stringify(sampleRows).slice(0, 8000)}
`;
}

async function lovableAIChat(apiKey: string, body: Record<string, unknown>): Promise<Response> {
  return await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages, tenantId }: RequestBody = await req.json();
    
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headerTenantId = req.headers.get('x-tenant-id') || undefined;
    let activeTenantId = headerTenantId || tenantId;
    if (!activeTenantId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user.id)
        .maybeSingle();
      activeTenantId = profile?.active_tenant_id;
    }

    if (!activeTenantId) {
      return new Response(
        JSON.stringify({ error: 'No tenant selected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const schemaContext = buildSchemaContext();

    // 1) Generate SQL (non-stream) using Lovable AI Gateway
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const sqlGenResp = await lovableAIChat(apiKey, {
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: buildSqlGenerationPrompt(schemaContext) },
        { role: 'user', content: lastUserMessage },
      ],
      temperature: 0.1,
      max_tokens: 400,
      stream: false,
    });

    if (!sqlGenResp.ok) {
      const status = sqlGenResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Quá nhiều request, vui lòng thử lại sau' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Hết credits AI' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await sqlGenResp.text();
      console.error('SQL gen error:', status, t);
      return new Response(JSON.stringify({ error: 'Lỗi AI (tạo truy vấn)' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sqlGenJson = await sqlGenResp.json();
    const rawSql = sanitizeGeneratedSql(sqlGenJson.choices?.[0]?.message?.content || '');
    if (!rawSql) {
      return new Response(JSON.stringify({ error: 'AI không tạo được truy vấn' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const readonlyCompat = rejectSqlThatWillBreakReadonlyValidator(rawSql);
    if (!readonlyCompat.ok) {
      console.warn('[cdp-qa] blocked_sql', { tenant: activeTenantId, reason: readonlyCompat.reason, sql: rawSql.slice(0, 220) });
      return new Response(JSON.stringify({ error: `Truy vấn không hợp lệ: ${readonlyCompat.reason}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { valid, error: sqlError } = validateSQL(rawSql);
    if (!valid) {
      console.warn('[cdp-qa] invalid_sql', { tenant: activeTenantId, sql: rawSql.slice(0, 220), sqlError });
      return new Response(JSON.stringify({ error: `Truy vấn không hợp lệ: ${sqlError}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const finalSql = injectTenantFilter(rawSql, activeTenantId);

    // 2) Execute query (read-only)
    const { data: rpcResult, error: queryError } = await supabase.rpc('execute_readonly_query', {
      query_text: finalSql,
      params: {},
    });

    if (queryError) {
      console.error('CDP-QA query error:', { ...queryError, tenant: activeTenantId, sql: finalSql.slice(0, 320) });
      return new Response(JSON.stringify({ error: 'Lỗi truy vấn dữ liệu' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize RPC result
    let normalized: unknown = rpcResult;
    if (typeof normalized === 'string') {
      try { normalized = JSON.parse(normalized); } catch { /* keep as-is */ }
    }

    let safeRows: unknown[] = [];
    if (Array.isArray(normalized)) {
      if (normalized.length > 0 && typeof normalized[0] === 'object' && normalized[0] !== null) {
        const first = normalized[0] as Record<string, unknown>;
        const maybeWrapped = first['execute_readonly_query'];
        if (Array.isArray(maybeWrapped)) {
          safeRows = maybeWrapped;
        } else {
          safeRows = normalized;
        }
      } else {
        safeRows = normalized;
      }
    } else if (normalized && typeof normalized === 'object') {
      const obj = normalized as Record<string, unknown>;
      const maybeWrapped = obj['execute_readonly_query'];
      safeRows = Array.isArray(maybeWrapped) ? maybeWrapped : [normalized];
    }

    console.log('[cdp-qa] query_result', {
      tenant: activeTenantId,
      sql: finalSql.slice(0, 180),
      rowCount: safeRows.length,
    });
    const sampleRows = safeRows.slice(0, 50);

    // 3) Answer with AI (stream)
    const answerPrompt = buildAnswerPrompt({
      question: lastUserMessage,
      sql: finalSql,
      rowCount: safeRows.length,
      sampleRows,
    });

    const aiAnswerResp = await lovableAIChat(apiKey, {
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: answerPrompt },
        ...messages.slice(-6),
      ],
      stream: true,
      max_tokens: 1200,
      temperature: 0.3,
    });

    if (!aiAnswerResp.ok) {
      const status = aiAnswerResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Quá nhiều request' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Hết credits AI' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await aiAnswerResp.text();
      console.error('Answer error:', status, t);
      return new Response(JSON.stringify({ error: 'Lỗi AI (trả lời)' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(aiAnswerResp.body, {
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
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
