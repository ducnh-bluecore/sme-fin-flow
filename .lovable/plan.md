
# KẾ HOẠCH HOÀN THÀNH SSOT - PHASE 4

## MỤC TIÊU
Migrate 20 queries còn lại từ `external_orders` → `cdp_orders` để đạt 100% SSOT compliance.

## COLUMN MAPPING (Giữ nguyên)
```text
external_orders              → cdp_orders
─────────────────────────────────────────────
total_amount                 → gross_revenue
order_date                  → order_at
cost_of_goods               → cogs
seller_income               → net_revenue
gross_profit                → gross_margin
customer_phone              → customer_id
```

## DANH SÁCH FILES CẦN REFACTOR

### Batch 1: Critical Priority (7 queries)

| File | Lines | Changes |
|------|-------|---------|
| `useMDPExtendedData.ts` | 194-202, 345-352, 741-748, 910-917, 1061-1068 | 5 queries cần map columns |
| `useMDPSSOT.ts` | 151-157 | `external_orders` → `cdp_orders`, map columns |
| `useMDPData.ts` | 246-252 | `external_orders` → `cdp_orders`, map columns |

### Batch 2: High Priority (3 queries)

| File | Lines | Changes |
|------|-------|---------|
| `useFDPMetrics.ts` | 204-210 | Map all columns + remove unavailable fee columns |
| `useMDPDataReadiness.ts` | 54-57, 62-67 | Change table reference |
| `useAudienceData.ts` | 162-168 | Map customer_phone → customer_id, etc |

### Batch 3: Medium Priority (5 queries)

| File | Lines | Changes |
|------|-------|---------|
| `useWhatIfRealData.ts` | 104-111, 143-148 | Complex select - simplify to available columns |
| `useScenarioBudgetData.ts` | 153-159 | Map total_amount → gross_revenue |
| `useWeeklyCashForecast.ts` | 111-118 | Map total_amount → gross_revenue |

## CHI TIẾT THAY ĐỔI

### useMDPExtendedData.ts (5 queries)

```typescript
// BEFORE (line 194-199)
const { data, error } = await supabase
  .from('external_orders')
  .select('channel, total_amount, status')
  .eq('tenant_id', tenantId)
  .gte('order_date', startDateStr)
  .lte('order_date', endDateStr);

// AFTER
const { data, error } = await supabase
  .from('cdp_orders')
  .select('channel, gross_revenue')
  .eq('tenant_id', tenantId)
  .gte('order_at', startDateStr)
  .lte('order_at', endDateStr);
// NOTE: status removed - cdp_orders only has delivered orders
// Map: total_amount → gross_revenue
```

### useMDPSSOT.ts (1 query)

```typescript
// BEFORE (line 151-157)
const { data, error } = await supabase
  .from('external_orders')
  .select('id, channel, status, total_amount, payment_status, order_date, shipping_fee')
  .eq('tenant_id', tenantId)
  .gte('order_date', startDateStr)
  .lte('order_date', endDateStr)
  .limit(50000);

// AFTER
const { data, error } = await supabase
  .from('cdp_orders')
  .select('id, channel, gross_revenue, order_at')
  .eq('tenant_id', tenantId)
  .gte('order_at', startDateStr)
  .lte('order_at', endDateStr)
  .limit(50000);
// Default: status='delivered', payment_status='paid', shipping_fee=0
```

### useFDPMetrics.ts (1 query)

```typescript
// BEFORE (line 204-210)
const ordersRes = await supabase
  .from('external_orders')
  .select('id, channel, status, total_amount, cost_of_goods, platform_fee, ...')
  .eq('tenant_id', tenantId)
  .gte('order_date', startDateStr)
  .lte('order_date', endDateStr)
  .limit(50000);

// AFTER
const ordersRes = await supabase
  .from('cdp_orders')
  .select('id, channel, gross_revenue, cogs, net_revenue, gross_margin, customer_id, order_at')
  .eq('tenant_id', tenantId)
  .gte('order_at', startDateStr)
  .lte('order_at', endDateStr)
  .limit(50000);
// Map unavailable fee columns to 0
```

### useAudienceData.ts (1 query)

```typescript
// BEFORE (line 162-168)
const { data, error } = await supabase
  .from('external_orders')
  .select('id, customer_name, customer_email, customer_phone, channel, status, total_amount, ...')
  .eq('tenant_id', tenantId)

// AFTER
const { data, error } = await supabase
  .from('cdp_orders')
  .select('id, customer_id, channel, gross_revenue, net_revenue, cogs, gross_margin, order_at')
  .eq('tenant_id', tenantId)
// Map: customer_phone → customer_id
// Default: status='delivered', payment_status='paid'
```

## THỨ TỰ THỰC HIỆN

1. **Batch 1**: `useMDPExtendedData.ts`, `useMDPSSOT.ts`, `useMDPData.ts`
2. **Batch 2**: `useFDPMetrics.ts`, `useMDPDataReadiness.ts`, `useAudienceData.ts`
3. **Batch 3**: `useWhatIfRealData.ts`, `useScenarioBudgetData.ts`, `useWeeklyCashForecast.ts`

## VERIFICATION

Sau khi hoàn thành:

1. Run ESLint - Expected: 0 external_orders violations (trừ exempted files)
2. Governance Dashboard (?governance=1) - All checks PASS
3. Build thành công không lỗi TypeScript

## ESTIMATED WORK

| Metric | Value |
|--------|-------|
| Files cần sửa | 9 |
| Queries cần migrate | 15 |
| Lines changed | ~150 |
| Time estimate | 1 session |
