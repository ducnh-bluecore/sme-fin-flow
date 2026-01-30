/**
 * CDP Tier Data Hook
 * 
 * Query tier data directly from cdp_value_tier_membership_daily
 * when filtering by tier (TOP10, TOP20, REST)
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';

export interface TierData {
  tierLabel: string;
  customerCount: number;
  totalRevenue: number;
  estimatedEquity: number;
  avgRevenuePerCustomer: number;
}

/**
 * Fetch tier statistics for a specific tier label
 */
export function useCDPTierData(tierLabel: string | undefined) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp', 'tier-data', tenantId, tierLabel],
    queryFn: async (): Promise<TierData | null> => {
      if (!tenantId || !tierLabel) return null;

      // Get customer IDs and revenue from tier membership
      let tierQuery = client
        .from('cdp_value_tier_membership_daily')
        .select('customer_id, metric_value')
        .eq('tier_label', tierLabel)
        .eq('is_member', true)
        .eq('metric_name', 'net_revenue_365');
      if (shouldAddTenantFilter) {
        tierQuery = tierQuery.eq('tenant_id', tenantId);
      }
      const { data: tierData, error: tierError } = await tierQuery;

      if (tierError) {
        console.error('Error fetching tier data:', tierError);
        return null;
      }

      if (!tierData || tierData.length === 0) {
        return {
          tierLabel,
          customerCount: 0,
          totalRevenue: 0,
          estimatedEquity: 0,
          avgRevenuePerCustomer: 0,
        };
      }

      // Get unique customer IDs
      const customerIds = [...new Set(tierData.map(row => row.customer_id))];
      const customerCount = customerIds.length;
      
      // Total revenue from tier membership (net_revenue_365)
      const totalRevenue = tierData.reduce((sum, row) => sum + (Number(row.metric_value) || 0), 0);

      // Get equity data for these customers
      let equityQuery = client
        .from('cdp_customer_equity_computed')
        .select('equity_12m')
        .in('customer_id', customerIds);
      if (shouldAddTenantFilter) {
        equityQuery = equityQuery.eq('tenant_id', tenantId);
      }
      const { data: equityData, error: equityError } = await equityQuery;

      let estimatedEquity = 0;
      if (!equityError && equityData) {
        estimatedEquity = equityData.reduce((sum, row) => sum + (Number(row.equity_12m) || 0), 0);
      }

      const avgRevenuePerCustomer = customerCount > 0 ? totalRevenue / customerCount : 0;

      return {
        tierLabel,
        customerCount,
        totalRevenue,
        estimatedEquity,
        avgRevenuePerCustomer,
      };
    },
    enabled: isReady && !!tierLabel,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch RFM segment statistics
 */
export function useCDPRFMData(rfmSegment: string | undefined) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp', 'rfm-data', tenantId, rfmSegment],
    queryFn: async (): Promise<TierData | null> => {
      if (!tenantId || !rfmSegment) return null;

      // Get customers with this RFM segment using raw query
      let customerQuery = client
        .from('cdp_customers')
        .select('id')
        .ilike('rfm_segment', rfmSegment);
      if (shouldAddTenantFilter) {
        customerQuery = customerQuery.eq('tenant_id', tenantId);
      }
      const { data: customers, error: customerError } = await customerQuery;

      if (customerError) {
        console.error('Error fetching RFM customers:', customerError);
        return null;
      }

      if (!customers || customers.length === 0) {
        return {
          tierLabel: rfmSegment,
          customerCount: 0,
          totalRevenue: 0,
          estimatedEquity: 0,
          avgRevenuePerCustomer: 0,
        };
      }

      const customerIds = customers.map(c => c.id);
      const customerCount = customerIds.length;

      // Get total revenue from orders for these customers
      let orderQuery = client
        .from('cdp_orders')
        .select('net_revenue')
        .in('customer_id', customerIds);
      if (shouldAddTenantFilter) {
        orderQuery = orderQuery.eq('tenant_id', tenantId);
      }
      const { data: orderData, error: orderError } = await orderQuery;

      let totalRevenue = 0;
      if (!orderError && orderData) {
        totalRevenue = orderData.reduce((sum, row) => sum + (Number(row.net_revenue) || 0), 0);
      }

      // Get equity data for these customers
      let equityQuery = client
        .from('cdp_customer_equity_computed')
        .select('equity_12m')
        .in('customer_id', customerIds);
      if (shouldAddTenantFilter) {
        equityQuery = equityQuery.eq('tenant_id', tenantId);
      }
      const { data: equityData, error: equityError } = await equityQuery;

      let estimatedEquity = 0;
      if (!equityError && equityData) {
        estimatedEquity = equityData.reduce((sum, row) => sum + (Number(row.equity_12m) || 0), 0);
      }

      const avgRevenuePerCustomer = customerCount > 0 ? totalRevenue / customerCount : 0;

      return {
        tierLabel: rfmSegment,
        customerCount,
        totalRevenue,
        estimatedEquity,
        avgRevenuePerCustomer,
      };
    },
    enabled: isReady && !!rfmSegment,
    staleTime: 5 * 60 * 1000,
  });
}
