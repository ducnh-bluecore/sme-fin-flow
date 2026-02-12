# BLUECORE FDP - Financial Data Platform
## Tài liệu hệ thống đầy đủ

**Phiên bản:** 3.0  
**Ngày cập nhật:** 12/02/2026  
**Trạng thái:** Production Ready

---

# PHẦN 1: FDP MANIFESTO - 10 Nguyên tắc bất biến

## 1. FDP KHÔNG PHẢI PHẦN MỀM KẾ TOÁN
Phục vụ CEO/CFO điều hành, không nộp báo cáo thuế.

## 2. SINGLE SOURCE OF TRUTH
1 Net Revenue, 1 Contribution Margin, 1 Cash Position. Không có phiên bản khác.

## 3. TRUTH > FLEXIBILITY
Không cho tự định nghĩa metric, không chỉnh công thức tùy tiện, không "chọn số đẹp".

## 4. REAL CASH
Phân biệt: Cash đã về / sẽ về / có nguy cơ không về / đang bị khóa (tồn kho, ads, ops).

## 5. REVENUE ↔ COST
Mọi doanh thu đều đi kèm chi phí. Không có doanh thu "đứng một mình".

## 6. UNIT ECONOMICS → ACTION
SKU lỗ + khóa cash + tăng risk → phải nói STOP.

## 7. TODAY'S DECISION
Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng.

## 8. SURFACE PROBLEMS
Không làm đẹp số, không che anomaly, chỉ ra vấn đề sớm.

## 9. FEED CONTROL TOWER
FDP là nguồn sự thật, Control Tower hành động dựa trên đó.

## 10. FINAL TEST
Nếu không khiến quyết định rõ ràng hơn → FDP đã thất bại.

---

# PHẦN 2: KIẾN TRÚC DATA LAYERS (L1 → L10)

| Layer | Tên | Bảng chính | Mục đích |
|-------|-----|-----------|----------|
| L1 | Foundation | tenants, organizations, members | Phân quyền, tổ chức |
| L1.5 | Ingestion | ingestion_batches, data_watermarks | Theo dõi nạp dữ liệu |
| L2 | Master Model | cdp_orders, master_products, master_customers | Dữ liệu gốc SSOT |
| L2.5 | Events/Marketing | commerce_events, campaigns, ad_spend_daily | Sự kiện và marketing |
| L3 | KPI Engine | kpi_definitions, kpi_facts_daily, kpi_targets | Chỉ số đã tính sẵn |
| L4 | Alert/Decision | alert_rules, alert_instances, decision_cards | Cảnh báo tự động |
| L5 | AI Query | ai_semantic_models, ai_conversations | AI phân tích |
| L6 | Audit | sync_jobs, audit_logs | Truy xuất lịch sử |
| L10 | BigQuery Sync | bq_connections, sync_configs | Đồng bộ nguồn |

### Luồng dữ liệu:
```
L1 (Foundation) → L1.5 (Ingestion) → L2 (Master) → L3 (KPI) → L4 (Alert) → Control Tower
                                         ↓
                                    L2.5 (Events) → MDP
```

---

# PHẦN 3: TÍNH NĂNG THEO MENU (11 nhóm, 40+ trang)

---

## 3.1 DECISION CENTER (`/decision-center`)

### Mô tả
Trung tâm ra quyết định tự động từ L4 Alert Layer. CEO/CFO mở app sáng ra, thấy ngay những vấn đề cần xử lý.

### Tính năng chính

#### Decision Cards
- Tự động sinh từ L4 Alert khi metric vượt ngưỡng
- Hiển thị: Mất bao nhiêu tiền? Nếu không xử lý? Còn bao lâu?
- Actions: Act (phân công), Snooze (hoãn), Dismiss (bỏ qua)
- Tracking outcome sau khi hành động

#### Bluecore Scores Panel
- Điểm sức khỏe tổng hợp từ nhiều KPI
- Cập nhật real-time từ L3

#### AI Decision Advisor
- Chat inline hỏi đáp về quyết định
- Dựa trên dữ liệu thật từ FDP

