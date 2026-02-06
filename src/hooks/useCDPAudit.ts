/**
 * useCDPAudit - Customer audit and merge tracking
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 * @domain CDP/Audit
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';

export interface CustomerAuditData {
  internalId: string;
  anonymizedPhone: string | null;
  anonymizedEmail: string | null;
  mergeConfidence: number;
  sourceCount: number;
  mergeStatus: 'verified' | 'partial' | 'conflict';
  totalSpend: number;
  orderCount: number;
  aov: number;
  daysSinceLastPurchase: number;
  rfmScore: { r: number; f: number; m: number };
  clv: number;
  avgClvSegment: number;
  sources: Array<{
    name: string;
    hasData: boolean;
    orderCount: number;
    totalValue: number;
    lastSync?: string;
  }>;
}

export function useCDPCustomerAudit(customerId: string | undefined) {
  const { client, tenantId, isReady, buildSelectQuery } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp-customer-audit', tenantId, customerId],
    queryFn: async (): Promise<CustomerAuditData | null> => {
      if (!tenantId || !customerId) return null;

      const { data, error } = await buildSelectQuery('v_cdp_customer_audit', '*')
        .eq('id', customerId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as unknown as Record<string, unknown>;

      // Get active connectors for this tenant (real data sources)
      const { data: connectors } = await buildSelectQuery('connector_integrations', 'connector_type, status, last_sync_at');

      // Get REAL order stats per channel from cdp_orders using RPC (avoids 1000 row limit)
      const { data: channelStats } = await client.rpc('cdp_customer_channel_stats', { p_customer_id: customerId });
      // Build channel aggregates from RPC result
      const channelAggregates: Record<string, { orderCount: number; totalValue: number }> = {};
      (channelStats || []).forEach((stat: { channel: string; order_count: number; total_value: number }) => {
        channelAggregates[stat.channel] = {
          orderCount: stat.order_count,
          totalValue: Number(stat.total_value) || 0,
        };
      });

      const activeChannels = Object.keys(channelAggregates);
      
      // Build sources array - merge connectors with channel data, avoid duplicates
      const sources: Array<{
        name: string;
        hasData: boolean;
        orderCount: number;
        totalValue: number;
        lastSync?: string;
      }> = [];

      // Map connector types to display names
      const connectorDisplayNames: Record<string, string> = {
        'kiotviet': 'KiotViet',
        'sapo': 'Sapo', 
        'haravan': 'Haravan',
        'website': 'Website/App',
        'pancake': 'Pancake',
        'shopee': 'Shopee',
        'lazada': 'Lazada',
        'tiktok': 'TikTok Shop',
        'tiktok_shop': 'TikTok Shop',
        'tiktok shop': 'TikTok Shop',
        'bigquery': 'BigQuery',
        'woocommerce': 'WooCommerce',
      };
      
      // Map channel names to normalized keys for matching
      const channelNormalizer = (channel: string): string => {
        const normalized = channel.toLowerCase().replace(/[\s_-]/g, '');
        if (normalized.includes('tiktok')) return 'tiktok';
        if (normalized.includes('shopee')) return 'shopee';
        if (normalized.includes('lazada')) return 'lazada';
        if (normalized.includes('website') || normalized.includes('web')) return 'website';
        if (normalized.includes('woo')) return 'woocommerce';
        return normalized;
      };

      // Track which display names have been added to avoid duplicates
      const addedDisplayNames = new Set<string>();
      const addedChannels = new Set<string>();

      // First: Add connectors and merge with their channel data (dedupe by displayName)
      ((connectors as unknown as any[]) || []).forEach(connector => {
        const connectorType = connector.connector_type.toLowerCase();
        const displayName = connectorDisplayNames[connectorType] || connector.connector_type;
        
        // Skip if this displayName was already added (avoid duplicate Lazada, TikTok Shop, etc.)
        if (addedDisplayNames.has(displayName)) {
          return;
        }
        
        // Find matching channel data using normalized keys
        const connectorNormalized = channelNormalizer(connectorType);
        const matchingChannel = activeChannels.find(ch => {
          return channelNormalizer(ch) === connectorNormalized;
        });
        
        const channelData = matchingChannel ? channelAggregates[matchingChannel] : null;
        const hasOrderData = !!channelData;
        
        const isActive = connector.status === 'active' || connector.status === 'connected';
        
        if (isActive || hasOrderData) {
          sources.push({
            name: displayName,
            hasData: hasOrderData,
            orderCount: channelData?.orderCount || 0,
            totalValue: channelData?.totalValue || 0,
            lastSync: connector.last_sync_at 
              ? new Date(connector.last_sync_at).toLocaleDateString('vi-VN')
              : undefined,
          });
          
          // Mark as added
          addedDisplayNames.add(displayName);
          if (matchingChannel) {
            addedChannels.add(matchingChannel);
          }
          addedChannels.add(connectorType);
        }
      });

      // Second: Add remaining channels that weren't matched to any connector
      activeChannels.forEach(channelName => {
        const channelNormalized = channelNormalizer(channelName);
        
        // Skip if already added via connector (using normalized key)
        if (addedChannels.has(channelName) || addedChannels.has(channelNormalized)) {
          return;
        }

        const displayName = connectorDisplayNames[channelNormalized] || channelName || 'Nguồn không xác định';
        
        // Skip if this displayName was already added
        if (addedDisplayNames.has(displayName)) {
          return;
        }

        const stats = channelAggregates[channelName];
        sources.push({
          name: displayName,
          hasData: true,
          orderCount: stats.orderCount,
          totalValue: stats.totalValue,
          lastSync: new Date().toLocaleDateString('vi-VN'),
        });
        
        addedDisplayNames.add(displayName);
      });

      // If still no sources, show a placeholder indicating data origin
      if (sources.length === 0 && Number(row.order_count) > 0) {
        sources.push({
          name: 'Nhập trực tiếp',
          hasData: true,
          orderCount: Number(row.order_count),
          totalValue: Number(row.total_spend),
          lastSync: new Date().toLocaleDateString('vi-VN'),
        });
      }

      return {
        internalId: row.internal_id as string,
        anonymizedPhone: row.anonymized_phone as string | null,
        anonymizedEmail: row.anonymized_email as string | null,
        mergeConfidence: (row.merge_confidence as number) || 85,
        sourceCount: sources.filter(s => s.hasData).length || 1,
        mergeStatus: row.merge_status as CustomerAuditData['mergeStatus'],
        totalSpend: Number(row.total_spend) || 0,
        orderCount: Number(row.order_count) || 0,
        aov: Number(row.aov) || 0,
        daysSinceLastPurchase: Number(row.days_since_last_purchase) || 0,
        rfmScore: {
          r: (row.rfm_r as number) || 3,
          f: (row.rfm_f as number) || 3,
          m: (row.rfm_m as number) || 3,
        },
        clv: Number(row.clv) || 0,
        avgClvSegment: Number(row.clv) * 0.75,
        sources,
      };
    },
    enabled: isReady && !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}
