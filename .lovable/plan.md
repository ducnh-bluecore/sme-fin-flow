

# War Room: Them Markdown Ladder Insight vao Priority Card

## Muc tieu

Khi card hien thi "Ro bien do markdown risk", them 1 section nho cho thay:
- OFF bao nhieu % thi clear nhanh nhat (kenh nao)?
- OFF bao nhieu % thi margin chet?
- Kha nang clear hang (clearability score) o tung muc giam gia

## Data co san

Bang `sem_markdown_ladders` da co du lieu thuc te:

| Kenh | OFF % | Units Cleared | Clearability |
|------|-------|---------------|-------------|
| Shopee | 30% | 1,967 | 42% |
| KiotViet | 0% | 19,198 | 31% |
| TikTok | 10% | 10,558 | 29% |

RPC `fn_markdown_ladder_summary` da ton tai va duoc su dung boi `useMarkdownLadder()`.

## Thay doi cu the

### 1. Hook moi: `src/hooks/command/useWarRoomClearanceHint.ts`

Hook gon nhe chi lay top 3 "clearance path" tot nhat tu markdown ladder data (khong can fc_id cu the -- lay aggregate toan bo).

```
interface ClearanceHint {
  channel: string       // "shopee", "tiktok", "kiotviet"  
  discountStep: number  // 0, 10, 20, 30, 50
  clearability: number  // 0-100
  unitsCleared: number
  verdict: 'fast_clear' | 'margin_dead' | 'balanced'
}
```

Logic:
- Goi `fn_markdown_ladder_summary` (khong truyen fc_id -> lay tat ca)
- Group theo channel + discount_step
- Tinh verdict: clearability >= 40 = `fast_clear`, discount >= 50 = `margin_dead`, con lai = `balanced`
- Tra ve top 3 hints sap xep theo clearability DESC

### 2. Update `PriorityCard.tsx` -- Them section "Clearance Hint"

Chi hien thi khi `priority.type === 'markdown_risk'` (hoac type lien quan den clearance).

Layout moi ben duoi section "Thiet hai thuc te":

```
📊 KHUYẾN NGHỊ THOÁT HÀNG
   🟢 Shopee OFF 30% → clearability 42% (1,967 units da clear)
   🟡 TikTok OFF 10% → clearability 29% (10,558 units)
   🔴 OFF 50% → margin chết (clearability thấp, không đáng)
```

Mau sac:
- `fast_clear` (clearability >= 35): xanh la (text-emerald-500)
- `balanced` (20-35): vang (text-amber-500)
- `margin_dead` (discount >= 50 va clearability thap): do (text-destructive)

### 3. Update `WarRoomPage.tsx` -- Truyen clearance hints xuong

Goi `useWarRoomClearanceHint()` o page level va truyen xuong PriorityCard qua prop.

## Files thay doi

1. **Tao moi**: `src/hooks/command/useWarRoomClearanceHint.ts`
2. **Sua**: `src/components/command/WarRoom/PriorityCard.tsx` -- them section clearance hint
3. **Sua**: `src/pages/command/WarRoomPage.tsx` -- goi hook va truyen prop

## Khong thay doi

- Database: khong can migration (dung RPC da co)
- Cac man hinh/hook khac: giu nguyen
- Logic priority scoring: giu nguyen

