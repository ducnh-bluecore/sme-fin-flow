import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { useDateRange } from '@/contexts/DateRangeContext';
import { subMonths, subQuarters, subYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, differenceInDays } from 'date-fns';

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
  const tenantId = useActiveTenantId().data;
  const queryClient = useQueryClient();

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['board-reports', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('board_reports')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as BoardReport[];
    },
    enabled: !!tenantId,
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

      // Generate comprehensive report data
      const financialHighlights = await generateFinancialHighlights(tenantId, params.report_type, startDate, endDate);
      const keyMetrics = await generateKeyMetrics(tenantId, startDate, endDate);
      const riskAssessment = await generateRiskAssessment(tenantId, financialHighlights, keyMetrics);
      const strategicInitiatives = await generateStrategicInitiatives(tenantId);
      const cashFlowAnalysis = await generateCashFlowAnalysis(tenantId, startDate, endDate);
      const arAgingAnalysis = await generateARAgingAnalysis(tenantId);
      const recommendations = generateRecommendations(financialHighlights, keyMetrics, riskAssessment);
      
      const { data, error } = await supabase
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
      
      const { data, error } = await supabase
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
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { error } = await supabase
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

  // Current period invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount, status, issue_date')
    .eq('tenant_id', tenantId)
    .gte('issue_date', startDate.toISOString())
    .lte('issue_date', endDate.toISOString());

  // Previous period invoices
  const { data: prevInvoices } = await supabase
    .from('invoices')
    .select('total_amount, status')
    .eq('tenant_id', tenantId)
    .gte('issue_date', prevStartDate.toISOString())
    .lte('issue_date', prevEndDate.toISOString());

  // Current period expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category, expense_date')
    .eq('tenant_id', tenantId)
    .gte('expense_date', startDate.toISOString())
    .lte('expense_date', endDate.toISOString());

  // Previous period expenses
  const { data: prevExpenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('tenant_id', tenantId)
    .gte('expense_date', prevStartDate.toISOString())
    .lte('expense_date', prevEndDate.toISOString());

  // Bank accounts
  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('current_balance')
    .eq('tenant_id', tenantId);

  // Bank transactions for cash flow
  const { data: transactions } = await supabase
    .from('bank_transactions')
    .select('amount, transaction_type, transaction_date')
    .eq('tenant_id', tenantId)
    .gte('transaction_date', startDate.toISOString())
    .lte('transaction_date', endDate.toISOString());

  const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  const collectedRevenue = invoices?.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  const uncollectedRevenue = totalRevenue - collectedRevenue;
  
  const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
  const cogs = expenses?.filter(exp => exp.category === 'cogs').reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
  const opex = totalExpenses - cogs;
  
  const cashBalance = bankAccounts?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0;
  const cashInflows = transactions?.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
  const cashOutflows = transactions?.filter(t => t.transaction_type === 'debit').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

  const prevRevenue = prevInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  const prevTotalExpenses = prevExpenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
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
  tenantId: string,
  startDate?: Date,
  endDate?: Date
): Promise<KeyMetric> {
  // Fetch all data in parallel
  const [kpiCacheRes, invoicesRes, customersRes, billsRes, bankAccountsRes] = await Promise.all([
    supabase
      .from('dashboard_kpi_cache')
      .select('*')
      .eq('tenant_id', tenantId)
      .single(),
    (() => {
      let query = supabase
        .from('invoices')
        .select('id, total_amount, status, due_date, customer_id, customers(name)')
        .eq('tenant_id', tenantId);
      
      if (startDate && endDate) {
        query = query
          .gte('issue_date', startDate.toISOString())
          .lte('issue_date', endDate.toISOString());
      }
      return query;
    })(),
    supabase
      .from('customers')
      .select('id, name')
      .eq('tenant_id', tenantId),
    supabase
      .from('bills')
      .select('id, total_amount, paid_amount, bill_date, due_date, status')
      .eq('tenant_id', tenantId)
      .not('status', 'eq', 'cancelled'),
    supabase
      .from('bank_accounts')
      .select('current_balance')
      .eq('tenant_id', tenantId),
  ]);

  const kpiCache = kpiCacheRes.data;
  const invoices = invoicesRes.data;
  const customers = customersRes.data;
  const bills = billsRes.data;
  const bankAccounts = bankAccountsRes.data;

  const now = new Date();
  const invoiceCount = invoices?.length || 0;
  const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];
  const overdueInvoices = invoices?.filter(inv => 
    inv.status !== 'paid' && inv.due_date && new Date(inv.due_date) < now
  ) || [];

  // Use unpaid invoices for AR (consistent with central metrics)
  const unpaidInvoices = invoices?.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled') || [];
  const totalAR = unpaidInvoices.reduce((sum, inv) => sum + ((inv.total_amount || 0) - 0), 0);
  const avgInvoiceValue = invoiceCount > 0 ? (invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0) / invoiceCount : 0;

  // Use unpaid bills for AP (consistent with central metrics)
  const unpaidBills = bills?.filter(b => b.status !== 'paid') || [];
  const totalAP = unpaidBills.reduce((sum, b) => sum + ((b.total_amount || 0) - (b.paid_amount || 0)), 0);

  // Calculate ratios
  const cashBalance = bankAccounts?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0;
  const currentAssets = cashBalance + totalAR;
  const currentLiabilities = totalAP || 1; // Avoid division by zero
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  const quickRatio = currentLiabilities > 0 ? cashBalance / currentLiabilities : 0;

  // Calculate top customers
  const customerRevenue: Record<string, { name: string; amount: number }> = {};
  invoices?.forEach(inv => {
    const customerId = inv.customer_id;
    const customerName = (inv.customers as { name: string })?.name || 'Unknown';
    if (customerId) {
      if (!customerRevenue[customerId]) {
        customerRevenue[customerId] = { name: customerName, amount: 0 };
      }
      customerRevenue[customerId].amount += inv.total_amount || 0;
    }
  });

  const totalCustomerRevenue = Object.values(customerRevenue).reduce((sum, c) => sum + c.amount, 0);
  const topCustomers = Object.values(customerRevenue)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      amount: c.amount,
      percentage: totalCustomerRevenue > 0 ? (c.amount / totalCustomerRevenue) * 100 : 0,
    }));

  // Use kpiCache for DSO/CCC - these come from the cached central calculations
  // DPO and DIO are not in cache, so we calculate them here or default to 0
  // For accurate real-time values, use useCentralFinancialMetrics directly in components
  return {
    dso: kpiCache?.dso || 0,
    dpo: 0, // Not available in cache - use useCentralFinancialMetrics for real-time value
    dio: 0, // Not available in cache - use useCentralFinancialMetrics for real-time value
    ccc: kpiCache?.ccc || 0,
    current_ratio: Number(currentRatio.toFixed(2)),
    quick_ratio: Number(quickRatio.toFixed(2)),
    debt_ratio: totalAP > 0 && currentAssets > 0 ? Number((totalAP / currentAssets).toFixed(2)) : 0,
    total_ar: totalAR,
    overdue_ar: kpiCache?.overdue_ar || 0,
    collection_rate: totalAR > 0 ? ((totalAR - (kpiCache?.overdue_ar || 0)) / totalAR) * 100 : 100,
    ar_turnover: totalAR > 0 ? (kpiCache?.total_revenue || 0) / totalAR : 0,
    invoice_count: invoiceCount,
    paid_invoice_count: paidInvoices.length,
    overdue_invoice_count: overdueInvoices.length,
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

  // DSO risk
  if (metrics.dso > 60) {
    risks.push({
      id: crypto.randomUUID(),
      category: 'operational',
      title: 'DSO cao - Chu kỳ thu tiền dài',
      description: `DSO hiện tại là ${metrics.dso} ngày, cao hơn benchmark 45 ngày`,
      severity: 'medium',
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

  // Margin compression
  if (financials.gross_margin < 20) {
    risks.push({
      id: crypto.randomUUID(),
      category: 'operational',
      title: 'Biên lợi nhuận gộp thấp',
      description: `Biên LN gộp ${financials.gross_margin.toFixed(1)}% thấp hơn mục tiêu 25%`,
      severity: 'medium',
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

async function generateStrategicInitiatives(
  tenantId: string
): Promise<{ initiatives: StrategicInitiative[]; summary: string }> {
  // Lấy sáng kiến chiến lược từ database thay vì tự động sinh
  const { data: dbInitiatives, error } = await supabase
    .from('strategic_initiatives')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching strategic initiatives:', error);
    return { 
      initiatives: [], 
      summary: 'Lỗi khi tải dữ liệu sáng kiến chiến lược.' 
    };
  }

  const initiatives: StrategicInitiative[] = (dbInitiatives || []).map(item => ({
    id: item.id,
    title: item.title,
    description: item.description || '',
    category: item.category as 'growth' | 'efficiency' | 'innovation' | 'risk_management' | 'cost_optimization' | 'digital_transformation' | 'market_expansion' | 'other',
    priority: item.priority as 'low' | 'medium' | 'high' | 'critical',
    status: item.status as 'planned' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled',
    progress: item.progress || 0,
    budget: item.budget || 0,
    spent: item.spent || 0,
    start_date: item.start_date,
    end_date: item.end_date,
    kpis: item.kpis || [],
    milestones: (item.milestones as Array<{ title: string; date: string; completed: boolean }>) || [],
  }));

  let summary: string;
  if (initiatives.length === 0) {
    summary = `Chưa có sáng kiến chiến lược nào được nhập. Vui lòng thêm sáng kiến chiến lược trong phần quản lý sáng kiến để hiển thị trong báo cáo.`;
  } else {
    const inProgress = initiatives.filter(i => i.status === 'in_progress').length;
    const totalBudget = initiatives.reduce((sum, i) => sum + i.budget, 0);
    const totalSpent = initiatives.reduce((sum, i) => sum + i.spent, 0);
    summary = `Có ${initiatives.length} sáng kiến chiến lược (${inProgress} đang thực hiện). Tổng ngân sách: ${totalBudget.toLocaleString('vi-VN')} VND, đã chi: ${totalSpent.toLocaleString('vi-VN')} VND.`;
  }

  return { initiatives, summary };
}

async function generateCashFlowAnalysis(
  tenantId: string,
  customStartDate?: Date,
  customEndDate?: Date
): Promise<CashFlowAnalysis> {
  const now = customEndDate || new Date();
  const monthlyTrend: Array<{ month: string; inflow: number; outflow: number; net: number }> = [];

  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));

    const { data: transactions } = await supabase
      .from('bank_transactions')
      .select('amount, transaction_type')
      .eq('tenant_id', tenantId)
      .gte('transaction_date', monthStart.toISOString())
      .lte('transaction_date', monthEnd.toISOString());

    const inflow = transactions?.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
    const outflow = transactions?.filter(t => t.transaction_type === 'debit').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

    monthlyTrend.push({
      month: monthStart.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
      inflow,
      outflow,
      net: inflow - outflow,
    });
  }

  const recentInflow = monthlyTrend.slice(-3).reduce((sum, m) => sum + m.inflow, 0) / 3;
  const recentOutflow = monthlyTrend.slice(-3).reduce((sum, m) => sum + m.outflow, 0) / 3;
  const burnRate = recentOutflow - recentInflow;

  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('current_balance')
    .eq('tenant_id', tenantId);

  const cashBalance = bankAccounts?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0;
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

async function generateARAgingAnalysis(tenantId: string): Promise<ARAgingAnalysis> {
  const now = new Date();
  
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, total_amount, due_date, status')
    .eq('tenant_id', tenantId)
    .neq('status', 'paid');

  const buckets = {
    current: { amount: 0, count: 0 },
    days_1_30: { amount: 0, count: 0 },
    days_31_60: { amount: 0, count: 0 },
    days_61_90: { amount: 0, count: 0 },
    over_90: { amount: 0, count: 0 },
  };

  invoices?.forEach(inv => {
    if (!inv.due_date) return;
    const daysOverdue = differenceInDays(now, new Date(inv.due_date));
    const amount = inv.total_amount || 0;

    if (daysOverdue <= 0) {
      buckets.current.amount += amount;
      buckets.current.count++;
    } else if (daysOverdue <= 30) {
      buckets.days_1_30.amount += amount;
      buckets.days_1_30.count++;
    } else if (daysOverdue <= 60) {
      buckets.days_31_60.amount += amount;
      buckets.days_31_60.count++;
    } else if (daysOverdue <= 90) {
      buckets.days_61_90.amount += amount;
      buckets.days_61_90.count++;
    } else {
      buckets.over_90.amount += amount;
      buckets.over_90.count++;
    }
  });

  const total = Object.values(buckets).reduce((sum, b) => sum + b.amount, 0);

  return {
    current: buckets.current.amount,
    days_1_30: buckets.days_1_30.amount,
    days_31_60: buckets.days_31_60.amount,
    days_61_90: buckets.days_61_90.amount,
    over_90: buckets.over_90.amount,
    total,
    aging_distribution: [
      { bucket: 'Chưa đến hạn', amount: buckets.current.amount, percentage: total > 0 ? (buckets.current.amount / total) * 100 : 0, count: buckets.current.count },
      { bucket: '1-30 ngày', amount: buckets.days_1_30.amount, percentage: total > 0 ? (buckets.days_1_30.amount / total) * 100 : 0, count: buckets.days_1_30.count },
      { bucket: '31-60 ngày', amount: buckets.days_31_60.amount, percentage: total > 0 ? (buckets.days_31_60.amount / total) * 100 : 0, count: buckets.days_31_60.count },
      { bucket: '61-90 ngày', amount: buckets.days_61_90.amount, percentage: total > 0 ? (buckets.days_61_90.amount / total) * 100 : 0, count: buckets.days_61_90.count },
      { bucket: 'Trên 90 ngày', amount: buckets.over_90.amount, percentage: total > 0 ? (buckets.over_90.amount / total) * 100 : 0, count: buckets.over_90.count },
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
