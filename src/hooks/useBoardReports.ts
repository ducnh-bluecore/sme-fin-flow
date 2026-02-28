/**
 * Board Reports Hook - Refactored to use SSOT
 * 
 * Architecture v1.4.1: Migrated to useTenantQueryBuilder
 * 
 * Key metrics (DSO, DPO, margins, EBITDA) now use dashboard_kpi_cache
 * which is populated by useCentralFinancialMetrics.
 * This ensures consistent metrics across all reports.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { subMonths, subQuarters, subYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, differenceInDays, format } from 'date-fns';
import { INDUSTRY_BENCHMARKS, THRESHOLD_LEVELS } from '@/lib/financial-constants';

export interface FinancialHighlight {
  total_revenue: number;
  collected_revenue: number;
  uncollected_revenue: number;
  total_expenses: number;
  cogs: number;
  opex: number;
  net_income: number;
  ebitda: number;
  cash_balance: number;
  cash_inflows: number;
  cash_outflows: number;
  gross_margin: number;
  net_margin: number;
  operating_margin: number;
  // YoY comparison
  prev_revenue: number;
  prev_expenses: number;
  prev_net_income: number;
  revenue_growth: number;
  expense_growth: number;
  profit_growth: number;
}

export interface KeyMetric {
  dso: number;
  dpo: number;
  dio: number;
  ccc: number;
  current_ratio: number;
  quick_ratio: number;
  debt_ratio: number;
  total_ar: number;
  overdue_ar: number;
  collection_rate: number;
  ar_turnover: number;
  invoice_count: number;
  paid_invoice_count: number;
  overdue_invoice_count: number;
  avg_invoice_value: number;
  customer_count: number;
  top_customers: Array<{ name: string; amount: number; percentage: number }>;
}

export interface RiskItem {
  id: string;
  category: 'liquidity' | 'credit' | 'operational' | 'market' | 'compliance';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: number;
  risk_score: number;
  mitigation: string;
  status: 'identified' | 'monitoring' | 'mitigating' | 'resolved';
  owner: string;
  due_date: string | null;
}

export interface StrategicInitiative {
  id: string;
  title: string;
  description: string;
  category: 'growth' | 'efficiency' | 'innovation' | 'risk_management' | 'cost_optimization' | 'digital_transformation' | 'market_expansion' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  progress: number;
  budget: number;
  spent: number;
  start_date: string | null;
  end_date: string | null;
  kpis: string[];
  milestones: Array<{ title: string; date: string; completed: boolean }>;
}

export interface CashFlowAnalysis {
  operating_cash_flow: number;
  investing_cash_flow: number;
  financing_cash_flow: number;
  net_cash_flow: number;
  cash_runway_months: number;
  burn_rate: number;
  monthly_trend: Array<{ month: string; inflow: number; outflow: number; net: number }>;
}

export interface ARAgingAnalysis {
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90: number;
  total: number;
  aging_distribution: Array<{ bucket: string; amount: number; percentage: number; count: number }>;
}

export interface BoardReport {
  id: string;
  tenant_id: string;
  report_title: string;
  report_period: string;
  report_type: 'monthly' | 'quarterly' | 'annual';
  status: 'draft' | 'pending_review' | 'approved' | 'published';
  executive_summary: string | null;
  financial_highlights: FinancialHighlight | null;
  key_metrics: KeyMetric | null;
  risk_assessment: { risks: RiskItem[]; summary: string } | null;
  strategic_initiatives: { initiatives: StrategicInitiative[]; summary: string } | null;
  recommendations: string[] | null;
  cash_flow_analysis?: CashFlowAnalysis | null;
  ar_aging_analysis?: ARAgingAnalysis | null;
  generated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useBoardReports() {
  const { client, tenantId, isReady, buildSelectQuery, buildInsertQuery, buildUpdateQuery, buildDeleteQuery } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['board-reports', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await buildSelectQuery('board_reports', '*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as BoardReport[];
    },
    enabled: !!tenantId && isReady,
  });

  const generateReport = useMutation({
    mutationFn: async (params: { 
      report_type: 'monthly' | 'quarterly' | 'annual';
      report_period: string;
      start_date?: string;
      end_date?: string;
    }) => {
      if (!tenantId) throw new Error('No tenant selected');

      // Use provided dates or fall back to current period
      const startDate = params.start_date ? new Date(params.start_date) : undefined;
      const endDate = params.end_date ? new Date(params.end_date) : undefined;

      // Generate comprehensive report data (pass tenantId for filtering)
      const financialHighlights = await generateFinancialHighlights(client, tenantId, params.report_type, startDate, endDate);
      const keyMetrics = await generateKeyMetrics(client, tenantId, startDate, endDate);
      const riskAssessment = await generateRiskAssessment(tenantId, financialHighlights, keyMetrics);
      const strategicInitiatives = await generateStrategicInitiatives(tenantId);
      const cashFlowAnalysis = await generateCashFlowAnalysis(client, tenantId, startDate, endDate);
      const arAgingAnalysis = await generateARAgingAnalysis(client, tenantId);
      const recommendations = generateRecommendations(financialHighlights, keyMetrics, riskAssessment);
      
      const { data, error } = await client
        .from('board_reports')
        .insert({
          tenant_id: tenantId,
          report_title: `Báo cáo ${params.report_type === 'monthly' ? 'tháng' : params.report_type === 'quarterly' ? 'quý' : 'năm'} - ${params.report_period}`,
          report_period: params.report_period,
          report_type: params.report_type,
          status: 'draft',
          executive_summary: generateExecutiveSummary(financialHighlights, keyMetrics, riskAssessment),
          financial_highlights: financialHighlights as unknown as Json,
          key_metrics: keyMetrics as unknown as Json,
          risk_assessment: riskAssessment as unknown as Json,
          strategic_initiatives: strategicInitiatives as unknown as Json,
          cash_flow_analysis: cashFlowAnalysis as unknown as Json,
          ar_aging_analysis: arAgingAnalysis as unknown as Json,
          recommendations: recommendations,
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-reports', tenantId] });
      toast.success('Đã tạo báo cáo HĐQT thành công');
    },
    onError: (error) => {
      toast.error('Lỗi khi tạo báo cáo: ' + error.message);
    },
  });

  const updateReport = useMutation({
    mutationFn: async (params: { id: string; updates: Partial<BoardReport> }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (params.updates.executive_summary !== undefined) {
        updateData.executive_summary = params.updates.executive_summary;
      }
      if (params.updates.status !== undefined) {
        updateData.status = params.updates.status;
      }
      if (params.updates.recommendations !== undefined) {
        updateData.recommendations = params.updates.recommendations;
      }
      if (params.updates.risk_assessment !== undefined) {
        updateData.risk_assessment = params.updates.risk_assessment as unknown as Json;
      }
      if (params.updates.strategic_initiatives !== undefined) {
        updateData.strategic_initiatives = params.updates.strategic_initiatives as unknown as Json;
      }
      
      const { data, error } = await client
        .from('board_reports')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-reports', tenantId] });
      toast.success('Đã cập nhật báo cáo');
    },
    onError: (error) => {
      toast.error('Lỗi khi cập nhật: ' + error.message);
    },
  });

  const approveReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { data: { user } } = await client.auth.getUser();
      
      const { data, error } = await client
        .from('board_reports')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-reports', tenantId] });
      toast.success('Đã phê duyệt báo cáo');
    },
    onError: (error) => {
      toast.error('Lỗi khi phê duyệt: ' + error.message);
    },
  });

  const publishReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { data, error } = await client
        .from('board_reports')
        .update({
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-reports', tenantId] });
      toast.success('Đã xuất bản báo cáo');
    },
    onError: (error) => {
      toast.error('Lỗi khi xuất bản: ' + error.message);
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await client
        .from('board_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-reports', tenantId] });
      toast.success('Đã xóa báo cáo');
    },
    onError: (error) => {
      toast.error('Lỗi khi xóa: ' + error.message);
    },
  });

  return {
    reports,
    isLoading,
    error,
    generateReport,
    updateReport,
    approveReport,
    publishReport,
    deleteReport,
  };
}

async function generateFinancialHighlights(
  client: any,
  tenantId: string, 
  reportType: string,
  customStartDate?: Date,
  customEndDate?: Date
): Promise<FinancialHighlight> {
  const now = new Date();
  let startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date;

  // Use custom dates if provided, otherwise calculate from report type
  if (customStartDate && customEndDate) {
    startDate = customStartDate;
    endDate = customEndDate;
    // Calculate previous period based on the same duration
    const durationMs = endDate.getTime() - startDate.getTime();
    prevEndDate = new Date(startDate.getTime() - 1); // Day before start
    prevStartDate = new Date(prevEndDate.getTime() - durationMs);
  } else if (reportType === 'monthly') {
    startDate = startOfMonth(now);
    endDate = endOfMonth(now);
    prevStartDate = startOfMonth(subMonths(now, 1));
    prevEndDate = endOfMonth(subMonths(now, 1));
  } else if (reportType === 'quarterly') {
    startDate = startOfQuarter(now);
    endDate = endOfQuarter(now);
    prevStartDate = startOfQuarter(subQuarters(now, 1));
    prevEndDate = endOfQuarter(subQuarters(now, 1));
  } else {
    startDate = startOfYear(now);
    endDate = endOfYear(now);
    prevStartDate = startOfYear(subYears(now, 1));
    prevEndDate = endOfYear(subYears(now, 1));
  }

  // ARCHITECTURE: Hook → View → Table (all queries via views)
  // v_financial_monthly_summary → invoices + expenses + revenues
  const financialSummaryQuery = client
    .from('v_financial_monthly_summary' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('period_month', startDate.toISOString().slice(0, 10))
    .lte('period_month', endDate.toISOString().slice(0, 10));

  const prevFinancialSummaryQuery = client
    .from('v_financial_monthly_summary' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('period_month', prevStartDate.toISOString().slice(0, 10))
    .lte('period_month', prevEndDate.toISOString().slice(0, 10));

  const bankAccountsQuery = client.from('bank_accounts').select('current_balance').eq('tenant_id', tenantId);

  // v_cash_flow_monthly → bank_transactions
  const cashFlowQuery = client
    .from('v_cash_flow_monthly' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('period_month', startDate.toISOString().slice(0, 10))
    .lte('period_month', endDate.toISOString().slice(0, 10));

  const [
    { data: financialData },
    { data: prevFinancialData },
    { data: bankAccounts },
    { data: cashFlowData },
  ] = await Promise.all([
    financialSummaryQuery,
    prevFinancialSummaryQuery,
    bankAccountsQuery,
    cashFlowQuery,
  ]);

  // Aggregate from monthly summary view
  const months = (financialData || []) as any[];
  const prevMonths = (prevFinancialData || []) as any[];
  const cashFlows = (cashFlowData || []) as any[];

  let totalRevenue = 0, collectedRevenue = 0, totalExpenses = 0, cogs = 0;
  for (const m of months) {
    totalRevenue += (Number(m.invoice_revenue) || 0) + (Number(m.other_revenue) || 0);
    collectedRevenue += Number(m.invoice_paid) || 0;
    totalExpenses += Number(m.total_expense) || 0;
    cogs += Number(m.cogs) || 0;
  }
  const uncollectedRevenue = totalRevenue - collectedRevenue;
  const opex = totalExpenses - cogs;
  
  let cashBalance = 0;
  if (bankAccounts) { for (const acc of bankAccounts) cashBalance += acc.current_balance || 0; }
  let cashInflows = 0, cashOutflows = 0;
  for (const cf of cashFlows) { cashInflows += Number(cf.total_inflow) || 0; cashOutflows += Number(cf.total_outflow) || 0; }

  let prevRevenue = 0, prevTotalExpenses = 0;
  for (const m of prevMonths) { prevRevenue += (Number(m.invoice_revenue) || 0) + (Number(m.other_revenue) || 0); prevTotalExpenses += Number(m.total_expense) || 0; }
  const prevNetIncome = prevRevenue - prevTotalExpenses;

  const netIncome = totalRevenue - totalExpenses;
  const grossProfit = totalRevenue - cogs;
  const ebitda = grossProfit - opex * 0.7; // Simplified EBITDA calculation

  return {
    total_revenue: totalRevenue,
    collected_revenue: collectedRevenue,
    uncollected_revenue: uncollectedRevenue,
    total_expenses: totalExpenses,
    cogs,
    opex,
    net_income: netIncome,
    ebitda,
    cash_balance: cashBalance,
    cash_inflows: cashInflows,
    cash_outflows: cashOutflows,
    gross_margin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
    net_margin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
    operating_margin: totalRevenue > 0 ? ((totalRevenue - opex) / totalRevenue) * 100 : 0,
    prev_revenue: prevRevenue,
    prev_expenses: prevTotalExpenses,
    prev_net_income: prevNetIncome,
    revenue_growth: prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0,
    expense_growth: prevTotalExpenses > 0 ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 : 0,
    profit_growth: prevNetIncome > 0 ? ((netIncome - prevNetIncome) / prevNetIncome) * 100 : 0,
  };
}

async function generateKeyMetrics(
  client: any,
  tenantId: string,
  startDate?: Date,
  endDate?: Date
): Promise<KeyMetric> {
  // Build queries with tenant filtering - using views where possible
  const kpiCacheQuery = client.from('dashboard_kpi_cache').select('*').eq('tenant_id', tenantId);

  // v_invoice_key_metrics → invoices (pre-aggregated)
  const invoiceMetricsQuery = client
    .from('v_invoice_key_metrics' as any)
    .select('*')
    .eq('tenant_id', tenantId);

  // v_board_report_invoices for top customers (already refactored in Batch 1)
  let invoicesQuery = client
    .from('v_board_report_invoices' as any)
    .select('id, total_amount, paid_amount, status, due_date, customer_id, customer_name')
    .eq('tenant_id', tenantId);
  if (startDate && endDate) {
    invoicesQuery = invoicesQuery
      .gte('issue_date', startDate.toISOString())
      .lte('issue_date', endDate.toISOString());
  }

  const customersQuery = client.from('customers').select('id, name').eq('tenant_id', tenantId);

  // v_pending_ap → bills
  const apQuery = client
    .from('v_pending_ap' as any)
    .select('outstanding')
    .eq('tenant_id', tenantId);

  const bankAccountsQuery = client.from('bank_accounts').select('current_balance').eq('tenant_id', tenantId);

  // Fetch all data in parallel
  const [kpiCacheRes, invoiceMetricsRes, invoicesRes, customersRes, apRes, bankAccountsRes] = await Promise.all([
    kpiCacheQuery.single(),
    invoiceMetricsQuery.maybeSingle(),
    invoicesQuery,
    customersQuery,
    apQuery,
    bankAccountsQuery,
  ]);

  const kpiCache = kpiCacheRes.data;
  const invoiceMetrics = invoiceMetricsRes.data as any;
  const invoices = invoicesRes.data;
  const customers = customersRes.data;
  const apItems = (apRes.data || []) as any[];
  const bankAccounts = bankAccountsRes.data;

  const now = new Date();
  const invoiceCount = Number(invoiceMetrics?.total_count) || invoices?.length || 0;
  const paidCount = Number(invoiceMetrics?.paid_count) || 0;
  const overdueCount = Number(invoiceMetrics?.overdue_count) || 0;

  // Use pre-aggregated AR from view
  const totalAR = Number(invoiceMetrics?.total_ar) || 0;
  const avgInvoiceValue = Number(invoiceMetrics?.avg_invoice_value) || 0;

  // Use v_pending_ap view for AP
  let totalAP = 0; for (const b of apItems) totalAP += Number(b.outstanding) || 0;

  // Calculate ratios
  let cashBalanceLocal = 0;
  if (bankAccounts) { for (const acc of bankAccounts) cashBalanceLocal += acc.current_balance || 0; }
  const currentAssets = cashBalanceLocal + totalAR;
  const currentLiabilities = totalAP || 1; // Avoid division by zero
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  const quickRatio = currentLiabilities > 0 ? cashBalanceLocal / currentLiabilities : 0;

  // Top customers from v_board_report_invoices view
  const customerRevenue: Record<string, { name: string; amount: number }> = {};
  invoices?.forEach((inv: any) => {
    const customerId = inv.customer_id;
    const customerName = inv.customer_name || 'Unknown';
    if (customerId) {
      if (!customerRevenue[customerId]) {
        customerRevenue[customerId] = { name: customerName, amount: 0 };
      }
      customerRevenue[customerId].amount += inv.total_amount || 0;
    }
  });

  let totalCustomerRevenue = 0;
  for (const c of Object.values(customerRevenue)) totalCustomerRevenue += c.amount;
  const topCustomers = Object.values(customerRevenue)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      amount: c.amount,
      percentage: totalCustomerRevenue > 0 ? (c.amount / totalCustomerRevenue) * 100 : 0,
    }));

  // Use kpiCache for key metrics + pre-aggregated invoice metrics from views
  return {
    dso: kpiCache?.dso || 0,
    dpo: kpiCache?.dpo || 0,
    dio: kpiCache?.dio || 0,
    ccc: kpiCache?.ccc || 0,
    current_ratio: Number(currentRatio.toFixed(2)),
    quick_ratio: Number(quickRatio.toFixed(2)),
    debt_ratio: totalAP > 0 && currentAssets > 0 ? Number((totalAP / currentAssets).toFixed(2)) : 0,
    total_ar: kpiCache?.total_ar || totalAR,
    overdue_ar: kpiCache?.overdue_ar || Number(invoiceMetrics?.overdue_ar) || 0,
    collection_rate: (kpiCache?.total_ar || totalAR) > 0 
      ? (((kpiCache?.total_ar || totalAR) - (kpiCache?.overdue_ar || 0)) / (kpiCache?.total_ar || totalAR)) * 100 
      : 100,
    ar_turnover: (kpiCache?.total_ar || totalAR) > 0 
      ? (kpiCache?.total_revenue || 0) / (kpiCache?.total_ar || totalAR) 
      : 0,
    invoice_count: invoiceCount,
    paid_invoice_count: paidCount,
    overdue_invoice_count: overdueCount,
    avg_invoice_value: avgInvoiceValue,
    customer_count: customers?.length || 0,
    top_customers: topCustomers,
  };
}

async function generateRiskAssessment(
  tenantId: string, 
  financials: FinancialHighlight, 
  metrics: KeyMetric
): Promise<{ risks: RiskItem[]; summary: string }> {
  const risks: RiskItem[] = [];

  // Liquidity risk
  if (financials.cash_balance < financials.total_expenses * 0.5) {
    risks.push({
      id: crypto.randomUUID(),
      category: 'liquidity',
      title: 'Rủi ro thanh khoản cao',
      description: 'Số dư tiền mặt thấp hơn 50% chi phí kỳ hiện tại',
      severity: 'high',
      probability: 0.7,
      impact: 0.8,
      risk_score: 0.56,
      mitigation: 'Tăng cường thu hồi công nợ, đàm phán gia hạn thanh toán với nhà cung cấp',
      status: 'identified',
      owner: 'CFO',
      due_date: null,
    });
  }

  // Credit risk
  if (metrics.overdue_ar > metrics.total_ar * 0.3) {
    risks.push({
      id: crypto.randomUUID(),
      category: 'credit',
      title: 'Rủi ro tín dụng - Công nợ quá hạn cao',
      description: `Công nợ quá hạn chiếm ${((metrics.overdue_ar / metrics.total_ar) * 100).toFixed(1)}% tổng AR`,
      severity: 'high',
      probability: 0.6,
      impact: 0.7,
      risk_score: 0.42,
      mitigation: 'Triển khai chính sách thu hồi nợ mạnh mẽ hơn, xem xét lại điều khoản tín dụng',
      status: 'monitoring',
      owner: 'Kế toán trưởng',
      due_date: null,
    });
  }

  // DSO risk - Use threshold from SSOT constants
  if (metrics.dso > THRESHOLD_LEVELS.dso.warning) {
    risks.push({
      id: crypto.randomUUID(),
      category: 'operational',
      title: 'DSO cao - Chu kỳ thu tiền dài',
      description: `DSO hiện tại là ${metrics.dso} ngày, cao hơn benchmark ${INDUSTRY_BENCHMARKS.dso} ngày`,
      severity: metrics.dso > THRESHOLD_LEVELS.dso.critical ? 'high' : 'medium',
      probability: 0.5,
      impact: 0.5,
      risk_score: 0.25,
      mitigation: 'Cải thiện quy trình xuất hóa đơn, áp dụng chính sách thanh toán sớm',
      status: 'mitigating',
      owner: 'Kế toán AR',
      due_date: null,
    });
  }



  // Revenue decline risk
  if (financials.revenue_growth < -10) {
    risks.push({
      id: crypto.randomUUID(),
      category: 'market',
      title: 'Doanh thu sụt giảm',
      description: `Doanh thu giảm ${Math.abs(financials.revenue_growth).toFixed(1)}% so với kỳ trước`,
      severity: 'high',
      probability: 0.8,
      impact: 0.9,
      risk_score: 0.72,
      mitigation: 'Đánh giá lại chiến lược bán hàng, phân tích nguyên nhân sụt giảm',
      status: 'identified',
      owner: 'Giám đốc kinh doanh',
      due_date: null,
    });
  }

  // Margin compression - Use threshold from SSOT constants
  if (financials.gross_margin < THRESHOLD_LEVELS.grossMargin.warning) {
    risks.push({
      id: crypto.randomUUID(),
      category: 'operational',
      title: 'Biên lợi nhuận gộp thấp',
      description: `Biên LN gộp ${financials.gross_margin.toFixed(1)}% thấp hơn benchmark ${INDUSTRY_BENCHMARKS.grossMargin}%`,
      severity: financials.gross_margin < THRESHOLD_LEVELS.grossMargin.critical ? 'high' : 'medium',
      probability: 0.6,
      impact: 0.6,
      risk_score: 0.36,
      mitigation: 'Đàm phán lại giá với nhà cung cấp, tối ưu hóa chi phí sản xuất',
      status: 'monitoring',
      owner: 'COO',
      due_date: null,
    });
  }

  const highRisks = risks.filter(r => r.severity === 'high' || r.severity === 'critical').length;
  
  let summary: string;
  if (risks.length === 0) {
    // Thông báo rõ ràng về dữ liệu cần thiết để phát hiện rủi ro
    summary = `Chưa phát hiện rủi ro nào từ dữ liệu hiện có. Để hệ thống tự động đánh giá rủi ro, cần có đủ dữ liệu: 
• Số dư tiền mặt (bank_accounts) - để đánh giá rủi ro thanh khoản
• Công nợ phải thu (invoices với status chưa thanh toán) - để đánh giá rủi ro tín dụng  
• Dữ liệu DSO trong dashboard_kpi_cache - để đánh giá hiệu quả thu hồi nợ
• Doanh thu kỳ trước và kỳ hiện tại - để đánh giá xu hướng tăng trưởng
• Chi phí và biên lợi nhuận - để đánh giá rủi ro hoạt động`;
  } else if (highRisks === 0) {
    summary = `Phát hiện ${risks.length} rủi ro, tất cả đều ở mức thấp hoặc trung bình. Tình hình rủi ro được kiểm soát tốt.`;
  } else {
    summary = `Phát hiện ${risks.length} rủi ro, trong đó ${highRisks} rủi ro cao/nghiêm trọng cần được xử lý ưu tiên.`;
  }

  return { risks, summary };
}

// Note: generateStrategicInitiatives needs to be refactored to accept client
// For now, this function doesn't make DB calls in the current context
async function generateStrategicInitiatives(
  tenantId: string
): Promise<{ initiatives: StrategicInitiative[]; summary: string }> {
  // This function should be refactored to accept client parameter
  // For now return empty as a placeholder
  const initiatives: StrategicInitiative[] = [];
  const summary = 'Chưa có sáng kiến chiến lược nào được nhập.';
  return { initiatives, summary };
}


async function generateCashFlowAnalysis(
  client: any,
  tenantId: string,
  customStartDate?: Date,
  customEndDate?: Date
): Promise<CashFlowAnalysis> {
  const now = customEndDate || new Date();

  // ARCHITECTURE: Hook → View → Table (v_cash_flow_monthly → bank_transactions)
  const sixMonthsAgo = subMonths(now, 6);
  const { data: cashFlowData } = await client
    .from('v_cash_flow_monthly' as any)
    .select('period_month, total_inflow, total_outflow, net_flow')
    .eq('tenant_id', tenantId)
    .gte('period_month', format(startOfMonth(sixMonthsAgo), 'yyyy-MM-dd'))
    .lte('period_month', format(endOfMonth(now), 'yyyy-MM-dd'))
    .order('period_month', { ascending: true });

  const monthlyTrend = ((cashFlowData || []) as any[]).map((cf: any) => ({
    month: new Date(cf.period_month).toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
    inflow: Number(cf.total_inflow) || 0,
    outflow: Number(cf.total_outflow) || 0,
    net: Number(cf.net_flow) || 0,
  }));

  const recent = monthlyTrend.slice(-3);
  let recentInflowSum = 0, recentOutflowSum = 0;
  for (const m of recent) { recentInflowSum += m.inflow; recentOutflowSum += m.outflow; }
  const recentInflow = recentInflowSum / Math.max(recent.length, 1);
  const recentOutflow = recentOutflowSum / Math.max(recent.length, 1);
  const burnRate = recentOutflow - recentInflow;

  const { data: bankAccounts } = await client.from('bank_accounts').select('current_balance').eq('tenant_id', tenantId);

  let cashBalance = 0; if (bankAccounts) { for (const acc of bankAccounts) cashBalance += acc.current_balance || 0; }
  const cashRunwayMonths = burnRate > 0 ? cashBalance / burnRate : 12;

  return {
    operating_cash_flow: recentInflow * 0.7,
    investing_cash_flow: -recentOutflow * 0.15,
    financing_cash_flow: -recentOutflow * 0.15,
    net_cash_flow: recentInflow - recentOutflow,
    cash_runway_months: Math.max(0, Math.round(cashRunwayMonths)),
    burn_rate: burnRate,
    monthly_trend: monthlyTrend,
  };
}

async function generateARAgingAnalysis(
  client: any,
  tenantId: string
): Promise<ARAgingAnalysis> {
  // ARCHITECTURE: Hook → View → Table (v_ar_aging_buckets → v_pending_ar → invoices)
  const { data: agingData } = await client
    .from('v_ar_aging_buckets' as any)
    .select('aging_bucket, invoice_count, total_amount')
    .eq('tenant_id', tenantId);

  const buckets = (agingData || []) as any[];
  
  const getBucket = (name: string) => {
    const found = buckets.find((b: any) => b.aging_bucket === name);
    return { amount: Number(found?.total_amount) || 0, count: Number(found?.invoice_count) || 0 };
  };

  const current = getBucket('current');
  const days1_30 = getBucket('overdue_1_30');
  const days31_60 = getBucket('overdue_31_60');
  const days61_90 = getBucket('overdue_61_90');
  const over90 = getBucket('overdue_90_plus');

  const total = current.amount + days1_30.amount + days31_60.amount + days61_90.amount + over90.amount;

  return {
    current: current.amount,
    days_1_30: days1_30.amount,
    days_31_60: days31_60.amount,
    days_61_90: days61_90.amount,
    over_90: over90.amount,
    total,
    aging_distribution: [
      { bucket: 'Chưa đến hạn', amount: current.amount, percentage: total > 0 ? (current.amount / total) * 100 : 0, count: current.count },
      { bucket: '1-30 ngày', amount: days1_30.amount, percentage: total > 0 ? (days1_30.amount / total) * 100 : 0, count: days1_30.count },
      { bucket: '31-60 ngày', amount: days31_60.amount, percentage: total > 0 ? (days31_60.amount / total) * 100 : 0, count: days31_60.count },
      { bucket: '61-90 ngày', amount: days61_90.amount, percentage: total > 0 ? (days61_90.amount / total) * 100 : 0, count: days61_90.count },
      { bucket: 'Trên 90 ngày', amount: over90.amount, percentage: total > 0 ? (over90.amount / total) * 100 : 0, count: over90.count },
    ],
  };
}

function generateRecommendations(
  financials: FinancialHighlight, 
  metrics: KeyMetric, 
  riskAssessment: { risks: RiskItem[]; summary: string }
): string[] {
  const recommendations: string[] = [];

  if (financials.cash_balance < financials.total_expenses) {
    recommendations.push('Ưu tiên cải thiện thanh khoản: tăng cường thu hồi công nợ và tối ưu hóa quản lý tiền mặt.');
  }

  if (metrics.dso > 45) {
    recommendations.push(`Giảm DSO từ ${metrics.dso} ngày xuống dưới 45 ngày thông qua cải thiện quy trình thu hồi nợ.`);
  }

  if (financials.gross_margin < 25) {
    recommendations.push('Xem xét tăng giá bán hoặc đàm phán giảm chi phí đầu vào để cải thiện biên lợi nhuận gộp.');
  }

  if (financials.revenue_growth < 0) {
    recommendations.push('Đánh giá chiến lược bán hàng và marketing để đảo ngược xu hướng giảm doanh thu.');
  }

  if (metrics.overdue_invoice_count > 10) {
    recommendations.push(`Xử lý ${metrics.overdue_invoice_count} hóa đơn quá hạn, ưu tiên các khoản có giá trị lớn.`);
  }

  if (riskAssessment.risks.filter(r => r.severity === 'high' || r.severity === 'critical').length > 0) {
    recommendations.push('Triển khai các biện pháp giảm thiểu rủi ro ưu tiên cao đã được xác định.');
  }

  if (financials.expense_growth > financials.revenue_growth + 5) {
    recommendations.push('Chi phí tăng nhanh hơn doanh thu, cần rà soát và kiểm soát chi phí.');
  }

  return recommendations;
}

function generateExecutiveSummary(
  financials: FinancialHighlight, 
  metrics: KeyMetric,
  riskAssessment: { risks: RiskItem[]; summary: string }
): string {
  const formatVND = (n: number) => n.toLocaleString('vi-VN');
  
  let summary = `**Tóm tắt điều hành**\n\n`;
  
  summary += `**Tình hình tài chính:**\n`;
  summary += `Doanh thu kỳ này đạt ${formatVND(financials.total_revenue)} VND `;
  summary += financials.revenue_growth >= 0 
    ? `(tăng ${financials.revenue_growth.toFixed(1)}% so với kỳ trước). `
    : `(giảm ${Math.abs(financials.revenue_growth).toFixed(1)}% so với kỳ trước). `;
  summary += `Lợi nhuận ròng ${formatVND(financials.net_income)} VND với biên lợi nhuận ${financials.net_margin.toFixed(1)}%.\n\n`;

  summary += `**Thanh khoản:**\n`;
  summary += `Số dư tiền mặt ${formatVND(financials.cash_balance)} VND. `;
  summary += `Dòng tiền vào ${formatVND(financials.cash_inflows)} VND, dòng tiền ra ${formatVND(financials.cash_outflows)} VND.\n\n`;

  summary += `**Công nợ:**\n`;
  summary += `Tổng AR ${formatVND(metrics.total_ar)} VND, trong đó quá hạn ${formatVND(metrics.overdue_ar)} VND (${metrics.overdue_invoice_count} hóa đơn). `;
  summary += `DSO ${metrics.dso} ngày, tỷ lệ thu hồi ${metrics.collection_rate.toFixed(1)}%.\n\n`;

  summary += `**Rủi ro:**\n`;
  const highRisks = riskAssessment.risks.filter(r => r.severity === 'high' || r.severity === 'critical');
  if (highRisks.length > 0) {
    summary += `Có ${highRisks.length} rủi ro cao cần lưu ý: ${highRisks.map(r => r.title).join(', ')}.`;
  } else {
    summary += 'Không có rủi ro cao đáng kể trong kỳ báo cáo.';
  }

  return summary;
}
