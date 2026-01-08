import { useMemo } from 'react';
import { useDashboardKPICache } from './useDashboardCache';
import { useCashRunway } from './useCashRunway';
import { useChannelAnalyticsCache } from './useChannelAnalyticsCache';

export interface RiskScore {
  category: string;
  score: number;
  fullMark: number;
  details?: string;
}

export interface RiskSummary {
  riskScores: RiskScore[];
  lowCount: number;
  mediumCount: number;
  highCount: number;
  criticalCount: number;
  averageScore: number;
  isLoading: boolean;
}

/**
 * Calculate risk scores from real financial data
 * Risk score: 0 = no risk, 100 = maximum risk
 */
export function useRiskScores(): RiskSummary {
  const { data: kpiData, isLoading: kpiLoading } = useDashboardKPICache();
  const { data: cashRunway, isLoading: runwayLoading } = useCashRunway();
  const { data: channelData, isLoading: channelLoading } = useChannelAnalyticsCache();

  const isLoading = kpiLoading || runwayLoading || channelLoading;

  const riskScores = useMemo(() => {
    const scores: RiskScore[] = [];

    // 1. Liquidity Risk - based on cash runway and current ratio
    let liquidityScore = 50; // Default to medium
    if (cashRunway) {
      const runwayMonths = cashRunway.runwayMonths || 0;
      if (runwayMonths >= 12) liquidityScore = 20;
      else if (runwayMonths >= 6) liquidityScore = 40;
      else if (runwayMonths >= 3) liquidityScore = 60;
      else if (runwayMonths >= 1) liquidityScore = 80;
      else liquidityScore = 95;
    }
    scores.push({
      category: 'Thanh khoản',
      score: liquidityScore,
      fullMark: 100,
      details: `Cash runway: ${cashRunway?.runwayMonths?.toFixed(1) || 'N/A'} tháng`
    });

    // 2. Credit Risk - based on DSO and overdue AR
    let creditScore = 50;
    if (kpiData) {
      const dso = kpiData.dso || 0;
      const overdueAR = kpiData.overdueAR || 0;
      const totalAR = kpiData.totalAR || 1;
      const overduePercent = (overdueAR / totalAR) * 100;

      // DSO component (max 50 points)
      let dsoScore = 0;
      if (dso <= 30) dsoScore = 10;
      else if (dso <= 45) dsoScore = 25;
      else if (dso <= 60) dsoScore = 35;
      else dsoScore = 50;

      // Overdue AR component (max 50 points)
      let overdueScore = 0;
      if (overduePercent <= 5) overdueScore = 10;
      else if (overduePercent <= 15) overdueScore = 25;
      else if (overduePercent <= 30) overdueScore = 40;
      else overdueScore = 50;

      creditScore = dsoScore + overdueScore;
    }
    scores.push({
      category: 'Tín dụng',
      score: creditScore,
      fullMark: 100,
      details: `DSO: ${kpiData?.dso?.toFixed(0) || 'N/A'} ngày`
    });

    // 3. Market Risk - based on channel concentration
    let marketScore = 50;
    if (channelData?.channel_metrics) {
      const metrics = channelData.channel_metrics as Array<{ revenue?: number }>;
      const totalRevenue = metrics.reduce((sum, m) => sum + (m.revenue || 0), 0);
      
      if (totalRevenue > 0 && metrics.length > 0) {
        const topChannelRevenue = Math.max(...metrics.map(m => m.revenue || 0));
        const concentration = (topChannelRevenue / totalRevenue) * 100;
        
        if (concentration <= 30) marketScore = 25;
        else if (concentration <= 50) marketScore = 45;
        else if (concentration <= 70) marketScore = 65;
        else marketScore = 85;
      }
    }
    scores.push({
      category: 'Thị trường',
      score: marketScore,
      fullMark: 100,
      details: 'Rủi ro tập trung kênh bán'
    });

    // 4. Operational Risk - based on CCC and gross margin
    let operationalScore = 50;
    if (kpiData) {
      const ccc = kpiData.ccc || 0;
      const grossMargin = kpiData.grossMargin || 0;

      let cccScore = ccc <= 30 ? 10 : ccc <= 60 ? 25 : ccc <= 90 ? 35 : 50;
      let marginScore = grossMargin >= 40 ? 10 : grossMargin >= 25 ? 20 : grossMargin >= 15 ? 35 : 50;

      operationalScore = cccScore + marginScore;
    }
    scores.push({
      category: 'Hoạt động',
      score: operationalScore,
      fullMark: 100,
      details: `CCC: ${kpiData?.ccc?.toFixed(0) || 'N/A'} ngày`
    });

    // 5. Compliance Risk - default based on data availability
    const complianceScore = 30;
    scores.push({
      category: 'Tuân thủ',
      score: complianceScore,
      fullMark: 100,
      details: 'Đánh giá tuân thủ'
    });

    // 6. Strategic Risk - composite of other factors
    const avgOtherScores = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    const strategicScore = Math.round(Math.min(85, Math.max(30, avgOtherScores * 0.8 + 20)));

    scores.push({
      category: 'Chiến lược',
      score: strategicScore,
      fullMark: 100,
      details: 'Đánh giá tổng hợp'
    });

    return scores;
  }, [kpiData, cashRunway, channelData]);

  const lowCount = riskScores.filter(s => s.score < 40).length;
  const mediumCount = riskScores.filter(s => s.score >= 40 && s.score < 60).length;
  const highCount = riskScores.filter(s => s.score >= 60 && s.score < 80).length;
  const criticalCount = riskScores.filter(s => s.score >= 80).length;
  const averageScore = riskScores.length > 0 
    ? Math.round(riskScores.reduce((sum, s) => sum + s.score, 0) / riskScores.length)
    : 50;

  return {
    riskScores,
    lowCount,
    mediumCount,
    highCount,
    criticalCount,
    averageScore,
    isLoading
  };
}
