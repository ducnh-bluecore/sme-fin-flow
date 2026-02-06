
# Plan: Cập nhật Dataset Mapping chính xác cho BigQuery Backfill

## Tổng quan vấn đề

Hiện tại cấu hình trong `backfill-bigquery/index.ts` đang sai dataset cho nhiều sources. Cần cập nhật theo đúng cấu trúc BigQuery thực tế.

## Cấu trúc Dataset đã xác nhận

| Dataset | Chứa data từ |
|---------|--------------|
| `olvboutique` | KiotViet, Haravan, Bluecore, Products + các source khác |
| `olvboutique_shopee` | Shopee Orders & Items |
| `olvboutique_lazada` | Lazada Orders & Items |
| `olvboutique_tiktokshop` | TikTok Shop Orders & Items |
| `olvboutique_tiki` | Tiki Orders & Items |
| `olvboutique_shopeeads` | Shopee Ads data |

## Các thay đổi cần thực hiện

### 1. CUSTOMER_SOURCES (đã đúng - không cần sửa)
```
kiotviet  → olvboutique ✓
haravan   → olvboutique ✓
bluecore  → olvboutique ✓
```

### 2. ORDER_SOURCES - Cần sửa lại

| Channel | Hiện tại | Đúng |
|---------|----------|------|
| shopee | olvboutique | **olvboutique_shopee** |
| lazada | olvboutique | **olvboutique_lazada** |
| tiktok | olvboutique | **olvboutique_tiktokshop** |
| tiki | olvboutique | **olvboutique_tiki** |
| kiotviet | olvboutique | olvboutique ✓ |

### 3. ORDER_ITEM_SOURCES - Cần sửa 2 sources

| Channel | Hiện tại | Đúng |
|---------|----------|------|
| shopee | olvboutique_shopee | olvboutique_shopee ✓ |
| lazada | olvboutique_lazada | olvboutique_lazada ✓ |
| tiktok | olvboutique_tiktokshop | olvboutique_tiktokshop ✓ |
| kiotviet | olvboutique_kiotviet | **olvboutique** |

### 4. Products Sync - Cần sửa

| Hiện tại | Đúng |
|----------|------|
| `olvboutique_kiotviet.bdm_master_data_products` | **`olvboutique.bdm_master_data_products`** |

## Chi tiết kỹ thuật

### File: `supabase/functions/backfill-bigquery/index.ts`

**Thay đổi 1 - ORDER_SOURCES (lines 114-183):**
```typescript
const ORDER_SOURCES = [
  { channel: 'shopee', dataset: 'olvboutique_shopee', table: 'shopee_Orders', ... },
  { channel: 'lazada', dataset: 'olvboutique_lazada', table: 'lazada_Orders', ... },
  { channel: 'tiktok', dataset: 'olvboutique_tiktokshop', table: 'tiktok_Orders', ... },
  { channel: 'tiki', dataset: 'olvboutique_tiki', table: 'tiki_Orders', ... },
  { channel: 'kiotviet', dataset: 'olvboutique', table: 'raw_kiotviet_Orders', ... },
];
```

**Thay đổi 2 - ORDER_ITEM_SOURCES KiotViet (line 597-610):**
```typescript
{
  channel: 'kiotviet',
  dataset: 'olvboutique',  // Sửa từ olvboutique_kiotviet
  table: 'raw_kiotviet_OrderDetails',
  ...
}
```

**Thay đổi 3 - syncProducts query (line 712):**
```typescript
FROM `${projectId}.olvboutique.bdm_master_data_products`  // Sửa từ olvboutique_kiotviet
```

## Tóm tắt thay đổi

| Model | Số lượng sửa |
|-------|--------------|
| Customers | 0 (đã đúng) |
| Orders | 4 sources |
| Order Items | 1 source |
| Products | 1 query |

**Tổng: 6 điểm cần sửa trong 1 file**
