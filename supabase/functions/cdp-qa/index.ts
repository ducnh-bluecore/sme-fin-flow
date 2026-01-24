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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestBody {
  messages: Message[];
  tenantId?: string;
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

    // Get API key for Lovable AI
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
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

    // Get user's tenant
    let activeTenantId = tenantId;
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

    // Build system prompt
    const schemaContext = buildSchemaContext();
    const systemPrompt = `Bạn là CDP Assistant của Bluecore - hỗ trợ phân tích dữ liệu khách hàng.

NHIỆM VỤ:
- Trả lời câu hỏi về khách hàng, LTV, cohort, segment bằng tiếng Việt
- Sử dụng dữ liệu từ database views để đưa ra insight
- Giải thích số liệu một cách dễ hiểu cho CEO/CFO

QUY TẮC:
1. Luôn trả lời bằng tiếng Việt, ngắn gọn và có số liệu cụ thể
2. Nếu phát hiện vấn đề (LTV giảm, rủi ro cao), đề xuất hành động
3. Format số tiền theo VND (triệu, tỷ)
4. Không bao giờ tiết lộ thông tin kỹ thuật về database schema
5. Nếu không có dữ liệu, nói rõ lý do

CONTEXT DỮ LIỆU:
${schemaContext}

GỢI Ý CÂU HỎI:
${SUGGESTED_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Tenant ID hiện tại: ${activeTenantId}`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Quá nhiều request, vui lòng thử lại sau' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: 'Hết credits AI, liên hệ admin' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    // Return streaming response
    return new Response(aiResponse.body, {
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
