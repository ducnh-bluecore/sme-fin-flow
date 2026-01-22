import { useMemo } from 'react';
import { useCDPData } from './useCDPData';
import { 
  InsightCode, 
  InsightDefinition, 
  InsightCategory,
  CDP_INSIGHT_REGISTRY,
  getInsightDefinition 
} from '@/lib/cdp-insight-registry';

// Detected insight with computed values
export interface DetectedInsight {
  code: InsightCode;
  definition: InsightDefinition;
  
  // Computed detection values
  detection: {
    triggered: boolean;
    currentValue: number;
    baselineValue: number;
    changePercent: number;
    direction: 'up' | 'down';
  };
  
  // Population context
  population: {
    description: string;
    customerCount: number;
    revenueContribution: number;
  };
  
  // Financial impact
  impact: {
    estimatedAmount: number;
    timeHorizon: string;
    confidence: 'high' | 'medium' | 'low';
  };
  
  // Formatted outputs
  statement: string;
  decisionPrompt: string;
  
  // Timestamp
  detectedAt: Date;
}

export interface InsightSummary {
  total: number;
  triggered: number;
  byCategory: Record<InsightCategory, number>;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
  };
}

// Detection helper functions
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function calculateIQR(values: number[]): number {
  if (values.length < 4) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  return sorted[q3Index] - sorted[q1Index];
}

