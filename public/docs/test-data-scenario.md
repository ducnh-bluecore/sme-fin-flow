# Kịch Bản Test Data - CFO Dashboard

## Tổng Quan
Tài liệu này mô tả kịch bản test data để kiểm tra toàn bộ chức năng của hệ thống CFO Dashboard.

**Bối cảnh kinh doanh:**
- Công ty bán hàng online đa kênh
- Hoạt động 18 tháng (từ 07/2024 đến 12/2025)
- 4 kênh bán hàng: Haravan, Nhanh.vn, Shopee, TikTok Shop
- Mỗi kênh có 30-100 đơn/tháng

---

## 1. Thông Tin Tenant

### Tenant Chính
```
Tên công ty: ABC Online Store Co., Ltd
Ngành nghề: Bán lẻ đa kênh (eCommerce)
Tiền tệ cơ sở: VND
Năm tài chính: 01/01 - 31/12
Ngày bắt đầu hoạt động: 01/07/2024
```

---

## 2. Tài Khoản Ngân Hàng

| Ngân hàng | Số tài khoản | Loại TK | Số dư hiện tại |
|-----------|--------------|---------|----------------|
| Vietcombank | 0071000123456 | Thanh toán | 1,000,000,000 |

> **Lưu ý:** Chỉ có 1 tài khoản ngân hàng chính với số dư 1 tỷ VND

---

## 3. Kết Nối eCommerce (Connector Integrations)

| Kênh | Shop ID | Shop Name | Trạng thái | Ngày kết nối |
|------|---------|-----------|------------|--------------|
| Haravan | HRV-001 | ABC Store Haravan | active | 01/07/2024 |
| Nhanh.vn | NHANH-001 | ABC Store Nhanh | active | 01/07/2024 |
| Shopee | SHOPEE-001 | ABC Official Shop | active | 01/07/2024 |
| TikTok Shop | TIKTOK-001 | ABC TikTok Store | active | 01/07/2024 |

---

## 4. Cấu Trúc Tài Khoản Kế Toán (GL Accounts)

### Tài sản (1xxx)
| Mã TK | Tên tài khoản | Loại | Số dư đầu kỳ |
|-------|---------------|------|--------------|
| 1111 | Tiền mặt VND | Tài sản | 50,000,000 |
| 1121 | Tiền gửi Vietcombank | Tài sản | 1,000,000,000 |
| 1311 | Phải thu khách hàng | Tài sản | 0 |
| 1561 | Hàng hóa | Tài sản | 200,000,000 |

### Nợ phải trả (3xxx)
| Mã TK | Tên tài khoản | Loại | Số dư đầu kỳ |
|-------|---------------|------|--------------|
| 3311 | Phải trả nhà cung cấp | Nợ phải trả | 0 |
| 3331 | Thuế GTGT phải nộp | Nợ phải trả | 0 |
| 3341 | Phải trả người lao động | Nợ phải trả | 0 |

### Doanh thu (5xxx)
| Mã TK | Tên tài khoản | Loại |
|-------|---------------|------|
| 5111 | Doanh thu Haravan | Doanh thu |
| 5112 | Doanh thu Nhanh.vn | Doanh thu |
| 5113 | Doanh thu Shopee | Doanh thu |
| 5114 | Doanh thu TikTok Shop | Doanh thu |

### Chi phí (6xxx)
| Mã TK | Tên tài khoản | Loại |
|-------|---------------|------|
| 6321 | Giá vốn hàng bán | Chi phí |
| 6411 | Chi phí lương nhân viên | Chi phí |
| 6412 | Chi phí BHXH, BHYT | Chi phí |
| 6421 | Chi phí thuê văn phòng | Chi phí |
| 6422 | Chi phí điện nước | Chi phí |
| 6423 | Chi phí internet/điện thoại | Chi phí |
| 6424 | Chi phí thuê server/hosting | Chi phí |
| 6425 | Chi phí marketing | Chi phí |
| 6426 | Phí sàn TMĐT | Chi phí |
| 6427 | Chi phí vận chuyển | Chi phí |
| 6428 | Chi phí văn phòng phẩm | Chi phí |

