

# KẾ HOẠCH KẾT NỐI DATA THỰC TẾ - PHASE 5

## TỔNG QUAN

Database đã sẵn sàng với 4 views SSOT mới:
- `v_mdp_platform_ads_summary` - Platform Ads metrics (Shopee, Lazada, TikTok, Meta, Google)
- `v_risk_radar_summary` - Risk Radar scores (Liquidity, Credit, Market, Operational)
- `v_cdp_demographics_summary` - Customer demographics (Age, Gender, Device, Geography)
- `v_mdp_marketing_funnel` - Marketing funnel metrics (Impressions → Orders)

Data đã được seed cho E2E tenant và verified qua SQL queries.

## SCOPE

### Module 1: MDP Platform Ads (P0 - Critical)
| Component | Current State | Action |
|-----------|---------------|--------|
| `MDPDashboardPage.tsx` | Hardcoded `platformAdsData` array (5 platforms) | Replace with hook data |
| `MarketingModePage.tsx` | Duplicate hardcoded array | Replace with hook data |

**New Hook**: `usePlatformAdsData.ts`
```text
+----------------------------+
| usePlatformAdsData         |
+----------------------------+
| Query: v_mdp_platform_ads  |
|        _summary            |
| Output: PlatformAdsData[]  |
+----------------------------+
        ↓
+----------------------------+
| PlatformAdsOverview        |
+----------------------------+
```

### Module 2: MDP Marketing Funnel (P1 - High)
| Component | Current State | Action |
|-----------|---------------|--------|
| `useMDPDataSSOT.ts` | Hardcoded funnel with `Math.round(totalClicks * 0.15)` | Query `v_mdp_marketing_funnel` |

**Hook Update**: Modify `useMDPDataSSOT.ts` to fetch funnel data from view

### Module 3: Risk Radar (P1 - High)
| Component | Current State | Action |
|-----------|---------------|--------|
| `RiskDashboardPage.tsx` | 2 hardcoded `riskScores` arrays (lines 341-346, 632-669) | Replace with hook data |

**New Hook**: `useRiskRadarData.ts`
```text
+----------------------------+
| useRiskRadarData           |
+----------------------------+
| Query: v_risk_radar        |
|        _summary            |
| Output: RiskRadarData      |
+----------------------------+
        ↓
+----------------------------+
| RiskRadar component        |
| RiskDashboardPage          |
+----------------------------+
```

### Module 4: CDP Demographics (P2 - Medium)
| Component | Current State | Action |
|-----------|---------------|--------|
| `useAudienceData.ts` | Hardcoded `demographics` (lines 629-648) | Query `v_cdp_demographics_summary` |

## CHI TIẾT IMPLEMENTATION

### 1. usePlatformAdsData.ts (New Hook)

```typescript
// src/hooks/usePlatformAdsData.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import type { PlatformAdsData } from '@/components/mdp/marketing-mode/PlatformAdsOverview';

export function usePlatformAdsData() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['platform-ads-data', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('v_mdp_platform_ads_summary')
        .select('*')
        .eq('tenant_id', tenantId);
        
      if (error) throw error;
      
      // Map to PlatformAdsData interface
      return (data || []).map(row => ({
        platform: row.platform === 'shopee' ? 'Shopee Ads' :
                  row.platform === 'lazada' ? 'Lazada Ads' :
                  row.platform === 'tiktok' ? 'TikTok Shop' :
                  row.platform === 'meta' ? 'Meta Ads' :
                  row.platform === 'google' ? 'Google Ads' : row.platform,
        platform_icon: row.platform_icon,
        is_active: row.is_active,
        spend_today: row.spend_today,
        spend_month: row.spend_month,
        budget_month: row.budget_month,
        budget_utilization: row.budget_utilization,
        impressions: row.impressions,
        clicks: row.clicks,
        orders: row.orders,
        revenue: row.revenue,
        cpm: row.cpm,
        cpc: row.cpc,
        ctr: row.ctr,
        cvr: row.cvr,
        cpa: row.cpa,
        roas: row.roas,
        acos: row.acos,
        add_to_cart: row.add_to_cart,
        atc_rate: row.atc_rate,
        quality_score: row.quality_score,
        relevance_score: row.relevance_score,
        spend_trend: row.spend_trend,
        cpa_trend: row.cpa_trend,
        roas_trend: row.roas_trend,
      })) as PlatformAdsData[];
    },
    enabled: !!tenantId,
  });
}
```

### 2. useRiskRadarData.ts (New Hook)

```typescript
// src/hooks/useRiskRadarData.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

export interface RiskRadarData {
  liquidity_score: number;
  credit_score: number;
  market_score: number;
  operational_score: number;
  overall_score: number;
  liquidity_severity: 'low' | 'medium' | 'high';
  credit_severity: 'low' | 'medium' | 'high';
  market_severity: 'low' | 'medium' | 'high';
  operational_severity: 'low' | 'medium' | 'high';
  calculation_details: any;
}

export function useRiskRadarData() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['risk-radar-data', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('v_risk_radar_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
        
      if (error) throw error;
      return data as RiskRadarData | null;
    },
    enabled: !!tenantId,
  });
}
```

### 3. useDemographicsData.ts (New Hook)

