# HƯỚNG DẪN TÍCH HỢP VÀ IMPORT DỮ LIỆU
## Hệ thống Giám sát & Phân tích Tài chính Doanh nghiệp

**Phiên bản:** 2.0  
**Ngày cập nhật:** 01/01/2026  
**Tác giả:** Lovable AI

---

## Tổng quan

Hệ thống này **KHÔNG** phải là nơi nhập liệu gốc (primary data entry). Thay vào đó, hệ thống đóng vai trò:

- **Tích hợp dữ liệu** từ các hệ thống khác (ERP, kế toán, sàn TMĐT, ngân hàng)
- **Giám sát & phân tích** tình hình tài chính theo thời gian thực
- **Cảnh báo & dự báo** các rủi ro và cơ hội

### Luồng dữ liệu

```
┌─────────────────────────────────────────────────────────────────┐
│                    NGUỒN DỮ LIỆU GỐC                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   ERP/Kế toán   │   Sàn TMĐT      │    Ngân hàng                │
│   (SAP, MISA,   │   (Shopee,      │    (API Banking,            │
│   Fast, ...)    │   Lazada, ...)  │    File sao kê)             │
└────────┬────────┴────────┬────────┴──────────┬──────────────────┘
         │                 │                   │
         ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PHƯƠNG THỨC TÍCH HỢP                          │
├──────────────────┬─────────────────┬────────────────────────────┤
│   API Realtime   │   File Import   │   Webhook/Scheduled        │
│   (REST/GraphQL) │   (CSV, Excel)  │   (Cron jobs)              │
└────────┬─────────┴────────┬────────┴───────────┬────────────────┘
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                  HỆ THỐNG GIÁM SÁT TÀI CHÍNH                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐     │
│  │ Dashboard │  │  Phân    │  │  Cảnh    │  │ Dự báo   │     │
│  │   CFO     │  │  tích    │  │  báo     │  │ dòng tiền│     │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mục lục

1. [Template Import File](#1-template-import-file)
2. [Khách hàng (customers)](#2-khách-hàng-customers)
3. [Nhà cung cấp (vendors)](#3-nhà-cung-cấp-vendors)
4. [Hóa đơn bán (invoices)](#4-hóa-đơn-bán-invoices)
5. [Hóa đơn mua (bills)](#5-hóa-đơn-mua-bills)
6. [Giao dịch ngân hàng (bank_transactions)](#6-giao-dịch-ngân-hàng-bank_transactions)
7. [Chi phí (expenses)](#7-chi-phí-expenses)
8. [Đơn hàng (orders)](#8-đơn-hàng-orders)
9. [Mapping dữ liệu từ các nguồn](#9-mapping-dữ-liệu-từ-các-nguồn)

---

## 1. Template Import File

### Định dạng hỗ trợ

| Định dạng | Extension | Ghi chú |
|-----------|-----------|---------|
| CSV | `.csv` | Encoding UTF-8, dấu phân cách dấu phẩy hoặc chấm phẩy |
| Excel | `.xlsx`, `.xls` | Sheet đầu tiên được sử dụng |
| JSON | `.json` | Array of objects |

### Quy tắc chung

1. **Dòng đầu tiên** là header chứa tên cột
2. **Ngày tháng** định dạng: `YYYY-MM-DD` hoặc `DD/MM/YYYY`
3. **Số tiền** không có dấu phân cách hàng nghìn, dùng dấu chấm cho phần thập phân
4. **Mã số** không có khoảng trắng ở đầu/cuối
5. **Các cột bắt buộc** được đánh dấu `*`

---

## 2. Khách hàng (customers)

### Template CSV

```csv
name*,email,phone,address,tax_code,credit_limit,payment_terms,status
Công ty TNHH ABC,contact@abc.com.vn,028-1234-5678,"123 Nguyễn Huệ, Q1, TP.HCM",0312345678,500000000,30,active
Công ty CP XYZ,info@xyz.vn,024-9876-5432,"456 Lê Lợi, Hà Nội",0109876543,200000000,45,active
```

### Mô tả các cột

| Cột | Bắt buộc | Kiểu | Mô tả | Giá trị mẫu |
|-----|----------|------|-------|-------------|
| `name` | ✅ | text | Tên khách hàng/công ty | "Công ty TNHH ABC" |
| `email` | ❌ | text | Email liên hệ | "contact@abc.com.vn" |
| `phone` | ❌ | text | Số điện thoại | "028-1234-5678" |
| `address` | ❌ | text | Địa chỉ | "123 Nguyễn Huệ, Q1" |
| `tax_code` | ❌ | text | Mã số thuế | "0312345678" |
| `credit_limit` | ❌ | number | Hạn mức tín dụng (VND) | 500000000 |
| `payment_terms` | ❌ | number | Số ngày thanh toán | 30 |
| `status` | ❌ | text | "active" hoặc "inactive" | "active" |
| `customer_type` | ❌ | text | Loại khách hàng | "regular", "vip", "wholesale" |
| `currency_code` | ❌ | text | Mã tiền tệ | "VND", "USD" |

### Mapping từ các nguồn phổ biến

| Nguồn | Cột gốc | → Cột hệ thống |
|-------|---------|----------------|
| MISA | Mã khách hàng | tax_code |
| MISA | Tên khách hàng | name |
| SAP | BP_NAME | name |
| SAP | TAX_NUMBER | tax_code |

---

## 3. Nhà cung cấp (vendors)

### Template CSV

```csv
name*,email,phone,address,tax_code,bank_account,bank_name,payment_terms,status
NCC Vật liệu ABC,abc@supplier.vn,028-5555-1234,"789 Điện Biên Phủ, Q3",0301234567,0071001234567,Vietcombank,30,active
NCC Thiết bị XYZ,xyz@equipment.com,024-6666-5678,"123 Trần Duy Hưng, HN",0101234567,0061001234567,Techcombank,45,active
```

### Mô tả các cột

| Cột | Bắt buộc | Kiểu | Mô tả | Giá trị mẫu |
|-----|----------|------|-------|-------------|
| `name` | ✅ | text | Tên nhà cung cấp | "NCC Vật liệu ABC" |
| `email` | ❌ | text | Email liên hệ | "abc@supplier.vn" |
| `phone` | ❌ | text | Số điện thoại | "028-5555-1234" |
| `address` | ❌ | text | Địa chỉ | "789 Điện Biên Phủ, Q3" |
| `tax_code` | ❌ | text | Mã số thuế | "0301234567" |
| `bank_account` | ❌ | text | Số tài khoản ngân hàng | "0071001234567" |
| `bank_name` | ❌ | text | Tên ngân hàng | "Vietcombank" |
| `payment_terms` | ❌ | number | Số ngày thanh toán | 30 |
| `status` | ❌ | text | "active" hoặc "inactive" | "active" |
| `currency_code` | ❌ | text | Mã tiền tệ | "VND", "USD" |

---

## 4. Hóa đơn bán (invoices)

### Template CSV

```csv
invoice_number*,customer_name*,issue_date*,due_date*,subtotal*,vat_amount,discount_amount,total_amount*,status,currency_code,notes
INV-2025-0001,Công ty TNHH ABC,2025-01-01,2025-01-31,100000000,10000000,0,110000000,sent,VND,Thanh toán 30 ngày
INV-2025-0002,Công ty CP XYZ,2025-01-02,2025-02-01,50000000,5000000,2000000,53000000,sent,VND,Giảm giá 2%
```

### Mô tả các cột

| Cột | Bắt buộc | Kiểu | Mô tả | Giá trị mẫu |
|-----|----------|------|-------|-------------|
| `invoice_number` | ✅ | text | Số hóa đơn (unique) | "INV-2025-0001" |
| `customer_name` | ✅ | text | Tên khách hàng | "Công ty TNHH ABC" |
| `customer_tax_code` | ❌ | text | MST để map với customers | "0312345678" |
| `issue_date` | ✅ | date | Ngày phát hành | "2025-01-01" |
| `due_date` | ✅ | date | Ngày đến hạn | "2025-01-31" |
| `subtotal` | ✅ | number | Tổng trước thuế | 100000000 |
| `vat_amount` | ❌ | number | Tiền thuế VAT | 10000000 |
| `discount_amount` | ❌ | number | Tiền giảm giá | 0 |
| `total_amount` | ✅ | number | Tổng sau thuế | 110000000 |
| `paid_amount` | ❌ | number | Đã thanh toán | 0 |
| `status` | ❌ | text | Trạng thái | "draft", "sent", "paid", "overdue" |
| `currency_code` | ❌ | text | Mã tiền tệ | "VND" |
| `notes` | ❌ | text | Ghi chú | "Thanh toán 30 ngày" |

### Trạng thái hóa đơn

| Status | Mô tả |
|--------|-------|
| `draft` | Nháp - chưa gửi |
| `sent` | Đã gửi - chờ thanh toán |
| `partial` | Thanh toán một phần |
| `paid` | Đã thanh toán đủ |
| `overdue` | Quá hạn thanh toán |
| `cancelled` | Đã hủy |

### Chi tiết hóa đơn (invoice_items)

```csv
invoice_number*,description*,quantity*,unit_price*,vat_rate,amount
INV-2025-0001,Dịch vụ tư vấn Q4/2024,1,50000000,10,50000000
INV-2025-0001,Phần mềm license,2,25000000,10,50000000
```

---

## 5. Hóa đơn mua (bills)

### Template CSV

```csv
bill_number*,vendor_name*,vendor_bill_number,bill_date*,due_date*,subtotal*,vat_amount,discount_amount,total_amount*,status,expense_category,currency_code,notes
BILL-2025-0001,NCC Vật liệu ABC,VL-123456,2025-01-01,2025-01-31,80000000,8000000,0,88000000,approved,materials,VND,Đơn hàng vật liệu tháng 1
BILL-2025-0002,NCC Thiết bị XYZ,TB-789012,2025-01-05,2025-02-04,150000000,15000000,5000000,160000000,pending,equipment,VND,Mua thiết bị mới
```

### Mô tả các cột

| Cột | Bắt buộc | Kiểu | Mô tả | Giá trị mẫu |
|-----|----------|------|-------|-------------|
| `bill_number` | ✅ | text | Số hóa đơn nội bộ | "BILL-2025-0001" |
| `vendor_name` | ✅ | text | Tên nhà cung cấp | "NCC Vật liệu ABC" |
| `vendor_bill_number` | ❌ | text | Số HĐ của NCC | "VL-123456" |
| `vendor_tax_code` | ❌ | text | MST để map vendors | "0301234567" |
| `bill_date` | ✅ | date | Ngày hóa đơn | "2025-01-01" |
| `due_date` | ✅ | date | Ngày đến hạn | "2025-01-31" |
| `subtotal` | ✅ | number | Tổng trước thuế | 80000000 |
| `vat_amount` | ❌ | number | Tiền thuế VAT | 8000000 |
| `discount_amount` | ❌ | number | Tiền giảm giá | 0 |
| `total_amount` | ✅ | number | Tổng sau thuế | 88000000 |
| `paid_amount` | ❌ | number | Đã thanh toán | 0 |
| `status` | ❌ | text | Trạng thái | "draft", "pending", "approved", "paid" |
| `expense_category` | ❌ | text | Phân loại chi phí | "materials", "services", "equipment" |
| `currency_code` | ❌ | text | Mã tiền tệ | "VND" |
| `notes` | ❌ | text | Ghi chú | "Đơn hàng tháng 1" |

### Trạng thái hóa đơn mua

| Status | Mô tả |
|--------|-------|
| `draft` | Nháp |
| `pending` | Chờ duyệt |
| `approved` | Đã duyệt - chờ thanh toán |
| `partial` | Thanh toán một phần |
| `paid` | Đã thanh toán |
| `cancelled` | Đã hủy |

---

## 6. Giao dịch ngân hàng (bank_transactions)

### Template CSV

```csv
bank_account_number*,transaction_date*,transaction_type*,amount*,description,reference
0071001234567,2025-01-02,credit,50000000,TT HĐ INV-2024-001 CONG TY ABC,FT25002123456
0071001234567,2025-01-03,debit,20000000,Chi lương tháng 12/2024,FT25003654321
0071001234567,2025-01-04,credit,30000000,TT HĐ INV-2024-002 CONG TY XYZ,FT25004789012
```

### Mô tả các cột

| Cột | Bắt buộc | Kiểu | Mô tả | Giá trị mẫu |
|-----|----------|------|-------|-------------|
| `bank_account_number` | ✅ | text | Số tài khoản ngân hàng | "0071001234567" |
| `transaction_date` | ✅ | date | Ngày giao dịch | "2025-01-02" |
| `transaction_type` | ✅ | text | "credit" (tiền vào) hoặc "debit" (tiền ra) | "credit" |
| `amount` | ✅ | number | Số tiền (luôn dương) | 50000000 |
| `description` | ❌ | text | Nội dung giao dịch | "TT HĐ INV-2024-001" |
| `reference` | ❌ | text | Mã tham chiếu ngân hàng | "FT25002123456" |
| `match_status` | ❌ | text | Trạng thái khớp | "unmatched" (mặc định) |

### Lưu ý quan trọng

1. **Số tài khoản** phải tồn tại trong bảng `bank_accounts`
2. **Transaction type**:
   - `credit` = Tiền VÀO (thu từ khách hàng, hoàn tiền, ...)
   - `debit` = Tiền RA (thanh toán NCC, chi phí, ...)
3. **Description** nên chứa thông tin để hỗ trợ matching tự động (số HĐ, tên KH/NCC)

### Import từ sao kê ngân hàng

| Ngân hàng | Cột gốc | → Cột hệ thống |
|-----------|---------|----------------|
| VCB | Số tiền ghi Có | amount (type=credit) |
| VCB | Số tiền ghi Nợ | amount (type=debit) |
| VCB | Nội dung | description |
| VCB | Số GD | reference |
| TCB | Credit | amount (type=credit) |
| TCB | Debit | amount (type=debit) |

---

## 7. Chi phí (expenses)

### Template CSV

```csv
expense_date*,category*,description*,amount*,vendor_name,payment_method,reference_number,subcategory,notes,is_recurring
2025-01-01,rent,Tiền thuê văn phòng tháng 1/2025,50000000,Công ty BĐS ABC,bank_transfer,CHI-2025-001,office,Hợp đồng 12 tháng,true
2025-01-02,utilities,Tiền điện tháng 12/2024,5000000,EVN,bank_transfer,CHI-2025-002,electricity,,false
2025-01-03,marketing,Quảng cáo Facebook tháng 1,20000000,Meta,card,CHI-2025-003,digital_ads,Campaign Q1,false
```

### Mô tả các cột

| Cột | Bắt buộc | Kiểu | Mô tả | Giá trị mẫu |
|-----|----------|------|-------|-------------|
| `expense_date` | ✅ | date | Ngày chi | "2025-01-01" |
| `category` | ✅ | text | Danh mục chi phí | Xem bảng bên dưới |
| `description` | ✅ | text | Mô tả chi tiết | "Tiền thuê VP tháng 1" |
| `amount` | ✅ | number | Số tiền (VND) | 50000000 |
| `vendor_name` | ❌ | text | Tên nhà cung cấp/người nhận | "Công ty BĐS ABC" |
| `payment_method` | ❌ | text | Phương thức thanh toán | "cash", "bank_transfer", "card" |
| `reference_number` | ❌ | text | Số chứng từ | "CHI-2025-001" |
| `subcategory` | ❌ | text | Phân loại phụ | "office", "electricity" |
| `notes` | ❌ | text | Ghi chú | "Hợp đồng 12 tháng" |
| `is_recurring` | ❌ | boolean | Chi phí định kỳ | true/false |
| `currency_code` | ❌ | text | Mã tiền tệ | "VND" |

### Danh mục chi phí (category)

| Category | Mô tả tiếng Việt |
|----------|------------------|
| `salary` | Lương & phụ cấp |
| `rent` | Thuê mặt bằng |
| `utilities` | Điện, nước, internet |
| `marketing` | Marketing & quảng cáo |
| `supplies` | Văn phòng phẩm |
| `travel` | Công tác phí |
| `professional_services` | Dịch vụ chuyên môn |
| `insurance` | Bảo hiểm |
| `maintenance` | Bảo trì, sửa chữa |
| `taxes` | Thuế & phí |
| `other` | Chi phí khác |

---

## 8. Đơn hàng (orders)

### Template CSV

```csv
order_number*,customer_name*,source*,order_date*,total_amount*,status,notes
ORD-2025-0001,Nguyễn Văn A,website,2025-01-01T10:30:00,1500000,pending,Đơn hàng từ website
SPE-2025-0001,Trần Thị B,shopee,2025-01-01T11:00:00,2500000,approved,Shopee Mall
LZD-2025-0001,Lê Văn C,lazada,2025-01-01T12:00:00,3200000,invoiced,LazMall
```

### Mô tả các cột

| Cột | Bắt buộc | Kiểu | Mô tả | Giá trị mẫu |
|-----|----------|------|-------|-------------|
| `order_number` | ✅ | text | Mã đơn hàng | "ORD-2025-0001" |
| `customer_name` | ✅ | text | Tên khách hàng | "Nguyễn Văn A" |
| `source` | ✅ | text | Nguồn đơn hàng | Xem bảng bên dưới |
| `order_date` | ✅ | datetime | Thời điểm đặt hàng | "2025-01-01T10:30:00" |
| `total_amount` | ✅ | number | Tổng giá trị | 1500000 |
| `status` | ❌ | text | Trạng thái | "pending" (mặc định) |
| `notes` | ❌ | text | Ghi chú | "Đơn hàng từ website" |
| `metadata` | ❌ | json | Dữ liệu mở rộng | `{"items": [...]}` |

### Nguồn đơn hàng (source)

| Source | Mô tả |
|--------|-------|
| `website` | Website bán hàng |
| `shopee` | Shopee |
| `lazada` | Lazada |
| `tiktok` | TikTok Shop |
| `sendo` | Sendo |
| `tiki` | Tiki |
| `pos` | Điểm bán hàng |
| `erp` | Từ hệ thống ERP |
| `api` | Qua API tích hợp |
| `manual` | Nhập thủ công |

### Trạng thái đơn hàng (status)

| Status | Mô tả |
|--------|-------|
| `pending` | Chờ duyệt |
| `review` | Đang xem xét |
| `approved` | Đã duyệt |
| `rejected` | Từ chối |
| `invoiced` | Đã tạo hóa đơn |
| `cancelled` | Đã hủy |

---

## 9. Mapping dữ liệu từ các nguồn

### Từ MISA

| Bảng MISA | → Bảng hệ thống | Ghi chú |
|-----------|-----------------|---------|
| Danh mục khách hàng | customers | Map theo MST |
| Danh mục nhà cung cấp | vendors | Map theo MST |
| Hóa đơn bán hàng | invoices | Lấy HĐ đã phát hành |
| Hóa đơn mua hàng | bills | Lấy HĐ đã nhập |
| Sổ quỹ tiền mặt | bank_transactions | type=cash |
| Sổ tiền gửi ngân hàng | bank_transactions | type=bank |

### Từ SAP Business One

| SAP Table | → Bảng hệ thống | Ghi chú |
|-----------|-----------------|---------|
| OCRD (BP Master) | customers/vendors | BP_TYPE để phân loại |
| OINV (AR Invoices) | invoices | DocStatus=O (Open) |
| OPCH (AP Invoices) | bills | DocStatus=O (Open) |
| OJDT (Journal Entries) | - | Chỉ sync transactions |

### Từ Sàn TMĐT

| Shopee API | → Bảng hệ thống | Ghi chú |
|------------|-----------------|---------|
| order.order_sn | orders.order_number | Prefix "SPE-" |
| order.buyer_username | orders.customer_name | |
| order.total_amount | orders.total_amount | Đã trừ phí sàn |
| order.create_time | orders.order_date | Unix timestamp → datetime |

---

## Quy trình Import

### Bước 1: Chuẩn bị file

1. Tải template mẫu từ hệ thống
2. Điền dữ liệu theo đúng format
3. Kiểm tra encoding UTF-8 (quan trọng với tiếng Việt)

### Bước 2: Upload và validate

1. Truy cập **Tích hợp dữ liệu** → **Import File**
2. Chọn loại dữ liệu cần import
3. Upload file
4. Hệ thống sẽ validate và hiển thị preview

### Bước 3: Xử lý lỗi (nếu có)

| Mã lỗi | Mô tả | Cách xử lý |
|--------|-------|------------|
| `MISSING_REQUIRED` | Thiếu cột bắt buộc | Bổ sung dữ liệu |
| `INVALID_FORMAT` | Sai định dạng | Kiểm tra date/number format |
| `DUPLICATE_KEY` | Trùng mã | Xóa bản ghi trùng hoặc update |
| `FK_NOT_FOUND` | Không tìm thấy liên kết | Kiểm tra customer/vendor tồn tại |

### Bước 4: Confirm import

1. Xem lại tổng số bản ghi sẽ import
2. Xem danh sách cảnh báo (nếu có)
3. Nhấn **Xác nhận Import**

---

## API Integration (Nâng cao)

Hệ thống hỗ trợ tích hợp qua REST API cho các trường hợp:

- Sync realtime từ ERP
- Webhook từ sàn TMĐT
- Scheduled batch import

### Endpoint mẫu

```
POST /api/v1/import/invoices
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "invoices": [
    {
      "invoice_number": "INV-2025-0001",
      "customer_name": "Công ty ABC",
      ...
    }
  ]
}
```

Chi tiết API documentation: [Liên hệ quản trị viên]

---

## Liên hệ hỗ trợ

- **Email:** support@company.com
- **Hotline:** 1900-xxxx
- **Tài liệu:** https://docs.company.com

---

*Phiên bản 2.0 - Cập nhật 01/01/2026*
