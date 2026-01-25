import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  CDP_QUERYABLE_VIEWS, 
  CDP_SCHEMA_DESCRIPTIONS,
  validateSQL,
  injectTenantFilter,
  buildSchemaContext,
  SUGGESTED_QUESTIONS 
} from '../_shared/cdp-schema.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  // IMPORTANT: must include any custom headers sent by the browser (e.g. x-tenant-id)
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestBody {
  messages: Message[];
  tenantId?: string;
}

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

function buildSqlGenerationPrompt(schemaContext: string): string {
  return `Bạn là CDP Query Generator của Bluecore.

MỤC TIÊU:
- Chuyển câu hỏi tiếng Việt thành 1 câu SQL SELECT để truy vấn dữ liệu CDP.

RÀNG BUỘC BẮT BUỘC:
1) CHỈ TRẢ VỀ DUY NHẤT 1 câu SQL (plain text). Không markdown, không giải thích, không JSON.
2) SQL phải là SELECT.
3) CHỈ được query các view trong whitelist dưới đây (không được join sang bảng khác):
${CDP_QUERYABLE_VIEWS.map(v => `- ${v}`).join('\n')}
4) Luôn chọn các cột đúng theo schema mô tả.
 5) Tuyệt đối KHÔNG dùng 'LIMIT 0'. Nếu câu hỏi không thể trả lời đầy đủ, vẫn trả về một SQL SELECT hợp lệ trên 1 view phù hợp nhất với 'LIMIT 50' để kiểm tra dữ liệu.

QUY TẮC VỀ DATE/TIME (tránh lỗi runtime):
- Nếu cần dùng mốc tháng mà bạn viết dạng YYYY-MM thì PHẢI chuyển thành ngày hợp lệ: 'YYYY-MM-01'.
- Khi so sánh theo năm, ưu tiên dùng EXTRACT(YEAR FROM <date_column>) hoặc date_trunc('year', <date_column>) thay vì so sánh chuỗi.

SCHEMA CONTEXT:
${schemaContext}
`;
}

function sanitizeGeneratedSql(sql: string): string {
  // 1) Remove semicolons completely (prevents statement chaining)
  let s = sql.trim().replace(/;/g, '');

  // 2) Fix common invalid date literals like '2023-01' -> '2023-01-01'
  //    This avoids Postgres: invalid input syntax for type date
  s = s.replace(/'([0-9]{4})-([0-9]{2})'\b/g, "'$1-$2-01'");

  // 3) Reliability: never allow LIMIT 0 (it guarantees empty results and breaks UX)
  //    If the model tries to "probe" with LIMIT 0, convert to a small safe sample.
  s = s.replace(/\bLIMIT\s+0\b/gi, 'LIMIT 50');

  return s.trim();
}

function buildAnswerPrompt(params: {
  question: string;
  sql: string;
  rowCount: number;
  sampleRows: unknown;
}): string {
  const { question, sql, rowCount, sampleRows } = params;
  return `Bạn là CDP Assistant của Bluecore - hỗ trợ CEO/CFO ra quyết định dựa trên dữ liệu khách hàng.

NHIỆM VỤ:
- Trả lời câu hỏi bằng tiếng Việt ngắn gọn, quyết định-được (decision-grade).
- CHỈ dùng số liệu trong "KẾT QUẢ TRUY VẤN".
- Nếu rowCount = 0 hoặc dữ liệu thiếu: nói rõ "Không có dữ liệu" và nêu rõ view/field nào đang thiếu để trả lời tốt hơn.

QUY TẮC:
1) Không bịa số.
2) Format tiền VND (triệu, tỷ) nếu có.
3) Nếu phát hiện rủi ro/giảm giá trị: đề xuất hành động (STOP/INVEST/INVESTIGATE).

CÂU HỎI:
${question}

SQL ĐÃ CHẠY:
${sql}

KẾT QUẢ TRUY VẤN:
- rowCount: ${rowCount}
- sampleRows(JSON): ${JSON.stringify(sampleRows).slice(0, 8000)}
`;
}

async function openaiChat(apiKey: string, body: Record<string, unknown>): Promise<Response> {
  return await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { messages, tenantId }: RequestBody = await req.json();
    
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key for OpenAI
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user via Supabase
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

    // Get tenant id (prefer header)
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

    // 1) Generate SQL (non-stream)
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const sqlGenResp = await openaiChat(apiKey, {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSqlGenerationPrompt(schemaContext) },
        { role: 'user', content: lastUserMessage },
      ],
      temperature: 0.1,
      max_tokens: 250,
      stream: false,
    });

    if (!sqlGenResp.ok) {
      const status = sqlGenResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Quá nhiều request, vui lòng thử lại sau' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Hết credits AI, liên hệ admin' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await sqlGenResp.text();
      console.error('SQL gen error:', status, t);
      return new Response(JSON.stringify({ error: 'Lỗi AI (tạo truy vấn)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sqlGenJson = (await sqlGenResp.json()) as OpenAIChatResponse;
    // LLMs sometimes add trailing semicolons; disallow/strip them to keep RPC safe.
    const rawSql = sanitizeGeneratedSql(sqlGenJson.choices?.[0]?.message?.content || '');
    if (!rawSql) {
      return new Response(JSON.stringify({ error: 'AI không tạo được truy vấn' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { valid, error: sqlError } = validateSQL(rawSql);
    if (!valid) {
      return new Response(JSON.stringify({ error: `Truy vấn không hợp lệ: ${sqlError}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const finalSql = injectTenantFilter(rawSql, activeTenantId);

    // 2) Execute query (read-only) and collect sample
    const { data: rpcResult, error: queryError } = await supabase.rpc('execute_readonly_query', {
      query_text: finalSql,
      params: {},
    });

    if (queryError) {
      console.error('CDP-QA query error:', queryError);
      return new Response(JSON.stringify({ error: 'Lỗi truy vấn dữ liệu (read-only query)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // RPC returns JSONB; PostgREST/Supabase-js can surface it as:
    // - [{ execute_readonly_query: [...] }] (scalar wrapped)
    // - [...] (direct array)
    // - "[...]" (stringified JSON)
    // - { execute_readonly_query: [...] } (object)
    let normalized: unknown = rpcResult;
    if (typeof normalized === 'string') {
      try {
        normalized = JSON.parse(normalized);
      } catch {
        // keep as-is; will fall through to empty
      }
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

    // Minimal observability for reliability debugging
    console.log('[cdp-qa] readonly_query', {
      tenant: activeTenantId,
      sql_preview: finalSql.slice(0, 180),
      rpc_type: typeof rpcResult,
      normalized_is_array: Array.isArray(normalized),
      rowCount: safeRows.length,
    });
    const sampleRows = safeRows.slice(0, 50);

    // 3) Ask AI to answer based on real query results (stream)
    const answerPrompt = buildAnswerPrompt({
      question: lastUserMessage,
      sql: finalSql,
      rowCount: safeRows.length,
      sampleRows,
    });

    const aiAnswerResp = await openaiChat(apiKey, {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: answerPrompt },
        // keep some conversation context for follow-ups
        ...messages.slice(-6),
      ],
      stream: true,
      max_tokens: 900,
      temperature: 0.3,
    });

    if (!aiAnswerResp.ok) {
      const status = aiAnswerResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Quá nhiều request, vui lòng thử lại sau' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Hết credits AI, liên hệ admin' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await aiAnswerResp.text();
      console.error('Answer stream error:', status, t);
      return new Response(JSON.stringify({ error: 'Lỗi AI (trả lời)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return streaming response
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
