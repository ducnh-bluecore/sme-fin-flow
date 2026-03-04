import { corsHeaders, requireAuth, isErrorResponse, jsonResponse, errorResponse } from '../_shared/auth.ts';

/**
 * Store AI Analysis - Uses Claude (Anthropic) API
 * Generates strategic retail analysis based on store performance data template.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích bán lẻ (Retail Analyst) của Bluecore. Nhiệm vụ: phân tích dữ liệu cửa hàng và đưa ra nhận định chiến lược.

**NGUYÊN TẮC:**
1. CHỈ SỬ DỤNG SỐ LIỆU ĐƯỢC CUNG CẤP - không bịa số
2. So sánh Store vs Chuỗi TB vs Tier TB để tìm gap
3. Xác định vấn đề là do Traffic (số giao dịch) hay Ticket Size (AOV)
4. Đưa ra 3-5 khuyến nghị hành động cụ thể, có deadline
5. Viết tiếng Việt, ngắn gọn, dùng bullet points
6. Format markdown rõ ràng

**CẤU TRÚC OUTPUT BẮT BUỘC:**

## 📊 Tổng quan hiệu suất
- Đánh giá nhanh store (1-2 câu)
- So sánh vs chuỗi & tier

## 🔍 Chẩn đoán vấn đề
- Traffic vs Ticket Size analysis
- Category gap analysis (store vs chain)
- Price segment anomalies

## ⚠️ Rủi ro & Cảnh báo
- Các chỉ số đáng lo ngại
- Trend xấu nếu có

## 💡 Khuyến nghị hành động
- 3-5 actions cụ thể
- Mỗi action có: Việc cần làm | Ai chịu trách nhiệm | Deadline
- Ưu tiên theo impact

## 📈 Cơ hội tăng trưởng
- Quick wins
- Mid-term opportunities`;

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
        max_tokens: 4096,
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
