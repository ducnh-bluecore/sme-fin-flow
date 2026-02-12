

# Sửa logic chỉ số Inventory Allocation Dashboard

## Vấn đề phát hiện

| Chỉ số | Vấn đề | Mức nghiêm trọng |
|---|---|---|
| Stockout risk P1: "1454 store" | Đếm đề xuất, không phải store. Label sai hoàn toàn | Cao |
| Revenue +759.8M | Cộng gross revenue, không trừ logistics. Không lọc status | Cao |
| Hero vs Capacity contradictory | "42 store thiếu" + "44 store nhận thêm" gây bối rối | Trung bình |
| Summary Cards | Không lọc pending-only, đếm cả approved/rejected | Trung bình |
| Push tab | Tab "Từ kho tổng" trống vì filter sai nguồn dữ liệu | Cao |

## Giải pháp

### 1. RebalanceSummaryCards.tsx -- Sửa logic tính

- **Stockout risk**: Đổi thành đếm **unique stores** có P1 pending: `new Set(p1Pending.map(s => s.to_location)).size`, label sửa thành "store có rủi ro hết hàng"
- **Revenue**: Chỉ cộng từ **pending** suggestions, hiển thị **Net Benefit** = `potential_revenue_gain - logistics_cost_estimate`
- **Push/Lateral units**: Chỉ đếm **pending** suggestions
- Thêm sub-text: "X pending / Y total" để người dùng biết còn bao nhiêu chưa xử lý

### 2. InventoryHeroHeader.tsx -- Cải thiện messaging

- Giữ nguyên logic đếm unique stores từ P1 pending (đang đúng)
- Thêm context: "thiếu hàng ở X family codes" thay vì chỉ nói "thiếu hàng"
- Phía phải: hiển thị "X store / Y đề xuất P1" thay vì chỉ "1454 P1"
- Revenue at risk chỉ tính từ pending P1

### 3. CapacityOptimizationCard.tsx -- Phân biệt rõ 2 concept

- "Còn chỗ nhận hàng" (utilization thấp) -- giữ nguyên
- Bỏ nhầm lẫn với "thiếu hàng": thêm tooltip/text giải thích "Sức chứa kho còn trống, không phải thiếu SKU cụ thể"
- Chỉ hiển thị khi có store gần đầy (>85%) -- phần "còn chỗ" chỉ hiện khi có store cần giảm tải, để suggest chuyển đi đâu

### 4. InventoryAllocationPage.tsx -- Sửa tab Push

- Tab "Từ kho tổng" hiện chỉ filter `rebalanceSuggestions` (lateral table) -- sai
- Sửa thành hiển thị `allocAsSuggestions` (chính là push từ kho tổng)
- Tab "Giữa các kho" giữ nguyên filter `rebalanceSuggestions.lateral`

### 5. Allocation mapping -- Thêm logistics cost

- Trong mapping `allocAsSuggestions`, set `logistics_cost_estimate` từ config thay vì hardcode 0
- `net_benefit = potential_revenue - logistics_cost` thay vì `= potential_revenue`

## Files thay đổi

| File | Thay đổi |
|---|---|
| `src/components/inventory/RebalanceSummaryCards.tsx` | Sửa P1 count thành unique stores, filter pending-only, hiển thị net benefit |
| `src/components/inventory/InventoryHeroHeader.tsx` | Sửa P1 badge hiển thị "X store / Y đề xuất", revenue chỉ từ pending |
| `src/components/inventory/CapacityOptimizationCard.tsx` | Ẩn "còn chỗ" khi không có store quá tải, thêm giải thích |
| `src/pages/InventoryAllocationPage.tsx` | Sửa tab Push dùng allocAsSuggestions, sửa logistics mapping |

