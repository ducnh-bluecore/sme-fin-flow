

# Sửa Logic Sản Xuất: Không Đề Xuất Hàng Bán Chậm

## Vấn đề
Engine đang đề xuất sản xuất hàng bán chậm (velocity 0.1-0.2/ngày) vì:
- Ngưỡng chặn quá thấp (chỉ chặn < 0.1 SP/ngày)
- Công thức tính nhu cầu không phân biệt slow vs fast mover
- DOC sau sản xuất lên tới 235-270 ngày = khóa cash vô nghĩa
- Vi phạm nguyên tắc FDP: "SKU lỗ + khóa cash + tăng risk -> phải nói STOP"

## Giải pháp: 3 tầng lọc cho slow mover

### Tầng 1: Nâng ngưỡng chặn
- Slow mover (velocity < 0.5/ngày) + KHÔNG phải Hero -> productionQty = 0
- Chỉ Hero mới được sản xuất dù bán chậm

### Tầng 2: Giới hạn DOC cho slow mover
- Slow mover Hero: DOC target tối đa 30 ngày (thay vì 60)
- Normal mover: giữ nguyên logic hiện tại

### Tầng 3: Cash Recovery Filter
- Nếu DOC sau sản xuất > 120 ngày -> cắt productionQty về mức DOC = 90 ngày
- Đảm bảo không khóa cash quá 3 tháng cho bất kỳ FC nào

### Tầng 4: Cải thiện lý do (Reason)
- Slow mover bị chặn: hiển thị rõ "Không SX - bán chậm, rủi ro khóa cash"
- Slow mover Hero được SX: hiển thị "SX giới hạn - Hero nhưng velocity thấp"

## Chi tiết kỹ thuật

### File sửa: `supabase/functions/growth-simulator/index.ts`

Logic thay đổi tại khu vực tính productionQty (khoảng line 313-320):

```text
TRUOC:
  if (segment === 'slow' && velocity < 0.1 && !isHero) -> productionQty = 0

SAU:
  // Tang 1: Chan slow mover khong phai Hero
  if (segment === 'slow' && !isHero) -> productionQty = 0
  
  // Tang 2: Slow mover Hero -> giam DOC target
  if (segment === 'slow' && isHero) -> targetDOC = min(targetDOC, 30)
  
  // Tang 3: Cap DOC sau SX cho tat ca
  if (docAfterProduction > 120) -> 
    productionQty = max(0, round(90 * vForecast - onHandQty))
```

### Kết quả mong đợi
- Babette Fleur Top (0.2/ngày, slow, non-hero): **Không SX** (truoc: SX 40)
- Kaede Bow Top (0.2/ngày, slow, non-hero): **Không SX** (truoc: SX 40)
- Circe Bag (0.2/ngày, slow, non-hero): **Không SX** (truoc: SX 40)
- Kaori Top (0.1/ngày, slow, non-hero): **Không SX** (truoc: SX 31)
- Janece Knit Top (Hero): **Van SX** nhung giam so luong (DOC cap 90 ngay)

### Tac dong
- Giam so FC duoc de xuat SX
- Giam tong cash required
- Tang chat luong de xuat (chi SX hang ban duoc)
- Production table chi hien hang dang SX that su

