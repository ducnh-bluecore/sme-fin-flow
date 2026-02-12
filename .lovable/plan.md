

# Tai lieu day du FDP - Financial Data Platform

## Muc tieu

Viet lai toan bo `FDPDocumentation.tsx` thanh tai lieu day du, bao gom:
- Mo ta tat ca 11 nhom menu chinh cua FDP (40+ trang)
- Data layers (L1-L10 architecture)
- Use cases thuc te cho tung tinh nang
- Cong thuc tinh toan
- Nguyen tac FDP Manifesto gan voi tung tinh nang

## Cau truc tai lieu

### Phan 1: FDP Manifesto (10 nguyen tac bat bien)

Giu nguyen 10 nguyen tac tu custom knowledge, hien thi dau tien.

### Phan 2: Kien truc Data Layers

| Layer | Ten | Bang chinh | Muc dich |
|-------|-----|-----------|----------|
| L1 | Foundation | tenants, organizations, members | Phan quyen, to chuc |
| L1.5 | Ingestion | ingestion_batches, data_watermarks | Theo doi nap du lieu |
| L2 | Master Model | cdp_orders, master_products, master_customers | Du lieu goc SSOT |
| L2.5 | Events/Marketing | commerce_events, campaigns, ad_spend | Su kien va marketing |
| L3 | KPI | kpi_definitions, kpi_facts_daily, kpi_targets | Chi so da tinh san |
| L4 | Alert/Decision | alert_rules, alert_instances, decision_cards | Canh bao tu dong |
| L5 | AI Query | ai_semantic_models, conversations | AI phan tich |
| L6 | Audit | sync_jobs, audit_logs | Truy xuat lich su |
| L10 | BigQuery | bq_connections, sync_configs | Dong bo nguon |

### Phan 3: Tat ca tinh nang theo Menu (11 nhom, 40+ trang)

#### 3.1 Decision Center (/decision-center)
- Decision Cards tu dong tu L4 Alert
- Bluecore Scores Panel
- AI Decision Advisor (inline chat)
- Threshold Config (tuy chinh nguong canh bao)
- Decision Follow-up & Outcome History
- **Use case**: CEO mo app sang, thay 3 decision cards can xu ly, bam "Act" de phan cong

#### 3.2 CFO Overview (5 trang)

**a) Retail Command Center (/dashboard)**
- RetailHealthHero: Tong quan suc khoe retail
- MoneyEngineCards: Revenue, Profit, Cash position
- ChannelWarChart: So sanh kenh ban
- InventoryRiskPanel: Canh bao ton kho
- CashVelocityPanel: Toc do dong tien
- RetailDecisionFeed: Feed quyet dinh real-time
- **Use case**: CFO nhin 1 man hinh biet "Retail machine dang khoe hay dang chet o dau?"

**b) Cash Position (/cash-position)**
- Real Cash Breakdown (da ve / se ve / nguy co / bi khoa)
- Locked Cash Drilldown (inventory, ads, ops, platform)
- Cash Runway (so thang con hoat dong)
- **Use case**: "Con bao nhieu tien that? Bao nhieu bi khoa trong ton kho?"

**c) Cash Forecast (/cash-forecast)**
- Daily Forecast View (7-30 ngay)
- Weekly Forecast View (4-12 tuan)
- Best/Base/Worst case scenarios
- **Use case**: "Tuan sau co du tien tra luong khong?"

**d) Cash Flow Direct (/cash-flow-direct)**
- Operating / Investing / Financing cash flows
- Waterfall chart theo thang
- Period-over-period analysis
- **Use case**: "Tien di dau? Operating positive hay negative?"

**e) Working Capital Hub (/working-capital-hub)**
- Working Capital Overview (DIO, DSO, DPO)
- Cash Conversion Cycle (CCC) trend
- **Use case**: "Mat bao nhieu ngay de chuyen hang thanh tien?"

#### 3.3 Strategy & Decision (3 trang)

**a) Executive Summary (/executive-summary)**
- Health Score Radar (Revenue, Profit, Cash, Growth, Risk)
- Cash Runway status
- Risk Alerts summary
- Pending Decisions Panel
- **Use case**: CEO chuan bi hop board, can 1 trang tom tat

**b) Risk Dashboard (/risk-dashboard)**
- Risk Matrix (impact x probability)
- Financial, Operational, Market risks
- Mitigation tracking
- **Use case**: "Nhung rui ro nao dang de doa doanh nghiep?"

**c) Decision Support (/decision-support)**
- Hero Decision Card (biggest decision)
- Scenario Sandbox (dieu chinh bien so)
- Sensitivity Heatmap
- NPV/IRR Analysis, Payback Analysis
- AI Decision Advisor
- ROI Analysis voi saved analyses
- **Use case**: "Nen dau tu 500tr vao kho moi khong? ROI bao nhieu?"

