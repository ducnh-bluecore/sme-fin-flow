
# KẾ HOẠCH XÓA BỎ EXTERNAL_ORDERS - THIẾT LẬP SSOT HOÀN CHỈNH

## Tổng quan

Phương án B là triệt để nhất nhưng cũng đòi hỏi nhiều thay đổi nhất. Kế hoạch này sẽ chuyển toàn bộ hệ thống từ `external_orders` (Layer 0 - Raw) sang `cdp_orders` (Layer 1 - SSOT) và ngăn chặn việc tạo ra vi phạm SSOT trong tương lai.

## Phạm vi thay đổi

| Loại | Số lượng | Chi tiết |
|------|----------|----------|
| Database Views | 8 | v_cdp_*, v_channel_*, v_mdp_* |
| Frontend Hooks | 15+ | useMDPData, useFDPMetrics, useChannelPL, etc. |
| Edge Functions | 5 | sync-bigquery, sync-ecommerce-data, batch-import, etc. |

## Chiến lược thực hiện

Thay vì xóa `external_orders` ngay, chúng ta sẽ:

1. **Giữ external_orders làm "staging table"** - nơi connectors đổ data vào
2. **Tự động sync real-time** từ `external_orders` → `cdp_orders` qua trigger
3. **Redirect tất cả queries** sang `cdp_orders`
4. **Block direct queries** đến `external_orders` ở frontend

Điều này đảm bảo backward compatibility cho các connectors hiện tại.

## Chi tiết triển khai

### Phase 1: Database Trigger (Realtime Sync)

Tạo trigger tự động copy data từ `external_orders` sang `cdp_orders` ngay khi INSERT/UPDATE.

```sql
CREATE OR REPLACE FUNCTION sync_external_to_cdp_orders()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Resolve or create customer
  SELECT id INTO v_customer_id
  FROM cdp_customers 
  WHERE tenant_id = NEW.tenant_id 
    AND phone = NEW.customer_phone
  LIMIT 1;
  
  IF v_customer_id IS NULL AND NEW.customer_phone IS NOT NULL THEN
    INSERT INTO cdp_customers (tenant_id, phone, name, email)
    VALUES (NEW.tenant_id, NEW.customer_phone, NEW.customer_name, NEW.customer_email)
    RETURNING id INTO v_customer_id;
  END IF;
  
  -- Upsert to cdp_orders
  INSERT INTO cdp_orders (
    tenant_id, order_key, customer_id, order_at, channel,
    payment_method, currency, gross_revenue, discount_amount,
    net_revenue, cogs, gross_margin, is_discounted, is_bundle
  ) VALUES (
    NEW.tenant_id,
    COALESCE(NEW.external_order_id, NEW.order_number),
    v_customer_id,
    COALESCE(NEW.order_date, NEW.created_at)::timestamptz,
    NEW.channel,
    NEW.payment_method,
    COALESCE(NEW.currency, 'VND'),
    COALESCE(NEW.total_amount, 0),
    COALESCE(NEW.order_discount, 0),
    COALESCE(NEW.seller_income, NEW.total_amount, 0),
    COALESCE(NEW.cost_of_goods, 0),
    COALESCE(NEW.gross_profit, NEW.seller_income - COALESCE(NEW.cost_of_goods, 0)),
    COALESCE(NEW.order_discount, 0) > 0,
    false
  )
  ON CONFLICT (tenant_id, order_key) 
  DO UPDATE SET
    customer_id = EXCLUDED.customer_id,
    order_at = EXCLUDED.order_at,
    gross_revenue = EXCLUDED.gross_revenue,
    net_revenue = EXCLUDED.net_revenue,
    cogs = EXCLUDED.cogs,
    gross_margin = EXCLUDED.gross_margin;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_external_to_cdp
  AFTER INSERT OR UPDATE ON external_orders
  FOR EACH ROW EXECUTE FUNCTION sync_external_to_cdp_orders();
```

### Phase 2: Redirect Database Views (8 views)

Sửa toàn bộ 8 views đang query `external_orders`:

| View | Thay đổi |
|------|----------|
| `v_cdp_summary_stats` | external_orders → cdp_orders |
| `v_cdp_segment_summaries` | external_orders → cdp_orders |
| `v_cdp_trend_insights` | external_orders → cdp_orders |
| `v_cdp_value_distribution` | external_orders → cdp_orders |
| `v_channel_daily_revenue` | external_orders → cdp_orders |
| `v_channel_performance` | external_orders → cdp_orders |
| `v_channel_pl_summary` | external_orders → cdp_orders |
| `v_mdp_campaign_attribution` | external_orders → cdp_orders |

