/**
 * Generate a print-friendly HTML page from the FDP documentation
 * and trigger browser print dialog (Save as PDF).
 */
export function printFDPDocumentationAsPDF() {
  const content = getFDPDocHTML();
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Vui lòng cho phép popup để tải PDF.');
    return;
  }
  printWindow.document.write(content);
  printWindow.document.close();
  // Wait for fonts to load before printing
  setTimeout(() => {
    printWindow.print();
  }, 800);
}

function getFDPDocHTML(): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bluecore FDP - Tài liệu hệ thống</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Be Vietnam Pro', 'Segoe UI', Tahoma, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a2e;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
    }
    h1 { font-size: 22pt; color: #1e3a5f; margin: 30px 0 10px; border-bottom: 3px solid #2563eb; padding-bottom: 8px; }
    h2 { font-size: 16pt; color: #1e3a5f; margin: 24px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    h3 { font-size: 13pt; color: #334155; margin: 18px 0 6px; }
    h4 { font-size: 11pt; color: #475569; margin: 12px 0 4px; }
    p { margin: 4px 0; }
    hr { border: none; border-top: 2px solid #e2e8f0; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    code, pre { font-family: 'Consolas', 'Courier New', monospace; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; }
    code { padding: 1px 4px; font-size: 10pt; }
    pre { padding: 10px; margin: 8px 0; overflow-x: auto; font-size: 9pt; white-space: pre-wrap; }
    blockquote { border-left: 3px solid #2563eb; padding: 6px 12px; margin: 8px 0; background: #eff6ff; font-style: italic; color: #1e40af; }
    ul, ol { margin: 4px 0 4px 20px; }
    li { margin: 2px 0; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: 600; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .section-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 12px 0; background: #fafbfc; }
    .formula-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px; margin: 8px 0; }
    .usecase-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; margin: 8px 0; }
    .cover-page { text-align: center; padding: 100px 0; page-break-after: always; }
    .cover-page h1 { font-size: 32pt; border: none; color: #1e3a5f; }
    .cover-page .subtitle { font-size: 14pt; color: #64748b; margin: 10px 0; }
    .cover-page .version { font-size: 11pt; color: #94a3b8; margin-top: 40px; }
    @media print {
      body { padding: 20px; font-size: 10pt; }
      h1 { page-break-before: always; }
      h1:first-of-type { page-break-before: avoid; }
      .cover-page { page-break-before: avoid; }
      .no-break { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

<div class="cover-page">
  <h1 style="font-size:32pt; border:none;">BLUECORE FDP</h1>
  <p class="subtitle">Financial Data Platform — Tài liệu hệ thống đầy đủ</p>
  <p class="subtitle" style="font-size:12pt; color:#2563eb;">Single Source of Truth cho CEO/CFO</p>
  <p class="version">Phiên bản 3.0 · Tháng 2/2026</p>
  <p class="version">11 nhóm menu · 40+ tính năng · 10 Data Layers</p>
</div>

<h1>PHẦN 1: FDP MANIFESTO — 10 Nguyên tắc bất biến</h1>

<div class="section-box no-break">
  <h3>1. FDP KHÔNG PHẢI PHẦN MỀM KẾ TOÁN</h3>
  <p>Phục vụ CEO/CFO điều hành, không nộp báo cáo thuế.</p>
</div>
<div class="section-box no-break">
  <h3>2. SINGLE SOURCE OF TRUTH</h3>
  <p>1 Net Revenue, 1 Contribution Margin, 1 Cash Position. Không có phiên bản khác.</p>
</div>
<div class="section-box no-break">
  <h3>3. TRUTH > FLEXIBILITY</h3>
  <p>Không cho tự định nghĩa metric, không chỉnh công thức tùy tiện, không "chọn số đẹp".</p>
</div>
<div class="section-box no-break">
  <h3>4. REAL CASH</h3>
  <p>Phân biệt: Cash đã về / sẽ về / có nguy cơ không về / đang bị khóa (tồn kho, ads, ops).</p>
</div>
<div class="section-box no-break">
  <h3>5. REVENUE ↔ COST</h3>
  <p>Mọi doanh thu đều đi kèm chi phí. Không có doanh thu "đứng một mình".</p>
</div>
<div class="section-box no-break">
  <h3>6. UNIT ECONOMICS → ACTION</h3>
  <p>SKU lỗ + khóa cash + tăng risk → phải nói STOP.</p>
</div>
<div class="section-box no-break">
  <h3>7. TODAY'S DECISION</h3>
  <p>Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng.</p>
</div>
<div class="section-box no-break">
  <h3>8. SURFACE PROBLEMS</h3>
  <p>Không làm đẹp số, không che anomaly, chỉ ra vấn đề sớm.</p>
</div>
<div class="section-box no-break">
  <h3>9. FEED CONTROL TOWER</h3>
  <p>FDP là nguồn sự thật, Control Tower hành động dựa trên đó.</p>
</div>
<div class="section-box no-break">
  <h3>10. FINAL TEST</h3>
  <p>Nếu không khiến quyết định rõ ràng hơn → FDP đã thất bại.</p>
</div>

<h1>PHẦN 2: KIẾN TRÚC DATA LAYERS (L1 → L10)</h1>

<table>
  <tr><th>Layer</th><th>Tên</th><th>Bảng chính</th><th>Mục đích</th></tr>
  <tr><td>L1</td><td>Foundation</td><td>tenants, organizations, members</td><td>Phân quyền, tổ chức</td></tr>
  <tr><td>L1.5</td><td>Ingestion</td><td>ingestion_batches, data_watermarks</td><td>Theo dõi nạp dữ liệu</td></tr>
  <tr><td>L2</td><td>Master Model</td><td>cdp_orders, master_products, master_customers</td><td>Dữ liệu gốc SSOT</td></tr>
  <tr><td>L2.5</td><td>Events/Marketing</td><td>commerce_events, campaigns, ad_spend_daily</td><td>Sự kiện và marketing</td></tr>
  <tr><td>L3</td><td>KPI Engine</td><td>kpi_definitions, kpi_facts_daily, kpi_targets</td><td>Chỉ số đã tính sẵn</td></tr>
  <tr><td>L4</td><td>Alert/Decision</td><td>alert_rules, alert_instances, decision_cards</td><td>Cảnh báo tự động</td></tr>
  <tr><td>L5</td><td>AI Query</td><td>ai_semantic_models, ai_conversations</td><td>AI phân tích</td></tr>
  <tr><td>L6</td><td>Audit</td><td>sync_jobs, audit_logs</td><td>Truy xuất lịch sử</td></tr>
  <tr><td>L10</td><td>BigQuery Sync</td><td>bq_connections, sync_configs</td><td>Đồng bộ nguồn</td></tr>
</table>

<div class="formula-box">
  <strong>Luồng dữ liệu:</strong><br>
  L1 (Foundation) → L1.5 (Ingestion) → L2 (Master) → L3 (KPI) → L4 (Alert) → Control Tower<br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↓<br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;L2.5 (Events) → MDP
</div>

<h1>PHẦN 3: TÍNH NĂNG THEO MENU (11 nhóm, 40+ trang)</h1>

<!-- 3.1 Decision Center -->
<h2>3.1 DECISION CENTER <span class="badge badge-green">/decision-center</span></h2>
<p><strong>Mô tả:</strong> Trung tâm ra quyết định tự động từ L4 Alert Layer. CEO/CFO mở app sáng ra, thấy ngay những vấn đề cần xử lý.</p>

<h4>Decision Cards</h4>
<ul>
  <li>Tự động sinh từ L4 Alert khi metric vượt ngưỡng</li>
  <li>Hiển thị: Mất bao nhiêu tiền? Nếu không xử lý? Còn bao lâu?</li>
  <li>Actions: Act (phân công), Snooze (hoãn), Dismiss (bỏ qua)</li>
  <li>Tracking outcome sau khi hành động</li>
</ul>

<h4>Bluecore Scores Panel</h4>
<ul>
  <li>Điểm sức khỏe tổng hợp từ nhiều KPI, cập nhật real-time từ L3</li>
</ul>

<h4>AI Decision Advisor</h4>
<ul>
  <li>Chat inline hỏi đáp về quyết định, dựa trên dữ liệu thật từ FDP</li>
</ul>

<h4>Threshold Config & Decision Follow-up</h4>
<ul>
  <li>Tùy chỉnh ngưỡng cảnh báo cho từng metric</li>
  <li>Theo dõi kết quả sau khi ra quyết định, đo lường hiệu quả</li>
</ul>

<div class="usecase-box">
  <strong>Use Case:</strong> CEO mở app sáng, thấy 3 decision cards cần xử lý. Card 1: "SKU ABC lỗ 15tr/tuần, đề xuất STOP". Bấm "Act" để phân công cho team.
</div>
<p><span class="badge badge-blue">Data Layer: L4 (Alert/Decision)</span></p>

<!-- 3.2 CFO Overview -->
<h2>3.2 CFO OVERVIEW (5 trang)</h2>

<h3>a) Retail Command Center <span class="badge badge-green">/dashboard</span></h3>
<p>Tổng quan sức khỏe retail trên 1 màn hình duy nhất.</p>
<ul>
  <li><strong>RetailHealthHero:</strong> Tổng quan sức khỏe retail với health score</li>
  <li><strong>MoneyEngineCards:</strong> Revenue, Profit, Cash position real-time</li>
  <li><strong>ChannelWarChart:</strong> So sánh kênh bán (Shopee, Lazada, TikTok, Website)</li>
  <li><strong>InventoryRiskPanel:</strong> Cảnh báo tồn kho rủi ro</li>
  <li><strong>CashVelocityPanel:</strong> Tốc độ dòng tiền</li>
  <li><strong>RetailDecisionFeed:</strong> Feed quyết định real-time</li>
</ul>
<div class="usecase-box">
  <strong>Use Case:</strong> CFO nhìn 1 màn hình biết "Retail machine đang khỏe hay đang chết ở đâu?"
</div>
<p><span class="badge badge-blue">Data Layer: L3 (KPI) + L4 (Alert)</span></p>

<h3>b) Cash Position <span class="badge badge-green">/cash-position</span></h3>
<p>Vị thế tiền mặt thật - phân biệt rõ tiền thật vs tiền bị khóa.</p>
<ul>
  <li>💰 Cash đã về (đã nhận)</li>
  <li>📥 Cash sẽ về (AR pending)</li>
  <li>⚠️ Cash nguy cơ không về (AR overdue)</li>
  <li>🔒 Cash bị khóa (tồn kho, ads, ops, platform)</li>
  <li><strong>Locked Cash Drilldown:</strong> Chi tiết tiền bị khóa ở đâu</li>
  <li><strong>Cash Runway:</strong> Số tháng còn hoạt động được</li>
</ul>
<div class="formula-box">
  <strong>Công thức:</strong><br>
  Real Cash = Bank Balance - Locked Cash<br>
  Locked Cash = Inventory Value + Prepaid Ads + Platform Holdings + Ops Deposits<br>
  Cash Runway = Real Cash / Monthly Burn Rate
</div>
<div class="usecase-box">
  <strong>Use Case:</strong> "Còn bao nhiêu tiền thật? Bao nhiêu bị khóa trong tồn kho?"
</div>

<h3>c) Cash Forecast <span class="badge badge-green">/cash-forecast</span></h3>
<p>Dự báo dòng tiền ngắn và trung hạn.</p>
<ul>
  <li>Daily Forecast View (7-30 ngày)</li>
  <li>Weekly Forecast View (4-12 tuần)</li>
  <li>Best / Base / Worst case scenarios</li>
  <li>Cash Gap Alert: Cảnh báo thiếu hụt tiền mặt</li>
</ul>
<div class="usecase-box"><strong>Use Case:</strong> "Tuần sau có đủ tiền trả lương không?"</div>

<h3>d) Cash Flow Direct <span class="badge badge-green">/cash-flow-direct</span></h3>
<p>Báo cáo dòng tiền theo phương pháp trực tiếp.</p>
<ul>
  <li>Operating / Investing / Financing cash flows</li>
  <li>Waterfall chart theo tháng</li>
  <li>Period-over-period analysis</li>
</ul>
<div class="usecase-box"><strong>Use Case:</strong> "Tiền đi đâu? Operating positive hay negative?"</div>

<h3>e) Working Capital Hub <span class="badge badge-green">/working-capital-hub</span></h3>
<p>Quản lý vốn lưu động và chu kỳ chuyển đổi tiền mặt.</p>
<div class="formula-box">
  <strong>Công thức:</strong><br>
  DIO = (Avg Inventory / COGS) × 365<br>
  DSO = (Avg AR / Revenue) × 365<br>
  DPO = (Avg AP / COGS) × 365<br>
  CCC = DIO + DSO - DPO
</div>
<div class="usecase-box"><strong>Use Case:</strong> "Mất bao nhiêu ngày để chuyển hàng thành tiền?"</div>

<!-- 3.3 Strategy & Decision -->
<h2>3.3 STRATEGY & DECISION (3 trang)</h2>

<h3>a) Executive Summary <span class="badge badge-green">/executive-summary</span></h3>
<p>Trang tóm tắt cho CEO chuẩn bị họp board.</p>
<ul>
  <li>Health Score Radar: 5 trục (Revenue, Profit, Cash, Growth, Risk)</li>
  <li>Cash Runway Status, Risk Alerts Summary</li>
  <li>Pending Decisions Panel, Key Metrics Snapshot</li>
</ul>
<div class="usecase-box"><strong>Use Case:</strong> CEO chuẩn bị họp board, cần 1 trang tóm tắt mọi thứ.</div>

<h3>b) Risk Dashboard <span class="badge badge-green">/risk-dashboard</span></h3>
<p>Ma trận rủi ro tài chính và vận hành.</p>
<ul>
  <li>Risk Matrix (Impact × Probability)</li>
  <li>Risk Categories: Financial, Operational, Market, Compliance</li>
  <li>Mitigation Tracking, Risk Trend</li>
</ul>

<h3>c) Decision Support <span class="badge badge-green">/decision-support</span></h3>
<p>Hỗ trợ ra quyết định đầu tư và chiến lược.</p>
<ul>
  <li>Hero Decision Card, Scenario Sandbox, Sensitivity Heatmap</li>
  <li>NPV/IRR Analysis, Payback Analysis</li>
  <li>AI Decision Advisor, ROI Analysis</li>
</ul>
<div class="formula-box">
  <strong>Công thức:</strong><br>
  NPV = Σ [CFt / (1+r)^t] - Initial Investment<br>
  IRR = Rate where NPV = 0<br>
  Payback = Time to recover initial investment
</div>
<div class="usecase-box"><strong>Use Case:</strong> "Nên đầu tư 500tr vào kho mới không? ROI bao nhiêu?"</div>

<!-- 3.4 Financial Reports -->
<h2>3.4 FINANCIAL REPORTS (6 trang)</h2>

<h3>a) P&L Report <span class="badge badge-green">/pl-report</span></h3>
<p>Báo cáo lãi lỗ chi tiết.</p>
<ul>
  <li>Revenue Breakdown theo kênh/sản phẩm</li>
  <li>Cost Waterfall: Revenue → COGS → Gross Profit → OPEX → EBITDA → Net Income</li>
  <li>Margin Analysis: Gross, Operating, Net Margin</li>
  <li>Period Comparison</li>
