import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratedCard {
  tenant_id: string;
  card_type: string;
  title: string;
  question: string;
  priority: string;
  impact_amount: number;
  impact_currency: string;
  deadline_at: string;
  status: string;
  confidence: string;
  source_type: string;
  source_id: string;
  owner_role: string;
  facts: { fact_key: string; label: string; value: string; trend?: string }[];
  actions: { action_type: string; label: string; is_recommended: boolean }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[generate-decision-cards] Starting daily card generation...');

    // Get all active tenants
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('is_active', true);

    if (tenantError) throw tenantError;

    const results: { tenant_id: string; cards_created: number }[] = [];

    for (const tenant of tenants || []) {
      const tenantId = tenant.id;
      const cardsToCreate: GeneratedCard[] = [];

      console.log(`[generate-decision-cards] Processing tenant: ${tenantId}`);

      // 1. SKU Profitability Analysis
      const { data: skuData } = await supabase
        .from('sku_profitability_cache')
        .select('*')
        .eq('tenant_id', tenantId)
        .lt('margin_percent', 5)
        .order('margin_percent', { ascending: true })
        .limit(10);

      for (const sku of skuData || []) {
        const isNegative = sku.margin_percent < 0;
        const priority = isNegative ? 'P1' : 'P2';
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + (isNegative ? 3 : 7));

        cardsToCreate.push({
          tenant_id: tenantId,
          card_type: isNegative ? 'STOP' : 'REVIEW',
          title: `SKU ${sku.sku}: ${isNegative ? 'Lỗ' : 'Margin thấp'} ${sku.margin_percent?.toFixed(1)}%`,
          question: isNegative
            ? `SKU này đang lỗ ${Math.abs(sku.margin_percent || 0).toFixed(1)}%. Dừng bán ngay hay điều chỉnh giá?`
            : `SKU này có margin chỉ ${sku.margin_percent?.toFixed(1)}%. Cần review chiến lược?`,
          priority,
          impact_amount: Math.abs(sku.profit || 0),
          impact_currency: 'VND',
          deadline_at: deadline.toISOString(),
          status: 'OPEN',
          confidence: 'HIGH',
          source_type: 'sku_profitability',
          source_id: sku.sku || sku.id,
          owner_role: 'SALES',
          facts: [
            { fact_key: 'revenue', label: 'Doanh thu', value: formatCurrency(sku.revenue) },
            { fact_key: 'cogs', label: 'Giá vốn', value: formatCurrency(sku.cogs) },
            { fact_key: 'margin', label: 'Margin', value: `${sku.margin_percent?.toFixed(1)}%`, trend: sku.margin_percent < 0 ? 'down' : 'stable' },
            { fact_key: 'quantity', label: 'Số lượng bán', value: String(sku.total_quantity || 0) },
          ],
          actions: [
            { action_type: isNegative ? 'STOP' : 'REVIEW', label: isNegative ? 'Dừng bán SKU' : 'Review giá', is_recommended: true },
            { action_type: 'NEGOTIATE', label: 'Đàm phán NCC', is_recommended: false },
            { action_type: 'DISMISS', label: 'Bỏ qua', is_recommended: false },
          ],
        });
      }

      // 2. Cash Flow / Runway Analysis
      const { data: cashData } = await supabase
        .from('cash_flow_direct')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('flow_date', { ascending: false })
        .limit(30);

      if (cashData && cashData.length > 0) {
        const totalInflow = cashData.reduce((sum, c) => sum + (c.inflow || 0), 0);
        const totalOutflow = cashData.reduce((sum, c) => sum + (c.outflow || 0), 0);
        const avgDailyBurn = totalOutflow / Math.max(cashData.length, 1);
        
        // Get current bank balance
        const { data: bankData } = await supabase
          .from('bank_accounts')
          .select('current_balance')
          .eq('tenant_id', tenantId);

        const totalCash = (bankData || []).reduce((sum, b) => sum + (b.current_balance || 0), 0);
        const runwayDays = avgDailyBurn > 0 ? totalCash / avgDailyBurn : 999;
        const runwayMonths = runwayDays / 30;

        if (runwayMonths < 6) {
          const isCritical = runwayMonths < 3;
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + (isCritical ? 1 : 7));

          cardsToCreate.push({
            tenant_id: tenantId,
            card_type: 'CASH_SURVIVAL',
            title: `Cash Runway: ${runwayMonths.toFixed(1)} tháng`,
            question: isCritical
              ? 'Runway dưới 3 tháng! Cần hành động khẩn cấp. Cắt chi phí hay tìm nguồn vốn?'
              : 'Runway dưới 6 tháng. Cần lên kế hoạch cash flow. Ưu tiên thu nợ hay giảm chi?',
            priority: isCritical ? 'P1' : 'P2',
            impact_amount: totalCash,
            impact_currency: 'VND',
            deadline_at: deadline.toISOString(),
            status: 'OPEN',
            confidence: 'HIGH',
            source_type: 'cash_flow',
            source_id: 'cash_runway',
            owner_role: 'CFO',
            facts: [
              { fact_key: 'cash_balance', label: 'Số dư tiền mặt', value: formatCurrency(totalCash) },
              { fact_key: 'avg_burn', label: 'Chi bình quân/ngày', value: formatCurrency(avgDailyBurn) },
              { fact_key: 'runway', label: 'Runway', value: `${runwayMonths.toFixed(1)} tháng`, trend: 'down' },
              { fact_key: 'net_flow', label: 'Net Cash Flow', value: formatCurrency(totalInflow - totalOutflow) },
            ],
            actions: [
              { action_type: 'CUT_COST', label: 'Cắt giảm chi phí', is_recommended: isCritical },
              { action_type: 'COLLECT_AR', label: 'Thu nợ khẩn cấp', is_recommended: true },
              { action_type: 'SEEK_FUNDING', label: 'Tìm nguồn vốn', is_recommended: false },
            ],
          });
        }
      }

      // 3. Overdue AR Analysis
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('status', ['sent', 'overdue', 'partial'])
        .lt('due_date', new Date().toISOString().split('T')[0]);

      const overdueInvoices = invoiceData || [];
      const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0);

      if (totalOverdue > 0 && overdueInvoices.length > 0) {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 3);

        cardsToCreate.push({
          tenant_id: tenantId,
          card_type: 'COLLECT',
          title: `${overdueInvoices.length} hóa đơn quá hạn - ${formatCurrency(totalOverdue)}`,
          question: 'Có các hóa đơn quá hạn cần thu hồi. Ưu tiên gọi điện đòi nợ hay gửi email nhắc nhở?',
          priority: totalOverdue > 100000000 ? 'P1' : 'P2',
          impact_amount: totalOverdue,
          impact_currency: 'VND',
          deadline_at: deadline.toISOString(),
          status: 'OPEN',
          confidence: 'HIGH',
          source_type: 'ar_overdue',
          source_id: 'ar_collection',
          owner_role: 'ACCOUNTANT',
          facts: [
            { fact_key: 'overdue_count', label: 'Số hóa đơn quá hạn', value: String(overdueInvoices.length) },
            { fact_key: 'overdue_amount', label: 'Tổng tiền quá hạn', value: formatCurrency(totalOverdue), trend: 'up' },
            { fact_key: 'avg_days', label: 'Quá hạn TB', value: `${calculateAvgOverdueDays(overdueInvoices)} ngày` },
          ],
          actions: [
            { action_type: 'CALL', label: 'Gọi điện đòi nợ', is_recommended: true },
            { action_type: 'EMAIL', label: 'Gửi email nhắc nhở', is_recommended: false },
            { action_type: 'ESCALATE', label: 'Báo cáo lên cấp trên', is_recommended: false },
          ],
        });
      }

      // 4. Marketing Campaign Risk Analysis
      const { data: campaignData } = await supabase
        .from('promotion_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      const { data: marketingExpenses } = await supabase
        .from('marketing_expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('expense_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const totalMarketingSpend = (marketingExpenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);

      for (const campaign of campaignData || []) {
        const spend = campaign.budget_spent || 0;
        const revenue = campaign.revenue_generated || 0;
        const roas = spend > 0 ? revenue / spend : 0;

        if (roas < 1 && spend > 1000000) {
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + 2);

          cardsToCreate.push({
            tenant_id: tenantId,
            card_type: 'PAUSE',
            title: `Campaign "${campaign.name}" ROAS ${roas.toFixed(2)} - đang lỗ`,
            question: 'Campaign có ROAS < 1, đang đốt tiền. Tạm dừng ngay hay điều chỉnh targeting?',
            priority: roas < 0.5 ? 'P1' : 'P2',
            impact_amount: spend - revenue,
            impact_currency: 'VND',
            deadline_at: deadline.toISOString(),
            status: 'OPEN',
            confidence: 'MEDIUM',
            source_type: 'marketing_campaign',
            source_id: campaign.id,
            owner_role: 'MARKETING',
            facts: [
              { fact_key: 'spend', label: 'Chi phí', value: formatCurrency(spend) },
              { fact_key: 'revenue', label: 'Doanh thu', value: formatCurrency(revenue) },
              { fact_key: 'roas', label: 'ROAS', value: roas.toFixed(2), trend: 'down' },
              { fact_key: 'loss', label: 'Lỗ ròng', value: formatCurrency(spend - revenue) },
            ],
            actions: [
              { action_type: 'PAUSE', label: 'Tạm dừng campaign', is_recommended: roas < 0.5 },
              { action_type: 'OPTIMIZE', label: 'Điều chỉnh targeting', is_recommended: roas >= 0.5 },
              { action_type: 'MONITOR', label: 'Theo dõi thêm', is_recommended: false },
            ],
          });
        }
      }

      // Remove existing auto-generated cards for today to avoid duplicates
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('decision_cards')
        .delete()
        .eq('tenant_id', tenantId)
        .gte('created_at', today)
        .in('source_type', ['sku_profitability', 'cash_flow', 'ar_overdue', 'marketing_campaign']);

      // Insert new cards
      let cardsCreated = 0;
      for (const card of cardsToCreate) {
        const { facts, actions, ...cardData } = card;

        const { data: insertedCard, error: cardError } = await supabase
          .from('decision_cards')
          .insert(cardData)
          .select('id')
          .single();

        if (cardError) {
          console.error(`[generate-decision-cards] Error inserting card: ${cardError.message}`);
          continue;
        }

        // Insert facts
        if (facts.length > 0) {
          const factsWithCardId = facts.map((f, idx) => ({
            card_id: insertedCard.id,
            tenant_id: tenantId,
            fact_key: f.fact_key,
            label: f.label,
            value: f.value,
            trend: f.trend || null,
            sort_order: idx,
          }));

          await supabase.from('decision_card_facts').insert(factsWithCardId);
        }

        // Insert actions
        if (actions.length > 0) {
          const actionsWithCardId = actions.map((a, idx) => ({
            card_id: insertedCard.id,
            tenant_id: tenantId,
            action_type: a.action_type,
            label: a.label,
            is_recommended: a.is_recommended,
            sort_order: idx,
          }));

          await supabase.from('decision_card_actions').insert(actionsWithCardId);
        }

        cardsCreated++;
      }

      results.push({ tenant_id: tenantId, cards_created: cardsCreated });
      console.log(`[generate-decision-cards] Tenant ${tenantId}: Created ${cardsCreated} cards`);
    }

    console.log('[generate-decision-cards] Daily generation completed');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Decision cards generated successfully',
        results,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-decision-cards] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0đ';
  if (Math.abs(amount) >= 1e9) return `${(amount / 1e9).toFixed(1)}B`;
  if (Math.abs(amount) >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
  if (Math.abs(amount) >= 1e3) return `${(amount / 1e3).toFixed(0)}K`;
  return `${amount.toFixed(0)}đ`;
}

function calculateAvgOverdueDays(invoices: any[]): number {
  if (invoices.length === 0) return 0;
  const today = new Date();
  const totalDays = invoices.reduce((sum, inv) => {
    const dueDate = new Date(inv.due_date);
    const days = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return sum + Math.max(0, days);
  }, 0);
  return Math.round(totalDays / invoices.length);
}
