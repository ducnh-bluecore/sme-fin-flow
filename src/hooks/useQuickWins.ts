import { useMemo } from 'react';
import { useInvoices } from './useInvoiceData';
import { useDashboardKPICache } from './useDashboardCache';
import { useChannelAnalyticsCache } from './useChannelAnalyticsCache';

export interface QuickWin {
  id: string;
  title: string;
  description: string;
  savings: number;
  effort: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'done';
  category: 'ar' | 'inventory' | 'fees' | 'cost' | 'revenue';
  actionable: boolean;
  details?: {
    count?: number;
    avgDays?: number;
    topItems?: string[];
  };
}

export function useQuickWins() {
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: kpiData, isLoading: kpiLoading } = useDashboardKPICache();
  const { cacheData: channelData, isLoading: channelLoading } = useChannelAnalyticsCache();

  const quickWins = useMemo(() => {
    const wins: QuickWin[] = [];

    // 1. AR Recovery - Overdue invoices > 60 days
    if (invoices && invoices.length > 0) {
      const today = new Date();
      const overdueInvoices = invoices.filter(inv => {
        if (inv.status === 'paid' || inv.status === 'closed') return false;
        const dueDate = new Date(inv.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysOverdue > 60;
      });

      const overdue60Amount = overdueInvoices.reduce((sum, inv) => {
        const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
        return sum + remaining;
      }, 0);

      if (overdue60Amount > 0) {
        // Estimate 60% recovery rate
        const estimatedRecovery = overdue60Amount * 0.6;
        wins.push({
          id: 'ar-overdue-60',
          title: 'Thu hồi AR quá hạn > 60 ngày',
          description: `${overdueInvoices.length} hóa đơn cần theo dõi`,
          savings: estimatedRecovery,
          effort: 'low',
          status: overdueInvoices.length > 5 ? 'pending' : 'in-progress',
          category: 'ar',
          actionable: true,
          details: {
            count: overdueInvoices.length,
            avgDays: overdueInvoices.length > 0 
              ? Math.round(overdueInvoices.reduce((sum, inv) => {
                  const dueDate = new Date(inv.due_date);
                  return sum + Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                }, 0) / overdueInvoices.length)
              : 0,
          }
        });
      }

      // 2. AR Recovery - Overdue 30-60 days
      const overdue30to60 = invoices.filter(inv => {
        if (inv.status === 'paid' || inv.status === 'closed') return false;
        const dueDate = new Date(inv.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysOverdue > 30 && daysOverdue <= 60;
      });

      const overdue30to60Amount = overdue30to60.reduce((sum, inv) => {
        const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
        return sum + remaining;
      }, 0);

      if (overdue30to60Amount > 0) {
        // Estimate 80% recovery rate for newer overdue
        const estimatedRecovery = overdue30to60Amount * 0.8;
        wins.push({
          id: 'ar-overdue-30-60',
          title: 'Thu hồi AR quá hạn 30-60 ngày',
          description: `${overdue30to60.length} hóa đơn cần nhắc nhở`,
          savings: estimatedRecovery,
          effort: 'low',
          status: 'pending',
          category: 'ar',
          actionable: true,
          details: {
            count: overdue30to60.length,
          }
        });
      }
    }

    // 3. Channel Fees Optimization
    if (channelData && channelData.total_fees > 0 && channelData.gross_revenue > 0) {
      const feeRate = channelData.total_fees / channelData.gross_revenue;
      // If fee rate > 15%, suggest negotiation
      if (feeRate > 0.15) {
        // Estimate 2% reduction possible through negotiation
        const potentialSavings = channelData.total_fees * 0.15;
        wins.push({
          id: 'channel-fee-negotiation',
          title: 'Đàm phán giảm phí sàn TMĐT',
          description: `Phí hiện tại ${(feeRate * 100).toFixed(1)}% - cao hơn benchmark`,
          savings: potentialSavings,
          effort: 'medium',
          status: 'pending',
          category: 'fees',
          actionable: true,
          details: {
            topItems: Object.keys(channelData.fee_breakdown || {}).slice(0, 3),
          }
        });
      }
    }

    // 4. DSO Improvement
    if (kpiData && kpiData.dso > 45) {
      // Each day of DSO reduction = revenue / 365 * days
      const dailyRevenue = (kpiData.totalAR || 0) / (kpiData.dso || 45);
      const targetDSOReduction = Math.min(10, kpiData.dso - 45);
      const cashFlowImprovement = dailyRevenue * targetDSOReduction;

      if (cashFlowImprovement > 0) {
        wins.push({
          id: 'dso-improvement',
          title: 'Cải thiện DSO xuống 45 ngày',
          description: `Hiện tại: ${kpiData.dso} ngày - Mục tiêu: 45 ngày`,
          savings: cashFlowImprovement,
          effort: 'medium',
          status: 'pending',
          category: 'ar',
          actionable: true,
          details: {
            avgDays: kpiData.dso,
          }
        });
      }
    }

    // 5. High Concentration Risk - Diversification
    if (invoices && invoices.length > 0) {
      // Group by customer
      const customerTotals: Record<string, number> = {};
      invoices.forEach(inv => {
        const customerName = inv.customers?.name || 'Unknown';
        customerTotals[customerName] = (customerTotals[customerName] || 0) + (inv.total_amount || 0);
      });

      const totalAR = Object.values(customerTotals).reduce((sum, val) => sum + val, 0);
      const sortedCustomers = Object.entries(customerTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      const top3Concentration = sortedCustomers.reduce((sum, [, val]) => sum + val, 0) / totalAR;

      if (top3Concentration > 0.4 && totalAR > 0) {
        wins.push({
          id: 'customer-diversification',
          title: 'Đa dạng hóa khách hàng',
          description: `Top 3 KH chiếm ${(top3Concentration * 100).toFixed(0)}% doanh thu`,
          savings: 0, // This is risk mitigation, not direct savings
          effort: 'high',
          status: 'pending',
          category: 'revenue',
          actionable: false,
          details: {
            topItems: sortedCustomers.map(([name]) => name),
          }
        });
      }
    }

    // Sort by savings (highest first), filter out zero savings
    return wins
      .filter(w => w.savings > 0 || w.category === 'revenue')
      .sort((a, b) => b.savings - a.savings);
  }, [invoices, kpiData, channelData]);

  const totalPotentialSavings = useMemo(() => {
    return quickWins.reduce((sum, w) => sum + w.savings, 0);
  }, [quickWins]);

  return {
    quickWins,
    totalPotentialSavings,
    isLoading: invoicesLoading || kpiLoading || channelLoading,
  };
}
