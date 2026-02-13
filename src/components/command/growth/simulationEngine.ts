// ============================================================
// Growth Simulator v2 — Simulation Engine
// Demand-driven, DOC + Safety Stock, HeroScore, Risk Flags
// ============================================================

import {
  DEFAULTS,
  type SKUSummary,
  type FamilyCode,
  type SimulationParams,
  type SimResult,
  type SimSummary,
  type MoverSegment,
  type RiskFlag,
  type RiskType,
  type HeroGap,
  type BeforeAfterMetrics,
  type CategoryShape,
  type SizeShift,
  type PriceBandShape,
  type GrowthShape,
} from './types';

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

// ---- FC Aggregation ----
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
  // Demand info (from inv_state_demand)
  velocity: number;       // avg_daily_sales
  velocity7d: number;     // sales_velocity (short-term)
  trend: string | null;
}

export interface EngineInput {
  revenueData: { metric_value: number }[];
  skuData: SKUSummary[];
  fcData: FamilyCode[];
  skuFcMap: Map<string, string>;      // sku → fc_code
  skuFcIdMap: Map<string, string>;    // sku → fc_id
  inventoryByFcId: Map<string, number>;
  demandByFcId: Map<string, { velocity: number; avgDaily: number; trend: string | null }>;
  params: SimulationParams;
}

