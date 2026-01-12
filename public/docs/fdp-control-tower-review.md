# FDP & CONTROL TOWER - ĐÁNH GIÁ THEO ĐỊNH HƯỚNG MỚI

> **Ngày đánh giá**: 2026-01-12
> **Phiên bản**: 1.0

---

## I. ĐỊNH VỊ CHIẾN LƯỢC

| Hệ thống | Định nghĩa mới | Định nghĩa hiện tại | Gap |
|----------|---------------|---------------------|-----|
| **FDP** | Financial Truth Engine | CFO Dashboard + báo cáo | ❌ Đang làm quá nhiều, chưa focus vào "sự thật" |
| **Control Tower** | Business Alert & Decision Engine | Dashboard realtime + KPI | ❌ Đang là dashboard, chưa là alert engine |

---

## II. FDP - ĐÁNH GIÁ THEO 4 NHÓM CHỨC NĂNG

### 1. Financial TRUTH Layer (BẮT BUỘC)

| Yêu cầu | Hiện trạng | Trạng thái | Ghi chú |
|---------|------------|------------|---------|
| **Net Revenue (sau phí sàn, ads, payment, logistics)** | ChannelPLPage có phân tích phí kênh | ⚠️ Một phần | Có tổng hợp nhưng chưa thành "1 sự thật duy nhất" |
| **Channel Contribution Margin** | UnitEconomicsPage + ChannelPLPage | ✅ Có | Đầy đủ công thức CM/order |
| **SKU Contribution Margin** | UnitEconomicsPage (tab channel) | ⚠️ Một phần | Có theo channel, chưa sâu theo SKU |
| **Customer Contribution Margin** | UnitEconomicsPage (LTV/CAC) | ⚠️ Một phần | Có LTV nhưng chưa phân cohort rõ |
| **Cash position thời gian thực** | CFODashboard (cashOnHand) | ✅ Có | Có tiền thật từ bank_accounts |
| **Tiền "ảo" (AR chưa về)** | CFODashboard (overdueAR) | ✅ Có | Có tracking AR aging |
| **Reconciliation (đơn ↔ thanh toán ↔ ngân hàng)** | ReconciliationHubPage | ✅ Có | Đầy đủ |

**Đánh giá**: 5/7 ✅ - Cần consolidate vào "1 nguồn sự thật duy nhất"

### 2. Cash Control & Runway (CFO đau nhất)

| Yêu cầu | Hiện trạng | Trạng thái | Ghi chú |
|---------|------------|------------|---------|
| **Daily cash position** | CFODashboard + CashForecastPage | ✅ Có | DailyForecastView |
| **Cash inflow/outflow forecast (30-90 ngày)** | CashForecastPage | ✅ Có | Có cả daily và weekly view |
| **Cash runway theo hiện trạng** | useCashRunway hook | ✅ Có | Tính runwayMonths, runwayDays |
| **Cash runway theo kịch bản (what-if)** | ScenarioPlanner + ChannelWhatIfPage | ⚠️ Một phần | Có scenario nhưng chưa link trực tiếp vào runway |
| **Burn rate thật (không phải kế toán)** | useCashRunway (avgMonthlyBurn) | ✅ Có | Tính từ bills + expenses thực tế |

**Đánh giá**: 4/5 ✅ - Khá tốt, cần link what-if → runway

### 3. Unit Economics (KHÓ COPY)

| Yêu cầu | Hiện trạng | Trạng thái | Ghi chú |
|---------|------------|------------|---------|
| **Unit economics theo SKU** | UnitEconomicsPage | ⚠️ Một phần | Có tab channel nhưng chưa sâu SKU |
| **Unit economics theo kênh** | ChannelPLPage + UnitEconomicsPage | ✅ Có | Đầy đủ per channel |
| **Unit economics theo cohort khách hàng** | UnitEconomicsPage (customer tab) | ⚠️ Một phần | Có LTV/CAC, chưa có cohort analysis |
| **Break-even analysis SKU** | ❌ Không có | ❌ Thiếu | Cần bổ sung |
| **Phát hiện "SKU lãi nhưng kênh lỗ"** | ❌ Không có | ❌ Thiếu | Cần AI insight |
| **Phát hiện "kênh lãi nhưng dòng tiền chết"** | ❌ Không có | ❌ Thiếu | Cần cross-metric analysis |

**Đánh giá**: 2/6 ⚠️ - Cần bổ sung nhiều

### 4. Decision-ready Finance

