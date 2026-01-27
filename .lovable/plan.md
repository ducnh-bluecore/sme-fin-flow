
# KẾ HOẠCH: SỬA LABEL DOANH THU CHO PHÙ HỢP BUSINESS MODEL

## 1. PHÂN TÍCH VẤN ĐỀ

### Dữ liệu thực tế trong hệ thống

| Nguồn | Số lượng | Giá trị | Ghi chú |
|-------|----------|---------|---------|
| `cdp_orders` (e-commerce) | 5,500 orders | ~2.03 tỷ | Shopee, Lazada, Website, TikTok Shop |
| `invoices` (B2B) | 5,500 invoices | ~2.58 tỷ | Hóa đơn B2B tạo từ orders |

### Vấn đề hiện tại

| Label hiện tại | Nguồn dữ liệu | Vấn đề |
|----------------|---------------|--------|
| "Từ hóa đơn" | `invoice_revenue` | Gây nhầm lẫn - có thể hiểu là hóa đơn từ cdp_orders |
| "Từ hợp đồng" | `contract_revenue` | OK - cho doanh thu theo hợp đồng dài hạn |
| "Từ tích hợp" | `integrated_revenue` | Có thể làm rõ hơn = doanh thu sàn TMĐT |

### Luồng dữ liệu trong FDP

```text
cdp_orders (Shopee, Lazada, TikTok, Website)
    │
    ├─→ "Từ sàn TMĐT" (integrated_revenue) = Doanh thu e-commerce
    │       └─ Shopee: 751M, Lazada: 525M, TikTok: 322M, Website: 431M
    │
    └─→ invoices table (generated from orders for B2B billing)
            └─ "Từ hóa đơn B2B" (invoice_revenue) = Doanh thu xuất hóa đơn

contracts table (if applicable)
    └─→ "Từ hợp đồng" (contract_revenue) = Doanh thu hợp đồng
```

---

## 2. ĐỀ XUẤT RENAME LABELS

Theo FDP Manifesto: **"TRUTH > FLEXIBILITY"** - labels phải phản ánh đúng bản chất dữ liệu.

### Phương án đề xuất

| Cũ | Mới | Lý do |
|----|-----|-------|
| "Từ hóa đơn" | **"Từ đơn hàng B2B"** hoặc **"Từ hóa đơn B2B"** | Làm rõ đây là doanh thu từ invoices table (B2B) |
| "Từ tích hợp" | **"Từ sàn TMĐT"** | Rõ ràng hơn - đây là Shopee, Lazada, TikTok |
| "Từ hợp đồng" | Giữ nguyên | Đã rõ nghĩa |

### Thay đổi tương ứng trong code

**File: `src/pages/PLReportPage.tsx`**

Dòng 415:
```typescript
// Trước
<PLLineItem label="Từ hóa đơn" ...

// Sau  
<PLLineItem label="Từ đơn hàng B2B" ...
```

Dòng 421:
```typescript
// Trước
<PLLineItem label="Từ tích hợp" ...

// Sau
<PLLineItem label="Từ sàn TMĐT" ...
```

Dòng 899:
```typescript
// Trước
<p className="text-sm text-muted-foreground mb-1">Từ hóa đơn</p>

// Sau
<p className="text-sm text-muted-foreground mb-1">Từ đơn hàng B2B</p>
```

Dòng 913:
```typescript
// Trước
<p className="text-sm text-muted-foreground mb-1">Từ tích hợp</p>

// Sau
<p className="text-sm text-muted-foreground mb-1">Từ sàn TMĐT</p>
```

---

## 3. CÂN NHẮC BỔ SUNG (OPTIONAL)

### 3.1 Thêm breakdown chi tiết theo kênh

Thay vì chỉ hiển thị "Từ sàn TMĐT: 423M", có thể thêm:

```text
┌─────────────────────────────────────────────┐
│ Từ sàn TMĐT                                 │
│ 423.159.200 đ (100% tổng)                   │
├─────────────────────────────────────────────┤
│ • Shopee: 35% (148M)                        │
│ • Lazada: 25% (106M)                        │
│ • Website: 21% (89M)                        │
│ • TikTok Shop: 19% (80M)                    │
└─────────────────────────────────────────────┘
```

### 3.2 Thêm tooltip giải thích nguồn

```typescript
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>
      <p>Từ sàn TMĐT</p>
    </TooltipTrigger>
    <TooltipContent>
      Doanh thu từ các sàn: Shopee, Lazada, TikTok Shop, Website
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## 4. FILES CẦN SỬA ĐỔI

| File | Thay đổi | Ưu tiên |
|------|----------|---------|
| `src/pages/PLReportPage.tsx` | Đổi labels: "Từ hóa đơn" → "Từ đơn hàng B2B", "Từ tích hợp" → "Từ sàn TMĐT" | 🔴 High |

---

## 5. KẾT QUẢ MONG ĐỢI

### UI "Chi tiết Doanh thu theo nguồn" sau khi sửa:

```text
┌────────────────────────────────────────────────────────────────┐
│ Chi tiết Doanh thu theo nguồn                                  │
├─────────────┬─────────────┬─────────────┬──────────────────────┤
│ Từ đơn hàng │ Từ hợp đồng │ Từ sàn TMĐT │ Tổng doanh thu       │
│ B2B         │             │             │                      │
├─────────────┼─────────────┼─────────────┼──────────────────────┤
│ 0 đ         │ 0 đ         │ 423.159.200 │ 423.159.200 đ        │
│ 0% tổng     │ 0% tổng     │ 100% tổng   │ Sau chiết khấu &     │
│             │             │             │ trả hàng             │
└─────────────┴─────────────┴─────────────┴──────────────────────┘
```

### Mapping rõ ràng

| Label UI | Nguồn dữ liệu | Giải thích business |
|----------|---------------|---------------------|
| **Từ đơn hàng B2B** | `invoices` table | Doanh thu từ hóa đơn B2B xuất cho đối tác |
| **Từ hợp đồng** | `contracts` table | Doanh thu theo hợp đồng dài hạn |
| **Từ sàn TMĐT** | `cdp_orders` (Shopee/Lazada/TikTok/Website) | Doanh thu bán hàng qua sàn e-commerce |
