import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * SECURITY: JWT validation required
 * Per Security Manifesto: All functions MUST validate JWT, tenant isolation from claims
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OpenAI pricing per 1M tokens
const OPENAI_PRICING = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
};

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING] || OPENAI_PRICING['gpt-4o-mini'];
  return (promptTokens / 1_000_000) * pricing.input + (completionTokens / 1_000_000) * pricing.output;
}

// Context-specific prompts
const contextPrompts: Record<string, string> = {
  general: `Bạn là chuyên gia phân tích tài chính doanh nghiệp. Phân tích tổng quan sức khỏe tài chính và đưa ra:
1. **Tổng quan** (1-2 câu)
2. **3-5 Insights quan trọng**
3. **Cảnh báo rủi ro** nếu có
4. **Đề xuất hành động** (2-3 gợi ý)`,

  profitability: `Bạn là chuyên gia phân tích lợi nhuận. Phân tích dữ liệu và đưa ra:
1. **Đánh giá biên lợi nhuận** - So sánh gross margin, operating margin, net margin
2. **Phân tích cơ cấu chi phí** - Chi phí nào chiếm tỷ trọng lớn nhất
3. **Xu hướng lợi nhuận** - Tăng/giảm theo thời gian
4. **Đề xuất cải thiện** - Cách tối ưu lợi nhuận`,

  pl_report: `Bạn là CFO phân tích báo cáo Lãi/Lỗ. Đánh giá:
1. **Hiệu suất doanh thu** - Tăng trưởng, nguồn thu chính
2. **Kiểm soát chi phí** - COGS, chi phí vận hành
3. **Điểm hòa vốn** - Phân tích break-even
4. **Dự báo** - Xu hướng quý/năm tới`,

  analytics: `Bạn là Business Analyst. Phân tích báo cáo tổng hợp:
1. **KPIs chính** - Doanh thu, lợi nhuận, EBITDA
2. **Công nợ** - AR/AP, DSO, DPO
3. **Dòng tiền** - Xu hướng cash flow
4. **Benchmark** - So sánh với kỳ trước`,

  financial_analysis: `Bạn là Financial Analyst. Đánh giá sức khỏe tài chính:
1. **Các tỷ số tài chính** - Thanh khoản, đòn bẩy, hiệu suất
2. **So sánh YoY** - Thay đổi so với năm trước
3. **Phân tích rủi ro** - Điểm yếu cần chú ý
4. **Khuyến nghị** - Hành động cần thiết`,

  revenue: `Bạn là Revenue Analyst. Phân tích doanh thu:
1. **Cơ cấu doanh thu** - Theo nguồn, sản phẩm, khách hàng
2. **Xu hướng** - Mùa vụ, tăng trưởng
3. **Top performers** - Sản phẩm/khách hàng đóng góp nhiều nhất
4. **Cơ hội** - Đề xuất tăng doanh thu`,

  expenses: `Bạn là Cost Controller. Phân tích chi phí:
1. **Cơ cấu chi phí** - Cố định vs biến đổi, theo danh mục
2. **Chi phí bất thường** - Vượt ngân sách
3. **Xu hướng** - So với các kỳ trước
4. **Tiết kiệm** - Đề xuất cắt giảm chi phí`,

  scenario: `Bạn là Strategic Financial Planner chuyên phân tích độ nhạy (sensitivity analysis). Dựa vào dữ liệu kịch bản và Monte Carlo, hãy:

1. **Phân tích độ nhạy** 
   - Biến số nào ảnh hưởng nhiều nhất đến EBITDA? (doanh thu, chi phí, biên lợi nhuận)
   - Nếu doanh thu thay đổi ±5%, ±10%, EBITDA thay đổi bao nhiêu?
   - Điểm hòa vốn nằm ở đâu?

2. **Đánh giá rủi ro**
   - Xác suất EBITDA âm là bao nhiêu % (dựa vào phân phối Monte Carlo)?
   - VaR 95% và CVaR 95% cho thấy rủi ro gì?
   - Kịch bản xấu nhất (worst case) cần chuẩn bị gì?

3. **Đề xuất tối ưu cụ thể**
   - Cần tăng doanh thu bao nhiêu % để đạt target EBITDA?
   - Cần giảm chi phí bao nhiêu % để cải thiện biên?
   - Các đòn bẩy (levers) nào dễ điều chỉnh nhất?

4. **Hành động ưu tiên** (top 3 việc cần làm ngay)
   - Sắp xếp theo mức độ impact và khả thi

Trả lời với số liệu cụ thể, tính toán rõ ràng.`,

  budget_vs_actual: `Bạn là CFO Advisor chuyên phân tích Budget vs Actual và đề xuất hành động chiến lược. Dựa vào dữ liệu so sánh kế hoạch và thực tế, hãy:

## 📊 1. ĐÁNH GIÁ HIỆU SUẤT
- Doanh thu thực tế so với kế hoạch: đạt bao nhiêu %?
- Chi phí thực tế so với ngân sách: tiết kiệm hay vượt?
- EBITDA variance: dương hay âm, nguyên nhân chính?

## ⚠️ 2. CẢNH BÁO & RỦI RO
- Tháng/quý nào có variance lớn nhất cần chú ý?
- Xu hướng lệch budget có đang xấu đi không?
- Rủi ro gì nếu xu hướng này tiếp tục?

## 🎯 3. ĐỀ XUẤT HÀNH ĐỘNG CỤ THỂ (Top 5)
Với mỗi đề xuất, chỉ rõ:
- **Hành động**: Mô tả ngắn gọn việc cần làm
- **Mục tiêu**: Con số cụ thể cần đạt (VD: tăng 10% doanh thu)
- **Timeline**: Khi nào cần hoàn thành
- **Owner**: Bộ phận/vai trò chịu trách nhiệm
- **Priority**: 🔴 Cao / 🟡 Trung bình / 🟢 Thấp

## 📈 4. DỰ BÁO & ĐIỀU CHỈNH
- Dự báo kết quả cuối năm nếu giữ nguyên trend
- Cần điều chỉnh gì để đạt target?
- Quick wins có thể thực hiện ngay

Trả lời với số liệu cụ thể, actionable, có thể đưa ra quyết định ngay.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY: Validate JWT using getClaims
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("JWT validation failed:", claimsError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized", code: "INVALID_TOKEN" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;

    // SECURITY: Get tenant from tenant_users (tenant isolation)
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (tenantError || !tenantUser?.tenant_id) {
      console.error("Tenant resolution failed:", tenantError?.message);
      return new Response(JSON.stringify({ error: "Forbidden - No tenant access", code: "NO_TENANT" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantId = tenantUser.tenant_id;

    // Get context from request
    const { context = 'general' } = await req.json();
    console.log(`Analyzing context: ${context} for user: ${userId}`);

    // Fetch data based on context
    const [
      invoicesResult,
      expensesResult,
      bankAccountsResult,
      revenuesResult,
      customersResult,
    ] = await Promise.all([
      supabase.from('invoices').select('*').eq('tenant_id', tenantId),
      supabase.from('expenses').select('*').eq('tenant_id', tenantId),
      supabase.from('bank_accounts').select('*').eq('tenant_id', tenantId),
      supabase.from('revenues').select('*').eq('tenant_id', tenantId),
      supabase.from('customers').select('*').eq('tenant_id', tenantId),
    ]);

    const invoices = invoicesResult.data || [];
    const expenses = expensesResult.data || [];
    const bankAccounts = bankAccountsResult.data || [];
    const revenues = revenuesResult.data || [];
    const customers = customersResult.data || [];

    // Calculate metrics
    const now = new Date();
    const totalCash = bankAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
    const totalRevenue = revenues.reduce((sum, r) => sum + (r.amount || 0), 0) + 
                         invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netIncome = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    const overdueInvoices = invoices.filter(i => 
      i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < now
    );
    const totalAR = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((sum, i) => sum + (i.total_amount - (i.paid_amount || 0)), 0);

    // Build context-specific data
    const financialData: Record<string, any> = {
      summary: {
        totalCash,
        totalRevenue,
        totalExpenses,
        netIncome,
        profitMargin,
        totalAR,
        overdueCount: overdueInvoices.length,
        customerCount: customers.length,
      },
    };

    // Add context-specific details
    if (context === 'profitability' || context === 'pl_report') {
      const expenseByCategory = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {} as Record<string, number>);
      
      financialData.expenseBreakdown = Object.entries(expenseByCategory)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 8);
      
      financialData.grossMargin = totalRevenue > 0 ? 
        ((totalRevenue - (expenseByCategory['cogs'] || 0)) / totalRevenue * 100).toFixed(1) : 0;
    }

    if (context === 'revenue') {
      const revenueByType = revenues.reduce((acc, r) => {
        acc[r.revenue_type] = (acc[r.revenue_type] || 0) + r.amount;
        return acc;
      }, {} as Record<string, number>);
      
      financialData.revenueByType = revenueByType;
      financialData.topCustomers = customers.slice(0, 5).map(c => ({ name: c.name, status: c.status }));
    }

    if (context === 'expenses') {
      const expenseByCategory = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {} as Record<string, number>);
      
      const expenseByVendor = expenses.reduce((acc, e) => {
        const vendor = e.vendor_name || 'Không xác định';
        acc[vendor] = (acc[vendor] || 0) + e.amount;
        return acc;
      }, {} as Record<string, number>);
      
      financialData.expenseByCategory = expenseByCategory;
      financialData.topVendors = Object.entries(expenseByVendor)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5);
    }

    if (context === 'scenario') {
      // Fetch scenarios and Monte Carlo results
      const [scenariosResult, monteCarloResult] = await Promise.all([
        supabase.from('scenarios').select('*').eq('tenant_id', tenantId),
        supabase.from('monte_carlo_results').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5),
      ]);

      const scenarios = scenariosResult.data || [];
      const monteCarloResults = monteCarloResult.data || [];

      financialData.scenarios = scenarios.map((s: any) => ({
        name: s.name,
        description: s.description,
        revenueChange: s.revenue_change,
        costChange: s.cost_change,
        baseRevenue: s.base_revenue,
        baseCosts: s.base_costs,
        calculatedEbitda: s.calculated_ebitda,
      }));

      financialData.monteCarloHistory = monteCarloResults.map((m: any) => ({
        simulationCount: m.simulation_count,
        meanEbitda: m.mean_ebitda,
        stdDevEbitda: m.std_dev_ebitda,
        p10Ebitda: m.p10_ebitda,
        p50Ebitda: m.p50_ebitda,
        p90Ebitda: m.p90_ebitda,
        minEbitda: m.min_ebitda,
        maxEbitda: m.max_ebitda,
        createdAt: m.created_at,
      }));

      financialData.scenarioSummary = {
        totalScenarios: scenarios.length,
        avgRevenueChange: scenarios.length > 0 
          ? scenarios.reduce((sum: number, s: any) => sum + (s.revenue_change || 0), 0) / scenarios.length 
          : 0,
        avgCostChange: scenarios.length > 0 
          ? scenarios.reduce((sum: number, s: any) => sum + (s.cost_change || 0), 0) / scenarios.length 
          : 0,
      };
    }

    if (context === 'budget_vs_actual') {
      // Initialize tenant session for schema-per-tenant isolation
      await supabase.rpc('init_tenant_session', { p_tenant_id: tenantId });
      
      // Fetch scenario monthly plans and actual data
      // After init_tenant_session, queries use tenant schema automatically
      const currentYear = new Date().getFullYear();
      const [plansResult, ordersResult, expensesYearResult, scenariosResult] = await Promise.all([
        supabase
          .from('scenario_monthly_plans')
          .select('*, scenarios!inner(name, is_active)')
          .eq('year', currentYear),
        // Use master_orders (SSOT in tenant schema)
        supabase
          .from('master_orders')
          .select('order_at, gross_revenue')
          .gte('order_at', `${currentYear}-01-01`)
          .lte('order_at', `${currentYear}-12-31`),
        supabase
          .from('expenses')
          .select('expense_date, amount, category')
          .gte('expense_date', `${currentYear}-01-01`)
          .lte('expense_date', `${currentYear}-12-31`),
        supabase
          .from('scenarios')
          .select('id, name, is_active')
          .eq('is_active', true)
          .limit(1)
          .single(),
      ]);

      const plans = plansResult.data || [];
      const orders = ordersResult.data || [];
      const yearExpenses = expensesYearResult.data || [];
      const activeScenario = scenariosResult.data;

      // Aggregate monthly data
      const monthlyComparison = [];
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString().padStart(2, '0');
        const plan = plans.find(p => p.month === month);
        
        // Actual revenue from cdp_orders (all orders in SSOT are completed)
        const actualRevenue = orders
          .filter((o: any) => {
            const orderMonth = new Date(o.order_at).getMonth() + 1;
            return orderMonth === month;
          })
          .reduce((sum: number, o: any) => sum + (o.gross_revenue || 0), 0);

        // Actual expenses
        const actualOpex = yearExpenses
          .filter(e => {
            const expMonth = new Date(e.expense_date).getMonth() + 1;
            return expMonth === month;
          })
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        const plannedRevenue = plan?.planned_revenue || 0;
        const plannedOpex = plan?.planned_opex || 0;

        monthlyComparison.push({
          month,
          monthName: new Date(currentYear, month - 1).toLocaleString('vi-VN', { month: 'short' }),
          plannedRevenue,
          actualRevenue,
          revenueVariance: actualRevenue - plannedRevenue,
          revenueVariancePct: plannedRevenue > 0 ? ((actualRevenue - plannedRevenue) / plannedRevenue * 100) : 0,
          plannedOpex,
          actualOpex,
          opexVariance: plannedOpex - actualOpex, // Positive = savings
          opexVariancePct: plannedOpex > 0 ? ((plannedOpex - actualOpex) / plannedOpex * 100) : 0,
          plannedEbitda: plannedRevenue - plannedOpex,
          actualEbitda: actualRevenue - actualOpex,
        });
      }

      // Calculate YTD totals
      const currentMonth = new Date().getMonth() + 1;
      const ytdData = monthlyComparison.filter(m => m.month <= currentMonth);
      
      const ytdSummary: Record<string, any> = {
        totalPlannedRevenue: ytdData.reduce((sum, m) => sum + m.plannedRevenue, 0),
        totalActualRevenue: ytdData.reduce((sum, m) => sum + m.actualRevenue, 0),
        totalPlannedOpex: ytdData.reduce((sum, m) => sum + m.plannedOpex, 0),
        totalActualOpex: ytdData.reduce((sum, m) => sum + m.actualOpex, 0),
        totalPlannedEbitda: ytdData.reduce((sum, m) => sum + m.plannedEbitda, 0),
        totalActualEbitda: ytdData.reduce((sum, m) => sum + m.actualEbitda, 0),
      };

      ytdSummary.revenueAchievement = ytdSummary.totalPlannedRevenue > 0 
        ? (ytdSummary.totalActualRevenue / ytdSummary.totalPlannedRevenue * 100) 
        : 0;
      ytdSummary.opexEfficiency = ytdSummary.totalPlannedOpex > 0 
        ? ((ytdSummary.totalPlannedOpex - ytdSummary.totalActualOpex) / ytdSummary.totalPlannedOpex * 100) 
        : 0;

      // Find worst performing months
      const worstRevenueMonth = [...ytdData].sort((a, b) => a.revenueVariancePct - b.revenueVariancePct)[0];
      const worstOpexMonth = [...ytdData].sort((a, b) => a.opexVariancePct - b.opexVariancePct)[0];

      financialData.budgetVsActual = {
        year: currentYear,
        scenarioName: activeScenario?.name || 'Không có kịch bản active',
        monthlyComparison: monthlyComparison.slice(0, currentMonth), // Only show months up to current
        ytdSummary,
        alerts: {
          worstRevenueMonth: worstRevenueMonth ? {
            month: worstRevenueMonth.monthName,
            variance: worstRevenueMonth.revenueVariancePct.toFixed(1) + '%',
          } : null,
          worstOpexMonth: worstOpexMonth ? {
            month: worstOpexMonth.monthName,
            variance: worstOpexMonth.opexVariancePct.toFixed(1) + '%',
          } : null,
        },
        remainingMonths: 12 - currentMonth,
        projectedYearEnd: {
          revenue: ytdSummary.totalActualRevenue / currentMonth * 12,
          opex: ytdSummary.totalActualOpex / currentMonth * 12,
          ebitda: ytdSummary.totalActualEbitda / currentMonth * 12,
        },
      };
    }

    // Get system prompt
    const systemPrompt = contextPrompts[context] || contextPrompts.general;
    const fullPrompt = `${systemPrompt}

Trả lời bằng tiếng Việt, ngắn gọn, súc tích. Sử dụng emoji phù hợp.
Đơn vị tiền: VND (hiển thị dạng triệu/tỷ cho dễ đọc).`;

    const modelName = 'gpt-4o-mini';

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: fullPrompt },
          { role: "user", content: `Dữ liệu tài chính:\n\n${JSON.stringify(financialData, null, 2)}` }
        ],
        max_tokens: 1200,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Quá nhiều yêu cầu, vui lòng thử lại sau." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysis = aiResponse.choices?.[0]?.message?.content || "Không thể phân tích.";
    
    // Log usage
    const usage = aiResponse.usage;
    let estimatedCost = 0;
    
    if (usage) {
      estimatedCost = calculateCost(modelName, usage.prompt_tokens, usage.completion_tokens);
      
      await supabase.from('ai_usage_logs').insert({
        tenant_id: tenantId,
        user_id: userId,
        model: modelName,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        estimated_cost: estimatedCost,
        function_name: `analyze-contextual-${context}`
      });
    }

    console.log(`Analysis completed for context: ${context}`);

    return new Response(JSON.stringify({ 
      analysis,
      summary: financialData.summary,
      context,
      model: modelName,
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      } : null,
      generatedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-contextual:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
