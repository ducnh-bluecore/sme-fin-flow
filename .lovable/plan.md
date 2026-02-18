
# Sắp xếp lại FDP Sidebar: Từ 12 nhóm → 5 nhóm logic

## Hiện trạng thực tế (đã quan sát trực tiếp)

Sidebar hiện tại nhìn từ giao diện có các nhóm sau:

1. **Quyết định hôm nay** (standalone item — lạc lõng)
2. **Tổng quan CFO** → Dashboard, Vị thế tiền mặt, Cash Flow Forecast, Dòng tiền trực tiếp, Vốn lưu động & CCC
3. **Chiến lược & Quyết định** → Executive Summary, Risk Dashboard, Decision Support
4. **Báo cáo tài chính** → P&L, Analysis, Performance, Board Reports, Expenses, Revenue
5. **Kế hoạch & Mô phỏng** → Scenario, Rolling Forecast, Strategic Initiatives
6. **AR/AP** → Quản lý hóa đơn, AR Operations, AP Overview, CN/DN, Đối soát, Exceptions
7. **Vận hành bán lẻ** → Inventory Aging, Allocation, Promotion ROI, Supplier Payments
8. **Kênh bán hàng** → Phân tích kênh, Unit Economics
9. **Data Hub** → Data Center, Data Warehouse, ETL Rules, Chart of Accounts, Bank Connections
10. **Thuế & Tuân thủ** → Tax Compliance, Covenant Tracking
11. **Alerts** (standalone — trùng Control Tower)
12. **Admin** → Company, Members, RBAC, Audit Log
13. **API** (standalone)

**Vấn đề rõ ràng:**
- "Expenses" bị đặt trong "Báo cáo tài chính" — sai logic (expenses là nhập liệu, không phải báo cáo)
- "Supplier Payments" bị đặt trong "Vận hành bán lẻ" — nên ở nhóm nhập liệu
- "Kênh bán hàng" chỉ có 2 items — quá nhỏ, gộp vào Phân tích
- "Chiến lược & Quyết định" và "Kế hoạch & Mô phỏng" có thể gộp thành 1 nhóm
- "Thuế & Tuân thủ" quá niche, ít dùng
- "Alerts" standalone trùng với Control Tower

---

## Cấu trúc 5 nhóm mới

```text
[1] TỔNG QUAN
    Dashboard
    Vị thế tiền mặt
    Cash Flow Forecast
    Dòng tiền trực tiếp
    Vốn lưu động & CCC

[2] PHÂN TÍCH TÀI CHÍNH
    Báo cáo P&L
    Phân tích tổng hợp
    Phân tích hiệu quả
    Phân tích kênh         ← từ "Kênh bán hàng"
    Unit Economics         ← từ "Kênh bán hàng"
    Doanh thu

[3] ĐỐI SOÁT & CÔNG NỢ
    AR Operations
    AP Overview (Hóa đơn mua)
    Đối soát đơn hàng
    Exception Board
    CN/DN Tracking

[4] NHẬP LIỆU & CẤU HÌNH
    Chi phí                ← từ "Báo cáo tài chính"
    Thanh toán NCC         ← từ "Vận hành bán lẻ"
    Kết nối ngân hàng
    Hệ thống tài khoản
    Data Center
    Data Warehouse

[5] KẾ HOẠCH & QUYẾT ĐỊNH
    Kịch bản & What-If
    Rolling Forecast
    Executive Summary      ← từ "Chiến lược"
    Risk Dashboard         ← từ "Chiến lược"
    Hỗ trợ quyết định     ← từ "Chiến lược"
    Quyết định hôm nay    ← standalone item
```

---

## Items bị ẩn khỏi sidebar (giữ routes, không xóa pages)

| Item hiện tại | Lý do ẩn |
|---|---|
| `nav.alerts` standalone | Control Tower đã có alerts hoàn chỉnh hơn |
| `nav.boardReports` | Trùng với Executive Summary |
| `nav.strategicInitiatives` | Ít dùng |
| `nav.inventoryAging` | Đã có trong Bluecore Command |
| `nav.inventoryAllocation` | Đã có trong Bluecore Command |
| `nav.promotionROI` | Đã có trong MDP |
| `nav.taxTracking` | Ẩn vào cuối hoặc Settings |
| `nav.covenantTracking` | Ẩn vào cuối hoặc Settings |
| `nav.etlRules` | Kỹ thuật — gộp vào Data Center |
| `nav.invoiceManagement` | Gộp vào AR Operations |
| `nav.api` standalone | Đưa xuống bottom nav |

---

## Thay đổi label (LanguageContext.tsx)

Cập nhật tên 5 nhóm trong cả tiếng Việt và tiếng Anh:

| Key | Tiếng Việt mới | Tiếng Anh mới |
|---|---|---|
| `nav.cfoOverview` | **Tổng Quan** | **Overview** |
| `nav.financialReports` | **Phân Tích Tài Chính** | **Financial Analysis** |
| `nav.arAp` | **Đối Soát & Công Nợ** | **Reconciliation & AR/AP** |
| `nav.dataHub` | **Nhập Liệu & Cấu Hình** | **Data Input & Config** |
| `nav.planSimulation` | **Kế Hoạch & Quyết Định** | **Planning & Decisions** |

---

## Phạm vi thay đổi kỹ thuật

**File 1: `src/components/layout/Sidebar.tsx`** (thay đổi chính)
- Rewrite `navItems` array (lines 52–168): từ 12 entries → 5 entries với children mới
- Xóa: standalone `nav.decisionCenter`, standalone `nav.alerts`, standalone `nav.api` khỏi navItems
- Thêm `nav.decisionCenter` vào cuối nhóm [5]
- Giữ nguyên: `superAdminItems`, `bottomNavItems`, toàn bộ render logic (không đổi)
- Cập nhật `expandedItems` default: `['nav.cfoOverview']` (đã đúng)

**File 2: `src/contexts/LanguageContext.tsx`** (cập nhật labels)
- Cập nhật 5 label nhóm (tiếng Việt + tiếng Anh)
- Thêm 2 label mới nếu thiếu: `nav.dataInput` và `nav.planningDecisions`

---

## Kết quả sau khi thực hiện

| Trước | Sau |
|---|---|
| 12 nhóm + 1 standalone "Quyết định" | 5 nhóm, logic rõ ràng |
| "Expenses" trong "Báo cáo tài chính" | "Chi phí" trong "Nhập Liệu & Cấu Hình" |
| "Supplier Payments" trong "Vận hành bán lẻ" | "Thanh toán NCC" trong "Nhập Liệu & Cấu Hình" |
| "Kênh bán hàng" chỉ 2 items | Gộp vào "Phân Tích Tài Chính" |
| Inventory items trùng Command | Ẩn khỏi FDP sidebar |
| Alerts trùng Control Tower | Ẩn khỏi FDP sidebar |
| Scroll dài, nhiễu | Gọn, tối đa ~25 items hiển thị |

---

## Rủi ro và lưu ý

- **Không có rủi ro route**: Tất cả routes giữ nguyên — chỉ ẩn khỏi sidebar navigation
- **Admin section**: Giữ nguyên, không thay đổi
- **Bottom nav** (Settings, Help, Portal, Guide): Giữ nguyên
- **Active state**: Logic `isActive` và `hasActiveChild` không thay đổi — sẽ tự hoạt động đúng với navItems mới