Column mapping:
- `total_amount` → `gross_revenue`
- `seller_income` → `net_revenue`
- `order_date` → `order_at`
- `customer_phone` → `customer_id`
- `cost_of_goods` → `cogs`
- `gross_profit` → `gross_margin`

### Phase 3: Redirect Frontend Hooks (15+ files)

Cập nhật tất cả hooks để query từ `cdp_orders`:

| Hook/Component | Thay đổi |
|----------------|----------|
| useVarianceAnalysis.ts | external_orders → cdp_orders |
| useAudienceData.ts | external_orders → cdp_orders |
| useScenarioBudgetData.ts | external_orders → cdp_orders |
| useWeeklyCashForecast.ts | external_orders → cdp_orders |
| useMDPData.ts | external_orders → cdp_orders |
| useMDPSSOT.ts | external_orders → cdp_orders |
| useChannelPL.ts | external_orders → cdp_orders |
| useEcommerceReconciliation.ts | external_orders → cdp_orders |
| useForecastInputs.ts | external_orders → cdp_orders |
| useWhatIfRealData.ts | external_orders → cdp_orders |
| useMDPDataReadiness.ts | external_orders → cdp_orders |
| useFDPMetrics.ts | external_orders → cdp_orders |
| RevenuePage.tsx | external_orders → cdp_orders |
| SKUCostBreakdownDialog.tsx | external_orders → cdp_orders |
| BigQuerySyncManager.tsx | Giữ nguyên (đây là staging) |
| DataQualityIndicator.tsx | external_orders → cdp_orders |

### Phase 4: Edge Functions (5 files)

Edge functions sẽ **giữ nguyên** việc upsert vào `external_orders` vì:
- Đây là staging table nhận data từ connectors
- Trigger sẽ tự động sync sang `cdp_orders`

Các functions cần kiểm tra:
- sync-ecommerce-data/index.ts - Giữ nguyên
- sync-bigquery/index.ts - Giữ nguyên
- batch-import-data/index.ts - Giữ nguyên
- detect-cross-domain-alerts/index.ts - Redirect sang cdp_orders
- decision-snapshots/index.ts - Redirect sang cdp_orders

### Phase 5: Governance & Prevention

Thêm ESLint rule để block direct queries đến `external_orders`:

```javascript
// .eslintrc.js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: "CallExpression[callee.property.name='from'][arguments.0.value='external_orders']",
      message: 'SSOT Violation: Query cdp_orders instead of external_orders'
    }
  ]
}
```

## Kiến trúc sau khi hoàn thành

```text
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL CONNECTORS                      │
│     Shopee │ Lazada │ TikTok │ Sapo │ BigQuery             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              external_orders (STAGING ONLY)                 │
│                   ⚠️ NO DIRECT QUERIES                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ TRIGGER (realtime)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 cdp_orders (SSOT - Layer 1)                 │
│            ✅ ALL VIEWS + HOOKS QUERY HERE                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
      FDP Views       CDP Views       MDP Views
           │               │               │
           ▼               ▼               ▼
      FDP Hooks       CDP Hooks       MDP Hooks
```

## Timeline

| Phase | Công việc | Ước tính |
|-------|-----------|----------|
| Phase 1 | Database Trigger | 1 migration |
| Phase 2 | 8 Database Views | 1 migration |
| Phase 3 | 15+ Frontend Files | 15 file edits |
| Phase 4 | 2 Edge Functions | 2 file edits |
| Phase 5 | ESLint Rules | 1 config file |

**Tổng cộng**: ~20 file changes

## Rủi ro và Mitigation

| Rủi ro | Mitigation |
|--------|------------|
| Data sync bị miss | Trigger runs on EVERY INSERT/UPDATE |
| Column mismatch | Explicit mapping trong trigger |
| Performance | cdp_orders đã có indexes |
| Breaking connectors | Giữ nguyên external_orders, chỉ thêm trigger |

## Verification sau khi hoàn thành

Chạy Governance Dashboard (`?governance=1`) để verify:
- FDP Revenue = CDP Revenue
- MDP Orders = CDP Orders
- Không còn REGRESSION warnings

## Kết quả mong đợi

1. **Single Source of Truth**: Tất cả modules đọc từ `cdp_orders`
2. **Realtime Sync**: Data mới từ connectors tự động có trong cdp_orders
3. **Future-proof**: ESLint block vi phạm SSOT mới
4. **Backward Compatible**: Connectors vẫn hoạt động bình thường
