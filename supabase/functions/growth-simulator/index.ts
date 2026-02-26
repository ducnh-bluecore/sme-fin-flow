import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---- Types ----
interface SimulationParams {
  growthPct: number;
  horizonMonths: number;
  docHero: number;
  docNonHero: number;
  safetyStockPct: number;
  cashCap: number;
  capacityCap: number;
  overstockThreshold: number;
}

interface SKUSummary {
  sku: string | null;
  product_name: string | null;
  category: string | null;
  total_revenue: number | null;
  total_quantity: number | null;
  total_cogs: number | null;
  gross_profit: number | null;
  margin_percent: number | null;
  avg_unit_price: number | null;
  avg_unit_cogs: number | null;
}

interface FamilyCode {
  id: string;
  fc_code: string;
  fc_name: string;
  is_core_hero: boolean;
}

type MoverSegment = 'fast' | 'normal' | 'slow';
type RiskType = 'stockout' | 'overstock' | 'concentration' | 'slow_mover_high_stock';

interface RiskFlag {
  type: RiskType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detail: string;
  suggestion: string;
}

interface SimResult {
  fcCode: string;
  fcName: string;
  fcId: string | null;
  isHeroManual: boolean;
  isHeroCalculated: boolean;
  isHero: boolean;
  heroScore: number;
  segment: MoverSegment;
  velocity: number;
  velocity7d: number;
  velocityTrend: string | null;
  forecastDemand: number;
  onHandQty: number;
  docCurrent: number;
  docAfterProduction: number;
  productionQty: number;
  cashRequired: number;
  currentRevenue: number;
  currentQty: number;
  projectedRevenue: number;
  marginPct: number;
  projectedMargin: number;
  growthContributionPct: number;
  riskFlags: RiskFlag[];
  reason: string;
}

// ---- Constants ----
const DEFAULTS = {
  DOC_HERO: 60,
  DOC_NON_HERO: 30,
  SAFETY_STOCK_PCT: 15,
  LEAD_TIME_BUFFER: 14,
  HERO_REVENUE_TARGET_SHARE: 0.6,
  OVERSTOCK_THRESHOLD: 1.5,
  SLOW_MOVER_VELOCITY: 0.1,
  HERO_MARGIN_THRESHOLD: 40,
  FAST_MOVER_PERCENTILE: 70,
  SLOW_MOVER_PERCENTILE: 30,
};

// ---- Helpers ----
function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function percentileRank(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 0;
  const idx = sortedValues.filter(v => v < value).length;
  return (idx / sortedValues.length) * 100;
}

function scale025(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clamp(((value - min) / (max - min)) * 25, 0, 25);
}

function classifyCategory(fcName: string): string {
  const n = fcName.toLowerCase();
  if (/top|shirt|blouse|ao|áo/.test(n) && !/khoác|jacket|coat|blazer/.test(n)) return 'Áo/Tops';
  if (/dress|dam|đầm/.test(n)) return 'Đầm/Dresses';
  if (/skirt|vay|váy|chân váy/.test(n)) return 'Váy/Skirts';
  if (/pant|jean|quan|quần/.test(n)) return 'Quần/Bottoms';
  if (/set/.test(n)) return 'Set';
  if (/jacket|coat|blazer|khoác/.test(n)) return 'Áo khoác';
  return 'Khác';
}

function extractSize(sku: string): string | null {
  const u = sku.toUpperCase().trim();
  if (u.endsWith('XL')) return 'XL';
  if (u.endsWith('XS')) return 'XS';
  if (u.endsWith('L') && !u.endsWith('XL')) return 'L';
  if (u.endsWith('M')) return 'M';
  if (u.endsWith('S') && !u.endsWith('XS')) return 'S';
  return null;
}