#### Threshold Config
- Tùy chỉnh ngưỡng cảnh báo cho từng metric
- Áp dụng cho toàn tenant

#### Decision Follow-up & Outcome History
- Theo dõi kết quả sau khi ra quyết định
- Đo lường hiệu quả quyết định

### Use Case
> CEO mở app sáng, thấy 3 decision cards cần xử lý. Card 1: "SKU ABC lỗ 15tr/tuần, đề xuất STOP". Bấm "Act" để phân công cho team.

### Data Layer: L4 (Alert/Decision)

---

## 3.2 CFO OVERVIEW (5 trang)

### a) Retail Command Center (`/dashboard`)

**Mô tả:** Tổng quan sức khỏe retail trên 1 màn hình duy nhất.

**Tính năng:**
- **RetailHealthHero**: Tổng quan sức khỏe retail với health score
- **MoneyEngineCards**: Revenue, Profit, Cash position real-time
- **ChannelWarChart**: So sánh kênh bán (Shopee, Lazada, TikTok, Website)
- **InventoryRiskPanel**: Cảnh báo tồn kho rủi ro
- **CashVelocityPanel**: Tốc độ dòng tiền
- **RetailDecisionFeed**: Feed quyết định real-time

**Use Case:**
> CFO nhìn 1 màn hình biết "Retail machine đang khỏe hay đang chết ở đâu?"

**Data Layer:** L3 (KPI) + L4 (Alert)

---

### b) Cash Position (`/cash-position`)

**Mô tả:** Vị thế tiền mặt thật - phân biệt rõ tiền thật vs tiền bị khóa.

**Tính năng:**
- **Real Cash Breakdown**:
  - Cash đã về (đã nhận)
  - Cash sẽ về (AR pending)
  - Cash nguy cơ không về (AR overdue)
  - Cash bị khóa (tồn kho, ads, ops, platform)
- **Locked Cash Drilldown**: Chi tiết tiền bị khóa ở đâu
- **Cash Runway**: Số tháng còn hoạt động được

**Công thức:**
```
Real Cash = Bank Balance - Locked Cash
Locked Cash = Inventory Value + Prepaid Ads + Platform Holdings + Ops Deposits
Cash Runway = Real Cash / Monthly Burn Rate
```

**Use Case:**
> "Còn bao nhiêu tiền thật? Bao nhiêu bị khóa trong tồn kho?"

**Data Layer:** L2 (Master) + L3 (KPI)

---

### c) Cash Forecast (`/cash-forecast`)

**Mô tả:** Dự báo dòng tiền ngắn và trung hạn.

**Tính năng:**
- **Daily Forecast View**: Dự báo 7-30 ngày tới
- **Weekly Forecast View**: Dự báo 4-12 tuần tới
- **Scenario Analysis**: Best / Base / Worst case
- **Cash Gap Alert**: Cảnh báo thiếu hụt tiền mặt

**Use Case:**
> "Tuần sau có đủ tiền trả lương không?"

**Data Layer:** L3 (KPI)

---

### d) Cash Flow Direct (`/cash-flow-direct`)

**Mô tả:** Báo cáo dòng tiền theo phương pháp trực tiếp.

**Tính năng:**
- **Operating Cash Flow**: Thu từ bán hàng - Chi cho hoạt động
- **Investing Cash Flow**: Mua/bán tài sản
- **Financing Cash Flow**: Vay/trả nợ, góp vốn
- **Waterfall Chart**: Biểu đồ thác nước theo tháng
- **Period-over-Period**: So sánh kỳ này vs kỳ trước

**Use Case:**
> "Tiền đi đâu? Operating positive hay negative?"

**Data Layer:** L2 (Master) + L3 (KPI)

---

### e) Working Capital Hub (`/working-capital-hub`)

**Mô tả:** Quản lý vốn lưu động và chu kỳ chuyển đổi tiền mặt.

