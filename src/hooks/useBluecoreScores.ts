// ============= Lines 1-500 of 644 total lines =============

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { useCashRunway } from './useCashRunway';
import { useMDPData } from './useMDPData';

// Types
export type ScoreType = 
  | 'CASH_HEALTH'
  | 'GROWTH_QUALITY'
  | 'MARKETING_ACCOUNTABILITY'
  | 'CUSTOMER_VALUE_RISK';

export type ScoreGrade = 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
export type ScoreTrend = 'UP' | 'DOWN' | 'STABLE';

export interface BluecoreScore {
  id: string;
  tenant_id: string;
  score_type: ScoreType;
  score_value: number;
  score_grade: ScoreGrade;
  components: Record<string, any>;
  previous_score: number | null;
  trend: ScoreTrend | null;
  trend_percent: number | null;
  primary_driver: string | null;
  recommendation: string | null;
  calculated_at: string;
  valid_until: string | null;
}

// Customer Value & Risk Score input data
export interface CVRSInputData {
  // LTV & CAC metrics
  avgCustomerLTV: number;
  avgCAC: number;
  ltvCacRatio: number;
  
  // AR Risk metrics  
  totalAR: number;
  overdueAR: number;
  overdueARPercent: number;
  avgDSO: number;
  
  // Customer behavior metrics
  repeatPurchaseRate: number;
  avgOrdersPerCustomer: number;
  
  // Concentration risk
  top10CustomerRevenue: number;
  totalRevenue: number;
  concentrationPercent: number;
}

// Score configuration (labels, descriptions - not formulas)
export const SCORE_CONFIG: Record<ScoreType, {
  name: string;
  shortName: string;
  question: string;
  icon: string;
}> = {
  CASH_HEALTH: {
    name: 'Cash Health Score™',
    shortName: 'CHS',
    question: 'Doanh nghiệp đang khỏe hay hấp hối về tiền?',
    icon: '💰',
  },
  GROWTH_QUALITY: {
    name: 'Growth Quality Score™',
    shortName: 'GQS',
    question: 'Tăng trưởng này tốt hay độc?',
    icon: '📈',
  },
  MARKETING_ACCOUNTABILITY: {
    name: 'Marketing Accountability Score™',
    shortName: 'MAS',
    question: 'Marketing đang tạo giá trị hay phá giá trị?',
    icon: '🎯',
  },
  CUSTOMER_VALUE_RISK: {
    name: 'Customer Value & Risk Score™',
    shortName: 'CVRS',
    question: 'Khách hàng đang tạo giá trị hay tạo rủi ro?',
    icon: '👥',
  },
};

