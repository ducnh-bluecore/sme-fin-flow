/**
 * useLockedCashDetail - Hook for fetching locked cash drill-down data
 * 
 * FDP Manifesto Principle #4: Real Cash
 * Provides granular breakdown of locked cash by type:
 * - Inventory: Products holding value
 * - Ads: Recent marketing spend not yet converted
 * - Ops: Pending logistics/shipping bills
 * - Platform: eCommerce pending settlement (T+14)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

export type LockType = 'inventory' | 'ads' | 'ops' | 'platform';
export type LockStatus = 'active' | 'slow_moving' | 'pending' | 'settled' | 'pending_settlement';

export interface LockedCashItem {
  lockType: LockType;
  sku: string | null;
  productName: string | null;
  lockedAmount: number;
  quantity: number | null;
  status: LockStatus;
  referenceDate: string | null;
}

export interface LockedCashSummary {
  inventory: LockedCashItem[];
  ads: LockedCashItem[];
  ops: LockedCashItem[];
  platform: LockedCashItem[];
  totals: {
    inventory: number;
    ads: number;
    ops: number;
    platform: number;
    total: number;
  };
}

export function useLockedCashDetail() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['locked-cash-detail', tenantId],
    queryFn: async (): Promise<LockedCashSummary | null> => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('v_locked_cash_detail')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (error) {
        console.error('[useLockedCashDetail] Fetch error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return {
          inventory: [],
          ads: [],
          ops: [],
          platform: [],
          totals: { inventory: 0, ads: 0, ops: 0, platform: 0, total: 0 }
        };
      }
      
      // Group by lock_type
      const inventory: LockedCashItem[] = [];
      const ads: LockedCashItem[] = [];
      const ops: LockedCashItem[] = [];
      const platform: LockedCashItem[] = [];
      
      let totalInventory = 0;
      let totalAds = 0;
      let totalOps = 0;
      let totalPlatform = 0;
      
      for (const row of data) {
        const item: LockedCashItem = {
          lockType: row.lock_type as LockType,
          sku: row.sku,
          productName: row.product_name,
          lockedAmount: Number(row.locked_amount) || 0,
          quantity: row.quantity ? Number(row.quantity) : null,
          status: row.status as LockStatus,
          referenceDate: row.reference_date,
        };
        
        switch (row.lock_type) {
          case 'inventory':
            inventory.push(item);
            totalInventory += item.lockedAmount;
            break;
          case 'ads':
            ads.push(item);
            totalAds += item.lockedAmount;
            break;
          case 'ops':
            ops.push(item);
            totalOps += item.lockedAmount;
            break;
          case 'platform':
            platform.push(item);
            totalPlatform += item.lockedAmount;
            break;
        }
      }
      
      // Sort by locked amount descending
      const sortByAmount = (a: LockedCashItem, b: LockedCashItem) => 
        b.lockedAmount - a.lockedAmount;
      
      return {
        inventory: inventory.sort(sortByAmount),
        ads: ads.sort(sortByAmount),
        ops: ops.sort(sortByAmount),
        platform: platform.sort(sortByAmount),
        totals: {
          inventory: totalInventory,
          ads: totalAds,
          ops: totalOps,
          platform: totalPlatform,
          total: totalInventory + totalAds + totalOps + totalPlatform,
        }
      };
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}