| Yêu cầu | Hiện trạng | Trạng thái | Ghi chú |
|---------|------------|------------|---------|
| **Scenario: tăng ads +20%** | ChannelWhatIfPage | ✅ Có | WhatIfSimulationPanel |
| **Scenario: giảm giá 5%** | ChannelWhatIfPage | ✅ Có | RetailScenarioPanel |
| **Scenario: tăng headcount** | ❌ Không có | ❌ Thiếu | Chưa có HR cost scenario |
| **Impact → cash** | ⚠️ Một phần | ⚠️ | Có nhưng chưa clear connection |
| **Impact → margin** | ChannelWhatIfPage | ✅ Có | MonthlyProfitTrendChart |
| **Impact → runway** | ❌ Không có | ❌ Thiếu | Chưa link scenario → runway |

**Đánh giá**: 3/6 ⚠️ - Cần bổ sung impact metrics

---

## III. CONTROL TOWER - ĐÁNH GIÁ THEO ĐỊNH HƯỚNG MỚI

### 1. Alert thay vì Report

| Yêu cầu | Hiện trạng | Trạng thái | Ghi chú |
|---------|------------|------------|---------|
| **Hiển thị "Có vấn đề"** | AlertsPage, AlertInstance | ✅ Có | severity + status |
| **"Vấn đề nào quan trọng nhất"** | priority field, severity sorting | ✅ Có | Critical → Warning → Info |
| **"Nếu không xử lý → hậu quả gì"** | suggested_action field | ⚠️ Một phần | Có field nhưng chưa hiển thị rõ |
| **Cash inflow chậm hơn forecast** | intelligent_alert_rules | ✅ Có | Có thể cấu hình |
| **Ads spend tăng + contribution margin âm** | ❌ Cross-domain alert | ❌ Thiếu | Chưa có cross-metric detection |
| **Tồn kho SKU vượt ngưỡng cash lock** | intelligent_alert_rules | ⚠️ Một phần | Có stockout alert, chưa có cash lock |
| **Ops delay có nguy cơ mất X doanh thu** | ❌ Không có | ❌ Thiếu | Cần revenue impact calculation |

**Đánh giá**: 3/7 ⚠️ - Dashboard nhiều, Alert thực sự còn yếu

### 2. Alert phải gắn với TIỀN

| Yêu cầu | Hiện trạng | Trạng thái | Ghi chú |
|---------|------------|------------|---------|
| **Mỗi alert có Impact € / ₫** | ❌ Không có | ❌ Thiếu | current_value có nhưng không phải impact |
| **Thời gian còn lại để xử lý** | snoozed_until | ⚠️ Một phần | Có snooze, chưa có deadline cấp bách |
| **Mức độ ưu tiên** | priority field | ✅ Có | 1-5 priority levels |

**Đánh giá**: 1/3 ❌ - **RẤT QUAN TRỌNG - CẦN BỔ SUNG NGAY**

### 3. Alert → Decision → Action loop

| Yêu cầu | Hiện trạng | Trạng thái | Ghi chú |
|---------|------------|------------|---------|
| **Owner của alert** | acknowledged_by, resolved_by | ✅ Có | Tracking người xử lý |
| **Trạng thái xử lý** | status (active, acknowledged, resolved) | ✅ Có | Đầy đủ workflow |
| **Outcome sau xử lý** | resolution_notes | ✅ Có | Ghi chú kết quả |
| **Tạo task từ alert** | CreateTaskFromAlertDialog | ✅ Có | Chuyển alert → task |

**Đánh giá**: 4/4 ✅ - Tốt

### 4. Cross-domain Alert (Điểm mạnh nhất)

| Yêu cầu | Hiện trạng | Trạng thái | Ghi chú |
|---------|------------|------------|---------|
| **Marketing alert + Cash impact** | ❌ Không có | ❌ Thiếu | Cần build |
| **HR cost tăng + margin giảm** | ❌ Không có | ❌ Thiếu | Cần build |
| **Ops delay + churn risk** | ❌ Không có | ❌ Thiếu | Cần build |

**Đánh giá**: 0/3 ❌ - **ĐÂY LÀ ĐIỂM KHÁC BIỆT - CHƯA CÓ**

---

## IV. NHỮNG THỨ ĐANG LÀM KHÔNG NÊN

### FDP - Đang làm không nên:

| Tính năng | Vấn đề | Khuyến nghị |
|-----------|--------|-------------|
| **Dashboard KPI đầy màn hình** | CFODashboard hiện 9+ metrics | Giảm còn 4-5 core metrics |
| **AI Usage Panel** | Không thuộc Financial Truth | Chuyển sang admin/settings |
| **EBITDA Margin, Gross Margin** | Accounting metrics | Nên focus vào Contribution Margin |
| **ARAgingChart, OverdueInvoicesTable** | Chi tiết quá | Nên chỉ summary + alert khi có vấn đề |

