import { corsHeaders } from '../_shared/auth.ts';

/**
 * What-If Chat Function
 * 
 * This is a public-facing AI chat function that uses Lovable AI gateway.
 * Auth is optional - it works for both authenticated and anonymous users.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, scenarioContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Bạn là trợ lý AI phân tích What-If tài chính. Trả lời NGẮN GỌN theo cấu trúc sau:

**CẤU TRÚC TRẢ LỜI BẮT BUỘC:**

1. **📊 Dữ liệu có sẵn:** Liệt kê ngắn gọn data đang dùng để trả lời
2. **💡 Phân tích:** 2-3 câu trả lời trực tiếp câu hỏi với con số cụ thể
3. **📈 Đề xuất data bổ sung:** (nếu có) Data nào giúp phân tích chính xác hơn

**DỮ LIỆU KỊCH BẢN HIỆN TẠI:**
${scenarioContext ? JSON.stringify(scenarioContext, null, 2) : 'Chưa có kịch bản'}

**QUY TẮC QUAN TRỌNG:**
- **CHỈ SỬ DỤNG SỐ LIỆU CÓ TRONG DỮ LIỆU KỊCH BẢN TRÊN** - TUYỆT ĐỐI không tự bịa số liệu
- Nếu không tìm thấy số liệu cụ thể trong data, nói rõ "Không có data về [X]" thay vì đưa ra con số
- Khi trích dẫn số liệu, ghi rõ nguồn từ field nào trong data
- Tiếng Việt, tối đa 150 từ
- Nếu thiếu data: nói rõ cần gì, không đoán mò
- Emoji tiêu đề giúp dễ đọc`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Quá nhiều yêu cầu, vui lòng thử lại sau." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Hết credits, vui lòng nạp thêm." }), {
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
    console.error("whatif-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Lỗi không xác định" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
