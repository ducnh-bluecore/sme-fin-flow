
# KE HOACH FIX BUG: Stability Score Am

## VAN DE
Cong thuc tinh **Stability Score** thieu `GREATEST(0, ...)` de clamp gia tri am, dan den:
- Stability score = **-297** thay vi **0**
- Overall score = **-14** thay vi **35**

## FIX DATABASE VIEW

### Migration moi

```sql
CREATE OR REPLACE VIEW v_executive_health_scores AS
WITH latest_snapshot AS (
  SELECT DISTINCT ON (tenant_id) *
  FROM central_metrics_snapshots
  ORDER BY tenant_id, snapshot_at DESC
),
growth_data AS (
  SELECT 
    tenant_id,
    COALESCE(revenue_yoy_change, 0) as revenue_yoy
  FROM finance_monthly_summary
  WHERE month_start = date_trunc('month', CURRENT_DATE - interval '1 month')
),
raw_scores AS (
  SELECT
    s.tenant_id,
    70::numeric as good_thresh,
    50::numeric as warning_thresh,
    75::numeric as overall_good,
    55::numeric as overall_warning,
    
    -- LIQUIDITY: min(100, runway * 15)
    COALESCE(s.cash_runway_months, 4) as runway_months,
    GREATEST(0, LEAST(100, COALESCE(s.cash_runway_months, 4) * 15)) as liquidity_score,
    
    -- RECEIVABLES: max(0, 100 - (dso - 30) * 2)
    COALESCE(NULLIF(s.dso, 0), 45) as dso_value,
    GREATEST(0, LEAST(100, 100 - (COALESCE(NULLIF(s.dso, 0), 45) - 30) * 2)) as receivables_score,
    
    -- PROFITABILITY: min(100, gross_margin * 2.5)
    COALESCE(NULLIF(s.gross_margin_percent, 0), 28) as gross_margin,
    GREATEST(0, LEAST(100, COALESCE(NULLIF(s.gross_margin_percent, 0), 28) * 2.5)) as profitability_score,
    
    -- EFFICIENCY: max(0, 100 - ccc)
    COALESCE(s.ccc, 45) as ccc_value,
    GREATEST(0, LEAST(100, 100 - COALESCE(s.ccc, 45))) as efficiency_score,
    
    -- GROWTH: normalized to 0-100 scale
    COALESCE(g.revenue_yoy, 0) as revenue_yoy,
    GREATEST(0, LEAST(100, 50 + COALESCE(g.revenue_yoy, 0) * 1.75)) as growth_score,
    
    -- FIX: STABILITY must use GREATEST(0, ...) to clamp negative
    COALESCE(NULLIF(s.ebitda_margin_percent, 0), 15) as ebitda_margin,
    GREATEST(0, LEAST(100, COALESCE(NULLIF(s.ebitda_margin_percent, 0), 15) * 4)) as stability_score,
    
    s.snapshot_at
    
  FROM latest_snapshot s
  LEFT JOIN growth_data g ON s.tenant_id = g.tenant_id
)
-- ... rest of SELECT statement stays the same
```

### Thay doi chinh

| Metric | Truoc (Bug) | Sau (Fixed) |
|--------|-------------|-------------|
| Liquidity | `LEAST(100, ...)` | `GREATEST(0, LEAST(100, ...))` |
| Receivables | `GREATEST(0, ...)` | (da dung) |
| Profitability | `LEAST(100, ...)` | `GREATEST(0, LEAST(100, ...))` |
| Efficiency | `GREATEST(0, LEAST(100, ...))` | (da dung) |
| Growth | `GREATEST(0, ...)` | (da dung) |
| **Stability** | `LEAST(100, ...)` ❌ | `GREATEST(0, LEAST(100, ...))` ✅ |

## TAC DONG SAU FIX

| Metric | Truoc | Sau |
|--------|-------|-----|
| Stability Score | -297 | **0** |
| Overall Score | -14 | **(0+62+100+0+50+0)/6 = 35** |
| Overall Status | critical | critical (still < 55) |

## FILES THAY DOI

| File | Action |
|------|--------|
| `supabase/migrations/xxx_fix_stability_score.sql` | Tao migration moi de CREATE OR REPLACE VIEW |

## THOI GIAN

~5 phut
