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
    const { tenantId, alertType, topProducts } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Build context from products data
    const productsContext = topProducts.map((p: any, i: number) => 
      `${i + 1}. ${p.object_name} - Tồn kho: ${p.current_stock || 0}, Ngày tồn: ${Math.round(p.days_of_stock || 0)}, Velocity: ${(p.sales_velocity || 0).toFixed(2)}/ngày, Xu hướng: ${(p.trend_percent || 0).toFixed(1)}%`
    ).join('\n');

    const systemPrompt = `Bạn là chuyên gia quản lý tồn kho với kinh nghiệm trong ngành bán lẻ. Phân tích dữ liệu sản phẩm và đưa ra đề xuất cụ thể, thực tế.

Quy tắc phân tích:
- Sản phẩm có ngày tồn kho < 3 và velocity cao: CẦN NHẬP GẤP
- Sản phẩm có ngày tồn kho < 7 và velocity trung bình: NÊN NHẬP SỚM  
- Sản phẩm có xu hướng giảm mạnh (< -10%): CÂN NHẮC GIẢM LƯỢNG NHẬP
- Sản phẩm velocity rất thấp hoặc 0 và tồn kho cao: KHÔNG NÊN NHẬP THÊM
- Sản phẩm xu hướng tăng mạnh (> 20%): TĂNG LƯỢNG NHẬP

Trả lời bằng tiếng Việt, ngắn gọn và có thể hành động được.`;

    const userPrompt = `Dựa trên dữ liệu tồn kho sau, hãy đưa ra 5-7 đề xuất cụ thể:

${productsContext}

Yêu cầu format:
1. Phân loại rõ ràng: "NÊN NHẬP GẤP", "NÊN NHẬP", "CÂN NHẮC", "KHÔNG NÊN NHẬP"
2. Giải thích ngắn gọn lý do
3. Đề xuất số lượng nếu có thể (dựa trên velocity)
4. Ưu tiên sản phẩm quan trọng nhất trước`;

    console.log("Calling OpenAI for inventory recommendations...");

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
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Đã vượt quá giới hạn yêu cầu OpenAI, vui lòng thử lại sau." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "API key OpenAI không hợp lệ." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const recommendations = data.choices?.[0]?.message?.content || "Không thể tạo đề xuất.";

    console.log("AI recommendations generated successfully");

    return new Response(JSON.stringify({ 
      recommendations,
      productsAnalyzed: topProducts.length,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in inventory-recommendations:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
