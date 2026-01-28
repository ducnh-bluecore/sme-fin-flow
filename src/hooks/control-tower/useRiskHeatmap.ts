import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

export type RiskLevel = 'safe' | 'monitor' | 'warning' | 'critical';
export type ModuleCode = 'FDP' | 'MDP' | 'CDP' | 'OTHER';
export type Dimension = 'REVENUE' | 'CASH' | 'OPERATIONS' | 'OTHER';

export interface RiskCell {
  module_code: ModuleCode;
  dimension: Dimension;
  risk_intensity: number; // 0-100
  risk_level: RiskLevel;
  total_impact: number;
  alert_count: number;
  cascade_from: string[];
  cascade_to: string[];
}

export interface CascadeConnection {
  from: { module: ModuleCode; dimension: Dimension };
  to: { module: ModuleCode; dimension: Dimension };
  strength: number; // 0-1
}

export interface RiskHeatmapData {
  cells: RiskCell[];
  cascades: CascadeConnection[];
  max_intensity: number;
  total_impact: number;
}

// Color utilities
export function getRiskColor(intensity: number): string {
  if (intensity <= 20) return 'hsl(142, 76%, 36%)'; // Green
  if (intensity <= 50) return 'hsl(48, 96%, 53%)';  // Yellow
  if (intensity <= 80) return 'hsl(27, 96%, 61%)';  // Orange
  return 'hsl(0, 84%, 60%)'; // Red
}

export function getRiskBgClass(level: RiskLevel): string {
  switch (level) {
    case 'safe': return 'bg-green-500/20 border-green-500/40';
    case 'monitor': return 'bg-yellow-500/20 border-yellow-500/40';
    case 'warning': return 'bg-orange-500/20 border-orange-500/40';
    case 'critical': return 'bg-red-500/20 border-red-500/40';
    default: return 'bg-muted/20 border-muted';
  }
}

export function useRiskHeatmap() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['risk-heatmap', tenantId],
    queryFn: async (): Promise<RiskHeatmapData> => {
      if (!tenantId) throw new Error('No tenant');

      // Call the RPC function (cast to any since it may not be in generated types)
      const { data, error } = await (supabase.rpc as any)('compute_risk_heatmap', {
        p_tenant_id: tenantId,
      });

      if (error) {
        console.error('Risk heatmap error:', error);
        return {
          cells: generateDefaultCells(),
          cascades: getDefaultCascades(),
          max_intensity: 0,
          total_impact: 0,
        };
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        return {
          cells: generateDefaultCells(),
          cascades: getDefaultCascades(),
          max_intensity: 0,
          total_impact: 0,
        };
      }

      const cells: RiskCell[] = data.map((row: any) => ({
        module_code: row.module_code as ModuleCode,
        dimension: row.dimension as Dimension,
        risk_intensity: row.risk_intensity || 0,
        risk_level: row.risk_level as RiskLevel || 'safe',
        total_impact: Number(row.total_impact) || 0,
        alert_count: Number(row.alert_count) || 0,
        cascade_from: row.cascade_from || [],
        cascade_to: row.cascade_to || [],
      }));

      // Build cascade connections from cell data
      const cascades: CascadeConnection[] = [];
      cells.forEach(cell => {
        cell.cascade_to?.forEach(target => {
          const [targetModule, targetDim] = target.split('.');
          cascades.push({
            from: { module: cell.module_code, dimension: cell.dimension },
            to: { module: targetModule as ModuleCode, dimension: targetDim as Dimension },
            strength: Math.min(cell.risk_intensity / 100, 1),
          });
        });
      });

      return {
        cells: fillMissingCells(cells),
        cascades,
        max_intensity: Math.max(...cells.map(c => c.risk_intensity)),
        total_impact: cells.reduce((sum, c) => sum + c.total_impact, 0),
      };
    },
    enabled: !!tenantId,
    refetchInterval: 60000,
  });
}

// Helper to generate default empty cells for the grid
function generateDefaultCells(): RiskCell[] {
  const modules: ModuleCode[] = ['FDP', 'MDP', 'CDP'];
  const dimensions: Dimension[] = ['REVENUE', 'CASH', 'OPERATIONS'];
  
  const cells: RiskCell[] = [];
  modules.forEach(module => {
    dimensions.forEach(dimension => {
      cells.push({
        module_code: module,
        dimension: dimension,
        risk_intensity: 0,
        risk_level: 'safe',
        total_impact: 0,
        alert_count: 0,
        cascade_from: [],
        cascade_to: [],
      });
    });
  });
  
  return cells;
}

// Fill missing cells to ensure 3x3 grid
function fillMissingCells(existing: RiskCell[]): RiskCell[] {
  const defaults = generateDefaultCells();
  
  return defaults.map(defaultCell => {
    const existingCell = existing.find(
      c => c.module_code === defaultCell.module_code && c.dimension === defaultCell.dimension
    );
    return existingCell || defaultCell;
  });
}

// Default cascade relationships
function getDefaultCascades(): CascadeConnection[] {
  return [
    { from: { module: 'CDP', dimension: 'REVENUE' }, to: { module: 'MDP', dimension: 'REVENUE' }, strength: 0.5 },
    { from: { module: 'MDP', dimension: 'REVENUE' }, to: { module: 'FDP', dimension: 'CASH' }, strength: 0.7 },
    { from: { module: 'CDP', dimension: 'OPERATIONS' }, to: { module: 'FDP', dimension: 'OPERATIONS' }, strength: 0.6 },
    { from: { module: 'FDP', dimension: 'CASH' }, to: { module: 'MDP', dimension: 'OPERATIONS' }, strength: 0.4 },
  ];
}
