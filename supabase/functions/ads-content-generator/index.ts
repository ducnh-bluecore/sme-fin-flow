import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_PROMPTS: Record<string, string> = {
  tiktok: "Viết nội dung quảng cáo cho TikTok Shop. Phong cách: ngắn gọn, trending, dùng hashtag viral. Giới hạn 150 từ cho caption.",
  meta: "Viết nội dung quảng cáo cho Facebook/Instagram Ads. Phong cách: storytelling, emotional, có CTA rõ ràng. Giới hạn 200 từ.",
  google: "Viết nội dung quảng cáo cho Google Ads (Search + Shopping). Headline tối đa 30 ký tự x 3, Description tối đa 90 ký tự x 2.",
  shopee: "Viết nội dung quảng cáo cho Shopee. Phong cách: deal-focused, urgency, flash sale. Giới hạn 100 từ cho listing title + description.",
};

const CONTENT_TYPE_PROMPTS: Record<string, string> = {
  image_caption: "Tạo caption cho hình ảnh quảng cáo sản phẩm.",
  video_script: "Tạo kịch bản video quảng cáo ngắn (15-30 giây). Chia thành: Hook (3s), Problem (5s), Solution (10s), CTA (5s).",
  product_listing: "Tạo tiêu đề và mô tả sản phẩm cho listing trên sàn.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tenant_id, product_id, platform, content_type, media_urls, user_id } = await req.json();
    if (!tenant_id || !platform || !content_type) {
      throw new Error("tenant_id, platform, content_type required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch product info from products table (not external_products)
    let productInfo = "";
    if (product_id) {
      const { data: product } = await supabase
        .from("products")
        .select("name, sku, description, selling_price, cost_price, category, subcategory, brand")
        .eq("id", product_id)
        .single();

      if (product) {
        productInfo = `
Thông tin sản phẩm:
- Tên: ${product.name || "N/A"}
- SKU: ${product.sku || "N/A"}
- Mô tả: ${product.description || "N/A"}
- Giá bán: ${product.selling_price ? `${Number(product.selling_price).toLocaleString()}đ` : "N/A"}
- Giá vốn: ${product.cost_price ? `${Number(product.cost_price).toLocaleString()}đ` : "N/A"}
- Danh mục: ${product.category || "N/A"} / ${product.subcategory || "N/A"}
- Thương hiệu: ${product.brand || "N/A"}
        `.trim();
      }
    }

    const systemPrompt = `Bạn là chuyên gia marketing digital chuyên viết nội dung quảng cáo cho thị trường Việt Nam.
Quy tắc:
1. Viết bằng tiếng Việt
2. Tạo nội dung hấp dẫn, chuyên nghiệp
3. Phù hợp với nền tảng và loại nội dung được yêu cầu
4. Trả về JSON với format: { "title": "...", "body": "...", "hashtags": ["...", "..."] }
5. Hashtags phải relevant và trending cho nền tảng đó
6. NẾU có thông tin sản phẩm, PHẢI dùng thông tin thật, KHÔNG được bịa thêm`;

    const userPrompt = `${PLATFORM_PROMPTS[platform] || "Viết nội dung quảng cáo."}
${CONTENT_TYPE_PROMPTS[content_type] || ""}
${productInfo}

Hãy tạo nội dung quảng cáo phù hợp. Trả về JSON.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools: [{
          type: "function",
          function: {
            name: "create_ad_content",
            description: "Create ad content with title, body, and hashtags",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Ad title/headline" },
                body: { type: "string", description: "Ad body/description" },
                hashtags: { type: "array", items: { type: "string" }, description: "Relevant hashtags" },
              },
              required: ["title", "body", "hashtags"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_ad_content" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = { title: "", body: "", hashtags: [] as string[] };

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        content = JSON.parse(toolCall.function.arguments);
      } catch {
        const msgContent = aiData.choices?.[0]?.message?.content || "";
        const jsonMatch = msgContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) content = JSON.parse(jsonMatch[0]);
      }
    }

    // Save to ads_content with media_urls
    const { data: savedContent, error: saveError } = await supabase
      .from("ads_content")
      .insert({
        tenant_id,
        platform,
        product_id: product_id || null,
        content_type,
        title: content.title,
        body: content.body,
        hashtags: content.hashtags,
        media_urls: media_urls || null,
        status: "pending_review",
        created_by: user_id || null,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify({ content: savedContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ads-content-generator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
