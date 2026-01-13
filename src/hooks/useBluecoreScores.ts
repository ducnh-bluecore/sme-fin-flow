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
    question: 'Khách này đáng giữ hay nên tránh?',
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

  return useQuery({
    queryKey: ['bluecore-scores-calculated', cashRunway.data, mdpData.cmoModeSummary],
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

      // 4. Customer Value & Risk Score (placeholder for now)
      const customerValueRisk = calculateCustomerValueRiskScore();
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

function calculateCustomerValueRiskScore(): Omit<BluecoreScore, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> {
  // Placeholder - CDP integration needed
  return {
    score_type: 'CUSTOMER_VALUE_RISK',
    score_value: 65,
    score_grade: 'GOOD',
    components: {},
    previous_score: null,
    trend: null,
    trend_percent: null,
    primary_driver: 'Customer health baseline',
    recommendation: 'Integrate CDP for detailed analysis',
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