</ul>
<div class="formula-box">
  Gross Profit = Net Revenue - COGS<br>
  EBITDA = Gross Profit - OPEX (excl. D&A)<br>
  Net Income = EBITDA - Depreciation - Interest - Tax<br>
  Gross Margin = Gross Profit / Net Revenue × 100%
</div>
<div class="usecase-box"><strong>Use Case:</strong> "Tháng này lãi hay lỗ? Ở đâu?"</div>

<h3>b) Financial Analysis <span class="badge badge-green">/financial-reports</span></h3>
<ul>
  <li>KPI Summary (Revenue, Margin, Costs)</li>
  <li>Financial Insights tự động, Financial Ratios với targets</li>
  <li>100% SSOT — không tính toán ở client</li>
</ul>

<h3>c) Performance Analysis <span class="badge badge-green">/performance-analysis</span></h3>
<p>Budget vs Actual, Variance Analysis.</p>
<div class="formula-box">
  Variance = Actual - Budget<br>
  Variance % = (Actual - Budget) / Budget × 100%<br>
  Price Variance = (Actual Price - Budget Price) × Actual Qty<br>
  Volume Variance = (Actual Qty - Budget Qty) × Budget Price
</div>

<h3>d) Board Reports <span class="badge badge-green">/board-reports</span></h3>
<p>Auto-generate báo cáo cho Board of Directors. Export PDF/Excel.</p>