#### 3.4 Financial Reports (6 trang)

**a) P&L Report (/pl-report)**
- Revenue breakdown theo kenh/san pham
- Cost waterfall: COGS > Gross Profit > OPEX > EBITDA > Net Income
- Margin analysis (Gross, Operating, Net)
- Period comparison
- **Use case**: "Thang nay lai hay lo? O dau?"

**b) Financial Analysis (/financial-reports)**
- KPI summary (Revenue, Margin, Costs)
- Financial insights tu dong (pre-generated)
- Financial ratios voi targets
- 100% SSOT - khong tinh toan o client
- **Use case**: "Cac chi so tai chinh co dat target khong?"

**c) Performance Analysis (/performance-analysis)**
- Budget vs Actual (ke hoach vs thuc te)
- Variance Analysis (phan tich bien dong)
- **Use case**: "Chi phi thuc te vuot ke hoach bao nhieu? Tai sao?"

**d) Board Reports (/board-reports)**
- Auto-generate bao cao cho Board of Directors
- Financial summary, risk items, strategic initiatives
- Export/Download
- **Use case**: "Tao bao cao cho board meeting tuan nay"

**e) Expenses (/expenses)**
- Chi phi theo category (COGS, Marketing, Ops, HR...)
- Daily trend, period comparison
- Category breakdown charts
- **Use case**: "Chi phi marketing tang bao nhieu so voi thang truoc?"

**f) Revenue (/revenue)**
- Revenue by channel, by product, by period
- Top products, top customers
- Revenue trend va growth rate
- **Use case**: "Kenh nao dang mang lai nhieu doanh thu nhat?"

#### 3.5 Plan & Simulation (3 trang)

**a) Scenario Hub (/scenario)**
- What-If Simulation voi Time Horizon (1T/3T/6T/1N/2N)
- Multi-variable sliders (Revenue, COGS, OPEX, Price, Volume)
- Monthly Profit Trend Chart (dynamic theo time horizon)
- Save/Load scenarios
- Scenario comparison side-by-side
- Monte Carlo simulation
- **Use case**: "Neu giam gia 10% nhung tang volume 20%, EBITDA 6 thang toi se the nao?"

**b) Rolling Forecast (/rolling-forecast)**
- Auto-generate du bao cuon theo du lieu thuc
- Forecast vs Actual tracking
- Confidence intervals
- **Use case**: "Du bao doanh thu 3 thang toi dua tren trend hien tai"

**c) Strategic Initiatives (/strategic-initiatives)**
- Quan ly cac sang kien chien luoc
- Timeline, progress tracking, ROI measurement
- Priority va resource allocation
- **Use case**: "Du an mo rong kenh TikTok Shop dang o tien do nao?"

#### 3.6 AR/AP (6 trang)

**a) Invoice Management (/invoice/tracking)**
- Tao, theo doi hoa don ban hang
- Invoice status lifecycle
- **Use case**: "Con bao nhieu hoa don chua thu?"

**b) AR Operations (/ar-operations)**
- AR Aging buckets (Current, 1-30, 31-60, 61-90, >90)
- DSO tracking va trend
- Top customers AR
- Collection workflow
- **Use case**: "Khach hang nao dang no lau nhat?"

**c) AP Overview (/bills)**
- Quan ly hoa don mua hang
- Payment scheduling
- **Use case**: "Tuan nay can tra bao nhieu tien cho NCC?"

**d) Credit/Debit Notes (/credit-debit-notes)**
- Quan ly phieu giam gia, dieu chinh
- **Use case**: "Tong gia tri credit notes thang nay?"

**e) Reconciliation (/reconciliation)**
- Auto-matching (ngan hang vs hoa don)
- Confidence Score matching
- Exception Queue cho manual review
- Audit Trail bat bien
- **Use case**: "Nhung giao dich nao chua doi soat?"

**f) Exceptions (/exceptions)**
- Danh sach giao dich bat thuong
- Resolution workflow
- **Use case**: "Co giao dich nao bat thuong can kiem tra?"

#### 3.7 Retail Operations (4 trang)

**a) Inventory Aging (/inventory-aging)**
- Ton kho theo tuoi (0-30, 31-60, 61-90, >90 ngay)
- Gia tri ton kho bi khoa
- Decision Cards cho ton kho rui ro
- Import du lieu ton kho
- **Use case**: "Bao nhieu tien dang nam chet trong ton kho cu?"

**b) Inventory Allocation (/inventory-allocation)**
- Rebalance suggestions giua cac cua hang
- Capacity optimization
- Simulation chay thu truoc khi thuc hien
- Audit log cac lan dieu phoi
- Store directory management
- **Use case**: "Nen chuyen hang tu kho A sang kho B de giam dead stock?"

