import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
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

    console.log("Calling OpenAI API with model gpt-4o-mini...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Vui lòng thử lại sau." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Invalid OpenAI API key." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Lỗi OpenAI API: " + errorText }), {
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
