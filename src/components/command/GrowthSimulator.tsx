import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Play, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { DEFAULTS, type SimulationParams, type SimSummary, type SKUSummary, type FamilyCode, type GrowthShape } from './growth/types';
import { runSimulationV2, computeGrowthShape, type EngineInput } from './growth/simulationEngine';
import GrowthInputPanel from './growth/GrowthInputPanel';
import GrowthHeroStrip from './growth/GrowthHeroStrip';
import GrowthBeforeAfter from './growth/GrowthBeforeAfter';
import GrowthProductionTable from './growth/GrowthProductionTable';
import GrowthHeroPlan from './growth/GrowthHeroPlan';
import GrowthRiskRegister from './growth/GrowthRiskRegister';
import GrowthExpansionMap from './growth/GrowthExpansionMap';

export default function GrowthSimulator() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  const [params, setParams] = useState<SimulationParams>({
    growthPct: 30,
    horizonMonths: 6,
    docHero: DEFAULTS.DOC_HERO,
    docNonHero: DEFAULTS.DOC_NON_HERO,
    safetyStockPct: DEFAULTS.SAFETY_STOCK_PCT,
    cashCap: 0,
    capacityCap: 0,
    overstockThreshold: DEFAULTS.OVERSTOCK_THRESHOLD,
  });

  const [simulation, setSimulation] = useState<SimSummary | null>(null);
  const [growthShape, setGrowthShape] = useState<GrowthShape | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // ---- Data queries (unchanged from v1) ----
  const { data: revenueData, isLoading: revLoading } = useQuery({
    queryKey: ['growth-sim-revenue', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('kpi_facts_daily' as any, 'metric_value')
        .eq('metric_code', 'NET_REVENUE')
        .eq('dimension_type', 'total')
        .order('grain_date', { ascending: false })
        .limit(90);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: isReady,
  });

  const { data: skuData, isLoading: skuLoading } = useQuery({
    queryKey: ['growth-sim-sku', tenantId],
    queryFn: async () => {
      const allData: SKUSummary[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await buildSelectQuery('fdp_sku_summary' as any, '*')
          .order('total_revenue', { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...(data as unknown as SKUSummary[]));
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
    enabled: isReady,
  });

  const { data: fcData, isLoading: fcLoading } = useQuery({
    queryKey: ['growth-sim-fc', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_family_codes' as any, 'id, fc_code, fc_name, is_core_hero')
        .eq('is_active', true).limit(2000);
      if (error) throw error;
      return (data || []) as unknown as FamilyCode[];
    },
    enabled: isReady,
  });

  const { data: skuFcMappingData, isLoading: mappingLoading } = useQuery({
    queryKey: ['growth-sim-sku-fc-map', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_sku_fc_mapping' as any, 'sku, fc_id')
        .eq('is_active', true).limit(5000);
      if (error) throw error;
      return (data || []) as unknown as { sku: string; fc_id: string }[];
    },
    enabled: isReady,
  });

  const { data: inventoryData, isLoading: invLoading } = useQuery({
    queryKey: ['growth-sim-inventory', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_state_positions' as any, 'fc_id, on_hand').limit(10000);
      if (error) throw error;
      return (data || []) as unknown as { fc_id: string; on_hand: number }[];
    },
    enabled: isReady,
  });

  const { data: demandData, isLoading: demandLoading } = useQuery({
    queryKey: ['growth-sim-demand', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('inv_state_demand' as any, 'fc_id, sales_velocity, avg_daily_sales, trend').limit(5000);
      if (error) throw error;
      return (data || []) as unknown as { fc_id: string; sales_velocity: number; avg_daily_sales: number; trend: string | null }[];
    },
    enabled: isReady,
  });

  // Momentum data: compare recent 15 days vs prior 15 days from cdp_order_items
  const { data: momentumData, isLoading: momentumLoading } = useQuery({
    queryKey: ['growth-sim-momentum', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('cdp_order_items' as any, 'sku, qty, order_id')
        .limit(10000);
      if (error) throw error;
      // We also need order dates — fetch cdp_orders
      const { data: ordersData, error: ordersErr } = await buildSelectQuery('cdp_orders' as any, 'id, order_at')
        .gte('order_at', new Date(Date.now() - 30 * 86400000).toISOString())
        .limit(10000);
      if (ordersErr) throw ordersErr;

      const orderDateMap = new Map<string, string>();
      for (const o of (ordersData || []) as any[]) {
        orderDateMap.set(o.id, o.order_at);
      }

      const cutoff = new Date(Date.now() - 15 * 86400000).toISOString();
      const skuMomentum = new Map<string, { recent: number; prior: number }>();
      for (const item of (data || []) as any[]) {
        if (!item.sku || !item.order_id) continue;
        const orderDate = orderDateMap.get(item.order_id);
        if (!orderDate) continue;
        const entry = skuMomentum.get(item.sku) || { recent: 0, prior: 0 };
        if (orderDate >= cutoff) {
          entry.recent += (item.qty || 0);
        } else {
          entry.prior += (item.qty || 0);
        }
        skuMomentum.set(item.sku, entry);
      }
      return skuMomentum;
    },
    enabled: isReady,
  });

  // ---- Derived maps ----
  const skuFcMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!skuFcMappingData || !fcData) return map;
    const fcIdToCode = new Map<string, string>();
    for (const fc of fcData) fcIdToCode.set(fc.id, fc.fc_code);
    for (const m of skuFcMappingData) {
      if (!m.sku || !m.fc_id) continue;
      const fcCode = fcIdToCode.get(m.fc_id);
      if (fcCode) map.set(m.sku, fcCode);
    }
    return map;
  }, [skuFcMappingData, fcData]);

  const skuFcIdMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!skuFcMappingData) return map;
    for (const m of skuFcMappingData) {
      if (m.sku && m.fc_id) map.set(m.sku, m.fc_id);
    }
    return map;
  }, [skuFcMappingData]);

  const inventoryByFcId = useMemo(() => {
    const map = new Map<string, number>();
    if (!inventoryData) return map;
    for (const inv of inventoryData) {
      if (!inv.fc_id) continue;
      map.set(inv.fc_id, (map.get(inv.fc_id) || 0) + (inv.on_hand || 0));
    }
    return map;
  }, [inventoryData]);

  const demandByFcId = useMemo(() => {
    const map = new Map<string, { velocity: number; avgDaily: number; trend: string | null }>();
    if (!demandData) return map;
    for (const d of demandData) {
      if (!d.fc_id) continue;
      const existing = map.get(d.fc_id);
      if (!existing || d.avg_daily_sales > existing.avgDaily) {
        map.set(d.fc_id, { velocity: d.sales_velocity || 0, avgDaily: d.avg_daily_sales || 0, trend: d.trend });
      }
    }
    return map;
  }, [demandData]);

  const dataLoading = revLoading || skuLoading || fcLoading || invLoading || mappingLoading || demandLoading || momentumLoading;
  const dataReady = !!revenueData?.length && !!skuData?.length;

  const handleRun = useCallback(() => {
    if (!revenueData || !skuData) return;
    setIsRunning(true);
    setTimeout(() => {
      const input: EngineInput = {
        revenueData, skuData, fcData: fcData || [],
        skuFcMap, skuFcIdMap, inventoryByFcId, demandByFcId,
        params,
      };
      const result = runSimulationV2(input);
      setSimulation(result);
      if (result) {
        const shape = computeGrowthShape(result.details, skuData, skuFcMap, params, momentumData || new Map());
        setGrowthShape(shape);
      } else {
        setGrowthShape(null);
      }
      setIsRunning(false);
    }, 100);
  }, [revenueData, skuData, fcData, skuFcMap, skuFcIdMap, inventoryByFcId, demandByFcId, params, momentumData]);

  const heroes = simulation?.details.filter(d => d.isHero) || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Mô Phỏng Tăng Trưởng v2
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Panel + Run Button */}
        <div className="space-y-4">
          <GrowthInputPanel params={params} onChange={setParams} />
          <div className="flex justify-end">
            <Button onClick={handleRun} disabled={dataLoading || !dataReady || isRunning} className="gap-2">
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {dataLoading ? 'Đang tải...' : 'Chạy Mô Phỏng'}
            </Button>
          </div>
        </div>

        {/* Results */}
        {simulation && (
          <>
            <GrowthHeroStrip sim={simulation} />
            {growthShape && (
              <GrowthExpansionMap shape={growthShape} growthPct={params.growthPct} horizonMonths={params.horizonMonths} />
            )}
            <GrowthBeforeAfter data={simulation.beforeAfter} />
            <GrowthProductionTable details={simulation.details} />
            <GrowthHeroPlan
              heroes={heroes}
              candidates={simulation.heroCandidates}
              heroGap={simulation.heroGap}
              growthPct={params.growthPct}
              horizonMonths={params.horizonMonths}
            />
            <GrowthRiskRegister risks={simulation.topRisks} />
          </>
        )}

        {!simulation && !isRunning && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {dataLoading
              ? 'Đang tải dữ liệu...'
              : 'Chọn % tăng trưởng và khung thời gian, sau đó nhấn "Chạy Mô Phỏng" để xem kết quả.'}
          </p>
        )}

        {isRunning && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Đang tính toán...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
