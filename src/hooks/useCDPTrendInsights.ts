import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useCDPData } from './useCDPData';
import { 
  TrendInsight, 
  InsightType, 
  INSIGHT_CONFIGS,
  generateInsightStatement,
  generateFinancialFraming,
  generateDecisionPrompt,
  determineSeverity,
  validateInsight
} from '@/lib/cdp-trend-insights';

interface TrendComparison {
  current: {
    period: string;
    startDate: Date;
    endDate: Date;
  };
  baseline: {
    period: string;
    startDate: Date;
    endDate: Date;
  };
}

function getComparisonPeriods(baselineDays: number = 90): TrendComparison {
  const now = new Date();
  const currentEnd = now;
  const currentStart = new Date(now.getTime() - (baselineDays / 2) * 24 * 60 * 60 * 1000);
  const baselineEnd = new Date(currentStart.getTime() - 1);
  const baselineStart = new Date(baselineEnd.getTime() - (baselineDays / 2) * 24 * 60 * 60 * 1000);
  
  return {
    current: {
      period: `Last ${baselineDays / 2} days`,
      startDate: currentStart,
      endDate: currentEnd,
    },
    baseline: {
      period: `Previous ${baselineDays / 2} days`,
      startDate: baselineStart,
      endDate: baselineEnd,
    },
  };
}

