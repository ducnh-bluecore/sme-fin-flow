import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export type AgingBucket = 'slow_moving' | 'stagnant' | 'dead_stock';

export interface ChannelSalesRecord {
  channel: string;
  lastSaleMonth: string;       // e.g. "2026-02"
  totalUnitsSold: number;
  avgDiscountPct: number;
  discountBands: string[];     // e.g. ["0-20%", "20-30%"]
}

export interface DeadStockItem {
  product_id: string;
  product_name: string;
  fc_code: string;
  category: string | null;
  current_stock: number;
  inventory_value: number;
  cash_locked: number;
  avg_daily_sales: number;
  sales_velocity: number;
  days_to_clear: number;
  curve_state: string | null;
  reason: string;
  markdown_risk_score: number;
  is_premium: boolean;
  collection_name: string | null;
  aging_bucket: AgingBucket;
  aging_label: string;
  // Sales history enrichment
  daysSinceLastSale: number | null;
  lastSaleDate: string | null;
  channelHistory: ChannelSalesRecord[];
  // Recent velocity (units/day in the 5-day window before last sale)
  recentVelocity: number | null;
  recentVelocityWindow: string | null; // e.g. "3 units in 5 days"
}

export interface DeadStockSummary {
  total_items: number;
  total_locked_value: number;
  total_stock: number;
  by_bucket: Record<AgingBucket, { items: number; locked: number; stock: number }>;
}

function classifyAging(
  daysToClose: number,
  daysSinceLastSale: number | null,
  recentVelocity: number | null,
): { bucket: AgingBucket; label: string } {
  // Base classification from days_to_clear
  let bucket: AgingBucket;
  let label: string;

  if (daysToClose >= 9999 || daysToClose >= 365) {
    bucket = 'dead_stock';
    label = 'Hàng chết — không bán được';
  } else if (daysToClose >= 180) {
    bucket = 'stagnant';
    label = 'Tồn nặng — >180 ngày mới clear';
  } else {
    bucket = 'slow_moving';
    label = 'Chậm bán — 90-180 ngày';
  }

  // Reclassify: if sold recently AND has recent velocity, cap at lower severity
  // "Recently" = within last 60 days (covers Tết/holiday pauses)
  if (daysSinceLastSale !== null && daysSinceLastSale < 60 && recentVelocity !== null && recentVelocity > 0) {
    if (bucket === 'dead_stock') {
      bucket = 'stagnant';
      label = 'Tồn nặng — có bán gần đây, velocity thấp';
    } else if (bucket === 'stagnant') {
      bucket = 'slow_moving';
      label = 'Chậm bán — có bán gần đây';
    }
  }

  return { bucket, label };
}

