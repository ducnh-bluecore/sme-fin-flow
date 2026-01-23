import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from '@/hooks/useActiveTenant';

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
  const { activeTenant } = useActiveTenant();
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

      // Get sources from identities
      const { data: identities } = await supabase
        .from('cdp_customer_identities')
        .select('source_system')
        .eq('customer_id', customerId);

      const sourceNames = [...new Set((identities || []).map(i => i.source_system))];
      
      // Build sources array
      const sources = sourceNames.map(name => ({
        name: name || 'Unknown',
        hasData: true,
        orderCount: Math.floor(data.order_count / sourceNames.length),
        totalValue: Math.floor(data.total_spend / sourceNames.length),
        lastSync: new Date().toLocaleDateString('vi-VN'),
      }));

      // Add common sources that might not have data
      const commonSources = ['KiotViet', 'Sapo', 'Haravan', 'Website/App'];
      commonSources.forEach(name => {
        if (!sources.find(s => s.name === name)) {
          sources.push({
            name,
            hasData: false,
            orderCount: 0,
            totalValue: 0,
          });
        }
      });

      return {
        internalId: data.internal_id,
        anonymizedPhone: data.anonymized_phone,
        anonymizedEmail: data.anonymized_email,
        mergeConfidence: data.merge_confidence || 85,
        sourceCount: data.source_count || 1,
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
        avgClvSegment: Number(data.clv) * 0.75, // Approximate segment average
        sources: sources.slice(0, 4),
      };
    },
    enabled: !!tenantId && !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}
