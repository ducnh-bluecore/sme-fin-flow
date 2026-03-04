

## Vấn đề

AI prompt hiện tại diễn giải sai metric:
- Nói "giao dịch > khách = repeat purchase = tín hiệu tốt" — **SAI**
- Thực tế: nhiều đơn bán cho khách walk-in không để lại info → hệ thống gom chung vào 1 ID "khách lẻ" → `distinct customer_id` bị deflate
- Hệ quả: `avg_daily_customers` **thấp hơn thực tế**, và tỷ lệ giao dịch/khách > 1 chỉ phản ánh **tỷ lệ khách không để lại info**, không phải repeat purchase

## Thay đổi

**File:** `supabase/functions/store-ai-analysis/index.ts` — cập nhật SYSTEM_PROMPT

1. **Thêm DATA DEFINITIONS** sau phần "NGUYÊN TẮC VÀNG":

```
**ĐỊNH NGHĨA DỮ LIỆU — BẮT BUỘC HIỂU ĐÚNG:**
- "Khách/ngày" (avg_daily_customers) = COUNT DISTINCT customer_id từ đơn hàng. 
  KHÔNG PHẢI footfall. Hệ thống KHÔNG CÓ data footfall.
- Ngành thời trang: khách KHÔNG quay lại mua nhiều đơn trong cùng ngày.
- Nếu giao dịch/ngày > khách/ngày → KHÔNG PHẢI repeat purchase. 
  Nguyên nhân: nhiều đơn bán cho khách walk-in không để lại thông tin (khách lẻ) 
  → hệ thống gom chung vào 1 ID "khách lẻ" → số khách bị DEFLATE.
- Tỷ lệ (giao dịch/khách - 1) phản ánh % đơn hàng từ khách không để lại info.
  Tỷ lệ này cao → vấn đề thu thập data khách, KHÔNG PHẢI tín hiệu tích cực.
- KHÔNG ĐƯỢC nói "conversion rate" hay "repeat purchase" từ data này.
```

2. **Sửa dòng "Conversion Signal"** trong TƯ DUY PHÂN TÍCH (dòng 25):

```
- Customer Capture Rate: Giao dịch/khách >1 = nhiều đơn khách lẻ không để info. 
  Tỷ lệ cao → cần cải thiện thu thập thông tin khách. 
  KHÔNG CÓ data footfall → không tính conversion rate truyền thống.
```

Chỉ thay đổi 1 file, chỉ sửa prompt text — không ảnh hưởng logic code.

