/**
 * useMDPDataReadiness - Hook for MDP Data Readiness Check
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { useMemo } from 'react';

export interface DataSourceStatus {
  id: string;
  name: string;
  nameEn: string;
  table: string;
  category: 'orders' | 'marketing' | 'costs' | 'cash';
  status: 'ready' | 'partial' | 'missing' | 'loading';
  recordCount: number;
  requiredFields: string[];
  missingFields: string[];
  completenessPercent: number;
  lastUpdated: string | null;
  importance: 'critical' | 'important' | 'optional';
  description: string;
  descriptionEn: string;
}

export interface DataReadinessSummary {
  overallScore: number;
  readySources: number;
  partialSources: number;
  missingSources: number;
  criticalMissing: string[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    message: string;
    messageEn: string;
    action: string;
    actionEn: string;
  }[];
}

export interface MDPDataReadinessResult {
  sources: DataSourceStatus[];
  summary: DataReadinessSummary;
  isLoading: boolean;
  refetch: () => void;
}

export function useMDPDataReadiness(): MDPDataReadinessResult {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  // Check cdp_orders
  const ordersQuery = useQuery({
    queryKey: ['mdp-readiness-orders', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      // Get count using select with head option
      const countQuery = buildSelectQuery('cdp_orders', 'id');
      const { data: countData, error } = await countQuery;
      if (error) throw error;
      const count = (countData as any[])?.length || 0;

      const { data: sample } = await buildSelectQuery('cdp_orders', '*')
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: isReady,
  });

  // Check campaigns
  const campaignsQuery = useQuery({
    queryKey: ['mdp-readiness-campaigns', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      const { data: countData, error } = await buildSelectQuery('promotion_campaigns', 'id');
      if (error) throw error;
      const count = (countData as any[])?.length || 0;

      const { data: sample } = await buildSelectQuery('promotion_campaigns', '*')
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: isReady,
  });

  // Check marketing expenses
  const marketingExpensesQuery = useQuery({
    queryKey: ['mdp-readiness-marketing-expenses', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      const { data: countData, error } = await buildSelectQuery('marketing_expenses', 'id');
      if (error) throw error;
      const count = (countData as any[])?.length || 0;

      const { data: sample } = await buildSelectQuery('marketing_expenses', '*')
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: isReady,
  });

  // Check channel fees
  const channelFeesQuery = useQuery({
    queryKey: ['mdp-readiness-channel-fees', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      const { data: countData, error } = await buildSelectQuery('channel_fees', 'id');
      if (error) throw error;
      const count = (countData as any[])?.length || 0;

      const { data: sample } = await buildSelectQuery('channel_fees', '*')
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: isReady,
  });

  // Check products
  const productsQuery = useQuery({
    queryKey: ['mdp-readiness-products', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      const { data: countData, error } = await buildSelectQuery('external_products', 'id');
      if (error) throw error;
      const count = (countData as any[])?.length || 0;

      const { data: sample } = await buildSelectQuery('external_products', '*')
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: isReady,
  });

  // Check settlements
  const settlementsQuery = useQuery({
    queryKey: ['mdp-readiness-settlements', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      const { data: countData, error } = await buildSelectQuery('channel_settlements', 'id');
      if (error) throw error;
      const count = (countData as any[])?.length || 0;

      const { data: sample } = await buildSelectQuery('channel_settlements', '*')
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: isReady,
  });

  const isLoading = ordersQuery.isLoading || campaignsQuery.isLoading || 
    marketingExpensesQuery.isLoading || channelFeesQuery.isLoading ||
    productsQuery.isLoading || settlementsQuery.isLoading;

  // Build sources status
  const sources = useMemo<DataSourceStatus[]>(() => {
    const checkFieldCompleteness = (sample: Record<string, unknown> | null, requiredFields: string[]): { missing: string[]; percent: number } => {
      if (!sample) return { missing: requiredFields, percent: 0 };
      
      const missing = requiredFields.filter(field => {
        const value = sample[field];
        return value === null || value === undefined || value === '';
      });
      
      const percent = ((requiredFields.length - missing.length) / requiredFields.length) * 100;
      return { missing, percent };
    };

    const getStatus = (count: number, completeness: number): DataSourceStatus['status'] => {
      if (count === 0) return 'missing';
      if (completeness < 50) return 'partial';
      return 'ready';
    };

    const ordersFields = ['channel', 'order_at', 'gross_revenue', 'cogs', 'net_revenue'];
    const ordersCheck = checkFieldCompleteness(ordersQuery.data?.sample as any, ordersFields);
    
    const campaignsFields = ['campaign_name', 'channel', 'actual_cost', 'total_revenue'];
    const campaignsCheck = checkFieldCompleteness(campaignsQuery.data?.sample as any, campaignsFields);

    const marketingExpensesFields = ['channel', 'expense_date', 'amount'];
    const marketingExpensesCheck = checkFieldCompleteness(marketingExpensesQuery.data?.sample as any, marketingExpensesFields);

    const channelFeesFields = ['fee_type', 'amount', 'fee_date'];
    const channelFeesCheck = checkFieldCompleteness(channelFeesQuery.data?.sample as any, channelFeesFields);

    const productsFields = ['name', 'selling_price', 'cost_price'];
    const productsCheck = checkFieldCompleteness(productsQuery.data?.sample as any, productsFields);

    const settlementsFields = ['period_start', 'period_end', 'net_amount'];
    const settlementsCheck = checkFieldCompleteness(settlementsQuery.data?.sample as any, settlementsFields);

    return [
      {
        id: 'cdp_orders',
        name: 'Đơn hàng',
        nameEn: 'Orders',
        table: 'cdp_orders',
        category: 'orders',
        status: ordersQuery.isLoading ? 'loading' : getStatus(ordersQuery.data?.count || 0, ordersCheck.percent),
        recordCount: ordersQuery.data?.count || 0,
        requiredFields: ordersFields,
        missingFields: ordersCheck.missing,
        completenessPercent: ordersCheck.percent,
        lastUpdated: null,
        importance: 'critical',
        description: 'Dữ liệu đơn hàng - nguồn sự thật về doanh thu',
        descriptionEn: 'Order data - source of truth for revenue',
      },
      {
        id: 'promotion_campaigns',
        name: 'Campaigns Marketing',
        nameEn: 'Marketing Campaigns',
        table: 'promotion_campaigns',
        category: 'marketing',
        status: campaignsQuery.isLoading ? 'loading' : getStatus(campaignsQuery.data?.count || 0, campaignsCheck.percent),
        recordCount: campaignsQuery.data?.count || 0,
        requiredFields: campaignsFields,
        missingFields: campaignsCheck.missing,
        completenessPercent: campaignsCheck.percent,
        lastUpdated: null,
        importance: 'critical',
        description: 'Campaigns quảng cáo - cần cho Profit Attribution',
        descriptionEn: 'Ad campaigns - needed for Profit Attribution',
      },
      {
        id: 'marketing_expenses',
        name: 'Chi phí Marketing',
        nameEn: 'Marketing Expenses',
        table: 'marketing_expenses',
        category: 'marketing',
        status: marketingExpensesQuery.isLoading ? 'loading' : getStatus(marketingExpensesQuery.data?.count || 0, marketingExpensesCheck.percent),
        recordCount: marketingExpensesQuery.data?.count || 0,
        requiredFields: marketingExpensesFields,
        missingFields: marketingExpensesCheck.missing,
        completenessPercent: marketingExpensesCheck.percent,
        lastUpdated: null,
        importance: 'critical',
        description: 'Chi phí quảng cáo - cần cho Cash Impact',
        descriptionEn: 'Ad spend - needed for Cash Impact',
      },
      {
        id: 'channel_fees',
        name: 'Phí sàn TMĐT',
        nameEn: 'Platform Fees',
        table: 'channel_fees',
        category: 'costs',
        status: channelFeesQuery.isLoading ? 'loading' : getStatus(channelFeesQuery.data?.count || 0, channelFeesCheck.percent),
        recordCount: channelFeesQuery.data?.count || 0,
        requiredFields: channelFeesFields,
        missingFields: channelFeesCheck.missing,
        completenessPercent: channelFeesCheck.percent,
        lastUpdated: null,
        importance: 'important',
        description: 'Phí sàn, hoa hồng - cần cho True Profit',
        descriptionEn: 'Platform fees - needed for True Profit',
      },
      {
        id: 'external_products',
        name: 'Danh mục sản phẩm',
        nameEn: 'Product Catalog',
        table: 'external_products',
        category: 'costs',
        status: productsQuery.isLoading ? 'loading' : getStatus(productsQuery.data?.count || 0, productsCheck.percent),
        recordCount: productsQuery.data?.count || 0,
        requiredFields: productsFields,
        missingFields: productsCheck.missing,
        completenessPercent: productsCheck.percent,
        lastUpdated: null,
        importance: 'important',
        description: 'Sản phẩm với giá vốn - cần cho COGS',
        descriptionEn: 'Products with cost - needed for COGS',
      },
      {
        id: 'channel_settlements',
        name: 'Thanh toán từ sàn',
        nameEn: 'Channel Settlements',
        table: 'channel_settlements',
        category: 'cash',
        status: settlementsQuery.isLoading ? 'loading' : getStatus(settlementsQuery.data?.count || 0, settlementsCheck.percent),
        recordCount: settlementsQuery.data?.count || 0,
        requiredFields: settlementsFields,
        missingFields: settlementsCheck.missing,
        completenessPercent: settlementsCheck.percent,
        lastUpdated: null,
        importance: 'important',
        description: 'Thanh toán từ sàn - cần cho Cash Flow',
        descriptionEn: 'Settlements - needed for Cash Flow',
      },
    ];
  }, [
    ordersQuery.data, ordersQuery.isLoading,
    campaignsQuery.data, campaignsQuery.isLoading,
    marketingExpensesQuery.data, marketingExpensesQuery.isLoading,
    channelFeesQuery.data, channelFeesQuery.isLoading,
    productsQuery.data, productsQuery.isLoading,
    settlementsQuery.data, settlementsQuery.isLoading,
  ]);

  // Build summary
  const summary = useMemo<DataReadinessSummary>(() => {
    const readySources = sources.filter(s => s.status === 'ready').length;
    const partialSources = sources.filter(s => s.status === 'partial').length;
    const missingSources = sources.filter(s => s.status === 'missing').length;
    
    const criticalMissing = sources
      .filter(s => s.importance === 'critical' && s.status === 'missing')
      .map(s => s.name);

    const totalWeight = sources.reduce((sum, s) => {
      const weight = s.importance === 'critical' ? 3 : s.importance === 'important' ? 2 : 1;
      return sum + weight;
    }, 0);

    const achievedWeight = sources.reduce((sum, s) => {
      const weight = s.importance === 'critical' ? 3 : s.importance === 'important' ? 2 : 1;
      const score = s.status === 'ready' ? 1 : s.status === 'partial' ? 0.5 : 0;
      return sum + (weight * score);
    }, 0);

    const overallScore = totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;

    const recommendations: DataReadinessSummary['recommendations'] = [];

    if (criticalMissing.length > 0) {
      recommendations.push({
        priority: 'high',
        message: `Thiếu dữ liệu quan trọng: ${criticalMissing.join(', ')}`,
        messageEn: `Missing critical data: ${criticalMissing.join(', ')}`,
        action: 'Kết nối nguồn dữ liệu hoặc import file',
        actionEn: 'Connect data source or import file',
      });
    }

    if (partialSources > 0) {
      recommendations.push({
        priority: 'medium',
        message: `${partialSources} nguồn dữ liệu chưa đầy đủ`,
        messageEn: `${partialSources} data sources are incomplete`,
        action: 'Kiểm tra và bổ sung các trường còn thiếu',
        actionEn: 'Check and fill missing fields',
      });
    }

    return {
      overallScore,
      readySources,
      partialSources,
      missingSources,
      criticalMissing,
      recommendations,
    };
  }, [sources]);

  const refetch = () => {
    ordersQuery.refetch();
    campaignsQuery.refetch();
    marketingExpensesQuery.refetch();
    channelFeesQuery.refetch();
    productsQuery.refetch();
    settlementsQuery.refetch();
  };

  return {
    sources,
    summary,
    isLoading,
    refetch,
  };
}
