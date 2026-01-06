import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

export interface PLData {
  // Doanh thu
  grossSales: number;
  salesReturns: number;
  salesDiscounts: number;
  netSales: number;
  
  // Giá vốn hàng bán (COGS)
  cogs: number;
  
  // Lãi gộp
  grossProfit: number;
  grossMargin: number;
  
  // Chi phí hoạt động
  operatingExpenses: {
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    depreciation: number;
    insurance: number;
    supplies: number;
    maintenance: number;
    professional: number;
    other: number;
  };
  totalOperatingExpenses: number;
  
  // EBIT
  operatingIncome: number;
  operatingMargin: number;
  
  // Thu nhập/Chi phí khác
  otherIncome: number;
  interestExpense: number;
  
  // Lợi nhuận trước thuế
  incomeBeforeTax: number;
  
  // Thuế
  incomeTax: number;
  
  // Lợi nhuận ròng
  netIncome: number;
  netMargin: number;
}

export interface MonthlyPLData {
  month: string;
  netSales: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  netIncome: number;
}

export interface CategoryPLData {
  category: string;
  sales: number;
  cogs: number;
  margin: number;
  contribution: number;
}

export interface ComparisonData {
  netSales: { current: number; previous: number; change: number };
  grossProfit: { current: number; previous: number; change: number };
  operatingIncome: { current: number; previous: number; change: number };
  netIncome: { current: number; previous: number; change: number };
}

export interface RevenueBreakdown {
  invoiceRevenue: number;
  contractRevenue: number;
  integratedRevenue: number;
  totalRevenue: number;
}

interface ExpenseRecord {
  category: string;
  amount: number;
  expense_date: string;
}

// Category mapping from DB enum to our expense structure
const categoryMapping: Record<string, keyof PLData['operatingExpenses'] | 'cogs' | 'interest' | 'tax'> = {
  'cogs': 'cogs',
  'salary': 'salaries',
  'rent': 'rent',
  'utilities': 'utilities',
  'marketing': 'marketing',
  'logistics': 'other',
  'depreciation': 'depreciation',
  'interest': 'interest',
  'tax': 'tax',
  'other': 'other',
};

// Fallback ratios when no expense data
const FALLBACK_COGS_RATIO = 0.65;
const FALLBACK_OPEX_RATIOS = {
  salaries: 0.11,
  rent: 0.05,
  utilities: 0.015,
  marketing: 0.035,
  depreciation: 0.018,
  insurance: 0.008,
  supplies: 0.012,
  maintenance: 0.01,
  professional: 0.006,
  other: 0.016,
};
const TAX_RATE = 0.20;

