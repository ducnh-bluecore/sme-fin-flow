
## Mục tiêu
1) Sửa triệt để vấn đề “tiếng Việt không dấu” trong PDF (nguyên nhân hiện tại là nội dung text trong code đang được viết **không dấu**, không phải do font tự mất dấu).
2) Nâng cấp layout để sales deck “đáng gửi cho người khác đọc”: đa nền, có nhịp kể chuyện, ít chữ nhưng sắc, nhìn giống deck thật (không phải trang báo cáo).

---

## Chẩn đoán nhanh (từ code hiện tại)
Trong `src/components/sales-deck/FDPSalesDeckPDF.tsx`:
- Font đã register `NotoSans` bằng absolute URL (đúng hướng).
- Nhưng **toàn bộ copy tiếng Việt trong `manifestoItems`, `whyBluecoreItems`… đang viết kiểu không dấu** (ví dụ: “Du lieu phan tan”, “KHONG PHAI PHAN MEM KE TOAN”…).  
=> PDF in ra đúng y như vậy: “không dấu” là do text nguồn.

Ngoài ra, deck “chưa hấp dẫn” vì:
- Nhiều slide đang cùng một mood nền + ít “structure” (headline → subhead → key blocks → proof/CTA).
- Thiếu 2 slide “Why Bluecore” + “So sánh đối thủ” theo đúng narrative sales.

---

## Phạm vi thay đổi (code)
Chỉ sửa 1 file:
- `src/components/sales-deck/FDPSalesDeckPDF.tsx`

Không đụng database/backend.

---

## Kế hoạch sửa lỗi tiếng Việt (có dấu)
### 1) Thay toàn bộ nội dung tiếng Việt “không dấu” bằng bản “có dấu”
- Cập nhật các mảng content:
  - `manifestoItems`
  - `whyBluecoreItems`
  - Bất kỳ text copy khác đang dùng tiếng Việt không dấu (title, subtitle, bullets, CTA, mô tả…)
- Ưu tiên dùng đúng wording từ “FDP Manifesto” bạn đã cung cấp (có dấu) để đảm bảo tính “chuẩn” và đọc tự nhiên.

### 2) Chuẩn hoá typography để hạn chế lỗi hiển thị dấu
- Đảm bảo mọi style text dùng `fontFamily: 'NotoSans'` (đã có ở `page`, `pageAlt`, `coverPage`, nhưng sẽ rà lại các style con).
- Đảm bảo `fontWeight` chỉ dùng 400/700 (đúng với fonts đã register). Nếu có 500/600 sẽ map về 400/700 để tránh fallback font.
- Dọn các chỗ dùng ALL CAPS tiếng Việt (in hoa có dấu đôi khi nhìn xấu/khó đọc). Chuyển sang Title Case + nhấn mạnh bằng weight/color thay vì viết hoa toàn bộ.

### 3) Kiểm tra “font file có đủ glyph tiếng Việt” (điểm dự phòng)
Nếu sau khi đổi text sang có dấu mà vẫn lỗi (hiển thị ô vuông/ký tự lạ):
- Xác minh `public/fonts/NotoSans-Regular.ttf` và `NotoSans-Bold.ttf` hiện tại có hỗ trợ Vietnamese glyph hay không.
- Nếu không đủ glyph: thay bằng bộ Noto Sans bản đầy đủ hỗ trợ Vietnamese (vẫn host local trong `public/fonts/`), giữ nguyên cơ chế absolute URL.

---

## Kế hoạch nâng cấp nội dung (sales narrative)
### Slide order đề xuất (9 slides như plan đã duyệt)
1) Cover (dark, ornaments, tagline “Truth > Flexibility”)
2) Tại sao cần Bluecore? (Pain → Consequence → Bluecore Fix)
3) So sánh với đối thủ (Excel / ERP / BI / Bluecore FDP)
4) FDP Manifesto (10 nguyên tắc, bản có dấu, layout gọn)
5) Core Capabilities (4–6 capability cards)
6) Chức năng chi tiết (group theo: Revenue/Cost/Cash/Unit economics)
7) Quy trình quyết định (Decision flow: Today’s Decision)
8) Đo lường kết quả (Before/After, Outcome loop)
9) Contact/CTA (kết thúc rõ ràng, 1 hành động)

### Nội dung 2 slide mới
- “Tại sao cần Bluecore?”: dùng bảng 2 cột Pain/Solution + thêm 1 dòng “Cost of doing nothing” (mất tiền, mất cash, ra quyết định trễ).
- “So sánh đối thủ”: bảng so sánh có highlight cột Bluecore; copy ngắn, không tranh luận kỹ thuật, tập trung CEO/CFO.

---

## Kế hoạch nâng cấp design (đỡ đơn điệu, nhìn “deck” hơn)
### 1) Varied backgrounds theo loại slide
- Cover + CTA: dark + ornaments.
- “Why Bluecore”: nền sáng gradient nhẹ + accent bar bên trái.
- “Comparison”: nền trắng + table clean, row striping, highlight Bluecore column.
- Manifesto: nền sáng + card grid (2 cột) + numbering rõ.
- Capabilities: xen kẽ card background (background/backgroundAlt) + badge chữ (A/B/C/D…).

### 2) Tạo “visual hierarchy”
- Mỗi slide có:
  - Eyebrow label nhỏ (ví dụ: “Problem”, “Solution”, “Proof”)
  - Headline 1 câu
  - Subhead 1 câu
  - Content blocks (tối đa 4–6 blocks)
- Giảm chữ dài, tăng spacing, tăng nhấn bằng color/weight.

### 3) Chuẩn hoá component nội bộ (trong file PDF)
Trong `FDPSalesDeckPDF.tsx` sẽ tạo/chuẩn hoá các “helper blocks” (không tạo file mới):
- `SlideHeader` (label + title + subtitle)
- `BadgeCircle` (01/02/03… hoặc A/B/C…)
- `ComparisonTable` (header row, zebra rows, highlight col)

---

## Tiêu chí nghiệm thu (bạn test nhanh)
1) Download PDF ở “Sales Deck Library” và đọc thử:
- Tất cả chữ tiếng Việt **có dấu**: “tài chính”, “Nền tảng”, “Quyết định”, “đối thủ”, “cần”…
2) Không còn ký tự lỗi/ô vuông.
3) Deck nhìn đa dạng: ít nhất 3 kiểu nền/section khác nhau (cover dark, why gradient, comparison table clean).
4) Người ngoài đọc hiểu “Why Bluecore” + “So sánh” trong 30–60 giây.

---

## Rủi ro/edge cases
- Nếu font file hiện tại không chứa đầy đủ glyph Vietnamese: vẫn có thể lỗi dù text đã có dấu → sẽ thay font TTF bản đầy đủ (local) và giữ absolute URL.
- Nếu có chỗ vô tình còn “không dấu” (copy cũ): sẽ search toàn file các từ khóa không dấu phổ biến (“khong”, “du”, “can”, “doi thu”…) để đảm bảo clean.

---

## Việc cần bạn xác nhận (không bắt buộc nhưng giúp chuẩn hơn)
- Bạn muốn deck dùng giọng văn nào?
  - (A) Formal CEO/CFO (ngắn, chắc, ít mỹ từ)
  - (B) Sales mạnh (đau–giải pháp–kêu gọi hành động rõ, hơi “đập” hơn)
Nếu bạn không chọn, mình sẽ mặc định (A) vì phù hợp “Truth > Flexibility” và gửi cho người khác đọc.
