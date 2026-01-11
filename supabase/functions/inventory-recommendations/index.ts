import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Determine alert category and build appropriate prompts
function buildPrompts(alertType: string, alertTitle: string, alertMessage: string, alertSeverity: string, category: string, productsContext: string) {
  const type = alertType?.toLowerCase() || '';
  const title = alertTitle?.toLowerCase() || '';
  
  // Category: PRODUCT - Low Stock
  const isLowStock = type.includes('dos_critical') || type.includes('dos_warning') || 
                     type.includes('stockout') || type.includes('inventory_low') ||
                     title.includes('tồn kho thấp') || title.includes('sắp hết');
  
  // Category: PRODUCT - High Stock / Slow Moving
  const isHighStock = type.includes('overstock') || type.includes('slow_moving') ||
                      type.includes('product_slow') || type.includes('inventory_expired') ||
                      title.includes('tồn kho cao') || title.includes('hàng chậm') || title.includes('hết hạn');
  
  // Category: BUSINESS - Revenue/Sales Issues
  const isRevenueDown = type.includes('revenue_critical') || type.includes('revenue_warning') ||
                        type.includes('revenue_down') || type.includes('sales_drop') ||
                        type.includes('sales_target_miss') || type.includes('revenue_growth_slow') ||
                        title.includes('doanh thu giảm') || title.includes('doanh số giảm') ||
                        title.includes('không đạt target');
  
  // Category: BUSINESS/KPI - Revenue/Sales Growth
  const isRevenueUp = type.includes('revenue_up') || type.includes('sales_growth') ||
                      type.includes('revenue_exceed') || 
                      title.includes('doanh thu tăng') || title.includes('tăng trưởng') ||
                      title.includes('vượt target');
  
  // Category: PRODUCT - Trend Analysis
  const isTrendDown = type.includes('trend_down') || type.includes('declining') ||
                      title.includes('xu hướng giảm');
  
  const isTrendUp = type.includes('trend_up') || type.includes('growing') ||
                    title.includes('xu hướng tăng');

  // Category: STORE - Store Operations
  const isStoreIssue = type.includes('store') || type.includes('staff') ||
                       category === 'store' ||
                       title.includes('cửa hàng') || title.includes('nhân sự');

  // Category: CUSTOMER - Customer Related
  const isCustomerIssue = type.includes('customer') || type.includes('churn') ||
                          category === 'customer' ||
                          title.includes('khách hàng');

  // Category: FULFILLMENT - Order Fulfillment
  const isFulfillmentIssue = type.includes('fulfillment') || type.includes('delivery') ||
                             type.includes('delayed') || category === 'fulfillment' ||
                             title.includes('giao hàng') || title.includes('đơn hàng');

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
    systemPrompt = `Bạn là chuyên gia quản lý tồn kho. Phân tích sản phẩm TỒN KHO CAO, BÁN CHẬM hoặc SẮP HẾT HẠN và đưa ra đề xuất.

Quy tắc:
- Sản phẩm velocity = 0 hoặc rất thấp: KHÔNG NÊN NHẬP THÊM
- Sản phẩm ngày tồn > 60 và xu hướng giảm: XEM XÉT GIẢM GIÁ/KHUYẾN MÃI
- Sản phẩm ngày tồn > 90: RỦI RO HẾT HẠN/LỖI THỜI
- Sản phẩm sắp hết hạn: KHUYẾN MÃI GẤP hoặc TRẢ NCC

Trả lời bằng tiếng Việt, ngắn gọn và thực tế.`;

    userPrompt = `CẢNH BÁO: ${alertTitle}
Chi tiết: ${alertMessage || 'Sản phẩm tồn kho cao/bán chậm/sắp hết hạn'}
Mức độ: ${alertSeverity === 'critical' ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO'}

Dữ liệu sản phẩm:
${productsContext}

Đề xuất 3-5 hành động:
1. Phân loại: "KHÔNG NHẬP THÊM", "GIẢM GIÁ NGAY", "KHUYẾN MÃI", "TRẢ NCC", "THANH LÝ"
2. Lý do và ước tính thiệt hại nếu không xử lý
3. Đề xuất mức giảm giá hoặc khuyến mãi nếu cần`;
  }
  else if (isRevenueDown) {
    systemPrompt = `Bạn là chuyên gia phân tích kinh doanh. Phân tích sản phẩm/cửa hàng có DOANH THU GIẢM hoặc KHÔNG ĐẠT TARGET và đưa ra chiến lược.

Quy tắc:
- Giảm < 10%: Biến động bình thường, theo dõi
- Giảm 10-30%: Cần điều chỉnh chiến lược
- Giảm > 30%: Cần hành động ngay

Phân tích nguyên nhân có thể:
- Mùa vụ / xu hướng thị trường
- Cạnh tranh giá
- Chất lượng sản phẩm
- Vấn đề trưng bày/marketing
- Thiếu hàng bán

Trả lời bằng tiếng Việt, đưa ra giải pháp cụ thể.`;

    userPrompt = `CẢNH BÁO: ${alertTitle}
Chi tiết: ${alertMessage || 'Doanh thu/doanh số giảm hoặc không đạt target'}
Mức độ: ${alertSeverity === 'critical' ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO'}

Dữ liệu:
${productsContext}

Hãy phân tích và đề xuất:
1. Nguyên nhân có thể của việc giảm
2. Hành động: "GIẢM GIÁ", "TĂNG MARKETING", "THAY ĐỔI VỊ TRÍ", "ĐIỀU CHỈNH STOCK"
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

    userPrompt = `THÔNG BÁO TÍCH CỰC: ${alertTitle}
Chi tiết: ${alertMessage || 'Doanh thu/xu hướng tăng'}
Mức độ: Cơ hội kinh doanh

Dữ liệu sản phẩm:
${productsContext}

Hãy phân tích và đề xuất:
1. Đánh giá: Xu hướng có bền vững không?
2. Hành động: "TĂNG LƯỢNG NHẬP", "TỐI ƯU GIÁ", "CROSS-SELL", "DUY TRÌ"
3. Đề xuất số lượng nhập thêm (nếu cần)
4. Sản phẩm liên quan có thể đẩy mạnh
5. Cơ hội tối ưu margin`;
  }
  else if (isTrendDown) {
    systemPrompt = `Bạn là chuyên gia phân tích xu hướng bán hàng. Phân tích sản phẩm có XU HƯỚNG GIẢM và đưa ra cảnh báo sớm.

Quy tắc:
- Xu hướng giảm nhẹ (< 15%): Theo dõi thêm
- Xu hướng giảm vừa (15-30%): Cân nhắc điều chỉnh lượng nhập
- Xu hướng giảm mạnh (> 30%): Dừng nhập, xem xét khuyến mãi

Trả lời bằng tiếng Việt, đưa ra dự báo và hành động.`;

    userPrompt = `CẢNH BÁO: ${alertTitle}
Chi tiết: ${alertMessage || 'Xu hướng giảm'}
Mức độ: ${alertSeverity === 'critical' ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO'}

Dữ liệu sản phẩm:
${productsContext}

Hãy phân tích và đề xuất:
1. Đánh giá mức độ giảm và dự báo xu hướng tiếp theo
2. Hành động: "DỪNG NHẬP", "GIẢM LƯỢNG NHẬP", "KHUYẾN MÃI", "THEO DÕI"
3. Có nên tiếp tục kinh doanh sản phẩm này?
4. Đề xuất số lượng nhập (nếu còn nhập)`;
  }
  else if (isStoreIssue) {
    systemPrompt = `Bạn là chuyên gia quản lý cửa hàng bán lẻ. Phân tích vấn đề CỬA HÀNG hoặc NHÂN SỰ và đưa ra giải pháp.

Các vấn đề thường gặp:
- Thiếu nhân sự: Điều động từ store khác, tuyển dụng gấp
- Hiệu suất thấp: Training, đánh giá KPI
- Vấn đề vận hành: Quy trình, thiết bị

Trả lời bằng tiếng Việt, thực tế và có thể thực hiện ngay.`;

    userPrompt = `CẢNH BÁO CỬA HÀNG: ${alertTitle}
Chi tiết: ${alertMessage || 'Vấn đề liên quan đến cửa hàng/nhân sự'}
Mức độ: ${alertSeverity === 'critical' ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO'}

Dữ liệu liên quan:
${productsContext}

Hãy đề xuất:
1. Nguyên nhân có thể
2. Giải pháp ngắn hạn (thực hiện ngay)
3. Giải pháp dài hạn (phòng ngừa)
4. Người/bộ phận cần thực hiện`;
  }
  else if (isCustomerIssue) {
    systemPrompt = `Bạn là chuyên gia Customer Success. Phân tích vấn đề KHÁCH HÀNG như churn risk, satisfaction và đưa ra chiến lược giữ chân.

Quy tắc:
- Churn risk cao: Liên hệ ngay, ưu đãi đặc biệt
- Satisfaction thấp: Tìm hiểu nguyên nhân, cải thiện dịch vụ
- Khách VIP có vấn đề: Ưu tiên cao nhất

Trả lời bằng tiếng Việt, tập trung vào retention.`;

    userPrompt = `CẢNH BÁO KHÁCH HÀNG: ${alertTitle}
Chi tiết: ${alertMessage || 'Vấn đề liên quan đến khách hàng'}
Mức độ: ${alertSeverity === 'critical' ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO'}

Dữ liệu:
${productsContext}

Hãy đề xuất:
1. Đánh giá mức độ rủi ro mất khách
2. Hành động: "LIÊN HỆ NGAY", "ƯU ĐÃI ĐẶC BIỆT", "CẢI THIỆN DỊCH VỤ", "THEO DÕI"
3. Kịch bản chăm sóc khách hàng
4. Cách phòng ngừa tương lai`;
  }
  else if (isFulfillmentIssue) {
    systemPrompt = `Bạn là chuyên gia Fulfillment/Logistics. Phân tích vấn đề GIAO HÀNG, ĐƠN HÀNG CHẬM TRỄ và đưa ra giải pháp.

Quy tắc:
- Delay < 1 ngày: Thông báo khách hàng
- Delay 1-3 ngày: Đền bù + xin lỗi
- Delay > 3 ngày: Escalate, giải pháp đặc biệt

Trả lời bằng tiếng Việt, giảm thiểu ảnh hưởng khách hàng.`;

    userPrompt = `CẢNH BÁO FULFILLMENT: ${alertTitle}
Chi tiết: ${alertMessage || 'Vấn đề giao hàng/đơn hàng'}
Mức độ: ${alertSeverity === 'critical' ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO'}

Dữ liệu:
${productsContext}

Hãy đề xuất:
1. Nguyên nhân delay
2. Hành động: "LIÊN HỆ KHÁCH", "ĐỀN BÙ", "ĐỔI NHÀ VẬN CHUYỂN", "ĐIỀU PHỐI LẠI"
3. Cách xử lý với khách hàng
4. Biện pháp phòng ngừa`;
  }
  else {
    // Generic alert
    systemPrompt = `Bạn là chuyên gia quản lý bán lẻ đa năng. Phân tích cảnh báo và đưa ra đề xuất phù hợp.

Các nguyên tắc:
- Đánh giá mức độ nghiêm trọng
- Đề xuất hành động cụ thể, có thể thực hiện ngay
- Phân công người/bộ phận thực hiện
- Đề xuất timeline

Trả lời bằng tiếng Việt, ngắn gọn và thực tế.`;

    userPrompt = `CẢNH BÁO: ${alertTitle}
Chi tiết: ${alertMessage || 'Cảnh báo cần xử lý'}
Mức độ: ${alertSeverity === 'critical' ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO'}
Loại: ${alertType}
Danh mục: ${category}

Dữ liệu liên quan:
${productsContext}

Hãy phân tích và đề xuất:
1. Đánh giá tình trạng và mức độ ưu tiên
2. Hành động cần thực hiện ngay
3. Người/bộ phận phụ trách
4. Timeline thực hiện
5. Cách đo lường kết quả`;
  }

  return { systemPrompt, userPrompt };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, alertType, alertTitle, alertMessage, alertSeverity, alertCategory, topProducts } = await req.json();
    
    console.log("Processing alert:", { alertType, alertTitle, alertSeverity, alertCategory, productCount: topProducts?.length });
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Build context from products data
    const productsContext = topProducts.map((p: any, i: number) => {
      const parts = [`${i + 1}. ${p.object_name || p.name || 'N/A'}`];
      if (p.current_stock !== undefined) parts.push(`Tồn kho: ${p.current_stock}`);
      if (p.days_of_stock !== undefined) parts.push(`Ngày tồn: ${Math.round(p.days_of_stock)}`);
      if (p.sales_velocity !== undefined) parts.push(`Velocity: ${(p.sales_velocity).toFixed(2)}/ngày`);
      if (p.trend_percent !== undefined) parts.push(`Xu hướng: ${(p.trend_percent).toFixed(1)}%`);
      if (p.revenue_7d !== undefined) parts.push(`Doanh thu 7d: ${(p.revenue_7d).toLocaleString()}đ`);
      if (p.revenue_change !== undefined) parts.push(`Thay đổi DT: ${(p.revenue_change).toFixed(1)}%`);
      return parts.join(' - ');
    }).join('\n');

    // Build context-aware prompts
    const { systemPrompt, userPrompt } = buildPrompts(
      alertType || '', 
      alertTitle || '', 
      alertMessage || '', 
      alertSeverity || 'warning',
      alertCategory || '',
      productsContext || 'Không có dữ liệu chi tiết'
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
      productsAnalyzed: topProducts?.length || 0,
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