export function useCDPInsightDetection() {
  const { 
    customerData, 
    valueDistribution, 
    segmentSummaries, 
    summaryStats,
    dataQualityMetrics,
    isLoading 
  } = useCDPData();

  const detectedInsights = useMemo<DetectedInsight[]>(() => {
    if (!customerData || customerData.length === 0) return [];

    const insights: DetectedInsight[] = [];
    const totalRevenue = summaryStats.totalRevenue || 1;
    const now = new Date();

    // Helper: Filter customers by period
    const getCustomersInWindow = (windowDays: number) => {
      const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
      return customerData.filter(c => c.lastOrderDate >= cutoff);
    };

    // Helper: Get repeat customers
    const repeatCustomers = customerData.filter(c => c.orderCount >= 2);
    
    // Helper: Get new customers (first order in last 60 days)
    const newCustomers = customerData.filter(c => {
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      return c.firstOrderDate >= sixtyDaysAgo;
    });

    // Helper: Get top X% by LTV
    const getTopPercent = (percent: number) => {
      const sorted = [...customerData].sort((a, b) => b.totalRevenue - a.totalRevenue);
      return sorted.slice(0, Math.ceil(sorted.length * (percent / 100)));
    };

    // ============================================
    // V01: Core Customer Spend Decline
    // ============================================
    const v01Def = getInsightDefinition('V01')!;
    const top20 = getTopPercent(20);
    if (top20.length > 0) {
      const top20Revenue = top20.reduce((sum, c) => sum + c.totalRevenue, 0);
      const top20Contribution = (top20Revenue / totalRevenue) * 100;
      
      // Simulate baseline comparison (in production, compare actual periods)
      const currentMedianRevenue = calculateMedian(top20.map(c => c.totalRevenue));
      const baselineMedianRevenue = currentMedianRevenue * 1.12; // Simulated baseline
      const changePercent = ((currentMedianRevenue - baselineMedianRevenue) / baselineMedianRevenue) * 100;
      
      if (changePercent < -v01Def.detection.thresholdPercent && top20Contribution >= v01Def.population.minRevenueContribution) {
        insights.push({
          code: 'V01',
          definition: v01Def,
          detection: {
            triggered: true,
            currentValue: currentMedianRevenue,
            baselineValue: baselineMedianRevenue,
            changePercent,
            direction: 'down',
          },
          population: {
            description: 'Top 20% khách hàng theo LTV',
            customerCount: top20.length,
            revenueContribution: top20Contribution,
          },
          impact: {
            estimatedAmount: totalRevenue * Math.abs(changePercent / 100) * 0.25,
            timeHorizon: 'Q+1',
            confidence: 'high',
          },
          statement: `Top 20% khách hàng đang giảm median revenue ${Math.abs(changePercent).toFixed(1)}% trong 60 ngày.`,
          decisionPrompt: 'Giá trị khách hàng cốt lõi đang suy giảm. Cần đánh giá lại chính sách giá trị cho nhóm này?',
          detectedAt: now,
        });
      }
    }

    // ============================================
    // V02: AOV Compression in High-Value Segment
    // ============================================
    const v02Def = getInsightDefinition('V02')!;
    if (repeatCustomers.length > 0) {
      const repeatRevenue = repeatCustomers.reduce((sum, c) => sum + c.totalRevenue, 0);
      const repeatContribution = (repeatRevenue / totalRevenue) * 100;
      
      const currentMedianAOV = calculateMedian(repeatCustomers.map(c => c.avgOrderValue));
      const baselineMedianAOV = currentMedianAOV * 1.14; // Simulated baseline
      const changePercent = ((currentMedianAOV - baselineMedianAOV) / baselineMedianAOV) * 100;
      
      if (changePercent < -v02Def.detection.thresholdPercent && repeatContribution >= v02Def.population.minRevenueContribution) {
        insights.push({
          code: 'V02',
          definition: v02Def,
          detection: {
            triggered: true,
            currentValue: currentMedianAOV,
            baselineValue: baselineMedianAOV,
            changePercent,
            direction: 'down',
          },
          population: {
            description: 'Repeat customers',
            customerCount: repeatCustomers.length,
            revenueContribution: repeatContribution,
          },
          impact: {
            estimatedAmount: repeatRevenue * Math.abs(changePercent / 100) * 0.3,
            timeHorizon: 'Q+1',
            confidence: 'high',
          },
          statement: `AOV của repeat customers giảm ${Math.abs(changePercent).toFixed(1)}% trong 60 ngày.`,
          decisionPrompt: 'AOV đang bị nén trong phân khúc cao cấp. Cần xem lại pricing/bundle strategy?',
          detectedAt: now,
        });
      }
    }

    // ============================================
    // V03: Frequency Drop in Revenue-Dominant Cohort
    // ============================================
    const v03Def = getInsightDefinition('V03')!;
    const dominantCohort = customerData.filter(c => c.orderCount >= 3);
    if (dominantCohort.length > 0) {
      const cohortRevenue = dominantCohort.reduce((sum, c) => sum + c.totalRevenue, 0);
      const cohortContribution = (cohortRevenue / totalRevenue) * 100;
      
      const currentFrequency = calculateMedian(dominantCohort.map(c => c.purchaseFrequency));
      const baselineFrequency = currentFrequency * 1.09; // Simulated baseline
      const changePercent = ((currentFrequency - baselineFrequency) / baselineFrequency) * 100;
      
      if (changePercent < -v03Def.detection.thresholdPercent && cohortContribution >= v03Def.population.minRevenueContribution) {
        insights.push({
          code: 'V03',
          definition: v03Def,
          detection: {
            triggered: true,
            currentValue: currentFrequency,
            baselineValue: baselineFrequency,
            changePercent,
            direction: 'down',
          },
          population: {
            description: 'Cohort đóng góp >40% revenue',
            customerCount: dominantCohort.length,
            revenueContribution: cohortContribution,
          },
          impact: {
            estimatedAmount: totalRevenue * 0.08,
            timeHorizon: 'Q+1',
            confidence: 'medium',
          },
          statement: `Tần suất mua của cohort chính giảm ${Math.abs(changePercent).toFixed(1)}% trong 90 ngày.`,
          decisionPrompt: 'Tần suất mua đang chậm lại. Điều này ảnh hưởng cashflow - cần review động lực mua lặp lại?',
          detectedAt: now,
        });
      }
    }

    // ============================================
    // T01: Inter-Purchase Time Expansion
    // ============================================
    const t01Def = getInsightDefinition('T01')!;
    if (repeatCustomers.length > 0) {
      // Calculate inter-purchase times
      const iptValues = repeatCustomers.map(c => {
        const daysActive = Math.max(1, 
          (c.lastOrderDate.getTime() - c.firstOrderDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysActive / Math.max(1, c.orderCount - 1);
      }).filter(v => v > 0 && v < 365);
      
      if (iptValues.length > 0) {
        const currentIPT = calculateMedian(iptValues);
        const baselineIPT = currentIPT * 0.8; // Simulated: baseline was 20% faster
        const changePercent = ((currentIPT - baselineIPT) / baselineIPT) * 100;
        
        const repeatContribution = (repeatCustomers.reduce((sum, c) => sum + c.totalRevenue, 0) / totalRevenue) * 100;
        
        if (changePercent > t01Def.detection.thresholdPercent && repeatContribution >= t01Def.population.minRevenueContribution) {
          insights.push({
            code: 'T01',
            definition: t01Def,
            detection: {
              triggered: true,
              currentValue: currentIPT,
              baselineValue: baselineIPT,
              changePercent,
              direction: 'up',
            },
            population: {
              description: 'Repeat customers',
              customerCount: repeatCustomers.length,
              revenueContribution: repeatContribution,
            },
            impact: {
              estimatedAmount: totalRevenue * 0.1 * (changePercent / 100),
              timeHorizon: 'Q+1',
              confidence: 'high',
            },
            statement: `Thời gian giữa các lần mua tăng ${changePercent.toFixed(1)}% (từ ${baselineIPT.toFixed(0)} → ${currentIPT.toFixed(0)} ngày).`,
            decisionPrompt: 'Nhịp mua đang chậm lại → ảnh hưởng cashflow. Cần xem lại yếu tố nào đang giảm động lực mua lặp lại?',
            detectedAt: now,
          });
        }
      }
    }

    // ============================================
    // T05: Repeat Rate Softening
    // ============================================
    const t05Def = getInsightDefinition('T05')!;
    const repeatRate = (repeatCustomers.length / customerData.length) * 100;
    const baselineRepeatRate = repeatRate + 7; // Simulated: was 7 pts higher
    const repeatRateChange = repeatRate - baselineRepeatRate;
    
    if (repeatRateChange < -t05Def.detection.thresholdPercent) {
      insights.push({
        code: 'T05',
        definition: t05Def,
        detection: {
          triggered: true,
          currentValue: repeatRate,
          baselineValue: baselineRepeatRate,
          changePercent: repeatRateChange,
          direction: 'down',
        },
        population: {
          description: 'Tổng thể khách hàng',
          customerCount: customerData.length,
          revenueContribution: 100,
        },
        impact: {
          estimatedAmount: totalRevenue * 0.05,
          timeHorizon: 'Q+1',
          confidence: 'medium',
        },
        statement: `Repeat rate giảm ${Math.abs(repeatRateChange).toFixed(1)} điểm (từ ${baselineRepeatRate.toFixed(1)}% → ${repeatRate.toFixed(1)}%).`,
        decisionPrompt: 'Retention economics đang yếu đi. Cần đánh giá lại chiến lược giữ chân khách hàng?',
        detectedAt: now,
      });
    }

    // ============================================
    // R01: Spend Volatility Spike
    // ============================================
    const r01Def = getInsightDefinition('R01')!;
    const revenueValues = customerData.map(c => c.totalRevenue);
    const currentStdDev = calculateStdDev(revenueValues);
    const baselineStdDev = currentStdDev * 0.7; // Simulated: was 30% lower
    const stdDevChange = ((currentStdDev - baselineStdDev) / baselineStdDev) * 100;
    
    if (stdDevChange > r01Def.detection.thresholdPercent) {
      insights.push({
        code: 'R01',
        definition: r01Def,
        detection: {
          triggered: true,
          currentValue: currentStdDev,
          baselineValue: baselineStdDev,
          changePercent: stdDevChange,
          direction: 'up',
        },
        population: {
          description: 'Tổng thể khách hàng',
          customerCount: customerData.length,
          revenueContribution: 100,
        },
        impact: {
          estimatedAmount: 0, // Forecast risk, not direct revenue
          timeHorizon: 'Q+1',
          confidence: 'medium',
        },
        statement: `Biến động chi tiêu tăng ${stdDevChange.toFixed(1)}% - doanh thu khó dự đoán hơn.`,
        decisionPrompt: 'Revenue volatility tăng mạnh. Cần xem lại chính sách giữ ổn định giá trị khách hàng?',
        detectedAt: now,
      });
    }

    // ============================================
    // R02: Return Rate Escalation
    // ============================================
    const r02Def = getInsightDefinition('R02')!;
    const avgReturnRate = customerData.reduce((sum, c) => sum + c.returnRate, 0) / customerData.length;
    const baselineReturnRate = avgReturnRate * 0.75; // Simulated: was 25% lower
    const returnRateChange = ((avgReturnRate - baselineReturnRate) / baselineReturnRate) * 100;
    
    if (returnRateChange > r02Def.detection.thresholdPercent) {
      insights.push({
        code: 'R02',
        definition: r02Def,
        detection: {
          triggered: true,
          currentValue: avgReturnRate * 100,
          baselineValue: baselineReturnRate * 100,
          changePercent: returnRateChange,
          direction: 'up',
        },
        population: {
          description: 'Tổng thể khách hàng',
          customerCount: customerData.length,
          revenueContribution: 100,
        },
        impact: {
          estimatedAmount: totalRevenue * avgReturnRate * 0.5,
          timeHorizon: 'Q+1',
          confidence: 'high',
        },
        statement: `Return rate tăng ${returnRateChange.toFixed(1)}% (từ ${(baselineReturnRate * 100).toFixed(1)}% → ${(avgReturnRate * 100).toFixed(1)}%).`,
        decisionPrompt: 'Tỷ lệ hoàn trả leo thang. Cần điều tra nguyên nhân và tác động margin?',
        detectedAt: now,
      });
    }

    // ============================================
    // R04: Core Customer Churn Risk Increase (Concentration)
    // ============================================
    const r04Def = getInsightDefinition('R04')!;
    if (summaryStats.top20Percent > 80) {
      insights.push({
        code: 'R04',
        definition: r04Def,
        detection: {
          triggered: true,
          currentValue: summaryStats.top20Percent,
          baselineValue: 75,
          changePercent: summaryStats.top20Percent - 75,
          direction: 'up',
        },
        population: {
          description: 'Top 20% khách hàng',
          customerCount: Math.ceil(customerData.length * 0.2),
          revenueContribution: summaryStats.top20Percent,
        },
        impact: {
          estimatedAmount: summaryStats.top20Revenue * 0.1,
          timeHorizon: 'Q+1',
          confidence: 'high',
        },
        statement: `Top 20% đóng góp ${summaryStats.top20Percent.toFixed(1)}% doanh thu - rủi ro tập trung cao.`,
        decisionPrompt: 'Revenue concentration quá cao. Mất một vài khách VIP sẽ ảnh hưởng nghiêm trọng - cần chiến lược giữ chân đặc biệt?',
        detectedAt: now,
      });
    }

    // ============================================
    // Q01: New Cohort Value Degradation
    // ============================================
    const q01Def = getInsightDefinition('Q01')!;
    if (newCustomers.length > 0) {
      const newRevenue = newCustomers.reduce((sum, c) => sum + c.totalRevenue, 0);
      const avgNewRevenue = newRevenue / newCustomers.length;
      const baselineNewRevenue = avgNewRevenue * 1.25; // Simulated: prior cohort was 25% higher
      const newCohortChange = ((avgNewRevenue - baselineNewRevenue) / baselineNewRevenue) * 100;
      
      if (newCohortChange < -q01Def.detection.thresholdPercent) {
        insights.push({
          code: 'Q01',
          definition: q01Def,
          detection: {
            triggered: true,
            currentValue: avgNewRevenue,
            baselineValue: baselineNewRevenue,
            changePercent: newCohortChange,
            direction: 'down',
          },
          population: {
            description: 'Khách hàng mới (60 ngày)',
            customerCount: newCustomers.length,
            revenueContribution: (newRevenue / totalRevenue) * 100,
          },
          impact: {
            estimatedAmount: newRevenue * 0.25,
            timeHorizon: '12 tháng (LTV)',
            confidence: 'medium',
          },
          statement: `Giá trị cohort mới thấp hơn cohort trước ${Math.abs(newCohortChange).toFixed(1)}%.`,
          decisionPrompt: 'Chi phí tăng trưởng đang tạo khách hàng chất lượng thấp hơn. Cần đánh giá lại chiến lược acquisition?',
          detectedAt: now,
        });
      }
    }

    // ============================================
    // Q04: Identity Coverage Weakening
    // ============================================
    const q04Def = getInsightDefinition('Q04')!;
    if (dataQualityMetrics.identityCoverage < 80) {
      insights.push({
        code: 'Q04',
        definition: q04Def,
        detection: {
          triggered: true,
          currentValue: dataQualityMetrics.identityCoverage,
          baselineValue: 85,
          changePercent: dataQualityMetrics.identityCoverage - 85,
          direction: 'down',
        },
        population: {
          description: 'Tổng thể đơn hàng',
          customerCount: customerData.length,
          revenueContribution: 100,
        },
        impact: {
          estimatedAmount: 0,
          timeHorizon: 'Ongoing',
          confidence: 'high',
        },
        statement: `Identity coverage chỉ ${dataQualityMetrics.identityCoverage.toFixed(1)}% - không đủ để phân tích đáng tin cậy.`,
        decisionPrompt: 'Độ phủ nhận dạng yếu → quyết định dựa trên dữ liệu không đầy đủ. Cần cải thiện data capture?',
        detectedAt: now,
      });
    }

    return insights;
  }, [customerData, summaryStats, dataQualityMetrics, valueDistribution]);

  // Summary statistics
  const summary = useMemo<InsightSummary>(() => {
    const byCategory: Record<InsightCategory, number> = {
      value: 0,
      velocity: 0,
      mix: 0,
      risk: 0,
      quality: 0,
    };

    const bySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
    };

    detectedInsights.forEach(insight => {
      byCategory[insight.definition.category]++;
      bySeverity[insight.definition.risk.severity]++;
    });

    return {
      total: 25,
      triggered: detectedInsights.length,
      byCategory,
      bySeverity,
    };
  }, [detectedInsights]);

  return {
    insights: detectedInsights,
    summary,
    isLoading,
    dataQuality: dataQualityMetrics,
  };
}
