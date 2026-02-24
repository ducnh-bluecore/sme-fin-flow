

# Fix Clearance Hints: Them Toc Do Ban + Phat Hien "Giam Gia Vo Tac Dung"

## Van de

Logic hien tai chi xet clearability tuyet doi, khong xet:
1. **Toc do ban** (avg_days_to_clear) -- OFF 10% nhung mat 220 ngay moi clear thi vo nghia
2. **So sanh voi baseline** -- OFF 0% da clear 132 ngay, OFF 10% lai mat 220 ngay -> giam gia lam CHAM hon
3. **Hang "chet"** -- neu avg_days > 90 ngay o moi muc giam gia -> giam gia khong cuu duoc, can phuong an khac

## Data thuc te trong database

```text
Kenh       | OFF % | Days to Clear | Clearability | Units
-----------|-------|---------------|-------------|------
KiotViet   | 0%    | 132 ngay      | 31%         | 19,198
KiotViet   | 10%   | 220 ngay      | 20%         | 2,342  --> CHAM HON baseline!
KiotViet   | 50%   | 249 ngay      | 21%         | 170    --> margin chet + van cham
Shopee     | 0%    | null          | 12%         | 43
Shopee     | 30%   | null          | 42%         | 1,967  --> clearability tang nhung days null
TikTok     | 0%    | 251 ngay      | 21%         | 1,749
TikTok     | 10%   | 175 ngay      | 29%         | 10,558 --> NHANH HON baseline
Lazada     | 0%    | 287 ngay      | 20%         | 54     --> hang chet, giam gia khong cuu
```

## Giai phap

### 1. Interface ClearanceHint moi

```text
ClearanceHint {
  channel: string
  discountStep: number          // chi > 0
  clearability: number
  avgDaysToClear: number | null // MOI: toc do ban
  baselineClearability: number  // MOI: clearability tai OFF 0%
  baselineDays: number | null   // MOI: days to clear tai OFF 0%
  uplift: number                // MOI: clearability - baseline
  speedChange: number | null    // MOI: baseline_days - current_days (>0 = nhanh hon)
  unitsCleared: number
  verdict: 'effective' | 'marginal' | 'not_worth' | 'dead_stock'  // MOI: them dead_stock
}
```

### 2. Logic verdict moi (4 loai)

```text
1. dead_stock:
   - baseline avg_days >= 120 ngay (4 thang)
   - VA giam gia khong lam nhanh hon (speedChange <= 0 hoac days van > 90)
   -> "Hang chet -- giam gia khong cuu duoc, can transfer/liquidate"

2. not_worth:
   - discount >= 50% (margin chet)
   - HOAC uplift <= 0 (clearability khong tang)
   - HOAC speedChange < 0 (giam gia lam CHAM hon)

3. effective:
   - uplift > 5 diem
   - VA (speedChange > 0 HOAC speedChange = null nhung clearability tang manh)
   -> "Giam gia thuc su giup ban nhanh hon"

4. marginal:
   - uplift > 0 nhung nho, hoac speed khong doi nhieu
```

### 3. Output mau (tu data thuc)

```text
KHUYEN NGHI THOAT HANG

🟢 TikTok OFF 10% -> clearability +8 diem (21% -> 29%)
   Nhanh hon 76 ngay (251 -> 175 ngay) | 10,558 units da clear

🟢 Shopee OFF 30% -> clearability +30 diem (12% -> 42%)  
   1,967 units da clear

🔴 KiotViet -> giam gia lam CHAM hon (132 -> 220 ngay)
   Nen transfer hoac liquidate thay vi giam gia

⚫ Lazada -> hang ton 287 ngay, giam gia khong cuu duoc
   Can thanh ly hoac chuyen kho
```

### 4. Mau sac moi (4 verdicts)

```text
effective  -> 🟢 xanh la (text-emerald-500)
marginal   -> 🟡 vang (text-amber-500)
not_worth  -> 🔴 do (text-destructive)
dead_stock -> ⚫ xam dam (text-muted-foreground) -- nhan manh "khong phai van de giam gia"
```

### 5. Chon top hints

1. Moi kenh: chon discount_step co uplift + speedChange tot nhat
2. Loai bo discount_step = 0 (khong phai thoat hang)
3. Them cac kenh "dead_stock" hoac "not_worth" (de canh bao)
4. Sort: effective truoc, roi dead_stock (canh bao), roi marginal
5. Toi da 4 hints (2 effective + 2 canh bao)

## Thay doi ky thuat

### File 1: `src/hooks/command/useWarRoomClearanceHint.ts`

- Tinh baseline (OFF 0%) cho moi kenh: `baselineClearability` + `baselineDays`
- Chi xet discount_step > 0 cho hints
- Tinh `uplift`, `speedChange`
- Verdict logic 4 cap: dead_stock / not_worth / effective / marginal
- Sort va chon top hints thong minh hon

### File 2: `src/components/command/WarRoom/PriorityCard.tsx`

- Cap nhat VERDICT_STYLE them `dead_stock` (icon ⚫, text-muted-foreground)
- Viet lai `hintLabel()` hien thi:
  - effective: "+X diem, nhanh hon Y ngay"
  - not_worth: "giam gia lam CHAM hon / khong giup gi"
  - dead_stock: "hang ton X ngay, can thanh ly"
- Them dong canh bao khi co dead_stock: "Nen transfer hoac liquidate"

## Khong thay doi

- Database / RPC: giu nguyen (avg_days_to_clear da co san trong sem_markdown_ladders)
- WarRoomPage.tsx: giu nguyen
- Cac file khac: giu nguyen