export function runSimulationV2(input: EngineInput): SimSummary | null {
  const { revenueData, skuData, fcData, skuFcMap, skuFcIdMap, inventoryByFcId, demandByFcId, params } = input;

  if (!revenueData?.length || !skuData?.length) return null;

  // ---- Step 0: Baseline revenue ----
  const totalDailyRevenue = revenueData.reduce((s, r) => s + (Number(r.metric_value) || 0), 0);
  const daysCount = revenueData.length || 1;
  const avgDailyRevenue = totalDailyRevenue / daysCount;
  const monthlyRevenue = avgDailyRevenue * 30;
  const horizonDays = params.horizonMonths * 30;
  const currentRevenue = monthlyRevenue * params.horizonMonths;
  const targetRevenue = currentRevenue * (1 + params.growthPct / 100);
  const gapRevenue = targetRevenue - currentRevenue;

  // ---- Step 1: Build lookups ----
  const heroSetById = new Set<string>();
  const heroSetByCode = new Set<string>();
  const fcNameMap = new Map<string, string>();
  const fcIdToCode = new Map<string, string>();
  const fcCodeToId = new Map<string, string>();

  for (const fc of fcData || []) {
    fcNameMap.set(fc.fc_code, fc.fc_name);
    fcIdToCode.set(fc.id, fc.fc_code);
    fcCodeToId.set(fc.fc_code, fc.id);
    if (fc.is_core_hero) {
      heroSetById.add(fc.id);
      heroSetByCode.add(fc.fc_code);
    }
  }

  // ---- Step 2: Aggregate SKU → FC ----
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

    // Attach demand info
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

  // ---- Step 3: Compute percentile data for HeroScore ----
  const allVelocities = allFCs.map(fc => fc.velocity).sort((a, b) => a - b);
  const allMargins = allFCs.map(fc => {
    const p = fc.count > 0 ? fc.avgPrice / fc.count : 0;
    const c = fc.count > 0 ? fc.avgCogs / fc.count : 0;
    return p > 0 ? ((p - c) / p) * 100 : 0;
  }).sort((a, b) => a - b);

  // Velocity percentile thresholds
  const p30Velocity = allVelocities[Math.floor(allVelocities.length * 0.3)] ?? 0;
  const p70Velocity = allVelocities[Math.floor(allVelocities.length * 0.7)] ?? 1;

  // ---- Step 4: Process each FC ----
  const details: SimResult[] = [];
  const fashionTotalRevenue = allFCs.reduce((s, fc) => s + fc.revenue, 0);

  for (const fc of allFCs) {
    const unitPrice = fc.count > 0 ? fc.avgPrice / fc.count : 250000;
    const unitCogs = fc.count > 0 ? fc.avgCogs / fc.count : 150000;
    const marginPct = unitPrice > 0 ? ((unitPrice - unitCogs) / unitPrice) * 100 : 0;

    // B1. Forecast demand
    const vBase = fc.velocity; // avg_daily_sales (30d)
    const trendRatio = fc.velocity > 0 ? fc.velocity7d / fc.velocity : 1;
    const vForecast = vBase * clamp(trendRatio, 0.7, 1.3);
    const forecastDemand = vForecast * horizonDays;

    // B4. Segment classification (percentile + absolute thresholds)
    const velPercentile = percentileRank(fc.velocity, allVelocities);
    let segment: MoverSegment = 'normal';
    // Absolute thresholds override percentile to avoid "0.1/day = Fast" when most FCs have 0
    if (fc.velocity < 0.5) {
      // Below 0.5 units/day is always slow, regardless of percentile
      segment = 'slow';
    } else if (fc.velocity >= 3 && velPercentile >= DEFAULTS.FAST_MOVER_PERCENTILE) {
      // Must be both high percentile AND >= 3 units/day to be "Fast"
      segment = 'fast';
    } else if (velPercentile >= DEFAULTS.FAST_MOVER_PERCENTILE && fc.velocity >= 1) {
      // Moderate absolute velocity + high percentile = fast
      segment = 'fast';
    } else if (velPercentile <= DEFAULTS.SLOW_MOVER_PERCENTILE || fc.velocity < 1) {
      segment = 'slow';
    }

    // Skip slow movers with very low velocity (unless Hero)
    const isHeroManual = fc.isHeroManual;

    // B3. HeroScore
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

    // B2. Production formula
    const targetDOC = isHero ? params.docHero : params.docNonHero;
    const safetyQty = (params.safetyStockPct / 100) * forecastDemand;
    const requiredSupply = forecastDemand + safetyQty + (targetDOC * vForecast);
    let productionQty = Math.max(0, Math.round(requiredSupply - onHandQty));

    // Filter: slow mover with velocity < 0.1 and NOT hero → don't produce
    if (segment === 'slow' && fc.velocity < DEFAULTS.SLOW_MOVER_VELOCITY && !isHero) {
      productionQty = 0;
    }

    const cashRequired = productionQty * unitCogs;
    const projectedRevenue = productionQty * unitPrice;
    const projectedMargin = productionQty * (unitPrice - unitCogs);

    const docAfterProduction = vForecast > 0 ? (onHandQty + productionQty) / vForecast : 0;

    // B5. Risk flags
    const riskFlags: RiskFlag[] = [];
    if (vForecast > 0 && onHandQty / vForecast < DEFAULTS.LEAD_TIME_BUFFER) {
      riskFlags.push({
        type: 'stockout',
        severity: onHandQty === 0 ? 'critical' : 'high',
        detail: `Tồn kho chỉ đủ ${Math.round(onHandQty / vForecast)} ngày (cần ${DEFAULTS.LEAD_TIME_BUFFER} ngày)`,
        suggestion: isHero ? 'Tăng depth sản xuất gấp' : 'Bổ sung sản xuất',
      });
    }
    if (onHandQty > forecastDemand * params.overstockThreshold && forecastDemand > 0) {
      riskFlags.push({
        type: 'overstock',
        severity: onHandQty > forecastDemand * 2 ? 'high' : 'medium',
        detail: `Tồn kho gấp ${(onHandQty / forecastDemand).toFixed(1)}x nhu cầu dự báo`,
        suggestion: segment === 'slow' ? 'Markdown / Bundle' : 'Delay sản xuất',
      });
    }
    if (segment === 'slow' && onHandQty > 0 && fc.velocity < DEFAULTS.SLOW_MOVER_VELOCITY) {
      riskFlags.push({
        type: 'slow_mover_high_stock',
        severity: 'medium',
        detail: `Bán chậm (${fc.velocity.toFixed(2)} SP/ngày) nhưng còn ${onHandQty} tồn`,
        suggestion: 'Giảm SX / Bundle / Markdown',
      });
    }

    // Growth contribution
    const growthContributionPct = gapRevenue > 0 ? (projectedRevenue / gapRevenue) * 100 : 0;

    // Reason narrative
    const reasons: string[] = [];
    if (fc.velocity >= 5) reasons.push(`🔥 Bán nhanh (${fc.velocity.toFixed(1)} SP/ngày)`);
    else if (fc.velocity >= 1) reasons.push(`Tốc độ TB (${fc.velocity.toFixed(1)} SP/ngày)`);
    else if (fc.velocity > 0) reasons.push(`⚠ Bán chậm (${fc.velocity.toFixed(2)} SP/ngày)`);
    else reasons.push('⛔ Không có dữ liệu tốc độ bán');

    if (fc.trend === 'up') reasons.push('📈 Xu hướng tăng');
    else if (fc.trend === 'down') reasons.push('📉 Xu hướng giảm');

    if (isHeroManual) reasons.push('⭐ Hero (manual)');
    else if (isHeroCalculated) reasons.push('🏆 Hero candidate (calculated)');

    if (onHandQty === 0 && fc.velocity >= 1) reasons.push('Hết tồn kho + bán tốt → bổ sung gấp');
    else if (onHandQty === 0 && fc.velocity < 0.5 && fc.velocity > 0) reasons.push('Hết hàng nhưng bán chậm → SX ít');

    if (marginPct > 60) reasons.push(`Margin cao (${marginPct.toFixed(0)}%)`);
    else if (marginPct < 20) reasons.push(`⚠ Margin thấp (${marginPct.toFixed(0)}%)`);

    if (productionQty > 0 && cashRequired > 0) {
      const roi = projectedMargin / cashRequired;
      if (roi > 3) reasons.push(`ROI ${roi.toFixed(1)}x`);
    }

    if (productionQty === 0 && segment === 'slow' && !isHero) {
      reasons.push('⛔ Không đề xuất SX (slow mover, không phải Hero)');
    }

    details.push({
      fcCode: fc.fcCode,
      fcName: fcNameMap.get(fc.fcCode) || fc.fcCode,
      fcId: fc.fcId,
      isHeroManual,
      isHeroCalculated,
      isHero,
      heroScore,
      segment,
      velocity: fc.velocity,
      velocity7d: fc.velocity7d,
      velocityTrend: fc.trend,
      forecastDemand,
      onHandQty,
      docCurrent: Math.round(docCurrent),
      docAfterProduction: Math.round(docAfterProduction),
      productionQty,
      cashRequired,
      currentRevenue: fc.revenue,
      currentQty: fc.qty,
      projectedRevenue,
      marginPct,
      projectedMargin,
      growthContributionPct,
      riskFlags,
      reason: reasons.join(' · '),
    });
  }

  // ---- Step 5: Constraints enforcement ----
  // Sort by priority: hero first, then by heroScore desc
  details.sort((a, b) => {
    if (a.isHero !== b.isHero) return a.isHero ? -1 : 1;
    return b.heroScore - a.heroScore;
  });

  if (params.cashCap > 0) {
    let totalCash = 0;
    for (const d of details) {
      totalCash += d.cashRequired;
      if (totalCash > params.cashCap) {
        d.productionQty = 0;
        d.cashRequired = 0;
        d.projectedRevenue = 0;
        d.projectedMargin = 0;
      }
    }
  }

  if (params.capacityCap > 0) {
    const capPerHorizon = params.capacityCap * params.horizonMonths;
    let totalQty = 0;
    for (const d of details) {
      totalQty += d.productionQty;
      if (totalQty > capPerHorizon) {
        d.productionQty = 0;
        d.cashRequired = 0;
        d.projectedRevenue = 0;
        d.projectedMargin = 0;
      }
    }
  }

  // ---- Step 6: Concentration risk ----
  const allRisks: RiskFlag[] = [];
  const productionDetails = details.filter(d => d.productionQty > 0);
  const totalProduction = productionDetails.reduce((s, d) => s + d.productionQty, 0);
  if (totalProduction > 0) {
    const top3 = productionDetails.slice(0, 3);
    const top3Share = top3.reduce((s, d) => s + d.productionQty, 0) / totalProduction;
    if (top3Share > 0.5) {
      const concentrationRisk: RiskFlag = {
        type: 'concentration',
        severity: top3Share > 0.7 ? 'critical' : 'high',
        detail: `Top 3 FC chiếm ${(top3Share * 100).toFixed(0)}% tổng SX`,
        suggestion: 'Cân nhắc phân tán sản xuất để giảm rủi ro tập trung',
      };
      allRisks.push(concentrationRisk);
    }
  }

  // Collect all per-FC risks
  for (const d of details) {
    allRisks.push(...d.riskFlags);
  }

  // Sort by severity
  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  allRisks.sort((a, b) => (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3));

  // ---- Step 7: Hero Gap calculation ----
  const heroFCs = details.filter(d => d.isHero);
  const heroRevenue = heroFCs.reduce((s, d) => s + d.currentRevenue, 0);
  const heroRevenueShare = fashionTotalRevenue > 0 ? heroRevenue / fashionTotalRevenue : 0;

  const rInc = gapRevenue;
  const heroCapacity = heroFCs.reduce((s, d) => {
    const unitPrice = d.currentQty > 0 ? d.currentRevenue / d.currentQty : 0;
    return s + Math.min(d.onHandQty + d.productionQty, d.forecastDemand) * unitPrice;
  }, 0);
  const heroNeed = rInc * DEFAULTS.HERO_REVENUE_TARGET_SHARE;
  const gap = Math.max(0, heroNeed - heroCapacity);
  const recoverabilityPct = heroNeed > 0 ? clamp((heroCapacity / heroNeed) * 100, 0, 100) : 100;

  // Hero candidates: non-hero sorted by heroScore desc
  const heroCandidates = details
    .filter(d => !d.isHeroManual && d.heroScore >= 50)
    .sort((a, b) => b.heroScore - a.heroScore)
    .slice(0, 10);

  const avgCandidateCapacity = heroCandidates.length > 0
    ? heroCandidates.reduce((s, d) => s + d.projectedRevenue, 0) / heroCandidates.length
    : 1;
  const heroCountGap = avgCandidateCapacity > 0 ? Math.ceil(gap / avgCandidateCapacity) : 0;

  const recoverabilityMessage = recoverabilityPct >= 80
    ? `Có thể đạt ${recoverabilityPct.toFixed(0)}% target bằng tăng depth hero hiện có`
    : `Cần thêm ~${heroCountGap} hero mới để đạt target`;

  const heroGap: HeroGap = {
    incrementalRevenueNeeded: rInc,
    heroCapacity,
    heroNeed,
    gap,
    heroCountGap,
    recoverabilityPct,
    recoverabilityMessage,
  };

  // ---- Step 8: Before / After ----
  const totalProductionUnits = details.reduce((s, d) => s + d.productionQty, 0);
  const totalCashRequired = details.reduce((s, d) => s + d.cashRequired, 0);
  const totalProjectedMargin = details.reduce((s, d) => s + d.projectedMargin, 0);
  const avgMarginPct = totalCashRequired + totalProjectedMargin > 0
    ? (totalProjectedMargin / (totalCashRequired + totalProjectedMargin)) * 100
    : 0;

  const stockoutBefore = details.filter(d => d.riskFlags.some(r => r.type === 'stockout')).length;
  const stockoutAfter = details.filter(d => d.productionQty > 0 && d.docAfterProduction < DEFAULTS.LEAD_TIME_BUFFER).length;

  const avgDOCBefore = details.length > 0
    ? details.reduce((s, d) => s + d.docCurrent, 0) / details.length
    : 0;
  const avgDOCAfter = details.length > 0
    ? details.reduce((s, d) => s + d.docAfterProduction, 0) / details.length
    : 0;

  const heroShareAfter = (() => {
    const heroRev = heroFCs.reduce((s, d) => s + d.currentRevenue + d.projectedRevenue, 0);
    const totalRev = fashionTotalRevenue + details.reduce((s, d) => s + d.projectedRevenue, 0);
    return totalRev > 0 ? (heroRev / totalRev) * 100 : 0;
  })();

  const beforeAfter: BeforeAfterMetrics = {
    revenueProjected: [currentRevenue, currentRevenue + details.reduce((s, d) => s + d.projectedRevenue, 0)],
    marginPct: [avgMarginPct, avgMarginPct], // simplified — same margin structure
    heroRevenueShare: [heroRevenueShare * 100, heroShareAfter],
    stockoutRiskCount: [stockoutBefore, stockoutAfter],
    avgDOC: [Math.round(avgDOCBefore), Math.round(avgDOCAfter)],
  };

  // ---- Step 9: Risk Score (composite 0-100) ----
  const stockoutWeight = 40;
  const overstockWeight = 30;
  const concentrationWeight = 30;

  const stockoutRatio = details.length > 0
    ? details.filter(d => d.riskFlags.some(r => r.type === 'stockout')).length / details.length
    : 0;
  const overstockRatio = details.length > 0
    ? details.filter(d => d.riskFlags.some(r => r.type === 'overstock')).length / details.length
    : 0;
  const concentrationScore = allRisks.some(r => r.type === 'concentration') ? 1 : 0;

  const riskScore = Math.round(
    stockoutRatio * stockoutWeight +
    overstockRatio * overstockWeight +
    concentrationScore * concentrationWeight
  );

  // Sort details by productionQty desc for display
  details.sort((a, b) => b.productionQty - a.productionQty);

  return {
    totalProductionUnits,
    totalCashRequired,
    heroCount: heroFCs.length,
    heroRevenueSharePct: heroRevenueShare * 100,
    riskScore,
    heroGap,
    beforeAfter,
    currentRevenue,
    targetRevenue,
    gapRevenue,
    avgMarginPct,
    totalProjectedMargin,
    details,
    topRisks: allRisks.slice(0, 10),
    heroCandidates,
  };
}