**c) Promotion ROI (/promotion-roi)**
- ROI theo tung campaign/kenh quang cao
- ROAS analysis (Return on Ad Spend)
- Channel performance comparison
- Decision Cards cho promotions
- **Use case**: "Chien dich Facebook Ads co thuc su co lai khong?"

**d) Supplier Payments (/supplier-payments)**
- Lich thanh toan NCC voi priority
- Early payment discount optimization
- Overdue tracking
- **Use case**: "Nen tra som NCC nao de duoc chiet khau?"

#### 3.8 Sales Channels (2 trang)

**a) Channel Analytics (/channel-analytics)**
- Performance by channel (Shopee, Lazada, TikTok, Website...)
- Daily revenue trend
- Order status summary
- Fees va settlements summary
- **Use case**: "Kenh Shopee dang tang hay giam? Phi san bao nhieu?"

**b) Unit Economics (/unit-economics)**
- SKU Profitability Analysis
- Contribution Margin by SKU
- SKU Stop Action (STOP ban SKU lo)
- FDP Outcome Tracker (theo doi ket qua quyet dinh)
- Cash Lock per SKU
- **Use case**: "SKU nao dang lo tien? Nen ngung ban SKU nao?"

**+ Channel P&L (/channel/:channelId)**
- P&L chi tiet cho tung kenh ban hang
- Revenue, COGS, Fees, Margin breakdown
- Monthly trend
- **Use case**: "Kenh Lazada lai bao nhieu sau khi tru het phi?"

**+ Channel What-If (/channel/:channelId/whatif)**
- Mo phong thay doi cho tung kenh cu the
- **Use case**: "Neu tang gia tren Shopee 5%, loi nhuan thay doi the nao?"

#### 3.9 Data Hub (5 trang)

**a) Data Center (/data-hub)**
- Connector integrations management
- Sync status va history
- Data freshness monitoring
- **Use case**: "Du lieu da dong bo den khi nao? Co loi gi khong?"

**b) Data Warehouse (/data-warehouse)**
- Schema va table explorer
- Data lineage
- **Use case**: "Du lieu doanh thu lay tu bang nao?"

**c) ETL Rules (/etl-rules)**
- Cau hinh quy tac chuyen doi du lieu
- Field mapping
- **Use case**: "Map truong 'total' tu Shopee sang 'gross_revenue'"

**d) Chart of Accounts (/chart-of-accounts)**
- He thong tai khoan ke toan
- **Use case**: "Phan loai chi phi marketing vao tai khoan nao?"

**e) Bank Connections (/bank-connections)**
- Ket noi tai khoan ngan hang
- Transaction import
- **Use case**: "Ket noi tai khoan Vietcombank de tu dong doi soat"

#### 3.10 Tax & Compliance (2 trang)

**a) Tax Tracking (/tax-compliance)**
- Theo doi nghia vu thue
- VAT, CIT calculations
- **Use case**: "Thang nay phai nop VAT bao nhieu?"

**b) Covenant Tracking (/covenant-tracking)**
- Theo doi cac dieu kien cam ket tai chinh
- **Use case**: "Ty le no/von co dap ung dieu kien ngan hang?"

#### 3.11 Alerts & Admin (5 trang)

**a) Alerts (/alerts)**
- Tat ca canh bao tu L4 Alert Layer
- Filter theo severity, status

**b) Company Management (/tenant)**
- Quan ly thong tin doanh nghiep

**c) Members (/tenant/members)**
- Quan ly thanh vien va quyen truy cap

**d) RBAC (/rbac)**
- Role-based access control

**e) Audit Log (/audit-log)**
- Lich su thao tac he thong

### Phan 4: Cross-Module Integration

FDP la nguon du lieu cho:
- Control Tower: Canh bao tu L4 dua tren L3 KPI
- MDP: Locked costs cho Profit ROAS
- CDP: Actual revenue cho equity recalibration

## Chi tiet ky thuat

### File thay doi

| File | Thay doi |
|------|---------|
| `src/components/docs/FDPDocumentation.tsx` | Viet lai hoan toan voi 11 nhom menu, 40+ tinh nang, data layers, use cases |

### Cau truc code moi

`fdpSections` array se duoc mo rong tu 9 sections hien tai len 11 nhom chinh, moi nhom chua nhieu sub-sections. Them cac truong moi:

- `useCases`: Mang cac use case thuc te
- `dataLayer`: Layer nao cung cap du lieu
- `crossModule`: Lien ket voi module nao
- `subSections`: Cac trang con trong nhom

Them section "Data Architecture" o dau tai lieu voi diagram 10 layers.

Giu nguyen giao dien accordion hien tai, chi mo rong noi dung.