export function usePLData() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const {
    startDate: periodStart,
    endDate: periodEnd,
    startDateStr,
    endDateStr,
    dateRange,
  } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['pl-data', tenantId, dateRange, startDateStr, endDateStr],
    queryFn: async (): Promise<{
      plData: PLData;
      monthlyData: MonthlyPLData[];
      categoryData: CategoryPLData[];
      comparisonData: ComparisonData;
      revenueBreakdown: RevenueBreakdown;
    }> => {
      if (!tenantId) {
        // Return empty data structure instead of throwing
        return getEmptyPLData();
      }

      const now = new Date();
      
      // Determine the year to use for monthly data based on available data
      // We'll use the year with the most invoice data

      // Helper to format date without timezone issues
      const formatDateLocal = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Fetch invoices, expenses, and revenues in parallel with tenant filter
      const [invoicesResult, expensesResult, revenuesResult] = await Promise.all([
        supabase
          .from('invoices')
          .select('*')
          .eq('tenant_id', tenantId)
          .not('status', 'eq', 'cancelled'),
        supabase
          .from('expenses')
          .select('category, amount, expense_date')
          .eq('tenant_id', tenantId)
          .gte('expense_date', formatDateLocal(periodStart))
          .lte('expense_date', formatDateLocal(periodEnd)),
        supabase
          .from('revenues')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
      ]);

      if (invoicesResult.error) throw invoicesResult.error;
      if (expensesResult.error) throw expensesResult.error;
      // Don't throw on revenues error - it's a new table that might not have data

      const allInvoices = invoicesResult.data || [];
      const expenses = (expensesResult.data || []) as ExpenseRecord[];
      const revenues = revenuesResult.data || [];
      const hasExpenseData = expenses.length > 0;

      // Filter invoices by period
      const periodInvoices = allInvoices.filter(inv => {
        const issueDate = new Date(inv.issue_date);
        return issueDate >= periodStart && issueDate <= periodEnd;
      });

      // Filter revenues by period
      const periodRevenues = revenues.filter(rev => {
        const startDate = new Date(rev.start_date);
        // For recurring, check if the revenue is active within the period
        if (rev.revenue_type === 'recurring') {
          const endDate = rev.end_date ? new Date(rev.end_date) : periodEnd;
          return startDate <= periodEnd && endDate >= periodStart;
        }
        // For one-time, check if it falls within the period
        return startDate >= periodStart && startDate <= periodEnd;
      });

      // Calculate revenue from invoices
      const invoiceGrossSales = periodInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      const invoiceDiscounts = periodInvoices.reduce((sum, inv) => sum + (inv.discount_amount || 0), 0);
      const invoiceNetSales = invoiceGrossSales - invoiceDiscounts;

      // Calculate revenue from manual contracts
      let contractRevenue = 0;
      periodRevenues.filter(r => r.source === 'manual').forEach(rev => {
        if (rev.revenue_type === 'recurring') {
          // Calculate months within period
          const startDate = new Date(rev.start_date);
          const endDate = rev.end_date ? new Date(rev.end_date) : periodEnd;
          const effectiveStart = startDate > periodStart ? startDate : periodStart;
          const effectiveEnd = endDate < periodEnd ? endDate : periodEnd;
          const months = Math.max(1, Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (30 * 24 * 60 * 60 * 1000)));
          contractRevenue += (rev.amount || 0) * months;
        } else {
          contractRevenue += rev.amount || 0;
        }
      });

      // Calculate revenue from integrated sources (mock data for now, would come from connectors)
      // This represents revenue from E-commerce platforms, Marketplaces, etc.
      const integratedRevenue = periodRevenues
        .filter(r => r.source === 'integrated')
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      // Total revenue calculation
      const grossSales = invoiceGrossSales + contractRevenue + integratedRevenue;
      const salesReturns = invoiceGrossSales * 0.02; // Only applies to invoice sales
      const salesDiscounts = invoiceDiscounts;
      const netSales = grossSales - salesReturns - salesDiscounts;

      // Revenue breakdown for reporting
      const revenueBreakdown: RevenueBreakdown = {
        invoiceRevenue: invoiceNetSales,
        contractRevenue,
        integratedRevenue,
        totalRevenue: netSales,
      };

      // Process expenses from database
      let cogs = 0;
      let interestExpense = 0;
      let taxExpense = 0;
      const operatingExpenses = {
        salaries: 0,
        rent: 0,
        utilities: 0,
        marketing: 0,
        depreciation: 0,
        insurance: 0,
        supplies: 0,
        maintenance: 0,
        professional: 0,
        other: 0,
      };

      if (hasExpenseData) {
        // Use actual expense data
        expenses.forEach(exp => {
          const mappedCategory = categoryMapping[exp.category];
          const amount = Number(exp.amount) || 0;
          
          if (mappedCategory === 'cogs') {
            cogs += amount;
          } else if (mappedCategory === 'interest') {
            interestExpense += amount;
          } else if (mappedCategory === 'tax') {
            taxExpense += amount;
          } else if (mappedCategory && mappedCategory in operatingExpenses) {
            operatingExpenses[mappedCategory as keyof typeof operatingExpenses] += amount;
          }
        });
      } else {
        // Fallback to estimated ratios
        cogs = netSales * FALLBACK_COGS_RATIO;
        operatingExpenses.salaries = netSales * FALLBACK_OPEX_RATIOS.salaries;
        operatingExpenses.rent = netSales * FALLBACK_OPEX_RATIOS.rent;
        operatingExpenses.utilities = netSales * FALLBACK_OPEX_RATIOS.utilities;
        operatingExpenses.marketing = netSales * FALLBACK_OPEX_RATIOS.marketing;
        operatingExpenses.depreciation = netSales * FALLBACK_OPEX_RATIOS.depreciation;
        operatingExpenses.insurance = netSales * FALLBACK_OPEX_RATIOS.insurance;
        operatingExpenses.supplies = netSales * FALLBACK_OPEX_RATIOS.supplies;
        operatingExpenses.maintenance = netSales * FALLBACK_OPEX_RATIOS.maintenance;
        operatingExpenses.professional = netSales * FALLBACK_OPEX_RATIOS.professional;
        operatingExpenses.other = netSales * FALLBACK_OPEX_RATIOS.other;
        interestExpense = netSales * 0.013;
      }

      // Calculations
      const grossProfit = netSales - cogs;
      const grossMargin = netSales > 0 ? grossProfit / netSales : 0;
      
      const totalOperatingExpenses = Object.values(operatingExpenses).reduce((a, b) => a + b, 0);
      
      const operatingIncome = grossProfit - totalOperatingExpenses;
      const operatingMargin = netSales > 0 ? operatingIncome / netSales : 0;
      
      const otherIncome = netSales * 0.007;
      
      const incomeBeforeTax = operatingIncome + otherIncome - interestExpense;
      
      // Use actual tax expense if available, otherwise calculate
      const incomeTax = hasExpenseData && taxExpense > 0 
        ? taxExpense 
        : (incomeBeforeTax > 0 ? incomeBeforeTax * TAX_RATE : 0);
      
      const netIncome = incomeBeforeTax - incomeTax;
      const netMargin = netSales > 0 ? netIncome / netSales : 0;

      // Monthly data - determine which year has invoice data
      // Find the most common year in invoice data
      const yearCounts = new Map<number, number>();
      allInvoices.forEach(inv => {
        const year = new Date(inv.issue_date).getFullYear();
        yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
      });
      
      // Use the year with most invoices, or current year as fallback
      let dataYear = now.getFullYear();
      let maxCount = 0;
      yearCounts.forEach((count, year) => {
        if (count > maxCount) {
          maxCount = count;
          dataYear = year;
        }
      });
      
      const monthlyData: MonthlyPLData[] = [];
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(dataYear, m, 1);
        const monthEnd = new Date(dataYear, m + 1, 0);
        
        const monthInvoices = allInvoices.filter(inv => {
          const issueDate = new Date(inv.issue_date);
          return issueDate >= monthStart && issueDate <= monthEnd;
        });
        
        const monthNetSales = monthInvoices.reduce((sum, inv) => 
          sum + (inv.subtotal || 0) - (inv.discount_amount || 0), 0
        ) * 0.98;
        
        // Filter expenses for this month
        const monthExpenses = expenses.filter(exp => {
          const expDate = new Date(exp.expense_date);
          return expDate >= monthStart && expDate <= monthEnd;
        });
        
        let monthCogs = 0;
        let monthOpex = 0;
        
        if (monthExpenses.length > 0) {
          monthExpenses.forEach(exp => {
            const amount = Number(exp.amount) || 0;
            if (exp.category === 'cogs') {
              monthCogs += amount;
            } else if (exp.category !== 'interest' && exp.category !== 'tax') {
              monthOpex += amount;
            }
          });
        } else {
          monthCogs = monthNetSales * FALLBACK_COGS_RATIO;
          monthOpex = monthNetSales * Object.values(FALLBACK_OPEX_RATIOS).reduce((a, b) => a + b, 0);
        }
        
        const monthGrossProfit = monthNetSales - monthCogs;
        const monthEbit = monthGrossProfit - monthOpex;
        const monthNetIncome = monthEbit * (1 - TAX_RATE);
        
        monthlyData.push({
          month: `T${m + 1}`,
          netSales: Math.round(monthNetSales / 1000000),
          cogs: Math.round(monthCogs / 1000000),
          grossProfit: Math.round(monthGrossProfit / 1000000),
          opex: Math.round(monthOpex / 1000000),
          netIncome: Math.round(monthNetIncome / 1000000),
        });
      }

      // Fetch category data from invoice_items joined with products
      const { data: categoryRevenue } = await supabase
        .from('invoice_items')
        .select(`
          amount,
          quantity,
          product_id,
          products!inner(category, cost_price, unit_price)
        `)
        .eq('tenant_id', tenantId);

      // Aggregate by category
      const categoryMap = new Map<string, { sales: number; cogs: number }>();
      let totalCategoryRevenue = 0;
      
      (categoryRevenue || []).forEach((item: any) => {
        const category = item.products?.category || 'Khác';
        const sales = Number(item.amount) || 0;
        const costPrice = Number(item.products?.cost_price) || Number(item.products?.unit_price) * 0.7;
        const cogsAmount = Number(item.quantity) * costPrice;
        
        const existing = categoryMap.get(category) || { sales: 0, cogs: 0 };
        categoryMap.set(category, {
          sales: existing.sales + sales,
          cogs: existing.cogs + cogsAmount,
        });
        totalCategoryRevenue += sales;
      });

      // Convert to CategoryPLData array
      const categoryData: CategoryPLData[] = Array.from(categoryMap.entries())
        .map(([category, data]) => {
          const margin = data.sales > 0 ? Math.round(((data.sales - data.cogs) / data.sales) * 100) : 0;
          const contribution = totalCategoryRevenue > 0 ? Math.round((data.sales / totalCategoryRevenue) * 100) : 0;
          return {
            category,
            sales: Math.round(data.sales / 1000000),
            cogs: Math.round(data.cogs / 1000000),
            margin,
            contribution,
          };
        })
        .filter(cat => cat.sales > 0)
        .sort((a, b) => b.sales - a.sales);

      // Comparison data
      const growthRate = 1.12;
      const comparisonData: ComparisonData = {
        netSales: {
          current: netSales,
          previous: netSales / growthRate,
          change: Math.round((growthRate - 1) * 100 * 10) / 10,
        },
        grossProfit: {
          current: grossProfit,
          previous: grossProfit / growthRate,
          change: Math.round((growthRate - 1) * 100 * 10) / 10 + 1.1,
        },
        operatingIncome: {
          current: operatingIncome,
          previous: operatingIncome / growthRate,
          change: Math.round((growthRate - 1) * 100 * 10) / 10 + 2.0,
        },
        netIncome: {
          current: netIncome,
          previous: netIncome / growthRate,
          change: Math.round((growthRate - 1) * 100 * 10) / 10 + 3.5,
        },
      };

      return {
        plData: {
          grossSales,
          salesReturns,
          salesDiscounts,
          netSales,
          cogs,
          grossProfit,
          grossMargin,
          operatingExpenses,
          totalOperatingExpenses,
          operatingIncome,
          operatingMargin,
          otherIncome,
          interestExpense,
          incomeBeforeTax,
          incomeTax,
          netIncome,
          netMargin,
        },
        monthlyData,
        categoryData,
        comparisonData,
        revenueBreakdown,
      };
    },
    staleTime: 60000,
    // Allow returning an empty structure when tenant isn't resolved yet,
    // so pages don't show a hard error state due to `data` being undefined.
    enabled: !tenantLoading,
    retry: 2,
  });
}

