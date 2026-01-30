/**
 * useLinkedAlertsDecisions - Alert and Decision Card linking
 * 
 * @architecture Schema-per-Tenant
 * @domain Control Tower/Integration
 * 
 * NGUYÊN TẮC:
 * - Alert = Monitoring & Notification (Control Tower)
 * - Decision Card = Action & Strategy (Decision Center)
 * - Khi có Decision Card → Alert ẩn khỏi Control Tower
 * - Khi Decision được thực hiện → Alert tự động resolve
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';
import { toast } from 'sonner';

export interface LinkAlertToDecisionParams {
  alertId: string;
  decisionCardId: string;
}

export interface ResolveAlertsByDecisionParams {
  decisionCardId: string;
  resolution: 'approved' | 'rejected' | 'snoozed';
  comment?: string;
}

/**
 * Link một alert với decision card
 * Sau khi link, alert sẽ bị ẩn khỏi Control Tower
 */
export function useLinkAlertToDecision() {
  const queryClient = useQueryClient();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ alertId, decisionCardId }: LinkAlertToDecisionParams) => {
      const { data, error } = await client
        .from('alert_instances')
        .update({
          linked_decision_card_id: decisionCardId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-instances'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-instance-stats'] });
    },
    onError: (error) => {
      console.error('Error linking alert to decision:', error);
    },
  });
}

/**
 * Resolve tất cả alerts liên quan đến một decision card
 * Gọi khi decision được approved/rejected
 */
export function useResolveAlertsByDecision() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ decisionCardId, resolution, comment }: ResolveAlertsByDecisionParams) => {
      if (!tenantId) throw new Error('No tenant');

      const { data: { user } } = await client.auth.getUser();
      
      const now = new Date().toISOString();
      const resolutionNote = resolution === 'approved' 
        ? `Đã xử lý qua Decision Card: ${comment || 'Approved'}`
        : resolution === 'rejected'
        ? `Bỏ qua qua Decision Card: ${comment || 'Rejected'}`
        : `Tạm hoãn qua Decision Card: ${comment || 'Snoozed'}`;

      // Tìm và resolve tất cả alerts có linked_decision_card_id
      const { data, error } = await client
        .from('alert_instances')
        .update({
          status: resolution === 'snoozed' ? 'snoozed' : 'resolved',
          resolved_by: user?.id,
          resolved_at: now,
          resolution_notes: resolutionNote,
          resolved_by_decision: true,
          updated_at: now,
        })
        .eq('tenant_id', tenantId)
        .eq('linked_decision_card_id', decisionCardId)
        .neq('status', 'resolved')
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alert-instances'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-instance-stats'] });
      
      if (data && data.length > 0) {
        toast.success(`Đã resolve ${data.length} alert liên quan`);
      }
    },
    onError: (error) => {
      console.error('Error resolving alerts by decision:', error);
    },
  });
}

/**
 * Bulk link alerts dựa trên entity (SKU, campaign, etc.)
 * Dùng khi tạo decision card tự động
 */
export function useBulkLinkAlertsByEntity() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ 
      entityType, 
      entityId, 
      decisionCardId 
    }: { 
      entityType: string; 
      entityId: string; 
      decisionCardId: string 
    }) => {
      if (!tenantId) throw new Error('No tenant');

      // Link tất cả alerts có cùng object_type và external_object_id
      const { data, error } = await client
        .from('alert_instances')
        .update({
          linked_decision_card_id: decisionCardId,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .eq('object_type', entityType)
        .eq('external_object_id', entityId)
        .is('linked_decision_card_id', null) // Chỉ link những cái chưa link
        .neq('status', 'resolved')
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alert-instances'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
      
      console.log(`Linked ${data?.length || 0} alerts to decision card`);
    },
  });
}

/**
 * Tìm alerts liên quan đến một entity
 * Dùng để suggest linking khi tạo decision card
 */
export function useRelatedAlerts(entityType?: string, entityId?: string) {
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId || !entityType || !entityId) return [];

      const { data, error } = await client
        .from('alert_instances')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('object_type', entityType)
        .eq('external_object_id', entityId)
        .is('linked_decision_card_id', null)
        .in('status', ['active', 'acknowledged'])
        .order('severity', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

/**
 * Kiểm tra xem alert có decision card hay không
 */
export function alertHasDecisionCard(alert: { linked_decision_card_id?: string | null }): boolean {
  return !!alert.linked_decision_card_id;
}

/**
 * Filter function để ẩn alerts đã có decision card khỏi Control Tower
 */
export function filterAlertsWithoutDecisionCard<T extends { linked_decision_card_id?: string | null }>(
  alerts: T[]
): T[] {
  return alerts.filter(alert => !alert.linked_decision_card_id);
}

/**
 * Filter function để chỉ lấy alerts đã có decision card (cho Decision Center)
 */
export function filterAlertsWithDecisionCard<T extends { linked_decision_card_id?: string | null }>(
  alerts: T[]
): T[] {
  return alerts.filter(alert => !!alert.linked_decision_card_id);
}
