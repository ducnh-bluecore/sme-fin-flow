import { corsHeaders } from '../_shared/auth.ts';

/**
 * What-If Chat Function
 * Uses Anthropic Claude API. Auth optional.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, scenarioContext } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

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

    // Convert messages: filter out system, keep user/assistant
    const claudeMessages = messages.filter((m: any) => m.role !== 'system');

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        system: systemPrompt,
        messages: claudeMessages,
        stream: true,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Quá nhiều yêu cầu, vui lòng thử lại sau." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Hết credits AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Lỗi AI gateway" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert Claude SSE stream to OpenAI-compatible format
    const claudeStream = response.body!;
    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = claudeStream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let newlineIdx: number;
            while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, newlineIdx).trim();
              buffer = buffer.slice(newlineIdx + 1);
              
              if (!line || !line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const event = JSON.parse(jsonStr);
                if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                  const openaiChunk = {
                    choices: [{ delta: { content: event.delta.text }, index: 0 }],
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                } else if (event.type === 'message_stop') {
                  controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                }
              } catch { /* ignore partial JSON */ }
            }
          }
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (e) {
          console.error('[whatif-chat] Stream transform error:', e);
          controller.close();
        }
      }
    });

    return new Response(transformedStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("whatif-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Lỗi không xác định" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
