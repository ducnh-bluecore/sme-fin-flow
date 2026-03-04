import { corsHeaders, requireAuth, isErrorResponse, jsonResponse, errorResponse } from '../_shared/auth.ts';

/**
 * Store AI Analysis - Uses Claude (Anthropic) API
 * Generates strategic retail analysis based on store performance data template.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `Bạn là Chief Retail Strategist của Bluecore — tư vấn trực tiếp cho CEO/CFO chuỗi bán lẻ thời trang.

**VAI TRÒ:** Bạn không phải dashboard. Bạn là advisor ra quyết định. Mọi phân tích phải dẫn đến HÀNH ĐỘNG cụ thể.

**NGUYÊN TẮC VÀNG (FDP Manifesto):**
1. CHỈ SỬ DỤNG SỐ LIỆU ĐƯỢC CUNG CẤP — tuyệt đối không bịa số
2. TRUTH > FLEXIBILITY — nói thẳng vấn đề, không làm đẹp số
3. SURFACE PROBLEMS — phát hiện anomaly, không che giấu
4. Mọi insight phải dẫn đến quyết định rõ ràng hơn, nếu không → insight đó thất bại

**TƯ DUY PHÂN TÍCH BẮT BUỘC:**
- Traffic vs Ticket Size: Store bán ít vì ít khách vào (traffic) hay vì khách vào nhưng mua ít/rẻ (AOV)?
- Category Gap: So sánh mix sản phẩm store vs chuỗi — thiếu category nào đang là driver chính?
- Target Sanity Check: Target có realistic so với thực lực store và tier không? Nếu lệch >2x thì phải nói thẳng.
- Concentration Risk: Top 5 SKU chiếm bao nhiêu % doanh thu? Nếu >50% → rủi ro phụ thuộc
- Conversion Signal: Từ số khách → số giao dịch → items/đơn, tìm điểm rơi

**CẤU TRÚC OUTPUT BẮT BUỘC:**

## 🚨 BỨC TRANH TỔNG THỂ
- 2-3 câu đánh giá thẳng: store này đang ở trạng thái gì? (khỏe/có vấn đề cấu trúc/cần can thiệp khẩn)
- Bảng doanh thu thực tế vs target theo tháng — tính run rate và % đạt
- Nếu target lệch >2x thực lực → nói thẳng "target không khả thi"

## 1. MẠNH / YẾU Ở ĐÂU?
- ✅ Tín hiệu tốt (nếu có) — chứng minh store không phải "chết"
- 🔴 Vấn đề cốt lõi — xác định rõ: traffic thấp, AOV thấp, hay cả hai?
- So sánh cụ thể với con số: Store X vs Tier TB Y vs Chuỗi TB Z

## 2. PRODUCT MIX — PHÂN TÍCH SÂU
- Bảng so sánh category: Store vs Chuỗi vs Tier, highlight lệch >10 pts
- Category nào đang thiếu/thừa? Tại sao quan trọng?
- "Khác/Others" nếu chiếm >15% → cảnh báo anomaly data
- Price segment bất thường (ví dụ: band cao chiếm nhiều hơn chuỗi → insight tệp khách)

## 3. TOP/BOTTOM SP — INSIGHT CHIẾN LƯỢC
- Top 5 nói lên điều gì về tệp khách, collection nào đang chạy?
- Bottom 5 nói lên điều gì về hàng chết, vấn đề assortment?
- Volume/SKU có quá thấp không? (< 2 cái/SKU/tuần = cần xem lại)

## 4. CHẨN ĐOÁN NGUYÊN NHÂN — ĐƯA RA GIẢ THUYẾT
- Đưa ra 2-3 giả thuyết cụ thể giải thích vấn đề (A, B, C)
- Mỗi giả thuyết phải có: mô tả + bằng chứng từ data + cách xác minh
- KHÔNG đoán mò — nếu thiếu data, nói rõ cần data gì

## 5. CEO NÊN LÀM GÌ NGAY — 3 HÀNH ĐỘNG ƯU TIÊN
- 🥇🥈🥉 format, mỗi hành động phải có:
  - Việc cụ thể cần làm
  - Kỳ vọng impact (con số nếu có thể ước tính từ data)
  - Ai chịu trách nhiệm
- Cuối cùng: 1-2 câu hỏi CEO cần trả lời ngay để unlock quyết định tiếp theo

## TÓM LẠI
- 3-4 câu tóm tắt bản chất vấn đề và hướng đi
- Câu hỏi CEO cần trả lời ngay

**FORMAT:**
- Tiếng Việt, giọng điệu thẳng thắn như tư vấn CEO, không rào đón
- Dùng bảng markdown khi so sánh số liệu
- Bold highlight cho insight quan trọng
- Không emoji thừa, chỉ dùng cho heading và priority markers`;


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const context = await requireAuth(req);
    if (isErrorResponse(context)) return context;

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      return errorResponse('ANTHROPIC_API_KEY chưa được cấu hình. Vào Settings > API Keys để thêm.', 500);
    }

    const { storeData } = await req.json();
    if (!storeData) {
      return errorResponse('Missing storeData', 400);
    }

    // Build the analysis prompt from template data
    const userPrompt = `Phân tích chi tiết cửa hàng sau:

**Tên store:** ${storeData.storeName}
**Tier:** ${storeData.tier}
**Kỳ phân tích:** ${storeData.period}

**1. BENCHMARKS (Store | Chuỗi TB | Tier TB):**
- Doanh thu/ngày: ${storeData.benchmark?.store?.avg_daily_revenue ? (storeData.benchmark.store.avg_daily_revenue / 1e6).toFixed(1) + 'M' : 'N/A'} | ${storeData.benchmark?.chain_avg?.avg_daily_revenue ? (storeData.benchmark.chain_avg.avg_daily_revenue / 1e6).toFixed(1) + 'M' : 'N/A'} | ${storeData.benchmark?.same_tier_avg?.avg_daily_revenue ? (storeData.benchmark.same_tier_avg.avg_daily_revenue / 1e6).toFixed(1) + 'M' : 'N/A'}
- Số giao dịch/ngày: ${storeData.benchmark?.store?.avg_daily_txn?.toFixed(1) || 'N/A'} | ${storeData.benchmark?.chain_avg?.avg_daily_txn?.toFixed(1) || 'N/A'} | ${storeData.benchmark?.same_tier_avg?.avg_daily_txn?.toFixed(1) || 'N/A'}
- AOV: ${storeData.benchmark?.store?.avg_aov ? (storeData.benchmark.store.avg_aov / 1000).toFixed(0) + 'K' : 'N/A'} | ${storeData.benchmark?.chain_avg?.avg_aov ? (storeData.benchmark.chain_avg.avg_aov / 1000).toFixed(0) + 'K' : 'N/A'} | ${storeData.benchmark?.same_tier_avg?.avg_aov ? (storeData.benchmark.same_tier_avg.avg_aov / 1000).toFixed(0) + 'K' : 'N/A'}
- Khách/ngày: ${storeData.benchmark?.store?.avg_daily_customers?.toFixed(1) || 'N/A'} | ${storeData.benchmark?.chain_avg?.avg_daily_customers?.toFixed(1) || 'N/A'} | ${storeData.benchmark?.same_tier_avg?.avg_daily_customers?.toFixed(1) || 'N/A'}

**2. PHÂN KHÚC GIÁ (% doanh thu - Store | Chuỗi | Tier):**
${storeData.priceSegments?.map((s: any) => `- ${s.band}: ${s.store_pct?.toFixed(1)}% | ${s.chain_pct?.toFixed(1)}% | ${s.tier_pct?.toFixed(1)}%`).join('\n') || 'Không có data'}

**3. LOẠI SẢN PHẨM (% doanh thu - Store | Chuỗi | Tier):**
${storeData.categories?.map((c: any) => `- ${c.category}: ${c.store_pct?.toFixed(1)}% | ${c.chain_pct?.toFixed(1)}% | ${c.tier_pct?.toFixed(1)}%`).join('\n') || 'Không có data'}

**4. TOP 5 SP BÁN CHẠY:**
${storeData.topProducts?.map((p: any, i: number) => `${i + 1}. ${p.product_name} (${p.sku || 'N/A'}) - DT: ${p.revenue ? (p.revenue / 1e6).toFixed(1) + 'M' : 'N/A'} - SL: ${p.quantity || 'N/A'}`).join('\n') || 'Không có data'}

**5. BOTTOM 5 SP YẾU:**
${storeData.bottomProducts?.map((p: any, i: number) => `${i + 1}. ${p.product_name} (${p.sku || 'N/A'}) - DT: ${p.revenue ? (p.revenue / 1e6).toFixed(1) + 'M' : 'N/A'} - SL: ${p.quantity || 'N/A'}`).join('\n') || 'Không có data'}

**6. DOANH THU THEO THÁNG (Thực tế vs Mục tiêu):**
${storeData.monthlyGap?.map((m: any) => `- ${m.month}: ${(m.actual_revenue / 1e6).toFixed(1)}M ${m.target_revenue ? '/ Target: ' + (m.target_revenue / 1e6).toFixed(1) + 'M (' + (m.achievement_pct?.toFixed(1) || '?') + '%)' : '(chưa có target)'}`).join('\n') || 'Không có data'}

**7. CUSTOMER METRICS:**
- Tổng khách: ${storeData.customerKpis?.customerCount || 'N/A'}
- Items/đơn (IPT): ${storeData.customerKpis?.itemsPerTransaction || 'N/A'}
- Tỷ lệ quay lại: ${storeData.customerKpis?.returnRate || 'N/A'}%

Hãy phân tích và đưa ra nhận định chiến lược theo cấu trúc đã định.`;

    console.log(`[store-ai-analysis] Calling Claude for store: ${storeData.storeName}`);

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      if (response.status === 429) {
        return errorResponse('Claude rate limit. Vui lòng thử lại sau.', 429);
      }
      if (response.status === 401) {
        return errorResponse('API key không hợp lệ. Kiểm tra lại ANTHROPIC_API_KEY.', 401);
      }
      return errorResponse(`Claude API error: ${response.status}`, 500);
    }

    // Stream SSE from Claude back to client
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('store-ai-analysis error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