### Control Tower - Đang làm không nên:

| Tính năng | Vấn đề | Khuyến nghị |
|-----------|--------|-------------|
| **"Live Data" badge** | Phô trương | Bỏ badge, focus vào alert |
| **KPI Cards (4 cái)** | Dashboard thinking | Chỉ show stats liên quan alert |
| **Store Performance với progress bar** | Dashboard KPI | Chuyển thành "Stores at risk" |
| **Realtime order count** | Vô nghĩa với CEO | Thay bằng "Orders delayed" count |

---

## V. ROADMAP ĐỀ XUẤT

### Phase 1: Foundation (2 tuần)

1. **FDP**: Tạo "Financial Truth Dashboard" mới
   - Consolidate Net Revenue từ tất cả channels
   - 1 view duy nhất: Cash + AR + Runway
   - Remove noise metrics

2. **Control Tower**: Chuyển từ Dashboard → Alert Center
   - Remove KPI cards
   - Focus 100% vào active alerts
   - Add "Impact ₫" field cho mỗi alert

### Phase 2: Cross-domain Intelligence (3 tuần)

1. **FDP**: Unit Economics per SKU + Break-even
   - Drill-down từ channel → SKU
   - Break-even point calculation

2. **Control Tower**: Cross-domain Alerts
   - "Ads spend up but CM negative"
   - "Revenue up but cash down"
   - "Inventory high + cash lock"

### Phase 3: Decision Engine (3 tuần)

1. **FDP**: Scenario → Runway connection
   - Every what-if shows runway impact
   - Simple 3-scenario comparison

2. **Control Tower**: AI-powered prioritization
   - Auto-rank alerts by ₫ impact
   - Suggest action with expected outcome

---

## VI. SCORECARD TỔNG HỢP

| Nhóm tính năng | Điểm hiện tại | Điểm mục tiêu | Gap |
|----------------|---------------|---------------|-----|
| **FDP - Financial Truth** | 5/7 (71%) | 7/7 (100%) | -29% |
| **FDP - Cash Control** | 4/5 (80%) | 5/5 (100%) | -20% |
| **FDP - Unit Economics** | 2/6 (33%) | 6/6 (100%) | -67% |
| **FDP - Decision Finance** | 3/6 (50%) | 6/6 (100%) | -50% |
| **CT - Alert vs Report** | 3/7 (43%) | 7/7 (100%) | -57% |
| **CT - Alert gắn TIỀN** | 1/3 (33%) | 3/3 (100%) | -67% |
| **CT - Action Loop** | 4/4 (100%) | 4/4 (100%) | 0% ✅ |
| **CT - Cross-domain** | 0/3 (0%) | 3/3 (100%) | -100% |

### Điểm tổng:
- **FDP**: 14/24 = **58%** (cần +42%)
- **Control Tower**: 8/17 = **47%** (cần +53%)
- **Overall**: 22/41 = **54%**

---

## VII. ƯU TIÊN HÀNH ĐỘNG

### 🔴 Critical (Làm ngay - 1 tuần):

1. **Control Tower**: Thêm "Impact ₫" cho mỗi alert
2. **Control Tower**: Remove dashboard KPIs, keep only alert stats
3. **FDP**: Tạo "Financial Truth" summary card (Net Revenue, Contribution Margin, Cash)

### 🟡 High (2-3 tuần):

4. **Control Tower**: Build 3 cross-domain alert rules đầu tiên
5. **FDP**: Link what-if scenarios → runway impact
6. **FDP**: Add SKU-level unit economics

### 🟢 Medium (1-2 tháng):

7. **Control Tower**: AI prioritization by impact
8. **FDP**: Customer cohort analysis
9. **FDP**: Break-even analysis tool

---

## VIII. KẾT LUẬN

**FDP hiện tại**: Đang là "CFO reporting tool" thay vì "Financial Truth Engine". Có data nhưng chưa consolidate thành 1 nguồn sự thật. Unit Economics là điểm mạnh nhưng chưa khai thác hết.

**Control Tower hiện tại**: Đang là "Operations Dashboard" thay vì "Alert & Decision Engine". Có alert system nhưng thiếu phần quan trọng nhất: **mỗi alert phải gắn với tiền**.

**Điểm khác biệt chưa được xây dựng**: Cross-domain alerts là thứ đối thủ không làm được vì họ không có FDP. Đây phải là ưu tiên cao nhất.

> **"Không gắn tiền = alert vô nghĩa"** - Đây phải là nguyên tắc số 1 của Control Tower.
