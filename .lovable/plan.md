
# Sửa lỗi "Phiên bản Tương tác" không hoạt động

## Vấn đề phát hiện

Trong trang **Sales Deck Library** (`/sales-deck-library`), phần "Phiên bản Tương tác" có 3 nút link đến các trang web tương tác:
1. **FDP Sales Deck** - link đến `/fdp/sales-deck` (KHÔNG TỒN TẠI)
2. **MDP Sales Deck** - link đến `/mdp/sales-deck` (KHÔNG TỒN TẠI)
3. **CDP Sales Deck** - đang disable (Sắp ra mắt)

Khi click vào FDP hoặc MDP, hệ thống báo lỗi 404 vì các route này chưa được đăng ký.

## Giải pháp

Cập nhật các link trong `SalesDeckLibraryPage.tsx` để trỏ đến đúng routes đã tồn tại trong `App.tsx`:

| Link cũ (sai) | Route đúng | Component |
|---------------|------------|-----------|
| `/fdp/sales-deck` | `/sales-kit/fdp-deck` | FDPSalesDeckPage |
| `/mdp/sales-deck` | `/sales-kit/mdp` | MDPSalesDeckPage |

## Chi tiết kỹ thuật

### File cần sửa
**`src/pages/SalesDeckLibraryPage.tsx`** - Dòng 114 và 122

### Thay đổi cụ thể:
1. Dòng 114: Thay `<Link to="/fdp/sales-deck">` thành `<Link to="/sales-kit/fdp-deck">`
2. Dòng 122: Thay `<Link to="/mdp/sales-deck">` thành `<Link to="/sales-kit/mdp">`

## Kết quả sau khi sửa
- Click "FDP Sales Deck" sẽ mở trang trình chiếu web tương tác của FDP (932 slides với animations)
- Click "MDP Sales Deck" sẽ mở trang trình chiếu web tương tác của MDP (956 slides với animations)
- Không còn lỗi 404
