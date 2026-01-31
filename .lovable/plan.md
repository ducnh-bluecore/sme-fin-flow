
# Plan: Sửa logic tính dòng tiền vào (Cash Inflow) trong Cash Forecast

## Vấn đề hiện tại

Chart "Dòng tiền vào/ra" hiển thị dòng tiền vào gần như = 0 trong khi hệ thống có đầy đủ dữ liệu revenue:

| Nguồn dữ liệu | Giá trị | Tình trạng |
|---------------|---------|------------|
| cdp_orders (90 ngày) | 335M (~3.7M/ngày) | Co data - CHUA dung |
| invoices AR | 186M (46M due 30d) | Co data - DANG dung |
| bank_transactions | 0 | TRONG - gay loi |
| pendingSettlements | 29M | Co data - chi dung ngay 7-21 |

### Nguyen nhan ky thuat

1. **RPC `get_forecast_historical_stats`** chi doc tu `bank_transactions` (bang trong) -> `avgDailyInflow = 0`

2. **`generateForecast()`** tinh inflow tu:
   - AR invoices: 46M / 30 = 1.5M/ngay (chi trong 30 ngay dau)
   - Overdue AR: 43M * 3% = 1.3M/ngay (giam dan theo probability)
   - pendingSettlements: 29M / 14 = 2M/ngay (chi ngay 7-21)
   - salesProjection: Chi add TU NGAY 14 tro di (T+14 delay)

3. **Ngay 0-13**: Chi co AR collection (~1.5M + 1.3M = ~2.8M)
   **Ngay 14+**: AR + pendingSettlements + salesProjection

## Giai phap

### Phan 1: Sua RPC `get_forecast_historical_stats` - Fallback sang cdp_orders

Khi `bank_transactions` trong, su dung `cdp_orders` de tinh historical inflow:

```sql
CREATE OR REPLACE FUNCTION get_forecast_historical_stats(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE(...)
LANGUAGE plpgsql
AS $$
DECLARE
  v_bank_total_credit NUMERIC := 0;
  v_bank_total_debit NUMERIC := 0;
  v_bank_days INTEGER := 0;
  v_order_total NUMERIC := 0;
  v_order_days INTEGER := 0;
BEGIN
  -- Try bank_transactions first
  SELECT 
    COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(COUNT(DISTINCT transaction_date), 0)
  INTO v_bank_total_credit, v_bank_total_debit, v_bank_days
  FROM bank_transactions
  WHERE tenant_id = p_tenant_id
    AND transaction_date >= CURRENT_DATE - p_days;
    
  -- Fallback: If no bank data, use cdp_orders for inflow estimate
  IF v_bank_total_credit = 0 THEN
    SELECT 
      COALESCE(SUM(net_revenue), 0),
      COALESCE(COUNT(DISTINCT DATE(order_at)), 1)
    INTO v_order_total, v_order_days
    FROM cdp_orders
    WHERE tenant_id = p_tenant_id
      AND order_at >= CURRENT_DATE - p_days;
      
    v_bank_total_credit := v_order_total;
    v_bank_days := GREATEST(v_order_days, 1);
  END IF;
  
  RETURN QUERY SELECT
    v_bank_total_credit,
    v_bank_total_debit,
    GREATEST(v_bank_days, 1)::INTEGER,
    v_bank_total_credit / GREATEST(v_bank_days, 1),
    v_bank_total_debit / GREATEST(v_bank_days, 1);
END;
$$;
```

### Phan 2: Sua `generateForecast()` - Them base inflow tu cdp_orders

Cap nhat logic de luon tinh base revenue tu historical orders:

```typescript
// src/hooks/useForecastInputs.ts

// THEM field moi vao ForecastInputs
avgDailyOrderRevenue: number;  // Tu cdp_orders (SSOT)

// Trong useForecastInputs, tinh avgDailyOrderRevenue:
const avgDailyOrderRevenue = useMemo(() => {
  if (!orders || orders.length === 0) return 0;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.seller_income || 0), 0);
  return totalRevenue / 90; // 90-day average
}, [orders]);

// Trong generateForecast(), THEM base inflow:
// After AR + pendingSettlements, add base order revenue
if (inputs.avgDailyOrderRevenue > 0 && !salesProjection) {
  // Use historical order revenue as baseline (with settlement delay)
  if (i >= 14) {
    inflow += inputs.avgDailyOrderRevenue * 0.8; // 80% net after platform fees
  }
}
```

### Phan 3: Sua useSalesProjection - Bo T+14 delay cho historical data

Hien tai `calculateSalesInflowForDay()` chi tra ve > 0 khi `dayIndex >= 14`. Dieu nay dung cho TUONG LAI nhung nen tinh ca historical backlog:

```typescript
export function calculateSalesInflowForDay(
  projection: SalesProjection,
  dayIndex: number
): number {
  // Days 0-13: Gradual settlement of past orders (ramp up)
  if (dayIndex < projection.settlementDelay) {
    // Assume 50% of historical daily revenue arrives in first 14 days
    // (orders placed before today, settling now)
    return projection.dailyNetCashInflow * (dayIndex / projection.settlementDelay) * 0.5;
  }
  
  // After delay, full daily net cash inflow
  return projection.dailyNetCashInflow;
}
```

---

## Chi tiet ky thuat

### Files can thay doi

| File | Thay doi |
|------|----------|
| `supabase/migrations/xxx.sql` | Sua RPC `get_forecast_historical_stats` de fallback sang cdp_orders |
| `src/hooks/useForecastInputs.ts` | Them `avgDailyOrderRevenue`, tinh tu cdp_orders |
| `src/hooks/useSalesProjection.ts` | Sua `calculateSalesInflowForDay` de ramp up ngay 0-13 |

### Logic moi

```text
Inflow Calculation (per day):

Day 0-6:
  + AR collections (probability-weighted)
  + Overdue AR (3% * probability)
  + Sales ramp-up (0% -> 50% of daily projection)

Day 7-13:
  + AR collections
  + Overdue AR
  + pendingSettlements / 14
  + Sales ramp-up (50% -> 100%)

Day 14-30:
  + AR collections (decreasing as AR depletes)
  + Overdue AR
  + pendingSettlements / 14 (until day 21)
  + Full daily sales projection (100%)

Day 31+:
  + AR collections (from later buckets)
  + Full daily sales projection
```

### Ket qua mong doi

| Metric | Hien tai | Sau khi sua |
|--------|----------|-------------|
| Avg Daily Inflow (ngay 0-13) | ~2M | ~5-8M |
| Avg Daily Inflow (ngay 14+) | ~4M | ~10-12M |
| Thu chi trung binh | 2M/22M | 10M/22M |
| Chart "Thu vao" | Gan = 0 | Co bar xanh tuong xung |

## Thu tu thuc hien

1. **Migration SQL**: Sua RPC `get_forecast_historical_stats` (fallback cdp_orders)
2. **useForecastInputs.ts**: Them `avgDailyOrderRevenue` field
3. **useSalesProjection.ts**: Sua `calculateSalesInflowForDay()` ramp-up logic
4. **Test**: Xac nhan chart hien thi dung
