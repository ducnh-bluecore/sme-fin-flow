import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, FileSpreadsheet, Save, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import * as XLSX from 'xlsx';
import type { SimSummary, SimulationParams, GrowthShape } from './types';

interface GrowthActionBarProps {
  simulation: SimSummary;
  growthShape: GrowthShape | null;
  params: SimulationParams;
}

export default function GrowthActionBar({ simulation, growthShape, params }: GrowthActionBarProps) {
  const navigate = useNavigate();
  const { buildInsertQuery, tenantId } = useTenantQueryBuilder();
  const [pushing, setPushing] = useState(false);
  const [pushed, setPushed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  const producibleFCs = simulation.details.filter(d => d.productionQty > 0);

  // ---- Push to Production ----
  const handlePushToProduction = async () => {
    if (!tenantId || producibleFCs.length === 0) return;
    setPushing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const rows = producibleFCs.map(d => {
        const urgency = (d.isHero ? 30 : 0) + (d.segment === 'fast' ? 20 : d.segment === 'normal' ? 10 : 0)
          + Math.min(50, Math.round((d.velocity || 0) * 10));
        return {
          style_id: d.fcCode,
          recommended_qty: Math.round(d.productionQty),
          cash_required: Math.round(d.cashRequired),
          margin_projection: Math.round(d.marginPct * d.projectedRevenue / 100),
          urgency_score: Math.min(100, urgency),
          size_breakdown: null as any,
          status: 'PROPOSED',
          as_of_date: today,
        };
      });

      const { error } = await buildInsertQuery('dec_production_candidates' as any, rows);
      if (error) throw error;

      setPushed(true);
      toast({
        title: `Đã tạo ${rows.length} đề xuất sản xuất`,
        description: 'Chuyển sang trang Production để duyệt',
      });
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setPushing(false);
    }
  };

  // ---- Export Excel ----
  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Tổng Quan
    const overview = [
      ['Chỉ số', 'Giá trị'],
      ['Doanh thu hiện tại', simulation.currentRevenue],
      ['Doanh thu mục tiêu', simulation.targetRevenue],
      ['Gap doanh thu', simulation.gapRevenue],
      ['Tổng sản xuất (units)', simulation.totalProductionUnits],
      ['Tổng cash cần', simulation.totalCashRequired],
      ['Số Hero', simulation.heroCount],
      ['Hero Revenue Share %', simulation.heroRevenueSharePct],
      ['Margin TB %', simulation.avgMarginPct],
      ['Risk Score', simulation.riskScore],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overview), 'Tổng Quan');

    // Sheet 2: Chi Tiết FC
    const detailHeaders = ['FC Code', 'FC Name', 'Hero', 'Segment', 'Velocity', 'Production Qty', 'Cash Required', 'Margin %', 'Projected Revenue', 'DOC After', 'Risk Flags'];
    const detailRows = simulation.details.map(d => [
      d.fcCode, d.fcName, d.isHero ? 'Y' : 'N', d.segment,
      d.velocity, d.productionQty, d.cashRequired, d.marginPct,
      d.projectedRevenue, d.docAfterProduction,
      d.riskFlags.map(r => r.detail).join('; '),
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]), 'Chi Tiết FC');

    // Sheet 3: Chiến Lược
    if (growthShape) {
      const stratHeaders = ['Category', 'Direction', 'Momentum %', 'Margin %', 'Efficiency', 'Reason'];
      const expandRows = growthShape.expandCategories.map(c => [c.category, c.direction, c.momentumPct, c.avgMarginPct, c.efficiencyLabel, c.reason]);
      const avoidRows = growthShape.avoidCategories.map(c => [c.category, c.direction, c.momentumPct, c.avgMarginPct, c.efficiencyLabel, c.reason]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([stratHeaders, ...expandRows, ...avoidRows]), 'Chiến Lược');
    }

    XLSX.writeFile(wb, `growth-sim-${params.growthPct}pct-${params.horizonMonths}m.xlsx`);
    toast({ title: 'Đã xuất file Excel' });
  };

  // ---- Save Scenario ----
  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) {
      toast({ title: 'Vui lòng đặt tên kịch bản', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const summary = {
        currentRevenue: simulation.currentRevenue,
        targetRevenue: simulation.targetRevenue,
        totalProductionUnits: simulation.totalProductionUnits,
        totalCashRequired: simulation.totalCashRequired,
        heroCount: simulation.heroCount,
        heroRevenueSharePct: simulation.heroRevenueSharePct,
        avgMarginPct: simulation.avgMarginPct,
        riskScore: simulation.riskScore,
        fcCount: simulation.details.length,
      };
      const { error } = await buildInsertQuery('growth_scenarios' as any, {
        name: scenarioName.trim(),
        params,
        summary,
      });
      if (error) throw error;
      toast({ title: `Đã lưu kịch bản "${scenarioName.trim()}"` });
      setShowNameInput(false);
      setScenarioName('');
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4 pb-4">
        <p className="text-sm font-semibold text-primary mb-3">HÀNH ĐỘNG TIẾP THEO</p>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Push to Production */}
          {!pushed ? (
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              onClick={handlePushToProduction}
              disabled={pushing || producibleFCs.length === 0}
            >
              {pushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Factory className="h-4 w-4" />}
              Tạo Đề Xuất Sản Xuất ({producibleFCs.length} FC)
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/command/production')}>
              <ExternalLink className="h-4 w-4" /> Xem Đề Xuất Sản Xuất →
            </Button>
          )}

          {/* Export Excel */}
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <FileSpreadsheet className="h-4 w-4" /> Xuất Excel
          </Button>

          {/* Save Scenario */}
          {!showNameInput ? (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowNameInput(true)}>
              <Save className="h-4 w-4" /> Lưu Kịch Bản
            </Button>
          ) : (
            <div className="flex gap-2 items-center">
              <Input
                placeholder={`Tăng ${params.growthPct}% - ${params.horizonMonths} tháng`}
                value={scenarioName}
                onChange={e => setScenarioName(e.target.value)}
                className="h-9 w-56"
                onKeyDown={e => e.key === 'Enter' && handleSaveScenario()}
              />
              <Button size="sm" onClick={handleSaveScenario} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lưu'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
