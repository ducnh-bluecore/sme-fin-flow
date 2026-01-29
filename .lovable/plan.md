

# Fix: PDF Download Button - "Unknown font format" Error

## Nguyên nhân gốc

Lỗi từ console logs:
```
Error: Unknown font format
at FontSource._load
```

`@react-pdf/renderer` không thể tải font `BeVietnamPro` từ Google Fonts gstatic CDN vì:
1. **CORS policy** - Browser block request đến external CDN
2. **URL format không tương thích** - react-pdf/renderer cần file TTF trực tiếp, nhưng gstatic có thể không phản hồi đúng

## Giải pháp

### Option A: Dùng font mặc định (Helvetica) - Nhanh nhất

Bỏ font registration và dùng font built-in của react-pdf. Đơn giản, hoạt động ngay.

### Option B: Host font local trong `/public/fonts/` (Khuyến nghị)

1. Download file `.ttf` từ Google Fonts
2. Đặt vào thư mục `public/fonts/`
3. Cập nhật `Font.register()` để trỏ đến file local

### Đề xuất: Kết hợp cả hai

- Dùng font mặc định (Helvetica) để PDF hoạt động ngay
- Sau đó có thể nâng cấp lên custom font nếu cần

## Thay đổi cần thực hiện

### 1. File: `src/components/sales-deck/FDPSalesDeckPDF.tsx`

```typescript
// TRƯỚC - Gây lỗi
Font.register({
  family: 'BeVietnamPro',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/bevietnampro/...', fontWeight: 400 },
    ...
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'BeVietnamPro',
    ...
  },
});
```

```typescript
// SAU - Dùng font mặc định
// Bỏ Font.register() 

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',  // Font mặc định của react-pdf
    ...
  },
});
```

### 2. Các style cần cập nhật

| Property | Trước | Sau |
|----------|-------|-----|
| `fontFamily` | `'BeVietnamPro'` | `'Helvetica'` |
| `fontWeight: 600` | Dùng BeVietnamPro | `'Helvetica-Bold'` |
| `fontWeight: 700` | Dùng BeVietnamPro | `'Helvetica-Bold'` |

### 3. Fix React ref warning (bonus)

Console log cũng báo:
```
Warning: Function components cannot be given refs
```

Cần wrap `SalesDeckDownloader` với `React.forwardRef` hoặc đảm bảo không pass ref đến component.

## Files sẽ sửa

| File | Thay đổi |
|------|----------|
| `src/components/sales-deck/FDPSalesDeckPDF.tsx` | Bỏ Font.register, đổi sang Helvetica |

## Kết quả sau fix

- Nút "Tải PDF" sẽ hoạt động
- PDF được generate với font Helvetica (vẫn chuyên nghiệp)
- Có thể nâng cấp lên custom font sau bằng cách host local

## Timeline

- Estimate: 3 phút
- PDF sẽ download ngay sau khi deploy

