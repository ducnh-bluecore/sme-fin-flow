import { useMemo } from 'react';
import { FDP_THRESHOLDS, analyzeSKU } from '@/lib/fdp-formulas';
import { useAllProblematicSKUs, ProblematicSKU } from './useAllProblematicSKUs';
import { useCashFlowAnalysis } from './useCashFlowDirect';
import { useInvoiceTracking } from './useInvoiceData';
import { useMDPData, MDP_THRESHOLDS } from './useMDPData';
import type { DecisionCard, DecisionCardFact, DecisionCardAction, Priority, Confidence, OwnerRole, ActionType } from './useDecisionCards';

interface AutoDecisionCard extends Omit<DecisionCard, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> {
  id: string; // Generated ID for auto cards
  isAuto: true; // Mark as auto-generated
}

// Generate unique ID for auto cards
function generateAutoId(type: string, entityId: string): string {
  return `auto-${type}-${entityId}`;
}

// Create deadline based on priority
function getDeadline(priority: Priority): string {
  const now = new Date();
  switch (priority) {
    case 'P1':
      now.setHours(now.getHours() + 4); // 4 hours
      break;
    case 'P2':
      now.setHours(now.getHours() + 48); // 48 hours
      break;
    case 'P3':
      now.setDate(now.getDate() + 7); // 7 days
      break;
  }
  return now.toISOString();
}

