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
    const { products, channels, discountPct, historicalData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build projection from historical data
    const projections = products.map((p: any) => {
      const history = (historicalData || []).filter((h: any) => h.fc_code === p.fc_code);
      const channelHistory = history.filter((h: any) => channels.includes(h.channel));

      // Estimate clearability from historical discount bands
      let estClearRate = 0.3; // default 30%
      if (channelHistory.length > 0) {
        const totalUnits = channelHistory.reduce((s: number, h: any) => s + (h.units_sold || 0), 0);
        const totalStock = p.current_stock || 1;
        estClearRate = Math.min(totalUnits / Math.max(totalStock, 1), 0.95);
      }

      // Higher discount = higher clear rate (diminishing returns)
      const discountBoost = 1 + (discountPct - 20) * 0.015;
      const adjustedRate = Math.min(estClearRate * discountBoost, 0.95);

      const unitsToClear = Math.round(p.current_stock * adjustedRate);
      const avgPrice = p.inventory_value / Math.max(p.current_stock, 1);
      const salePrice = avgPrice * (1 - discountPct / 100);
      const projRevenue = unitsToClear * salePrice;
      const projLoss = unitsToClear * avgPrice * (discountPct / 100);
      const cashRecovered = projRevenue;
      const remainingStock = p.current_stock - unitsToClear;
      const daysToComplete = p.avg_daily_sales > 0
        ? Math.round(unitsToClear / (p.avg_daily_sales * discountBoost))
        : null;

      return {
        product_id: p.product_id,
        product_name: p.product_name,
        fc_code: p.fc_code,
        current_stock: p.current_stock,
        units_to_clear: unitsToClear,
        remaining_stock: remainingStock,
        avg_price: avgPrice,
        sale_price: salePrice,
        projected_revenue: projRevenue,
        discount_loss: projLoss,
        cash_recovered: cashRecovered,
        clear_rate: adjustedRate,
        days_to_complete: daysToComplete,
        is_premium: p.is_premium,
      };
    });

    const totalProjectedRevenue = projections.reduce((s: number, p: any) => s + p.projected_revenue, 0);
    const totalDiscountLoss = projections.reduce((s: number, p: any) => s + p.discount_loss, 0);
    const totalCashRecovered = projections.reduce((s: number, p: any) => s + p.cash_recovered, 0);
    const totalUnitsToClear = projections.reduce((s: number, p: any) => s + p.units_to_clear, 0);
    const premiumViolations = projections.filter((p: any) => p.is_premium && discountPct > 50);

    // AI recommendation
    const systemPrompt = `Bạn là Chief Retail Strategist của Bluecore. Nhiệm vụ: phân tích kế hoạch thanh lý và đưa ra khuyến nghị tối ưu.
Nguyên tắc:
- Truth > Flexibility: Nói thẳng nếu kế hoạch có vấn đề
- Mỗi khuyến nghị phải có hành động cụ thể và impact tài chính
- Ưu tiên bảo toàn margin, giải phóng cash nhanh
- Cảnh báo nếu discount quá sâu cho hàng Premium/Signature

Trả lời bằng tiếng Việt, ngắn gọn. Chia thành 3 phần:
1. 📊 ĐÁNH GIÁ KẾ HOẠCH (2-3 dòng)
2. ⚡ KHUYẾN NGHỊ TỐI ƯU (3-4 bullet, mỗi cái gồm kênh + mức discount + lý do)
3. ⚠️ RỦI RO CẦN LƯU Ý (1-2 dòng)`;

    const userPrompt = `Kế hoạch thanh lý:
- Số SP: ${products.length} | Tổng tồn: ${totalUnitsToClear} units
- Kênh bán: ${channels.join(', ')}
- Mức giảm giá: ${discountPct}%
- Doanh thu dự kiến: ${(totalProjectedRevenue / 1e6).toFixed(1)}M
- Tổn thất discount: ${(totalDiscountLoss / 1e6).toFixed(1)}M
- Cash thu hồi: ${(totalCashRecovered / 1e6).toFixed(1)}M
${premiumViolations.length > 0 ? `- ⚠️ ${premiumViolations.length} SP Premium đang giảm > 50%!` : ''}

Chi tiết SP:
${projections.slice(0, 10).map((p: any) =>
  `- ${p.product_name} (${p.fc_code}): ${p.current_stock} → clear ${p.units_to_clear}, dự kiến ${(p.projected_revenue / 1e6).toFixed(1)}M, ${p.days_to_complete ? p.days_to_complete + ' ngày' : 'N/A'}${p.is_premium ? ' [PREMIUM]' : ''}`
).join('\n')}

Lịch sử thanh lý các kênh:
${(historicalData || []).slice(0, 20).map((h: any) =>
  `- ${h.channel}: ${h.units_sold} units, discount ${h.avg_discount_pct}%, revenue ${(h.revenue_collected / 1e6).toFixed(1)}M`
).join('\n')}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    let recommendation = "Không thể tạo khuyến nghị AI.";
    if (aiResponse.ok) {
      const aiResult = await aiResponse.json();
      recommendation = aiResult.choices?.[0]?.message?.content || recommendation;
    } else {
      console.error("AI gateway error:", aiResponse.status, await aiResponse.text());
    }

    return new Response(JSON.stringify({
      projections,
      summary: {
        total_products: products.length,
        total_units_to_clear: totalUnitsToClear,
        total_projected_revenue: totalProjectedRevenue,
        total_discount_loss: totalDiscountLoss,
        total_cash_recovered: totalCashRecovered,
        premium_violations: premiumViolations.length,
      },
      recommendation,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("clearance-simulator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
