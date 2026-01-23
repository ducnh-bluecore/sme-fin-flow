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

      // Get order channels from cdp_orders for this customer
      const { data: orderChannels } = await supabase
        .from('cdp_orders')
        .select('channel')
        .eq('customer_id', customerId);

      const activeChannels = [...new Set((orderChannels || []).map(o => o.channel).filter(Boolean))];
      
      // Build sources array from real connectors and order data
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
      };

      // Add connectors that have actual data
      (connectors || []).forEach(connector => {
        const displayName = connectorDisplayNames[connector.connector_type] || connector.connector_type;
        const hasOrderData = activeChannels.some(ch => 
          ch?.toLowerCase().includes(connector.connector_type.toLowerCase())
        );
        
        const isActive = connector.status === 'active' || connector.status === 'connected';
        
        if (isActive || hasOrderData) {
          const orderCountForSource = hasOrderData 
            ? Math.ceil(data.order_count / Math.max(activeChannels.length, 1))
            : 0;
          
          sources.push({
            name: displayName,
            hasData: hasOrderData,
            orderCount: orderCountForSource,
            totalValue: hasOrderData ? Math.ceil(data.total_spend / Math.max(activeChannels.length, 1)) : 0,
            lastSync: connector.last_sync_at 
              ? new Date(connector.last_sync_at).toLocaleDateString('vi-VN')
              : undefined,
          });
        }
      });

      // If no connectors but we have channel data from orders, use that
      if (sources.length === 0 && activeChannels.length > 0) {
        activeChannels.forEach(channelName => {
          sources.push({
            name: channelName || 'Nguồn không xác định',
            hasData: true,
            orderCount: Math.ceil(data.order_count / activeChannels.length),
            totalValue: Math.ceil(data.total_spend / activeChannels.length),
            lastSync: new Date().toLocaleDateString('vi-VN'),
          });
        });
      }

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
