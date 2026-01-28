
# Kế hoạch: Thêm Tooltip giải thích phí sàn Revenue Share

## 1. Bối cảnh

User đã chọn **Phương án 1: Giữ nguyên Revenue Share** - logic phân bổ phí hiện tại là đúng, chỉ cần thêm tooltip giải thích để user hiểu rõ cách tính.

## 2. Thay đổi

### 2.1 Thêm Tooltip vào Summary Cards

Trong `SKUCostBreakdownDialog.tsx`, thêm icon info với tooltip cho các card phí:

| Card | Tooltip Content |
|------|-----------------|
| Phí sàn | "Phí sàn được phân bổ theo tỷ trọng doanh thu của SKU trong mỗi đơn hàng (revenue share)" |
| Phí vận chuyển | "Phí vận chuyển được phân bổ theo tỷ trọng doanh thu của SKU trong mỗi đơn hàng" |
| Phí khác | "Các phí khác được phân bổ theo tỷ trọng doanh thu của SKU trong mỗi đơn hàng" |

### 2.2 Thêm Tooltip vào Tab "Chi tiết đơn"

Trong header của bảng orders, thêm tooltip cho các cột phí:
- Cột "Phí sàn" → tooltip giải thích đây là phí đã phân bổ theo revenue share
- Cột "Phí VC" → tương tự

### 2.3 UI Component

Sử dụng component `Tooltip` + icon `Info` từ Lucide:

```tsx
<div className="flex items-center gap-1">
  <span>Phí sàn</span>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        <Info className="h-3 w-3 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs text-xs">
          Phí sàn được phân bổ theo tỷ trọng doanh thu của SKU 
          trong mỗi đơn hàng (revenue share)
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</div>
```

## 3. File thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/dashboard/SKUCostBreakdownDialog.tsx` | Thêm tooltips cho các card phí và header bảng |

## 4. Kết quả mong đợi

- User click vào SKU → Dialog mở
- Các card "Phí sàn", "Phí VC", "Phí khác" có icon (i) nhỏ
- Hover vào icon → Hiển thị tooltip giải thích cách tính phân bổ
- Tab "Chi tiết đơn" → Header cột phí cũng có tooltip tương tự