// Grade configuration
export const GRADE_CONFIG: Record<ScoreGrade, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  EXCELLENT: {
    label: 'Xuất sắc',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  GOOD: {
    label: 'Tốt',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  WARNING: {
    label: 'Cảnh báo',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  CRITICAL: {
    label: 'Nguy hiểm',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
};

// Hook to fetch CVRS input data from database
function useCVRSInputData() {
  const { buildSelectQuery, tenantId, isReady, shouldAddTenantFilter } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cvrs-input-data', tenantId],
    queryFn: async (): Promise<CVRSInputData> => {
      if (!tenantId) {
        return getDefaultCVRSData();
      }

      try {
        // Fetch customer metrics from central_metric_facts
        const { data: customerFacts } = await buildSelectQuery('central_metric_facts', 'grain_id, grain_name, revenue, profit, order_count')
          .eq('grain_type', 'customer')
          .order('revenue', { ascending: false });

        // Fetch AR aging data
        const { data: arData } = await buildSelectQuery('invoices', 'total_amount, status, due_date')
          .in('status', ['pending', 'overdue', 'partial']);

        // Fetch marketing spend for CAC
        const { data: marketingExpenses } = await buildSelectQuery('expenses', 'amount')
          .eq('category', 'marketing');

        // Calculate metrics
        const customers = (customerFacts as any[]) || [];
        const invoices = (arData as any[]) || [];
        const marketing = (marketingExpenses as any[]) || [];

        const totalCustomers = customers.length || 1;
        let totalRevenue = 0;
        let totalOrders = 0;
        for (const c of customers) {
          totalRevenue += c.revenue || 0;
          totalOrders += c.order_count || 0;
        }
        let totalMarketingSpend = 0;
        for (const e of marketing) totalMarketingSpend += e.amount || 0;

        // LTV = Average revenue per customer
        const avgCustomerLTV = totalRevenue / totalCustomers;
        
        // CAC = Total marketing spend / Total customers
        const avgCAC = totalMarketingSpend / totalCustomers || avgCustomerLTV * 0.3; // fallback 30% of LTV
        
        // LTV/CAC ratio
        const ltvCacRatio = avgCAC > 0 ? avgCustomerLTV / avgCAC : 3;

        // AR metrics
        let totalAR = 0;
        for (const inv of invoices) totalAR += inv.total_amount || 0;
        const now = new Date();
        let overdueAR = 0;
        for (const inv of invoices) {
          if (inv.status === 'overdue' || (inv.due_date && new Date(inv.due_date) < now)) {
            overdueAR += inv.total_amount || 0;
          }
        }
        const overdueARPercent = totalAR > 0 ? (overdueAR / totalAR) * 100 : 0;

        // DSO from working_capital_metrics or estimate
        const { data: wcData } = await buildSelectQuery('working_capital_metrics', 'dso_days')
          .order('metric_date', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        const avgDSO = (wcData as any)?.dso_days || 30;

        // Repeat purchase rate
        const repeatCustomers = customers.filter(c => (c.order_count || 0) > 1).length;
        const repeatPurchaseRate = (repeatCustomers / totalCustomers) * 100;
        const avgOrdersPerCustomer = totalOrders / totalCustomers;

        // Concentration risk (top 10 customers)
        let top10Revenue = 0;
        for (const c of customers.slice(0, 10)) top10Revenue += c.revenue || 0;
        const concentrationPercent = totalRevenue > 0 ? (top10Revenue / totalRevenue) * 100 : 0;

        return {
          avgCustomerLTV,
          avgCAC,
          ltvCacRatio,
          totalAR,
          overdueAR,
          overdueARPercent,
          avgDSO,
          repeatPurchaseRate,
          avgOrdersPerCustomer,
          top10CustomerRevenue: top10Revenue,
          totalRevenue,
          concentrationPercent,
        };
      } catch (error) {
        console.error('Error fetching CVRS data:', error);
        return getDefaultCVRSData();
      }
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

function getDefaultCVRSData(): CVRSInputData {
  return {
    avgCustomerLTV: 1000000,
    avgCAC: 300000,
    ltvCacRatio: 3.3,
    totalAR: 100000000,
    overdueAR: 15000000,
    overdueARPercent: 15,
    avgDSO: 35,
    repeatPurchaseRate: 25,
    avgOrdersPerCustomer: 1.5,
    top10CustomerRevenue: 30000000,
    totalRevenue: 100000000,
    concentrationPercent: 30,
  };
}

// Hook to fetch Bluecore Scores from database
export function useBluecoreScoresFromDB() {
  const { buildSelectQuery, tenantId, isReady, shouldAddTenantFilter } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['bluecore-scores', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Get the latest score for each type
      const { data, error } = await buildSelectQuery('bluecore_scores', '*')
        .order('calculated_at', { ascending: false });

      if (error) throw error;

      // Get unique latest scores by type
      const latestScores: Record<string, BluecoreScore> = {};
      for (const score of (data as unknown as BluecoreScore[])) {
        if (!latestScores[score.score_type]) {
          latestScores[score.score_type] = score;
        }
      }

      return Object.values(latestScores);
    },
    enabled: !!tenantId && isReady,
  });
}

// Hook to calculate Bluecore Scores in real-time (for demo/development)
export function useBluecoreScoresCalculated() {
  const cashRunway = useCashRunway();
  const mdpData = useMDPData();
  const cvrsData = useCVRSInputData();

  return useQuery({
    queryKey: ['bluecore-scores-calculated', cashRunway.data, mdpData.cmoModeSummary, cvrsData.data],
    queryFn: async () => {
      const scores: Omit<BluecoreScore, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>[] = [];

      // 1. Cash Health Score
      const cashHealth = calculateCashHealthScore(cashRunway.data);
      scores.push(cashHealth);

      // 2. Growth Quality Score
      const growthQuality = calculateGrowthQualityScore(mdpData.cmoModeSummary);
      scores.push(growthQuality);

      // 3. Marketing Accountability Score
      const marketingAccountability = calculateMarketingAccountabilityScore(
        mdpData.profitAttribution,
        mdpData.cashImpact
      );
      scores.push(marketingAccountability);

      // 4. Customer Value & Risk Score (with real logic)
      const customerValueRisk = calculateCustomerValueRiskScore(cvrsData.data || getDefaultCVRSData());
      scores.push(customerValueRisk);

      return scores;
    },
    enabled: true,
  });
}

// Score calculation functions (simplified - real formulas are proprietary)
function calculateCashHealthScore(cashData: any): Omit<BluecoreScore, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> {
  let score = 50;
  let grade: ScoreGrade = 'WARNING';
  let primaryDriver = 'Cash position';
  let recommendation = 'Monitor burn rate';

  if (cashData) {
    const { runwayMonths, currentCash, avgMonthlyBurn } = cashData;
    
    // Score based on runway
    if (runwayMonths >= 12) {
      score = 90;
      grade = 'EXCELLENT';
      primaryDriver = 'Strong runway (12+ months)';
      recommendation = 'Có thể cân nhắc đầu tư tăng trưởng';
    } else if (runwayMonths >= 6) {
      score = 70;
      grade = 'GOOD';
      primaryDriver = 'Healthy runway (6-12 months)';
      recommendation = 'Duy trì kiểm soát chi phí';
    } else if (runwayMonths >= 3) {
      score = 45;
      grade = 'WARNING';
      primaryDriver = 'Short runway (3-6 months)';
      recommendation = 'Cần tối ưu dòng tiền ngay';
    } else {
      score = 20;
      grade = 'CRITICAL';
      primaryDriver = 'Critical runway (<3 months)';
      recommendation = 'CẮT CHI PHÍ NGAY - Tình trạng khẩn cấp';
    }
  }

  return {
    score_type: 'CASH_HEALTH',
    score_value: score,
    score_grade: grade,
    components: {},
    previous_score: null,
    trend: null,
    trend_percent: null,
    primary_driver: primaryDriver,
    recommendation,
    calculated_at: new Date().toISOString(),
    valid_until: null,
  };
}

function calculateGrowthQualityScore(cmoSummary: any): Omit<BluecoreScore, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> {
  let score = 50;
  let grade: ScoreGrade = 'WARNING';
  let primaryDriver = 'Growth metrics';
  let recommendation = 'Review growth quality';

  if (cmoSummary) {
    const { totalContributionMargin, totalRevenue, avgCashConversionRate } = cmoSummary;
    
    const marginPercent = totalRevenue > 0 ? (totalContributionMargin / totalRevenue) * 100 : 0;

    if (marginPercent >= 20 && avgCashConversionRate >= 80) {
      score = 90;
      grade = 'EXCELLENT';
      primaryDriver = 'High margin + fast cash';
      recommendation = 'Scale với confidence cao';
    } else if (marginPercent >= 10 && avgCashConversionRate >= 60) {
      score = 70;
      grade = 'GOOD';
      primaryDriver = 'Healthy margin';
      recommendation = 'Có thể scale cẩn thận';
    } else if (marginPercent >= 0) {
      score = 45;
      grade = 'WARNING';
      primaryDriver = 'Margin thấp';
      recommendation = 'Tối ưu unit economics trước khi scale';
    } else {
      score = 20;
      grade = 'CRITICAL';
      primaryDriver = 'Margin âm';
      recommendation = 'DỪNG SCALE - Đang đốt tiền';
    }
  }

  return {
    score_type: 'GROWTH_QUALITY',
    score_value: score,
    score_grade: grade,
    components: {},
    previous_score: null,
    trend: null,
    trend_percent: null,
    primary_driver: primaryDriver,
    recommendation,
    calculated_at: new Date().toISOString(),
    valid_until: null,
  };
}

function calculateMarketingAccountabilityScore(
  profitAttribution: any[],
  cashImpact: any[]
): Omit<BluecoreScore, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> {
  let score = 50;
  let grade: ScoreGrade = 'WARNING';
  let primaryDriver = 'Marketing ROI';
  let recommendation = 'Analyze channel efficiency';

  if (profitAttribution && profitAttribution.length > 0) {
    let totalProfit = 0;
    let totalSpend = 0;
    for (const p of profitAttribution) {
      totalProfit += p.contributionMargin || 0;
      totalSpend += p.spend || 0;
    }
    const profitRoas = totalSpend > 0 ? totalProfit / totalSpend : 0;

    if (profitRoas >= 2) {
      score = 90;
      grade = 'EXCELLENT';
      primaryDriver = 'Profit ROAS > 2x';
      recommendation = 'Marketing tạo giá trị cao - Scale';
    } else if (profitRoas >= 1) {
      score = 70;
      grade = 'GOOD';
      primaryDriver = 'Profit ROAS 1-2x';
      recommendation = 'Marketing có lãi - Optimize để scale';
    } else if (profitRoas >= 0.5) {
      score = 40;
      grade = 'WARNING';
      primaryDriver = 'Profit ROAS thấp';
      recommendation = 'Cần tối ưu channel mix';
    } else {
      score = 15;
      grade = 'CRITICAL';
      primaryDriver = 'Marketing đang lỗ';
      recommendation = 'PAUSE ADS - Đang phá giá trị';
    }
  }

  return {
    score_type: 'MARKETING_ACCOUNTABILITY',
    score_value: score,
    score_grade: grade,
    components: {},
    previous_score: null,
    trend: null,
    trend_percent: null,
    primary_driver: primaryDriver,
    recommendation,
    calculated_at: new Date().toISOString(),
    valid_until: null,
  };
}

/**
 * CVRS - Customer Value & Risk Score
 * 
 * FORMULA (Weighted Average):
 * CVRS = (LTV_CAC_Score × 30%) + (AR_Risk_Score × 25%) + (Retention_Score × 25%) + (Concentration_Score × 20%)
 */
function calculateCustomerValueRiskScore(data: CVRSInputData): Omit<BluecoreScore, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> {
  // 1. LTV/CAC Score (30%)
  let ltvCacScore = 0;
  if (data.ltvCacRatio >= 4) ltvCacScore = 100;
  else if (data.ltvCacRatio >= 3) ltvCacScore = 80;
  else if (data.ltvCacRatio >= 2) ltvCacScore = 60;
  else if (data.ltvCacRatio >= 1) ltvCacScore = 40;
  else ltvCacScore = 20;

  // 2. AR Risk Score (25%)
  let arRiskScore = 0;
  if (data.overdueARPercent < 5) arRiskScore = 100;
  else if (data.overdueARPercent < 10) arRiskScore = 80;
  else if (data.overdueARPercent < 20) arRiskScore = 60;
  else if (data.overdueARPercent < 30) arRiskScore = 40;
  else arRiskScore = 20;

  // 3. Retention Score (25%)
  let retentionScore = 0;
  if (data.repeatPurchaseRate >= 40) retentionScore = 100;
  else if (data.repeatPurchaseRate >= 30) retentionScore = 80;
  else if (data.repeatPurchaseRate >= 20) retentionScore = 60;
  else if (data.repeatPurchaseRate >= 10) retentionScore = 40;
  else retentionScore = 20;

  // 4. Concentration Score (20%)
  let concentrationScore = 0;
  if (data.concentrationPercent < 10) concentrationScore = 100;
  else if (data.concentrationPercent < 20) concentrationScore = 80;
  else if (data.concentrationPercent < 30) concentrationScore = 60;
  else if (data.concentrationPercent < 50) concentrationScore = 40;
  else concentrationScore = 20;

  // Weighted Average
  const totalScore = Math.round(
    (ltvCacScore * 0.3) +
    (arRiskScore * 0.25) +
    (retentionScore * 0.25) +
    (concentrationScore * 0.2)
  );

  let grade: ScoreGrade = 'WARNING';
  let primaryDriver = 'Customer metrics';
  let recommendation = 'Improve customer retention';

  if (totalScore >= 85) {
    grade = 'EXCELLENT';
    primaryDriver = 'Strong customer value';
    recommendation = 'Focus on scaling high-value segments';
  } else if (totalScore >= 70) {
    grade = 'GOOD';
    primaryDriver = 'Healthy customer base';
    recommendation = 'Optimize CAC and retention';
  } else if (totalScore >= 50) {
    grade = 'WARNING';
    primaryDriver = 'Risky customer metrics';
    recommendation = 'Reduce AR risk and improve retention';
  } else {
    grade = 'CRITICAL';
    primaryDriver = 'High customer risk';
    recommendation = 'Urgent: Collect AR and stop low-quality acquisition';
  }

  return {
    score_type: 'CUSTOMER_VALUE_RISK',
    score_value: totalScore,
    score_grade: grade,
    components: {
      ltvCac: ltvCacScore,
      arRisk: arRiskScore,
      retention: retentionScore,
      concentration: concentrationScore,
      inputs: data,
    },
    previous_score: null,
    trend: null,
    trend_percent: null,
    primary_driver: primaryDriver,
    recommendation,
    calculated_at: new Date().toISOString(),
    valid_until: null,
  };
}

/**
 * Main hook for Bluecore Scores
 * Returns calculated scores in real-time (for now)
 * Can be switched to use database scores via useBluecoreScoresFromDB
 */
export function useBluecoreScores() {
  const calculatedScores = useBluecoreScoresCalculated();
  
  return {
    data: calculatedScores.data as BluecoreScore[] | undefined,
    isLoading: calculatedScores.isLoading,
    isCalculated: true, // Indicates scores are calculated client-side
    error: calculatedScores.error,
  };
}
