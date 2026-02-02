

# Kế hoạch: Thêm FOMO Slide - "Category Is Forming"

## Mục tiêu

Thêm slide chiến lược để kích hoạt **FOMO của investor** theo nguyên tắc:
- **Không pitch**: "Invest in us"  
- **Mà nói**: "A new infrastructure layer is emerging. You can either be early... or pay 10x later."

---

## Vị trí Chèn

**Flow hiện tại:**
```
17: Initial Wedge (ICP)
18: SEA Market ($1B+ Wedge)
19: Expansion Unlocks (Multi-Billion)
20: Regional Expansion
21: Why Bluecore Wins
22: Inevitability Vision
23: Closing
```

**Flow mới (sau khi thêm FOMO slide):**
```
17: Initial Wedge (ICP)
18: SEA Market ($1B+ Wedge)
19: Expansion Unlocks (Multi-Billion)
20: FOMO SLIDE (NEW)               ← Đây
21: Regional Expansion
22: Why Bluecore Wins
23: Inevitability Vision
24: Closing
```

Lý do: Sau TAM, investor nghĩ "If this works... it's big."
Slide FOMO chuyển thành: "If we miss this... it's expensive."

---

## Nội dung Slide (EN)

### Title
```
The Financial Awareness Category Is Forming — With or Without You.
```

### TOP — One Sentence Thesis
```
Every commerce company is moving toward real-time financial awareness.
The only question is — which system becomes the default.
```

### CENTER — The Inevitability Stack (4 dòng, không bullet)
```
Decision speed is becoming a survival variable.
Financial signals are finally connectable.
Leadership behavior is shifting from reporting → awareness.
Trusted financial infrastructure compounds and rarely gets replaced.
```

### Category Formation Signals
```
• Companies already run daily decisions on Bluecore
• Financial truth is becoming operational infrastructure
• Replacement risk drops once embedded
• Regional expansion follows structural similarity
```

### THE WEAPON LINE (Bottom)
```
The next generation of enduring software companies
will not sell tools.

They will become infrastructure.

Bluecore is on that path.
```

### Optional Power Line (nếu đủ authority)
```
We believe Financial Awareness will become as standard as ERP.
```

---

## Layout Design

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   The Financial Awareness Category Is Forming                      │
│   — With or Without You.                           (Title - White) │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Every commerce company is moving toward                           │
│   real-time financial awareness.                                    │
│   The only question is — which system becomes the default.         │
│                                              (Thesis - slate-300)  │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Decision speed is becoming a survival variable.                   │
│   Financial signals are finally connectable.        (Inevitability │
│   Leadership: reporting → awareness.                    Stack -    │
│   Trusted financial infra compounds.                   slate-400)  │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│   Category Formation Signals                                        │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │ • Daily decisions on Bluecore                             │     │
│   │ • Truth = operational infrastructure                      │     │
│   │ • Replacement risk drops once embedded                    │     │
│   │ • Regional expansion follows structural similarity        │     │
│   └──────────────────────────────────────────────────────────┘     │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   The next generation of enduring software companies               │
│   will not sell tools.                               (Weapon Line  │
│   They will become infrastructure.                    - slate-500  │
│                                                       → white)     │
│   Bluecore is on that path.                          (blue-400)    │
│                                                                     │
│   ─────────────────────────────────────────────────────────        │
│   "Financial systems that reach trust rarely get displaced."       │
│                                              (Small italic footer) │
└────────────────────────────────────────────────────────────────────┘
```

---

## Chi tiết Kỹ thuật

### Slide Component Code

```tsx
// Slide 20 — FOMO: Category Is Forming
const Slide20CategoryForming: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight"
    >
      The Financial Awareness Category Is Forming
    </motion.h1>
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-2xl md:text-3xl font-bold text-slate-500 mb-10"
    >
      — With or Without You.
    </motion.h2>
    
    {/* Thesis */}
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="text-lg md:text-xl text-slate-300 max-w-3xl mb-8"
    >
      Every commerce company is moving toward real-time financial awareness.<br />
      <span className="text-white font-medium">The only question is — which system becomes the default.</span>
    </motion.p>
    
    {/* Inevitability Stack */}
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="max-w-2xl space-y-2 text-slate-400 text-base md:text-lg mb-8"
    >
      <p>Decision speed is becoming a survival variable.</p>
      <p>Financial signals are finally connectable.</p>
      <p>Leadership behavior is shifting from reporting → awareness.</p>
      <p>Trusted financial infrastructure compounds and rarely gets replaced.</p>
    </motion.div>
    
    {/* Category Signals */}
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 max-w-xl w-full mb-8"
    >
      <div className="text-slate-500 text-sm font-medium mb-3 text-left">Category Formation Signals</div>
      <div className="space-y-2 text-slate-300 text-sm text-left">
        <p>• Companies already run daily decisions on Bluecore</p>
        <p>• Financial truth is becoming operational infrastructure</p>
        <p>• Replacement risk drops once embedded</p>
        <p>• Regional expansion follows structural similarity</p>
      </div>
    </motion.div>
    
    {/* Weapon Line */}
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="max-w-2xl"
    >
      <p className="text-slate-500 text-base mb-2">
        The next generation of enduring software companies<br />
        will not sell tools.
      </p>
      <p className="text-white text-lg font-medium mb-4">
        They will become infrastructure.
      </p>
      <p className="text-blue-400 text-lg font-semibold">
        Bluecore is on that path.
      </p>
    </motion.div>
    
    {/* Trust Footer */}
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.3 }}
      className="mt-8 text-sm text-slate-600 italic"
    >
      Financial systems that reach trust rarely get displaced.
    </motion.p>
  </div>
);
```

### Presenter Notes

```typescript
20: {
  tip: "This is your FOMO slide. Speak with calm inevitability — not excitement. McKinsey tone, not startup.",
  action: "Pause after 'They will become infrastructure.' Let investor brain activate: 'If we miss this... it's expensive.'"
}
```

### Presenter Script

```
The Financial Awareness category is forming.