function monthsToDate(monthStr: string): Date {
  return new Date(monthStr);
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function useDeadStock() {
  const { client, buildQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['dead-stock', tenantId],
    queryFn: async () => {
      // Step 1: Fetch clearance candidates
      const candidatesRes = await client.rpc('fn_clearance_candidates', { p_tenant_id: tenantId, p_min_risk: 0 });
      if (candidatesRes.error) throw candidatesRes.error;
      const all = (candidatesRes.data || []) as any[];

      // Step 2: Get unique product names from candidates that qualify (days_to_clear >= 90 or zero velocity)
      const qualifiedNames = [...new Set(
        all
          .filter(r => (r.days_to_clear ?? 9999) >= 90 || Number(r.avg_daily_sales || 0) <= 0)
          .map(r => r.product_name as string)
          .filter(Boolean)
      )];

      // Step 3: Fetch history only for qualified products (batch in chunks to avoid query size limits)
      const CHUNK_SIZE = 50;
      const historyResults: any[] = [];
      for (let i = 0; i < qualifiedNames.length; i += CHUNK_SIZE) {
        const chunk = qualifiedNames.slice(i, i + CHUNK_SIZE);
        const res = await buildQuery('v_clearance_history_by_product' as any)
          .in('product_name', chunk)
          .limit(10000);
        if (res.error) throw res.error;
        historyResults.push(...(res.data || []));
      }

      const history = historyResults;

      // Build sales history map: product_name → channel → aggregated info
      // Uses product_name matching (works for KiotViet; online channels have different names)
      const historyMap = new Map<string, Map<string, { 
        lastMonth: string; totalUnits: number; discounts: Map<string, number>; avgDisc: number; discCount: number 
      }>>();
      
      history.forEach((h: any) => {
        const name = h.product_name as string;
        if (!name) return;
        if (!historyMap.has(name)) historyMap.set(name, new Map());
        const chMap = historyMap.get(name)!;
        const ch = h.channel as string;
        const existing = chMap.get(ch);
        if (existing) {
          if (h.sale_month > existing.lastMonth) existing.lastMonth = h.sale_month;
          existing.totalUnits += h.units_sold;
          existing.discounts.set(h.discount_band, (existing.discounts.get(h.discount_band) || 0) + h.units_sold);
          existing.avgDisc = (existing.avgDisc * existing.discCount + (h.avg_discount_pct || 0)) / (existing.discCount + 1);
          existing.discCount++;
        } else {
          const discounts = new Map<string, number>();
          discounts.set(h.discount_band, h.units_sold);
          chMap.set(ch, { lastMonth: h.sale_month, totalUnits: h.units_sold, discounts, avgDisc: h.avg_discount_pct || 0, discCount: 1 });
        }
      });

      const now = new Date();

      // Filter: days_to_clear >= 90 OR zero velocity
      const deadItems: DeadStockItem[] = all
        .filter(r => {
          const dtc = r.days_to_clear ?? 9999;
          const vel = Number(r.avg_daily_sales || 0);
          return dtc >= 90 || vel <= 0;
        })
        .map(r => {
          const dtc = r.days_to_clear ?? 9999;

          // Enrich with sales history (match by product_name)
          const productHistory = historyMap.get(r.product_name);
          let daysSinceLastSale: number | null = null;
          let lastSaleDate: string | null = null;
          const channelHistory: ChannelSalesRecord[] = [];
          let recentVelocity: number | null = null;
          let recentVelocityWindow: string | null = null;

          if (productHistory) {
            let overallLastMonth = '';
            let lastMonthTotalUnits = 0;
            productHistory.forEach((chData, channel) => {
              if (chData.lastMonth > overallLastMonth) overallLastMonth = chData.lastMonth;
              channelHistory.push({
                channel,
                lastSaleMonth: chData.lastMonth.slice(0, 7),
                totalUnitsSold: chData.totalUnits,
                avgDiscountPct: Math.round(chData.avgDisc),
                discountBands: Array.from(chData.discounts.keys()).sort(),
              });
            });
            if (overallLastMonth) {
              const lastDate = monthsToDate(overallLastMonth);
              daysSinceLastSale = daysBetween(lastDate, now);
              lastSaleDate = overallLastMonth.slice(0, 7);

              // Calculate recent velocity: total units sold across all channels
              // in the last sale month, divided by 5 (simulating 5-day window)
              productHistory.forEach((chData) => {
                if (chData.lastMonth === overallLastMonth) {
                  lastMonthTotalUnits += chData.totalUnits;
                }
              });
              recentVelocity = lastMonthTotalUnits / 5;
              recentVelocityWindow = `${lastMonthTotalUnits} units gần lần bán cuối`;
            }
            channelHistory.sort((a, b) => b.lastSaleMonth.localeCompare(a.lastSaleMonth));
          }

          const { bucket, label } = classifyAging(dtc, daysSinceLastSale, recentVelocity);

          return {
            product_id: r.product_id,
            product_name: r.product_name || '—',
            fc_code: r.fc_code || '—',
            category: r.category || null,
            current_stock: Number(r.current_stock || 0),
            inventory_value: r.inventory_value ?? 0,
            cash_locked: r.cash_locked ?? 0,
            avg_daily_sales: Number(r.avg_daily_sales || 0),
            sales_velocity: Number(r.sales_velocity || 0),
            days_to_clear: dtc,
            curve_state: r.curve_state || null,
            reason: r.reason || '',
            markdown_risk_score: r.markdown_risk_score ?? 0,
            is_premium: r.is_premium === true,
            collection_name: r.collection_name || null,
            aging_bucket: bucket,
            aging_label: label,
            daysSinceLastSale,
            lastSaleDate,
            channelHistory,
            recentVelocity,
            recentVelocityWindow,
          };
        })
        .sort((a, b) => b.cash_locked - a.cash_locked);

      // Summary
      const summary: DeadStockSummary = {
        total_items: deadItems.length,
        total_locked_value: deadItems.reduce((s, i) => s + i.cash_locked, 0),
        total_stock: deadItems.reduce((s, i) => s + i.current_stock, 0),
        by_bucket: {
          slow_moving: { items: 0, locked: 0, stock: 0 },
          stagnant: { items: 0, locked: 0, stock: 0 },
          dead_stock: { items: 0, locked: 0, stock: 0 },
        },
      };
      deadItems.forEach(i => {
        const b = summary.by_bucket[i.aging_bucket];
        b.items++;
        b.locked += i.cash_locked;
        b.stock += i.current_stock;
      });

      return { items: deadItems, summary };
    },
    enabled: isReady && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}
