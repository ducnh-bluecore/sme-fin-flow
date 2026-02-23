
# Thay "Gói Quyết Định Chờ Duyệt" bằng Tổng quan Lệch Size + Thanh Lý

## Mục tiêu
Bỏ phần Decision Feed (hiện ít giá trị trên trang Overview) -- thay bằng 2 card tóm tắt giúp CEO/CFO scan nhanh tình trạng hàng lệch size và hàng cần thanh lý.

## Thay đổi UI

Xoá toàn bộ block "Gói Quyết Định Chờ Duyệt" (lines 159-211) và thay bằng **2 card ngang hàng**:

### Card 1: Hàng Lệch Size (Size Intelligence)
- Nguon: `useSizeIntelligenceSummary` (da co san)
- Hien thi:
  - So style bi vo (brokenCount) / tong (totalProducts)
  - Diem suc khoe trung binh (avgHealthScore)
  - Doanh thu mat uoc tinh (totalLostRevenue)
  - Von bi khoa (totalCashLocked)
  - Nut "Xem Chi Tiet" navigate to `/command/assortment`

### Card 2: Thanh Ly (Clearance Intelligence)
- Nguon: `useClearanceCandidates` (da co san)
- Hien thi:
  - So FC can thanh ly (candidates.length)
  - Tong gia tri ton kho cua hang can thanh ly (sum inventory_value)
  - Von khoa trong hang can thanh ly (sum cash_locked)
  - Diem rui ro markdown trung binh
  - Nut "Xem Chi Tiet" navigate to `/command/clearance`

## Bo cuc
```text
+-----------------------------+-----------------------------+
|   Hàng Lệch Size           |   Thanh Lý                  |
|   307 style vỡ / 1,932     |   42 FC cần thanh lý        |
|   Health: 54.2              |   Giá trị: 12.5B            |
|   Mất DT: 8.2B             |   Vốn khóa: 2.1B           |
|   Vốn khóa: 3.0B           |   Risk TB: 72.3             |
|   [Xem Chi Tiết →]         |   [Xem Chi Tiết →]         |
+-----------------------------+-----------------------------+
```

## Chi tiet ky thuat

### File: `src/pages/command/CommandOverviewPage.tsx`
1. Xoa query `pendingPackages` (dec_decision_packages) -- khong can nua
2. Xoa KPI card "Cho Quyet Dinh"
3. Import `useClearanceCandidates` tu `@/hooks/inventory/useClearanceIntelligence`
4. Tinh toan summary tu clearance candidates: totalValue, totalCashLocked, avgRisk, count
5. Thay block Decision Feed bang 2 card grid `lg:grid-cols-2`
6. Moi card co icon, so lieu chinh, va Button navigate

### Dependencies
- Khong can them bang hay RPC moi -- tat ca data da co san
- `useSizeIntelligenceSummary` da duoc import
- `useClearanceCandidates` da co san trong `useClearanceIntelligence.ts`
