

## Thêm chi tiết lý do khi click vào từng dòng sản phẩm

### Vấn đề
Hiện tại cột "Reason" chỉ hiển thị text bị cắt ngắn (ví dụ: "stockout + same_region + core_..."). Người vận hành không hiểu TẠI SAO phải chuyển dòng này, thiếu ngữ cảnh về tồn kho nguồn/đích và tốc độ bán.

### Giải pháp
Thêm **expandable detail row** khi click vào từng dòng sản phẩm, hiển thị đầy đủ thông tin để người vận hành hiểu quyết định:

1. **Lý do đầy đủ** (reason không bị cắt)
2. **Tồn kho nguồn** (source_on_hand) -- "Kho nguồn đang có X units"
3. **Tồn kho đích** (dest_on_hand) -- "Kho đích chỉ còn Y units"
4. **Tốc độ bán tại đích** (dest_velocity) -- "Bán Z units/ngày"
5. **Revenue tiềm năng** vs **Chi phí vận chuyển** -- cho thấy Net Benefit có ý nghĩa
6. **Kết luận hành động** -- dịch reason thành câu tiếng Việt dễ hiểu cho Ops

### Chi tiết kỹ thuật

#### 1. Cập nhật query `useSizeIntelligence.ts`
Hiện tại query đã select `*` nên data đã có đủ các cột `source_on_hand`, `dest_on_hand`, `dest_velocity`, `estimated_revenue_gain`, `estimated_transfer_cost`. Không cần thay đổi query.

#### 2. Cập nhật `TransferSuggestionsCard.tsx`
- Thêm state `expandedRowId` để track dòng đang mở chi tiết
- Khi click vào row (không phải checkbox/button), toggle hiển thị detail panel phía dưới
- Detail panel hiển thị dạng grid 2x3:

```
+---------------------------+---------------------------+
| Kho nguồn: 15 units       | Kho đích: 0 units         |
| (dư hàng)                 | (hết hàng - stockout)     |
+---------------------------+---------------------------+
| Tốc độ bán đích: 2/ngày  | Chuyển: 3 units           |
+---------------------------+---------------------------+
| Revenue dự kiến: 3tr      | Chi phí VC: 200k          |
+---------------------------+---------------------------+
| Lý do: stockout + same_region + core_size              |
+--------------------------------------------------------+
```

- Thêm helper function `translateReason(reason)` để dịch reason tags thành tiếng Việt:
  - `stockout` -> "Kho đích đã hết hàng size này"
  - `same_region` -> "Cùng khu vực, chi phí vận chuyển thấp"
  - `cross_region` -> "Khác khu vực, ưu tiên vì net benefit cao"
  - `core_size` -> "Size core (bán chạy), cần bổ sung gấp"
  - v.v.

#### 3. Visual
- Row được click: highlight nhẹ với border-left primary
- Detail panel: background muted, border-top dashed
- Icon cursor-pointer trên row để báo hiệu có thể click

### Files thay đổi
- `src/components/command/TransferSuggestionsCard.tsx` -- thêm expandable detail row + translateReason helper