---

## 5. Chi Phí Cố Định Hàng Tháng

| Danh mục | Mô tả | Số tiền/tháng | Ngày thanh toán |
|----------|-------|---------------|-----------------|
| salary | Lương nhân viên (5 người) | 75,000,000 | Ngày 5 hàng tháng |
| insurance | BHXH, BHYT, BHTN | 15,000,000 | Ngày 20 hàng tháng |
| rent | Thuê văn phòng + kho | 25,000,000 | Ngày 1 hàng tháng |
| utilities | Điện nước | 3,000,000 | Ngày 10 hàng tháng |
| internet | Internet + điện thoại | 2,000,000 | Ngày 15 hàng tháng |
| server | Thuê server/hosting/domain | 5,000,000 | Ngày 1 hàng tháng |
| office | Văn phòng phẩm | 1,000,000 | Ngày 20 hàng tháng |

**Tổng chi phí cố định:** ~126,000,000 VND/tháng

---

## 6. Kịch Bản Đơn Hàng eCommerce (18 tháng)

### Phân Bố Đơn Hàng Theo Kênh

| Kênh | Đơn/tháng (min) | Đơn/tháng (max) | Giá trị TB/đơn | Phí sàn |
|------|-----------------|-----------------|----------------|---------|
| Haravan | 30 | 50 | 800,000 | 0% (self-hosted) |
| Nhanh.vn | 40 | 70 | 600,000 | 0% (self-hosted) |
| Shopee | 80 | 100 | 450,000 | 6% |
| TikTok Shop | 50 | 80 | 350,000 | 4% |

### Tăng Trưởng Theo Thời Gian

| Giai đoạn | Tháng | Hệ số đơn hàng | Ghi chú |
|-----------|-------|----------------|---------|
| Khởi đầu | 07-09/2024 | 0.5x | Mới bắt đầu, ít đơn |
| Phát triển | 10-12/2024 | 0.8x | Tăng dần |
| Ổn định | 01-06/2025 | 1.0x | Hoạt động bình thường |
| Cao điểm | 11-12/2024, 11-12/2025 | 1.5x | Mùa sale |
| Tăng trưởng | 07-12/2025 | 1.2x | Phát triển thêm |

### Tỷ Lệ Trạng Thái Đơn Hàng

| Trạng thái | Tỷ lệ | Mô tả |
|------------|-------|-------|
| completed | 85% | Hoàn thành |
| returned | 8% | Hoàn trả |
| cancelled | 5% | Hủy |
| pending | 2% | Đang xử lý |

### Chi Tiết Đơn Hàng Mẫu (Tháng 12/2025)

#### Haravan (45 đơn)
| Order ID | Ngày | Tổng tiền | COGS (60%) | Trạng thái |
|----------|------|-----------|------------|------------|
| HRV-2512-001 | 01/12 | 1,200,000 | 720,000 | completed |
| HRV-2512-002 | 01/12 | 850,000 | 510,000 | completed |
| HRV-2512-003 | 02/12 | 1,500,000 | 900,000 | completed |
| HRV-2512-004 | 02/12 | 650,000 | 390,000 | returned |
| HRV-2512-005 | 03/12 | 2,100,000 | 1,260,000 | completed |
| ... | ... | ... | ... | ... |

#### Nhanh.vn (60 đơn)
| Order ID | Ngày | Tổng tiền | COGS (60%) | Trạng thái |
|----------|------|-----------|------------|------------|
| NHANH-2512-001 | 01/12 | 450,000 | 270,000 | completed |
| NHANH-2512-002 | 01/12 | 780,000 | 468,000 | completed |
| NHANH-2512-003 | 01/12 | 920,000 | 552,000 | completed |
| NHANH-2512-004 | 02/12 | 350,000 | 210,000 | cancelled |
| NHANH-2512-005 | 02/12 | 1,100,000 | 660,000 | completed |
| ... | ... | ... | ... | ... |