// Format currency for display
function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(0)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(0)}K`;
  }
  return value.toFixed(0);
}

// Create facts from data
function createFacts(cardId: string, factsData: Array<{
  key: string;
  label: string;
  value: string;
  numeric?: number;
  unit?: string;
  trend?: 'UP' | 'DOWN' | 'FLAT' | 'NA';
  isPrimary?: boolean;
}>): DecisionCardFact[] {
  return factsData.map((f, index) => ({
    id: `${cardId}-fact-${index}`,
    card_id: cardId,
    fact_key: f.key,
    label: f.label,
    value: f.value,
    numeric_value: f.numeric || null,
    unit: f.unit || null,
    trend: f.trend || null,
    is_primary: f.isPrimary ?? true,
    display_order: index,
  }));
}

// Create actions with calculated outcomes
function createActions(cardId: string, actionsData: Array<{
  type: ActionType;
  label: string;
  isRecommended?: boolean;
  outcome?: string;
  riskNote?: string;
}>): DecisionCardAction[] {
  return actionsData.map((a, index) => ({
    id: `${cardId}-action-${index}`,
    card_id: cardId,
    action_type: a.type,
    is_recommended: a.isRecommended ?? false,
    label: a.label,
    parameters: {},
    risk_note: a.riskNote || null,
    expected_outcome: a.outcome || null,
    display_order: index,
  }));
}

export function useAutoDecisionCards() {
  // Get real data from existing hooks
  const { data: skuData } = useAllProblematicSKUs();
  const { summary: cashSummary, cashFlows } = useCashFlowAnalysis();
  const { invoices: invoicesData } = useInvoiceTracking();
  const { 
    profitAttribution, 
    cashImpact, 
    riskAlerts 
  } = useMDPData();

  const autoCards = useMemo(() => {
    const cards: AutoDecisionCard[] = [];

    // Get real burn rate and runway from cash analysis
    const burnRate = cashSummary?.burnRate || 0;
    const currentRunway = cashSummary?.runway || 0;
    const latestCashBalance = cashFlows?.[0]?.closing_cash_balance || 0;

    // 1. Analyze SKU Profitability - Generate STOP/REVIEW decisions
    if (skuData && skuData.length > 0) {
      skuData
        .filter((sku: ProblematicSKU) => sku.revenue > 0) // Only process SKUs with actual sales
        .forEach((sku: ProblematicSKU) => {
          const marginPercent = sku.margin_percent ?? ((sku.profit / sku.revenue) * 100);
          const analysis = analyzeSKU(
            marginPercent,
            sku.revenue,
            sku.cogs,
            sku.fees || 0,
            sku.profit
          );

          if (analysis.decision === 'stop_immediately') {
            const cardId = generateAutoId('sku-stop', sku.sku);
            
            // Calculate real outcome: stopping this SKU saves monthly loss
            const monthlyLoss = Math.abs(sku.profit);
            const inventoryValue = sku.cogs * 0.3; // Estimate locked inventory
            
            const card: AutoDecisionCard = {
              id: cardId,
              isAuto: true,
              card_type: 'GROWTH_SCALE_SKU',
              title: `DỪNG BÁN: ${sku.product_name || sku.sku}`,
              question: `SKU ${sku.sku} đang lỗ ${Math.abs(marginPercent).toFixed(1)}% - tiếp tục bán = đốt tiền?`,
              entity_type: 'sku',
              entity_id: sku.sku,
              entity_label: `${sku.product_name || sku.sku} • ${sku.channel}`,
              owner_role: 'CMO' as OwnerRole,
              owner_user_id: null,
              assigned_at: null,
              status: 'OPEN',
              priority: 'P1',
              severity_score: 95,
              confidence: 'HIGH' as Confidence,
              impact_amount: -monthlyLoss,
              impact_currency: 'VND',
              impact_window_days: 30,
              impact_description: `Tổn thất ${formatCurrency(monthlyLoss)}đ/tháng nếu tiếp tục bán`,
              deadline_at: getDeadline('P1'),
              snoozed_until: null,
              snooze_count: 0,
              source_modules: ['FDP', 'SKU Analysis'],
              vertical: 'ecommerce',
              facts: createFacts(cardId, [
                { key: 'margin', label: 'Margin %', value: `${marginPercent.toFixed(1)}%`, numeric: marginPercent, unit: '%', trend: 'DOWN' },
                { key: 'revenue', label: 'Doanh thu', value: `${sku.revenue.toLocaleString()}đ`, numeric: sku.revenue, unit: 'VND' },
                { key: 'cogs', label: 'Giá vốn', value: `${sku.cogs.toLocaleString()}đ`, numeric: sku.cogs, unit: 'VND' },
                { key: 'fees', label: 'Phí sàn', value: `${(sku.fees || 0).toLocaleString()}đ`, numeric: sku.fees || 0, unit: 'VND' },
                { key: 'profit', label: 'Lợi nhuận', value: `${sku.profit.toLocaleString()}đ`, numeric: sku.profit, unit: 'VND', trend: sku.profit < 0 ? 'DOWN' : 'UP' },
                { key: 'channel', label: 'Kênh bán', value: sku.channel },
              ]),
              actions: createActions(cardId, [
                { 
                  type: 'STOP', 
                  label: 'Dừng bán ngay', 
                  isRecommended: true, 
                  outcome: `Tiết kiệm ${formatCurrency(monthlyLoss)}đ/tháng, giải phóng ${formatCurrency(inventoryValue)}đ vốn`
                },
                { 
                  type: 'PAUSE', 
                  label: 'Tạm dừng & xả hàng', 
                  outcome: `Giảm giá 20-30% để xả ${formatCurrency(inventoryValue)}đ tồn kho`
                },
                { 
                  type: 'INVESTIGATE', 
                  label: 'Điều tra thêm', 
                  outcome: 'Phân tích sâu trước khi quyết định'
                },
              ]),
            };
            cards.push(card);
          } else if (analysis.decision === 'review') {
            const cardId = generateAutoId('sku-review', sku.sku);
            
            // Calculate potential improvement
            const targetMargin = 10; // 10% target
            const marginGap = targetMargin - marginPercent;
            const potentialImprovement = sku.revenue * (marginGap / 100);
            
            const card: AutoDecisionCard = {
              id: cardId,
              isAuto: true,
              card_type: 'GROWTH_SCALE_SKU',
              title: `XEM XÉT GIÁ: ${sku.product_name || sku.sku}`,
              question: `SKU ${sku.sku} margin thấp (${marginPercent.toFixed(1)}%) - cần tăng giá hoặc giảm chi phí?`,
              entity_type: 'sku',
              entity_id: sku.sku,
              entity_label: `${sku.product_name || sku.sku} • ${sku.channel}`,
              owner_role: 'CMO' as OwnerRole,
              owner_user_id: null,
              assigned_at: null,
              status: 'OPEN',
              priority: 'P2',
              severity_score: 70,
              confidence: 'MEDIUM' as Confidence,
              impact_amount: potentialImprovement,
              impact_currency: 'VND',
              impact_window_days: 30,
              impact_description: `Tiềm năng cải thiện ${formatCurrency(potentialImprovement)}đ/tháng`,
              deadline_at: getDeadline('P2'),
              snoozed_until: null,
              snooze_count: 0,
              source_modules: ['FDP', 'SKU Analysis'],
              vertical: 'ecommerce',
              facts: createFacts(cardId, [
                { key: 'margin', label: 'Margin %', value: `${marginPercent.toFixed(1)}%`, numeric: marginPercent, unit: '%', trend: 'DOWN' },
                { key: 'revenue', label: 'Doanh thu', value: `${sku.revenue.toLocaleString()}đ`, numeric: sku.revenue, unit: 'VND' },
                { key: 'target_margin', label: 'Margin mục tiêu', value: '10%', numeric: 10, unit: '%' },
                { key: 'gap', label: 'Cần cải thiện', value: `+${marginGap.toFixed(1)}%`, numeric: marginGap, unit: '%' },
              ]),
              actions: createActions(cardId, [
                { 
                  type: 'SCALE_WITH_CONDITION', 
                  label: 'Tăng giá 10-15%', 
                  isRecommended: true, 
                  outcome: `Margin +${marginGap.toFixed(1)}%, lợi nhuận +${formatCurrency(potentialImprovement)}đ/tháng`
                },
                { 
                  type: 'RENEGOTIATE', 
                  label: 'Đàm phán với supplier', 
                  outcome: `Giảm COGS 5-10%, tiết kiệm ${formatCurrency(sku.cogs * 0.07)}đ`
                },
                { 
                  type: 'INVESTIGATE', 
                  label: 'Theo dõi thêm', 
                  outcome: 'Thu thập thêm dữ liệu 7 ngày'
                },
              ]),
            };
            cards.push(card);
          }
        });
    }

    // 2. Analyze Cash Position - Generate CASH_SURVIVAL decisions (from REAL data)
    if (latestCashBalance > 0 && burnRate > 0) {
      if (currentRunway < FDP_THRESHOLDS.RUNWAY_CRITICAL_MONTHS) {
        const cardId = generateAutoId('cash', 'runway');
        const daysLeft = Math.floor(currentRunway * 30);
        
        const card: AutoDecisionCard = {
          id: cardId,
          isAuto: true,
          card_type: 'CASH_SURVIVAL',
          title: `KHẨN CẤP: Cash Runway ${currentRunway.toFixed(1)} tháng`,
          question: `Chỉ còn ${currentRunway.toFixed(1)} tháng cash - cần hành động gì ngay?`,
          entity_type: 'cash',
          entity_id: 'runway',
          entity_label: `Cash Balance: ${formatCurrency(latestCashBalance)}đ`,
          owner_role: 'CFO' as OwnerRole,
          owner_user_id: null,
          assigned_at: null,
          status: 'OPEN',
          priority: 'P1',
          severity_score: 99,
          confidence: 'HIGH' as Confidence,
          impact_amount: -latestCashBalance,
          impact_currency: 'VND',
          impact_window_days: daysLeft,
          impact_description: `Hết tiền trong ${currentRunway.toFixed(1)} tháng nếu không hành động`,
          deadline_at: getDeadline('P1'),
          snoozed_until: null,
          snooze_count: 0,
          source_modules: ['FDP', 'Cash Flow Direct'],
          vertical: 'finance',
          facts: createFacts(cardId, [
            { key: 'runway', label: 'Cash Runway', value: `${currentRunway.toFixed(1)} tháng`, numeric: currentRunway, unit: 'tháng', trend: 'DOWN' },
            { key: 'balance', label: 'Số dư hiện tại', value: `${formatCurrency(latestCashBalance)}đ`, numeric: latestCashBalance, unit: 'VND' },
            { key: 'burn', label: 'Burn Rate', value: `${formatCurrency(burnRate)}đ/tháng`, numeric: burnRate, unit: 'VND' },
          ]),
          actions: createActions(cardId, [
            { 
              type: 'COLLECT', 
              label: 'Thu hồi AR ngay', 
              isRecommended: true, 
              outcome: `Tăng runway, mục tiêu +${Math.ceil(burnRate * 2 / latestCashBalance * currentRunway)} tháng`
            },
            { 
              type: 'STOP', 
              label: 'Cắt giảm chi phí 30%', 
              outcome: `Burn rate giảm ${formatCurrency(burnRate * 0.3)}đ, runway +${((latestCashBalance / (burnRate * 0.7)) - currentRunway).toFixed(1)} tháng`
            },
            { 
              type: 'RENEGOTIATE', 
              label: 'Đàm phán với NCC', 
              outcome: 'Hoãn thanh toán 30-60 ngày, giữ cash'
            },
          ]),
        };
        cards.push(card);
      }
    }

    // 3. Analyze Overdue AR - Generate COLLECT decisions (from REAL data)
    if (invoicesData && Array.isArray(invoicesData)) {
      const overdueInvoices = invoicesData.filter(inv => inv.daysOverdue > 0);
      const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);
      
      if (overdueInvoices.length > 0 && totalOverdue > 0) {
        const cardId = generateAutoId('ar', 'overdue');
        const topOverdue = overdueInvoices.slice(0, 3);
        
        // Calculate runway improvement if collected
        const runwayImprovement = burnRate > 0 ? totalOverdue / burnRate : 0;
        
        const card: AutoDecisionCard = {
          id: cardId,
          isAuto: true,
          card_type: 'CASH_SURVIVAL',
          title: `THU HỒI: ${overdueInvoices.length} hóa đơn quá hạn`,
          question: `${formatCurrency(totalOverdue)}đ AR quá hạn - cần thu hồi ngay?`,
          entity_type: 'ar',
          entity_id: 'overdue',
          entity_label: `${overdueInvoices.length} khách hàng nợ quá hạn`,
          owner_role: 'CFO' as OwnerRole,
          owner_user_id: null,
          assigned_at: null,
          status: 'OPEN',
          priority: 'P1',
          severity_score: 90,
          confidence: 'HIGH' as Confidence,
          impact_amount: totalOverdue,
          impact_currency: 'VND',
          impact_window_days: 14,
          impact_description: `Thu hồi được ${formatCurrency(totalOverdue)}đ → runway +${runwayImprovement.toFixed(1)} tháng`,
          deadline_at: getDeadline('P1'),
          snoozed_until: null,
          snooze_count: 0,
          source_modules: ['FDP', 'AR Aging'],
          vertical: 'finance',
          facts: createFacts(cardId, [
            { key: 'total', label: 'Tổng nợ quá hạn', value: `${formatCurrency(totalOverdue)}đ`, numeric: totalOverdue, unit: 'VND', trend: 'UP' },
            { key: 'count', label: 'Số hóa đơn', value: `${overdueInvoices.length}`, numeric: overdueInvoices.length },
            { key: 'runway_impact', label: 'Runway nếu thu', value: `+${runwayImprovement.toFixed(1)} tháng`, numeric: runwayImprovement, unit: 'tháng' },
            ...topOverdue.map((inv, i) => ({
              key: `customer_${i}`,
              label: inv.customers?.name || `Khách ${i + 1}`,
              value: `${formatCurrency(inv.total_amount - (inv.paid_amount || 0))}đ (${inv.daysOverdue} ngày)`,
              numeric: inv.total_amount - (inv.paid_amount || 0),
              unit: 'VND',
            })),
          ]),
          actions: createActions(cardId, [
            { 
              type: 'COLLECT', 
              label: 'Liên hệ khách ngay', 
              isRecommended: true, 
              outcome: `Thu ${formatCurrency(totalOverdue)}đ trong 7-14 ngày, runway +${runwayImprovement.toFixed(1)} tháng`
            },
            { 
              type: 'DISCOUNT', 
              label: 'Chiết khấu 2-3% thanh toán sớm', 
              outcome: `Thu nhanh ${formatCurrency(totalOverdue * 0.97)}đ, mất ${formatCurrency(totalOverdue * 0.03)}đ`
            },
            { 
              type: 'INVESTIGATE', 
              label: 'Phân loại rủi ro', 
              outcome: 'Ưu tiên khách có khả năng trả cao nhất'
            },
          ]),
        };
        cards.push(card);
      }
    }

    // 4. Marketing Risk Alerts - PAUSE/INVESTIGATE campaigns (from REAL MDP data)
    if (riskAlerts && riskAlerts.length > 0) {
      riskAlerts
        .filter(alert => alert.severity === 'critical')
        .slice(0, 3) // Max 3 marketing cards
        .forEach((alert, index) => {
          const cardId = generateAutoId('marketing', `${alert.type}-${index}`);
          
          // Calculate runway impact if pausing this campaign
          const dailySpend = alert.impact_amount / 30;
          const runwayGain = burnRate > 0 ? (dailySpend * 30) / burnRate : 0;
          
          let priority: Priority = 'P2';
          let actionType: ActionType = 'INVESTIGATE';
          let actionLabel = 'Điều tra chiến dịch';
          
          if (alert.type === 'burning_cash' || alert.type === 'negative_margin') {
            priority = 'P1';
            actionType = 'PAUSE';
            actionLabel = `PAUSE ${alert.campaign_name}`;
          }
          
          const card: AutoDecisionCard = {
            id: cardId,
            isAuto: true,
            card_type: 'GROWTH_SCALE_CHANNEL',
            title: `${alert.type === 'burning_cash' ? 'ĐANG ĐỐT TIỀN' : 'MARGIN ÂM'}: ${alert.campaign_name}`,
            question: alert.message,
            entity_type: 'campaign',
            entity_id: alert.campaign_name,
            entity_label: `${alert.campaign_name} • ${alert.channel}`,
            owner_role: 'CMO' as OwnerRole,
            owner_user_id: null,
            assigned_at: null,
            status: 'OPEN',
            priority,
            severity_score: alert.severity === 'critical' ? 90 : 70,
            confidence: 'HIGH' as Confidence,
            impact_amount: -Math.abs(alert.impact_amount),
            impact_currency: 'VND',
            impact_window_days: 30,
            impact_description: alert.recommended_action,
            deadline_at: getDeadline(priority),
            snoozed_until: null,
            snooze_count: 0,
            source_modules: ['MDP', 'Risk Analysis'],
            vertical: 'marketing',
            facts: createFacts(cardId, [
              { key: 'metric', label: alert.type === 'negative_margin' ? 'Contribution Margin' : 'Cash Impact', value: `${formatCurrency(alert.metric_value)}đ`, numeric: alert.metric_value, unit: 'VND', trend: 'DOWN' },
              { key: 'threshold', label: 'Ngưỡng an toàn', value: `${formatCurrency(alert.threshold)}đ`, numeric: alert.threshold, unit: 'VND' },
              { key: 'impact', label: 'Thiệt hại/tháng', value: `${formatCurrency(alert.impact_amount)}đ`, numeric: alert.impact_amount, unit: 'VND' },
              { key: 'channel', label: 'Kênh', value: alert.channel },
            ]),
            actions: createActions(cardId, [
              { 
                type: actionType, 
                label: actionLabel, 
                isRecommended: true, 
                outcome: `Tiết kiệm ${formatCurrency(Math.abs(alert.impact_amount))}đ, runway +${runwayGain.toFixed(1)} tháng`
              },
              { 
                type: 'SCALE_WITH_CONDITION', 
                label: 'Tối ưu targeting & creative', 
                outcome: 'Giảm CPA 20%, tăng ROAS'
              },
              { 
                type: 'STOP', 
                label: 'Dừng hoàn toàn', 
                outcome: `Dừng lỗ ngay, tiết kiệm ${formatCurrency(Math.abs(alert.impact_amount))}đ/tháng`
              },
            ]),
          };
          cards.push(card);
        });
    }

    // 5. Loss-making campaigns from profit attribution (from REAL MDP data)
    if (profitAttribution && profitAttribution.length > 0) {
      profitAttribution
        .filter(p => p.status === 'critical' || p.status === 'loss')
        .slice(0, 2) // Max 2 additional campaign cards
        .forEach((campaign, index) => {
          // Skip if already covered by risk alerts
          const existingCard = cards.find(c => c.entity_id === campaign.campaign_name);
          if (existingCard) return;
          
          const cardId = generateAutoId('campaign-loss', `${campaign.campaign_id}-${index}`);
          const monthlyLoss = Math.abs(campaign.contribution_margin);
          const runwayGain = burnRate > 0 ? campaign.ad_spend / burnRate : 0;
          
          const card: AutoDecisionCard = {
            id: cardId,
            isAuto: true,
            card_type: 'GROWTH_SCALE_CHANNEL',
            title: `CAMPAIGN LỖ: ${campaign.campaign_name}`,
            question: `CM ${campaign.contribution_margin_percent.toFixed(1)}% < ${MDP_THRESHOLDS.MIN_CM_PERCENT}% mục tiêu - tiếp tục hay dừng?`,
            entity_type: 'campaign',
            entity_id: campaign.campaign_name,
            entity_label: `${campaign.campaign_name} • ${campaign.channel}`,
            owner_role: 'CMO' as OwnerRole,
            owner_user_id: null,
            assigned_at: null,
            status: 'OPEN',
            priority: campaign.status === 'critical' ? 'P1' : 'P2',
            severity_score: campaign.status === 'critical' ? 85 : 65,
            confidence: 'HIGH' as Confidence,
            impact_amount: campaign.contribution_margin,
            impact_currency: 'VND',
            impact_window_days: 30,
            impact_description: campaign.contribution_margin < 0 
              ? `Đang lỗ ${formatCurrency(monthlyLoss)}đ/tháng`
              : `Margin thấp, chỉ ${campaign.contribution_margin_percent.toFixed(1)}%`,
            deadline_at: getDeadline(campaign.status === 'critical' ? 'P1' : 'P2'),
            snoozed_until: null,
            snooze_count: 0,
            source_modules: ['MDP', 'Profit Attribution'],
            vertical: 'marketing',
            facts: createFacts(cardId, [
              { key: 'cm_percent', label: 'Contribution Margin %', value: `${campaign.contribution_margin_percent.toFixed(1)}%`, numeric: campaign.contribution_margin_percent, unit: '%', trend: 'DOWN' },
              { key: 'ad_spend', label: 'Ad Spend', value: `${formatCurrency(campaign.ad_spend)}đ`, numeric: campaign.ad_spend, unit: 'VND' },
              { key: 'revenue', label: 'Net Revenue', value: `${formatCurrency(campaign.net_revenue)}đ`, numeric: campaign.net_revenue, unit: 'VND' },
              { key: 'profit_roas', label: 'Profit ROAS', value: `${campaign.profit_roas.toFixed(2)}`, numeric: campaign.profit_roas },
            ]),
            actions: createActions(cardId, [
              { 
                type: 'PAUSE', 
                label: `PAUSE ${campaign.campaign_name}`, 
                isRecommended: campaign.status === 'critical',
                outcome: `Tiết kiệm ${formatCurrency(campaign.ad_spend)}đ/tháng, runway +${runwayGain.toFixed(1)} tháng`
              },
              { 
                type: 'SCALE_WITH_CONDITION', 
                label: 'Tối ưu để đạt CM > 10%', 
                isRecommended: campaign.status !== 'critical',
                outcome: `Cần tăng ROAS từ ${campaign.profit_roas.toFixed(2)} lên ${MDP_THRESHOLDS.MIN_PROFIT_ROAS}`
              },
              { 
                type: 'INVESTIGATE', 
                label: 'Phân tích sâu', 
                outcome: 'Xác định nguyên nhân CM thấp'
              },
            ]),
          };
          cards.push(card);
        });
    }

    // Sort by priority and severity
    return cards.sort((a, b) => {
      const priorityOrder = { P1: 0, P2: 1, P3: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.severity_score - a.severity_score;
    });
  }, [skuData, cashSummary, cashFlows, invoicesData, profitAttribution, riskAlerts]);

  return {
    data: autoCards,
    isLoading: false,
  };
}
