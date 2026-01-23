import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useTenant';

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
  const { data: activeTenant } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-customer-audit', tenantId, customerId],
    queryFn: async (): Promise<CustomerAuditData | null> => {
      if (!tenantId || !customerId) return null;

      const { data, error } = await supabase
        .from('v_cdp_customer_audit')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', customerId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Get active connectors for this tenant (real data sources)
      const { data: connectors } = await supabase
        .from('connector_integrations')
        .select('connector_type, status, last_sync_at')
        .eq('tenant_id', tenantId);

      // Get REAL order stats per channel from cdp_orders for this customer
      const { data: channelStats } = await supabase
        .from('cdp_orders')
        .select('channel, net_revenue')
        .eq('customer_id', customerId);

      // Aggregate by channel
      const channelAggregates: Record<string, { orderCount: number; totalValue: number }> = {};
      (channelStats || []).forEach(order => {
        const ch = order.channel || 'unknown';
        if (!channelAggregates[ch]) {
          channelAggregates[ch] = { orderCount: 0, totalValue: 0 };
        }
        channelAggregates[ch].orderCount += 1;
        channelAggregates[ch].totalValue += Number(order.net_revenue) || 0;
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
        'bigquery': 'BigQuery',
      };

      // Track which display names have been added to avoid duplicates
      const addedDisplayNames = new Set<string>();
      const addedChannels = new Set<string>();

      // First: Add connectors and merge with their channel data (dedupe by displayName)
      (connectors || []).forEach(connector => {
        const connectorType = connector.connector_type.toLowerCase();
        const displayName = connectorDisplayNames[connectorType] || connector.connector_type;
        
        // Skip if this displayName was already added (avoid duplicate Lazada, TikTok Shop, etc.)
        if (addedDisplayNames.has(displayName)) {
          return;
        }
        
        // Find matching channel data (case-insensitive, partial match)
        const matchingChannel = activeChannels.find(ch => {
          const chLower = ch?.toLowerCase() || '';
          return chLower.includes(connectorType) || connectorType.includes(chLower);
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
        const channelLower = channelName?.toLowerCase() || '';
        
        // Skip if already added via connector
        if (addedChannels.has(channelName) || addedChannels.has(channelLower)) {
          return;
        }

        const displayName = connectorDisplayNames[channelLower] || channelName || 'Nguồn không xác định';
        
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
      if (sources.length === 0 && data.order_count > 0) {
        sources.push({
          name: 'Nhập trực tiếp',
          hasData: true,
          orderCount: data.order_count,
          totalValue: data.total_spend,
          lastSync: new Date().toLocaleDateString('vi-VN'),
        });
      }

      return {
        internalId: data.internal_id,
        anonymizedPhone: data.anonymized_phone,
        anonymizedEmail: data.anonymized_email,
        mergeConfidence: data.merge_confidence || 85,
        sourceCount: sources.filter(s => s.hasData).length || 1,
        mergeStatus: data.merge_status as CustomerAuditData['mergeStatus'],
        totalSpend: Number(data.total_spend) || 0,
        orderCount: Number(data.order_count) || 0,
        aov: Number(data.aov) || 0,
        daysSinceLastPurchase: Number(data.days_since_last_purchase) || 0,
        rfmScore: {
          r: data.rfm_r || 3,
          f: data.rfm_f || 3,
          m: data.rfm_m || 3,
        },
        clv: Number(data.clv) || 0,
        avgClvSegment: Number(data.clv) * 0.75,
        sources,
      };
    },
    enabled: !!tenantId && !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}