#### Shopee (100 đơn)
| Order ID | Ngày | Tổng tiền | Phí sàn (6%) | COGS (60%) | Trạng thái |
|----------|------|-----------|--------------|------------|------------|
| SP-2512-001 | 01/12 | 380,000 | 22,800 | 228,000 | completed |
| SP-2512-002 | 01/12 | 520,000 | 31,200 | 312,000 | completed |
| SP-2512-003 | 01/12 | 450,000 | 27,000 | 270,000 | completed |
| SP-2512-004 | 01/12 | 680,000 | 40,800 | 408,000 | completed |
| SP-2512-005 | 02/12 | 290,000 | 17,400 | 174,000 | returned |
| ... | ... | ... | ... | ... | ... |

#### TikTok Shop (70 đơn)
| Order ID | Ngày | Tổng tiền | Phí sàn (4%) | COGS (60%) | Trạng thái |
|----------|------|-----------|--------------|------------|------------|
| TT-2512-001 | 01/12 | 280,000 | 11,200 | 168,000 | completed |
| TT-2512-002 | 01/12 | 420,000 | 16,800 | 252,000 | completed |
| TT-2512-003 | 02/12 | 350,000 | 14,000 | 210,000 | completed |
| TT-2512-004 | 02/12 | 580,000 | 23,200 | 348,000 | cancelled |
| TT-2512-005 | 03/12 | 320,000 | 12,800 | 192,000 | completed |
| ... | ... | ... | ... | ... | ... |

---

## 7. Giao Dịch Ngân Hàng (Bank Transactions)

### Mẫu Giao Dịch Tháng 12/2025

| Ngày | Loại | Mô tả | Số tiền | Match Status |
|------|------|-------|---------|--------------|
| 01/12 | debit | Thanh toan tien thue VP thang 12 | 25,000,000 | matched |
| 01/12 | debit | Thue server thang 12 | 5,000,000 | matched |
| 05/12 | debit | Luong nhan vien thang 11 | 75,000,000 | matched |
| 07/12 | credit | Shopee settlement 01-07/12 | 18,500,000 | matched |
| 08/12 | credit | TikTok settlement 01-07/12 | 8,200,000 | matched |
| 10/12 | debit | Tien dien nuoc thang 11 | 3,000,000 | matched |
| 12/12 | credit | Haravan COD collection | 15,800,000 | matched |
| 14/12 | credit | Shopee settlement 08-14/12 | 22,100,000 | matched |
| 15/12 | debit | Internet + dien thoai | 2,000,000 | matched |
| 15/12 | credit | Nhanh.vn COD collection | 12,500,000 | matched |
| 17/12 | credit | TikTok settlement 08-14/12 | 9,800,000 | matched |
| 20/12 | debit | BHXH BHYT thang 12 | 15,000,000 | matched |
| 20/12 | debit | Van phong pham | 1,000,000 | matched |
| 21/12 | credit | Shopee settlement 15-21/12 | 25,300,000 | matched |
| 22/12 | credit | Chuyen khoan tu tai khoan khac | 50,000,000 | unmatched |
| 25/12 | credit | Haravan COD collection | 18,200,000 | matched |
| 28/12 | credit | Shopee settlement 22-28/12 | 21,800,000 | matched |
| 30/12 | credit | Nhanh.vn COD collection | 14,600,000 | pending |

---

## 8. Chi Phí Marketing (Biến Động)

