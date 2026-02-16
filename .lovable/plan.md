

# Fix: Clearance Intelligence - Lich su & Hieu qua theo kenh khong hien thi

## Ket qua kiem tra

Sau khi kiem tra truc tiep tren ung dung, **du lieu DA hien thi dung** cho "Briar Fleur Top 2":

| Phan | Ket qua |
|------|---------|
| Lich su giam gia | 4 dong: Gia goc (KiotViet 21 units, TikTok 5 units), 0-20% (KiotViet 7, TikTok 50) |
| Hieu qua theo kenh | TikTok: 55 units, 10.1M, 7% avg discount. KiotViet: 28 units, 24.5M, 1% |

## Van de con lai

1. **Mobile layout**: Tren man hinh nho, phan "Hieu qua theo kenh" bi cat ngang - so lieu khong hien thi het
2. **"Gia tri ton" = 0 d**: Do `state_cash_lock_daily` chua co du lieu cho san pham nay (khong phai loi code)
3. **Cache cu**: Neu nguoi dung van thay trong, co the browser dang cache phien ban cu truoc khi migration chay xong

## Ke hoach sua

### 1. Fix mobile layout cho Channel Performance cards
- Chuyen tu `flex justify-between` (1 dong, bi tran) sang layout dung `block` de so lieu xuat hien ben duoi label
- Dam bao tat ca so deu hien thi tren moi kich thuoc man hinh

### 2. Fallback khi `inventory_value = 0`
- Hien thi "Chua co du lieu" thay vi "0 d" de tranh nham lan

### 3. Force refresh data khi click vao san pham
- Them `staleTime: 0` cho `useClearanceHistory` query de dam bao du lieu luon moi khi click

## Chi tiet ky thuat

### File: `src/pages/command/ClearancePage.tsx`

**Channel summary cards** (dong 189-210): Thay doi layout tu flex ngang sang dung:
```text
Truoc:  [Label .......... Value]  (bi tran tren mobile)
Sau:    [Label]
        [Value]                    (luon hien thi)
```

**Inventory value display** (dong 107-109): Them dieu kien hien thi:
```text
Neu inventory_value > 0 → hien so
Neu = 0 → hien "Chua cap nhat"
```

### File: `src/hooks/inventory/useClearanceIntelligence.ts`

Them `staleTime: 0` cho `useClearanceHistory` query de tranh cache cu.

