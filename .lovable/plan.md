

# Chuẩn hóa hiển thị card Hàng Lệch Size trên Overview

## Van de hien tai

- Card "Hang Lech Size" hien thi "Ton Kho Lech Size = 18.5B" nhung thuc te do la TONG GIA TRI ton kho cua 307 FC co van de size (tinh theo gia von COGS = 60% gia ban).
- Phan VON THUC SU BI KHOA chi la 3.0B (16% tong gia tri).
- Label "Ton Kho Lech Size" gay hieu lam rang 18.5B deu la hang lech, trong khi no bao gom ca phan healthy cua nhung FC do.
- Nguoi dung nham so 42 (FC can thanh ly) voi so 307 (FC lech size) vi 2 card nam canh nhau.

## Giai phap

### File: `src/pages/command/CommandOverviewPage.tsx`

1. **Card "Hang Lech Size"**: Chinh sua label va bo cuc de ro rang hon:
   - "Style Vo / Tong" --> giu nguyen (307 / 1,932)
   - "Suc Khoe TB" --> giu nguyen
   - Doi "Ton Kho Lech Size: 18.5B" thanh **"Gia Tri Hang Lien Quan: 18.5B"** hoac bo di, vi so nay khong phai la thiet hai ma la tong gia tri tai san
   - Giu "Von Khoa: 3.0B" (day moi la con so quan trong)
   - Giu "Doanh Thu Mat" (uoc tinh thiet hai)

2. **Lam ro phan biet 2 card**: Them so luong ton kho (units) cho card Thanh Ly de phan biet voi card Lech Size

### Chi tiet thay doi

Card "Hang Lech Size" se hien thi:
```
Style Vo / Tong:     307 / 1,932
Suc Khoe TB:         54.2
Von Khoa:            3.0B        (phan von thuc su bi ket)
Doanh Thu Mat:       X.XB        (thiet hai uoc tinh)
```

Bo metric "Ton Kho Lech Size: 18.5B" vi:
- No khong phai thiet hai, chi la tong gia tri tai san
- Gay nham lan voi "Von Khoa" (3.0B) -- nguoi dung tuong 18.5B bi khoa
- Theo manifesto: "SURFACE PROBLEMS" -- chi hien so co y nghia hanh dong

Card "Thanh Ly" giu nguyen vi da ro rang.

### Ky thuat
- Chi sua file `CommandOverviewPage.tsx`
- Xoa dong hien thi `siSummary?.totalInventoryValue`
- Khong can thay doi hook hay DB

