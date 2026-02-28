/**
 * Hook: useHypothesisQuery
 * Query real customer data from v_cdp_customer_research based on hypothesis conditions
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 * @domain CDP Explore
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

export interface HypothesisCondition {
  id: string;
  metric: string;
  operator: string;
  value: string;
  timeframe: string;
}

export interface HypothesisResult {
  customerCount: number;
  percentOfTotal: number;
  avgAOV: number;
  avgAOVDelta: number;
  returnRate: number;
  returnRateDelta: number;
  totalSpend: number;
  marginContribution: number;
  systemSuggestion?: string;
  isRealData: boolean;
  dataSource: string;
}

// Map condition operators to SQL operators
function mapOperator(operator: string): string {
  const map: Record<string, string> = {
    'gt': '>',
    'lt': '<',
    'gte': '>=',
    'lte': '<=',
  };
  return map[operator] || '=';
}

// Build Supabase filters from conditions
function buildFilters(
  query: any,
  conditions: HypothesisCondition[]
): any {
  let filteredQuery = query;

  for (const condition of conditions) {
    const { metric, operator, value } = condition;
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) continue;

    // Handle percentage-based operators (change_up, change_down)
    if (operator === 'change_up' || operator === 'change_down') {
      if (operator === 'change_down') {
        filteredQuery = filteredQuery.eq('trend', 'down');
      } else {
        filteredQuery = filteredQuery.eq('trend', 'up');
      }
      continue;
    }

    // Map metric to column
    const columnMap: Record<string, string> = {
      'aov': 'aov',
      'order_count': 'order_count',
      'total_spend': 'total_spend',
      'repurchase_cycle': 'repurchase_cycle',
      'return_rate': 'return_rate',
      'margin_contribution': 'margin_contribution',
    };

    const column = columnMap[metric];
    if (!column) continue;

    const sqlOp = mapOperator(operator);
    
    switch (sqlOp) {
      case '>':
        filteredQuery = filteredQuery.gt(column, numValue);
        break;
      case '<':
        filteredQuery = filteredQuery.lt(column, numValue);
        break;
      case '>=':
        filteredQuery = filteredQuery.gte(column, numValue);
        break;
      case '<=':
        filteredQuery = filteredQuery.lte(column, numValue);
        break;
    }
  }

  return filteredQuery;
}

// Generate system suggestion based on data
function generateSuggestion(
  avgAOVDelta: number,
  returnRate: number,
  customerCount: number,
  percentOfTotal: number
): string | undefined {
  if (avgAOVDelta < -15 && percentOfTotal > 10) {
    return 'Dữ liệu cho thấy xu hướng suy giảm giá trị ở tập khách này. Đề xuất rà soát rủi ro doanh thu và dòng tiền liên quan.';
  }
  if (returnRate > 15) {
    return 'Tỷ lệ hoàn trả cao hơn mức trung bình có thể ảnh hưởng đến biên lợi nhuận thực tế. Cần được xem xét ở cấp điều hành.';
  }
  if (percentOfTotal > 30 && avgAOVDelta > 10) {
    return 'Tập khách này chiếm tỷ trọng lớn với giá trị đơn hàng tốt. Cân nhắc ưu tiên giữ chân và phát triển.';
  }
  return undefined;
}

export function useHypothesisQuery(conditions: HypothesisCondition[]) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-hypothesis-query', tenantId, JSON.stringify(conditions)],
    queryFn: async (): Promise<HypothesisResult | null> => {
      if (!tenantId || conditions.length === 0) return null;

      try {
        // Get total customer count for percentage calculation
        const { data: totalData } = await buildSelectQuery('v_cdp_customer_research', 'id');
        const totalCount = totalData?.length || 0;

        // Get tenant average AOV for delta calculation
        const { data: avgData } = await buildSelectQuery('v_cdp_customer_research', 'aov');
        const avgDataRows = (avgData || []) as unknown as Array<{ aov: number }>;
        let _aovSum = 0;
        for (const r of avgDataRows) _aovSum += Number(r.aov) || 0;
        const tenantAvgAOV = avgDataRows.length > 0 ? _aovSum / avgDataRows.length : 0;

        // Build filtered query
        let query = buildSelectQuery('v_cdp_customer_research', '*');
        query = buildFilters(query, conditions);

        const { data, error } = await query;

        if (error) {
          console.error('Error querying hypothesis:', error);
          return null;
        }

        const dataRows = (data || []) as unknown as Array<Record<string, unknown>>;

        if (dataRows.length === 0) {
          return {
            customerCount: 0,
            percentOfTotal: 0,
            avgAOV: 0,
            avgAOVDelta: 0,
            returnRate: 0,
            returnRateDelta: 0,
            totalSpend: 0,
            marginContribution: 0,
            isRealData: true,
            dataSource: 'v_cdp_customer_research',
            systemSuggestion: 'Không tìm thấy khách hàng phù hợp với điều kiện này. Hãy thử điều chỉnh giá trị hoặc operator.',
          };
        }

        // Calculate aggregates
        const customerCount = dataRows.length;
        const percentOfTotal = totalCount ? Math.round((customerCount / totalCount) * 100 * 10) / 10 : 0;
        let totalSpend = 0, _aovAcc = 0, _rrAcc = 0, marginContribution = 0;
        for (const r of dataRows) {
          totalSpend += Number(r.total_spend) || 0;
          _aovAcc += Number(r.aov) || 0;
          _rrAcc += Number(r.return_rate) || 0;
          marginContribution += Number(r.margin_contribution) || 0;
        }
        const avgAOV = _aovAcc / customerCount;
        const avgAOVDelta = tenantAvgAOV > 0 ? ((avgAOV - tenantAvgAOV) / tenantAvgAOV) * 100 : 0;
        const returnRate = _rrAcc / customerCount;

        // Calculate return rate delta (assume 10% baseline)
        const baselineReturnRate = 10;
        const returnRateDelta = returnRate - baselineReturnRate;

        const suggestion = generateSuggestion(avgAOVDelta, returnRate, customerCount, percentOfTotal);

        return {
          customerCount,
          percentOfTotal,
          avgAOV: Math.round(avgAOV),
          avgAOVDelta: Math.round(avgAOVDelta * 10) / 10,
          returnRate: Math.round(returnRate * 10) / 10,
          returnRateDelta: Math.round(returnRateDelta * 10) / 10,
          totalSpend: Math.round(totalSpend),
          marginContribution: Math.round(marginContribution),
          isRealData: true,
          dataSource: 'v_cdp_customer_research',
          systemSuggestion: suggestion,
        };
      } catch (err) {
        console.error('Error in hypothesis query:', err);
        return null;
      }
    },
    enabled: isReady && conditions.length > 0,
    staleTime: 30 * 1000,
  });
}

// Mutation to save hypothesis as a new segment
export function useSaveAsSegment() {
  const { buildInsertQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      name, 
      description, 
      conditions 
    }: { 
      name: string; 
      description: string; 
      conditions: HypothesisCondition[];
    }) => {
      if (!tenantId) throw new Error('No tenant');

      // Convert conditions to definition_json format
      const rules = conditions.map(c => ({
        field: c.metric,
        op: c.operator,
        value: c.value,
        timeframe: c.timeframe,
      }));

      const { data, error } = await buildInsertQuery('cdp_segments', {
        name,
        description,
        definition_json: { rules },
        status: 'active',
        owner_role: 'user',
      })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Đã lưu tập khách hàng mới');
      queryClient.invalidateQueries({ queryKey: ['cdp-population-catalog'] });
    },
    onError: (error: any) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
}