| Tháng | Facebook Ads | Google Ads | Shopee Ads | TikTok Ads | Tổng |
|-------|--------------|------------|------------|------------|------|
| 07/2024 | 5,000,000 | 3,000,000 | 2,000,000 | 2,000,000 | 12,000,000 |
| 08/2024 | 6,000,000 | 3,500,000 | 2,500,000 | 2,500,000 | 14,500,000 |
| 09/2024 | 7,000,000 | 4,000,000 | 3,000,000 | 3,000,000 | 17,000,000 |
| 10/2024 | 8,000,000 | 4,500,000 | 4,000,000 | 4,000,000 | 20,500,000 |
| 11/2024 | 15,000,000 | 8,000,000 | 8,000,000 | 8,000,000 | 39,000,000 |
| 12/2024 | 18,000,000 | 10,000,000 | 10,000,000 | 10,000,000 | 48,000,000 |
| 01-10/2025 | 10,000,000 | 5,000,000 | 5,000,000 | 5,000,000 | 25,000,000 |
| 11/2025 | 20,000,000 | 12,000,000 | 12,000,000 | 12,000,000 | 56,000,000 |
| 12/2025 | 25,000,000 | 15,000,000 | 15,000,000 | 15,000,000 | 70,000,000 |

---

## 9. Tổng Hợp Doanh Thu & Chi Phí (Ước Tính Tháng 12/2025)

### Doanh Thu
| Kênh | Số đơn | Doanh thu | Phí sàn | Net Revenue |
|------|--------|-----------|---------|-------------|
| Haravan | 45 | 36,000,000 | 0 | 36,000,000 |
| Nhanh.vn | 60 | 36,000,000 | 0 | 36,000,000 |
| Shopee | 100 | 45,000,000 | 2,700,000 | 42,300,000 |
| TikTok | 70 | 24,500,000 | 980,000 | 23,520,000 |
| **Tổng** | **275** | **141,500,000** | **3,680,000** | **137,820,000** |

### Chi Phí
| Danh mục | Số tiền |
|----------|---------|
| COGS (60% doanh thu) | 84,900,000 |
| Lương nhân viên | 75,000,000 |
| BHXH, BHYT | 15,000,000 |
| Thuê văn phòng | 25,000,000 |
| Điện nước | 3,000,000 |
| Internet/điện thoại | 2,000,000 |
| Server/hosting | 5,000,000 |
| Văn phòng phẩm | 1,000,000 |
| Marketing | 70,000,000 |
| Phí sàn TMĐT | 3,680,000 |
| **Tổng chi phí** | **284,580,000** |

### Lãi/Lỗ Tháng 12/2025
```
Doanh thu:        141,500,000 VND
Tổng chi phí:     284,580,000 VND
Lỗ ròng:         (143,080,000) VND
```

> **Ghi chú:** Tháng 12 chi marketing cao (mùa sale), thực tế công ty có thể lãi các tháng thường.

---

## 10. Kịch Bản Cảnh Báo (Alerts)

### Alert 1: Chi phí vượt ngân sách
```
Loại: budget_exceeded
Mức độ: high
Tiêu đề: Chi phí marketing vượt 40% ngân sách
Nội dung: Chi phí marketing tháng 12/2025 là 70,000,000 VND, vượt 40% so với ngân sách 50,000,000 VND
```

### Alert 2: Dòng tiền thấp
```
Loại: cash_low
Mức độ: medium
Tiêu đề: Số dư tiền mặt giảm dưới ngưỡng an toàn
Nội dung: Số dư hiện tại 180,000,000 VND, dưới ngưỡng an toàn 200,000,000 VND
```

### Alert 3: Settlement chờ xử lý
```
Loại: settlement_pending
Mức độ: low
Tiêu đề: 2 settlement chưa được đối soát
Nội dung: Có 2 settlement từ Nhanh.vn với tổng 27,100,000 VND chưa được match
```

### Alert 4: Tỷ lệ hoàn hàng cao
```
Loại: return_rate_high
Mức độ: medium
Tiêu đề: Tỷ lệ hoàn hàng Shopee tăng
Nội dung: Tỷ lệ hoàn hàng Shopee tháng này là 12%, cao hơn TB 8%
```

---

## 11. Kịch Bản Scenario Planning

