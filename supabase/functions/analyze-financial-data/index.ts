import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users').select('tenant_id').eq('user_id', userId).maybeSingle();
    if (tenantError || !tenantUser?.tenant_id) {
      return new Response(JSON.stringify({ error: "Forbidden", code: "NO_TENANT" }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantId = tenantUser.tenant_id;
    console.log(`Analyzing financial data for tenant: ${tenantId} (SSOT: kpi_facts_daily + cdp_orders)`);

    // =============================================
    // SSOT DATA: Read from L2/L3/L4 layers
    // =============================================
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [
      kpiLatestResult,
      kpiTrendResult,
      orderStatsResult,
      customerStatsResult,
      activeAlertsResult,
      expensesResult,
    ] = await Promise.all([
      // L3: Latest KPI snapshot (all metrics for most recent date)
      supabase.from('kpi_facts_daily')
        .select('metric_code, value, comparison_value, dimension_type, dimension_value')
        .eq('tenant_id', tenantId)
        .eq('dimension_type', 'total')
        .eq('period_type', 'daily')
        .order('grain_date', { ascending: false })
        .limit(20),
      // L3: Revenue trend 30 days
      supabase.from('kpi_facts_daily')
        .select('grain_date, value')
        .eq('tenant_id', tenantId)
        .eq('metric_code', 'NET_REVENUE')
        .eq('dimension_type', 'total')
        .eq('period_type', 'daily')
        .gte('grain_date', thirtyDaysAgo)
        .order('grain_date', { ascending: true }),
      // L2: Order stats (recent 30 days aggregated)
      supabase.from('cdp_orders')
        .select('channel, status, net_revenue, gross_revenue')
        .eq('tenant_id', tenantId)
        .gte('order_at', thirtyDaysAgo)
        .limit(1000),
      // L2: Customer count
      supabase.from('cdp_customers')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      // L4: Active alerts
      supabase.from('alert_instances')
        .select('alert_type, category, severity, impact_amount, impact_description, deadline_at')
        .eq('tenant_id', tenantId)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(7),
      // Expenses (SSOT for opex)
      supabase.from('expenses')
        .select('category, amount')
        .eq('tenant_id', tenantId)
        .gte('expense_date', thirtyDaysAgo),
    ]);

    const kpiLatest = kpiLatestResult.data || [];
    const kpiTrend = kpiTrendResult.data || [];
    const orders = orderStatsResult.data || [];
    const customerCount = customerStatsResult.count || 0;
    const activeAlerts = activeAlertsResult.data || [];
    const expenses = expensesResult.data || [];

    // Build KPI summary from L3
    const getKpi = (code: string) => kpiLatest.find(k => k.metric_code === code);
    const netRevenue = getKpi('NET_REVENUE');
    const orderCount = getKpi('ORDER_COUNT');
    const aov = getKpi('AOV');
    const grossMargin = getKpi('GROSS_MARGIN');
    const cogs = getKpi('COGS');

    // Channel breakdown from L2 orders
    const channelRevenue: Record<string, { revenue: number; count: number }> = {};
    const statusCounts: Record<string, number> = {};
    for (const o of orders) {
      const ch = o.channel || 'unknown';
      if (!channelRevenue[ch]) channelRevenue[ch] = { revenue: 0, count: 0 };
      channelRevenue[ch].revenue += o.net_revenue || 0;
      channelRevenue[ch].count += 1;
      statusCounts[o.status || 'unknown'] = (statusCounts[o.status || 'unknown'] || 0) + 1;
    }

    // Expense breakdown
    const expenseByCategory: Record<string, number> = {};
    let totalExpenses = 0;
    for (const e of expenses) {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
      totalExpenses += e.amount;
    }

    const financialContext = {
      dataSource: 'SSOT L2/L3/L4 (kpi_facts_daily, cdp_orders, alert_instances)',
      kpiSnapshot: {
        netRevenue: netRevenue?.value || 0,
        netRevenueChange: netRevenue?.comparison_value ? 
          ((netRevenue.value - netRevenue.comparison_value) / netRevenue.comparison_value * 100).toFixed(1) + '%' : null,
        orderCount: orderCount?.value || 0,
        aov: aov?.value || 0,
        grossMarginPct: grossMargin?.value || 0,
        cogs: cogs?.value || 0,
        totalExpenses,
      },
      channelBreakdown: Object.entries(channelRevenue)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([ch, data]) => ({ channel: ch, revenue: data.revenue, orders: data.count })),
      orderStatusBreakdown: statusCounts,
      customerCount,
      revenueTrend30d: kpiTrend.map(k => ({ date: k.grain_date, revenue: k.value })),
      topExpenseCategories: Object.entries(expenseByCategory)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5),
      activeAlerts: activeAlerts.map(a => ({
        type: a.alert_type,
        category: a.category,
        severity: a.severity,
        impact: a.impact_amount,
        description: a.impact_description,
        deadline: a.deadline_at,
      })),
    };

    const systemPrompt = `Bạn là chuyên gia phân tích tài chính doanh nghiệp e-commerce. Dữ liệu được lấy từ SSOT (Single Source of Truth) bao gồm 1.14M đơn hàng thực tế.

Phân tích và đưa ra:
1. **Tổng quan sức khỏe tài chính** (1-2 câu)
2. **3-5 Insights quan trọng** từ KPI snapshot và xu hướng
3. **Cảnh báo rủi ro** - dựa trên active alerts và anomaly
4. **Đề xuất hành động** - 2-3 gợi ý cụ thể, actionable

Trả lời tiếng Việt, ngắn gọn. Emoji phù hợp. Đơn vị VND (triệu/tỷ).`;

    // Use Lovable AI Gateway (free, no API key needed)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Calling Lovable AI Gateway (gemini-2.5-flash)...");
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
          { role: "user", content: `Dữ liệu tài chính SSOT:\n\n${JSON.stringify(financialContext, null, 2)}` }
        ],
        max_tokens: 1500,
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
        return new Response(JSON.stringify({ error: "Hết credits AI, vui lòng nạp thêm." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    const analysis = aiResponse.choices?.[0]?.message?.content || "Không thể phân tích dữ liệu.";
    const usage = aiResponse.usage;

    console.log(`Analysis completed. Tokens: ${usage?.total_tokens || 'N/A'}`);

    // Log usage
    if (usage) {
      await supabase.from('ai_usage_logs').insert({
        tenant_id: tenantId,
        user_id: userId,
        model: 'gemini-2.5-flash',
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
        estimated_cost: 0, // Lovable AI gateway - free
        function_name: 'analyze-financial-data',
      }).then(({ error }) => { if (error) console.error("Failed to log usage:", error); });
    }

    return new Response(JSON.stringify({
      analysis,
      summary: financialContext.kpiSnapshot,
      generatedAt: new Date().toISOString(),
      model: 'gemini-2.5-flash',
      dataSource: 'SSOT',
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      } : null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-financial-data:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