```typescript
// src/hooks/useDemographicsData.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

export interface DemographicsData {
  age_distribution: { range: string; value: number; color: string }[];
  gender_distribution: { name: string; value: number; color: string }[];
  device_distribution: { device: string; sessions: number; conversions: number; revenue: number }[];
  geographic_distribution: { province: string; customers: number; percentage: number }[];
}

export function useDemographicsData() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['demographics-data', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('v_cdp_demographics_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
        
      if (error) throw error;
      
      if (!data) return null;
      
      return {
        age_distribution: data.age_distribution || [],
        gender_distribution: data.gender_distribution || [],
        device_distribution: data.device_distribution || [],
        geographic_distribution: data.geographic_distribution || [],
      } as DemographicsData;
    },
    enabled: !!tenantId,
  });
}
```

### 4. Page Updates

**MDPDashboardPage.tsx** - Remove mock data, import hook:
```typescript
// BEFORE (line 65-72):
const platformAdsData: PlatformAdsData[] = [
  { platform: 'Shopee Ads', ... },
  ...
];

// AFTER:
const { data: platformAdsData = [], isLoading: platformLoading } = usePlatformAdsData();
```

**MarketingModePage.tsx** - Same pattern:
```typescript
// Remove hardcoded array (lines 129-136)
// Replace with:
const { data: platformAdsData = [], isLoading: platformLoading } = usePlatformAdsData();
```

**RiskDashboardPage.tsx** - Replace both mock arrays:
```typescript
// BEFORE (line 341-346):
const riskScores = [
  { category: 'Liquidity', score: 65, ... },
  ...
];

// AFTER:
const { data: riskData } = useRiskRadarData();
const riskScores = riskData ? [
  { category: 'Liquidity', score: riskData.liquidity_score, severity: riskData.liquidity_severity },
  { category: 'Credit', score: riskData.credit_score, severity: riskData.credit_severity },
  { category: 'Market', score: riskData.market_score, severity: riskData.market_severity },
  { category: 'Operational', score: riskData.operational_score, severity: riskData.operational_severity },
] : [];
```

**useAudienceData.ts** - Integrate demographics hook:
```typescript
// BEFORE (line 629-648):
const demographics = useMemo<DemographicData>(() => ({
  ageDistribution: [
    { range: '18-24', value: 15, color: '#8b5cf6' },
    ...
  ],
  ...
}), []);

// AFTER:
const { data: dbDemographics } = useDemographicsData();
const demographics = useMemo<DemographicData>(() => {
  if (dbDemographics) {
    return {
      ageDistribution: dbDemographics.age_distribution,
      genderDistribution: dbDemographics.gender_distribution,
      deviceData: dbDemographics.device_distribution,
    };
  }
  // Fallback to empty state (not mock)
  return { ageDistribution: [], genderDistribution: [], deviceData: [] };
}, [dbDemographics]);
```

**useMDPDataSSOT.ts** - Query funnel from view:
```typescript
// Add new query for funnel
const funnelQuery = useQuery({
  queryKey: ['mdp-funnel', tenantId],
  queryFn: async () => {
    if (!tenantId) return null;
    const { data } = await supabase
      .from('v_mdp_marketing_funnel')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    return data;
  },
  enabled: !!tenantId,
});

// Use in funnelData memo:
const funnelData = useMemo<FunnelStage[]>(() => {
  const f = funnelQuery.data;
  if (!f) return [];
  return [
    { stage: 'Impressions', count: f.total_impressions, ... },
    { stage: 'Clicks', count: f.total_clicks, ... },
    { stage: 'Add to Cart', count: f.estimated_add_to_cart, ... },
    { stage: 'Orders', count: f.total_orders, ... },
  ];
}, [funnelQuery.data]);
```

## FILES TO CREATE

| File | Purpose |
|------|---------|
| `src/hooks/usePlatformAdsData.ts` | Platform Ads SSOT hook |
| `src/hooks/useRiskRadarData.ts` | Risk Radar SSOT hook |
| `src/hooks/useDemographicsData.ts` | Demographics SSOT hook |

## FILES TO MODIFY

| File | Changes |
|------|---------|
| `src/pages/MDPDashboardPage.tsx` | Remove mock platformAdsData, use hook |
| `src/pages/mdp/MarketingModePage.tsx` | Remove mock platformAdsData, use hook |
| `src/pages/RiskDashboardPage.tsx` | Remove 2 mock riskScores arrays, use hook |
| `src/hooks/useAudienceData.ts` | Remove mock demographics, use hook |
| `src/hooks/useMDPDataSSOT.ts` | Add funnel query from view |

## EXECUTION ORDER

1. Create 3 new hooks (parallel)
2. Update `MDPDashboardPage.tsx` + `MarketingModePage.tsx`
3. Update `RiskDashboardPage.tsx`
4. Update `useAudienceData.ts`
5. Update `useMDPDataSSOT.ts` (funnel)

## VERIFICATION

After implementation:
- `?governance=1` - All health checks PASS
- Platform Ads cards show real metrics
- Risk Radar shows computed scores from `risk_scores` table
- Demographics charts show distribution from `cdp_customers`
- Marketing funnel reflects aggregated platform metrics

## TECHNICAL NOTES

### Type Safety
- All hooks return typed data matching existing component interfaces
- Views are typed via Supabase types.ts (auto-generated)

### Fallback Strategy
- Empty arrays/null for missing data
- NO hardcoded fallback values (SSOT compliance)
- Loading states displayed during fetch

### DB-First Architecture
- All metrics computed in PostgreSQL views
- Hooks are thin wrappers (no `.reduce()`, no client-side calculations)
- Cross-module data flows maintained via views

