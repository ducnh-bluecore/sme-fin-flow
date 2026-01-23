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

// OpenAI pricing per 1M tokens (as of 2024)
const OPENAI_PRICING = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
};

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING] || OPENAI_PRICING['gpt-4o-mini'];
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY: Validate JWT using getClaims
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error("No authorization header provided");
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
    console.log(`Authenticated user: ${userId}`);

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
    console.log(`Analyzing financial data for tenant: ${tenantId}`);

    console.log(`Analyzing financial data for tenant: ${tenantId}`);

    // Fetch all financial data in parallel
    const [
      invoicesResult,
      expensesResult,
      bankAccountsResult,
      bankTransactionsResult,
      revenuesResult,
      customersResult,
      paymentsResult,
      cashForecastsResult
    ] = await Promise.all([
      supabase.from('invoices').select('*').eq('tenant_id', tenantId),
      supabase.from('expenses').select('*').eq('tenant_id', tenantId),
      supabase.from('bank_accounts').select('*').eq('tenant_id', tenantId),
      supabase.from('bank_transactions').select('*').eq('tenant_id', tenantId),
      supabase.from('revenues').select('*').eq('tenant_id', tenantId),
      supabase.from('customers').select('*').eq('tenant_id', tenantId),
      supabase.from('payments').select('*').eq('tenant_id', tenantId),
      supabase.from('cash_forecasts').select('*').eq('tenant_id', tenantId).order('forecast_date', { ascending: false }).limit(30)
    ]);

    const invoices = invoicesResult.data || [];
    const expenses = expensesResult.data || [];
    const bankAccounts = bankAccountsResult.data || [];
    const bankTransactions = bankTransactionsResult.data || [];
    const revenues = revenuesResult.data || [];
    const customers = customersResult.data || [];
    const payments = paymentsResult.data || [];
    const cashForecasts = cashForecastsResult.data || [];

    // Calculate key metrics
    const now = new Date();
    const totalCash = bankAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
    const totalAR = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((sum, i) => sum + (i.total_amount - (i.paid_amount || 0)), 0);
    const overdueInvoices = invoices.filter(i => 
      i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < now
    );
    const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (i.total_amount - (i.paid_amount || 0)), 0);
    
    const unmatchedTransactions = bankTransactions.filter(t => t.match_status === 'unmatched');
    const matchRate = bankTransactions.length > 0 
      ? ((bankTransactions.length - unmatchedTransactions.length) / bankTransactions.length * 100).toFixed(1)
      : 0;

    const totalRevenue = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Build context for AI
    const financialContext = {
      summary: {
        totalCash,
        totalAR,
        totalOverdue,
        overdueCount: overdueInvoices.length,
        totalInvoices: invoices.length,
        totalCustomers: customers.length,
        unmatchedTransactionsCount: unmatchedTransactions.length,
        matchRate: `${matchRate}%`,
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses
      },
      recentInvoices: invoices.slice(0, 10).map(i => ({
        number: i.invoice_number,
        amount: i.total_amount,
        status: i.status,
        dueDate: i.due_date,
        paidAmount: i.paid_amount
      })),
      topExpenseCategories: Object.entries(
        expenses.reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount;
          return acc;
        }, {} as Record<string, number>)
      ).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5),
      cashFlowTrend: cashForecasts.slice(0, 7).map(f => ({
        date: f.forecast_date,
        inflows: f.inflows,
        outflows: f.outflows,
        balance: f.closing_balance
      })),
      overdueInvoicesSummary: overdueInvoices.slice(0, 5).map(i => ({
        number: i.invoice_number,
        amount: i.total_amount - (i.paid_amount || 0),
        daysPastDue: Math.floor((now.getTime() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24))
      }))
    };

    const systemPrompt = `Bạn là một chuyên gia phân tích tài chính doanh nghiệp. Phân tích dữ liệu tài chính được cung cấp và đưa ra:

1. **Tổng quan sức khỏe tài chính** (1-2 câu)
2. **3-5 Insights quan trọng** - Các phát hiện đáng chú ý từ dữ liệu
3. **Cảnh báo rủi ro** - Nếu có vấn đề cần chú ý (thanh khoản thấp, AR quá hạn cao, v.v.)
4. **Đề xuất hành động** - 2-3 gợi ý cụ thể để cải thiện

Trả lời bằng tiếng Việt, ngắn gọn, súc tích. Sử dụng emoji phù hợp để dễ đọc.
Đơn vị tiền: VND (hiển thị dạng triệu/tỷ cho dễ đọc).`;

    const modelName = 'gpt-4o-mini';

    // Call OpenAI API directly
    console.log("Calling OpenAI API...");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dữ liệu tài chính hiện tại:\n\n${JSON.stringify(financialContext, null, 2)}` }
        ],
        max_tokens: 1500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Quá nhiều yêu cầu đến OpenAI, vui lòng thử lại sau." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "OpenAI API key không hợp lệ." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402 || response.status === 403) {
        return new Response(JSON.stringify({ error: "Tài khoản OpenAI cần nạp thêm credits hoặc không có quyền truy cập." }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    const analysis = aiResponse.choices?.[0]?.message?.content || "Không thể phân tích dữ liệu.";
    
    // Log usage for cost tracking
    const usage = aiResponse.usage;
    let estimatedCost = 0;
    
    if (usage) {
      estimatedCost = calculateCost(modelName, usage.prompt_tokens, usage.completion_tokens);
      console.log(`OpenAI usage - Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}, Cost: $${estimatedCost.toFixed(6)}`);
      
      // Save usage to database
      const { error: logError } = await supabase.from('ai_usage_logs').insert({
        tenant_id: tenantId,
        user_id: userId,
        model: modelName,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        estimated_cost: estimatedCost,
        function_name: 'analyze-financial-data'
      });
      
      if (logError) {
        console.error("Failed to log AI usage:", logError);
      }
    }

    console.log("AI analysis completed successfully");

    return new Response(JSON.stringify({ 
      analysis,
      summary: financialContext.summary,
      generatedAt: new Date().toISOString(),
      model: modelName,
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        estimatedCost: estimatedCost
      } : null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-financial-data:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
