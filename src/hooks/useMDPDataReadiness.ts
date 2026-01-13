import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
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
  const { data: tenantId } = useActiveTenantId();

  // Check external_orders
  const ordersQuery = useQuery({
    queryKey: ['mdp-readiness-orders', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      const { count, error } = await supabase
        .from('external_orders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      
      if (error) throw error;

      // Get a sample to check fields
      const { data: sample } = await supabase
        .from('external_orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: !!tenantId,
  });

  // Check order items
  const orderItemsQuery = useQuery({
    queryKey: ['mdp-readiness-order-items', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      const { count, error } = await supabase
        .from('external_order_items')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      
      if (error) throw error;

      const { data: sample } = await supabase
        .from('external_order_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: !!tenantId,
  });

  // Check campaigns
  const campaignsQuery = useQuery({
    queryKey: ['mdp-readiness-campaigns', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      const { count, error } = await supabase
        .from('promotion_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      
      if (error) throw error;

      const { data: sample } = await supabase
        .from('promotion_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: !!tenantId,
  });

  // Check marketing expenses
  const marketingExpensesQuery = useQuery({
    queryKey: ['mdp-readiness-marketing-expenses', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      const { count, error } = await supabase
        .from('marketing_expenses')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      
      if (error) throw error;

      const { data: sample } = await supabase
        .from('marketing_expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: !!tenantId,
  });

  // Check channel analytics
  const channelAnalyticsQuery = useQuery({
    queryKey: ['mdp-readiness-channel-analytics', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      const { count, error } = await supabase
        .from('channel_analytics')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      
      if (error) throw error;

      const { data: sample } = await supabase
        .from('channel_analytics')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: !!tenantId,
  });

  // Check channel fees
  const channelFeesQuery = useQuery({
    queryKey: ['mdp-readiness-channel-fees', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      const { count, error } = await supabase
        .from('channel_fees')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      
      if (error) throw error;

      const { data: sample } = await supabase
        .from('channel_fees')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: !!tenantId,
  });

  // Check products
  const productsQuery = useQuery({
    queryKey: ['mdp-readiness-products', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      const { count, error } = await supabase
        .from('external_products')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      
      if (error) throw error;

      const { data: sample } = await supabase
        .from('external_products')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: !!tenantId,
  });

  // Check settlements
  const settlementsQuery = useQuery({
    queryKey: ['mdp-readiness-settlements', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      const { count, error } = await supabase
        .from('channel_settlements')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      
      if (error) throw error;

      const { data: sample } = await supabase
        .from('channel_settlements')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: !!tenantId,
  });

  // Check expenses
  const expensesQuery = useQuery({
    queryKey: ['mdp-readiness-expenses', tenantId],
    queryFn: async () => {
      if (!tenantId) return { count: 0, sample: null };
      
      const { count, error } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      
      if (error) throw error;

      const { data: sample } = await supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle();

      return { count: count || 0, sample };
    },
    enabled: !!tenantId,
  });

  const isLoading = ordersQuery.isLoading || orderItemsQuery.isLoading || campaignsQuery.isLoading ||
    marketingExpensesQuery.isLoading || channelAnalyticsQuery.isLoading || channelFeesQuery.isLoading ||
    productsQuery.isLoading || settlementsQuery.isLoading || expensesQuery.isLoading;

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

    // External Orders
    const ordersFields = ['channel', 'order_date', 'status', 'total_amount', 'payment_status', 'cost_of_goods', 'seller_income'];
    const ordersCheck = checkFieldCompleteness(ordersQuery.data?.sample, ordersFields);
    
    // Order Items
    const orderItemsFields = ['product_name', 'quantity', 'unit_price', 'cost_price'];
    const orderItemsCheck = checkFieldCompleteness(orderItemsQuery.data?.sample, orderItemsFields);

    // Campaigns
    const campaignsFields = ['campaign_name', 'channel', 'actual_cost', 'total_revenue', 'start_date', 'end_date'];
    const campaignsCheck = checkFieldCompleteness(campaignsQuery.data?.sample, campaignsFields);

    // Marketing Expenses
    const marketingExpensesFields = ['channel', 'expense_date', 'amount'];
    const marketingExpensesCheck = checkFieldCompleteness(marketingExpensesQuery.data?.sample, marketingExpensesFields);

    // Channel Analytics
    const channelAnalyticsFields = ['channel', 'analytics_date', 'impressions', 'clicks', 'spend'];
    const channelAnalyticsCheck = checkFieldCompleteness(channelAnalyticsQuery.data?.sample, channelAnalyticsFields);

    // Channel Fees
    const channelFeesFields = ['fee_type', 'amount'];
    const channelFeesCheck = checkFieldCompleteness(channelFeesQuery.data?.sample, channelFeesFields);

    // Products
    const productsFields = ['name', 'selling_price', 'cost_price'];
    const productsCheck = checkFieldCompleteness(productsQuery.data?.sample, productsFields);

    // Settlements
    const settlementsFields = ['period_start', 'period_end', 'net_amount', 'gross_sales'];
    const settlementsCheck = checkFieldCompleteness(settlementsQuery.data?.sample, settlementsFields);

    // Expenses
    const expensesFields = ['category', 'amount', 'expense_date'];
    const expensesCheck = checkFieldCompleteness(expensesQuery.data?.sample, expensesFields);

    return [
      {
        id: 'external_orders',
        name: 'Đơn hàng',
        nameEn: 'Orders',
        table: 'external_orders',
        category: 'orders',
        status: ordersQuery.isLoading ? 'loading' : getStatus(ordersQuery.data?.count || 0, ordersCheck.percent),
        recordCount: ordersQuery.data?.count || 0,
        requiredFields: ordersFields,
        missingFields: ordersCheck.missing,
        completenessPercent: ordersCheck.percent,
        lastUpdated: null,
        importance: 'critical',
        description: 'Dữ liệu đơn hàng từ các kênh bán hàng - nguồn sự thật về doanh thu',
        descriptionEn: 'Order data from sales channels - source of truth for revenue',
      },
      {
        id: 'external_order_items',
        name: 'Chi tiết đơn hàng',
        nameEn: 'Order Items',
        table: 'external_order_items',
        category: 'orders',
        status: orderItemsQuery.isLoading ? 'loading' : getStatus(orderItemsQuery.data?.count || 0, orderItemsCheck.percent),
        recordCount: orderItemsQuery.data?.count || 0,
        requiredFields: orderItemsFields,
        missingFields: orderItemsCheck.missing,
        completenessPercent: orderItemsCheck.percent,
        lastUpdated: null,
        importance: 'important',
        description: 'Chi tiết sản phẩm trong đơn - cần cho SKU Profitability',
        descriptionEn: 'Product details in orders - needed for SKU Profitability',
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
        description: 'Thông tin campaigns quảng cáo - cần cho Profit Attribution',
        descriptionEn: 'Ad campaign data - needed for Profit Attribution',
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
        description: 'Chi phí quảng cáo theo ngày/kênh - cần cho Cash Impact',
        descriptionEn: 'Daily ad spend by channel - needed for Cash Impact',
      },
      {
        id: 'channel_analytics',
        name: 'Ads Performance',
        nameEn: 'Ads Performance',
        table: 'channel_analytics',
        category: 'marketing',
        status: channelAnalyticsQuery.isLoading ? 'loading' : getStatus(channelAnalyticsQuery.data?.count || 0, channelAnalyticsCheck.percent),
        recordCount: channelAnalyticsQuery.data?.count || 0,
        requiredFields: channelAnalyticsFields,
        missingFields: channelAnalyticsCheck.missing,
        completenessPercent: channelAnalyticsCheck.percent,
        lastUpdated: null,
        importance: 'optional',
        description: 'Metrics từ Facebook/Google Ads - cần cho Funnel Analysis',
        descriptionEn: 'Metrics from Facebook/Google Ads - needed for Funnel Analysis',
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
        description: 'Chi phí phí sàn, hoa hồng - cần cho True Profit',
        descriptionEn: 'Platform fees, commissions - needed for True Profit',
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
        description: 'Sản phẩm với giá vốn - cần cho COGS calculation',
        descriptionEn: 'Products with cost price - needed for COGS calculation',
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
        description: 'Thanh toán từ Shopee/Lazada - cần cho Cash Flow tracking',
        descriptionEn: 'Settlements from Shopee/Lazada - needed for Cash Flow tracking',
      },
      {
        id: 'expenses',
        name: 'Chi phí vận hành',
        nameEn: 'Operating Expenses',
        table: 'expenses',
        category: 'costs',
        status: expensesQuery.isLoading ? 'loading' : getStatus(expensesQuery.data?.count || 0, expensesCheck.percent),
        recordCount: expensesQuery.data?.count || 0,
        requiredFields: expensesFields,
        missingFields: expensesCheck.missing,
        completenessPercent: expensesCheck.percent,
        lastUpdated: null,
        importance: 'optional',
        description: 'Chi phí chung (lương, thuê mặt bằng...) - tùy chọn',
        descriptionEn: 'General expenses (payroll, rent...) - optional',
      },
    ];
  }, [
    ordersQuery.data, ordersQuery.isLoading,
    orderItemsQuery.data, orderItemsQuery.isLoading,
    campaignsQuery.data, campaignsQuery.isLoading,
    marketingExpensesQuery.data, marketingExpensesQuery.isLoading,
    channelAnalyticsQuery.data, channelAnalyticsQuery.isLoading,
    channelFeesQuery.data, channelFeesQuery.isLoading,
    productsQuery.data, productsQuery.isLoading,
    settlementsQuery.data, settlementsQuery.isLoading,
    expensesQuery.data, expensesQuery.isLoading,
  ]);

  // Build summary
  const summary = useMemo<DataReadinessSummary>(() => {
    const readySources = sources.filter(s => s.status === 'ready').length;
    const partialSources = sources.filter(s => s.status === 'partial').length;
    const missingSources = sources.filter(s => s.status === 'missing').length;
    
    const criticalMissing = sources
      .filter(s => s.importance === 'critical' && s.status === 'missing')
      .map(s => s.name);

    // Calculate overall score
    const weights = { critical: 3, important: 2, optional: 1 };
    let totalWeight = 0;
    let weightedScore = 0;

    sources.forEach(s => {
      const weight = weights[s.importance];
      totalWeight += weight;
      
      if (s.status === 'ready') {
        weightedScore += weight * 100;
      } else if (s.status === 'partial') {
        weightedScore += weight * s.completenessPercent;
      }
    });

    const overallScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

    // Build recommendations
    const recommendations: DataReadinessSummary['recommendations'] = [];

    // Check critical missing
    if (sources.find(s => s.id === 'external_orders' && s.status === 'missing')) {
      recommendations.push({
        priority: 'high',
        message: 'Chưa có dữ liệu đơn hàng - MDP không thể tính Profit Attribution',
        messageEn: 'No order data - MDP cannot calculate Profit Attribution',
        action: 'Import đơn hàng từ Shopee/Lazada/TikTok hoặc nhập thủ công',
        actionEn: 'Import orders from Shopee/Lazada/TikTok or enter manually',
      });
    }

    if (sources.find(s => s.id === 'promotion_campaigns' && s.status === 'missing')) {
      recommendations.push({
        priority: 'high',
        message: 'Chưa có dữ liệu campaigns - Không thể phân tích ROI Marketing',
        messageEn: 'No campaign data - Cannot analyze Marketing ROI',
        action: 'Tạo campaigns trong mục Promotion ROI hoặc import từ Ads Manager',
        actionEn: 'Create campaigns in Promotion ROI or import from Ads Manager',
      });
    }

    if (sources.find(s => s.id === 'marketing_expenses' && s.status === 'missing')) {
      recommendations.push({
        priority: 'high',
        message: 'Chưa có chi phí marketing - Cash Impact sẽ không chính xác',
        messageEn: 'No marketing expenses - Cash Impact will be inaccurate',
        action: 'Nhập chi phí quảng cáo hàng ngày theo kênh',
        actionEn: 'Enter daily ad spend by channel',
      });
    }

    // Check partial data quality
    const ordersSource = sources.find(s => s.id === 'external_orders');
    if (ordersSource?.status === 'partial' && ordersSource.missingFields.includes('cost_of_goods')) {
      recommendations.push({
        priority: 'medium',
        message: 'Thiếu giá vốn (COGS) - Contribution Margin sẽ sử dụng estimate 55%',
        messageEn: 'Missing COGS - Contribution Margin will use 55% estimate',
        action: 'Cập nhật giá vốn cho sản phẩm trong Product Catalog',
        actionEn: 'Update cost price for products in Product Catalog',
      });
    }

    if (sources.find(s => s.id === 'channel_settlements' && s.status === 'missing')) {
      recommendations.push({
        priority: 'medium',
        message: 'Chưa có dữ liệu thanh toán - Cash Flow tracking sẽ không chính xác',
        messageEn: 'No settlement data - Cash Flow tracking will be inaccurate',
        action: 'Kết nối API sàn hoặc import báo cáo thanh toán',
        actionEn: 'Connect platform API or import settlement reports',
      });
    }

    if (sources.find(s => s.id === 'channel_analytics' && s.status === 'missing')) {
      recommendations.push({
        priority: 'low',
        message: 'Chưa có dữ liệu Ads - Funnel Analysis sẽ sử dụng estimates',
        messageEn: 'No Ads data - Funnel Analysis will use estimates',
        action: 'Kết nối Facebook Ads hoặc Google Ads (tùy chọn)',
        actionEn: 'Connect Facebook Ads or Google Ads (optional)',
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
    orderItemsQuery.refetch();
    campaignsQuery.refetch();
    marketingExpensesQuery.refetch();
    channelAnalyticsQuery.refetch();
    channelFeesQuery.refetch();
    productsQuery.refetch();
    settlementsQuery.refetch();
    expensesQuery.refetch();
  };

  return {
    sources,
    summary,
    isLoading,
    refetch,
  };
}