**Tính năng:**
- **Working Capital Overview**: DIO, DSO, DPO tổng hợp
- **Cash Conversion Cycle (CCC)**: Trend theo thời gian
- **Optimization Suggestions**: Đề xuất cải thiện

**Công thức:**
```
DIO = (Avg Inventory / COGS) × 365
DSO = (Avg AR / Revenue) × 365
DPO = (Avg AP / COGS) × 365
CCC = DIO + DSO - DPO
```

**Use Case:**
> "Mất bao nhiêu ngày để chuyển hàng thành tiền?"

**Data Layer:** L3 (KPI)

---

## 3.3 STRATEGY & DECISION (3 trang)

### a) Executive Summary (`/executive-summary`)

**Mô tả:** Trang tóm tắt cho CEO chuẩn bị họp board.

**Tính năng:**
- **Health Score Radar**: 5 trục (Revenue, Profit, Cash, Growth, Risk)
- **Cash Runway Status**: Còn bao nhiêu tháng
- **Risk Alerts Summary**: Top risks đang active
- **Pending Decisions Panel**: Quyết định chờ xử lý
- **Key Metrics Snapshot**: Số liệu quan trọng nhất

**Use Case:**
> CEO chuẩn bị họp board, cần 1 trang tóm tắt mọi thứ.

**Data Layer:** L3 (KPI) + L4 (Alert)

---

### b) Risk Dashboard (`/risk-dashboard`)

**Mô tả:** Ma trận rủi ro tài chính và vận hành.

**Tính năng:**
- **Risk Matrix**: Impact × Probability
- **Risk Categories**: Financial, Operational, Market, Compliance
- **Mitigation Tracking**: Theo dõi biện pháp giảm thiểu
- **Risk Trend**: Xu hướng rủi ro theo thời gian

**Use Case:**
> "Những rủi ro nào đang đe dọa doanh nghiệp?"

**Data Layer:** L4 (Alert/Decision)

---

### c) Decision Support (`/decision-support`)

**Mô tả:** Hỗ trợ ra quyết định đầu tư và chiến lược.

**Tính năng:**
- **Hero Decision Card**: Quyết định lớn nhất cần xử lý
- **Scenario Sandbox**: Điều chỉnh biến số xem kết quả
- **Sensitivity Heatmap**: Nhạy cảm với biến nào nhất
- **NPV/IRR Analysis**: Phân tích giá trị hiện tại ròng
- **Payback Analysis**: Thời gian hoàn vốn
- **AI Decision Advisor**: AI tư vấn quyết định
- **ROI Analysis**: Phân tích ROI với saved analyses

**Công thức:**
```
NPV = Σ [CFt / (1+r)^t] - Initial Investment
IRR = Rate where NPV = 0
Payback = Time to recover initial investment
```

**Use Case:**
> "Nên đầu tư 500tr vào kho mới không? ROI bao nhiêu?"

**Data Layer:** L3 (KPI) + L4 (Alert)

---

## 3.4 FINANCIAL REPORTS (6 trang)

### a) P&L Report (`/pl-report`)

**Mô tả:** Báo cáo lãi lỗ chi tiết.

**Tính năng:**
- **Revenue Breakdown**: Theo kênh, sản phẩm, khu vực
- **Cost Waterfall**: Revenue → COGS → Gross Profit → OPEX → EBITDA → Net Income
- **Margin Analysis**: Gross Margin, Operating Margin, Net Margin
- **Period Comparison**: So sánh tháng/quý/năm

**Công thức:**
```
Gross Profit = Net Revenue - COGS
EBITDA = Gross Profit - OPEX (excl. D&A)
Net Income = EBITDA - Depreciation - Interest - Tax
Gross Margin = Gross Profit / Net Revenue × 100%
```

**Use Case:**
> "Tháng này lãi hay lỗ? Ở đâu?"

**Data Layer:** L3 (KPI)

---

### b) Financial Analysis (`/financial-reports`)

**Mô tả:** Phân tích tài chính tổng hợp.