// ============================================================
// Growth Expansion Map — computeGrowthShape
// ============================================================

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

export function computeGrowthShape(
  details: SimResult[],
  skuData: SKUSummary[],
  skuFcMap: Map<string, string>,
  params: SimulationParams,
): GrowthShape {
  // --- 1. Group by category ---
  const catMap = new Map<string, {
    fcs: SimResult[];
    totalVelocity: number;
    totalVelocity7d: number;
    totalRevenue: number;
    sumMargin: number;
    sumDOC: number;
    overstockCount: number;
  }>();

  const totalRevAll = details.reduce((s, d) => s + d.currentRevenue, 0);

  for (const d of details) {
    const cat = classifyCategory(d.fcName);
    const e = catMap.get(cat) || {
      fcs: [], totalVelocity: 0, totalVelocity7d: 0, totalRevenue: 0,
      sumMargin: 0, sumDOC: 0, overstockCount: 0,
    };
    e.fcs.push(d);
    e.totalVelocity += d.velocity;
    e.totalVelocity7d += d.velocity7d || d.velocity; // fallback to 30d if no 7d
    e.totalRevenue += d.currentRevenue;
    e.sumMargin += d.marginPct;
    e.sumDOC += d.docCurrent;
    if (d.riskFlags.some(r => r.type === 'overstock')) e.overstockCount++;
    catMap.set(cat, e);
  }

  // --- 2. Compute CategoryShape ---
  // First pass: collect all category avg velocities for relative normalization
  const catAvgVelocities: number[] = [];
  for (const [, e] of catMap) {
    if (e.fcs.length > 0) catAvgVelocities.push(e.totalVelocity / e.fcs.length);
  }
  const maxCatVelocity = Math.max(...catAvgVelocities, 0.01);

  const categories: CategoryShape[] = [];
  for (const [cat, e] of catMap) {
    const n = e.fcs.length;
    if (n === 0) continue;
    const avgVelocity = e.totalVelocity / n;
    const avgMargin = e.sumMargin / n;
    const avgDOC = e.sumDOC / n;
    const overstockRatio = e.overstockCount / n;
    const revenueShare = totalRevAll > 0 ? (e.totalRevenue / totalRevAll) * 100 : 0;

    // Momentum: velocity7d vs velocity30d ratio (short-term acceleration)
    const momentumPct = e.totalVelocity > 0
      ? ((e.totalVelocity7d - e.totalVelocity) / e.totalVelocity) * 100
      : 0;

    // Efficiency Score — relative normalization against max category velocity
    const velScore = clamp(avgVelocity / maxCatVelocity, 0, 1) * 40;
    const marginScore = clamp(avgMargin / 100, 0, 1) * 25;
    const invScore = (1 - clamp(overstockRatio, 0, 1)) * 20;
    const stabilityRatio = e.totalVelocity > 0 ? 1 - Math.abs(e.totalVelocity7d - e.totalVelocity) / e.totalVelocity : 0.5;
    const stabilityScore = clamp(stabilityRatio, 0, 1) * 15;
    // Bonus for revenue share (categories driving more revenue get a boost)
    const revenueBonus = clamp(revenueShare / 30, 0, 1) * 10;
    const efficiencyScore = Math.round(Math.min(100, velScore + marginScore + invScore + stabilityScore + revenueBonus));

    const efficiencyLabel: CategoryShape['efficiencyLabel'] =
      efficiencyScore >= 65 ? 'CAO' : efficiencyScore >= 40 ? 'TRUNG BÌNH' : 'THẤP';

    // Direction: top efficiency + non-negative momentum = expand
    // Also expand if score is high (>= 55) and has positive revenue share
    const direction: CategoryShape['direction'] =
      (efficiencyLabel === 'CAO' && momentumPct >= -10) ? 'expand' :
      (efficiencyScore >= 55 && momentumPct >= 0 && revenueShare >= 10) ? 'expand' :
      (efficiencyLabel === 'THẤP' || momentumPct < -30) ? 'avoid' : 'hold';

    // Reason
    const reasons: string[] = [];
    if (avgVelocity >= maxCatVelocity * 0.7) reasons.push('Tốc độ bán tốt');
    else if (avgVelocity < maxCatVelocity * 0.2) reasons.push('Luân chuyển chậm');
    if (avgMargin >= 50) reasons.push('biên lợi nhuận cao');
    else if (avgMargin < 25) reasons.push('biên lợi nhuận thấp');
    if (revenueShare >= 20) reasons.push(`chiếm ${revenueShare.toFixed(0)}% doanh thu`);
    if (momentumPct > 10) reasons.push('xu hướng tăng');
    else if (momentumPct < -10) reasons.push('cầu đang giảm');
    if (overstockRatio > 0.3) reasons.push('rủi ro tồn kho');

    categories.push({
      category: cat,
      fcCount: n,
      totalVelocity: e.totalVelocity,
      avgVelocity,
      momentumPct,
      avgMarginPct: avgMargin,
      avgDOC,
      overstockRatio,
      revenueShare,
      efficiencyScore,
      efficiencyLabel,
      direction,
      reason: reasons.join(', ') || 'Dữ liệu trung bình',
    });
  }

  categories.sort((a, b) => b.efficiencyScore - a.efficiencyScore);

  const expandCategories = categories.filter(c => c.direction === 'expand');
  const avoidCategories = categories.filter(c => c.direction === 'avoid');

  // --- 3. Size shifts ---
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

  const sizeShifts: SizeShift[] = sizeOrder
    .filter(s => sizeMap.has(s))
    .map(size => {
      const e = sizeMap.get(size)!;
      const share = totalSizeVelocity > 0 ? (e.velocity / totalSizeVelocity) * 100 : 0;
      const delta = share - equalShare;
      return {
        size,
        totalVelocity: e.velocity,
        velocityShare: share,
        deltaPct: delta,
        direction: delta > 5 ? 'tăng' as const : delta < -5 ? 'giảm' as const : 'ổn định' as const,
      };
    });

  // --- 4. Price bands ---
  const bandDefs = [
    { band: '< 300K', min: 0, max: 300000 },
    { band: '300-500K', min: 300000, max: 500000 },
    { band: '500K-1M', min: 500000, max: 1000000 },
    { band: '> 1M', min: 1000000, max: Infinity },
  ];

  const priceBands: PriceBandShape[] = bandDefs.map(def => {
    const fcs = details.filter(d => {
      const price = d.currentQty > 0 ? d.currentRevenue / d.currentQty : 0;
      return price >= def.min && price < def.max;
    });
    const n = fcs.length;
    const avgV = n > 0 ? fcs.reduce((s, f) => s + f.velocity, 0) / n : 0;
    const avgM = n > 0 ? fcs.reduce((s, f) => s + f.marginPct, 0) / n : 0;
    const upCount = fcs.filter(f => f.velocityTrend === 'up').length;
    const downCount = fcs.filter(f => f.velocityTrend === 'down').length;
    const mom = n > 0 ? ((upCount - downCount) / n) * 100 : 0;
    const eff = Math.round(clamp(avgV / 5, 0, 1) * 40 + clamp(avgM / 100, 0, 1) * 25 + 20 + 15 * (n > 0 ? (upCount + (n - upCount - downCount)) / n : 0));
    return {
      band: def.band,
      fcCount: n,
      avgVelocity: avgV,
      avgMarginPct: avgM,
      momentumPct: mom,
      efficiencyLabel: eff >= 65 ? 'CAO' as const : eff >= 40 ? 'TRUNG BÌNH' as const : 'THẤP' as const,
    };
  }).filter(b => b.fcCount > 0);

  // --- 5. Gravity summary ---
  const topCat = expandCategories[0] || categories[0]; // fallback to highest efficiency
  const topSize = sizeShifts.sort((a, b) => b.velocityShare - a.velocityShare)[0];
  const topBand = priceBands.sort((a, b) => b.avgVelocity - a.avgVelocity)[0];

  const gravitySummary = topCat
    ? `Phát hiện trọng lực tại: ${topCat.category}${topSize ? ` | Size ${topSize.size}` : ''}${topBand ? ` | ${topBand.band}` : ''}`
    : 'Chưa đủ dữ liệu để xác định trọng lực tăng trưởng.';

  const shapeStatement = topCat
    ? 'Cấu trúc này tối đa hóa xác suất doanh thu và bảo vệ biên lợi nhuận.'
    : 'Cần thêm dữ liệu để đánh giá cấu trúc tối ưu.';

  return {
    expandCategories,
    avoidCategories,
    sizeShifts,
    priceBands,
    gravitySummary,
    shapeStatement,
  };
}
