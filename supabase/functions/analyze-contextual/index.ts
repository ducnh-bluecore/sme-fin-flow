import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Context-specific prompts
const contextPrompts: Record<string, string> = {
  general: `Bạn là chuyên gia phân tích tài chính doanh nghiệp e-commerce. Phân tích tổng quan sức khỏe tài chính và đưa ra:
1. **Tổng quan** (1-2 câu)
2. **3-5 Insights quan trọng**
3. **Cảnh báo rủi ro** nếu có
4. **Đề xuất hành động** (2-3 gợi ý)`,

  profitability: `Bạn là chuyên gia phân tích lợi nhuận e-commerce. Phân tích dữ liệu và đưa ra:
1. **Đánh giá biên lợi nhuận** - Gross margin theo kênh
2. **Phân tích cơ cấu chi phí** - COGS, marketing, operations
3. **Xu hướng lợi nhuận** - Tăng/giảm theo thời gian
4. **Đề xuất cải thiện** - Cách tối ưu lợi nhuận`,

  pl_report: `Bạn là CFO phân tích báo cáo Lãi/Lỗ e-commerce. Đánh giá:
1. **Hiệu suất doanh thu** - Tăng trưởng, nguồn thu chính theo kênh
2. **Kiểm soát chi phí** - COGS, chi phí vận hành, marketing
3. **Điểm hòa vốn** - Phân tích break-even
4. **Dự báo** - Xu hướng quý/năm tới`,

  analytics: `Bạn là Business Analyst e-commerce. Phân tích báo cáo tổng hợp:
1. **KPIs chính** - Revenue, Margin, AOV, Order Count
2. **Hiệu suất kênh** - So sánh các marketplace
3. **Dòng tiền** - Xu hướng cash flow
4. **Benchmark** - So sánh với kỳ trước`,

  financial_analysis: `Bạn là Financial Analyst. Đánh giá sức khỏe tài chính:
1. **Các tỷ số tài chính** - Margin, ROAS, CPA
2. **So sánh kỳ trước** - Thay đổi theo comparison_value
3. **Phân tích rủi ro** - Alerts đang mở
4. **Khuyến nghị** - Hành động cần thiết`,

  revenue: `Bạn là Revenue Analyst e-commerce. Phân tích doanh thu:
1. **Cơ cấu doanh thu** - Theo kênh bán (Shopee, Lazada, TikTok, KiotViet)
2. **Xu hướng** - Mùa vụ, tăng trưởng 30 ngày
3. **Top performers** - Kênh/sản phẩm đóng góp nhiều nhất
4. **Cơ hội** - Đề xuất tăng doanh thu`,

  expenses: `Bạn là Cost Controller. Phân tích chi phí:
1. **Cơ cấu chi phí** - COGS, marketing, logistics, operations
2. **Chi phí bất thường** - Vượt ngân sách
3. **Xu hướng** - So với các kỳ trước
4. **Tiết kiệm** - Đề xuất cắt giảm chi phí`,

  scenario: `Bạn là Strategic Financial Planner chuyên phân tích độ nhạy. Dựa vào dữ liệu kịch bản và Monte Carlo:
1. **Phân tích độ nhạy** - Biến số ảnh hưởng nhất đến EBITDA
2. **Đánh giá rủi ro** - VaR, xác suất EBITDA âm
3. **Đề xuất tối ưu** - Cần tăng/giảm bao nhiêu %
4. **Hành động ưu tiên** (top 3)
Trả lời với số liệu cụ thể.`,

  budget_vs_actual: `Bạn là CFO Advisor phân tích Budget vs Actual. Dựa vào dữ liệu:
1. **Đánh giá hiệu suất** - Revenue/Opex/EBITDA vs plan
2. **Cảnh báo** - Tháng nào variance lớn nhất
3. **Đề xuất hành động** (Top 5) - Hành động, mục tiêu, timeline, owner, priority
4. **Dự báo cuối năm** - Nếu giữ trend hiện tại
Trả lời actionable, có thể quyết định ngay.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY: Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "INVALID_TOKEN" }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;

    // SECURITY: Tenant isolation
    const { data: tenantUser } = await supabase
      .from('tenant_users').select('tenant_id').eq('user_id', userId).maybeSingle();
    if (!tenantUser?.tenant_id) {
      return new Response(JSON.stringify({ error: "Forbidden", code: "NO_TENANT" }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantId = tenantUser.tenant_id;
    const { context = 'general' } = await req.json();
    console.log(`Analyzing context: ${context} for tenant: ${tenantId} (SSOT)`);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // =============================================
    // SSOT DATA: L2/L3/L4 based on context
    // =============================================
    
    // Always fetch: KPI snapshot + customer count
    const [kpiResult, customerCountResult] = await Promise.all([
      supabase.from('kpi_facts_daily')
        .select('metric_code, value, comparison_value, dimension_type, dimension_value')
        .eq('tenant_id', tenantId)
        .eq('dimension_type', 'total')
        .eq('period_type', 'daily')
        .order('grain_date', { ascending: false })
        .limit(20),
      supabase.from('cdp_customers')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
    ]);

    const kpiLatest = kpiResult.data || [];
    const getKpi = (code: string) => kpiLatest.find(k => k.metric_code === code);

    const financialData: Record<string, any> = {
      dataSource: 'SSOT L2/L3',
      summary: {
        netRevenue: getKpi('NET_REVENUE')?.value || 0,
        orderCount: getKpi('ORDER_COUNT')?.value || 0,
        aov: getKpi('AOV')?.value || 0,
        grossMarginPct: getKpi('GROSS_MARGIN')?.value || 0,
        cogs: getKpi('COGS')?.value || 0,
        customerCount: customerCountResult.count || 0,
      },
    };

    // Context-specific data fetches
    if (context === 'profitability' || context === 'pl_report' || context === 'financial_analysis') {
      const [channelKpiResult, expResult] = await Promise.all([
        supabase.from('kpi_facts_daily')
          .select('metric_code, value, dimension_value')
          .eq('tenant_id', tenantId)
          .eq('dimension_type', 'channel')
          .in('metric_code', ['NET_REVENUE', 'GROSS_MARGIN', 'COGS'])
          .order('grain_date', { ascending: false })
          .limit(50),
        supabase.from('expenses')
          .select('category, amount')
          .eq('tenant_id', tenantId)
          .gte('expense_date', thirtyDaysAgo),
      ]);

      const channelKpis = channelKpiResult.data || [];
      const expenseByCategory: Record<string, number> = {};
      for (const e of (expResult.data || [])) {
        expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
      }

      financialData.marginByChannel = channelKpis
        .filter(k => k.metric_code === 'GROSS_MARGIN')
        .map(k => ({ channel: k.dimension_value, marginPct: k.value }));
      financialData.revenueByChannel = channelKpis
        .filter(k => k.metric_code === 'NET_REVENUE')
        .map(k => ({ channel: k.dimension_value, revenue: k.value }));
      financialData.expenseBreakdown = Object.entries(expenseByCategory)
        .sort((a, b) => (b[1] as number) - (a[1] as number));
    }

    if (context === 'revenue' || context === 'analytics') {
      const [channelRevenueResult, trendResult] = await Promise.all([
        supabase.from('kpi_facts_daily')
          .select('dimension_value, value')
          .eq('tenant_id', tenantId)
          .eq('metric_code', 'NET_REVENUE')
          .eq('dimension_type', 'channel')
          .order('grain_date', { ascending: false })
          .limit(10),
        supabase.from('kpi_facts_daily')
          .select('grain_date, value')
          .eq('tenant_id', tenantId)
          .eq('metric_code', 'NET_REVENUE')
          .eq('dimension_type', 'total')
          .eq('period_type', 'daily')
          .gte('grain_date', thirtyDaysAgo)
          .order('grain_date', { ascending: true }),
      ]);

      financialData.revenueByChannel = (channelRevenueResult.data || [])
        .map(k => ({ channel: k.dimension_value, revenue: k.value }));
      financialData.revenueTrend30d = (trendResult.data || [])
        .map(k => ({ date: k.grain_date, revenue: k.value }));
    }

    if (context === 'expenses') {
      const [expResult] = await Promise.all([
        supabase.from('expenses')
          .select('category, vendor_name, amount')
          .eq('tenant_id', tenantId)
          .gte('expense_date', thirtyDaysAgo),
      ]);

      const exps = expResult.data || [];
      const byCategory: Record<string, number> = {};
      const byVendor: Record<string, number> = {};
      for (const e of exps) {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
        const v = e.vendor_name || 'Không xác định';
        byVendor[v] = (byVendor[v] || 0) + e.amount;
      }

      financialData.expenseByCategory = byCategory;
      financialData.topVendors = Object.entries(byVendor)
        .sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5);
    }

    if (context === 'scenario') {
      const [scenariosResult, monteCarloResult] = await Promise.all([
        supabase.from('scenarios').select('*').eq('tenant_id', tenantId),
        supabase.from('monte_carlo_results').select('*').eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }).limit(5),
      ]);

      financialData.scenarios = (scenariosResult.data || []).map((s: any) => ({
        name: s.name, description: s.description,
        revenueChange: s.revenue_change, costChange: s.cost_change,
        baseRevenue: s.base_revenue, baseCosts: s.base_costs,
        calculatedEbitda: s.calculated_ebitda,
      }));
      financialData.monteCarloHistory = (monteCarloResult.data || []).map((m: any) => ({
        meanEbitda: m.mean_ebitda, stdDevEbitda: m.std_dev_ebitda,
        p10Ebitda: m.p10_ebitda, p50Ebitda: m.p50_ebitda, p90Ebitda: m.p90_ebitda,
      }));
    }

    if (context === 'budget_vs_actual') {
      await supabase.rpc('init_tenant_session', { p_tenant_id: tenantId });
      const currentYear = now.getFullYear();

      const [plansResult, ordersResult, expYearResult, scenariosResult] = await Promise.all([
        supabase.from('scenario_monthly_plans')
          .select('*, scenarios!inner(name, is_active)')
          .eq('year', currentYear),
        supabase.from('master_orders')
          .select('order_at, gross_revenue')
          .gte('order_at', `${currentYear}-01-01`)
          .lte('order_at', `${currentYear}-12-31`),
        supabase.from('expenses')
          .select('expense_date, amount')
          .gte('expense_date', `${currentYear}-01-01`)
          .lte('expense_date', `${currentYear}-12-31`),
        supabase.from('scenarios')
          .select('id, name, is_active')
          .eq('is_active', true).limit(1).single(),
      ]);

      const plans = plansResult.data || [];
      const orders = ordersResult.data || [];
      const yearExpenses = expYearResult.data || [];
      const currentMonth = now.getMonth() + 1;

      const monthlyComparison = [];
      for (let month = 1; month <= currentMonth; month++) {
        const plan = plans.find((p: any) => p.month === month);
        const actualRevenue = orders
          .filter((o: any) => new Date(o.order_at).getMonth() + 1 === month)
          .reduce((sum: number, o: any) => sum + (o.gross_revenue || 0), 0);
        const actualOpex = yearExpenses
          .filter((e: any) => new Date(e.expense_date).getMonth() + 1 === month)
          .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

        const plannedRevenue = plan?.planned_revenue || 0;
        const plannedOpex = plan?.planned_opex || 0;

        monthlyComparison.push({
          month,
          plannedRevenue, actualRevenue,
          revenueVariancePct: plannedRevenue > 0 ? ((actualRevenue - plannedRevenue) / plannedRevenue * 100).toFixed(1) : '0',
          plannedOpex, actualOpex,
          plannedEbitda: plannedRevenue - plannedOpex,
          actualEbitda: actualRevenue - actualOpex,
        });
      }

      const ytd = monthlyComparison.reduce((acc, m) => ({
        revenue: acc.revenue + m.actualRevenue,
        plannedRevenue: acc.plannedRevenue + m.plannedRevenue,
        opex: acc.opex + m.actualOpex,
        ebitda: acc.ebitda + m.actualEbitda,
      }), { revenue: 0, plannedRevenue: 0, opex: 0, ebitda: 0 });

      financialData.budgetVsActual = {
        year: currentYear,
        scenarioName: scenariosResult.data?.name || 'N/A',
        monthlyComparison,
        ytdSummary: ytd,
        projectedYearEnd: {
          revenue: currentMonth > 0 ? ytd.revenue / currentMonth * 12 : 0,
          ebitda: currentMonth > 0 ? ytd.ebitda / currentMonth * 12 : 0,
        },
      };
    }

    // Build prompt
    const systemPrompt = contextPrompts[context] || contextPrompts.general;
    const fullPrompt = `${systemPrompt}\n\nTrả lời tiếng Việt, ngắn gọn, súc tích. Emoji phù hợp. Đơn vị VND (triệu/tỷ).`;

    // Use Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: fullPrompt },
          { role: "user", content: `Dữ liệu tài chính (${context}):\n\n${JSON.stringify(financialData, null, 2)}` }
        ],
        max_tokens: 1200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysis = aiResponse.choices?.[0]?.message?.content || "Không thể phân tích.";
    const usage = aiResponse.usage;

    if (usage) {
      await supabase.from('ai_usage_logs').insert({
        tenant_id: tenantId, user_id: userId,
        model: 'gemini-2.5-flash',
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
        estimated_cost: 0,
        function_name: `analyze-contextual-${context}`,
      });
    }

    return new Response(JSON.stringify({
      analysis,
      summary: financialData.summary,
      context,
      model: 'gemini-2.5-flash',
      dataSource: 'SSOT',
      usage: usage ? { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens } : null,
      generatedAt: now.toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-contextual:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