**Tính năng:**
- **KPI Summary**: Revenue, Margin, Costs overview
- **Financial Insights**: Tự động phát hiện anomaly
- **Financial Ratios**: So sánh với targets
- **100% SSOT**: Không tính toán ở client

**Use Case:**
> "Các chỉ số tài chính có đạt target không?"

**Data Layer:** L3 (KPI)

---

### c) Performance Analysis (`/performance-analysis`)

**Mô tả:** Phân tích hiệu suất Budget vs Actual.

**Tính năng:**
- **Budget vs Actual**: Kế hoạch vs thực tế
- **Variance Analysis**: Phân tích biến động (giá, lượng, mix)
- **Variance Waterfall**: Biểu đồ phân rã variance

**Công thức:**
```
Variance = Actual - Budget
Variance % = (Actual - Budget) / Budget × 100%
Price Variance = (Actual Price - Budget Price) × Actual Qty
Volume Variance = (Actual Qty - Budget Qty) × Budget Price
```

**Use Case:**
> "Chi phí thực tế vượt kế hoạch bao nhiêu? Tại sao?"

**Data Layer:** L3 (KPI)

---

### d) Board Reports (`/board-reports`)

**Mô tả:** Tự động tạo báo cáo cho Board of Directors.

**Tính năng:**
- **Auto-generate**: Tạo báo cáo tự động từ dữ liệu FDP
- **Financial Summary**: Tóm tắt tài chính
- **Risk Items**: Các rủi ro cần board attention
- **Strategic Initiatives**: Tiến độ sáng kiến chiến lược
- **Export/Download**: Xuất PDF/Excel

**Use Case:**
> "Tạo báo cáo cho board meeting tuần này."

**Data Layer:** L3 (KPI) + L4 (Alert)

---

### e) Expenses (`/expenses`)

**Mô tả:** Quản lý và phân tích chi phí.

**Tính năng:**
- **Category Breakdown**: COGS, Marketing, Ops, HR, Admin...
- **Daily Trend**: Xu hướng chi phí theo ngày
- **Period Comparison**: So sánh kỳ này vs kỳ trước
- **Top Expense Items**: Chi phí lớn nhất

**Use Case:**
> "Chi phí marketing tăng bao nhiêu so với tháng trước?"

**Data Layer:** L2 (Master) + L3 (KPI)

---

### f) Revenue (`/revenue`)

**Mô tả:** Phân tích doanh thu đa chiều.

**Tính năng:**
- **Revenue by Channel**: Shopee, Lazada, TikTok, Website...
- **Revenue by Product**: Top sản phẩm
- **Revenue by Customer**: Top khách hàng
- **Growth Rate**: Tốc độ tăng trưởng
- **Revenue Trend**: Xu hướng doanh thu

**Use Case:**
> "Kênh nào đang mang lại nhiều doanh thu nhất?"

**Data Layer:** L2 (Master) + L3 (KPI)

---

## 3.5 PLAN & SIMULATION (3 trang)

### a) Scenario Hub (`/scenario`)

**Mô tả:** Mô phỏng What-If đa biến.

**Tính năng:**
- **Time Horizon**: 1 tháng / 3 tháng / 6 tháng / 1 năm / 2 năm
- **Multi-variable Sliders**: Revenue, COGS, OPEX, Price, Volume
- **Monthly Profit Trend Chart**: Dynamic theo time horizon
- **Save/Load Scenarios**: Lưu và tải lại kịch bản
- **Scenario Comparison**: So sánh side-by-side
- **Monte Carlo Simulation**: Phân phối xác suất kết quả

**Use Case:**
> "Nếu giảm giá 10% nhưng tăng volume 20%, EBITDA 6 tháng tới sẽ thế nào?"

**Data Layer:** L3 (KPI)

---

### b) Rolling Forecast (`/rolling-forecast`)

**Mô tả:** Dự báo cuốn tự động dựa trên dữ liệu thực.

**Tính năng:**
- **Auto-generate Forecast**: Tự động từ trend data
- **Forecast vs Actual**: So sánh dự báo vs thực tế
- **Confidence Intervals**: Khoảng tin cậy
- **Adjustment Capability**: Điều chỉnh thủ công