### Scenario 1: Cắt giảm chi phí
```
Tên: Kịch bản tiết kiệm 2026
Thay đổi:
- Giảm marketing 50%
- Giảm 1 nhân viên
- Dự kiến tiết kiệm: 50,000,000/tháng
EBITDA dự kiến: +20,000,000/tháng
```

### Scenario 2: Mở rộng kênh
```
Tên: Mở rộng Lazada + Sendo
Đầu tư:
- Thêm 2 kênh mới
- Tăng marketing 30%
- Thuê thêm 1 nhân viên
Chi phí thêm: 40,000,000/tháng
Doanh thu kỳ vọng: +60,000,000/tháng
```

### Scenario 3: Tập trung Shopee
```
Tên: Tập trung Shopee 2026
Thay đổi:
- Dừng Haravan, Nhanh (tốn chi phí vận hành)
- Tăng marketing Shopee 50%
- Giảm 30% chi phí vận hành
Net effect: +15,000,000/tháng
```

---

## 12. Kỳ Vọng Kết Quả Test

### Dashboard CFO
- [ ] Số dư ngân hàng: ~1,000,000,000 VND (biến động theo giao dịch)
- [ ] Doanh thu 18 tháng: ~2,000,000,000 VND
- [ ] Chi phí 18 tháng: ~4,000,000,000 VND
- [ ] Gross Margin: ~40%

### Phân Tích Kênh
- [ ] Shopee chiếm ~35% đơn hàng, cao nhất
- [ ] TikTok đang tăng trưởng
- [ ] Haravan + Nhanh.vn: ổn định, không phí sàn

### Báo Cáo P&L (Tháng TB)
- [ ] Doanh thu: ~100,000,000 VND
- [ ] COGS: ~60,000,000 VND
- [ ] OPEX: ~150,000,000 VND
- [ ] Net: (110,000,000) VND (giai đoạn đầu tư)

### Dòng Tiền
- [ ] Chi phí cố định: 126,000,000/tháng
- [ ] Marketing biến động: 15-70,000,000/tháng
- [ ] Settlement về TB: 3-7 ngày

---

## 13. Thứ Tự Insert Data

1. **Tenant & Users** (đã có sẵn qua auth)
2. **GL Accounts** (Chart of Accounts)
3. **Bank Accounts** (1 tài khoản VCB)
4. **Connector Integrations** (4 kênh)
5. **Products** (danh mục sản phẩm)
6. **External Orders** (18 tháng x 4 kênh x 30-100 đơn)
7. **Channel Fees** (phí sàn Shopee, TikTok)
8. **Channel Settlements** (thanh toán định kỳ)
9. **Expenses** (chi phí cố định 18 tháng)
10. **Bank Transactions** (giao dịch ngân hàng)
11. **Scenarios** (3 kịch bản)
12. **Alerts** (cảnh báo mẫu)

---

## 14. SQL Scripts Location

Khi sẵn sàng insert data, các SQL scripts sẽ được tạo tại:
- `public/docs/test-data/01-gl-accounts.sql`
- `public/docs/test-data/02-bank-accounts.sql`
- `public/docs/test-data/03-connectors.sql`
- `public/docs/test-data/04-products.sql`
- `public/docs/test-data/05-external-orders.sql`
- `public/docs/test-data/06-channel-fees.sql`
- `public/docs/test-data/07-channel-settlements.sql`
- `public/docs/test-data/08-expenses.sql`
- `public/docs/test-data/09-bank-transactions.sql`
- `public/docs/test-data/10-scenarios.sql`
- `public/docs/test-data/11-alerts.sql`

---

## Ghi Chú

- Dữ liệu 18 tháng từ 07/2024 đến 12/2025
- Tổng ước tính: ~4,500+ đơn hàng eCommerce
- Chi phí cố định ~126,000,000/tháng
- Công ty đang trong giai đoạn đầu tư, chấp nhận lỗ để tăng trưởng
- Focus vào 4 kênh chính: Haravan, Nhanh.vn, Shopee, TikTok Shop
- Không có khách hàng B2B, chỉ bán lẻ online