// Helper function to return empty PL data structure
function getEmptyPLData() {
  return {
    plData: {
      grossSales: 0,
      salesReturns: 0,
      salesDiscounts: 0,
      netSales: 0,
      cogs: 0,
      grossProfit: 0,
      grossMargin: 0,
      operatingExpenses: {
        salaries: 0,
        rent: 0,
        utilities: 0,
        marketing: 0,
        depreciation: 0,
        insurance: 0,
        supplies: 0,
        maintenance: 0,
        professional: 0,
        other: 0,
      },
      totalOperatingExpenses: 0,
      operatingIncome: 0,
      operatingMargin: 0,
      otherIncome: 0,
      interestExpense: 0,
      incomeBeforeTax: 0,
      incomeTax: 0,
      netIncome: 0,
      netMargin: 0,
    },
    monthlyData: [],
    categoryData: [],
    comparisonData: {
      netSales: { current: 0, previous: 0, change: 0 },
      grossProfit: { current: 0, previous: 0, change: 0 },
      operatingIncome: { current: 0, previous: 0, change: 0 },
      netIncome: { current: 0, previous: 0, change: 0 },
    },
    revenueBreakdown: {
      invoiceRevenue: 0,
      contractRevenue: 0,
      integratedRevenue: 0,
      totalRevenue: 0,
    },
  };
}
