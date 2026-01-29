

# Kế hoạch nâng cấp FDP Sales Deck: Định vị + Use Cases + Lợi thế cạnh tranh

## Tổng quan vấn đề

Deck hiện tại có cấu trúc tốt (12 slides) nhưng thiếu 3 yếu tố quan trọng:

| # | Vấn đề | Slide | Cần cải thiện |
|---|--------|-------|---------------|
| 1 | Slide định vị Bluecore chưa nói rõ "tại sao Bluecore?" | Page 5 | Thêm positioning statement + differentiation |
| 2 | Use Cases chưa có bối cảnh thực tế | Pages 7-10 | Thêm story format: Tình huống → Vấn đề → Giải pháp → Kết quả |
| 3 | So sánh đối thủ chưa khẳng định lợi thế | Page 6 | Thêm "Why Bluecore Wins" section + specific advantages |

---

## Thay đổi chi tiết

### 1. Page 5: Slide Định vị Bluecore (Nâng cấp)

**Hiện tại**: Chỉ list 4 tính năng (Cash Position, Unit Economics, AR/AP, Cash Runway)

**Thêm mới**:

```text
┌─────────────────────────────────────────────────────────────┐
│ EYEBROW: "Định vị"                                          │
│                                                              │
│ HEADLINE: "Bluecore FDP không phải BI — không phải ERP"    │
│                                                              │
│ POSITIONING STATEMENT (2-3 dòng):                           │
│ "Bluecore FDP là nền tảng dữ liệu tài chính duy nhất        │
│  được thiết kế cho CEO và CFO SME Retail Việt Nam.          │
│  Không phải công cụ báo cáo — mà là hệ thống hỗ trợ         │
│  quyết định dựa trên dòng tiền thật."                       │
│                                                              │
│ 3 PILLARS (thay vì 4 feature cards):                        │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐    │
│ │ 💵 REAL CASH   │ │ 📊 TRUTH FIRST │ │ ⚡ ACTION NOW  │    │
│ │ Tiền thật,     │ │ Không làm đẹp  │ │ Quyết định    │    │
│ │ không tiền sổ  │ │ số, chỉ sự     │ │ hôm nay,      │    │
│ │ sách           │ │ thật           │ │ không chờ     │    │
│ └────────────────┘ └────────────────┘ └────────────────┘    │
│                                                              │
│ CORE CAPABILITIES (4 cards như cũ nhưng có context):        │
│ A: Cash Position — "Biết tiền THẬT trong 5 giây"           │
│ B: Unit Economics — "Biết SKU nào đang ăn tiền"            │
│ C: AR/AP Actions — "Biết ai cần gọi hôm nay"               │
│ D: Cash Forecast — "Biết runway còn bao lâu"               │
└─────────────────────────────────────────────────────────────┘
```

**Thay đổi code**:
- Thêm `positioningStatement` text block trước `solutionGrid`
- Thêm `threePillars` section (3 cột highlight 3 core values)
- Giữ nguyên 4 `solutionCards` nhưng update copy cho action-oriented hơn

---

### 2. Pages 7-10: Use Cases với Story Format (Nâng cấp)

**Hiện tại**: Chỉ có headline + mockup + 2 benefits + impact

**Thêm mới**: Story block với format "Tình huống → Vấn đề → Bluecore giải quyết"

#### Use Case #1: Monday Morning Cash Check (Page 7)

```text
STORY BLOCK (thêm trước mockup):
┌─────────────────────────────────────────────────────────────┐
│ 📖 TÌNH HUỐNG THỰC TẾ                                       │
│                                                              │
│ "Anh Minh, CEO chuỗi thời trang 5 cửa hàng, mỗi sáng        │
│  thứ Hai phải mất 2 giờ để hỏi kế toán: 'Mình còn bao      │
│  nhiêu tiền?' Kế toán nói 2 tỷ, nhưng 1.5 tỷ đang bị       │
│  Shopee hold, 300 triệu là COD chưa đối soát."             │
│                                                              │
│ → VỚI BLUECORE: Anh Minh mở app, 5 giây biết ngay:         │
│   Cash thật: 500 triệu | Hold: 1.5 tỷ | Sẽ về: 800 triệu   │
└─────────────────────────────────────────────────────────────┘
```

#### Use Case #2: SKU Profitability (Page 8)

```text
STORY BLOCK:
┌─────────────────────────────────────────────────────────────┐
│ 📖 TÌNH HUỐNG THỰC TẾ                                       │
│                                                              │
│ "Chị Lan, founder shop mỹ phẩm online, tháng vừa rồi       │
│  doanh thu 500 triệu nhưng cuối tháng hết tiền trả lương.  │
│  Kiểm tra mới biết: 3 combo khuyến mãi đang bán lỗ,        │
│  mỗi đơn mất 15k sau khi trừ COGS, ship, ads, return."     │
│                                                              │
│ → VỚI BLUECORE: Chị Lan thấy ngay 3 SKU CM âm ngay         │
│   khi vào dashboard, dừng bán ngay, tiết kiệm 80 triệu.    │
└─────────────────────────────────────────────────────────────┘
```

#### Use Case #3: AR Collection (Page 9)