<h3>e) Expenses <span class="badge badge-green">/expenses</span></h3>
<p>Chi phí theo category (COGS, Marketing, Ops, HR...), Daily trend, Period comparison.</p>

<h3>f) Revenue <span class="badge badge-green">/revenue</span></h3>
<p>Revenue by channel, by product, by customer. Growth rate và trend.</p>

<!-- 3.5 Plan & Simulation -->
<h2>3.5 PLAN & SIMULATION (3 trang)</h2>

<h3>a) Scenario Hub <span class="badge badge-green">/scenario</span></h3>
<p>Mô phỏng What-If đa biến.</p>
<ul>
  <li>Time Horizon: 1T / 3T / 6T / 1N / 2N</li>
  <li>Multi-variable Sliders: Revenue, COGS, OPEX, Price, Volume</li>
  <li>Monthly Profit Trend Chart (dynamic)</li>
  <li>Save/Load Scenarios, Scenario Comparison side-by-side</li>
  <li>Monte Carlo Simulation</li>
</ul>
<div class="usecase-box"><strong>Use Case:</strong> "Nếu giảm giá 10% nhưng tăng volume 20%, EBITDA 6 tháng tới sẽ thế nào?"</div>

<h3>b) Rolling Forecast <span class="badge badge-green">/rolling-forecast</span></h3>
<p>Dự báo cuốn tự động, Forecast vs Actual tracking, Confidence Intervals.</p>

