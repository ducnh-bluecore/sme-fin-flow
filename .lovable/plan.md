

# Chỉnh sửa Slide 01 — From Descriptive to Lethal

## Vấn đề Hiện tại
Slide 01 đang viết theo tone mô tả:
```
Margin ↓ 6% → Phát hiện sau 4 tuần
CAC ↑ 35% → Finance thấy khi đã burn
Inventory phình → Cash bị khóa
Runway → Biến mất trước khi CEO nhận ra
```

Và closing statement emotional:
```
"Doanh nghiệp không chết vì thiếu dữ liệu.
Họ chết vì sự thật đến quá muộn."
```

## Nguyên tắc
**Founder junior cố chứng minh. Founder senior tuyên bố.**
Infrastructure companies state reality — không storytelling, không emotional.

---

## Thay đổi 1: Metrics Boxes → Lethal Format

| Hiện tại (Descriptive) | Mới (Lethal) |
|------------------------|--------------|
| Margin ↓ 6% → Phát hiện sau 4 tuần | Margin erodes 6%. Detected week 4. |
| CAC ↑ 35% → Finance thấy khi đã burn | CAC spikes 35%. Visible after burn. |
| Inventory phình → Cash bị khóa | Inventory expands. Liquidity disappears. |
| Runway → Biến mất trước khi CEO nhận ra | Runway shrinks. CEO sees it last. |

**Tone:** Cold. Clinical. Almost medical.
**Xóa:** Emoji icons (📉🔥📦⏳) — không cần.

---

## Thay đổi 2: Closing Statement → State Reality

**Option A (Tốt nhất - Xóa hoàn toàn):**
Không cần closing. Headline đã đủ mạnh.

**Option B (Clinical alternative nếu giữ):**
```
Financial blindness is not a gap.
It's a countdown.
```

**Lựa chọn:** Option A — xóa closing box hoàn toàn.

---

## Files Cần Cập nhật

| File | Thay đổi |
|------|----------|
| `VCPitchDeckVI.tsx` | Slide 01 metrics + xóa closing |
| `VCPitchDeck.tsx` | Sync English version |
| `VCPitchDeckPDF_VI.tsx` | Sync PDF Vietnamese |
| `VCPitchDeckPDF.tsx` | Sync PDF English |

---

## Code Mới — Slide 01

```tsx
const Slide01CategoryShock: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-10 leading-tight"
    >
      CASH COLLAPSES<br />
      <span className="text-red-500">QUIETLY.</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full"
    >
      {[
        { metric: "Margin erodes 6%.", consequence: "Detected week 4." },
        { metric: "CAC spikes 35%.", consequence: "Visible after burn." },
        { metric: "Inventory expands.", consequence: "Liquidity disappears." },
        { metric: "Runway shrinks.", consequence: "CEO sees it last." }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.15 }}
          className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-left"
        >
          <span className="text-red-400 font-bold text-lg block">{item.metric}</span>
          <span className="text-slate-500 text-sm">{item.consequence}</span>
        </motion.div>
      ))}
    </motion.div>
    
    {/* Không còn closing statement — headline đã đủ mạnh */}
  </div>
);
```

---

## Kết quả Mong đợi

| Metric | Trước | Sau |
|--------|-------|-----|
| Tone | Descriptive, emotional | Clinical, lethal |
| Emoji | Có | Xóa |
| Closing | 2 dòng storytelling | Xóa hoàn toàn |
| Power level | 7/10 | 9/10 |

**Result:** Founder senior energy. Infrastructure companies state reality.