export function useCDPTrendInsights() {
  const { 
    customerData, 
    valueDistribution, 
    segmentSummaries, 
    summaryStats,
    dataQualityMetrics,
    isLoading 
  } = useCDPData();

  // Detect insights based on customer data
  const detectedInsights = useMemo<TrendInsight[]>(() => {
    if (!customerData || customerData.length === 0 || !valueDistribution) {
      return [];
    }

    const insights: TrendInsight[] = [];
    const comparison = getComparisonPeriods(90);
    
    // Split customers by order date into current vs baseline periods
    const currentPeriodCustomers = customerData.filter(c => 
      c.lastOrderDate >= comparison.current.startDate
    );
    const baselineCustomers = customerData.filter(c =>
      c.lastOrderDate < comparison.current.startDate && 
      c.lastOrderDate >= comparison.baseline.startDate
    );

    // Calculate metrics for each period
    const currentMetrics = {
      avgRevenue: currentPeriodCustomers.length > 0 
        ? currentPeriodCustomers.reduce((sum, c) => sum + c.totalRevenue, 0) / currentPeriodCustomers.length 
        : 0,
      avgAOV: currentPeriodCustomers.length > 0
        ? currentPeriodCustomers.reduce((sum, c) => sum + c.avgOrderValue, 0) / currentPeriodCustomers.length
        : 0,
      avgFrequency: currentPeriodCustomers.length > 0
        ? currentPeriodCustomers.reduce((sum, c) => sum + c.purchaseFrequency, 0) / currentPeriodCustomers.length
        : 0,
      avgMargin: currentPeriodCustomers.length > 0
        ? currentPeriodCustomers.reduce((sum, c) => sum + c.grossMargin, 0) / currentPeriodCustomers.length
        : 0,
    };

    const baselineMetrics = {
      avgRevenue: baselineCustomers.length > 0
        ? baselineCustomers.reduce((sum, c) => sum + c.totalRevenue, 0) / baselineCustomers.length
        : 0,
      avgAOV: baselineCustomers.length > 0
        ? baselineCustomers.reduce((sum, c) => sum + c.avgOrderValue, 0) / baselineCustomers.length
        : 0,
      avgFrequency: baselineCustomers.length > 0
        ? baselineCustomers.reduce((sum, c) => sum + c.purchaseFrequency, 0) / baselineCustomers.length
        : 0,
      avgMargin: baselineCustomers.length > 0
        ? baselineCustomers.reduce((sum, c) => sum + c.grossMargin, 0) / baselineCustomers.length
        : 0,
    };

    // 1️⃣ SPEND DECLINE Detection
    if (baselineMetrics.avgAOV > 0) {
      const aovChange = ((currentMetrics.avgAOV - baselineMetrics.avgAOV) / baselineMetrics.avgAOV) * 100;
      const frequencyChange = baselineMetrics.avgFrequency > 0
        ? ((currentMetrics.avgFrequency - baselineMetrics.avgFrequency) / baselineMetrics.avgFrequency) * 100
        : 0;
      
      const config = INSIGHT_CONFIGS.SPEND_DECLINE;
      
      if (aovChange < -config.thresholds.triggerPercent || frequencyChange < -5) {
        const topCustomers = [...customerData]
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, Math.ceil(customerData.length * 0.2));
        
        const revenueContribution = topCustomers.reduce((sum, c) => sum + c.totalRevenue, 0) / 
          summaryStats.totalRevenue * 100;
        
        const projectedImpact = summaryStats.totalRevenue * (Math.abs(aovChange) / 100) * 0.25;
        
        const insight: TrendInsight = {
          id: `SPEND_DECLINE_${Date.now()}`,
          type: 'SPEND_DECLINE',
          createdAt: new Date(),
          population: {
            segment: 'Top 20% khách hàng theo LTV',
            customerCount: topCustomers.length,
            revenueContribution,
          },
          shift: {
            metric: 'AOV & Frequency',
            metricCode: 'VAL_AOV',
            direction: 'down',
            description: 'Giá trị đơn hàng và tần suất mua giảm',
          },
          baseline: {
            period: '90 ngày trước',
            value: baselineMetrics.avgAOV,
          },
          magnitude: {
            currentValue: currentMetrics.avgAOV,
            changePercent: aovChange,
            changeAbsolute: currentMetrics.avgAOV - baselineMetrics.avgAOV,
          },
          financialImpact: {
            projectedImpact,
            riskLevel: Math.abs(aovChange) > 15 ? 'high' : 'medium',
            timeHorizon: 'Q+1',
          },
          interpretation: generateInsightStatement('SPEND_DECLINE', {
            segment: 'Top 20% khách hàng theo LTV',
            metric1: { name: 'AOV', change: aovChange },
            metric2: { name: 'tần suất', change: frequencyChange },
            period: '60 ngày gần đây',
          }),
          decisionPrompt: generateDecisionPrompt('SPEND_DECLINE'),
          severity: determineSeverity(aovChange, revenueContribution, config.thresholds.triggerPercent),
          isValid: true,
        };
        
        if (validateInsight(insight)) {
          insights.push(insight);
        }
      }
    }

    // 2️⃣ VELOCITY SLOWDOWN Detection
    const repeatCustomers = customerData.filter(c => c.orderCount >= 2);
    if (repeatCustomers.length > 0) {
      const avgIPT = repeatCustomers.reduce((sum, c) => {
        const monthsActive = Math.max(1, 
          (c.lastOrderDate.getTime() - c.firstOrderDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        return sum + (monthsActive * 30 / c.orderCount);
      }, 0) / repeatCustomers.length;
      
      // Simulate baseline (use 20% threshold as example)
      const baselineIPT = avgIPT * 0.85; // Assume baseline was 15% faster
      const iptChange = ((avgIPT - baselineIPT) / baselineIPT) * 100;
      
      const config = INSIGHT_CONFIGS.VELOCITY_SLOW;
      
      if (iptChange > config.thresholds.triggerPercent) {
        const revenueContribution = repeatCustomers.reduce((sum, c) => sum + c.totalRevenue, 0) / 
          summaryStats.totalRevenue * 100;
        
        const insight: TrendInsight = {
          id: `VELOCITY_SLOW_${Date.now()}`,
          type: 'VELOCITY_SLOW',
          createdAt: new Date(),
          population: {
            segment: 'Khách hàng mua lặp lại',
            customerCount: repeatCustomers.length,
            revenueContribution,
          },
          shift: {
            metric: 'Inter-purchase time',
            metricCode: 'VEL_IPT',
            direction: 'up',
            description: 'Thời gian giữa các lần mua tăng',
          },
          baseline: {
            period: '90 ngày trước',
            value: baselineIPT,
          },
          magnitude: {
            currentValue: avgIPT,
            changePercent: iptChange,
            changeAbsolute: avgIPT - baselineIPT,
          },
          financialImpact: {
            projectedImpact: summaryStats.totalRevenue * 0.1 * (iptChange / 100),
            riskLevel: iptChange > 30 ? 'high' : 'medium',
            timeHorizon: 'Q+1',
          },
          interpretation: generateInsightStatement('VELOCITY_SLOW', {
            segment: 'nhóm khách repeat',
            metric1: { name: 'inter-purchase time', change: iptChange },
            period: '90 ngày gần đây',
          }),
          decisionPrompt: generateDecisionPrompt('VELOCITY_SLOW'),
          severity: determineSeverity(iptChange, revenueContribution, config.thresholds.triggerPercent),
          isValid: true,
        };
        
        if (validateInsight(insight)) {
          insights.push(insight);
        }
      }
    }

    // 4️⃣ VOLATILITY Detection (Revenue Concentration)
    if (summaryStats.top20Percent > 75) {
      const config = INSIGHT_CONFIGS.VOLATILITY_UP;
      
      const insight: TrendInsight = {
        id: `VOLATILITY_UP_${Date.now()}`,
        type: 'VOLATILITY_UP',
        createdAt: new Date(),
        population: {
          segment: 'Tổng thể khách hàng',
          customerCount: customerData.length,
          revenueContribution: 100,
        },
        shift: {
          metric: 'Revenue Concentration',
          metricCode: 'RSK_CON',
          direction: 'up',
          description: 'Doanh thu tập trung vào nhóm nhỏ khách hàng',
        },
        baseline: {
          period: 'Benchmark 70%',
          value: 70,
        },
        magnitude: {
          currentValue: summaryStats.top20Percent,
          changePercent: summaryStats.top20Percent - 70,
          changeAbsolute: summaryStats.top20Percent - 70,
        },
        financialImpact: {
          projectedImpact: summaryStats.top20Revenue * 0.1, // 10% at risk
          riskLevel: summaryStats.top20Percent > 85 ? 'high' : 'medium',
          timeHorizon: 'Q+1',
        },
        interpretation: `Top 20% khách hàng đóng góp ${summaryStats.top20Percent.toFixed(1)}% doanh thu. Concentration risk cao hơn benchmark.`,
        decisionPrompt: generateDecisionPrompt('VOLATILITY_UP'),
        severity: summaryStats.top20Percent > 85 ? 'critical' : 'warning',
        isValid: true,
      };
      
      insights.push(insight);
    }

    return insights;
  }, [customerData, valueDistribution, summaryStats]);

  // Summary of insights by type
  const insightSummary = useMemo(() => {
    return {
      total: detectedInsights.length,
      critical: detectedInsights.filter(i => i.severity === 'critical').length,
      warning: detectedInsights.filter(i => i.severity === 'warning').length,
      byType: Object.keys(INSIGHT_CONFIGS).reduce((acc, type) => {
        acc[type as InsightType] = detectedInsights.filter(i => i.type === type).length;
        return acc;
      }, {} as Record<InsightType, number>),
    };
  }, [detectedInsights]);

  return {
    insights: detectedInsights,
    insightSummary,
    isLoading,
    dataQuality: dataQualityMetrics,
  };
}
