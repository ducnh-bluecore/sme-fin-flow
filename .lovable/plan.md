
# Fix AI Agent: Phân tích thông minh theo bản chất metric

## Vấn đề gốc

Pass 2 prompt hiện tại ép AI vào template cứng 7 bước cho MỌI loại metric. Điều này gây ra:

1. **Lỗi toán học**: AOV (Average Order Value) bị cộng dồn rồi chia trung bình -- vô nghĩa. AOV = 459K/12 = 38,250 VND là sai hoàn toàn.
2. **Phân tích rập khuôn**: Revenue, AOV, ROAS... đều ra cùng một format, không có insight thật.

## Giải pháp

Thay prompt cứng nhắc bằng **Metric Intelligence Layer** -- dạy AI phân biệt bản chất metric trước khi phân tích.

### Thay đổi trong `supabase/functions/cdp-qa/index.ts`

**1. Thêm Metric Classification vào System Prompt (buildSystemPrompt)**

Bổ sung phần quy tắc phân loại metric:

```
## PHÂN LOẠI METRIC -- BẮT BUỘC TUÂN THỦ

Trước khi phân tích, XÁC ĐỊNH loại metric:

CUMULATIVE (cộng dồn được): NET_REVENUE, ORDER_COUNT, AD_SPEND, COGS
- Tổng = SUM tất cả kỳ
- Trung bình = SUM / số kỳ  
- So sánh = tổng kỳ này vs tổng kỳ trước

AVERAGE/RATIO (không cộng dồn): AOV, ROAS, GROSS_MARGIN, CM_PERCENT
- KHÔNG BAO GIỜ cộng dồn hoặc tính "tổng"
- Trung bình = weighted average (theo ORDER_COUNT hoặc AD_SPEND)
- AOV trung bình = Tổng Revenue / Tổng Orders, KHÔNG phải trung bình các AOV tháng
- ROAS = Tổng Revenue / Tổng Ad Spend
- So sánh = giá trị kỳ này vs kỳ trước (không tổng)

SNAPSHOT (thời điểm): INVENTORY, CASH_POSITION, CUSTOMER_COUNT
- Chỉ lấy giá trị mới nhất, không cộng dồn
- So sánh = hiện tại vs kỳ trước
```

**2. Nâng cấp Pass 2 Analysis Prompt (dòng 455-472)**

Thay template 7 bước cứng nhắc bằng hướng dẫn phân tích linh hoạt:

```
BẮT BUỘC TUÂN THỦ:

1. XÁC ĐỊNH loại metric (cumulative/average/snapshot) -> áp dụng cách tính ĐÚNG
2. KHÔNG ÁP DỤNG CÙNG MỘT TEMPLATE CHO MỌI CÂU HỎI

Với CUMULATIVE metrics (Revenue, Orders):
- Tổng kỳ, tăng trưởng MoM, tháng đỉnh/đáy, nguyên nhân

Với AVERAGE/RATIO metrics (AOV, ROAS, Margin):
- KHÔNG tính "tổng AOV" -- vô nghĩa
- Weighted average qua kỳ
- Xu hướng lên/xuống và ý nghĩa kinh doanh
- VD: AOV giảm + Orders tăng = bán rẻ hơn nhưng nhiều hơn -> margin bị ảnh hưởng?

Với SNAPSHOT metrics (Inventory, Cash):
- Giá trị hiện tại và thay đổi so với kỳ trước

3. PHÂN TÍCH CROSS-DOMAIN (quan trọng nhất):
- Revenue tăng nhưng AOV giảm -> đang bán rẻ?
- Orders tăng nhưng Margin giảm -> chi phí tăng?
- ROAS tốt nhưng cash chậm -> rủi ro dòng tiền?

4. KẾT LUẬN phải là HÀNH ĐỘNG cụ thể cho CEO/CFO, không phải tóm tắt số

5. Chart nếu >= 3 data points
```

**3. Tăng temperature Pass 2 lên 0.4**

Từ 0.3 lên 0.4 để cho phép suy luận linh hoạt hơn thay vì lặp template.

## Kết quả mong đợi

- AOV sẽ được báo cáo đúng: "AOV trung bình 2025: ~459K VND/đơn" thay vì "Tổng AOV: 459K, Trung bình: 38K"
- Mỗi loại metric có cách phân tích riêng phù hợp bản chất
- Phân tích cross-domain: AOV giảm + Revenue tăng = đang bán nhiều hơn nhưng rẻ hơn
- Đề xuất hành động dựa trên suy luận, không phải fill-in-the-blank
