# 📊 Tài liệu Mô tả Tính năng Hệ thống CFO Dashboard

> **Phiên bản:** 2.0  
> **Cập nhật:** 2025-01-08

---

## 📑 Mục lục

1. [Dashboard KPIs](#1-dashboard-kpis)
2. [Quản lý Hóa đơn (AR)](#2-quản-lý-hóa-đơn-ar)
3. [Quản lý Công nợ phải trả (AP)](#3-quản-lý-công-nợ-phải-trả-ap)
4. [Dự báo Dòng tiền](#4-dự-báo-dòng-tiền)
5. [Đối soát Ecommerce](#5-đối-soát-ecommerce)
6. [Phân tích Kênh bán hàng](#6-phân-tích-kênh-bán-hàng)
7. [Quản lý Rủi ro](#7-quản-lý-rủi-ro)
8. [Ngân sách & Kế hoạch](#8-ngân-sách--kế-hoạch)
9. [Báo cáo P&L](#9-báo-cáo-pl)
10. [Phân bổ Vốn](#10-phân-bổ-vốn)
11. [What-If Analysis](#11-what-if-analysis)
12. [Decision Support](#12-decision-support)
13. [Covenant Tracking](#13-covenant-tracking)
14. [AI Insights](#14-ai-insights)

---

## 1. Dashboard KPIs

### 1.1 Tiền mặt hiện tại (Cash Today)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `bank_accounts` table |
| **Hook** | `useDashboardKPICache`, `useKPIData` |
| **Công thức** | `SUM(current_balance)` từ tất cả tài khoản ngân hàng có `status = 'active'` |
| **Tác dụng** | Hiển thị tổng số dư tiền mặt hiện có trong tất cả tài khoản ngân hàng |

```sql
SELECT SUM(current_balance) as cash_today 
FROM bank_accounts 
WHERE tenant_id = ? AND status = 'active'
```

### 1.2 Tổng Công nợ phải thu (Total AR)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `invoices` table |
| **Hook** | `useDashboardKPICache`, `useInvoiceData` |
| **Công thức** | `SUM(total_amount - paid_amount)` cho hóa đơn chưa thanh toán hết |
| **Tác dụng** | Tổng số tiền khách hàng còn nợ công ty |

```sql
SELECT SUM(total_amount - COALESCE(paid_amount, 0)) as total_ar
FROM invoices 
WHERE tenant_id = ? 
  AND status NOT IN ('paid', 'cancelled')
```

### 1.3 Công nợ quá hạn (Overdue AR)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `invoices` table |
| **Hook** | `useDashboardKPICache` |
| **Công thức** | `SUM(total_amount - paid_amount)` cho hóa đơn có `due_date < TODAY` |
| **Tác dụng** | Số tiền công nợ đã quá hạn thanh toán - cần ưu tiên thu hồi |

```sql
SELECT SUM(total_amount - COALESCE(paid_amount, 0)) as overdue_ar
FROM invoices 
WHERE tenant_id = ? 
  AND status = 'overdue'
  AND due_date < CURRENT_DATE
```

### 1.4 DSO (Days Sales Outstanding)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `invoices` table |
| **Hook** | `useFinancialMetrics` |
| **Công thức** | `(Total AR / Doanh thu trung bình ngày)` |
| **Tác dụng** | Số ngày trung bình để thu được tiền từ khách hàng |

```
DSO = (Tổng AR / (Doanh thu 90 ngày / 90)) 
    = (Tổng AR × 90) / Doanh thu 90 ngày
```

**Đánh giá:**
- DSO ≤ 30 ngày: Tốt
- DSO 31-45 ngày: Trung bình
- DSO 46-60 ngày: Cần cải thiện
- DSO > 60 ngày: Rủi ro cao

### 1.5 DPO (Days Payable Outstanding)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `bills` table |
| **Hook** | `useFinancialMetrics` |
| **Công thức** | `(Total AP / Chi phí mua hàng trung bình ngày)` |
| **Tác dụng** | Số ngày trung bình để thanh toán cho nhà cung cấp |

```
DPO = (Tổng AP × 90) / Tổng chi phí mua hàng 90 ngày
```

### 1.6 DIO (Days Inventory Outstanding)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `products` table (inventory value) |
| **Hook** | `useFinancialMetrics` |
| **Công thức** | `(Giá trị tồn kho / Giá vốn hàng bán trung bình ngày)` |
| **Tác dụng** | Số ngày trung bình tồn kho trước khi bán được |

```
DIO = (Giá trị tồn kho × 90) / COGS 90 ngày
```

### 1.7 CCC (Cash Conversion Cycle)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | Tổng hợp từ DSO, DPO, DIO |
| **Hook** | `useFinancialMetrics`, `useCashConversionCycle` |
| **Công thức** | `CCC = DSO + DIO - DPO` |
| **Tác dụng** | Số ngày để chuyển đổi đầu tư vào hàng tồn kho thành tiền mặt |

```
CCC = DSO + DIO - DPO

Ví dụ:
- DSO = 45 ngày (thu tiền từ khách)
- DIO = 30 ngày (bán hàng tồn kho)
- DPO = 35 ngày (trả nhà cung cấp)
→ CCC = 45 + 30 - 35 = 40 ngày
```

**Đánh giá:**
- CCC < 30 ngày: Xuất sắc
- CCC 30-60 ngày: Tốt
- CCC 60-90 ngày: Trung bình
- CCC > 90 ngày: Cần cải thiện

### 1.8 Gross Margin

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `invoices`, `external_orders` |
| **Hook** | `useDashboardKPICache` |
| **Công thức** | `((Doanh thu - COGS) / Doanh thu) × 100%` |
| **Tác dụng** | Tỷ suất lợi nhuận gộp - đo lường hiệu quả sản xuất/mua hàng |

```
Gross Margin = ((Revenue - COGS) / Revenue) × 100%
```

### 1.9 EBITDA

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `invoices`, `bills`, `expenses` |
| **Hook** | `useDashboardKPICache` |
| **Công thức** | `Doanh thu - Chi phí hoạt động (không bao gồm lãi vay, thuế, khấu hao)` |
| **Tác dụng** | Lợi nhuận trước lãi vay, thuế, khấu hao - đo lường khả năng sinh lời |

---

## 2. Quản lý Hóa đơn (AR)

### 2.1 Danh sách Hóa đơn

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `invoices`, `invoice_items`, `customers` |
| **Hook** | `useInvoiceData` |
| **Tác dụng** | Hiển thị và quản lý tất cả hóa đơn bán hàng |

**Trạng thái hóa đơn:**
- `draft`: Nháp
- `sent`: Đã gửi
- `paid`: Đã thanh toán
- `partial`: Thanh toán một phần
- `overdue`: Quá hạn
- `cancelled`: Đã hủy

### 2.2 AR Aging (Phân tích tuổi nợ)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `ar_aging` view |
| **Hook** | `useInvoiceData` |
| **Công thức** | Phân loại theo số ngày quá hạn |
| **Tác dụng** | Phân tích rủi ro theo thời gian quá hạn |

**Phân loại tuổi nợ:**
```
- Hiện tại (0 ngày): due_date >= TODAY
- 1-30 ngày: 1 <= days_overdue <= 30
- 31-60 ngày: 31 <= days_overdue <= 60
- 61-90 ngày: 61 <= days_overdue <= 90
- >90 ngày: days_overdue > 90
```

### 2.3 Credit Notes (Giấy báo có)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `credit_notes`, `credit_note_items` |
| **Hook** | `useCreditDebitNotes` |
| **Tác dụng** | Quản lý giảm trừ công nợ (trả hàng, giảm giá) |

---

## 3. Quản lý Công nợ phải trả (AP)

### 3.1 Danh sách Bills

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `bills`, `bill_items`, `vendors` |
| **Hook** | `useBillsData` |
| **Tác dụng** | Quản lý hóa đơn mua hàng từ nhà cung cấp |

### 3.2 AP Aging

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `ap_aging` view |
| **Hook** | `useBillsData` |
| **Tác dụng** | Phân tích công nợ phải trả theo thời gian |

---

## 4. Dự báo Dòng tiền

### 4.1 Cash Runway

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `bank_accounts`, `cash_forecasts`, `bills` |
| **Hook** | `useCashRunway` |
| **Công thức** | `Tiền mặt hiện tại / Chi phí trung bình tháng` |
| **Tác dụng** | Số tháng công ty có thể hoạt động với tiền mặt hiện có |

```
Cash Runway = Current Cash / Monthly Burn Rate

Ví dụ:
- Tiền mặt: 5 tỷ VND
- Chi phí/tháng: 500 triệu VND
→ Runway = 5,000 / 500 = 10 tháng
```

**Đánh giá rủi ro:**
- ≥ 12 tháng: Rủi ro thấp (20%)
- 6-12 tháng: Rủi ro trung bình (40%)
- 3-6 tháng: Rủi ro cao (60%)
- 1-3 tháng: Rủi ro rất cao (80%)
- < 1 tháng: Rủi ro nghiêm trọng (95%)

### 4.2 Daily Forecast

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `cash_forecasts` |
| **Hook** | `useCashForecasts` |
| **Tác dụng** | Dự báo dòng tiền theo ngày trong 30 ngày tới |

### 4.3 Weekly Forecast

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `cash_forecasts` |
| **Hook** | `useWeeklyCashForecast` |
| **Tác dụng** | Dự báo dòng tiền theo tuần trong 13 tuần tới |

### 4.4 Rolling Forecast

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `forecast_inputs`, `invoices`, `bills` |
| **Hook** | `useRollingForecast` |
| **Tác dụng** | Dự báo liên tục cập nhật theo dữ liệu thực tế |

---

## 5. Đối soát Ecommerce

### 5.1 Danh sách Đơn hàng Ecommerce

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `external_orders` |
| **Hook** | `useEcommerceReconciliation` → `useEcommerceOrders` |
| **Điều kiện lọc** | `order_type IN ('shopee', 'lazada', 'tiktok', 'tiki', 'sendo')` |
| **Tác dụng** | Hiển thị đơn hàng từ các sàn TMĐT để đối soát |

**Mapping kênh:**
```typescript
const channelMap: Record<string, string> = {
  shopee: 'Shopee',
  lazada: 'Lazada',
  tiktok: 'TikTok Shop',
  tiki: 'Tiki',
  sendo: 'Sendo'
};
```

**Trạng thái đơn hàng:**
| order_status | Label hiển thị |
|--------------|----------------|
| `pending` | Chờ xử lý |
| `processing` | Đang xử lý |
| `shipped` | Đang giao |
| `delivered` | Đã giao |
| `completed` | Hoàn thành |
| `cancelled` | Đã hủy |
| `returned` | Hoàn trả |

### 5.2 Danh sách Đơn vận chuyển

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `external_orders` |
| **Hook** | `useEcommerceReconciliation` → `useShippingOrders` |
| **Điều kiện lọc** | `order_type IN ('ghn', 'ghtk', 'viettelpost', 'jt', 'ninja_van', 'best')` |
| **Tác dụng** | Hiển thị đơn từ đơn vị vận chuyển để đối soát |

**Mapping đơn vị vận chuyển:**
```typescript
const carrierMap: Record<string, string> = {
  ghn: 'Giao Hàng Nhanh',
  ghtk: 'Giao Hàng Tiết Kiệm',
  viettelpost: 'Viettel Post',
  jt: 'J&T Express',
  ninja_van: 'Ninja Van',
  best: 'BEST Express'
};
```

### 5.3 Settlement (Đối soát thanh toán)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `channel_settlements` |
| **Hook** | `useEcommerceReconciliation` → `useChannelSettlements` |
| **Tác dụng** | Đối soát tiền thanh toán từ sàn/đơn vị vận chuyển |

**Thông tin Settlement:**
```typescript
interface SettlementRecord {
  id: string;
  settlementId: string;        // Mã đợt thanh toán
  periodStart: string;         // Ngày bắt đầu kỳ
  periodEnd: string;           // Ngày kết thúc kỳ
  grossSales: number;          // Doanh thu gộp
  totalFees: number;           // Tổng phí
  totalCommission: number;     // Phí hoa hồng
  totalShippingFee: number;    // Phí vận chuyển
  netAmount: number;           // Số tiền thực nhận
  status: string;              // pending, processed, paid
  isReconciled: boolean;       // Đã đối soát chưa
  channel: string;             // Tên kênh (Shopee, Lazada, ...)
}
```

### 5.4 Thống kê Đối soát

| Thuộc tính | Giá trị |
|------------|---------|
| **Hook** | `useEcommerceReconciliation` → `useReconciliationStats` |
| **Nguồn dữ liệu** | Tổng hợp từ `external_orders` và `channel_settlements` |

**Công thức:**
```typescript
{
  totalOrders: COUNT(external_orders),
  reconciledOrders: COUNT(WHERE is_reconciled = true),
  pendingOrders: COUNT(WHERE is_reconciled = false),
  matchRate: (reconciledOrders / totalOrders) × 100%,
  totalSettlements: COUNT(channel_settlements),
  reconciledSettlements: COUNT(WHERE is_reconciled = true)
}
```

### 5.5 Đánh dấu đã đối soát

| Thuộc tính | Giá trị |
|------------|---------|
| **Hook** | `useMarkOrderReconciled`, `useMarkSettlementReconciled` |
| **Mutation** | UPDATE `external_orders` / `channel_settlements` SET `is_reconciled = true` |

---

## 6. Phân tích Kênh bán hàng

### 6.1 Channel Analytics Overview

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `channel_analytics_cache`, `external_orders` |
| **Hook** | `useChannelAnalyticsCache`, `useChannelAnalytics` |
| **Tác dụng** | Tổng quan hiệu suất các kênh bán hàng |

**Metrics theo kênh:**
```typescript
interface ChannelMetrics {
  channel: string;           // Tên kênh (Shopee, Lazada, ...)
  orders: number;            // Số đơn hàng
  revenue: number;           // Doanh thu
  fees: number;              // Tổng phí
  cogs: number;              // Giá vốn
  profit: number;            // Lợi nhuận
  aov: number;               // Giá trị đơn trung bình
  margin: number;            // Tỷ suất lợi nhuận (%)
}
```

### 6.2 Channel P&L

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `external_orders`, `channel_fees` |
| **Hook** | `useChannelPL`, `useAllChannelsPL` |
| **Tác dụng** | Báo cáo lãi lỗ theo từng kênh bán hàng |

**Công thức P&L:**
```
Gross Revenue = SUM(order_value)
- Platform Commission = SUM(commission_fee)
- Payment Fee = SUM(payment_fee)
- Shipping Fee = SUM(shipping_fee)
- Other Fees = SUM(service_fee + ads_fee)
= Net Revenue

- COGS = SUM(cogs_amount)
= Gross Profit

Gross Margin = (Gross Profit / Net Revenue) × 100%
```

### 6.3 Fee Breakdown

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `channel_fees` |
| **Tác dụng** | Chi tiết các loại phí từng kênh |

**Loại phí:**
| fee_type | Mô tả |
|----------|-------|
| `commission` | Hoa hồng sàn |
| `payment_fee` | Phí thanh toán |
| `shipping_fee` | Phí vận chuyển |
| `service_fee` | Phí dịch vụ |
| `ads_fee` | Phí quảng cáo |
| `penalty` | Phí phạt |

---

## 7. Quản lý Rủi ro

### 7.1 Risk Scores

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | Tổng hợp từ nhiều nguồn |
| **Hook** | `useRiskScores` |
| **File** | `src/hooks/useRiskScores.ts` |
| **Tác dụng** | Đánh giá mức độ rủi ro tổng thể (0 = không rủi ro, 100 = rủi ro cao nhất) |

**Các loại rủi ro và công thức:**

#### a) Rủi ro Thanh khoản (Liquidity Risk)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `useCashRunway` → `bank_accounts`, `bills` |
| **Tiêu chí** | Số tháng Cash Runway |

```typescript
// Công thức tính score (0-100)
if (runwayMonths >= 12) liquidityScore = 20;      // Rủi ro thấp
else if (runwayMonths >= 6) liquidityScore = 40;  // Trung bình
else if (runwayMonths >= 3) liquidityScore = 60;  // Cao
else if (runwayMonths >= 1) liquidityScore = 80;  // Rất cao
else liquidityScore = 95;                          // Nghiêm trọng
```

#### b) Rủi ro Tín dụng (Credit Risk)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `useDashboardKPICache` → `invoices` |
| **Tiêu chí** | DSO + Tỷ lệ AR quá hạn |

```typescript
// DSO component (max 50 điểm)
dsoScore = 
  dso <= 30 ? 10 :    // Tốt
  dso <= 45 ? 25 :    // Trung bình
  dso <= 60 ? 35 :    // Cần cải thiện
  50;                  // Rủi ro cao

// Overdue AR component (max 50 điểm)
overduePercent = (overdueAR / totalAR) × 100;
overdueScore = 
  overduePercent <= 5 ? 10 :   // Rất tốt
  overduePercent <= 15 ? 25 :  // Tốt
  overduePercent <= 30 ? 40 :  // Cần theo dõi
  50;                           // Rủi ro cao

creditScore = dsoScore + overdueScore; // Max 100
```

#### c) Rủi ro Thị trường (Market Risk)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `useChannelAnalyticsCache` → `channel_analytics_cache` |
| **Tiêu chí** | Độ tập trung kênh bán hàng |

```typescript
// Tính tỷ lệ tập trung
topChannelRevenue = MAX(channel.revenue);
totalRevenue = SUM(all channels.revenue);
concentration = (topChannelRevenue / totalRevenue) × 100;

// Đánh giá
marketScore = 
  concentration <= 30 ? 25 :   // Đa dạng tốt
  concentration <= 50 ? 45 :   // Tập trung vừa
  concentration <= 70 ? 65 :   // Tập trung cao
  85;                          // Phụ thuộc quá nhiều vào 1 kênh
```

#### d) Rủi ro Hoạt động (Operational Risk)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `useDashboardKPICache` |
| **Tiêu chí** | CCC + Gross Margin |

```typescript
// CCC component (max 50 điểm)
cccScore = 
  ccc <= 30 ? 10 :    // Xuất sắc
  ccc <= 60 ? 25 :    // Tốt
  ccc <= 90 ? 35 :    // Trung bình
  50;                  // Kém

// Gross Margin component (max 50 điểm)
marginScore = 
  grossMargin >= 40 ? 10 :   // Biên cao
  grossMargin >= 25 ? 20 :   // Tốt
  grossMargin >= 15 ? 35 :   // Thấp
  50;                         // Rất thấp

operationalScore = cccScore + marginScore;
```

#### e) Rủi ro Tuân thủ (Compliance Risk)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | Đánh giá mặc định |
| **Score mặc định** | 30 (rủi ro thấp nếu không có vi phạm covenant) |

#### f) Rủi ro Chiến lược (Strategic Risk)

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | Tổng hợp từ các rủi ro khác |
| **Công thức** | `MIN(85, MAX(30, avgOtherScores × 0.8 + 20))` |

```typescript
avgOtherScores = AVERAGE(liquidity, credit, market, operational, compliance);
strategicScore = MIN(85, MAX(30, avgOtherScores × 0.8 + 20));
```

### 7.2 Risk Summary Statistics

| Thuộc tính | Giá trị |
|------------|---------|
| **Hook** | `useRiskScores` |
| **Output** | Số lượng chỉ số theo mức rủi ro |

```typescript
interface RiskSummary {
  riskScores: RiskScore[];     // 6 loại rủi ro
  lowCount: number;            // Số chỉ số < 40
  mediumCount: number;         // Số chỉ số 40-59
  highCount: number;           // Số chỉ số 60-79
  criticalCount: number;       // Số chỉ số >= 80
  averageScore: number;        // Điểm trung bình
  isLoading: boolean;
}
```

### 7.3 Stress Testing

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | Mô phỏng trên dữ liệu thực |
| **Hook** | `useMonteCarloSimulation` |
| **Tác dụng** | Kiểm tra khả năng chịu đựng trong các kịch bản xấu |

**Kịch bản stress test:**
1. Doanh thu giảm 20%
2. Chi phí tăng 15%
3. DSO tăng 30 ngày
4. Mất khách hàng lớn nhất
5. Suy thoái kinh tế

---

## 8. Ngân sách & Kế hoạch

### 8.1 Budget vs Actual

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `budgets`, `invoices`, `bills`, `expenses` |
| **Hook** | `useScenarioBudgetData` |
| **Tác dụng** | So sánh ngân sách với thực tế |

**Công thức Variance:**
```
Variance Amount = Actual - Budget
Variance % = ((Actual - Budget) / Budget) × 100%

Đánh giá:
- Variance > 0: Vượt ngân sách (đỏ cho chi phí, xanh cho doanh thu)
- Variance < 0: Dưới ngân sách (xanh cho chi phí, đỏ cho doanh thu)
- Variance ±5%: Chấp nhận được
```

### 8.2 Monthly Plan

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `monthly_plans` |
| **Hook** | `useMonthlyPlans` |
| **Tác dụng** | Kế hoạch chi tiết theo tháng |

### 8.3 Scenario Planning

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `scenarios`, `scenario_items` |
| **Hook** | `useScenarioData` |
| **Tác dụng** | Lập kế hoạch theo nhiều kịch bản (Best/Base/Worst) |

---

## 9. Báo cáo P&L

### 9.1 P&L Summary

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `invoices`, `bills`, `expenses`, `external_orders` |
| **Hook** | `usePLData`, `usePLCache` |
| **Tác dụng** | Báo cáo lãi lỗ tổng hợp |

**Cấu trúc P&L:**
```
Doanh thu thuần (Net Revenue)
  - Doanh thu bán hàng
  - Doanh thu dịch vụ
  - Doanh thu khác

(-) Giá vốn hàng bán (COGS)
  = Lợi nhuận gộp (Gross Profit)
  
(-) Chi phí hoạt động (Operating Expenses)
  - Chi phí bán hàng
  - Chi phí quản lý
  - Chi phí marketing
  = EBITDA

(-) Khấu hao & Lãi vay
  = Lợi nhuận trước thuế (EBT)

(-) Thuế TNDN
  = Lợi nhuận sau thuế (Net Income)
```

### 9.2 Variance Analysis

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `budgets`, thực tế từ các bảng giao dịch |
| **Hook** | `useVarianceAnalysis` |
| **Tác dụng** | Phân tích biến động so với kế hoạch |

---

## 10. Phân bổ Vốn

### 10.1 CapEx Projects

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `capex_projects` |
| **Hook** | `useCapexProjects` |
| **File** | `src/hooks/useCapexProjects.ts` |
| **Tác dụng** | Quản lý dự án đầu tư vốn |

**Schema:**
```typescript
interface CapexProject {
  id: string;
  name: string;              // Tên dự án
  category: string;          // technology, equipment, facility, r_and_d, other
  budget: number;            // Ngân sách
  spent: number;             // Đã chi
  expected_roi: number;      // ROI kỳ vọng (%)
  actual_roi: number;        // ROI thực tế (%)
  payback_months: number;    // Thời gian hoàn vốn (tháng)
  status: string;            // pending, approved, in_progress, completed, cancelled
  start_date: string;
  end_date: string;
  description: string;
  notes: string;
}
```

**Công thức:**
```
Utilization = (Spent / Budget) × 100%
ROI = ((Total Returns - Investment) / Investment) × 100%
Payback Period = Investment / Annual Cash Flow (months)
```

### 10.2 Investments

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `investments` |
| **Hook** | `useInvestments` |
| **File** | `src/hooks/useInvestments.ts` |
| **Tác dụng** | Theo dõi các khoản đầu tư tài chính |

**Schema:**
```typescript
interface Investment {
  id: string;
  name: string;
  investment_type: string;   // stocks, bonds, real_estate, deposits, other
  initial_amount: number;    // Số tiền đầu tư ban đầu
  current_value: number;     // Giá trị hiện tại
  purchase_date: string;
  maturity_date: string;
  expected_return: number;   // Lợi nhuận kỳ vọng (%)
  actual_return: number;     // Lợi nhuận thực tế (%)
  status: string;            // active, matured, sold
  notes: string;
}
```

---

## 11. What-If Analysis

### 11.1 Retail Scenario Simulation

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `external_orders`, `channel_analytics_cache` |
| **Hook** | `useWhatIfScenarios`, `useWhatIfRealData` |
| **Tác dụng** | Mô phỏng thay đổi doanh thu/chi phí |

**Tham số đầu vào:**
```typescript
interface WhatIfParams {
  revenueChange: number;      // % thay đổi doanh thu
  cogsChange: number;         // % thay đổi giá vốn
  commissionChange: number;   // % thay đổi hoa hồng
  marketingChange: number;    // % thay đổi chi phí marketing
  operatingChange: number;    // % thay đổi chi phí vận hành
}
```

**Công thức mô phỏng:**
```
New Revenue = Base Revenue × (1 + revenueChange/100)
New COGS = Base COGS × (1 + cogsChange/100)
New Fees = Base Fees × (1 + commissionChange/100)
New Profit = New Revenue - New COGS - New Fees - New Operating

Profit Change = ((New Profit - Base Profit) / Base Profit) × 100%
```

### 11.2 SKU Profitability

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `external_order_items`, `products` |
| **Hook** | `useWhatIfRealData` |
| **Tác dụng** | Phân tích lợi nhuận theo sản phẩm |

### 11.3 Geographic Analysis

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `external_orders` (shipping_province) |
| **Tác dụng** | Phân tích doanh thu theo vùng địa lý |

---

## 12. Decision Support

### 12.1 ROI Analysis

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | User input |
| **Hook** | `useDecisionAnalyses` |
| **Tác dụng** | Phân tích ROI cho quyết định đầu tư |

**Công thức:**
```
ROI = ((Total Benefits - Total Costs) / Total Costs) × 100%
Annual ROI = ROI / Years
```

### 12.2 NPV & IRR Analysis

| Thuộc tính | Giá trị |
|------------|---------|
| **Công thức NPV** | `NPV = Σ(CFt / (1+r)^t) - Initial Investment` |
| **Công thức IRR** | Tỷ suất r sao cho NPV = 0 |

```
NPV = -C0 + CF1/(1+r)¹ + CF2/(1+r)² + ... + CFn/(1+r)ⁿ

Trong đó:
- C0: Vốn đầu tư ban đầu
- CFt: Dòng tiền năm t
- r: Tỷ suất chiết khấu
- n: Số năm

Đánh giá:
- NPV > 0: Dự án khả thi
- IRR > Cost of Capital: Nên đầu tư
```

### 12.3 Payback Analysis

| Thuộc tính | Giá trị |
|------------|---------|
| **Công thức** | Thời gian để thu hồi vốn đầu tư |

```
Simple Payback = Initial Investment / Annual Cash Flow

Discounted Payback = Số năm để cumulative discounted cash flow ≥ 0
```

### 12.4 Sensitivity Analysis

| Thuộc tính | Giá trị |
|------------|---------|
| **Tác dụng** | Phân tích độ nhạy của kết quả với các biến đầu vào |

---

## 13. Covenant Tracking

### 13.1 Bank Covenants

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | `bank_covenants`, `covenant_measurements` |
| **Hook** | `useCovenantTracking` |
| **Tác dụng** | Theo dõi tuân thủ điều khoản vay ngân hàng |

**Schema:**
```typescript
interface BankCovenant {
  covenant_type: string;      // ratio, minimum, maximum
  covenant_name: string;      // Current Ratio, Debt/Equity, ...
  threshold_value: number;    // Ngưỡng yêu cầu
  threshold_operator: string; // >=, <=, =
  current_value: number;      // Giá trị hiện tại
  status: string;             // compliant, warning, breach
  warning_threshold: number;  // Ngưỡng cảnh báo
  lender_name: string;        // Tên ngân hàng
  measurement_frequency: string; // monthly, quarterly
}
```

**Công thức các Covenant phổ biến:**
```
Current Ratio = Current Assets / Current Liabilities
Quick Ratio = (Current Assets - Inventory) / Current Liabilities
Debt/Equity = Total Debt / Total Equity
Interest Coverage = EBIT / Interest Expense
Debt Service Coverage = (Net Income + Depreciation) / (Principal + Interest)
```

---

## 14. AI Insights

### 14.1 Contextual AI Analysis

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn dữ liệu** | Tổng hợp từ tất cả các nguồn |
| **Edge Function** | `analyze-contextual` |
| **Hook** | `useAIInsights` |
| **Tác dụng** | Phân tích AI theo ngữ cảnh trang hiện tại |

### 14.2 Decision Advisor

| Thuộc tính | Giá trị |
|------------|---------|
| **Edge Function** | `decision-advisor` |
| **Tác dụng** | Tư vấn AI cho quyết định tài chính |

### 14.3 What-If Chatbot

| Thuộc tính | Giá trị |
|------------|---------|
| **Edge Function** | `whatif-chat` |
| **Tác dụng** | Hỏi đáp về mô phỏng kịch bản |

### 14.4 Budget Optimization

| Thuộc tính | Giá trị |
|------------|---------|
| **Edge Function** | `optimize-channel-budget` |
| **Tác dụng** | Đề xuất phân bổ ngân sách tối ưu theo kênh |

---

## 📋 Bảng tổng hợp Nguồn dữ liệu

| Bảng dữ liệu | Mô tả | Hooks sử dụng |
|--------------|-------|---------------|
| `bank_accounts` | Tài khoản ngân hàng | `useBankData`, `useDashboardKPICache` |
| `bank_transactions` | Giao dịch ngân hàng | `useBankData`, `useReconciliation` |
| `invoices` | Hóa đơn bán hàng | `useInvoiceData`, `useKPIData` |
| `invoice_items` | Chi tiết hóa đơn | `useInvoiceData` |
| `bills` | Hóa đơn mua hàng | `useBillsData` |
| `bill_items` | Chi tiết hóa đơn mua | `useBillsData` |
| `customers` | Khách hàng | `useCustomersData` |
| `vendors` | Nhà cung cấp | `useBillsData` |
| `products` | Sản phẩm | `useOrders` |
| `external_orders` | Đơn hàng Ecommerce | `useEcommerceReconciliation`, `useChannelAnalytics` |
| `external_order_items` | Chi tiết đơn hàng | `useOrders` |
| `channel_fees` | Phí kênh bán | `useChannelPL` |
| `channel_settlements` | Đối soát thanh toán | `useEcommerceReconciliation` |
| `channel_analytics_cache` | Cache phân tích kênh | `useChannelAnalyticsCache` |
| `cash_forecasts` | Dự báo dòng tiền | `useCashForecasts` |
| `budgets` | Ngân sách | `useScenarioBudgetData` |
| `capex_projects` | Dự án CapEx | `useCapexProjects` |
| `investments` | Đầu tư | `useInvestments` |
| `bank_covenants` | Covenant ngân hàng | `useCovenantTracking` |
| `decision_analyses` | Phân tích quyết định | `useDecisionAnalyses` |
| `alerts` | Cảnh báo | `useAlertsData` |
| `audit_logs` | Nhật ký hoạt động | `useAuditLogs` |

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                              │
├─────────────────────────────────────────────────────────────────┤
│  Ecommerce APIs     Bank APIs      Manual Input    BigQuery     │
│  (Shopee, Lazada)   (VCB, TCB)    (Invoices)      (Warehouse)   │
└─────────────┬───────────┬──────────────┬──────────────┬─────────┘
              │           │              │              │
              ▼           ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE DATABASE                            │
├─────────────────────────────────────────────────────────────────┤
│  external_orders   bank_transactions   invoices    bigquery_*   │
│  channel_fees      bank_accounts       bills       sync tables  │
│  settlements       covenants           expenses                  │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REACT QUERY HOOKS                             │
├─────────────────────────────────────────────────────────────────┤
│  useInvoiceData    useBankData      useChannelAnalytics         │
│  useBillsData      useCashForecasts useEcommerceReconciliation  │
│  useKPIData        useRiskScores    useCovenantTracking         │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     UI COMPONENTS                                │
├─────────────────────────────────────────────────────────────────┤
│  Dashboard      Reports       Charts        Tables      Dialogs │
│  KPI Cards      P&L          Forecasts     AR Aging    Alerts   │
└─────────────────────────────────────────────────────────────────┘
```

---

> **Lưu ý:** Tài liệu này mô tả chi tiết tất cả tính năng, nguồn dữ liệu và công thức tính toán trong hệ thống.
> Cập nhật lần cuối: 2025-01-08