**Use Case:**
> "Dự báo doanh thu 3 tháng tới dựa trên trend hiện tại."

**Data Layer:** L3 (KPI)

---

### c) Strategic Initiatives (`/strategic-initiatives`)

**Mô tả:** Quản lý sáng kiến chiến lược.

**Tính năng:**
- **Initiative Tracking**: Timeline, progress, milestones
- **ROI Measurement**: Đo lường ROI từng sáng kiến
- **Priority Matrix**: Ma trận ưu tiên
- **Resource Allocation**: Phân bổ nguồn lực

**Use Case:**
> "Dự án mở rộng kênh TikTok Shop đang ở tiến độ nào?"

**Data Layer:** L3 (KPI) + L4 (Alert)

---

## 3.6 AR/AP & RECONCILIATION (6 trang)

### a) Invoice Management (`/invoice/tracking`)

**Mô tả:** Quản lý hóa đơn bán hàng.

**Tính năng:**
- **Create Invoice**: Tạo hóa đơn mới
- **Invoice Tracking**: Theo dõi trạng thái
- **Status Lifecycle**: Draft → Sent → Partial → Paid → Overdue
- **Bulk Actions**: Thao tác hàng loạt

**Use Case:**
> "Còn bao nhiêu hóa đơn chưa thu?"

**Data Layer:** L2 (Master)

---

### b) AR Operations (`/ar-operations`)

**Mô tả:** Quản lý công nợ phải thu.

**Tính năng:**
- **AR Aging Buckets**: Current, 1-30, 31-60, 61-90, >90 ngày
- **DSO Tracking**: Days Sales Outstanding trend
- **Top Customers AR**: Khách hàng nợ nhiều nhất
- **Collection Workflow**: Quy trình thu hồi công nợ
- **Auto-reminder**: Nhắc nhở tự động

**Công thức:**
```
DSO = (Avg Accounts Receivable / Net Credit Sales) × 365
AR Turnover = Net Credit Sales / Avg AR
```

**Use Case:**
> "Khách hàng nào đang nợ lâu nhất?"

**Data Layer:** L2 (Master) + L3 (KPI)

---

### c) AP Overview (`/bills`)

**Mô tả:** Quản lý công nợ phải trả.

**Tính năng:**
- **Bill Management**: Quản lý hóa đơn mua hàng
- **Payment Scheduling**: Lịch thanh toán
- **AP Aging**: Phân tích tuổi nợ phải trả
- **DPO Tracking**: Days Payable Outstanding

**Use Case:**
> "Tuần này cần trả bao nhiêu tiền cho NCC?"

**Data Layer:** L2 (Master)

---

### d) Credit/Debit Notes (`/credit-debit-notes`)

**Mô tả:** Quản lý phiếu giảm giá và điều chỉnh.

**Tính năng:**
- **Credit Notes**: Phiếu giảm giá cho khách hàng
- **Debit Notes**: Phiếu tăng giá
- **Application**: Áp dụng vào hóa đơn gốc
- **Tracking**: Theo dõi số dư remaining

**Use Case:**
> "Tổng giá trị credit notes tháng này?"

**Data Layer:** L2 (Master)

---

### e) Reconciliation (`/reconciliation`)

**Mô tả:** Đối soát tự động ngân hàng vs hóa đơn.

**Tính năng:**
- **Auto-matching**: Tự động khớp giao dịch ngân hàng với hóa đơn
- **Confidence Score**: Điểm tin cậy cho mỗi match
- **Exception Queue**: Hàng đợi cho manual review
- **Audit Trail**: Lịch sử đối soát bất biến
- **Rules Engine**: Quy tắc matching tùy chỉnh

**Use Case:**
> "Những giao dịch nào chưa đối soát?"

**Data Layer:** L2 (Master) + L6 (Audit)

---

### f) Exceptions (`/exceptions`)

**Mô tả:** Quản lý giao dịch bất thường.

