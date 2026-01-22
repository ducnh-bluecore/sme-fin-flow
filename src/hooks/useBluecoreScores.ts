import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
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
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cvrs-input-data', tenantId],
    queryFn: async (): Promise<CVRSInputData> => {
      if (!tenantId) {
        return getDefaultCVRSData();
      }

      try {
        // Fetch customer metrics from central_metric_facts
        const { data: customerFacts } = await supabase
          .from('central_metric_facts')
          .select('grain_id, grain_name, revenue, profit, order_count')
          .eq('tenant_id', tenantId)
          .eq('grain_type', 'customer')
          .order('revenue', { ascending: false });

        // Fetch AR aging data
        const { data: arData } = await supabase
          .from('invoices')
          .select('total_amount, status, due_date')
          .eq('tenant_id', tenantId)
          .in('status', ['pending', 'overdue', 'partial']);

        // Fetch marketing spend for CAC
        const { data: marketingExpenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('tenant_id', tenantId)
          .eq('category', 'marketing');

        // Calculate metrics
        const customers = customerFacts || [];
        const invoices = arData || [];
        const marketing = marketingExpenses || [];

        const totalCustomers = customers.length || 1;
        const totalRevenue = customers.reduce((sum, c) => sum + (c.revenue || 0), 0);
        const totalOrders = customers.reduce((sum, c) => sum + (c.order_count || 0), 0);
        const totalMarketingSpend = marketing.reduce((sum, e) => sum + (e.amount || 0), 0);

        // LTV = Average revenue per customer
        const avgCustomerLTV = totalRevenue / totalCustomers;
        
        // CAC = Total marketing spend / Total customers
        const avgCAC = totalMarketingSpend / totalCustomers || avgCustomerLTV * 0.3; // fallback 30% of LTV
        
        // LTV/CAC ratio
        const ltvCacRatio = avgCAC > 0 ? avgCustomerLTV / avgCAC : 3;

        // AR metrics
        const totalAR = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        const now = new Date();
        const overdueInvoices = invoices.filter(inv => 
          inv.status === 'overdue' || (inv.due_date && new Date(inv.due_date) < now)
        );
        const overdueAR = overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        const overdueARPercent = totalAR > 0 ? (overdueAR / totalAR) * 100 : 0;

        // DSO from working_capital_metrics or estimate
        const { data: wcData } = await supabase
          .from('working_capital_metrics')
          .select('dso_days')
          .eq('tenant_id', tenantId)
          .order('metric_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        const avgDSO = wcData?.dso_days || 30;

        // Repeat purchase rate
        const repeatCustomers = customers.filter(c => (c.order_count || 0) > 1).length;
        const repeatPurchaseRate = (repeatCustomers / totalCustomers) * 100;
        const avgOrdersPerCustomer = totalOrders / totalCustomers;

        // Concentration risk (top 10 customers)
        const top10Revenue = customers.slice(0, 10).reduce((sum, c) => sum + (c.revenue || 0), 0);
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
    enabled: !!tenantId,
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
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['bluecore-scores', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Get the latest score for each type
      const { data, error } = await supabase
        .from('bluecore_scores')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('calculated_at', { ascending: false });

      if (error) throw error;

      // Get unique latest scores by type
      const latestScores: Record<string, BluecoreScore> = {};
      for (const score of data) {
        if (!latestScores[score.score_type]) {
          latestScores[score.score_type] = score as BluecoreScore;
        }
      }

      return Object.values(latestScores);
    },
    enabled: !!tenantId,
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
    const totalProfit = profitAttribution.reduce((sum, p) => sum + (p.contributionMargin || 0), 0);
    const totalSpend = profitAttribution.reduce((sum, p) => sum + (p.spend || 0), 0);
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
 * 
 * Components:
 * 1. LTV/CAC Ratio Score (30%):
 *    - ≥ 4x: 100 points (Excellent - High customer value)
 *    - 3-4x: 80 points (Good - Healthy acquisition)
 *    - 2-3x: 60 points (Warning - Watch CAC)
 *    - 1-2x: 40 points (Poor - CAC too high)
 *    - < 1x: 20 points (Critical - Losing money per customer)
 * 
 * 2. AR Risk Score (25%):
 *    - Overdue AR < 5%: 100 points (Excellent)
 *    - 5-15%: 70 points (Good)
 *    - 15-30%: 45 points (Warning)
 *    - > 30%: 20 points (Critical - High bad debt risk)
 * 
 * 3. Retention Score (25%):
 *    - Repeat Rate ≥ 40%: 100 points (Excellent)
 *    - 25-40%: 75 points (Good)
 *    - 10-25%: 50 points (Warning)
 *    - < 10%: 25 points (Critical - No retention)
 * 
 * 4. Concentration Score (20%):
 *    - Top 10 < 20% revenue: 100 points (Diversified)
 *    - 20-40%: 70 points (Moderate concentration)
 *    - 40-60%: 45 points (High concentration)
 *    - > 60%: 20 points (Critical dependency)
 */
function calculateCustomerValueRiskScore(
  cvrsData: CVRSInputData
): Omit<BluecoreScore, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> {
  const {
    ltvCacRatio,
    overdueARPercent,
    repeatPurchaseRate,
    concentrationPercent,
  } = cvrsData;

  // 1. LTV/CAC Ratio Score (30% weight)
  let ltvCacScore: number;
  if (ltvCacRatio >= 4) ltvCacScore = 100;
  else if (ltvCacRatio >= 3) ltvCacScore = 80;
  else if (ltvCacRatio >= 2) ltvCacScore = 60;
  else if (ltvCacRatio >= 1) ltvCacScore = 40;
  else ltvCacScore = 20;

  // 2. AR Risk Score (25% weight)
  let arRiskScore: number;
  if (overdueARPercent < 5) arRiskScore = 100;
  else if (overdueARPercent < 15) arRiskScore = 70;
  else if (overdueARPercent < 30) arRiskScore = 45;
  else arRiskScore = 20;

  // 3. Retention Score (25% weight)
  let retentionScore: number;
  if (repeatPurchaseRate >= 40) retentionScore = 100;
  else if (repeatPurchaseRate >= 25) retentionScore = 75;
  else if (repeatPurchaseRate >= 10) retentionScore = 50;
  else retentionScore = 25;

  // 4. Concentration Score (20% weight)
  let concentrationScore: number;
  if (concentrationPercent < 20) concentrationScore = 100;
  else if (concentrationPercent < 40) concentrationScore = 70;
  else if (concentrationPercent < 60) concentrationScore = 45;
  else concentrationScore = 20;

  // Weighted final score
  const finalScore = Math.round(
    ltvCacScore * 0.30 +
    arRiskScore * 0.25 +
    retentionScore * 0.25 +
    concentrationScore * 0.20
  );

  // Determine grade
  let grade: ScoreGrade;
  if (finalScore >= 80) grade = 'EXCELLENT';
  else if (finalScore >= 60) grade = 'GOOD';
  else if (finalScore >= 40) grade = 'WARNING';
  else grade = 'CRITICAL';

  // Identify primary driver (lowest scoring component)
  const components = {
    ltvCac: { score: ltvCacScore, weight: 0.30, value: ltvCacRatio.toFixed(1) + 'x' },
    arRisk: { score: arRiskScore, weight: 0.25, value: overdueARPercent.toFixed(1) + '%' },
    retention: { score: retentionScore, weight: 0.25, value: repeatPurchaseRate.toFixed(1) + '%' },
    concentration: { score: concentrationScore, weight: 0.20, value: concentrationPercent.toFixed(1) + '%' },
  };

  // Find weakest component
  const weakest = Object.entries(components).reduce((min, [key, val]) => 
    val.score < min.score ? { key, ...val } : min, 
    { key: 'ltvCac', score: 100, weight: 0, value: '' }
  );

  // Generate driver message and recommendation
  let primaryDriver: string;
  let recommendation: string;

  switch (weakest.key) {
    case 'ltvCac':
      primaryDriver = `LTV/CAC = ${cvrsData.ltvCacRatio.toFixed(1)}x`;
      if (ltvCacScore >= 80) recommendation = 'Unit economics xuất sắc - Scale tự tin';
      else if (ltvCacScore >= 60) recommendation = 'Có thể scale với monitoring';
      else recommendation = 'Giảm CAC hoặc tăng LTV trước khi scale';
      break;
    case 'arRisk':
      primaryDriver = `AR quá hạn = ${overdueARPercent.toFixed(0)}%`;
      if (arRiskScore >= 70) recommendation = 'Rủi ro thu hồi thấp';
      else recommendation = 'Thắt chặt credit policy, đẩy mạnh thu hồi';
      break;
    case 'retention':
      primaryDriver = `Repeat Rate = ${repeatPurchaseRate.toFixed(0)}%`;
      if (retentionScore >= 75) recommendation = 'Khách hàng trung thành cao';
      else recommendation = 'Cải thiện retention marketing & CX';
      break;
    case 'concentration':
      primaryDriver = `Top 10 KH = ${concentrationPercent.toFixed(0)}% doanh thu`;
      if (concentrationScore >= 70) recommendation = 'Rủi ro tập trung thấp';
      else recommendation = 'Đa dạng hóa khách hàng để giảm rủi ro';
      break;
    default:
      primaryDriver = 'Customer health assessment';
      recommendation = 'Tiếp tục theo dõi';
  }

  return {
    score_type: 'CUSTOMER_VALUE_RISK',
    score_value: finalScore,
    score_grade: grade,
    components,
    previous_score: null,
    trend: null,
    trend_percent: null,
    primary_driver: primaryDriver,
    recommendation,
    calculated_at: new Date().toISOString(),
    valid_until: null,
  };
}

// Combined hook - uses calculated scores if DB is empty
export function useBluecoreScores() {
  const dbScores = useBluecoreScoresFromDB();
  const calculatedScores = useBluecoreScoresCalculated();

  return {
    data: dbScores.data && dbScores.data.length > 0 
      ? dbScores.data 
      : calculatedScores.data || [],
    isLoading: dbScores.isLoading || calculatedScores.isLoading,
    error: dbScores.error || calculatedScores.error,
    isCalculated: !dbScores.data || dbScores.data.length === 0,
  };
}
