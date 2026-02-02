
# Kế hoạch: Đồng bộ EN với VI (Dịch từ VI sang EN)

## Phạm vi Công việc

Cập nhật bản **English** (`VCPitchDeck.tsx`) để khớp hoàn toàn với bản **Vietnamese** (`VCPitchDeckVI.tsx`) đã được tối ưu - chỉ dịch nội dung, giữ nguyên cấu trúc.

---

## Thay đổi Chính

### 1. Slide 2 — Thay đổi hoàn toàn messaging
**Từ (EN cũ):**
```
"Companies Rarely Fail from Lack of Data."
"They Fail from Delayed Financial Truth."
+ Recording/Reporting/Analyzing tags
```

**Sang (dịch từ VI):**
```
"Data infrastructure has become standard."
"Financial Awareness will be the next default infrastructure."

"Data tells the past.
Financial Awareness tells you if you're safe — right now."

"Not the company with the most data will win.
But the company with the earliest awareness."
```

### 2. Slide 3 — Thay đổi format
**Từ (EN cũ):**
```
ERP → BI → Bluecore (horizontal boxes)
"A new execution layer is emerging"
```

**Sang (dịch từ VI):**
```
"Systems of Record — record the past."
"Systems of Intelligence — explain the past."  
"Systems of Awareness — decide what happens next."

"Bluecore is building the Awareness Layer."

Quote: "Operating without financial awareness
will soon feel as risky as operating without accounting."
```

### 3. Slide 7 — Thêm Flywheel Visual
**Từ (EN cũ):** Grid format với 4 bullets

**Sang (dịch từ VI):** Flywheel visual với 6 bước:
- More customers → More financial patterns → Better risk detection → Better decisions → Deeper trust → Harder to replace → (loop back)

### 4. Thứ tự Slides — Đổi theo VI

| Slot | VI Content | EN Content Mới |
|------|------------|----------------|
| 12 | Cross-Border (moved up) | Cross-Border (moved up) |
| 13 | **Product Reality** (NEW) | **Product Reality** (ADD) |
| 14 | Architecture Advantage | Architecture Advantage |
| 15 | Switching Cost | Switching Cost |
| 16 | Architecture Travels | Architecture Travels |

### 5. Thêm Slide 13 — Product Reality (MISSING)
Thêm slide mới với example thực tế:
```
"THIS IS WHAT A DECISION LOOKS LIKE"

⚠ CASH RISK DETECTED
- Sell-through: ↓ 23%
- Inventory turn: ↓ 18%  
- Payment terms: Extended

→ Recommendation: Slow down purchase orders
→ Preserve $480K in liquidity

"One real example = 100 concept slides."
```

### 6. Cập nhật Presenter Notes (EN)
Đồng bộ với VI — hiện tại EN có 22 notes, cần thêm note cho slide 13 và điều chỉnh các slide khác.

### 7. Cập nhật slides array
```typescript
const slides = [
  Slide01CategoryShock,           // 1
  Slide02SilentFailure,           // 2 - UPDATED messaging
  Slide03PlatformShift,           // 3 - UPDATED format
  Slide04Inevitability,           // 4
  Slide05DefineCategory,          // 5
  Slide06ArchitectureMoat,        // 6
  Slide07DecisionDataset,         // 7 - UPDATED Flywheel
  Slide08WhyImpossibleBefore,     // 8
  Slide09WhyMandatory,            // 9
  Slide10ProductOneSentence,      // 10
  Slide11Velocity,                // 11
  Slide12CrossBorder,             // 12 - MOVED UP
  Slide13ProductReality,          // 13 - NEW
  Slide14ArchitectureAdvantage,   // 14
  Slide15SwitchingCost,           // 15
  Slide16ArchitectureTravels,     // 16
  Slide17InitialWedge,            // 17
  Slide18SEAMarket,               // 18
  Slide19ExpansionUnlocks,        // 19
  Slide20RegionalExpansion,       // 20
  Slide21WhyBluecoreWins,         // 21
  Slide22InevitabilityVision,     // 22
  Slide23Closing                  // 23
];
```

---

## Files Cần Cập nhật

| File | Thay đổi |
|------|----------|
| `src/pages/investor/VCPitchDeck.tsx` | Cập nhật slides 2, 3, 7; Thêm slide 13; Đổi thứ tự; Update notes |
| `src/data/presenterScripts.ts` | Cập nhật `presenterScriptsEN` để khớp với 23 slides mới |

---

## Chi tiết Kỹ thuật

### Slide02SilentFailure — Code mới
```tsx
const Slide02SilentFailure: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
    >
      Data infrastructure has become standard.
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="text-3xl md:text-4xl lg:text-5xl font-bold text-blue-400 mb-10"
    >
      Financial Awareness will be the next default infrastructure.
    </motion.h2>
    
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="max-w-3xl space-y-8"
    >
      <p className="text-xl md:text-2xl text-slate-400 leading-relaxed">
        Data tells the past.<br />
        <span className="text-white font-medium">Financial Awareness tells you if you're safe — right now.</span>
      </p>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-xl md:text-2xl text-slate-500 pt-6 border-t border-slate-700/50"
      >
        Not the company with the most data will win.<br />
        <span className="text-amber-400 font-semibold">But the company with the earliest awareness.</span>
      </motion.p>
    </motion.div>
  </div>
);
```

### Slide13ProductReality — Code mới (THÊM)
```tsx
const Slide13ProductReality: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl md:text-5xl font-bold text-white mb-4"
    >
      THIS IS WHAT A <span className="text-blue-400">DECISION LOOKS LIKE</span>
    </motion.h1>
    
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4 }}
      className="p-8 rounded-xl bg-slate-800/80 border border-red-500/50 max-w-2xl w-full"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-red-400 text-xl font-bold mb-6 flex items-center gap-2"
      >
        <span className="text-2xl">⚠</span> CASH RISK DETECTED
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        <div className="p-4 rounded-lg bg-slate-900/50">
          <div className="text-slate-400 text-sm mb-1">Sell-through</div>
          <div className="text-red-400 text-2xl font-bold">↓ 23%</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-900/50">
          <div className="text-slate-400 text-sm mb-1">Inventory turn</div>
          <div className="text-red-400 text-2xl font-bold">↓ 18%</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-900/50">
          <div className="text-slate-400 text-sm mb-1">Payment terms</div>
          <div className="text-amber-400 text-2xl font-bold">Extended</div>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="border-t border-slate-700 pt-6"
      >
        <div className="text-slate-400 text-lg mb-2">→ Recommendation: Slow down purchase orders</div>
        <div className="text-emerald-400 text-3xl font-bold">→ Preserve $480K in liquidity</div>
      </motion.div>
    </motion.div>
    
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.3 }}
      className="mt-8 text-lg text-slate-500 italic"
    >
      One real example = 100 concept slides.
    </motion.p>
  </div>
);
```

---

## Kết quả Mong đợi

| Trước | Sau |
|-------|-----|
| EN có 22 slides | EN có 23 slides (khớp VI) |
| Slide 2 messaging khác | Slide 2 messaging giống VI |
| Slide 3 format khác | Slide 3 format giống VI |
| Slide 7 không có flywheel | Slide 7 có flywheel visual |
| Thiếu Product Reality slide | Có Product Reality slide ($480K example) |
| Thứ tự slides khác | Thứ tự slides khớp VI |

---

## Ước tính

- **Độ phức tạp**: Trung bình (nhiều thay đổi nhưng chủ yếu là dịch)
- **Thời gian**: ~15-20 phút
- **Rủi ro**: Thấp (copy structure từ VI, chỉ dịch text)
