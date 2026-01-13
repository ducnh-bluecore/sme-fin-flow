import { useMemo } from 'react';
import { useDashboardKPICache } from './useDashboardCache';
import { useCashRunway } from './useCashRunway';
import { useARAgingData } from './useDashboardData';
import { useChannelAnalyticsCache } from './useChannelAnalyticsCache';
import { useCentralFinancialMetrics } from './useCentralFinancialMetrics';
import { FDP_THRESHOLDS } from '@/lib/fdp-formulas';

export interface RiskAlert {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  metric: string;
  category: 'liquidity' | 'receivables' | 'profitability' | 'concentration' | 'efficiency';
}

export function useRiskAlerts() {
  const { data: kpiData, isLoading: kpiLoading } = useDashboardKPICache();
  const { data: runwayData, isLoading: runwayLoading } = useCashRunway();
  const { data: arAgingData, isLoading: arLoading } = useARAgingData();
  const { data: channelData, isLoading: channelLoading } = useChannelAnalyticsCache();
  const { data: centralMetrics, isLoading: metricsLoading } = useCentralFinancialMetrics();

  const riskAlerts = useMemo(() => {
    const alerts: RiskAlert[] = [];

    // 1. Cash Runway Risk - using FDP_THRESHOLDS
    const runwayMonths = runwayData?.runwayMonths || 0;
    if (runwayMonths > 0 && runwayMonths < FDP_THRESHOLDS.RUNWAY_CRITICAL_MONTHS) {
      alerts.push({
        id: 'runway-critical',
        title: 'Cash Runway nguy cấp',
        severity: 'critical',
        description: `Chỉ còn ${runwayMonths.toFixed(1)} tháng hoạt động. Cần hành động khẩn cấp.`,
        metric: `Runway: ${runwayMonths.toFixed(1)} tháng`,
        category: 'liquidity',
      });
    } else if (runwayMonths > 0 && runwayMonths < FDP_THRESHOLDS.RUNWAY_WARNING_MONTHS) {
      alerts.push({
        id: 'runway-warning',
        title: 'Cash Runway thấp',
        severity: 'warning',
        description: `Dự kiến hết tiền trong ${runwayMonths.toFixed(1)} tháng nếu không có biện pháp.`,
        metric: `Runway: ${runwayMonths.toFixed(1)} tháng`,
        category: 'liquidity',
      });
    }

    // 2. DSO Risk - use centralized metrics (single source of truth)
    const dso = centralMetrics?.dso ?? kpiData?.dso ?? 0;
    if (dso > FDP_THRESHOLDS.DSO_CRITICAL_DAYS) {
      alerts.push({
        id: 'dso-critical',
        title: 'DSO quá cao',
        severity: 'critical',
        description: `Thu tiền trung bình ${dso} ngày, ảnh hưởng nghiêm trọng đến dòng tiền.`,
        metric: `DSO: ${dso} ngày`,
        category: 'receivables',
      });
    } else if (dso > FDP_THRESHOLDS.DSO_WARNING_DAYS) {
      alerts.push({
        id: 'dso-warning',
        title: 'DSO cao',
        severity: 'warning',
        description: `DSO ${dso} ngày cao hơn mức khuyến nghị (${FDP_THRESHOLDS.DSO_WARNING_DAYS} ngày).`,
        metric: `DSO: ${dso} ngày`,
        category: 'receivables',
      });
    }

    // 3. Overdue AR Risk - using FDP_THRESHOLDS
    const overdueAR = kpiData?.overdueAR || 0;
    const totalAR = kpiData?.totalAR || 0;
    const overdueRate = totalAR > 0 ? (overdueAR / totalAR) * 100 : 0;
    
    if (overdueRate > FDP_THRESHOLDS.AR_OVERDUE_CRITICAL_PERCENT) {
      alerts.push({
        id: 'overdue-critical',
        title: 'Công nợ quá hạn nghiêm trọng',
        severity: 'critical',
        description: `${overdueRate.toFixed(0)}% công nợ đang quá hạn, cần thu hồi khẩn cấp.`,
        metric: `Quá hạn: ${overdueRate.toFixed(0)}%`,
        category: 'receivables',
      });
    } else if (overdueRate > FDP_THRESHOLDS.AR_OVERDUE_WARNING_PERCENT) {
      alerts.push({
        id: 'overdue-warning',
        title: 'Công nợ quá hạn cao',
        severity: 'warning',
        description: `${overdueRate.toFixed(0)}% công nợ đang quá hạn thanh toán.`,
        metric: `Quá hạn: ${overdueRate.toFixed(0)}%`,
        category: 'receivables',
      });
    }

    // 4. AR Aging - Long overdue (>90 days) - using FDP_THRESHOLDS
    if (arAgingData && arAgingData.length > 0) {
      const over90 = arAgingData.find(b => b.bucket === '>90 ngày');
      if (over90 && over90.value > 0 && totalAR > 0) {
        const over90Rate = (over90.value / totalAR) * 100;
        if (over90Rate > FDP_THRESHOLDS.AR_AGING_90_CRITICAL_PERCENT) {
          alerts.push({
            id: 'aging-90-critical',
            title: 'Nợ xấu >90 ngày cao',
            severity: 'critical',
            description: `${over90Rate.toFixed(0)}% AR đã quá hạn trên 90 ngày, nguy cơ mất vốn.`,
            metric: `>90 ngày: ${over90Rate.toFixed(0)}%`,
            category: 'receivables',
          });
        }
      }
    }

    // 5. Gross Margin Risk - using FDP_THRESHOLDS
    const grossMargin = kpiData?.grossMargin || 0;
    if (grossMargin > 0 && grossMargin < FDP_THRESHOLDS.GROSS_MARGIN_CRITICAL_PERCENT) {
      alerts.push({
        id: 'margin-critical',
        title: 'Biên lợi nhuận gộp thấp',
        severity: 'critical',
        description: `Gross margin chỉ ${grossMargin.toFixed(1)}%, khó trang trải chi phí vận hành.`,
        metric: `Margin: ${grossMargin.toFixed(1)}%`,
        category: 'profitability',
      });
    } else if (grossMargin > 0 && grossMargin < FDP_THRESHOLDS.GROSS_MARGIN_WARNING_PERCENT) {
      alerts.push({
        id: 'margin-warning',
        title: 'Biên lợi nhuận gộp cần cải thiện',
        severity: 'warning',
        description: `Gross margin ${grossMargin.toFixed(1)}% thấp hơn mức khuyến nghị (${FDP_THRESHOLDS.GROSS_MARGIN_WARNING_PERCENT}%).`,
        metric: `Margin: ${grossMargin.toFixed(1)}%`,
        category: 'profitability',
      });
    }

    // 6. CCC (Cash Conversion Cycle) Risk - use centralized metrics (single source of truth)
    const ccc = centralMetrics?.ccc ?? kpiData?.ccc ?? 0;
    if (ccc > FDP_THRESHOLDS.CCC_CRITICAL_DAYS) {
      alerts.push({
        id: 'ccc-critical',
        title: 'Chu kỳ chuyển đổi tiền mặt quá dài',
        severity: 'critical',
        description: `CCC ${ccc} ngày nghĩa là vốn bị đọng lâu, ảnh hưởng thanh khoản.`,
        metric: `CCC: ${ccc} ngày`,
        category: 'efficiency',
      });
    } else if (ccc > FDP_THRESHOLDS.CCC_WARNING_DAYS) {
      alerts.push({
        id: 'ccc-warning',
        title: 'CCC cao',
        severity: 'warning',
        description: `Chu kỳ chuyển đổi tiền mặt ${ccc} ngày cần tối ưu hóa.`,
        metric: `CCC: ${ccc} ngày`,
        category: 'efficiency',
      });
    }

    // 7. Channel Fee Risk - using FDP_THRESHOLDS
    if (channelData) {
      const grossRevenue = channelData.gross_revenue || 0;
      const totalFees = channelData.total_fees || 0;
      const feeRate = grossRevenue > 0 ? (totalFees / grossRevenue) * 100 : 0;
      
      if (feeRate > FDP_THRESHOLDS.CHANNEL_FEE_CRITICAL_PERCENT) {
        alerts.push({
          id: 'fee-critical',
          title: 'Phí kênh bán quá cao',
          severity: 'critical',
          description: `Phí kênh chiếm ${feeRate.toFixed(0)}% doanh thu, ăn mòn lợi nhuận.`,
          metric: `Phí: ${feeRate.toFixed(0)}%`,
          category: 'profitability',
        });
      } else if (feeRate > FDP_THRESHOLDS.CHANNEL_FEE_WARNING_PERCENT) {
        alerts.push({
          id: 'fee-warning',
          title: 'Phí kênh bán cao',
          severity: 'warning',
          description: `Phí kênh chiếm ${feeRate.toFixed(0)}% doanh thu, cần đàm phán lại.`,
          metric: `Phí: ${feeRate.toFixed(0)}%`,
          category: 'profitability',
        });
      }
    }

    // Sort by severity: critical > warning > info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return alerts;
  }, [kpiData, runwayData, arAgingData, channelData]);

  return {
    data: riskAlerts,
    isLoading: kpiLoading || runwayLoading || arLoading || channelLoading || metricsLoading,
  };
}