```text
STORY BLOCK:
┌─────────────────────────────────────────────────────────────┐
│ 📖 TÌNH HUỐNG THỰC TẾ                                       │
│                                                              │
│ "Công ty thực phẩm của anh Hùng có AR 3 tỷ trên sổ.        │
│  Nhưng 800 triệu đã quá hạn 60 ngày, 1 khách hàng lớn      │
│  đang có dấu hiệu gặp khó khăn tài chính."                 │
│                                                              │
│ → VỚI BLUECORE: Anh Hùng có danh sách 5 khách cần gọi      │
│   ngay hôm nay, thu hồi được 320 triệu trước khi mất.      │
└─────────────────────────────────────────────────────────────┘
```

#### Use Case #4: Cash Runway (Page 10)

```text
STORY BLOCK:
┌─────────────────────────────────────────────────────────────┐
│ 📖 TÌNH HUỐNG THỰC TẾ                                       │
│                                                              │
│ "Startup của Tuấn đang burn 600 triệu/tháng. Cuối quý      │
│  mới biết cash sắp cạn, vội vàng đi gọi vốn nhưng đã       │
│  muộn — valuation bị ép vì thế yếu."                       │
│                                                              │
│ → VỚI BLUECORE: Tuấn biết trước 3 tháng runway sắp hết,    │
│   có thời gian chuẩn bị fundraising, đàm phán từ vị thế    │
│   mạnh hơn.                                                 │
└─────────────────────────────────────────────────────────────┘
```

**Thay đổi code**:
- Thêm style mới `storyBox`, `storyTitle`, `storyText`, `storyResult`
- Thêm story block vào mỗi Use Case page (sau subtitle, trước mockup)
- Cập nhật `useCaseAnswer` để ngắn gọn hơn (vì đã có story block)

---

### 3. Page 6: Slide So sánh với Lợi thế Cạnh tranh (Nâng cấp)

**Hiện tại**: Chỉ có bảng so sánh + 1 quote box

**Thêm mới**:

```text
┌─────────────────────────────────────────────────────────────┐
│ SAU BẢNG SO SÁNH:                                           │
│                                                              │
│ ❓ "TẠI SAO BLUECORE KHÁC BIỆT?" (Section mới)              │
│                                                              │
│ 3 COMPETITIVE ADVANTAGES:                                   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 🏆 #1: THIẾT KẾ CHO CEO/CFO, KHÔNG PHẢI IT             │  │
│ │ Excel/ERP phục vụ kế toán và IT. Bluecore phục vụ      │  │
│ │ người ra quyết định.                                    │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 🏆 #2: CASH THẬT, KHÔNG PHẢI SỐ SÁCH                   │  │
│ │ ERP cho bạn AR 3 tỷ. Bluecore cho bạn biết: 800 triệu  │  │
│ │ có nguy cơ mất, 500 triệu cần gọi hôm nay.             │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 🏆 #3: TRIỂN KHAI TRONG GIỜ, KHÔNG PHẢI THÁNG          │  │
│ │ ERP mất 3-6 tháng. BI mất 4-8 tuần training.           │  │
│ │ Bluecore: kết nối data → thấy giá trị trong 1 ngày.    │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ QUOTE BOX (update):                                         │
│ "Bluecore FDP không cạnh tranh với Excel hay ERP —         │
│  chúng tôi giải quyết vấn đề họ không thể giải quyết."     │
└─────────────────────────────────────────────────────────────┘
```

**Thay đổi code**:
- Thêm `competitiveAdvantages` data array (3 items)
- Thêm styles: `advantageCard`, `advantageNumber`, `advantageTitle`, `advantageDesc`
- Update quote box text để mạnh mẽ hơn
- Thêm section "Tại sao Bluecore khác biệt?" sau bảng so sánh

---

## Tóm tắt thay đổi code

| Vị trí | Thay đổi |
|--------|----------|
| Lines 870-892 (`solutionCards`) | Thêm `positioningStatement` và `threePillars` data |
| Lines 894-904 (`comparisonData`) | Thêm `competitiveAdvantages` data array |
| Lines 452-470 (styles) | Thêm styles mới: `storyBox`, `advantageCard`, `pillarCard` |
| Page 5 (lines 1029-1061) | Restructure với positioning statement + 3 pillars |
| Page 6 (lines 1063-1114) | Thêm "Tại sao Bluecore khác biệt?" section |
| Pages 7-10 (lines 1116-1426) | Thêm story block vào mỗi use case |

---

## File thay đổi

Chỉ 1 file:
- `src/components/sales-deck/FDPSalesDeckPDF.tsx`

---

## Kết quả mong đợi

1. **Page 5** có positioning statement rõ ràng: "Bluecore là gì và khác biệt ở đâu"
2. **Pages 7-10** có câu chuyện thực tế với tên người, con số cụ thể, kết quả rõ ràng
3. **Page 6** khẳng định mạnh mẽ 3 lợi thế cạnh tranh không thể chối cãi

Deck sau khi update sẽ trả lời được 3 câu hỏi quan trọng của khách hàng:
- "Bluecore là gì?" → Page 5
- "Tôi sẽ dùng Bluecore để làm gì hàng ngày?" → Pages 7-10
- "Tại sao Bluecore chứ không phải công cụ khác?" → Page 6

