

# Clearance Intelligence - Thanh Ly Thong Minh

## Muc tieu

Xay dung trang "Clearance Intelligence" giup CEO/CFO tra loi:
- **San pham nao can thanh ly?** (ton lau, le size, markdown risk cao)
- **Lich su giam gia cua no ra sao?** (da off 30% o dau, off 50% o dau, clear duoc bao nhieu?)
- **Kenh nao clear duoc hang do?** (KiotViet vs Shopee vs TikTok)
- **Rang buoc:** Nhom premium/signature/embroidery KHONG duoc off qua 50%

## Vi tri trong he thong

### Them menu moi trong Bluecore Command

Route: `/command/clearance`

Sidebar nav (vi tri giua "Cơ Cấu Size" va "Nguon Cung"):

```text
Tong Quan
Phan Bo
Co Cau Size
>>> Thanh Ly <<<   (moi)
Nguon Cung
San Xuat
Quyet Dinh
Ket Qua
Cai Dat
```

Icon: `TagsIcon` (lucide) hoac `Percent`

Ly do them menu rieng thay vi nhung vao trang khac:
- Day la **quy trinh quyet dinh doc lap** (khong phai Size Health, khong phai Allocation)
- Can nhieu khong gian de hien thi lich su giam gia theo thoi gian + kenh
- Tuong lai co the them "Clearance Campaign Builder"

## Du lieu co san

Tu database hien tai, co **44,203 dong** `cdp_order_items` co `discount_amount > 0`:

| Kenh | So dong giam gia | Avg discount % |
|------|-------------------|----------------|
| KiotViet | 23,908 | 16% |
| TikTok | 17,752 | 11% |
| Shopee | 2,086 | 50% |
| Lazada | 457 | 12% |

Cong thuc tinh discount %: `discount_amount / (line_revenue + discount_amount) * 100`

## Kien truc giao dien

### Tab 1: Danh sach can Clearance

Bang loc san pham can thanh ly, uu tien theo:
- `markdown_risk_score >= 60` (tu Size Intelligence)
- `curve_state = broken` + `DOC > 90`
- Season cu (FW25 trong mua SS26)

Cot chinh:
| San pham | Season | Ton kho | Gia tri ton | Health Score | MD Risk | Lich su Off | De xuat |

### Tab 2: Lich su Markdown (theo san pham)

Khi chon 1 san pham, hien thi timeline:
- Thoi gian off 30%: clear duoc bao nhieu don, o kenh nao
- Thoi gian off 50%: clear duoc bao nhieu don, o kenh nao
- Hieu qua: % ton kho da giam sau moi dot

Du lieu lay tu: `cdp_order_items` JOIN `cdp_orders` WHERE `discount_amount > 0`, group theo `discount_pct` buckets (0-20%, 20-30%, 30-50%, >50%) va `channel`.

### Tab 3: Phan tich kenh Clearance

Hien thi kenh nao clear hang tot nhat:
- KiotViet: avg off 16%, phu hop hang cao cap
- Shopee: avg off 50%, clear nhanh nhung margin thap
- TikTok: avg off 11%, volume cao

### Rang buoc Premium (Guardrail)

Ap dung qua `inv_family_codes.metadata` hoac `subcategory`:
- Nhom "premium", "signature", "embroidery" → MAX OFF = 50%
- Hien thi canh bao do khi off > 50% cho nhom nay
- CEO co the override nhung phai ghi ly do

## Technical Details

### Files moi

1. **`src/pages/command/ClearancePage.tsx`** — Trang chinh voi 3 tabs
2. **`src/hooks/inventory/useClearanceIntelligence.ts`** — Hook lay du lieu clearance

### Files can sua

1. **`src/App.tsx`** — Them route `/command/clearance`
2. **`src/components/layout/BluecoreCommandLayout.tsx`** — Them nav item "Thanh Ly"
3. **`src/components/mobile/MobileBottomNav.tsx`** — Khong thay doi (giu 4 tabs chinh, Clearance truy cap qua menu "Them")

### Database: Summary View (khong query raw)

Tao 1 database view `v_clearance_history_by_product` de tong hop lich su giam gia:

```sql
CREATE VIEW v_clearance_history_by_product AS
SELECT 
  oi.tenant_id,
  oi.product_name,
  oi.sku,
  o.channel,
  date_trunc('month', o.order_at) as sale_month,
  CASE 
    WHEN oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) <= 0.2 THEN '0-20%'
    WHEN oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) <= 0.3 THEN '20-30%'
    WHEN oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) <= 0.5 THEN '30-50%'
    ELSE '>50%'
  END as discount_band,
  count(*) as units_sold,
  sum(oi.line_revenue) as revenue_collected,
  sum(oi.discount_amount) as total_discount_given,
  round(avg(oi.discount_amount / NULLIF(oi.line_revenue + oi.discount_amount, 0) * 100)) as avg_discount_pct
FROM cdp_order_items oi
JOIN cdp_orders o ON oi.order_id = o.id AND oi.tenant_id = o.tenant_id
WHERE oi.discount_amount > 0
GROUP BY 1,2,3,4,5,6;
```

View nay dam bao:
- Khong query 1.2M rows tu client
- Ket qua da group san, chi tra ve vai tram dong
- Tuan thu nguyen tac "analytical aggregation constraint"

### Ket noi voi Size Intelligence

San pham can clearance = giao cua:
- `state_markdown_risk_daily` (risk >= 60)
- `state_cash_lock_daily` (cash dang bi khoa)
- `state_size_health_daily` (curve_state = broken/risk)
- `inv_family_codes` (season cu, metadata co tags)

### Guardrail Logic

```typescript
const PREMIUM_MAX_DISCOUNT = 50; // %
const isPremiumGroup = (fc) => {
  const tags = fc.metadata?.tags || [];
  const name = (fc.fc_name || '').toLowerCase();
  return tags.includes('premium') || tags.includes('signature') 
    || name.includes('embroidery') || name.includes('theu');
};
```

Khi de xuat discount > 50% cho nhom premium → hien thi canh bao do + khong cho chon mac dinh.