<h3>c) Strategic Initiatives <span class="badge badge-green">/strategic-initiatives</span></h3>
<p>Quản lý sáng kiến chiến lược: Timeline, ROI Measurement, Priority Matrix.</p>

<!-- 3.6 AR/AP -->
<h2>3.6 AR/AP & RECONCILIATION (6 trang)</h2>

<h3>a) Invoice Management <span class="badge badge-green">/invoice/tracking</span></h3>
<p>Tạo, theo dõi hóa đơn bán hàng. Lifecycle: Draft → Sent → Partial → Paid → Overdue.</p>

<h3>b) AR Operations <span class="badge badge-green">/ar-operations</span></h3>
<p>AR Aging Buckets (Current, 1-30, 31-60, 61-90, >90 ngày), DSO Tracking, Collection Workflow.</p>
<div class="formula-box">
  DSO = (Avg Accounts Receivable / Net Credit Sales) × 365<br>
  AR Turnover = Net Credit Sales / Avg AR
</div>

<h3>c) AP Overview <span class="badge badge-green">/bills</span></h3>
<p>Quản lý hóa đơn mua hàng, Payment Scheduling, AP Aging, DPO Tracking.</p>

<h3>d) Credit/Debit Notes <span class="badge badge-green">/credit-debit-notes</span></h3>
<p>Quản lý phiếu giảm giá và điều chỉnh.</p>