**Tính năng:**
- **Exception List**: Danh sách giao dịch bất thường
- **Resolution Workflow**: Quy trình xử lý
- **Categorization**: Phân loại theo loại exception
- **Auto-detection**: Phát hiện tự động

**Use Case:**
> "Có giao dịch nào bất thường cần kiểm tra?"

**Data Layer:** L2 (Master) + L4 (Alert)

---

## 3.7 RETAIL OPERATIONS (4 trang)

### a) Inventory Aging (`/inventory-aging`)

**Mô tả:** Phân tích tuổi tồn kho và giá trị bị khóa.

**Tính năng:**
- **Aging Buckets**: 0-30, 31-60, 61-90, >90 ngày
- **Locked Cash Value**: Giá trị tiền bị khóa trong tồn kho
- **Decision Cards**: Tự động đề xuất cho tồn kho rủi ro
- **Import Data**: Nhập dữ liệu tồn kho từ file
- **Dead Stock Alert**: Cảnh báo hàng chết

**Công thức:**
```
Locked Cash = Σ (SKU Qty × Unit Cost) for each aging bucket
Dead Stock Risk = Items with age > 90 days & velocity < threshold
```

**Use Case:**
> "Bao nhiêu tiền đang nằm chết trong tồn kho cũ?"

**Data Layer:** L2 (Master) + L4 (Alert)

---

### b) Inventory Allocation (`/inventory-allocation`)

**Mô tả:** Điều phối tồn kho giữa các cửa hàng/kho.

**Tính năng:**
- **Rebalance Suggestions**: Đề xuất chuyển hàng giữa kho
- **Capacity Optimization**: Tối ưu công suất kho
- **Simulation**: Chạy thử trước khi thực hiện
- **Audit Log**: Lịch sử các lần điều phối
- **Store Directory**: Quản lý danh sách kho/cửa hàng
- **Export Excel**: Xuất phiếu điều chuyển

**Use Case:**
> "Nên chuyển hàng từ kho A sang kho B để giảm dead stock?"

**Data Layer:** L2 (Master)

---

### c) Promotion ROI (`/promotion-roi`)

**Mô tả:** Đo lường ROI thật của promotions và quảng cáo.

**Tính năng:**
- **True ROI Analysis**: ROI sau khi trừ hết chi phí
- **ROAS by Channel**: Return on Ad Spend theo kênh
- **Channel Comparison**: So sánh hiệu quả kênh
- **Decision Cards**: Đề xuất scale/stop
- **Profit Attribution**: Gán lợi nhuận thật cho campaign

**Công thức:**
```
True ROI = (Contribution Margin - Ad Spend) / Ad Spend × 100%
ROAS = Revenue / Ad Spend
Profit ROAS = Contribution Margin / Ad Spend
```

**Use Case:**
> "Chiến dịch Facebook Ads có thực sự có lãi không?"

**Data Layer:** L2.5 (Events) + L3 (KPI)

---

### d) Supplier Payments (`/supplier-payments`)

**Mô tả:** Quản lý thanh toán nhà cung cấp.

**Tính năng:**
- **Payment Schedule**: Lịch thanh toán với priority
- **Early Payment Discount**: Tối ưu chiết khấu thanh toán sớm
- **Overdue Tracking**: Theo dõi quá hạn
- **Cash Impact Analysis**: Ảnh hưởng đến dòng tiền

**Use Case:**
> "Nên trả sớm NCC nào để được chiết khấu?"

**Data Layer:** L2 (Master)

---

## 3.8 SALES CHANNELS (2+ trang)

### a) Channel Analytics (`/channel-analytics`)

**Mô tả:** Phân tích hiệu suất kênh bán hàng.

**Tính năng:**
- **Performance by Channel**: Shopee, Lazada, TikTok, Website...
- **Daily Revenue Trend**: Xu hướng doanh thu theo ngày
- **Order Status Summary**: Tổng hợp trạng thái đơn hàng
- **Fees & Settlements**: Phí sàn và quyết toán
- **Channel Health Score**: Điểm sức khỏe kênh

