

# Auto-Generate Cash Flow Direct tu Du Lieu Don Hang & Thanh Toan

## Van de

Bang `cash_flow_direct` trong **hoan toan** vi thiet ke ban dau yeu cau nhap tay. Nhung he thong da co:
- **1.2M don hang** (cdp_orders) tu Jan 2025 - Feb 2026
- **989K payments** (cdp_payments) tuong ung
- Revenue: ~316 ty VND, Payments: ~279 ty VND

## Giai phap

Tao migration SQL de tu dong sinh 14 ban ghi cash flow monthly (Jan 2025 - Feb 2026) tu du lieu thuc:

### Logic tinh toan

| Field | Nguon du lieu |
|-------|--------------|
| `cash_from_customers` | SUM(amount) tu `cdp_payments` theo thang |
| `cash_to_suppliers` | Uoc tinh = cash_from_customers x COGS_ratio (~27.3%) |
| `cash_to_employees` | Uoc tinh = cash_from_customers x 8% (benchmark retail VN) |
| `cash_for_rent` | Uoc tinh = cash_from_customers x 3% |
| `cash_for_utilities` | Uoc tinh = cash_from_customers x 0.5% |
| `cash_for_taxes` | Uoc tinh = cash_from_customers x 2% |
| `cash_for_other_operating` | Uoc tinh = cash_from_customers x 5% |
| `net_cash_operating` | Tinh = inflows - outflows |
| `opening_cash_balance` | Thang 1 = 0, cac thang sau = closing thang truoc |
| `closing_cash_balance` | opening + net_operating + net_investing + net_financing |
| Investing / Financing | Dat = 0 (khong co du lieu thuc) |

> **Luu y**: Cac ty le (8% luong, 3% thue, ...) la benchmark retail Viet Nam. User co the chinh sua sau khi co du lieu that tu ke toan.

### Ghi chu minh bach

Moi ban ghi se co field `notes` ghi ro: "Tu dong tu cdp_payments. Chi phi la uoc tinh. Can cap nhat tu du lieu ke toan thuc te."

Field `is_actual` = false (danh dau la uoc tinh, khong phai so thuc tu ke toan)

## Chi tiet ky thuat

### Migration SQL

1. Tao CTE lay tong payments theo thang tu `cdp_payments`
2. Ap dung ty le benchmark de uoc tinh chi phi
3. Tinh net_cash_operating, closing_balance lien dong (thang sau = closing thang truoc)
4. INSERT 14 ban ghi vao `public.cash_flow_direct` voi `tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'`

### Khong thay doi code

Trang `CashFlowDirectPage.tsx` va hook `useCashFlowDirect.ts` da san sang - chi can co data la hien thi.

## Ky vong sau fix

| Metric | Truoc | Sau |
|--------|-------|-----|
| Cash Flow records | 0 | 14 (Jan 2025 - Feb 2026) |
| Tong thu | 0 | ~279 ty VND (tu payments) |
| Cash Runway | 0.0 thang | Co so lieu thuc |
| Charts | Trong | Hien waterfall + trend |