<h3>e) Reconciliation <span class="badge badge-green">/reconciliation</span></h3>
<p>Auto-matching ngân hàng vs hóa đơn, Confidence Score, Exception Queue, Audit Trail bất biến.</p>

<h3>f) Exceptions <span class="badge badge-green">/exceptions</span></h3>
<p>Danh sách giao dịch bất thường, Resolution Workflow, Auto-detection.</p>

<!-- 3.7 Retail Operations -->
<h2>3.7 RETAIL OPERATIONS (4 trang)</h2>

<h3>a) Inventory Aging <span class="badge badge-green">/inventory-aging</span></h3>
<p>Phân tích tuổi tồn kho và giá trị bị khóa.</p>
<ul>
  <li>Aging Buckets: 0-30, 31-60, 61-90, >90 ngày</li>
  <li>Locked Cash Value, Decision Cards cho tồn kho rủi ro</li>
  <li>Import dữ liệu tồn kho, Dead Stock Alert</li>
</ul>
<div class="formula-box">
  Locked Cash = Σ (SKU Qty × Unit Cost) for each aging bucket<br>
  Dead Stock Risk = Items with age > 90 days & velocity < threshold
</div>

<h3>b) Inventory Allocation <span class="badge badge-green">/inventory-allocation</span></h3>
<p>Rebalance suggestions giữa kho, Capacity Optimization, Simulation, Audit log, Export Excel.</p>

