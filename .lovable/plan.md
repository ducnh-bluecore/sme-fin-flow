

# Kế hoạch: Thêm Script Panel cho VC Pitch Deck

## Tình trạng Hiện tại
- Đã có **Presenter Notes panel** (phím tắt N) với 2 mục: "Founder Tip" + "Action"
- Panel này ở bên phải slide, width 320px
- Nội dung ngắn gọn (2-3 dòng mỗi mục)

---

## 2 Phương án Đề xuất

### Phương án A: Mở rộng Panel hiện có (Đề xuất ✅)
Thêm mục **"Script"** vào panel Presenter Notes hiện tại, hiển thị đầy đủ script cho từng slide.

**Ưu điểm:**
- Giữ nguyên UX hiện tại
- Không làm thay đổi layout slide
- Toggle bằng phím N như cũ
- Scrollable cho script dài

**Cấu trúc panel mới:**
```
┌─────────────────────────────────┐
│ Presenter Notes            [X] │
├─────────────────────────────────┤
│ 📜 SCRIPT                       │
│ "Cash rarely collapses in a    │
│ dramatic moment. It erodes     │
│ quietly — inside operations..."│
│ (scrollable)                    │
├─────────────────────────────────┤
│ 💡 Founder Tip                  │
│ "Partner cảm thấy DANGER..."   │
├─────────────────────────────────┤
│ ⚡ Action                       │
│ "Đợi phản ứng. Pause 1.5s."    │
└─────────────────────────────────┘
```

---

### Phương án B: Split View (Alternative)
Chia màn hình 70/30 khi bật presenter mode - slide bên trái, script bên phải.

**Ưu điểm:**
- Nhìn thấy cả slide lẫn script cùng lúc
- Tiện khi present

**Nhược điểm:**
- Thu nhỏ slide khi hiển thị script
- Phức tạp hơn về responsive

---

## Đề xuất: Phương án A (Mở rộng Panel)

### Thay đổi Chi tiết

**1. Thêm data script cho 23 slides (Vietnamese + English)**

Tạo object mới `presenterScripts` với full script cho từng slide:

```typescript
const presenterScripts: Record<number, string> = {
  1: `Cash rarely collapses in a dramatic moment.
It erodes quietly — inside operations.

Margin slips a few points.
Customer acquisition costs spike.
Inventory expands faster than liquidity.

By the time it shows up in financial statements —
the damage is already structural.

And in most companies…
the CEO is the last to know.

👉 Pause 1.5s

Bluecore exists to make sure leadership never discovers financial risk too late again.`,
  
  2: `Over the past decade, companies invested heavily in data infrastructure.

Today — having dashboards is normal.

But dashboards describe the past.

What leadership actually needs…
is awareness of financial risk while it is forming.

Because the company with the most data will not win.

The company with the earliest awareness will.

👉 Look at investors.
Do not rush this line.`,
  
  // ... tương tự cho 23 slides
};
```

**2. Cập nhật Presenter Notes Panel**

Mở rộng width panel từ 320px → 400px và thêm section Script:

```tsx
{/* Script Section */}
<div className="mb-6">
  <div className="text-amber-400 text-sm font-medium mb-2 flex items-center gap-2">
    <span>📜</span> Script
  </div>
  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line max-h-64 overflow-y-auto pr-2">
    {presenterScripts[currentSlide + 1]}
  </div>
</div>

{/* Existing: Founder Tip */}
{/* Existing: Action */}
```

**3. Files cần cập nhật**

| File | Thay đổi |
|------|----------|
| `VCPitchDeck.tsx` | Thêm `presenterScripts` EN, cập nhật panel |
| `VCPitchDeckVI.tsx` | Thêm `presenterScripts` VI, cập nhật panel |

---

## Chi tiết Kỹ thuật

### Data Structure

```typescript
// presenterScripts cho English
const presenterScripts: Record<number, string> = {
  1: `Cash rarely collapses...`,
  2: `Over the past decade...`,
  // ... 22 slides
};

// presenterNotes giữ nguyên
const presenterNotes: Record<number, { tip: string; action: string }> = {
  1: { tip: "...", action: "..." },
  // ...
};
```

### Panel UI Update

- Width: 320px → 400px
- Script section: với `whitespace-pre-line` để giữ line breaks
- Max height cho script: 256px với scroll
- Thứ tự: Script → Tip → Action (quan trọng nhất lên trên)

### Highlight Instructions trong Script

Các dòng bắt đầu bằng `👉` hoặc `🔥` hoặc `⚠️` sẽ được highlight màu khác (amber) để dễ nhận biết.

---

## Kết quả Mong đợi

| Trước | Sau |
|-------|-----|
| Panel chỉ có Tip + Action (ngắn) | Panel có Script + Tip + Action (đầy đủ) |
| Presenter phải nhớ script | Presenter đọc được script ngay |
| Width 320px | Width 400px |

---

## Lưu ý

- Script EN và VI sẽ khác nhau (EN cho `/investor/vc-pitch`, VI cho `/investor/vc-pitch-vi`)
- Script bạn cung cấp là bản EN — cần dịch sang VI cho version tiếng Việt
- Có thể thêm toggle riêng cho Script nếu muốn ẩn/hiện độc lập