**Use Case:**
> "Kênh Shopee đang tăng hay giảm? Phí sàn bao nhiêu?"

**Data Layer:** L2 (Master) + L3 (KPI)

---

### b) Unit Economics (`/unit-economics`)

**Mô tả:** Phân tích kinh tế đơn vị - lõi của FDP.

**Tính năng:**
- **SKU Profitability Analysis**: Lãi/lỗ từng SKU
- **Contribution Margin by SKU**: Biên lợi nhuận đóng góp
- **SKU Stop Action**: STOP bán SKU lỗ (Nguyên tắc #6)
- **FDP Outcome Tracker**: Theo dõi kết quả quyết định
- **Cash Lock per SKU**: Tiền bị khóa theo SKU

**Công thức:**
```
Contribution Margin = Revenue - COGS - Platform Fees - Shipping - Ads
CM% = Contribution Margin / Revenue × 100%
Cash Lock = Inventory Qty × Unit Cost + Prepaid Ads
Stop Signal = CM < 0 AND Cash Lock > threshold AND Trend declining
```

**Use Case:**
> "SKU nào đang lỗ tiền? Nên ngừng bán SKU nào?"

**Data Layer:** L2 (Master) + L3 (KPI)

---

### Channel P&L (`/channel/:channelId`)

**Mô tả:** P&L chi tiết cho từng kênh bán hàng.

- Revenue, COGS, Fees, Margin breakdown cho 1 kênh
- Monthly trend, Top SKUs trong kênh

**Use Case:**
> "Kênh Lazada lãi bao nhiêu sau khi trừ hết phí?"

---

### Channel What-If (`/channel/:channelId/whatif`)

**Mô tả:** Mô phỏng thay đổi cho từng kênh cụ thể.

**Use Case:**
> "Nếu tăng giá trên Shopee 5%, lợi nhuận thay đổi thế nào?"

---

## 3.9 DATA HUB (5 trang)

### a) Data Center (`/data-hub`)

**Mô tả:** Quản lý kết nối và đồng bộ dữ liệu.

**Tính năng:**
- **Connector Management**: Quản lý integrations (Shopee, Lazada, TikTok, Bank...)
- **Sync Status**: Trạng thái đồng bộ real-time
- **Sync History**: Lịch sử đồng bộ
- **Data Freshness**: Theo dõi độ tươi dữ liệu
- **Error Handling**: Xử lý lỗi đồng bộ

**Use Case:**
> "Dữ liệu đã đồng bộ đến khi nào? Có lỗi gì không?"

**Data Layer:** L1.5 (Ingestion)

---

### b) Data Warehouse (`/data-warehouse`)

**Mô tả:** Khám phá schema và data lineage.

**Tính năng:**
- **Schema Explorer**: Xem cấu trúc bảng
- **Data Lineage**: Theo dõi nguồn gốc dữ liệu
- **Table Statistics**: Thống kê bảng

**Use Case:**
> "Dữ liệu doanh thu lấy từ bảng nào?"

**Data Layer:** L2 (Master)

---

### c) ETL Rules (`/etl-rules`)

**Mô tả:** Cấu hình quy tắc chuyển đổi dữ liệu.

**Tính năng:**
- **Field Mapping**: Map trường dữ liệu
- **Transform Rules**: Quy tắc chuyển đổi
- **Validation Rules**: Kiểm tra dữ liệu đầu vào

**Use Case:**
> "Map trường 'total' từ Shopee sang 'gross_revenue'"

**Data Layer:** L1.5 (Ingestion)

---

### d) Chart of Accounts (`/chart-of-accounts`)

**Mô tả:** Hệ thống tài khoản kế toán.

**Tính năng:**
- **Account Tree**: Cây tài khoản theo nhóm
- **Account Management**: Thêm/sửa/xóa tài khoản
- **Mapping**: Gán tài khoản cho giao dịch

**Use Case:**
> "Phân loại chi phí marketing vào tài khoản nào?"

**Data Layer:** L1 (Foundation)

---

### e) Bank Connections (`/bank-connections`)

**Mô tả:** Kết nối tài khoản ngân hàng.

**Tính năng:**
- **Bank Integration**: Kết nối API ngân hàng
- **Transaction Import**: Nhập giao dịch tự động
- **Balance Sync**: Đồng bộ số dư

**Use Case:**
> "Kết nối tài khoản Vietcombank để tự động đối soát."

**Data Layer:** L1.5 (Ingestion) + L2 (Master)

---

## 3.10 TAX & COMPLIANCE (2 trang)

### a) Tax Tracking (`/tax-compliance`)

**Mô tả:** Theo dõi nghĩa vụ thuế.

**Tính năng:**
- **VAT Calculation**: Tính thuế GTGT
- **CIT Tracking**: Thuế thu nhập doanh nghiệp
- **Tax Calendar**: Lịch nộp thuế
- **Tax Reports**: Báo cáo thuế tự động

**Use Case:**
> "Tháng này phải nộp VAT bao nhiêu?"

**Data Layer:** L2 (Master) + L3 (KPI)

---

### b) Covenant Tracking (`/covenant-tracking`)

**Mô tả:** Theo dõi điều kiện cam kết tài chính.

**Tính năng:**
- **Covenant Monitoring**: Giám sát các điều kiện tài chính
- **Breach Alert**: Cảnh báo vi phạm
- **Ratio Tracking**: Theo dõi tỷ lệ tài chính (D/E, Current Ratio...)
- **Compliance Status**: Trạng thái tuân thủ

**Use Case:**
> "Tỷ lệ nợ/vốn có đáp ứng điều kiện ngân hàng?"

**Data Layer:** L3 (KPI) + L4 (Alert)

---

## 3.11 ALERTS & ADMIN (5 trang)

### a) Alerts (`/alerts`)

**Mô tả:** Trung tâm cảnh báo từ L4 Alert Layer.

**Tính năng:**
- **All Alerts**: Tất cả cảnh báo
- **Filter**: Theo severity (Critical, High, Medium, Low)
- **Status Filter**: Open, In Progress, Resolved
- **Alert Details**: Chi tiết + context
- **Quick Actions**: Assign, Snooze, Resolve

**Data Layer:** L4 (Alert/Decision)

---

### b) Company Management (`/tenant`)

- Company profile, settings
- Fiscal year configuration
- Currency settings

---

### c) Members (`/tenant/members`)

- Invite/Remove members
- Role assignment
- Activity tracking

---

### d) RBAC (`/rbac`)

- Role definitions (CEO, CFO, Accountant, Viewer...)
- Permission matrix
- Custom roles

---

### e) Audit Log (`/audit-log`)

- All user actions logged
- Filter by user, action type, date
- Export audit data

**Data Layer:** L6 (Audit)

---

# PHẦN 4: CROSS-MODULE INTEGRATION

## FDP → Control Tower
- L3 KPI vượt ngưỡng → L4 Alert → Control Tower hiển thị
- FDP cung cấp "Financial Truth" cho mọi alert

## FDP → MDP (Marketing Data Platform)
- Locked costs cho Profit ROAS
- Unit Economics cho marketing attribution
- Cash impact cho campaign evaluation

## FDP → CDP (Customer Data Platform)
- Actual revenue cho LTV calculation
- Payment behavior cho risk scoring
- Customer profitability cho segmentation

---

# PHẦN 5: NGUYÊN TẮC THIẾT KẾ

## Data Flow
```
External Sources → L1.5 Ingestion → L2 Master → L3 KPI → L4 Alert → UI
```

## Security
- Row Level Security (RLS) trên mọi bảng
- Tenant isolation
- RBAC cho từng feature

## Performance
- KPI pre-calculated tại L3
- Client không tính toán, chỉ hiển thị
- Real-time updates qua Realtime subscriptions

---

*Tài liệu này được tạo từ Bluecore FDP Platform.*  
*Phiên bản: 3.0 | Cập nhật: Tháng 2/2026*