// ---- Paginated fetch helper ----
async function fetchAll(supabase: any, table: string, select: string, filters?: (q: any) => any, pageSize = 1000) {
  const all: any[] = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (filters) q = filters(q);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

// ---- Main simulation engine (server-side) ----
function runSimulation(
  revenueData: any[],
  skuData: SKUSummary[],
  fcData: FamilyCode[],
  skuFcMappingData: { sku: string; fc_id: string }[],
  inventoryData: { fc_id: string; on_hand: number }[],
  demandData: { fc_id: string; sales_velocity: number; avg_daily_sales: number; trend: string | null }[],
  momentumMap: Map<string, { recent: number; prior: number }>,
  params: SimulationParams,
) {
  if (!revenueData?.length || !skuData?.length) return null;

  // Build maps
  const fcIdToCode = new Map<string, string>();
  const fcCodeToId = new Map<string, string>();
  const fcNameMap = new Map<string, string>();
  const heroSetById = new Set<string>();
  const heroSetByCode = new Set<string>();

  for (const fc of fcData) {
    fcIdToCode.set(fc.id, fc.fc_code);
    fcCodeToId.set(fc.fc_code, fc.id);
    fcNameMap.set(fc.fc_code, fc.fc_name);
    if (fc.is_core_hero) {
      heroSetById.add(fc.id);
      heroSetByCode.add(fc.fc_code);
    }
  }

  const skuFcMap = new Map<string, string>();
  const skuFcIdMap = new Map<string, string>();
  for (const m of skuFcMappingData) {
    if (!m.sku || !m.fc_id) continue;
    const fcCode = fcIdToCode.get(m.fc_id);
    if (fcCode) skuFcMap.set(m.sku, fcCode);
    skuFcIdMap.set(m.sku, m.fc_id);
  }

  const inventoryByFcId = new Map<string, number>();
  for (const inv of inventoryData) {
    if (!inv.fc_id) continue;
    inventoryByFcId.set(inv.fc_id, (inventoryByFcId.get(inv.fc_id) || 0) + (inv.on_hand || 0));
  }

  const demandByFcId = new Map<string, { velocity: number; avgDaily: number; trend: string | null }>();
  for (const d of demandData) {
    if (!d.fc_id) continue;
    const existing = demandByFcId.get(d.fc_id);
    if (!existing || d.avg_daily_sales > existing.avgDaily) {
      demandByFcId.set(d.fc_id, { velocity: d.sales_velocity || 0, avgDaily: d.avg_daily_sales || 0, trend: d.trend });
    }
  }

  // Step 0: Baseline revenue
  const totalDailyRevenue = revenueData.reduce((s: number, r: any) => s + (Number(r.metric_value) || 0), 0);
  const daysCount = revenueData.length || 1;
  const avgDailyRevenue = totalDailyRevenue / daysCount;
  const monthlyRevenue = avgDailyRevenue * 30;
  const horizonDays = params.horizonMonths * 30;
  const currentRevenue = monthlyRevenue * params.horizonMonths;
  const targetRevenue = currentRevenue * (1 + params.growthPct / 100);
  const gapRevenue = targetRevenue - currentRevenue;

  // Step 2: Aggregate SKU → FC
  interface FCAgg {
    fcCode: string;
    fcId: string | null;
    revenue: number;
    qty: number;
    cogs: number;
    profit: number;
    avgPrice: number;
    avgCogs: number;
    count: number;
    isFashion: boolean;
    isHeroManual: boolean;
    velocity: number;
    velocity7d: number;
    trend: string | null;
  }

  const fcAggMap = new Map<string, FCAgg>();
  for (const sku of skuData) {
    if (!sku.sku) continue;
    const mappedFcCode = skuFcMap.get(sku.sku);
    const fcCode = mappedFcCode || sku.sku;
    const isFashion = !!mappedFcCode;
    let fcId = skuFcIdMap.get(sku.sku) || null;
    if (!fcId && fcCodeToId.has(fcCode)) fcId = fcCodeToId.get(fcCode) || null;

    const isHeroManual = heroSetByCode.has(fcCode) || (!!fcId && heroSetById.has(fcId));

    const existing = fcAggMap.get(fcCode) || {
      fcCode, fcId: null, revenue: 0, qty: 0, cogs: 0, profit: 0,
      avgPrice: 0, avgCogs: 0, count: 0, isFashion: false, isHeroManual: false,
      velocity: 0, velocity7d: 0, trend: null,
    };
    existing.revenue += sku.total_revenue || 0;
    existing.qty += sku.total_quantity || 0;
    existing.cogs += sku.total_cogs || 0;
    existing.profit += sku.gross_profit || 0;
    existing.avgPrice += sku.avg_unit_price || 0;
    existing.avgCogs += sku.avg_unit_cogs || 0;
    existing.count += 1;
    if (isFashion) existing.isFashion = true;
    if (fcId) existing.fcId = fcId;
    if (isHeroManual) existing.isHeroManual = true;

    const dInfo = fcId ? demandByFcId.get(fcId) : null;
    if (dInfo) {
      existing.velocity = dInfo.avgDaily;
      existing.velocity7d = dInfo.velocity;
      existing.trend = dInfo.trend;
    }
    fcAggMap.set(fcCode, existing);
  }

  const allFCs = Array.from(fcAggMap.values()).filter(fc => fc.isFashion);
  if (allFCs.length === 0) return null;

  // Step 3: Percentile data
  const allVelocities = allFCs.map(fc => fc.velocity).sort((a, b) => a - b);
  const allMargins = allFCs.map(fc => {
    const p = fc.count > 0 ? fc.avgPrice / fc.count : 0;
    const c = fc.count > 0 ? fc.avgCogs / fc.count : 0;
    return p > 0 ? ((p - c) / p) * 100 : 0;
  }).sort((a, b) => a - b);

  // Step 4: Process each FC
  const details: SimResult[] = [];
  const fashionTotalRevenue = allFCs.reduce((s, fc) => s + fc.revenue, 0);

  for (const fc of allFCs) {
    const unitPrice = fc.count > 0 ? fc.avgPrice / fc.count : 250000;
    const unitCogs = fc.count > 0 ? fc.avgCogs / fc.count : 150000;
    const marginPct = unitPrice > 0 ? ((unitPrice - unitCogs) / unitPrice) * 100 : 0;

    const vBase = fc.velocity;
    const trendRatio = fc.velocity > 0 ? fc.velocity7d / fc.velocity : 1;
    const vForecast = vBase * clamp(trendRatio, 0.7, 1.3);
    const forecastDemand = vForecast * horizonDays;

    const velPercentile = percentileRank(fc.velocity, allVelocities);
    let segment: MoverSegment = 'normal';
    if (fc.velocity < 0.5) segment = 'slow';
    else if (fc.velocity >= 3 && velPercentile >= DEFAULTS.FAST_MOVER_PERCENTILE) segment = 'fast';
    else if (velPercentile >= DEFAULTS.FAST_MOVER_PERCENTILE && fc.velocity >= 1) segment = 'fast';
    else if (velPercentile <= DEFAULTS.SLOW_MOVER_PERCENTILE || fc.velocity < 1) segment = 'slow';

    const isHeroManual = fc.isHeroManual;

    const velocityScore = scale025(fc.velocity, allVelocities[0] ?? 0, allVelocities[allVelocities.length - 1] ?? 1);
    const marginScore = scale025(marginPct, allMargins[0] ?? 0, allMargins[allMargins.length - 1] ?? 100);
    const stability = fc.velocity > 0 ? 1 - Math.abs(fc.velocity7d - fc.velocity) / fc.velocity : 0;
    const stabilityScore = scale025(clamp(stability, 0, 1), 0, 1);

    const onHandQty = fc.fcId ? (inventoryByFcId.get(fc.fcId) || 0) : 0;
    const docCurrent = vForecast > 0 ? onHandQty / vForecast : 0;
    const docHealthy = docCurrent >= 30 && docCurrent <= 90;
    const inventoryHealthScore = docHealthy ? 25 : scale025(clamp(docCurrent, 0, 120), 0, 120);

    const heroScore = Math.round(velocityScore + marginScore + stabilityScore + inventoryHealthScore);
    const isHeroCalculated = heroScore >= 80 && marginPct >= DEFAULTS.HERO_MARGIN_THRESHOLD;
    const isHero = isHeroManual || isHeroCalculated;

    // Tầng 2: Slow mover Hero -> giảm DOC target xuống tối đa 30 ngày
    let targetDOC = isHero ? params.docHero : params.docNonHero;
    if (segment === 'slow' && isHero) {
      targetDOC = Math.min(targetDOC, 30);
    }

    const safetyQty = (params.safetyStockPct / 100) * forecastDemand;
    const requiredSupply = forecastDemand + safetyQty + (targetDOC * vForecast);
    let productionQty = Math.max(0, Math.round(requiredSupply - onHandQty));

    // Tầng 1: Chặn slow mover không phải Hero (velocity < 0.5/ngày)
    if (segment === 'slow' && !isHero) {
      productionQty = 0;
    }

    // Tầng 3: Cash Recovery Filter - cap DOC sau SX ở 120 ngày
    let docAfterProduction = vForecast > 0 ? (onHandQty + productionQty) / vForecast : 0;
    if (docAfterProduction > 120 && productionQty > 0) {
      productionQty = Math.max(0, Math.round(90 * vForecast - onHandQty));
      docAfterProduction = vForecast > 0 ? (onHandQty + productionQty) / vForecast : 0;
    }

    const cashRequired = productionQty * unitCogs;
    const projectedRevenue = productionQty * unitPrice;
    const projectedMargin = productionQty * (unitPrice - unitCogs);

    const riskFlags: RiskFlag[] = [];
    if (vForecast > 0 && onHandQty / vForecast < DEFAULTS.LEAD_TIME_BUFFER) {
      riskFlags.push({
        type: 'stockout',
        severity: onHandQty === 0 ? 'critical' : 'high',
        detail: `Tồn kho chỉ đủ ${Math.round(onHandQty / vForecast)} ngày`,
        suggestion: isHero ? 'Tăng depth sản xuất gấp' : 'Bổ sung sản xuất',
      });
    }
    if (onHandQty > forecastDemand * params.overstockThreshold && forecastDemand > 0) {
      riskFlags.push({
        type: 'overstock',
        severity: onHandQty > forecastDemand * 2 ? 'high' : 'medium',
        detail: `Tồn kho gấp ${(onHandQty / forecastDemand).toFixed(1)}x nhu cầu`,
        suggestion: segment === 'slow' ? 'Markdown / Bundle' : 'Delay sản xuất',
      });
    }
    if (segment === 'slow' && onHandQty > 0) {
      riskFlags.push({
        type: 'slow_mover_high_stock',
        severity: fc.velocity < 0.2 ? 'high' : 'medium',
        detail: `Bán chậm (${fc.velocity.toFixed(2)} SP/ngày) còn ${onHandQty} tồn, DOC ${Math.round(docAfterProduction)} ngày`,
        suggestion: productionQty === 0 ? 'Không SX - rủi ro khóa cash' : 'Giảm SX / Bundle / Markdown',
      });
    }

    const growthContributionPct = gapRevenue > 0 ? (projectedRevenue / gapRevenue) * 100 : 0;

    const reasons: string[] = [];
    if (fc.velocity >= 5) reasons.push(`🔥 Bán nhanh (${fc.velocity.toFixed(1)} SP/ngày)`);
    else if (fc.velocity >= 1) reasons.push(`Tốc độ TB (${fc.velocity.toFixed(1)} SP/ngày)`);
    else if (fc.velocity > 0) reasons.push(`⚠ Bán chậm (${fc.velocity.toFixed(2)} SP/ngày)`);
    else reasons.push('⛔ Không có dữ liệu tốc độ bán');
    if (fc.trend === 'up') reasons.push('📈 Xu hướng tăng');
    else if (fc.trend === 'down') reasons.push('📉 Xu hướng giảm');
    if (isHeroManual) reasons.push('⭐ Hero (manual)');
    else if (isHeroCalculated) reasons.push('🏆 Hero candidate');
    if (marginPct > 60) reasons.push(`Margin cao (${marginPct.toFixed(0)}%)`);
    else if (marginPct < 20) reasons.push(`⚠ Margin thấp (${marginPct.toFixed(0)}%)`);
    if (productionQty === 0 && segment === 'slow' && !isHero) {
      reasons.push('⛔ Không SX - bán chậm, rủi ro khóa cash');
    } else if (segment === 'slow' && isHero && productionQty > 0) {
      reasons.push('⚠ SX giới hạn - Hero nhưng velocity thấp');
    }

    details.push({
      fcCode: fc.fcCode,
      fcName: fcNameMap.get(fc.fcCode) || fc.fcCode,
      fcId: fc.fcId,
      isHeroManual, isHeroCalculated, isHero, heroScore, segment,
      velocity: fc.velocity, velocity7d: fc.velocity7d, velocityTrend: fc.trend,
      forecastDemand, onHandQty,
      docCurrent: Math.round(docCurrent),
      docAfterProduction: Math.round(docAfterProduction),
      productionQty, cashRequired,
      currentRevenue: fc.revenue, currentQty: fc.qty,
      projectedRevenue, marginPct, projectedMargin, growthContributionPct,
      riskFlags, reason: reasons.join(' · '),
    });
  }

  // Constraints
  details.sort((a, b) => {
    if (a.isHero !== b.isHero) return a.isHero ? -1 : 1;
    return b.heroScore - a.heroScore;
  });

  if (params.cashCap > 0) {
    let totalCash = 0;
    for (const d of details) {
      totalCash += d.cashRequired;
      if (totalCash > params.cashCap) {
        d.productionQty = 0; d.cashRequired = 0; d.projectedRevenue = 0; d.projectedMargin = 0;
      }
    }
  }
  if (params.capacityCap > 0) {
    const capPerHorizon = params.capacityCap * params.horizonMonths;
    let totalQty = 0;
    for (const d of details) {
      totalQty += d.productionQty;
      if (totalQty > capPerHorizon) {
        d.productionQty = 0; d.cashRequired = 0; d.projectedRevenue = 0; d.projectedMargin = 0;
      }
    }
  }

  // Concentration risk
  const allRisks: RiskFlag[] = [];
  const productionDetails = details.filter(d => d.productionQty > 0);
  const totalProduction = productionDetails.reduce((s, d) => s + d.productionQty, 0);
  if (totalProduction > 0) {
    const top3 = productionDetails.slice(0, 3);
    const top3Share = top3.reduce((s, d) => s + d.productionQty, 0) / totalProduction;
    if (top3Share > 0.5) {
      allRisks.push({
        type: 'concentration',
        severity: top3Share > 0.7 ? 'critical' : 'high',
        detail: `Top 3 FC chiếm ${(top3Share * 100).toFixed(0)}% tổng SX`,
        suggestion: 'Cân nhắc phân tán sản xuất',
      });
    }
  }
  // Aggregate risks by type instead of listing each individually
  const riskAgg = new Map<string, { count: number; severity: string; examples: string[]; totalQty: number }>();
  for (const d of details) {
    for (const r of d.riskFlags) {
      const existing = riskAgg.get(r.type);
      if (existing) {
        existing.count++;
        if (r.severity === 'critical' || (r.severity === 'high' && existing.severity !== 'critical')) {
          existing.severity = r.severity;
        }
        if (existing.examples.length < 3) existing.examples.push(d.fcName || d.fcCode);
        existing.totalQty += d.onHandQty;
      } else {
        riskAgg.set(r.type, { count: 1, severity: r.severity, examples: [d.fcName || d.fcCode], totalQty: d.onHandQty });
      }
    }
  }

  const riskTypeLabels: Record<string, string> = {
    stockout: 'Hết hàng / Sắp hết',
    overstock: 'Tồn kho dư thừa',
    slow_mover_high_stock: 'Bán chậm + Tồn cao',
  };

  for (const [type, agg] of riskAgg) {
    const exampleStr = agg.examples.join(', ') + (agg.count > 3 ? ` (+${agg.count - 3} khác)` : '');
    const label = riskTypeLabels[type] || type;

    if (type === 'stockout') {
      allRisks.push({
        type,
        severity: agg.severity as RiskFlag['severity'],
        detail: `${agg.count} FC ${label.toLowerCase()} — cần bổ sung sản xuất`,
        suggestion: `Ưu tiên: ${exampleStr}`,
      });
    } else if (type === 'overstock') {
      allRisks.push({
        type,
        severity: agg.severity as RiskFlag['severity'],
        detail: `${agg.count} FC tồn kho vượt nhu cầu — rủi ro khóa cash`,
        suggestion: `Markdown/Bundle: ${exampleStr}`,
      });
    } else if (type === 'slow_mover_high_stock') {
      allRisks.push({
        type,
        severity: agg.severity as RiskFlag['severity'],
        detail: `${agg.count} FC bán chậm còn tồn — DOC cao, rủi ro cash`,
        suggestion: `Xem xét: ${exampleStr}`,
      });
    } else {
      allRisks.push({
        type,
        severity: agg.severity as RiskFlag['severity'],
        detail: `${agg.count} FC gặp vấn đề ${type}`,
        suggestion: exampleStr,
      });
    }
  }

  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  allRisks.sort((a, b) => (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3));

  // Hero Gap
  const heroFCs = details.filter(d => d.isHero);
  const heroRevenue = heroFCs.reduce((s, d) => s + d.currentRevenue, 0);
  const heroRevenueShare = fashionTotalRevenue > 0 ? heroRevenue / fashionTotalRevenue : 0;

  const heroCapacity = heroFCs.reduce((s, d) => {
    const up = d.currentQty > 0 ? d.currentRevenue / d.currentQty : 0;
    return s + Math.min(d.onHandQty + d.productionQty, d.forecastDemand) * up;
  }, 0);
  const heroNeed = gapRevenue * DEFAULTS.HERO_REVENUE_TARGET_SHARE;
  const gap = Math.max(0, heroNeed - heroCapacity);
  const recoverabilityPct = heroNeed > 0 ? clamp((heroCapacity / heroNeed) * 100, 0, 100) : 100;

  const heroCandidates = details
    .filter(d => !d.isHeroManual && d.heroScore >= 50)
    .sort((a, b) => b.heroScore - a.heroScore)
    .slice(0, 10);

  const avgCandidateCapacity = heroCandidates.length > 0
    ? heroCandidates.reduce((s, d) => s + d.projectedRevenue, 0) / heroCandidates.length : 1;
  const heroCountGap = avgCandidateCapacity > 0 ? Math.ceil(gap / avgCandidateCapacity) : 0;

  const heroGap = {
    incrementalRevenueNeeded: gapRevenue,
    heroCapacity, heroNeed, gap, heroCountGap, recoverabilityPct,
    recoverabilityMessage: recoverabilityPct >= 80
      ? `Có thể đạt ${recoverabilityPct.toFixed(0)}% target bằng tăng depth hero hiện có`
      : `Cần thêm ~${heroCountGap} hero mới để đạt target`,
  };

  // Before / After
  const totalProductionUnits = details.reduce((s, d) => s + d.productionQty, 0);
  const totalCashRequired = details.reduce((s, d) => s + d.cashRequired, 0);
  const totalProjectedMargin = details.reduce((s, d) => s + d.projectedMargin, 0);
  const avgMarginPct = totalCashRequired + totalProjectedMargin > 0
    ? (totalProjectedMargin / (totalCashRequired + totalProjectedMargin)) * 100 : 0;

  const stockoutBefore = details.filter(d => d.riskFlags.some(r => r.type === 'stockout')).length;
  const stockoutAfter = details.filter(d => d.productionQty > 0 && d.docAfterProduction < DEFAULTS.LEAD_TIME_BUFFER).length;
  const avgDOCBefore = details.length > 0 ? details.reduce((s, d) => s + d.docCurrent, 0) / details.length : 0;
  const avgDOCAfter = details.length > 0 ? details.reduce((s, d) => s + d.docAfterProduction, 0) / details.length : 0;

  const heroShareAfter = (() => {
    const heroRev = heroFCs.reduce((s, d) => s + d.currentRevenue + d.projectedRevenue, 0);
    const totalRev = fashionTotalRevenue + details.reduce((s, d) => s + d.projectedRevenue, 0);
    return totalRev > 0 ? (heroRev / totalRev) * 100 : 0;
  })();

  const beforeAfter = {
    revenueProjected: [currentRevenue, currentRevenue + details.reduce((s, d) => s + d.projectedRevenue, 0)] as [number, number],
    marginPct: [avgMarginPct, avgMarginPct] as [number, number],
    heroRevenueShare: [heroRevenueShare * 100, heroShareAfter] as [number, number],
    stockoutRiskCount: [stockoutBefore, stockoutAfter] as [number, number],
    avgDOC: [Math.round(avgDOCBefore), Math.round(avgDOCAfter)] as [number, number],
  };

  // Risk Score
  const stockoutRatio = details.length > 0 ? details.filter(d => d.riskFlags.some(r => r.type === 'stockout')).length / details.length : 0;
  const overstockRatio = details.length > 0 ? details.filter(d => d.riskFlags.some(r => r.type === 'overstock')).length / details.length : 0;
  const concentrationScore = allRisks.some(r => r.type === 'concentration') ? 1 : 0;
  const riskScore = Math.round(stockoutRatio * 40 + overstockRatio * 30 + concentrationScore * 30);

  details.sort((a, b) => b.productionQty - a.productionQty);

  const simulation = {
    totalProductionUnits, totalCashRequired,
    heroCount: heroFCs.length, heroRevenueSharePct: heroRevenueShare * 100,
    riskScore, heroGap, beforeAfter,
    currentRevenue, targetRevenue, gapRevenue, avgMarginPct, totalProjectedMargin,
    details, topRisks: allRisks.slice(0, 10), heroCandidates,
  };

  // ---- Growth Shape ----
  const fcMomentumMap = new Map<string, { recent: number; prior: number }>();
  for (const [sku, m] of momentumMap) {
    const fcCode = skuFcMap.get(sku);
    if (!fcCode) continue;
    const existing = fcMomentumMap.get(fcCode) || { recent: 0, prior: 0 };
    existing.recent += m.recent;
    existing.prior += m.prior;
    fcMomentumMap.set(fcCode, existing);
  }

  const catMap = new Map<string, {
    fcs: SimResult[];
    totalVelocity: number;
    recentQty: number;
    priorQty: number;
    totalRevenue: number;
    sumMargin: number;
    sumDOC: number;
    overstockCount: number;
  }>();
  const totalRevAll = details.reduce((s, d) => s + d.currentRevenue, 0);

  for (const d of details) {
    const cat = classifyCategory(d.fcName);
    const e = catMap.get(cat) || {
      fcs: [], totalVelocity: 0, recentQty: 0, priorQty: 0, totalRevenue: 0,
      sumMargin: 0, sumDOC: 0, overstockCount: 0,
    };
    e.fcs.push(d);
    e.totalVelocity += d.velocity;
    const fcM = fcMomentumMap.get(d.fcCode);
    if (fcM) { e.recentQty += fcM.recent; e.priorQty += fcM.prior; }
    e.totalRevenue += d.currentRevenue;
    e.sumMargin += d.marginPct;
    e.sumDOC += d.docCurrent;
    if (d.riskFlags.some(r => r.type === 'overstock')) e.overstockCount++;
    catMap.set(cat, e);
  }

  const catAvgVelocities: number[] = [];
  for (const [, e] of catMap) {
    if (e.fcs.length > 0) catAvgVelocities.push(e.totalVelocity / e.fcs.length);
  }
  const maxCatVelocity = Math.max(...catAvgVelocities, 0.01);

  const categories: any[] = [];
  for (const [cat, e] of catMap) {
    const n = e.fcs.length;
    if (n === 0) continue;
    const avgVelocity = e.totalVelocity / n;
    const avgMargin = e.sumMargin / n;
    const avgDOC = e.sumDOC / n;
    const overstockR = e.overstockCount / n;
    const revenueShare = totalRevAll > 0 ? (e.totalRevenue / totalRevAll) * 100 : 0;
    const momentumPct = e.priorQty > 0 ? ((e.recentQty - e.priorQty) / e.priorQty) * 100 : (e.recentQty > 0 ? 100 : 0);

    const velScore = clamp(avgVelocity / maxCatVelocity, 0, 1) * 40;
    const mScore = clamp(avgMargin / 100, 0, 1) * 25;
    const iScore = (1 - clamp(overstockR, 0, 1)) * 20;
    const stabilityRatio = e.priorQty > 0 ? 1 - Math.abs(e.recentQty - e.priorQty) / Math.max(e.recentQty, e.priorQty) : 0.5;
    const sScore = clamp(stabilityRatio, 0, 1) * 15;
    const rBonus = clamp(revenueShare / 30, 0, 1) * 10;
    const efficiencyScore = Math.round(Math.min(100, velScore + mScore + iScore + sScore + rBonus));
    const efficiencyLabel = efficiencyScore >= 65 ? 'CAO' : efficiencyScore >= 40 ? 'TRUNG BÌNH' : 'THẤP';
    const direction = (efficiencyLabel === 'CAO' && momentumPct >= -10) ? 'expand'
      : (efficiencyScore >= 55 && momentumPct >= 0 && revenueShare >= 10) ? 'expand'
      : (efficiencyLabel === 'THẤP' || momentumPct < -30) ? 'avoid' : 'hold';

    const reasons: string[] = [];
    if (avgVelocity >= maxCatVelocity * 0.7) reasons.push('Tốc độ bán tốt');
    else if (avgVelocity < maxCatVelocity * 0.2) reasons.push('Luân chuyển chậm');
    if (avgMargin >= 50) reasons.push('biên lợi nhuận cao');
    else if (avgMargin < 25) reasons.push('biên lợi nhuận thấp');
    if (revenueShare >= 20) reasons.push(`chiếm ${revenueShare.toFixed(0)}% doanh thu`);
    if (momentumPct > 10) reasons.push('xu hướng tăng');
    else if (momentumPct < -10) reasons.push('cầu đang giảm');
    if (overstockR > 0.3) reasons.push('rủi ro tồn kho');

    categories.push({
      category: cat, fcCount: n, totalVelocity: e.totalVelocity, avgVelocity, momentumPct,
      avgMarginPct: avgMargin, avgDOC, overstockRatio: overstockR, revenueShare,
      efficiencyScore, efficiencyLabel, direction,
      reason: reasons.join(', ') || 'Dữ liệu trung bình',
    });
  }
  categories.sort((a: any, b: any) => b.efficiencyScore - a.efficiencyScore);

  // Size shifts
  const sizeMap = new Map<string, { velocity: number; count: number }>();
  for (const sku of skuData) {
    if (!sku.sku) continue;
    const fcCode = skuFcMap.get(sku.sku);
    if (!fcCode) continue;
    const size = extractSize(sku.sku);
    if (!size) continue;
    const fc = details.find(d => d.fcCode === fcCode);
    if (!fc) continue;
    const e = sizeMap.get(size) || { velocity: 0, count: 0 };
    e.velocity += fc.velocity / Math.max(fc.currentQty, 1) * (sku.total_quantity || 0);
    e.count++;
    sizeMap.set(size, e);
  }
  const totalSizeVelocity = Array.from(sizeMap.values()).reduce((s, e) => s + e.velocity, 0);
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL'];
  const equalShare = sizeMap.size > 0 ? 100 / sizeMap.size : 20;
  const sizeShifts = sizeOrder.filter(s => sizeMap.has(s)).map(size => {
    const e = sizeMap.get(size)!;
    const share = totalSizeVelocity > 0 ? (e.velocity / totalSizeVelocity) * 100 : 0;
    const delta = share - equalShare;
    return { size, totalVelocity: e.velocity, velocityShare: share, deltaPct: delta,
      direction: delta > 5 ? 'tăng' : delta < -5 ? 'giảm' : 'ổn định' };
  });

  // Price bands
  const bandDefs = [
    { band: '< 300K', min: 0, max: 300000 },
    { band: '300-500K', min: 300000, max: 500000 },
    { band: '500K-1M', min: 500000, max: 1000000 },
    { band: '> 1M', min: 1000000, max: Infinity },
  ];
  const priceBands = bandDefs.map(def => {
    const fcs = details.filter(d => {
      const price = d.currentQty > 0 ? d.currentRevenue / d.currentQty : 0;
      return price >= def.min && price < def.max;
    });
    const n = fcs.length;
    const avgV = n > 0 ? fcs.reduce((s, f) => s + f.velocity, 0) / n : 0;
    const avgM = n > 0 ? fcs.reduce((s, f) => s + f.marginPct, 0) / n : 0;
    const upC = fcs.filter(f => f.velocityTrend === 'up').length;
    const downC = fcs.filter(f => f.velocityTrend === 'down').length;
    const mom = n > 0 ? ((upC - downC) / n) * 100 : 0;
    const eff = Math.round(clamp(avgV / 5, 0, 1) * 40 + clamp(avgM / 100, 0, 1) * 25 + 20 + 15 * (n > 0 ? (upC + (n - upC - downC)) / n : 0));
    return { band: def.band, fcCount: n, avgVelocity: avgV, avgMarginPct: avgM, momentumPct: mom,
      efficiencyLabel: eff >= 65 ? 'CAO' : eff >= 40 ? 'TRUNG BÌNH' : 'THẤP' };
  }).filter(b => b.fcCount > 0);

  const topCat = categories.filter((c: any) => c.direction === 'expand')[0] || categories[0];
  const topSize = sizeShifts.sort((a, b) => b.velocityShare - a.velocityShare)[0];
  const topBand = priceBands.sort((a, b) => b.avgVelocity - a.avgVelocity)[0];

  const growthShape = {
    expandCategories: categories.filter((c: any) => c.direction === 'expand'),
    avoidCategories: categories.filter((c: any) => c.direction === 'avoid'),
    sizeShifts,
    priceBands,
    gravitySummary: topCat ? `Phát hiện trọng lực tại: ${topCat.category}${topSize ? ` | Size ${topSize.size}` : ''}${topBand ? ` | ${topBand.band}` : ''}` : 'Chưa đủ dữ liệu.',
    shapeStatement: topCat ? 'Cấu trúc này tối đa hóa xác suất doanh thu và bảo vệ biên lợi nhuận.' : 'Cần thêm dữ liệu.',
  };

  return { simulation, growthShape };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Parse body ONCE at the top (Request body can only be read once)
    const rawBody = await req.json().catch(() => ({}));

    // Create admin client for data fetching
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user auth
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader || '' } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tenant_id from profile
    const { data: profile } = await supabase.from('profiles').select('active_tenant_id').eq('id', user.id).maybeSingle();
    const tenantId = profile?.active_tenant_id;
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "No active tenant" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract params from body (support both { params: {...} } and direct {...})
    const params: SimulationParams = rawBody.params || rawBody;

    if (!params || !params.growthPct) {
      return new Response(JSON.stringify({ error: "Missing params.growthPct" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[growth-simulator] Running for tenant ${tenantId}, growth ${params.growthPct}%`);
    const t0 = Date.now();

    // Fetch all data in parallel
    const [revenueData, skuData, fcData, skuFcMapping, inventoryData, demandData] = await Promise.all([
      // Revenue (last 90 days)
      supabase.from('kpi_facts_daily').select('metric_value')
        .eq('tenant_id', tenantId).eq('metric_code', 'NET_REVENUE').eq('dimension_type', 'total')
        .order('grain_date', { ascending: false }).limit(90).then(r => { if (r.error) throw r.error; return r.data || []; }),
      // SKU summary (view - limit columns and rows to avoid timeout)
      supabase.from('fdp_sku_summary').select('sku,product_name,category,total_revenue,total_quantity,total_cogs,gross_profit,margin_percent,avg_unit_price,avg_unit_cogs')
        .eq('tenant_id', tenantId).order('total_revenue', { ascending: false }).limit(2000).then(r => { if (r.error) throw r.error; return r.data || []; }),
      // Family codes
      supabase.from('inv_family_codes').select('id, fc_code, fc_name, is_core_hero')
        .eq('tenant_id', tenantId).eq('is_active', true).limit(2000).then(r => { if (r.error) throw r.error; return r.data || []; }),
      // SKU-FC mapping
      supabase.from('inv_sku_fc_mapping').select('sku, fc_id')
        .eq('tenant_id', tenantId).eq('is_active', true).limit(5000).then(r => { if (r.error) throw r.error; return r.data || []; }),
      // Inventory
      supabase.from('inv_state_positions').select('fc_id, on_hand')
        .eq('tenant_id', tenantId).limit(10000).then(r => { if (r.error) throw r.error; return r.data || []; }),
      // Demand
      supabase.from('inv_state_demand').select('fc_id, sales_velocity, avg_daily_sales, trend')
        .eq('tenant_id', tenantId).limit(5000).then(r => { if (r.error) throw r.error; return r.data || []; }),
    ]);

    console.log(`[growth-simulator] Data fetched in ${Date.now() - t0}ms: SKUs=${skuData.length}, FCs=${fcData.length}`);

    // Momentum: fetch recent 30-day orders + items
    const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
    const allOrders = await fetchAll(supabase, 'cdp_orders', 'id, order_at',
      (q: any) => q.eq('tenant_id', tenantId).gte('order_at', since30d));

    const momentumMap = new Map<string, { recent: number; prior: number }>();
    if (allOrders.length > 0) {
      const orderDateMap = new Map<string, string>();
      for (const o of allOrders) orderDateMap.set(o.id, o.order_at);
      const orderIds = allOrders.map((o: any) => o.id);

      // Fetch items in batches
      const batchSize = 100;
      const allItems: any[] = [];
      for (let i = 0; i < orderIds.length; i += batchSize) {
        const batch = orderIds.slice(i, i + batchSize);
        const { data, error } = await supabase.from('cdp_order_items').select('sku, qty, order_id').in('order_id', batch);
        if (error) throw error;
        if (data) allItems.push(...data);
      }

      const cutoff = new Date(Date.now() - 15 * 86400000).toISOString();
      for (const item of allItems) {
        if (!item.sku || !item.order_id) continue;
        const orderDate = orderDateMap.get(item.order_id);
        if (!orderDate) continue;
        const entry = momentumMap.get(item.sku) || { recent: 0, prior: 0 };
        if (orderDate >= cutoff) entry.recent += (item.qty || 0);
        else entry.prior += (item.qty || 0);
        momentumMap.set(item.sku, entry);
      }
    }

    console.log(`[growth-simulator] Momentum computed: ${momentumMap.size} SKUs, total time ${Date.now() - t0}ms`);

    // Run simulation
    const result = runSimulation(revenueData, skuData, fcData, skuFcMapping, inventoryData, demandData, momentumMap, params);

    console.log(`[growth-simulator] Simulation complete in ${Date.now() - t0}ms`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[growth-simulator] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