<h3>c) Promotion ROI <span class="badge badge-green">/promotion-roi</span></h3>
<p>Đo lường ROI thật của promotions và quảng cáo.</p>
<div class="formula-box">
  True ROI = (Contribution Margin - Ad Spend) / Ad Spend × 100%<br>
  ROAS = Revenue / Ad Spend<br>
  Profit ROAS = Contribution Margin / Ad Spend
</div>

<h3>d) Supplier Payments <span class="badge badge-green">/supplier-payments</span></h3>
<p>Lịch thanh toán NCC, Early Payment Discount, Overdue Tracking, Cash Impact Analysis.</p>

<!-- 3.8 Sales Channels -->
<h2>3.8 SALES CHANNELS (2+ trang)</h2>

<h3>a) Channel Analytics <span class="badge badge-green">/channel-analytics</span></h3>
<p>Performance by channel, Daily Revenue Trend, Order Status, Fees & Settlements.</p>

<h3>b) Unit Economics <span class="badge badge-green">/unit-economics</span></h3>
<p>Lõi của FDP — phân tích kinh tế đơn vị.</p>
<ul>
  <li>SKU Profitability Analysis, Contribution Margin by SKU</li>
  <li>SKU Stop Action (Nguyên tắc #6: STOP bán SKU lỗ)</li>
  <li>FDP Outcome Tracker, Cash Lock per SKU</li>
</ul>
<div class="formula-box">
  Contribution Margin = Revenue - COGS - Platform Fees - Shipping - Ads<br>
  CM% = Contribution Margin / Revenue × 100%<br>
  Cash Lock = Inventory Qty × Unit Cost + Prepaid Ads<br>
  Stop Signal = CM &lt; 0 AND Cash Lock > threshold AND Trend declining
</div>

<h3>Channel P&L <span class="badge badge-green">/channel/:channelId</span></h3>
<p>P&L chi tiết cho từng kênh: Revenue, COGS, Fees, Margin breakdown.</p>

<h3>Channel What-If <span class="badge badge-green">/channel/:channelId/whatif</span></h3>
<p>Mô phỏng thay đổi cho từng kênh cụ thể.</p>

<!-- 3.9 Data Hub -->
<h2>3.9 DATA HUB (5 trang)</h2>

<h3>a) Data Center <span class="badge badge-green">/data-hub</span></h3>
<p>Connector Management, Sync Status & History, Data Freshness Monitoring.</p>

<h3>b) Data Warehouse <span class="badge badge-green">/data-warehouse</span></h3>
<p>Schema Explorer, Data Lineage, Table Statistics.</p>

