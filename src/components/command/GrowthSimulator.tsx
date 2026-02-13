import { useState, useCallback } from 'react';
import { TrendingUp, Play, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULTS, type SimulationParams, type SimSummary, type GrowthShape } from './growth/types';
import GrowthInputPanel from './growth/GrowthInputPanel';
import GrowthHeroStrip from './growth/GrowthHeroStrip';
import GrowthBeforeAfter from './growth/GrowthBeforeAfter';
import GrowthProductionTable from './growth/GrowthProductionTable';
import GrowthHeroPlan from './growth/GrowthHeroPlan';
import GrowthRiskRegister from './growth/GrowthRiskRegister';
import GrowthExpansionMap from './growth/GrowthExpansionMap';
import GrowthActionBar from './growth/GrowthActionBar';

export default function GrowthSimulator() {
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
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('growth-simulator', {
        body: { params },
      });
      if (fnError) throw fnError;
      if (!data) throw new Error('Không có dữ liệu trả về');
      if (data.error) throw new Error(data.error);

      setSimulation(data.simulation);
      setGrowthShape(data.growthShape);
    } catch (err: any) {
      console.error('[GrowthSim] Error:', err);
      setError(err.message || 'Lỗi không xác định');
      setSimulation(null);
      setGrowthShape(null);
    } finally {
      setIsRunning(false);
    }
  }, [params]);

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
            <Button onClick={handleRun} disabled={isRunning} className="gap-2">
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isRunning ? 'Đang chạy...' : 'Chạy Mô Phỏng'}
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive text-center py-4">{error}</p>
        )}

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
            <GrowthActionBar simulation={simulation} growthShape={growthShape} params={params} />
          </>
        )}

        {!simulation && !isRunning && !error && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Chọn % tăng trưởng và khung thời gian, sau đó nhấn "Chạy Mô Phỏng" để xem kết quả.
          </p>
        )}

        {isRunning && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Đang tính toán trên server...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
