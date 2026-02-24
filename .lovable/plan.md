

# WAR ROOM V2: Group by Problem, Not by Product

## Van de hien tai

1. **Hien thi tung san pham** -- co 540+ SP bi ro bien, 176 SP bi khoa von. Khong ai fix tung cai duoc.
2. **WHY NOW chi noi "X ngay"** -- khong giai thich TAI SAO mat tien (slow_moving? broken_size? markdown_risk?)
3. **Dong "Mat Xtr"** -- khong noi ro tien mat vi dau (von bi khoa? doanh thu mat? ro bien?)

## Giai phap: Group by Driver

Thay vi 7 card = 7 san pham, chuyen thanh 7 card = 7 VAN DE (nhom theo driver).

Data thuc te trong database:

| Van de | Driver | So SP | Tong thiet hai |
|--------|--------|-------|----------------|
| Ro bien do markdown risk | markdown_risk | 540 | 17.2ty |
| Von khoa do ban cham | slow_moving | 176 | 2.7ty |
| Von khoa do lech size | broken_size | 131 | 377tr |
| Doanh thu mat do thieu size core | core_missing | 10 | 18tr |
| Ro bien do size break | size_break | 23 | 10tr |
| Doanh thu mat do shallow depth | shallow | 12 | 7tr |

## Thay doi cu the

### 1. Hook `useWarRoomPriorities.ts` -- Doi logic aggregate

**Truoc:** Group by product_id, tinh damage per product, top 7 products.

**Sau:** Group by driver (lock_driver / leak_driver / driver / reason), tinh:
- `productCount`: so SP bi anh huong
- `totalDamage`: tong thiet hai cua nhom
- `topProducts`: 3 SP bi nang nhat trong nhom (de hien thi vi du)
- `driver`: ten driver goc tu database
- `driverLabel`: ten tieng Viet cho driver
- `whyExplanation`: giai thich tai sao van de nay xay ra

Interface moi:

```text
WarRoomPriority {
  id: string (driver key)
  rank: number
  type: 'size_break' | 'markdown_risk' | 'cash_lock' | 'margin_leak' | 'lost_revenue'
  driver: string                    // MOI: lock_driver / leak_driver / driver
  driverLabel: string               // MOI: "Ban cham" / "Lech size" / "Markdown risk"
  whyExplanation: string            // MOI: "540 SP ton kho lau, velocity = 0..."
  productCount: number              // MOI: so SP bi anh huong
  topProducts: { name, damage }[]   // MOI: 3 SP nang nhat
  totalDamage: number               // = financialDamage
  damageBreakdown: {                // MOI: phan ra ro rang
    lostRevenue: number
    cashLocked: number
    marginLeak: number
  }
  markdownEtaDays: number | null    // min eta trong nhom
  timePressureLabel: string
  urgency: 'critical' | 'urgent' | 'warning'
  actionPath: string
  actionLabel: string
}
```

Driver-to-label mapping:

```text
slow_moving     -> "Hàng bán chậm"
broken_size     -> "Cơ cấu size lệch"
markdown_risk   -> "Rủi ro phải markdown"
core_missing    -> "Thiếu size core"
shallow         -> "Tồn kho nông (ít depth)"
size_break      -> "Size break"
imbalance       -> "Mất cân bằng phân bổ"
zero_velocity   -> "Không bán được"
high_age + slow_velocity -> "Tồn lâu + bán chậm"
```

WHY explanation logic (tu dong sinh tu data):

```text
Driver: slow_moving
-> "176 SP đang bán chậm, vốn bị kẹt trong tồn kho không xoay được. 
    Nếu tiếp tục, sẽ phải markdown để giải phóng."

Driver: markdown_risk  
-> "540 SP có nguy cơ phải giảm giá do tồn kho lâu và velocity thấp.
    Mỗi ngày chậm = biên lợi nhuận giảm thêm."

Driver: broken_size
-> "131 SP có cơ cấu size lệch chuẩn — thừa size ế, thiếu size bán chạy.
    Vốn bị khóa trong các size không ai mua."
```

### 2. Component `PriorityCard.tsx` -- Doi layout

**Truoc:**
```text
#1 SIZE BREAK -- [Ten 1 SP]           [URGENT]
   Mat 120tr
   WHY NOW: 7 ngay truoc markdown risk
   [Xem Chi Tiet ->]
```

**Sau:**
```text
#1 VON KHOA -- Hang ban cham                    [KHAN CAP]
   176 san pham | Tong thiet hai: 2.7ty

   TAI SAO MAT TIEN:
   Von bi ket: 2.7ty (hang ton kho khong xoay duoc)

   TAI SAO CAN XU LY NGAY:
   Neu khong transfer/clearance, se phai markdown giam gia.
   SP nang nhat: FC Dress SS25 (320tr), FC Polo Basic (280tr)...

   [Xem 176 SP ->]
```

Thay doi chinh trong card:
- Header: hien thi **driver label** thay vi ten 1 SP, kem so luong SP
- Dong 1 "TAI SAO MAT TIEN": phan ra ro `Von bi ket: Xty` / `Doanh thu mat: Xtr` / `Ro bien: Xtr` -- chi hien thanh phan > 0
- Dong 2 "TAI SAO CAN XU LY NGAY": `whyExplanation` -- giai thich nguyen nhan + hau qua
- Dong 3: Top 3 SP nang nhat (vi du cu the de retailer biet bat dau tu dau)
- Action button: "Xem 176 SP" thay vi "Xem Size Health"

### 3. Trang `WarRoomPage.tsx` -- Khong doi nhieu

- Giu nguyen layout 3 section (Win Scoreboard / Priorities / Quick Actions)
- Chi thay doi: title section "Today's Priorities" them subtitle "Nhom theo nguyen nhan, khong phai tung san pham"

## Files thay doi

1. **`src/hooks/command/useWarRoomPriorities.ts`** -- Viet lai logic aggregate: group by driver thay vi product_id
2. **`src/components/command/WarRoom/PriorityCard.tsx`** -- Doi layout card theo format moi
3. **`src/pages/command/WarRoomPage.tsx`** -- Sua nho subtitle

## Khong thay doi

- Database: khong can migration
- Cac man hinh khac: giu nguyen 100%
- WinScoreboard: giu nguyen
- Quick Actions: giu nguyen
- Sidebar/routes: giu nguyen

