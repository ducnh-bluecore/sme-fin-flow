

# Growth Simulator - Mô phỏng Tăng Trưởng Doanh Thu

## Mục tiêu
Thêm một module **"Mô phỏng Tăng Trưởng"** vào trang Phân Tích Nguồn Cung (NetworkGapPage), cho phép CEO/CFO nhập mục tiêu tăng trưởng doanh thu (30%, 50%...) theo khung thời gian (3/6/12 tháng) và hệ thống sẽ tự động tính toán:
- Cần sản xuất thêm bao nhiêu đơn vị
- Sản phẩm nào nên sản xuất (ưu tiên Hero)
- Phân tích rủi ro và vốn cần thiết
- Cần thêm bao nhiêu Hero product mới

## Nguồn dữ liệu hiện có
- `inv_family_codes`: danh mục mẫu, có cờ `is_core_hero`
- `fdp_sku_summary`: doanh thu, margin, số lượng bán theo SKU
- `inv_state_positions`: tồn kho hiện tại theo store/SKU
- `kpi_network_gap`: thiếu hụt hiện tại
- `kpi_facts_daily`: doanh thu tổng hàng ngày (NET_REVENUE)

## Thiết kế UI

### Vị trí
Thêm một **Card mới** ngay sau "Radar San Xuat" trên NetworkGapPage, với tiêu đề **"Mo Phong Tang Truong"**.

### Giao dien bao gom:

**1. Input Panel (thanh cau hinh)**
- Slider/Input: % tang truong muc tieu (10-100%, mac dinh 30%)
- Select: Khung thoi gian (3 thang / 6 thang / 12 thang)
- Button: "Chay Mo Phong"

**2. Ket Qua Tong Quan (4 KPI cards)**
- Doanh thu muc tieu (hien tai + % tang)
- Tong SL can san xuat them
- Von can (cash required)
- Bien loi nhuan du kien

**3. Bang Hero Analysis**
- Danh sach FC hien tai la Hero (is_core_hero = true) va hieu suat ban
- So luong can san xuat them cho moi Hero
- De xuat them bao nhieu Hero moi (dua tren gap giua muc tieu va nang luc hien tai)

**4. Bang Chi Tiet San Xuat**
- Tat ca FC duoc de xuat, sap xep theo uu tien
- Cot: Ten SP | Hero? | SL Can | Von Can | Margin Du Kien | Rui Ro

**5. Risk Summary**
- Rui ro tap trung (qua phu thuoc vao it Hero)
- Rui ro von (tong von can vs kha nang)
- Rui ro thoi gian (lead time san xuat vs deadline)

## Logic Tinh Toan (client-side)

```text
1. Lay doanh thu hien tai tu kpi_facts_daily (NET_REVENUE tong)
2. Tinh doanh thu muc tieu = hien tai * (1 + growth%)
3. Tinh doanh thu can them = muc tieu - hien tai
4. Lay danh sach FC tu fdp_sku_summary (revenue, margin, qty per FC)
5. Phan bo doanh thu can them:
   - Uu tien Hero (is_core_hero) theo ty le doanh thu hien tai
   - Phan con lai cho non-Hero
6. Chuyen doi doanh thu -> so luong = revenue_needed / avg_unit_price
7. Tinh von can = qty * avg_unit_cogs
8. Tinh margin du kien = qty * (avg_unit_price - avg_unit_cogs)
9. Danh gia rui ro:
   - Neu Hero < 3 FC -> canh bao tap trung
   - Neu Hero chi chiem < 40% doanh thu -> can them Hero moi
   - So Hero moi can = ceil((gap_revenue * 0.6) / avg_hero_revenue)
```

## Cac file can tao/sua

### File moi:
- `src/components/command/GrowthSimulator.tsx` - Component chinh chua toan bo UI mo phong

### File sua:
- `src/pages/command/NetworkGapPage.tsx` - Them GrowthSimulator component vao sau Radar San Xuat

## Chi tiet ky thuat

- Component `GrowthSimulator` se dung `useQuery` de lay du lieu tu `kpi_facts_daily`, `fdp_sku_summary`, va `inv_family_codes`
- Toan bo tinh toan chay client-side (du lieu da duoc pre-aggregate trong summary views)
- Dung `useTenantQueryBuilder` de dam bao tenant isolation
- Khong can tao bang moi trong database - chi doc du lieu hien co
- Su dung cac UI components da co: Card, Table, Badge, Slider, Select, Button
- Format tien dung `formatVNDCompact` da co

