import { useMemo } from 'react';
import { FDP_THRESHOLDS, analyzeSKU } from '@/lib/fdp-formulas';
import { useAllProblematicSKUs, ProblematicSKU } from './useAllProblematicSKUs';
import { useCashFlowDirect } from './useCashFlowDirect';
import { useInvoiceTracking } from './useInvoiceData';
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

// Create actions
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
  const { data: cashData } = useCashFlowDirect();
  const { invoices: invoicesData } = useInvoiceTracking();

  const autoCards = useMemo(() => {
    const cards: AutoDecisionCard[] = [];

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
              impact_amount: -Math.abs(sku.profit),
              impact_currency: 'VND',
              impact_window_days: 30,
              impact_description: `Tổn thất ${Math.abs(sku.profit).toLocaleString()}đ/tháng nếu tiếp tục bán`,
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
                { type: 'STOP', label: 'Dừng bán ngay', isRecommended: true, outcome: 'Dừng lỗ, giải phóng vốn tồn kho' },
                { type: 'PAUSE', label: 'Tạm dừng & xả hàng', outcome: 'Giảm giá xả tồn rồi dừng' },
                { type: 'INVESTIGATE', label: 'Điều tra thêm', outcome: 'Phân tích sâu trước khi quyết định' },
              ]),
            };
            cards.push(card);
          } else if (analysis.decision === 'review') {
            const cardId = generateAutoId('sku-review', sku.sku);
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
              impact_amount: sku.revenue * 0.05, // Potential 5% improvement
              impact_currency: 'VND',
              impact_window_days: 30,
              impact_description: `Tiềm năng cải thiện ${(sku.revenue * 0.05).toLocaleString()}đ/tháng`,
              deadline_at: getDeadline('P2'),
              snoozed_until: null,
              snooze_count: 0,
              source_modules: ['FDP', 'SKU Analysis'],
              vertical: 'ecommerce',
              facts: createFacts(cardId, [
                { key: 'margin', label: 'Margin %', value: `${marginPercent.toFixed(1)}%`, numeric: marginPercent, unit: '%', trend: 'DOWN' },
                { key: 'revenue', label: 'Doanh thu', value: `${sku.revenue.toLocaleString()}đ`, numeric: sku.revenue, unit: 'VND' },
                { key: 'target_margin', label: 'Margin mục tiêu', value: '10%', numeric: 10, unit: '%' },
                { key: 'channel', label: 'Kênh bán', value: sku.channel },
              ]),
              actions: createActions(cardId, [
                { type: 'SCALE_WITH_CONDITION', label: 'Tăng giá 10-15%', isRecommended: true, outcome: 'Margin tăng, volume có thể giảm nhẹ' },
                { type: 'RENEGOTIATE', label: 'Đàm phán với supplier', outcome: 'Giảm COGS 5-10%' },
                { type: 'INVESTIGATE', label: 'Theo dõi thêm', outcome: 'Thu thập thêm dữ liệu' },
              ]),
            };
            cards.push(card);
          }
        });
    }

    // 2. Analyze Cash Position - Generate CASH_SURVIVAL decisions
    if (cashData && Array.isArray(cashData) && cashData.length > 0) {
      const latestCash = cashData[0];
      const bankBalance = latestCash.opening_cash_balance || 0;
      const monthlyBurn = 50000000; // Should come from real data
      const cashRunway = monthlyBurn > 0 ? bankBalance / monthlyBurn : 999;

      if (cashRunway < FDP_THRESHOLDS.RUNWAY_CRITICAL_MONTHS) {
        const cardId = generateAutoId('cash', 'runway');
        const card: AutoDecisionCard = {
          id: cardId,
          isAuto: true,
          card_type: 'CASH_SURVIVAL',
          title: `KHẨN CẤP: Cash Runway < ${FDP_THRESHOLDS.RUNWAY_CRITICAL_MONTHS} tháng`,
          question: `Chỉ còn ${cashRunway.toFixed(1)} tháng cash - cần hành động gì ngay?`,
          entity_type: 'cash',
          entity_id: 'runway',
          entity_label: `Cash Balance: ${bankBalance.toLocaleString()}đ`,
          owner_role: 'CFO' as OwnerRole,
          owner_user_id: null,
          assigned_at: null,
          status: 'OPEN',
          priority: 'P1',
          severity_score: 99,
          confidence: 'HIGH' as Confidence,
          impact_amount: -bankBalance,
          impact_currency: 'VND',
          impact_window_days: Math.floor(cashRunway * 30),
          impact_description: `Hết tiền trong ${cashRunway.toFixed(1)} tháng nếu không hành động`,
          deadline_at: getDeadline('P1'),
          snoozed_until: null,
          snooze_count: 0,
          source_modules: ['FDP', 'Cash Flow'],
          vertical: 'finance',
          facts: createFacts(cardId, [
            { key: 'runway', label: 'Cash Runway', value: `${cashRunway.toFixed(1)} tháng`, numeric: cashRunway, unit: 'tháng', trend: 'DOWN' },
            { key: 'balance', label: 'Số dư', value: `${bankBalance.toLocaleString()}đ`, numeric: bankBalance, unit: 'VND' },
            { key: 'burn', label: 'Burn Rate', value: `${monthlyBurn.toLocaleString()}đ/tháng`, numeric: monthlyBurn, unit: 'VND' },
          ]),
          actions: createActions(cardId, [
            { type: 'COLLECT', label: 'Thu hồi AR ngay', isRecommended: true, outcome: 'Tăng cash trong 7-14 ngày' },
            { type: 'STOP', label: 'Cắt giảm chi phí', outcome: 'Giảm burn rate 30-50%' },
            { type: 'RENEGOTIATE', label: 'Đàm phán với NCC', outcome: 'Hoãn thanh toán 30-60 ngày' },
          ]),
        };
        cards.push(card);
      }
    }

    // 3. Analyze Overdue AR - Generate COLLECT decisions
    if (invoicesData && Array.isArray(invoicesData)) {
      const overdueInvoices = invoicesData.filter(inv => inv.daysOverdue > 0);
      const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);
      
      if (overdueInvoices.length > 0 && totalOverdue > 0) {
        const cardId = generateAutoId('ar', 'overdue');
        const topOverdue = overdueInvoices.slice(0, 3);
        
        const card: AutoDecisionCard = {
          id: cardId,
          isAuto: true,
          card_type: 'CASH_SURVIVAL',
          title: `THU HỒI: ${overdueInvoices.length} hóa đơn quá hạn`,
          question: `${totalOverdue.toLocaleString()}đ AR quá hạn - cần thu hồi ngay?`,
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
          impact_description: `Thu hồi được ${totalOverdue.toLocaleString()}đ nếu hành động`,
          deadline_at: getDeadline('P1'),
          snoozed_until: null,
          snooze_count: 0,
          source_modules: ['FDP', 'AR Aging'],
          vertical: 'finance',
          facts: createFacts(cardId, [
            { key: 'total', label: 'Tổng nợ quá hạn', value: `${totalOverdue.toLocaleString()}đ`, numeric: totalOverdue, unit: 'VND', trend: 'UP' },
            { key: 'count', label: 'Số hóa đơn', value: `${overdueInvoices.length}`, numeric: overdueInvoices.length },
            ...topOverdue.map((inv, i) => ({
              key: `customer_${i}`,
              label: inv.customers?.name || `Khách ${i + 1}`,
              value: `${(inv.total_amount - (inv.paid_amount || 0)).toLocaleString()}đ (${inv.daysOverdue} ngày)`,
              numeric: inv.total_amount - (inv.paid_amount || 0),
              unit: 'VND',
            })),
          ]),
          actions: createActions(cardId, [
            { type: 'COLLECT', label: 'Liên hệ khách ngay', isRecommended: true, outcome: 'Thu hồi trong 7-14 ngày' },
            { type: 'DISCOUNT', label: 'Đề xuất chiết khấu 2-3%', outcome: 'Thu nhanh hơn, chấp nhận mất 2-3%' },
            { type: 'INVESTIGATE', label: 'Phân loại rủi ro', outcome: 'Ưu tiên khách có khả năng trả' },
          ]),
        };
        cards.push(card);
      }
    }

    // Sort by priority and severity
    return cards.sort((a, b) => {
      const priorityOrder = { P1: 0, P2: 1, P3: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.severity_score - a.severity_score;
    });
  }, [skuData, cashData, invoicesData]);

  return {
    data: autoCards,
    isLoading: false,
  };
}
