import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, cardContext, context, analysisType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from either cardContext (Decision Center) or context (legacy)
    const contextData = cardContext || context;

    const systemPrompt = `Bạn là Bluecore Decision Advisor - AI hỗ trợ CEO/CFO ra quyết định kinh doanh.

## VAI TRÒ
- Phân tích dữ kiện tài chính và đưa ra khuyến nghị rõ ràng
- Giúp CEO/CFO hiểu impact và rủi ro của mỗi quyết định
- Trả lời ngắn gọn, đi thẳng vào vấn đề
- Luôn đưa ra hành động cụ thể, không chung chung

## NGUYÊN TẮC
1. TRUTH > FLEXIBILITY: Nói thật, không làm đẹp số
2. CASH IS KING: Ưu tiên bảo vệ dòng tiền
3. ACTION-ORIENTED: Mỗi câu trả lời phải có hành động cụ thể
4. CEO LANGUAGE: Dùng ngôn ngữ CEO hiểu, không technical jargon

## CÁC CÔNG THỨC QUAN TRỌNG
- ROI = (Lợi nhuận ròng / Chi phí đầu tư) × 100%
- Contribution Margin = Revenue - Variable Costs
- Cash Runway = Cash on Hand / Monthly Burn Rate
- CAC = Marketing Spend / New Customers

## CONTEXT
${contextData ? JSON.stringify(contextData, null, 2) : 'Không có context cụ thể'}
${analysisType ? `\nLoại phân tích: ${analysisType}` : ''}

## FORMAT TRẢ LỜI
- Ngắn gọn (max 3-5 câu cho mỗi điểm)
- Bullet points khi cần
- Luôn kết thúc bằng khuyến nghị hành động
- Dùng emoji để highlight: ⚠️ rủi ro, ✅ khuyến nghị, 💰 impact tiền, 📊 dữ liệu`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Vui lòng thử lại sau." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Hết credit AI. Vui lòng nạp thêm." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Lỗi AI gateway" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Decision advisor error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
