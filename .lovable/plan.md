

# Fix Dashboard Không Có Data - 4 Vấn Đề Cốt Lõi

## Tổng quan vấn đề

Dashboard Retail Command Center đang hiển thị sai vì 4 nguyên nhân kỹ thuật khác nhau. Cần fix từng vấn đề để dashboard phản ánh đúng thực tế dữ liệu hiện có.

## Vấn đề 1: Channel War bị timeout

**Nguyên nhân**: `useAllChannelsPL` query `v_channel_pl_summary` với date range `all_time`, view tính toán nặng kết hợp RLS gây timeout.

**Giải pháp**: Thêm fallback khi query timeout -- sử dụng `kpi_facts_daily` (nguồn data chính cho 2025+) với GROUP BY channel thay vì view nặng. Đồng thời giới hạn query với `.limit(1000)` và catch error để hiển thị thông báo "Đang tải lâu, thử thu hẹp khoảng thời gian".

**File thay đổi**: `src/hooks/useAllChannelsPL.ts` -- thêm timeout handling + fallback query

## Vấn đề 2: Inventory Risk dùng sai nguồn data

**Nguyên nhân**: `InventoryRiskPanel` chỉ query bảng `inventory_items` (trống), trong khi `central_metrics_snapshots` CÓ data inventory (37.7 tỷ VND).

**Giải pháp**: Khi `inventory_items` trống, fallback sang hiển thị dữ liệu inventory từ `useFinanceTruthSnapshot` (totalInventoryValue, slowMovingInventory). Panel sẽ hiện summary từ snapshot thay vì "Chưa có dữ liệu".

**File thay đổi**: `src/components/dashboard/InventoryRiskPanel.tsx` -- thêm fallback render từ snapshot data

## Vấn đề 3: Health Score và Money Engine thiếu "no data" indicator

**Nguyên nhân**: Metrics gross_margin, ROAS, CAC = 0 vì chưa tích hợp COGS/Expenses, nhưng UI hiện "0.0%" mà không phân biệt "chưa có data" vs "thực sự = 0".

**Giải pháp**: 
- Sử dụng `dataQuality` flags từ snapshot (đã có sẵn: `hasCashData`, `hasExpenseData`, etc.)
- Khi flag = false, hiện badge "Chưa có dữ liệu" hoặc "N/A" thay vì "0.0%"
- Health Score Hero: hiện tooltip giải thích metrics nào chưa có data source

**File thay đổi**: 
- `src/components/dashboard/MoneyEngineCards.tsx` -- thêm no-data indicator khi snapshot flags cho biết thiếu source
- `src/components/dashboard/RetailHealthHero.tsx` -- thêm data quality note

## Vấn đề 4: Decision Feed hiện "khỏe" trong khi Health Score = CRITICAL

**Nguyên nhân**: Decision Feed phụ thuộc 3 data source (channel, inventory, snapshot), cả 3 đều bị vấn đề ở trên -> không trigger bất kỳ decision nào.

**Giải pháp**:
- Thêm decision khi data quality thấp: "Thiếu dữ liệu COGS/Chi phí -- margin chưa tính được"
- Thêm decision từ `alert_instances` (đang có 8+ alerts active trong DB)
- Khi Health Score = CRITICAL mà Decision Feed trống -> hiện warning "Health Score CRITICAL nhưng thiếu data để phân tích chi tiết"

**File thay đổi**: `src/components/dashboard/RetailDecisionFeed.tsx` -- thêm data-gap decisions + pull from alert_instances

## Vấn đề 5 (minor): Skeleton ref warning

**Nguyên nhân**: `RetailDecisionFeed` truyền ref cho `Skeleton` component (function component)

**Giải pháp**: Bỏ ref hoặc wrap Skeleton trong div

**File thay đổi**: `src/components/dashboard/RetailDecisionFeed.tsx`

## Tóm tắt files cần thay đổi

| File | Thay đổi |
|---|---|
| `src/hooks/useAllChannelsPL.ts` | Timeout handling + fallback query |
| `src/components/dashboard/InventoryRiskPanel.tsx` | Fallback sang snapshot data khi inventory_items trống |
| `src/components/dashboard/MoneyEngineCards.tsx` | No-data indicators dùng dataQuality flags |
| `src/components/dashboard/RetailHealthHero.tsx` | Data quality note khi metrics thiếu source |
| `src/components/dashboard/RetailDecisionFeed.tsx` | Thêm data-gap decisions + alert_instances + fix Skeleton ref |

## Thứ tự ưu tiên

1. Fix Channel War timeout (nhiều sections phụ thuộc)
2. Fix Decision Feed (đang hiện thông tin SAI -- nói "khỏe" khi thực sự CRITICAL)
3. Inventory fallback (có data sẵn trong snapshot)
4. No-data indicators (UX improvement)
5. Skeleton ref warning (minor)