Every commerce company is moving toward real-time awareness.
The only question is... which system becomes the default.

Decision speed is becoming a survival variable.
Financial signals are finally connectable.
Leadership is shifting from reporting... to awareness.
Trusted financial infrastructure compounds.

And rarely gets replaced.

👉 Pause.

Look at investors.

The next generation of enduring software companies
will not sell tools.

They will become infrastructure.

👉 Lower voice.

Bluecore is on that path.

🔥 Stop. Let silence work.
```

---

## Files Cần Cập nhật

| File | Thay đổi |
|------|----------|
| `VCPitchDeck.tsx` | Thêm `Slide20CategoryForming`; Đổi tên slides 20-23 → 21-24; Update notes |
| `VCPitchDeckVI.tsx` | Thêm slide tương ứng (bản VI) |
| `presenterScripts.ts` | Thêm script cho slide 20 (EN + VI); Shift scripts 20-23 → 21-24 |

---

## Slides Array Mới (24 slides)

```typescript
const slides = [
  Slide01CategoryShock,           // 1
  Slide02SilentFailure,           // 2
  Slide03PlatformShift,           // 3
  Slide04Inevitability,           // 4
  Slide05DefineCategory,          // 5
  Slide06ArchitectureMoat,        // 6
  Slide07DecisionDataset,         // 7
  Slide08WhyImpossibleBefore,     // 8
  Slide09WhyMandatory,            // 9
  Slide10ProductOneSentence,      // 10
  Slide11Velocity,                // 11
  Slide12CrossBorder,             // 12
  Slide13ProductReality,          // 13
  Slide14ArchitectureAdvantage,   // 14
  Slide15SwitchingCost,           // 15
  Slide16ArchitectureTravels,     // 16
  Slide17InitialWedge,            // 17
  Slide18SEAMarket,               // 18
  Slide19ExpansionUnlocks,        // 19
  Slide20CategoryForming,         // 20 ← NEW FOMO SLIDE
  Slide21RegionalExpansion,       // 21 (was 20)
  Slide22WhyBluecoreWins,         // 22 (was 21)
  Slide23InevitabilityVision,     // 23 (was 22)
  Slide24Closing                  // 24 (was 23)
];
```

---

## Kết quả Mong đợi

| Metric | Trước | Sau |
|--------|-------|-----|
| Số slides | 23 | 24 |
| FOMO trigger | Không có | Slide 20 kích hoạt "miss = expensive" |
| Narrative flow | Market → Expansion → Why We Win | Market → Expansion → **FOMO** → Why We Win |
| Investor psychology | "This could be big" | "If we miss this..." |

---

## Tone Quan trọng

Slide này phải có:

- **Calm inevitability** — Không excitement
- **McKinsey tone** — Structural observation, không pitch
- **No over-claim** — Không "category king", không "winner takes all"
- **Silence after weapon line** — Authority đến từ im lặng

Nguyên tắc: **Investor dịch trong đầu → "multi-decade company"**

