/**
 * useWarRoomPriorities - Aggregate top financial risks across state tables
 * 
 * Queries 5 state tables, joins with inv_family_codes for product names,
 * calculates financial_damage and sorts by severity.
 * Limited to 7 items per Control Tower Manifesto.
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface WarRoomPriority {
  id: string;
  rank: number;
  type: 'size_break' | 'markdown_risk' | 'cash_lock' | 'margin_leak' | 'lost_revenue';
  productId: string;
  fcName: string;
  category: string | null;
  financialDamage: number;
  lostRevenue: number;
  cashLocked: number;
  marginLeak: number;
  markdownEtaDays: number | null;
  timePressureLabel: string;
  urgency: 'critical' | 'urgent' | 'warning';
  actionPath: string;
  actionLabel: string;
}

const TYPE_CONFIG: Record<WarRoomPriority['type'], { actionPath: string; actionLabel: string }> = {
  size_break: { actionPath: '/command/assortment', actionLabel: 'Xem Size Health' },
  markdown_risk: { actionPath: '/command/clearance', actionLabel: 'Xem Thanh Lý' },
  cash_lock: { actionPath: '/command/allocation', actionLabel: 'Xem Phân Bổ' },
  margin_leak: { actionPath: '/command/clearance', actionLabel: 'Xem Rò Biên' },
  lost_revenue: { actionPath: '/command/allocation', actionLabel: 'Xem Doanh Thu Mất' },
};

function getUrgency(etaDays: number | null, damage: number): WarRoomPriority['urgency'] {
  if (etaDays !== null && etaDays <= 7) return 'critical';
  if (damage > 500_000_000) return 'critical';
  if (etaDays !== null && etaDays <= 14) return 'urgent';
  if (damage > 100_000_000) return 'urgent';
  return 'warning';
}

function getTimePressureLabel(etaDays: number | null): string {
  if (etaDays === null) return 'Không có deadline cụ thể';
  if (etaDays <= 0) return 'Đã quá hạn markdown!';
  if (etaDays <= 7) return `${etaDays} ngày trước markdown risk`;
  if (etaDays <= 14) return `${etaDays} ngày — cần hành động sớm`;
  return `${etaDays} ngày`;
}

export function useWarRoomPriorities() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['war-room-priorities', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Query all 5 state tables + family codes in parallel
      const [cashLockRes, lostRevRes, marginLeakRes, markdownRes, sizeHealthRes, fcRes] = await Promise.all([
        buildSelectQuery('state_cash_lock_daily', 'product_id, cash_locked_value, inventory_value, lock_driver')
          .order('cash_locked_value', { ascending: false })
          .limit(50),
        buildSelectQuery('state_lost_revenue_daily', 'product_id, lost_revenue_est, driver')
          .order('lost_revenue_est', { ascending: false })
          .limit(50),
        buildSelectQuery('state_margin_leak_daily', 'product_id, margin_leak_value, leak_driver')
          .order('margin_leak_value', { ascending: false })
          .limit(50),
        buildSelectQuery('state_markdown_risk_daily', 'product_id, markdown_risk_score, markdown_eta_days, reason')
          .gte('markdown_risk_score', 50)
          .order('markdown_risk_score', { ascending: false })
          .limit(50),
        buildSelectQuery('state_size_health_daily', 'product_id, curve_state, size_health_score, deviation_score')
          .in('curve_state', ['broken', 'risk'])
          .order('deviation_score', { ascending: false })
          .limit(50),
        buildSelectQuery('inv_family_codes', 'id, fc_code, fc_name, category, season')
          .eq('is_active', true)
          .limit(2000),
      ]);

      // Build FC lookup
      const fcMap = new Map<string, { fc_name: string; category: string | null }>();
      ((fcRes.data || []) as any[]).forEach((fc: any) => {
        fcMap.set(fc.id, { fc_name: fc.fc_name || fc.fc_code, category: fc.category });
      });

      // Aggregate per product: sum financial damage across tables
      const productDamage = new Map<string, {
        lostRevenue: number;
        cashLocked: number;
        marginLeak: number;
        markdownEtaDays: number | null;
        primaryType: WarRoomPriority['type'];
      }>();

      const getOrCreate = (pid: string) => {
        if (!productDamage.has(pid)) {
          productDamage.set(pid, { lostRevenue: 0, cashLocked: 0, marginLeak: 0, markdownEtaDays: null, primaryType: 'cash_lock' });
        }
        return productDamage.get(pid)!;
      };

      ((cashLockRes.data || []) as any[]).forEach((r: any) => {
        const d = getOrCreate(r.product_id);
        d.cashLocked += Number(r.cash_locked_value) || 0;
      });

      ((lostRevRes.data || []) as any[]).forEach((r: any) => {
        const d = getOrCreate(r.product_id);
        d.lostRevenue += Number(r.lost_revenue_est) || 0;
        if (d.lostRevenue > d.cashLocked && d.lostRevenue > d.marginLeak) d.primaryType = 'lost_revenue';
      });

      ((marginLeakRes.data || []) as any[]).forEach((r: any) => {
        const d = getOrCreate(r.product_id);
        d.marginLeak += Number(r.margin_leak_value) || 0;
        if (d.marginLeak > d.cashLocked && d.marginLeak > d.lostRevenue) d.primaryType = 'margin_leak';
      });

      ((markdownRes.data || []) as any[]).forEach((r: any) => {
        const d = getOrCreate(r.product_id);
        d.markdownEtaDays = r.markdown_eta_days;
        d.primaryType = 'markdown_risk';
      });

      ((sizeHealthRes.data || []) as any[]).forEach((r: any) => {
        const d = getOrCreate(r.product_id);
        if (d.primaryType === 'cash_lock') d.primaryType = 'size_break'; // size break overrides generic cash_lock
      });

      // Score and sort
      const scored: WarRoomPriority[] = [];
      productDamage.forEach((d, productId) => {
        const totalDamage = d.lostRevenue + d.cashLocked + d.marginLeak;
        if (totalDamage <= 0) return;

        const fc = fcMap.get(productId);
        const config = TYPE_CONFIG[d.primaryType];

        scored.push({
          id: productId,
          rank: 0,
          type: d.primaryType,
          productId,
          fcName: fc?.fc_name || productId.slice(0, 8),
          category: fc?.category || null,
          financialDamage: totalDamage,
          lostRevenue: d.lostRevenue,
          cashLocked: d.cashLocked,
          marginLeak: d.marginLeak,
          markdownEtaDays: d.markdownEtaDays,
          timePressureLabel: getTimePressureLabel(d.markdownEtaDays),
          urgency: getUrgency(d.markdownEtaDays, totalDamage),
          actionPath: config.actionPath,
          actionLabel: config.actionLabel,
        });
      });

      scored.sort((a, b) => b.financialDamage - a.financialDamage);
      return scored.slice(0, 7).map((item, i) => ({ ...item, rank: i + 1 }));
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });
}