<h3>c) ETL Rules <span class="badge badge-green">/etl-rules</span></h3>
<p>Field Mapping, Transform Rules, Validation Rules.</p>

<h3>d) Chart of Accounts <span class="badge badge-green">/chart-of-accounts</span></h3>
<p>Hệ thống tài khoản kế toán: Account Tree, Management, Mapping.</p>

<h3>e) Bank Connections <span class="badge badge-green">/bank-connections</span></h3>
<p>Kết nối API ngân hàng, Transaction Import, Balance Sync.</p>

<!-- 3.10 Tax & Compliance -->
<h2>3.10 TAX & COMPLIANCE (2 trang)</h2>

<h3>a) Tax Tracking <span class="badge badge-green">/tax-compliance</span></h3>
<p>VAT Calculation, CIT Tracking, Tax Calendar, Tax Reports tự động.</p>

<h3>b) Covenant Tracking <span class="badge badge-green">/covenant-tracking</span></h3>
<p>Giám sát điều kiện tài chính, Breach Alert, Ratio Tracking (D/E, Current Ratio...).</p>

<!-- 3.11 Admin -->
<h2>3.11 ALERTS & ADMIN (5 trang)</h2>

<h3>a) Alerts <span class="badge badge-green">/alerts</span></h3>
<p>Trung tâm cảnh báo từ L4 Alert Layer. Filter theo severity và status.</p>

<h3>b) Company Management <span class="badge badge-green">/tenant</span></h3>
<p>Company profile, Fiscal year, Currency settings.</p>

<h3>c) Members <span class="badge badge-green">/tenant/members</span></h3>
<p>Invite/Remove members, Role assignment, Activity tracking.</p>

<h3>d) RBAC <span class="badge badge-green">/rbac</span></h3>
<p>Role definitions (CEO, CFO, Accountant, Viewer...), Permission matrix, Custom roles.</p>

<h3>e) Audit Log <span class="badge badge-green">/audit-log</span></h3>
<p>All user actions logged, Filter by user/action/date, Export. <span class="badge badge-blue">Data Layer: L6</span></p>

<!-- Part 4: Cross-Module -->
<h1>PHẦN 4: CROSS-MODULE INTEGRATION</h1>

<div class="section-box">
  <h3>FDP → Control Tower</h3>
  <p>L3 KPI vượt ngưỡng → L4 Alert → Control Tower hiển thị. FDP cung cấp "Financial Truth" cho mọi alert.</p>
</div>

<div class="section-box">
  <h3>FDP → MDP (Marketing Data Platform)</h3>
  <p>Locked costs cho Profit ROAS, Unit Economics cho marketing attribution, Cash impact cho campaign evaluation.</p>
</div>

<div class="section-box">
  <h3>FDP → CDP (Customer Data Platform)</h3>
  <p>Actual revenue cho LTV calculation, Payment behavior cho risk scoring, Customer profitability cho segmentation.</p>
</div>

<!-- Part 5 -->
<h1>PHẦN 5: NGUYÊN TẮC THIẾT KẾ</h1>

<h3>Data Flow</h3>
<pre>External Sources → L1.5 Ingestion → L2 Master → L3 KPI → L4 Alert → UI</pre>

<h3>Security</h3>
<ul>
  <li>Row Level Security (RLS) trên mọi bảng</li>
  <li>Tenant isolation</li>
  <li>RBAC cho từng feature</li>
</ul>

<h3>Performance</h3>
<ul>
  <li>KPI pre-calculated tại L3</li>
  <li>Client không tính toán, chỉ hiển thị</li>
  <li>Real-time updates qua Realtime subscriptions</li>
</ul>

<hr>
<p style="text-align:center; color:#94a3b8; font-size:10pt; margin-top:30px;">
  Tài liệu được tạo từ Bluecore FDP Platform · Phiên bản 3.0 · Tháng 2/2026
</p>

</body>
</html>`;
}
