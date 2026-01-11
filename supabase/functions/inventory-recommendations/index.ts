import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Determine alert category and build appropriate prompts
function buildPrompts(alertType: string, alertTitle: string, alertMessage: string, alertSeverity: string, productsContext: string) {
  const isLowStock = alertType?.includes('dos_critical') || alertType?.includes('dos_warning') || 
                     alertType?.includes('stockout') || alertTitle?.toLowerCase().includes('tồn kho thấp');
  
  const isHighStock = alertType?.includes('overstock') || alertType?.includes('slow_moving') ||
                      alertTitle?.toLowerCase().includes('tồn kho cao') || alertTitle?.toLowerCase().includes('hàng chậm');
  
  const isRevenueDown = alertType?.includes('revenue_critical') || alertType?.includes('revenue_warning') ||
                        alertType?.includes('revenue_down') || alertTitle?.toLowerCase().includes('doanh thu giảm');
  
  const isRevenueUp = alertType?.includes('revenue_up') || alertTitle?.toLowerCase().includes('doanh thu tăng') ||
                      alertTitle?.toLowerCase().includes('tăng trưởng');
  
  const isTrendDown = alertType?.includes('trend_down') || alertType?.includes('declining') ||
                      alertTitle?.toLowerCase().includes('xu hướng giảm');
  
  const isTrendUp = alertType?.includes('trend_up') || alertType?.includes('growing') ||
                    alertTitle?.toLowerCase().includes('xu hướng tăng');

  let systemPrompt = '';
  let userPrompt = '';

  if (isLowStock) {
    systemPrompt = `Bạn là chuyên gia quản lý tồn kho với kinh nghiệm trong ngành bán lẻ. Phân tích dữ liệu sản phẩm TỒN KHO THẤP và đưa ra đề xuất cụ thể.

Quy tắc phân tích:
- Sản phẩm có ngày tồn kho < 3 và velocity cao: CẦN NHẬP GẤP
- Sản phẩm có ngày tồn kho < 7 và velocity trung bình: NÊN NHẬP SỚM  
- Nếu xu hướng giảm mạnh (< -20%): Có thể không cần nhập nhiều
- Tính toán số lượng nhập dựa trên velocity * 14-30 ngày

Trả lời bằng tiếng Việt, ngắn gọn và có thể hành động được.`;

    userPrompt = `CẢNH BÁO: ${alertTitle}
Chi tiết: ${alertMessage || 'Sản phẩm có tồn kho thấp cần xử lý'}
Mức độ: ${alertSeverity === 'critical' ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO'}

Dữ liệu sản phẩm:
${productsContext}

Hãy đưa ra 3-5 đề xuất cụ thể:
1. Phân loại: "CẦN NHẬP GẤP", "NÊN NHẬP SỚM", "THEO DÕI THÊM"
2. Lý do ngắn gọn
3. Đề xuất số lượng nhập (velocity × số ngày)
4. Ưu tiên sản phẩm quan trọng nhất`;
  } 
  else if (isHighStock) {
    systemPrompt = `Bạn là chuyên gia quản lý tồn kho. Phân tích sản phẩm TỒN KHO CAO hoặc BÁN CHẬM và đưa ra đề xuất.

Quy tắc:
- Sản phẩm velocity = 0 hoặc rất thấp: KHÔNG NÊN NHẬP THÊM
- Sản phẩm ngày tồn > 60 và xu hướng giảm: XEM XÉT GIẢM GIÁ/KHUYẾN MÃI
- Sản phẩm ngày tồn > 90: RỦI RO HẾT HẠN/LỖI THỜI

Trả lời bằng tiếng Việt, ngắn gọn và thực tế.`;

    userPrompt = `CẢNH BÁO: ${alertTitle}
Chi tiết: ${alertMessage || 'Sản phẩm tồn kho cao/bán chậm'}
Mức độ: ${alertSeverity === 'critical' ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO'}

Dữ liệu sản phẩm:
${productsContext}

Đề xuất 3-5 hành động:
1. Phân loại: "KHÔNG NHẬP THÊM", "GIẢM GIÁ NGAY", "KHUYẾN MÃI", "THEO DÕI"
2. Lý do và ước tính thiệt hại nếu không xử lý
3. Đề xuất mức giảm giá hoặc khuyến mãi nếu cần`;
  }
  else if (isRevenueDown || isTrendDown) {
    systemPrompt = `Bạn là chuyên gia phân tích kinh doanh. Phân tích sản phẩm có DOANH THU/XU HƯỚNG GIẢM và đưa ra chiến lược.

Quy tắc:
- Giảm < 10%: Biến động bình thường, theo dõi
- Giảm 10-30%: Cần điều chỉnh chiến lược
- Giảm > 30%: Cần hành động ngay

Phân tích nguyên nhân có thể:
- Mùa vụ / xu hướng thị trường
- Cạnh tranh giá
- Chất lượng sản phẩm
- Vấn đề trưng bày/marketing

Trả lời bằng tiếng Việt, đưa ra giải pháp cụ thể.`;

    userPrompt = `CẢNH BÁO: ${alertTitle}
Chi tiết: ${alertMessage || 'Doanh thu/xu hướng giảm'}
Mức độ: ${alertSeverity === 'critical' ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO'}

Dữ liệu sản phẩm:
${productsContext}

Hãy phân tích và đề xuất:
1. Nguyên nhân có thể của việc giảm
2. Hành động: "GIẢM GIÁ", "TĂNG MARKETING", "THAY ĐỔI VỊ TRÍ", "GIẢM LƯỢNG NHẬP", "NGỪNG NHẬP"
3. Chiến lược phục hồi doanh số
4. Nên tiếp tục nhập hay dừng nhập?`;
  }
  else if (isRevenueUp || isTrendUp) {
    systemPrompt = `Bạn là chuyên gia phân tích kinh doanh. Phân tích sản phẩm có DOANH THU/XU HƯỚNG TĂNG và đưa ra chiến lược tận dụng cơ hội.

Quy tắc:
- Tăng < 20%: Tốt, duy trì chiến lược hiện tại
- Tăng 20-50%: Rất tốt, xem xét tăng stock
- Tăng > 50%: Xuất sắc, đảm bảo đủ hàng và tối ưu margin

Cân nhắc:
- Có phải xu hướng bền vững hay nhất thời?
- Có nên tăng giá để tối ưu margin?
- Có sản phẩm liên quan để cross-sell?

Trả lời bằng tiếng Việt, tận dụng cơ hội tối đa.`;

    userPrompt = `CẢNH BÁO: ${alertTitle}
Chi tiết: ${alertMessage || 'Doanh thu/xu hướng tăng'}
Mức độ: ${alertSeverity === 'critical' ? 'Rất tốt' : 'Tốt'}

Dữ liệu sản phẩm:
${productsContext}

Hãy phân tích và đề xuất:
1. Đánh giá: Xu hướng có bền vững không?
2. Hành động: "TĂNG LƯỢNG NHẬP", "TỐI ƯU GIÁ", "CROSS-SELL", "DUY TRÌ"
3. Đề xuất số lượng nhập thêm (nếu cần)
4. Sản phẩm liên quan có thể đẩy mạnh
5. Cơ hội tối ưu margin`;
  }
  else {
    // Generic alert
    systemPrompt = `Bạn là chuyên gia quản lý bán lẻ. Phân tích dữ liệu sản phẩm và đưa ra đề xuất phù hợp với cảnh báo.

Trả lời bằng tiếng Việt, ngắn gọn và có thể hành động được.`;

    userPrompt = `CẢNH BÁO: ${alertTitle}
Chi tiết: ${alertMessage || 'Cảnh báo cần xử lý'}
Mức độ: ${alertSeverity === 'critical' ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO'}
Loại: ${alertType}

Dữ liệu sản phẩm:
${productsContext}

Hãy phân tích và đề xuất 3-5 hành động cụ thể:
1. Đánh giá tình trạng
2. Hành động cần thực hiện
3. Ưu tiên và mức độ cấp bách
4. Nên nhập thêm hay không và số lượng bao nhiêu?`;
  }

  return { systemPrompt, userPrompt };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, alertType, alertTitle, alertMessage, alertSeverity, topProducts } = await req.json();
    
    console.log("Processing alert:", { alertType, alertTitle, alertSeverity, productCount: topProducts?.length });
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Build context from products data
    const productsContext = topProducts.map((p: any, i: number) => 
      `${i + 1}. ${p.object_name} - Tồn kho: ${p.current_stock || 0}, Ngày tồn: ${Math.round(p.days_of_stock || 0)}, Velocity: ${(p.sales_velocity || 0).toFixed(2)}/ngày, Xu hướng: ${(p.trend_percent || 0).toFixed(1)}%, Doanh thu: ${(p.revenue_7d || 0).toLocaleString()}đ`
    ).join('\n');

    // Build context-aware prompts
    const { systemPrompt, userPrompt } = buildPrompts(
      alertType || '', 
      alertTitle || '', 
      alertMessage || '', 
      alertSeverity || 'warning',
      productsContext
    );

    console.log("Alert category detected, calling OpenAI...");

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

    console.log("AI recommendations generated successfully for alert type:", alertType);

    return new Response(JSON.stringify({ 
      recommendations,
      productsAnalyzed: topProducts.length,
      alertType,
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
