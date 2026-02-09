import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

function buildKnowledgePrompt(knowledgeContext: string): string {
  return `Bạn là Bluecore AI Agent - trợ lý dữ liệu tài chính & khách hàng cho CEO/CFO.

NHIỆM VỤ:
- Trả lời câu hỏi bằng tiếng Việt ngắn gọn, quyết định-được (decision-grade).
- CHỈ dùng số liệu trong "DỮ LIỆU KINH DOANH" bên dưới.
- Nếu dữ liệu không đủ để trả lời: nói rõ "Dữ liệu hiện tại chưa đủ để trả lời câu hỏi này".

QUY TẮC:
1) Không bịa số. Chỉ dùng dữ liệu đã cung cấp.
2) Format tiền VND (triệu, tỷ) cho dễ đọc.
3) Nếu phát hiện rủi ro/giảm giá trị: đề xuất hành động (STOP/INVEST/INVESTIGATE).
4) Dùng emoji tiêu đề để dễ đọc.
5) Trả lời tập trung, đúng trọng tâm câu hỏi.
6) Khi so sánh, nêu rõ % thay đổi.

DỮ LIỆU KINH DOANH (cập nhật gần nhất):
${knowledgeContext}
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

async function loadKnowledgeContext(supabase: any, tenantId: string): Promise<{ context: string; lastUpdated: string | null }> {
  // Load most recent snapshots for this tenant
  const { data: snapshots, error } = await supabase
    .from('knowledge_snapshots')
    .select('snapshot_type, snapshot_date, summary_text, created_at')
    .eq('tenant_id', tenantId)
    .order('snapshot_date', { ascending: false })
    .limit(50);

  if (error || !snapshots || snapshots.length === 0) {
    return { context: '(Chưa có dữ liệu knowledge snapshots. Cần chạy build-knowledge-snapshots trước.)', lastUpdated: null };
  }

  // Get latest snapshot per type
  const latestByType = new Map<string, any>();
  for (const s of snapshots) {
    if (!latestByType.has(s.snapshot_type)) {
      latestByType.set(s.snapshot_type, s);
    }
  }

  const parts: string[] = [];
  let lastUpdated: string | null = null;

  for (const [, snapshot] of latestByType) {
    if (snapshot.summary_text) {
      parts.push(snapshot.summary_text);
    }
    if (!lastUpdated || snapshot.created_at > lastUpdated) {
      lastUpdated = snapshot.created_at;
    }
  }

  return { context: parts.join('\n\n'), lastUpdated };
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

    // Load knowledge context from snapshots
    const { context: knowledgeContext, lastUpdated } = await loadKnowledgeContext(supabase, activeTenantId);

    console.log('[cdp-qa] knowledge_context', {
      tenant: activeTenantId,
      contextLength: knowledgeContext.length,
      lastUpdated,
    });

    // Stream answer directly using knowledge context (1 AI call instead of 2)
    const systemPrompt = buildKnowledgePrompt(knowledgeContext);

    const aiResp = await lovableAIChat(apiKey, {
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-6),
      ],
      stream: true,
      max_tokens: 1200,
      temperature: 0.3,
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
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
      const t = await aiResp.text();
      console.error('AI error:', status, t);
      return new Response(JSON.stringify({ error: 'Lỗi AI' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(aiResp.body, {
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
