/**
 * Generate a comprehensive PDF document covering ALL Bluecore systems:
 * FDP, MDP, Control Tower, Command
 * Including: Database design, Functions, Menu structure
 */
export function printFullBluecorePDF() {
  const content = getFullDocHTML();
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Vui lòng cho phép popup để tải PDF.');
    return;
  }
  printWindow.document.write(content);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 800);
}

function getFullDocHTML(): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bluecore Platform — Tài liệu tổng hợp</title>
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
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-purple { background: #f3e8ff; color: #7e22ce; }
    .badge-orange { background: #ffedd5; color: #c2410c; }
    .section-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 12px 0; background: #fafbfc; }
    .formula-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px; margin: 8px 0; }
    .usecase-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; margin: 8px 0; }
    .manifesto-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 10px; margin: 8px 0; }
    .cover-page { text-align: center; padding: 80px 0; page-break-after: always; }
    .cover-page h1 { font-size: 36pt; border: none; color: #1e3a5f; }
    .cover-page .subtitle { font-size: 14pt; color: #64748b; margin: 10px 0; }
    .cover-page .version { font-size: 11pt; color: #94a3b8; margin-top: 40px; }
    .toc { page-break-after: always; }
    .toc h2 { border: none; margin-bottom: 16px; }
    .toc ul { list-style: none; margin: 0; padding: 0; }
    .toc li { padding: 4px 0; border-bottom: 1px dotted #e2e8f0; }
    .toc li a { text-decoration: none; color: #1e3a5f; }
    .system-header { text-align: center; padding: 40px 0 20px; page-break-before: always; }
    .system-header h1 { font-size: 28pt; border: none; margin: 0; }
    .system-header p { font-size: 12pt; color: #64748b; }
    @media print {
      body { padding: 20px; font-size: 10pt; }
      .no-break { page-break-inside: avoid; }
      .cover-page { page-break-before: avoid; }
    }
  </style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- COVER PAGE -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="cover-page">
  <h1 style="font-size:36pt; border:none;">BLUECORE PLATFORM</h1>
  <p class="subtitle">Tài liệu tổng hợp toàn hệ thống</p>
  <p class="subtitle" style="font-size:12pt; color:#2563eb;">Database · Functions · Menu Structure</p>
  <br><br>
  <table style="width:80%; margin:0 auto; text-align:center;">
    <tr>
      <td style="border:none; padding:12px;">
        <span class="badge badge-green" style="font-size:11pt; padding:6px 16px;">FDP</span><br>
        <span style="font-size:9pt; color:#64748b;">Financial Data Platform</span>
      </td>
      <td style="border:none; padding:12px;">
        <span class="badge badge-purple" style="font-size:11pt; padding:6px 16px;">MDP</span><br>
        <span style="font-size:9pt; color:#64748b;">Marketing Data Platform</span>
      </td>
      <td style="border:none; padding:12px;">
        <span class="badge badge-amber" style="font-size:11pt; padding:6px 16px;">OPS</span><br>
        <span style="font-size:9pt; color:#64748b;">Control Tower</span>
      </td>
      <td style="border:none; padding:12px;">
        <span class="badge badge-orange" style="font-size:11pt; padding:6px 16px;">CMD</span><br>
        <span style="font-size:9pt; color:#64748b;">Command - Inventory OS</span>
      </td>
    </tr>
  </table>
  <p class="version">Phiên bản 3.0 · Tháng 2/2026</p>
  <p class="version">4 Hệ thống · 10 Data Layers · 50+ Trang · 5 Edge Functions</p>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- TABLE OF CONTENTS -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="toc">
  <h2>MỤC LỤC</h2>
  <h3>PHẦN A: KIẾN TRÚC TỔNG QUAN</h3>
  <ul>
    <li>A1. Data Layer Architecture (L1 → L10)</li>
    <li>A2. Table Mapping (Legacy → Schema-per-Tenant)</li>
    <li>A3. Cross-Module Integration</li>
    <li>A4. Security & Multi-Tenant</li>
  </ul>
  <h3>PHẦN B: FDP — Financial Data Platform</h3>
  <ul>
    <li>B1. FDP Manifesto (10 nguyên tắc)</li>
    <li>B2. Database Design (9 layers, 40+ tables)</li>
    <li>B3. Menu Structure (11 nhóm, 40+ trang)</li>
    <li>B4. Functions & Hooks</li>
  </ul>
  <h3>PHẦN C: MDP — Marketing Data Platform</h3>
  <ul>
    <li>C1. MDP Manifesto (10 nguyên tắc)</li>
    <li>C2. Database Design</li>
    <li>C3. Menu Structure (2 Modes, 14 trang)</li>
  </ul>
  <h3>PHẦN D: Control Tower</h3>
  <ul>
    <li>D1. Control Tower Manifesto (10 nguyên tắc)</li>
    <li>D2. Database Design</li>
    <li>D3. Menu Structure (7 trang)</li>
  </ul>
  <h3>PHẦN E: Command — Retail Inventory OS</h3>
  <ul>
    <li>E1. Command Manifesto</li>
    <li>E2. Database Design (5 layers)</li>
    <li>E3. Menu Structure (9 modules)</li>
    <li>E4. Edge Functions & Engines</li>
  </ul>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- PHẦN A: KIẾN TRÚC TỔNG QUAN -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
<div class="system-header">
  <h1 style="color:#1e3a5f;">PHẦN A: KIẾN TRÚC TỔNG QUAN</h1>
  <p>Database Architecture · Data Flow · Security</p>
</div>

<h2>A1. Data Layer Architecture (L1 → L10)</h2>
<table>
  <tr><th>Layer</th><th>Tên</th><th>Bảng chính</th><th>Mục đích</th></tr>
  <tr><td>L1</td><td>Foundation</td><td>tenants, organizations, members, user_roles</td><td>Phân quyền, tổ chức, multi-tenant isolation</td></tr>
  <tr><td>L1.5</td><td>Ingestion</td><td>ingestion_batches, data_watermarks, sync_checkpoints</td><td>Theo dõi nạp dữ liệu, watermark đồng bộ</td></tr>
  <tr><td>L2</td><td>Master Model</td><td>master_orders, master_products, master_customers, master_payments, master_refunds, master_fulfillments, master_inventory, master_costs, master_suppliers</td><td>Dữ liệu gốc SSOT</td></tr>
  <tr><td>L2.5</td><td>Events/Marketing</td><td>commerce_events, master_ad_accounts, master_campaigns, master_ad_spend_daily</td><td>Sự kiện thương mại và marketing</td></tr>
  <tr><td>L3</td><td>KPI Engine</td><td>kpi_definitions, kpi_facts_daily, kpi_targets, kpi_thresholds</td><td>Chỉ số đã tính sẵn (pre-aggregated)</td></tr>
  <tr><td>L4</td><td>Alert/Decision</td><td>alert_rules, alert_instances, decision_cards, card_actions, evidence_logs</td><td>Cảnh báo tự động, thẻ quyết định</td></tr>
  <tr><td>L5</td><td>AI Query</td><td>ai_conversations, ai_messages, ai_query_history, ai_favorites, ai_insights, ai_semantic_models</td><td>AI phân tích dữ liệu</td></tr>
  <tr><td>L6</td><td>Audit</td><td>sync_jobs, sync_errors, audit_logs, event_logs</td><td>Truy xuất lịch sử</td></tr>
  <tr><td>L10</td><td>BigQuery Sync</td><td>bigquery_connections, bigquery_sync_configs, query_cache</td><td>Đồng bộ nguồn dữ liệu</td></tr>
</table>

<div class="formula-box">
  <strong>Luồng dữ liệu chính:</strong><br>
  External Sources → L1.5 Ingestion → L2 Master Model → L3 KPI Engine → L4 Alert/Decision → UI<br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↓<br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;L2.5 Events → MDP (Marketing Data Platform)<br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;L4 Alert → Control Tower (Giám sát & Hành động)
</div>

<h2>A2. Table Mapping (Legacy → Schema-per-Tenant)</h2>
<p>Hệ thống sử dụng kiến trúc <strong>Hybrid Schema-per-Tenant v1.4</strong>:</p>
<ul>
  <li><strong>Tenant (Schema-level)</strong>: Cô lập dữ liệu cứng cho enterprise clients</li>
  <li><strong>Organization/Brand (Row-level RLS)</strong>: Multi-brand trong cùng schema</li>
  <li><strong>User (Cross-tenant)</strong>: Cho phép users thuộc nhiều tenants (consultants)</li>
</ul>

<table>
  <tr><th>Legacy Table</th><th>New Table (Provisioned)</th><th>Layer</th></tr>
  <tr><td>cdp_orders</td><td>master_orders</td><td>L2</td></tr>
  <tr><td>cdp_order_items</td><td>master_order_items</td><td>L2</td></tr>
  <tr><td>cdp_customers</td><td>master_customers</td><td>L2</td></tr>
  <tr><td>products</td><td>master_products</td><td>L2</td></tr>
  <tr><td>cdp_refunds</td><td>master_refunds</td><td>L2</td></tr>
  <tr><td>payments / invoices</td><td>master_payments</td><td>L2</td></tr>
  <tr><td>fulfillments</td><td>master_fulfillments</td><td>L2</td></tr>
  <tr><td>inventory</td><td>master_inventory</td><td>L2</td></tr>
  <tr><td>product_costs</td><td>master_costs</td><td>L2</td></tr>
  <tr><td>ad_spend / marketing_spend</td><td>master_ad_spend_daily</td><td>L2.5</td></tr>
  <tr><td>campaigns</td><td>master_campaigns</td><td>L2.5</td></tr>
  <tr><td>kpi_facts / kpi_snapshots</td><td>kpi_facts_daily</td><td>L3</td></tr>
  <tr><td>decision_cards / cdp_decision_cards</td><td>decision_cards</td><td>L4</td></tr>
</table>

<h3>Platform Tables (Global, Cross-tenant)</h3>
<table>
  <tr><th>Table</th><th>Mục đích</th></tr>
  <tr><td>ai_metric_definitions</td><td>Định nghĩa metrics cho AI</td></tr>
  <tr><td>ai_dimension_catalog</td><td>Danh mục dimensions</td></tr>
  <tr><td>ai_semantic_models</td><td>Mô hình ngữ nghĩa cho AI</td></tr>
  <tr><td>kpi_definition_templates</td><td>Templates KPI chuẩn</td></tr>
  <tr><td>alert_rule_templates</td><td>Templates alert rules</td></tr>
  <tr><td>decision_taxonomy</td><td>Phân loại quyết định</td></tr>
  <tr><td>feature_flags</td><td>Feature flags</td></tr>
</table>

<h2>A3. Cross-Module Integration</h2>
<div class="section-box no-break">
  <h3>FDP → Control Tower</h3>
  <p>L3 KPI vượt ngưỡng → L4 Alert → Control Tower hiển thị và ép hành động.<br>FDP cung cấp "Financial Truth" — mọi alert đều có giá trị tiền thật.</p>
</div>
<div class="section-box no-break">
  <h3>FDP → MDP</h3>
  <p>Locked costs → Profit ROAS · Unit Economics → Marketing attribution · Cash impact → Campaign evaluation.<br>MDP KHÔNG tính toán riêng — luôn lấy từ FDP.</p>
</div>
<div class="section-box no-break">
  <h3>FDP → Command</h3>
  <p>Cash Position → Capital Misallocation · Inventory Value → Cash Locked · Margin data → Clearance decisions.</p>
</div>
<div class="section-box no-break">
  <h3>Command → Control Tower</h3>
  <p>Size breaks, markdown risks, lost revenue → Alert instances → Control Tower enforcement.</p>
</div>

<h2>A4. Security & Multi-Tenant</h2>
<ul>
  <li><strong>Row Level Security (RLS)</strong> trên mọi bảng có tenant_id</li>
  <li><strong>Schema isolation</strong> cho enterprise tenants (provisioned)</li>
  <li><strong>RBAC</strong> với roles: CEO, CFO, COO, Manager, Accountant, Viewer</li>
  <li><strong>Audit trail</strong> bất biến — mọi thay đổi đều được ghi log (L6)</li>
</ul>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- PHẦN B: FDP -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
<div class="system-header">
  <h1 style="color:#16a34a;">PHẦN B: FDP — Financial Data Platform</h1>
  <p>Single Source of Truth cho CEO/CFO · 11 nhóm menu · 40+ trang</p>
</div>

<h2>B1. FDP Manifesto — 10 Nguyên tắc bất biến</h2>
<div class="manifesto-box no-break">
  <ol>
    <li><strong>KHÔNG PHẢI KẾ TOÁN</strong> — Phục vụ CEO/CFO điều hành, không nộp báo cáo thuế</li>
    <li><strong>SINGLE SOURCE OF TRUTH</strong> — 1 Net Revenue, 1 Contribution Margin, 1 Cash Position</li>
    <li><strong>TRUTH > FLEXIBILITY</strong> — Không tự định nghĩa metric, không chỉnh công thức tùy tiện</li>
    <li><strong>REAL CASH</strong> — Phân biệt: đã về / sẽ về / nguy cơ / bị khóa</li>
    <li><strong>REVENUE ↔ COST</strong> — Mọi doanh thu đều đi kèm chi phí</li>
    <li><strong>UNIT ECONOMICS → ACTION</strong> — SKU lỗ + khóa cash + tăng risk → STOP</li>
    <li><strong>TODAY'S DECISION</strong> — Phục vụ quyết định hôm nay</li>
    <li><strong>SURFACE PROBLEMS</strong> — Không làm đẹp số, chỉ ra vấn đề sớm</li>
    <li><strong>FEED CONTROL TOWER</strong> — FDP là nguồn sự thật, Control Tower hành động</li>
    <li><strong>FINAL TEST</strong> — Nếu không khiến quyết định rõ ràng hơn → thất bại</li>
  </ol>
</div>

<h2>B2. FDP Database Design</h2>

<h3>Precomputed Metrics (DB-First Architecture)</h3>
<table>
  <tr><th>Table</th><th>Mục đích</th><th>Grain</th></tr>
  <tr><td>central_metrics_snapshots</td><td>Tất cả CFO/CEO-level metrics</td><td>1 row/tenant/snapshot</td></tr>
  <tr><td>central_metric_facts</td><td>Breakdowns chi tiết</td><td>SKU, Store, Channel, Customer, Category</td></tr>
  <tr><td>finance_monthly_summary</td><td>Monthly aggregated series</td><td>Monthly per tenant</td></tr>
</table>

<h3>Database Functions</h3>
<table>
  <tr><th>Function</th><th>Mô tả</th></tr>
  <tr><td><code>compute_central_metrics_snapshot(p_tenant_id, p_period_start, p_period_end)</code></td><td>Tính toán tất cả metrics từ source tables → snapshot</td></tr>
  <tr><td><code>get_latest_central_metrics(p_tenant_id, p_max_age_minutes)</code></td><td>Auto-refresh snapshot nếu stale</td></tr>
</table>

<h3>Views</h3>
<table>
  <tr><th>View</th><th>Mô tả</th></tr>
  <tr><td><code>v_latest_central_metrics</code></td><td>Luôn trả về snapshot mới nhất per tenant</td></tr>
</table>

<h3>Canonical Hooks (Frontend SSOT)</h3>
<table>
  <tr><th>Hook</th><th>Mục đích</th><th>Source</th></tr>
  <tr><td><code>useFinanceTruthSnapshot()</code></td><td>Tất cả CFO/CEO metrics</td><td>central_metrics_snapshots</td></tr>
  <tr><td><code>useFinanceTruthFacts()</code></td><td>Grain-level data (SKU, Store, Channel)</td><td>central_metric_facts</td></tr>
  <tr><td><code>useFinanceMonthlySummary()</code></td><td>Monthly trends cho charts</td><td>finance_monthly_summary</td></tr>
</table>
<div class="formula-box">
  <strong>SSOT Enforcement:</strong><br>
  ✅ ALLOWED: fetch, field mapping, formatting<br>
  ❌ FORBIDDEN: Revenue/margin/EBITDA calculations, aggregations, KPI formulas<br>
  Source Tables → compute_central_metrics_snapshot() → central_metrics_snapshots → useFinanceTruthSnapshot() → UI
</div>

<h3>Core Financial Tables</h3>
<table>
  <tr><th>Table</th><th>Columns chính</th><th>Mục đích</th></tr>
  <tr><td>invoices</td><td>invoice_number, customer_id, total_amount, status, due_date</td><td>Hóa đơn bán hàng (AR)</td></tr>
  <tr><td>bills</td><td>bill_number, supplier_id, total_amount, status, due_date</td><td>Hóa đơn mua hàng (AP)</td></tr>
  <tr><td>bank_transactions</td><td>amount, type, category, reconciled</td><td>Giao dịch ngân hàng</td></tr>
  <tr><td>reconciliation_matches</td><td>invoice_id, bank_transaction_id, confidence_score</td><td>Đối soát tự động</td></tr>
  <tr><td>adjustment_notes</td><td>note_type, direction, total_amount</td><td>Credit/Debit notes</td></tr>
  <tr><td>gl_accounts</td><td>account_code, account_name, account_type</td><td>Hệ thống tài khoản</td></tr>
</table>

<h2>B3. FDP Menu Structure (11 nhóm)</h2>

<h3>1. Decision Center <span class="badge badge-green">/decision-center</span></h3>
<ul>
  <li>Decision Cards (auto-generated từ L4 Alert)</li>
  <li>Bluecore Scores Panel</li>
  <li>AI Decision Advisor</li>
  <li>Threshold Config & Decision Follow-up</li>
</ul>

<h3>2. CFO Overview (5 trang)</h3>
<ul>
  <li><strong>Retail Command Center</strong> <span class="badge badge-green">/dashboard</span> — Health Hero, Money Engine, Channel War</li>
  <li><strong>Cash Position</strong> <span class="badge badge-green">/cash-position</span> — Available / Expected / At Risk / Locked</li>
  <li><strong>Cash Forecast</strong> <span class="badge badge-green">/cash-forecast</span> — Daily/Weekly, Best/Base/Worst</li>
  <li><strong>Cash Flow Direct</strong> <span class="badge badge-green">/cash-flow-direct</span> — Operating/Investing/Financing</li>
  <li><strong>Working Capital Hub</strong> <span class="badge badge-green">/working-capital-hub</span> — DIO, DSO, DPO, CCC</li>
</ul>
<div class="formula-box">
  CCC = DIO + DSO - DPO<br>
  Cash Runway = Available Cash / Monthly Burn Rate<br>
  Real Cash = Bank Balance - Locked Cash
</div>

<h3>3. Strategy & Decision (3 trang)</h3>
<ul>
  <li><strong>Executive Summary</strong> <span class="badge badge-green">/executive-summary</span> — Health Radar, Runway, Risk</li>
  <li><strong>Risk Dashboard</strong> <span class="badge badge-green">/risk-dashboard</span> — Risk Matrix (Impact × Probability)</li>
  <li><strong>Decision Support</strong> <span class="badge badge-green">/decision-support</span> — NPV, IRR, Scenario Sandbox</li>
</ul>

<h3>4. Financial Reports (6 trang)</h3>
<ul>
  <li><strong>P&L Report</strong> <span class="badge badge-green">/pl-report</span> — Revenue → COGS → Gross Profit → OPEX → EBITDA</li>
  <li><strong>Financial Analysis</strong> <span class="badge badge-green">/financial-reports</span></li>
  <li><strong>Performance Analysis</strong> <span class="badge badge-green">/performance-analysis</span> — Budget vs Actual</li>
  <li><strong>Board Reports</strong> <span class="badge badge-green">/board-reports</span> — Auto-generate PDF/Excel</li>
  <li><strong>Expenses</strong> <span class="badge badge-green">/expenses</span></li>
  <li><strong>Revenue</strong> <span class="badge badge-green">/revenue</span></li>
</ul>

<h3>5. Plan & Simulation (3 trang)</h3>
<ul>
  <li><strong>Scenario Hub</strong> <span class="badge badge-green">/scenario</span> — What-If, Monte Carlo</li>
  <li><strong>Rolling Forecast</strong> <span class="badge badge-green">/rolling-forecast</span></li>
  <li><strong>Strategic Initiatives</strong> <span class="badge badge-green">/strategic-initiatives</span></li>
</ul>

<h3>6. AR/AP & Reconciliation (6 trang)</h3>
<ul>
  <li><strong>Invoice Management</strong> <span class="badge badge-green">/invoice/tracking</span></li>
  <li><strong>AR Operations</strong> <span class="badge badge-green">/ar-operations</span> — Aging Buckets, DSO</li>
  <li><strong>AP Overview</strong> <span class="badge badge-green">/bills</span> — DPO, Payment Scheduling</li>
  <li><strong>Credit/Debit Notes</strong> <span class="badge badge-green">/credit-debit-notes</span></li>
  <li><strong>Reconciliation</strong> <span class="badge badge-green">/reconciliation</span> — Auto-matching</li>
  <li><strong>Exceptions</strong> <span class="badge badge-green">/exceptions</span></li>
</ul>

<h3>7. Retail Operations (4 trang)</h3>
<ul>
  <li><strong>Inventory Aging</strong> <span class="badge badge-green">/inventory-aging</span> — Buckets, Dead Stock</li>
  <li><strong>Inventory Allocation</strong> <span class="badge badge-green">/inventory-allocation</span></li>
  <li><strong>Promotion ROI</strong> <span class="badge badge-green">/promotion-roi</span></li>
  <li><strong>Supplier Payments</strong> <span class="badge badge-green">/supplier-payments</span></li>
</ul>

<h3>8. Sales Channels (2+ trang)</h3>
<ul>
  <li><strong>Channel Analytics</strong> <span class="badge badge-green">/channel-analytics</span></li>
  <li><strong>Unit Economics</strong> <span class="badge badge-green">/unit-economics</span> — SKU Profitability, Stop Signal</li>
  <li><strong>Channel P&L</strong> <span class="badge badge-green">/channel/:channelId</span></li>
</ul>
<div class="formula-box">
  Contribution Margin = Revenue - COGS - Platform Fees - Shipping - Ads<br>
  Stop Signal = CM &lt; 0 AND Cash Lock > threshold AND Trend declining
</div>

<h3>9. Data Hub (5 trang)</h3>
<ul>
  <li>Data Center, Data Warehouse, ETL Rules, Chart of Accounts, Bank Connections</li>
</ul>

<h3>10. Tax & Compliance (2 trang)</h3>
<ul>
  <li>Tax Tracking, Covenant Tracking</li>
</ul>

<h3>11. Alerts & Admin (5 trang)</h3>
<ul>
  <li>Alerts, Company Management, Members, RBAC, Audit Log</li>
</ul>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- PHẦN C: MDP -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
<div class="system-header">
  <h1 style="color:#7e22ce;">PHẦN C: MDP — Marketing Data Platform</h1>
  <p>Profit before Performance. Cash before Clicks.</p>
</div>

<h2>C1. MDP Manifesto — 10 Nguyên tắc</h2>
<div class="manifesto-box no-break">
  <ol>
    <li><strong>KHÔNG PHẢI MARTECH</strong> — Không chạy quảng cáo, không thay thế Ads Manager</li>
    <li><strong>ĐO LƯỜNG GIÁ TRỊ TÀI CHÍNH THẬT</strong> — Marketing đang tạo hay phá huỷ giá trị?</li>
    <li><strong>PHỤC VỤ CEO & CFO TRƯỚC</strong> — CFO hiểu, CEO quyết, marketer điều chỉnh</li>
    <li><strong>PROFIT ATTRIBUTION</strong> — Không phải Click Attribution. Mỗi campaign truy đến contribution margin</li>
    <li><strong>GẮN MARKETING VỚI CASHFLOW</strong> — Tiền về nhanh hay chậm? Có refund? Có khóa cash?</li>
    <li><strong>NUÔI FDP & CONTROL TOWER</strong> — MDP không đứng độc lập</li>
    <li><strong>ƯU TIÊN RỦI RO HƠN THÀNH TÍCH</strong> — Phát hiện marketing đốt tiền, tăng trưởng giả</li>
    <li><strong>ĐƠN GIẢN HOÁ ATTRIBUTION</strong> — Logic rõ ràng, giả định bảo thủ, CFO tin được</li>
    <li><strong>KHÔNG CHO TĂNG TRƯỞNG VÔ TRÁCH NHIỆM</strong> — Mỗi quyết định: lãi/lỗ? cash? rủi ro?</li>
    <li><strong>FINAL TEST</strong> — Nếu không làm quyết định marketing rõ ràng hơn → thất bại</li>
  </ol>
</div>

<h2>C2. MDP Database Design</h2>
<table>
  <tr><th>Table</th><th>Mục đích</th><th>Layer</th></tr>
  <tr><td>ad_spend_daily</td><td>Chi phí quảng cáo hàng ngày per channel/campaign</td><td>L2.5</td></tr>
  <tr><td>master_ad_accounts</td><td>Tài khoản quảng cáo</td><td>L2.5</td></tr>
  <tr><td>master_campaigns</td><td>Chiến dịch marketing</td><td>L2.5</td></tr>
  <tr><td>commerce_events</td><td>Sự kiện thương mại (click, purchase, refund)</td><td>L2.5</td></tr>
  <tr><td>mdp_seasonal_patterns</td><td>Mô hình mùa vụ marketing</td><td>L2.5</td></tr>
  <tr><td>cdp_customer_cohort_cac</td><td>CAC theo cohort</td><td>L3</td></tr>
  <tr><td>cdp_churn_signals</td><td>Tín hiệu churn</td><td>L3</td></tr>
</table>

<h3>Key Formulas</h3>
<div class="formula-box">
  ROAS = Revenue / Ad Spend<br>
  Profit ROAS = Contribution Margin / Ad Spend<br>
  Cash-ROAS = Cash Collected / Ad Spend (within period)<br>
  Channel Profit = Revenue - COGS - Ad Spend - Platform Fees - Returns<br>
  LTV = AOV × Purchase Frequency × Customer Lifespan<br>
  CAC:LTV Ratio = Customer Acquisition Cost / LTV (should be > 3:1)
</div>

<h2>C3. MDP Menu Structure</h2>

<h3>Marketing Mode (Execution) — 7 trang</h3>
<table>
  <tr><th>Trang</th><th>Path</th><th>Mô tả</th></tr>
  <tr><td>Marketing Mode</td><td>/mdp/marketing-mode</td><td>Tổng quan hiệu suất: Spend, Revenue, ROAS</td></tr>
  <tr><td>Campaign Performance</td><td>/mdp/campaigns</td><td>CTR, CPC, CPM, Conversion Rate per campaign</td></tr>
  <tr><td>Channel Analysis</td><td>/mdp/channels</td><td>So sánh hiệu suất giữa kênh, Channel Mix</td></tr>
  <tr><td>Marketing Funnel</td><td>/mdp/funnel</td><td>Impressions → Clicks → Cart → Purchase</td></tr>
  <tr><td>A/B Testing</td><td>/mdp/ab-testing</td><td>Test management, Statistical Significance</td></tr>
  <tr><td>ROI Analytics</td><td>/mdp/roi-analytics</td><td>ROI by campaign, Payback Period</td></tr>
  <tr><td>Customer LTV</td><td>/mdp/customer-ltv</td><td>LTV, CAC:LTV Ratio, Cohort Analysis</td></tr>
</table>

<h3>CMO Mode (Decision) — 7 trang</h3>
<table>
  <tr><th>Trang</th><th>Path</th><th>Mô tả</th></tr>
  <tr><td>CMO Mode</td><td>/mdp/cmo-mode</td><td>Profit-First View, Cash Impact Summary</td></tr>
  <tr><td>Profit Attribution</td><td>/mdp/profit</td><td>Profit by Channel (không phải Revenue)</td></tr>
  <tr><td>Cash Impact</td><td>/mdp/cash-impact</td><td>Cash Cycle, Working Capital Impact, Cash-ROAS</td></tr>
  <tr><td>Marketing Risks</td><td>/mdp/risks</td><td>Burn Rate Alert, ROAS Degradation, Concentration Risk</td></tr>
  <tr><td>Budget Optimizer</td><td>/mdp/budget-optimizer</td><td>AI-Powered Allocation, Constraint-Based</td></tr>
  <tr><td>Decision Center</td><td>/mdp/decisions</td><td>Scale/Stop Recommendations</td></tr>
  <tr><td>Scenario Planner</td><td>/mdp/scenario-planner</td><td>What-If Scenarios, Impact Projection</td></tr>
</table>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- PHẦN D: CONTROL TOWER -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
<div class="system-header">
  <h1 style="color:#d97706;">PHẦN D: CONTROL TOWER</h1>
  <p>Awareness before Analytics. Action before Reports.</p>
</div>

<h2>D1. Control Tower Manifesto — 10 Nguyên tắc</h2>
<div class="manifesto-box no-break">
  <ol>
    <li><strong>KHÔNG PHẢI DASHBOARD</strong> — Tồn tại để báo động và hành động</li>
    <li><strong>CHỈ QUAN TÂM "ĐIỀU GÌ SAI"</strong> — Không có vấn đề → im lặng</li>
    <li><strong>MỖI ALERT PHẢI ĐAU & CÓ GIÁ</strong> — Mất bao nhiêu? Mất thêm? Còn bao lâu?</li>
    <li><strong>ÍT NHƯNG CHÍ MẠNG</strong> — Tối đa 5-7 alerts</li>
    <li><strong>PHẢI CÓ CHỦ SỞ HỮU & KẾT QUẢ</strong> — Không owner = không alert</li>
    <li><strong>KHÔNG REAL-TIME VÔ NGHĨA</strong> — Cash: near real-time · Marketing: daily · Ops: event-based</li>
    <li><strong>LUÔN GẮN VỚI FDP</strong> — Mọi alert dựa trên Financial Truth</li>
    <li><strong>ÉP HÀNH ĐỘNG</strong> — Ai cần làm gì trong bao lâu</li>
    <li><strong>KHÔNG ĐỂ BẤT NGỜ</strong> — Phát hiện sớm, báo trước khi quá muộn</li>
    <li><strong>FINAL TEST</strong> — Nếu không khiến việc xử lý sớm hơn → thất bại</li>
  </ol>
</div>

<h2>D2. Control Tower Database Design</h2>
<table>
  <tr><th>Table</th><th>Mục đích</th></tr>
  <tr><td>alert_rules</td><td>Quy tắc cảnh báo: metric, threshold, severity</td></tr>
  <tr><td>alert_instances</td><td>Instances cảnh báo đã trigger</td></tr>
  <tr><td>alert_clusters</td><td>Gom nhóm alerts liên quan</td></tr>
  <tr><td>alert_escalations</td><td>Escalation khi quá hạn</td></tr>
  <tr><td>alert_escalation_rules</td><td>Quy tắc escalation theo severity</td></tr>
  <tr><td>alert_digest_configs</td><td>Cấu hình digest hàng ngày/tuần</td></tr>
  <tr><td>alert_data_sources</td><td>Nguồn dữ liệu cho alerts</td></tr>
  <tr><td>intelligent_alert_rules</td><td>Alert rules thông minh (trend-based)</td></tr>
  <tr><td>alert_objects</td><td>Đối tượng được giám sát</td></tr>
  <tr><td>alert_calculations_log</td><td>Log tính toán alert</td></tr>
  <tr><td>early_warning_alerts</td><td>Cảnh báo sớm</td></tr>
  <tr><td>decision_learning_patterns</td><td>Patterns AI học từ quyết định</td></tr>
  <tr><td>ai_advisor_config</td><td>Cấu hình AI advisor</td></tr>
  <tr><td>ai_advisor_responses</td><td>Phản hồi của AI advisor</td></tr>
</table>

<h3>Views</h3>
<table>
  <tr><th>View</th><th>Mô tả</th></tr>
  <tr><td>v_alerts_pending_escalation</td><td>Alerts sắp bị escalate</td></tr>
  <tr><td>v_alerts_with_resolution</td><td>Alerts với thông tin resolution</td></tr>
  <tr><td>v_active_alerts_hierarchy</td><td>Active alerts theo hierarchy</td></tr>
  <tr><td>v_decision_pending_followup</td><td>Decisions chờ follow-up</td></tr>
  <tr><td>v_decision_effectiveness</td><td>Hiệu quả quyết định</td></tr>
</table>

<h2>D3. Control Tower Menu Structure (7 trang)</h2>
<table>
  <tr><th>Trang</th><th>Path</th><th>Mô tả</th></tr>
  <tr><td>Alerts Center</td><td>/control-tower/alerts</td><td>Alert Structure (Impact, Deadline, Owner), Severity Levels, Limit 5-7</td></tr>
  <tr><td>Tasks Management</td><td>/control-tower/tasks</td><td>Task from Alert, Assignment, Status tracking</td></tr>
  <tr><td>Intelligent Rules</td><td>/control-tower/kpi-rules</td><td>Threshold-based, Trend-based, Cross-Domain rules</td></tr>
  <tr><td>Store Health Map</td><td>/control-tower/stores</td><td>Store performance, Health Score, Issue Detection</td></tr>
  <tr><td>Analytics</td><td>/control-tower/analytics</td><td>Alert stats, Resolution Time (MTTR), Team Performance</td></tr>
  <tr><td>Team Management</td><td>/control-tower/team</td><td>Members, Roles, Escalation Chain</td></tr>
  <tr><td>Settings</td><td>/control-tower/settings</td><td>Notifications, Digest, Thresholds, Integration</td></tr>
</table>

<div class="formula-box">
  MTTR = Sum(Resolution Time) / Number of Resolved Alerts<br>
  Store Health = w1×Revenue + w2×Margin + w3×Inventory + w4×Customer
</div>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- PHẦN E: COMMAND -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
<div class="system-header">
  <h1 style="color:#c2410c;">PHẦN E: COMMAND — Retail Inventory OS</h1>
  <p>Decision Stack cho tồn kho: Size Intelligence · Clearance · Growth Simulator</p>
</div>

<h2>E1. Command Manifesto</h2>
<div class="manifesto-box no-break">
  <ol>
    <li><strong>OPERATIONAL BRAIN</strong> — Size Control Tower: phát hiện lẻ size, tái cân bằng</li>
    <li><strong>EXECUTIVE BRAIN</strong> — Retail Flight Deck: Time to Financial Damage</li>
    <li><strong>STRATEGIC BRAIN</strong> — Growth Simulator: Growth Gravity & production planning</li>
    <li><strong>FC-LEVEL DECISIONS</strong> — Family Code, không SKU — giảm noise</li>
    <li><strong>EVIDENCE-BASED</strong> — Mỗi khuyến nghị có Evidence Pack</li>
    <li><strong>REAL CASH IMPACT</strong> — Vốn Khóa, Doanh Thu Mất, Rò Biên</li>
    <li><strong>DECISION → OUTCOME</strong> — Dự đoán vs Thực tế, hệ thống học</li>
    <li><strong>SURFACE PROBLEMS EARLY</strong> — Curve vỡ, markdown risk, supply gap sớm</li>
    <li><strong>APPROVAL GOVERNANCE</strong> — 3 cấp: SAFE → ELEVATED → HIGH</li>
    <li><strong>FINAL TEST</strong> — Nếu không giảm Capital Misallocation → thất bại</li>
  </ol>
</div>

<h2>E2. Command Database Design (5 Layers)</h2>
<table>
  <tr><th>Layer</th><th>Tables</th><th>Mục đích</th></tr>
  <tr><td>L1 Foundation</td><td>inv_family_codes, inv_stores, inv_sku_fc_mapping, inv_state_positions, inv_state_demand, inv_collections</td><td>FC, store, SKU mapping, tồn kho, demand</td></tr>
  <tr><td>L2 State (Daily)</td><td>state_size_health_daily, state_size_transfer_daily, state_cash_lock_daily, state_margin_leak_daily, state_markdown_risk_daily, state_lost_revenue_daily</td><td>Trạng thái tính toán hàng ngày</td></tr>
  <tr><td>L3 KPI & Evidence</td><td>kpi_inventory_distortion, kpi_network_gap, kpi_size_completeness, si_evidence_packs</td><td>Chỉ số tổng hợp, evidence</td></tr>
  <tr><td>L4 Decision</td><td>dec_decision_packages, dec_decision_package_lines, dec_decision_approvals, dec_decision_outcomes, dec_production_candidates</td><td>Package, phê duyệt, kết quả</td></tr>
  <tr><td>SC Semantic Config</td><td>sem_allocation_policies, sem_sku_criticality, sem_size_curve_profiles, sem_markdown_ladders, sem_markdown_caps, inv_constraint_registry</td><td>Chính sách, curves, tiers</td></tr>
</table>

<h3>KPI & Scoring</h3>
<table>
  <tr><th>Metric</th><th>Range</th><th>Công thức</th></tr>
  <tr><td>Size Health Score</td><td>0–100</td><td>deviation_score, core_size_missing, shallow_depth</td></tr>
  <tr><td>Markdown Risk Score</td><td>0–100</td><td>aging, velocity, season proximity, depth</td></tr>
  <tr><td>Capital Misallocation</td><td>VNĐ</td><td>Lost Revenue + Cash Locked + Margin Leak</td></tr>
  <tr><td>Transfer Score</td><td>0–100</td><td>(dest_velocity × net_benefit) / cost</td></tr>
  <tr><td>Hero Score</td><td>0–100</td><td>Revenue Velocity × Sell-through × Margin × Trend</td></tr>
</table>

<h2>E3. Command Menu Structure (9 Modules)</h2>
<table>
  <tr><th>#</th><th>Module</th><th>Path</th><th>Mô tả</th></tr>
  <tr><td>1</td><td>Overview</td><td>/command/overview</td><td>KPI Cards, Capital Misallocation, Intelligence Cards</td></tr>
  <tr><td>2</td><td>Allocation</td><td>/command/allocation</td><td>Push (DC→Store) & Lateral (Store↔Store)</td></tr>
  <tr><td>3</td><td>Assortment</td><td>/command/assortment</td><td>Size Control Tower, Size Break Detection, Smart Transfer</td></tr>
  <tr><td>4</td><td>Clearance</td><td>/command/clearance</td><td>Markdown Risk, Channel Selection, Premium Guardrails</td></tr>
  <tr><td>5</td><td>Network Gap</td><td>/command/network-gap</td><td>Supply Gap Analysis, Growth Simulator, Hero FC</td></tr>
  <tr><td>6</td><td>Production</td><td>/command/production</td><td>Production Candidates, Priority Ranking</td></tr>
  <tr><td>7</td><td>Decisions</td><td>/command/decisions</td><td>Decision Queue, 3-Tier Approval, Evidence Pack</td></tr>
  <tr><td>8</td><td>Outcomes</td><td>/command/outcomes</td><td>Predicted vs Actual, Accuracy Score, Learning</td></tr>
  <tr><td>9</td><td>Settings</td><td>/command/settings</td><td>Policies, Size Curves, Markdown Caps, Criticality</td></tr>
</table>

<h3>Approval Governance (3 cấp)</h3>
<table>
  <tr><th>Cấp</th><th>Người duyệt</th><th>Tiêu chí</th></tr>
  <tr><td><span class="badge badge-green">SAFE</span></td><td>Planner / Merchandiser</td><td>Impact thấp, routine transfers. Có thể batch approve.</td></tr>
  <tr><td><span class="badge badge-amber">ELEVATED</span></td><td>Head Merchandising</td><td>Medium impact, nhiều FC, cross-region. Review từng package.</td></tr>
  <tr><td><span class="badge badge-red">HIGH</span></td><td>CFO / COO</td><td>High impact, production, policy overrides. Cần evidence pack.</td></tr>
</table>

<h2>E4. Edge Functions & Engines</h2>
<table>
  <tr><th>Engine</th><th>Mô tả</th><th>Input → Output</th></tr>
  <tr><td><code>inventory-kpi-engine</code></td><td>Tính Size Health, Cash Lock, Margin Leak, Lost Revenue hàng ngày</td><td>L1 Foundation → L2 State Tables</td></tr>
  <tr><td><code>inventory-allocation-engine</code></td><td>Phân bổ Push & Lateral, tôn trọng constraints</td><td>L1 + Policies → Decision Packages</td></tr>
  <tr><td><code>inventory-decision-packager</code></td><td>Đóng gói recommendations → Decision Packages + risk tier</td><td>Suggestions → L4 Packages</td></tr>
  <tr><td><code>inventory-outcome-evaluator</code></td><td>So sánh Predicted vs Actual, tính accuracy</td><td>L4 Packages → Outcomes</td></tr>
  <tr><td><code>inventory-backfill-size-split</code></td><td>Backfill size distribution data</td><td>Historical → State Tables</td></tr>
</table>

<h3>Other Edge Functions</h3>
<table>
  <tr><th>Function</th><th>Mô tả</th></tr>
  <tr><td><code>build-knowledge-snapshots</code></td><td>Build AI knowledge snapshots</td></tr>
  <tr><td><code>cdp-qa</code></td><td>AI Q&A trên dữ liệu (NL → SQL)</td></tr>
</table>

<hr>
<p style="text-align:center; color:#94a3b8; font-size:10pt; margin-top:30px;">
  <strong>BLUECORE PLATFORM</strong> — Tài liệu tổng hợp toàn hệ thống<br>
  FDP · MDP · Control Tower · Command<br>
  Phiên bản 3.0 · Tháng 2/2026<br>
  <em>Document auto-generated from Bluecore Platform</em>
</p>

</body>
</html>`;
}
