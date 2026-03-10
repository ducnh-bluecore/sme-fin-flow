import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product, lifecycle, channelSales } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Bạn là Chief Retail Strategist của Bluecore. Phân tích sản phẩm theo nguyên tắc:
- Truth > Flexibility: Chỉ ra vấn đề thật, không làm đẹp số
- Surface Problems: Phát hiện rủi ro sớm
- Action-oriented: Mỗi insight phải đi kèm hành động cụ thể

Trả lời bằng tiếng Việt, ngắn gọn, tối đa 4-5 bullet points. Mỗi bullet bắt đầu bằng emoji phù hợp.
Tập trung vào: hiệu suất bán, chiến lược giá/khuyến mãi, phân bổ kênh, và rủi ro tồn kho.`;

    const userPrompt = `Phân tích sản phẩm:
- Tên: ${product.name} (${product.fc_code})
- Category: ${product.category || 'N/A'}
- Vòng đời: Ngày ${lifecycle.age_days}/${lifecycle.total_days} (${lifecycle.stage})
- Sell-through: ${lifecycle.sell_through}% (Target: ${lifecycle.target_pct}%)
- Velocity: ${lifecycle.velocity}/ngày, Cần: ${lifecycle.velocity_required}/ngày
- Tồn kho: ${lifecycle.on_hand} / Ban đầu: ${lifecycle.initial_qty}
- Cash at Risk: ${lifecycle.cash_at_risk}M

Bán theo kênh:
${channelSales.map((c: any) => `- ${c.channel}: ${c.qty_sold} SP, ${(c.revenue/1000000).toFixed(1)}M doanh thu, KM ${(c.discount_amount/1000000).toFixed(1)}M (${c.avg_discount_pct.toFixed(1)}%)`).join('\n')}

Tổng KM: ${(channelSales.reduce((s: number, c: any) => s + c.discount_amount, 0) / 1000000).toFixed(1)}M`;

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
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const insight = result.choices?.[0]?.message?.content || "Không thể tạo insight.";

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("product-ai-insight error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
