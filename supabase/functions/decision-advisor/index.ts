import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, analysisType } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const systemPrompt = `Bạn là chuyên gia tài chính CFO hỗ trợ ra quyết định kinh doanh. Bạn phân tích dữ liệu và đưa ra khuyến nghị cụ thể, có cơ sở.

Nguyên tắc phân tích:
1. Luôn xem xét cả định lượng (số liệu) và định tính (rủi ro, chiến lược)
2. Đưa ra khuyến nghị rõ ràng với lý do cụ thể
3. Cảnh báo các rủi ro tiềm ẩn
4. Đề xuất các bước tiếp theo

Các công thức chính:
- ROI = (Lợi nhuận ròng / Chi phí đầu tư) × 100%
- NPV = Σ(CFt / (1+r)^t) - Chi phí ban đầu
- IRR = Tỷ suất chiết khấu khi NPV = 0
- Payback Period = Chi phí ban đầu / Dòng tiền hàng năm
- Break-even = Chi phí cố định / (Giá bán - Chi phí biến đổi)

${context ? `Dữ liệu ngữ cảnh:\n${JSON.stringify(context, null, 2)}` : ''}
${analysisType ? `Loại phân tích: ${analysisType}` : ''}

Trả lời bằng tiếng Việt, ngắn gọn và chuyên nghiệp.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: `OpenAI API error: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Decision advisor error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
