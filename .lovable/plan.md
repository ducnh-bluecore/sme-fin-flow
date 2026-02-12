

## Hiển thị rõ mục đích điều chuyển ngay trên mỗi dòng

### Van de
Cot "Reason" hien chi hien text ky thuat bi cat ngan (vd: "stockout + same_region + core_..."). Nguoi van hanh khong biet NGAY dong nay la de xu ly le size hay de bo sung stockout — phai click expand moi ro.

### Giai phap
Thay cot "Reason" text bang **Purpose Badge** mau sac ro rang, hien thi ngay tren row (khong can expand):

- **Le size** (badge tim) — khi reason chua `broken_size` hoac `core_size`
- **Het hang** (badge do) — khi reason chua `stockout`
- **Can bang** (badge xanh) — khi reason chua `excess_source` hoac `low_stock`
- **Toc do ban** (badge cam) — khi reason chua `high_velocity`

Logic uu tien: chon tag quan trong nhat lam badge chinh (broken_size > stockout > core_size > high_velocity > excess_source).

### Thay doi cu the

#### File: `src/components/command/TransferSuggestionsCard.tsx`

1. **Them helper `getPurposeBadge(reason)`** — phan tich reason string, tra ve label + mau:
   - `broken_size` hoac `core_size` -> `{ label: "Xu ly le size", color: "purple" }`
   - `stockout` -> `{ label: "Het hang", color: "red" }`
   - `excess_source` / `low_stock` -> `{ label: "Can bang kho", color: "blue" }`
   - `high_velocity` -> `{ label: "Ban nhanh", color: "orange" }`
   - Fallback -> `{ label: "Toi uu", color: "gray" }`

2. **Thay the cot "Reason" text** bang Purpose Badge mau sac — hien thi ngay tren row, khong can expand

3. **Giu nguyen expand detail** — khi click van hien ly do day du nhu hien tai

### Ket qua
- Nguoi van hanh nhin 1 cai biet NGAY dong nay de "Xu ly le size" hay "Het hang"
- Khong can click expand de hieu muc dich
- Van giu detail panel cho nguoi muon xem them

### Files thay doi
- `src/components/command/TransferSuggestionsCard.tsx` — them `getPurposeBadge()`, thay cot Reason text bang badge mau

