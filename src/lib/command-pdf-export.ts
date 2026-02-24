/**
 * Generate a print-friendly HTML page from the Command documentation
 * and trigger browser print dialog (Save as PDF).
 */
export function printCommandDocumentationAsPDF() {
  const content = getCommandDocHTML();
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

function getCommandDocHTML(): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bluecore Command — Retail Inventory OS — Tài liệu hệ thống</title>
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
    h1 { font-size: 22pt; color: #c2410c; margin: 30px 0 10px; border-bottom: 3px solid #ea580c; padding-bottom: 8px; }
    h2 { font-size: 16pt; color: #9a3412; margin: 24px 0 8px; border-bottom: 1px solid #fed7aa; padding-bottom: 4px; }
    h3 { font-size: 13pt; color: #334155; margin: 18px 0 6px; }
    h4 { font-size: 11pt; color: #475569; margin: 12px 0 4px; }
    p { margin: 4px 0; }
    hr { border: none; border-top: 2px solid #fed7aa; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
    th { background: #fff7ed; font-weight: 600; }
    code, pre { font-family: 'Consolas', 'Courier New', monospace; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; }
    code { padding: 1px 4px; font-size: 10pt; }
    pre { padding: 10px; margin: 8px 0; overflow-x: auto; font-size: 9pt; white-space: pre-wrap; }
    blockquote { border-left: 3px solid #ea580c; padding: 6px 12px; margin: 8px 0; background: #fff7ed; font-style: italic; color: #9a3412; }
    ul, ol { margin: 4px 0 4px 20px; }
    li { margin: 2px 0; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: 600; }
    .badge-orange { background: #ffedd5; color: #c2410c; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .section-box { border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 12px 0; background: #fffbf5; }
    .formula-box { background: #fff7ed; border: 1px solid #fdba74; border-radius: 6px; padding: 10px; margin: 8px 0; }
    .usecase-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 10px; margin: 8px 0; }
    .cover-page { text-align: center; padding: 100px 0; page-break-after: always; }
    .cover-page h1 { font-size: 32pt; border: none; color: #c2410c; }
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
  <h1 style="font-size:32pt; border:none;">BLUECORE COMMAND</h1>
  <p class="subtitle">Retail Inventory Operating System — Tài liệu hệ thống đầy đủ</p>
  <p class="subtitle" style="font-size:12pt; color:#ea580c;">Decision Stack cho tồn kho: Size Intelligence, Clearance, Growth Simulator</p>
  <p class="version">Phiên bản 1.0 · Tháng 2/2026</p>
  <p class="version">9 Module · 4 Data Layers · 5 Engines</p>
</div>

<h1>PHẦN 1: COMMAND MANIFESTO — Decision Stack Philosophy</h1>

<div class="section-box no-break">
  <h3>1. OPERATIONAL BRAIN</h3>
  <p>Size Control Tower — giúp operator & merchandiser bảo vệ doanh thu bằng cách phát hiện lẻ size và tái cân bằng tồn kho.</p>
</div>
<div class="section-box no-break">
  <h3>2. EXECUTIVE BRAIN</h3>
  <p>Retail Flight Deck — giúp C-level quản lý "Time to Financial Damage" qua phân tích chuỗi nhân quả: Tín hiệu vận hành → Hậu quả tài chính.</p>
</div>
<div class="section-box no-break">
  <h3>3. STRATEGIC BRAIN</h3>
  <p>Growth Simulator — giúp lãnh đạo lập kế hoạch mở rộng bằng cách xác định "Growth Gravity" và nhu cầu sản xuất cho doanh thu mục tiêu.</p>
</div>
<div class="section-box no-break">
  <h3>4. FC-LEVEL DECISIONS</h3>
  <p>Mọi quyết định ở cấp Family Code, không phải SKU — giảm noise, tăng khả năng hành động.</p>
</div>
<div class="section-box no-break">
  <h3>5. EVIDENCE-BASED</h3>
  <p>Mỗi khuyến nghị phải có Evidence Pack: data snapshot, scoring, source tables.</p>
</div>
<div class="section-box no-break">
  <h3>6. REAL CASH IMPACT</h3>
  <p>Mọi chỉ số đều quy về tiền thật: Vốn Khóa, Doanh Thu Mất, Rò Biên — không có metric "cho đẹp".</p>
</div>
<div class="section-box no-break">
  <h3>7. DECISION → OUTCOME</h3>
  <p>Mọi quyết định phải được theo dõi đến kết quả: Dự đoán vs Thực tế, để hệ thống học và cải thiện.</p>
</div>
<div class="section-box no-break">
  <h3>8. SURFACE PROBLEMS EARLY</h3>
  <p>Phát hiện curve size vỡ, markdown risk, supply gap trước khi thành thiệt hại tài chính.</p>
</div>
<div class="section-box no-break">
  <h3>9. APPROVAL GOVERNANCE</h3>
  <p>3 cấp phê duyệt: SAFE → ELEVATED → HIGH. Không có quyết định lớn chạy tự do.</p>
</div>
<div class="section-box no-break">
  <h3>10. FINAL TEST</h3>
  <p>Nếu Command không giúp doanh nghiệp giảm Capital Misallocation → Command đã thất bại.</p>
</div>

<h1>PHẦN 2: KIẾN TRÚC DATABASE (L1 → L4 + Semantic Config)</h1>

<table>
  <tr><th>Layer</th><th>Tên</th><th>Bảng chính</th><th>Mục đích</th></tr>
  <tr><td>L1</td><td>Foundation</td><td>inv_family_codes, inv_stores, inv_sku_fc_mapping, inv_state_positions, inv_state_demand, inv_collections</td><td>Dữ liệu gốc: Family Code, cửa hàng, ánh xạ SKU↔FC, tồn kho, demand, collection</td></tr>
  <tr><td>L2</td><td>State Tables (Daily)</td><td>state_size_health_daily, state_size_transfer_daily, state_cash_lock_daily, state_margin_leak_daily, state_markdown_risk_daily, state_lost_revenue_daily</td><td>Bảng trạng thái tính toán hàng ngày — nền tảng cho KPI và quyết định</td></tr>
  <tr><td>L3</td><td>KPI & Evidence</td><td>kpi_inventory_distortion, kpi_network_gap, kpi_size_completeness, si_evidence_packs</td><td>Chỉ số tổng hợp, evidence packs. Views: v_size_intelligence_summary, v_cash_lock_summary, v_margin_leak_summary</td></tr>
  <tr><td>L4</td><td>Decision Layer</td><td>dec_decision_packages, dec_decision_package_lines, dec_decision_approvals, dec_decision_outcomes, dec_production_candidates</td><td>Đóng gói, phê duyệt, theo dõi kết quả quyết định</td></tr>
  <tr><td>SC</td><td>Semantic Config</td><td>sem_allocation_policies, sem_sku_criticality, sem_size_curve_profiles, sem_markdown_ladders, sem_markdown_caps, inv_constraint_registry</td><td>Cấu hình chính sách: curves, tiers, markdown caps, allocation rules</td></tr>
</table>

<div class="formula-box">
  <strong>Luồng dữ liệu:</strong><br>
  L1 (Foundation) → inventory-kpi-engine → L2 (State Tables) → L3 (KPI Views) → L4 (Decision Packages)<br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↓<br>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Approval → Execution → Outcome Evaluation → Learning
</div>

<h1>PHẦN 3: KPI & SCORING SPEC</h1>

<table>
  <tr><th>Metric</th><th>Range</th><th>Ngưỡng</th><th>Công thức</th></tr>
  <tr><td>Size Health Score</td><td>0–100</td><td>Critical &lt;60 | Warning 60-79 | Good ≥80</td><td>Dựa trên deviation_score, core_size_missing, shallow_depth_count</td></tr>
  <tr><td>Markdown Risk Score</td><td>0–100</td><td>Thanh lý khi ≥60</td><td>Kết hợp aging, velocity, season proximity, inventory depth</td></tr>
  <tr><td>Capital Misallocation</td><td>VNĐ</td><td>Tổng = Lost Revenue + Cash Locked + Margin Leak</td><td>Lost Revenue Est + Cash Locked Value + Margin Leak Value (from L2)</td></tr>
  <tr><td>Distortion Score</td><td>0–100</td><td>Đo mức độ "lệch chuẩn" toàn mạng lưới</td><td>broken curves / total curves × weight</td></tr>
  <tr><td>Transfer Score</td><td>0–100</td><td>Ưu tiên cao khi ≥70</td><td>(dest_velocity × net_benefit) / transfer_cost — normalized</td></tr>
  <tr><td>Fixability Score</td><td>0–100</td><td>Khả năng sửa bằng transfer/reallocation</td><td>Available supply ở network vs demand gap</td></tr>
  <tr><td>Hero Score</td><td>0–100</td><td>FC xứng đáng sản xuất thêm</td><td>Revenue velocity × sell-through × margin × demand trend</td></tr>
</table>

<h1>PHẦN 4: TÍNH NĂNG 9 MODULE</h1>

<!-- Module 1: Overview -->
<h2>4.1 Overview — Bảng Điều Khiển Vận Hành</h2>
<p><strong>Mô tả:</strong> Operating Console cho CEO/CFO — nhìn ngay Capital Misallocation và rủi ro lớn nhất.</p>
<p><span class="badge badge-blue">Data: L2 State → L3 KPI Views</span> <span class="badge badge-orange">Cross: FDP Cash Position, Control Tower Alerts</span></p>

<h3>KPI Cards & Capital Misallocation</h3>
<ul>
  <li><strong>Giá Trị Tồn Kho:</strong> Tổng tài sản tồn kho toàn mạng lưới. <code>Sum(inv_state_positions.on_hand × unit_cost)</code></li>
  <li><strong>Vốn Bị Khóa (Cash Locked):</strong> Vốn kẹt trong curve size vỡ, hàng chậm bán, hàng chờ thanh lý. <code>Sum(state_cash_lock_daily.cash_locked_value)</code></li>
  <li><strong>Doanh Thu Mất (Lost Revenue):</strong> Ước tính doanh thu mất do thiếu size, thiếu hàng, curve không hoàn chỉnh. <code>Sum(state_lost_revenue_daily.lost_revenue_est)</code></li>
  <li><strong>Rò Biên (Margin Leak):</strong> Giá trị margin bị rò do markdown, misallocation, wrong channel. <code>Sum(state_margin_leak_daily.margin_leak_value)</code></li>
  <li><strong>Distortion Score:</strong> Điểm lệch chuẩn toàn mạng (0-100). Càng cao = tồn kho càng lệch.</li>
</ul>
<div class="formula-box">
  <strong>Capital Misallocation = Lost Revenue + Cash Locked + Margin Leak</strong>
</div>

<h3>Intelligence Cards</h3>
<ul>
  <li><strong>Size Intelligence Card:</strong> Số FC bị lẻ size, Vốn Khóa, Doanh Thu Mất — ưu tiên hiển thị thiệt hại.</li>
  <li><strong>Clearance Intelligence Card:</strong> Số FC cần thanh lý, tổng tồn kho (units), giá trị, Markdown Risk trung bình.</li>
</ul>
<div class="usecase-box">
  <strong>Use Case:</strong> CEO mở app sáng, nhìn thấy "15 tỷ vốn khóa, 3.2 tỷ doanh thu mất" → điều hướng hành động ngay.
</div>

<!-- Module 2: Allocation -->
<h2>4.2 Allocation — Phân Bổ Tồn Kho</h2>
<p><strong>Mô tả:</strong> Phân bổ Push (DC → Store) và Lateral (Store ↔ Store) ở cấp Family Code.</p>
<p><span class="badge badge-blue">Data: L1 Foundation + L2 State → inventory-allocation-engine → L4 Decision</span></p>

<h3>Push Allocation</h3>
<ul>
  <li><strong>Demand-based Allocation:</strong> Phân bổ dựa trên inv_state_demand + sem_size_curve_profiles — đảm bảo mỗi store nhận đúng size, đúng lượng.</li>
  <li><strong>Constraint Respect:</strong> Tôn trọng inv_constraint_registry: min/max qty, store capacity, transportation limits.</li>
  <li><strong>Policy Driven:</strong> sem_allocation_policies quyết định: priority rules, fair-share vs demand-weighted, seasonal adjustments.</li>
</ul>

<h3>Lateral Transfer</h3>
<ul>
  <li><strong>Smart Transfer Suggestions:</strong> Source store thừa + dest store thiếu → gợi ý transfer kèm net_benefit.</li>
</ul>
<div class="formula-box">
  Net Benefit = estimated_revenue_gain - estimated_transfer_cost<br>
  Transfer Score = (dest_velocity × net_benefit) / cost — normalized to 0-100
</div>
<div class="usecase-box">
  <strong>Use Case:</strong> Store A thừa size 39, Store B thiếu size 39 nhưng bán tốt → lateral transfer.
</div>

<!-- Module 3: Assortment / Size Control Tower -->
<h2>4.3 Assortment — Size Control Tower (Operational Brain)</h2>
<p><strong>Mô tả:</strong> Phát hiện lẻ size, Smart Transfer, Evidence Pack — bảo vệ doanh thu ở cấp vận hành.</p>
<p><span class="badge badge-blue">Data: L2 state_size_health_daily → L3 kpi_size_completeness</span></p>

<h3>Size Break Detection</h3>
<ul>
  <li><strong>Size Health Score (0-100):</strong> Điểm sức khỏe size cho mỗi FC × Store.</li>
</ul>
<div class="formula-box">
  Score dựa trên:<br>
  - deviation_score (lệch so với ideal curve)<br>
  - core_size_missing (thiếu size chính)<br>
  - shallow_depth_count (size có depth &lt; threshold)<br><br>
  <strong>Curve State:</strong> BROKEN (&lt;60) | WEAK (60-79) | INTACT (≥80)
</div>
<ul>
  <li><strong>Core Size Missing Alert:</strong> Cảnh báo khi size bán chạy nhất hết hàng — impact doanh thu cao nhất.</li>
</ul>

<h3>Smart Transfer & Evidence Pack</h3>
<ul>
  <li><strong>Transfer Recommendations:</strong> Source → Dest suggestions với: qty, net_benefit, transfer_score, reason. Chỉ gợi ý khi Net Benefit > 0 VÀ Transfer Score ≥ threshold.</li>
  <li><strong>Evidence Pack:</strong> Bộ bằng chứng cho mỗi recommendation: data snapshot, scoring breakdown, source tables. Evidence type: SIZE_BREAK, CASH_LOCK, MARGIN_LEAK, MARKDOWN_RISK. Severity: CRITICAL, HIGH, MEDIUM, LOW.</li>
  <li><strong>Fixability Score:</strong> Khả năng sửa chữa bằng transfer/reallocation. <code>Available supply ở các store khác / Total demand gap</code></li>
</ul>
<div class="usecase-box">
  <strong>Use Case:</strong> Merchandiser xem evidence pack → confirm transfer 50 đôi size 39 từ Store A → Store B → ước tính recover 15M doanh thu.
</div>

<!-- Module 4: Clearance Intelligence -->
<h2>4.4 Clearance Intelligence (Executive Brain)</h2>
<p><strong>Mô tả:</strong> Thanh lý hàng tồn: Markdown Memory, Channel Optimization, Premium Guardrails.</p>
<p><span class="badge badge-blue">Data: L2 state_markdown_risk_daily → sem_markdown_ladders</span> <span class="badge badge-orange">Cross: FDP Cash locked recovery</span></p>

<h3>Markdown Risk & Candidate Detection</h3>
<ul>
  <li><strong>Markdown Risk Score (0-100):</strong> Dựa trên aging, velocity, season proximity, inventory depth.</li>
</ul>
<div class="formula-box">
  Score ≥ 60 → candidate thanh lý<br>
  Score ≥ 80 → urgent, cần hành động ngay<br>
  FC vừa BROKEN vừa high markdown risk = ưu tiên cao nhất
</div>

<h3>Channel Selection & Markdown Memory</h3>
<ul>
  <li><strong>Channel Analytics:</strong> So sánh hiệu quả thanh lý: KiotViet (offline), Shopee, TikTok. Mỗi kênh có clearability khác nhau.</li>
  <li><strong>Markdown Ladder:</strong> Bậc thang discount dựa trên lịch sử. 5 bands: 0-10%, 11-20%, 21-30%, 31-50%, 50%+.</li>
  <li><strong>Sales Velocity:</strong> "Days to Clear" — ước tính số ngày để bán hết ở mỗi mức discount.</li>
  <li><strong>Premium Guardrails:</strong> sem_markdown_caps giới hạn max discount. Signature/Premium items: cap 50%. Override chỉ bởi CFO/COO.</li>
</ul>
<div class="usecase-box">
  <strong>Use Case:</strong> FC giày premium aging 120 ngày → Markdown Ladder gợi ý 30% discount trên Shopee → est. clear trong 21 ngày.
</div>

<!-- Module 5: Network Gap -->
<h2>4.5 Network Gap — Phân Tích Thiếu Hụt (Strategic Brain)</h2>
<p><strong>Mô tả:</strong> Phát hiện supply gap, Transfer Coverage, Growth Simulator.</p>
<p><span class="badge badge-blue">Data: L3 kpi_network_gap → growth-simulator engine</span></p>

<h3>Supply Gap Analysis</h3>
<ul>
  <li><strong>Gap by FC × Store:</strong> Ma trận FC × Store hiển thị: demand, supply, gap, gap severity.</li>
  <li><strong>Transfer Coverage:</strong> Bao nhiêu % gap có thể fix bằng lateral transfer.</li>
</ul>
<div class="formula-box">
  Transfer Coverage % = Fixable Gap / Total Gap × 100<br>
  Gap không fix được bằng transfer → cần sản xuất thêm
</div>

<h3>Growth Simulator</h3>
<ul>
  <li><strong>Target Revenue Input:</strong> Nhập mục tiêu tăng trưởng (% hoặc absolute) → simulator tính ngược.</li>
  <li><strong>Hero FC Identification:</strong> Xác định FC đóng góp nhiều nhất cho target.</li>
</ul>
<div class="formula-box">
  Hero Score = Revenue Velocity × Sell-through Rate × Margin × Demand Trend
</div>
<ul>
  <li><strong>Size Distribution Plan:</strong> Dựa trên sem_size_curve_profiles → phân bổ production theo size curve tối ưu.</li>
  <li><strong>Production Requirements:</strong> Output: danh sách FC × Size × Qty cần sản xuất, estimated cost, estimated revenue.</li>
</ul>
<div class="usecase-box">
  <strong>Use Case:</strong> "Muốn tăng 30% revenue quý tới → cần sản xuất thêm 5 Hero FCs, tổng 15,000 units, investment 2.5 tỷ."
</div>

<!-- Module 6: Production Candidates -->
<h2>4.6 Production Candidates</h2>
<p><strong>Mô tả:</strong> Đề xuất sản xuất từ Network Gap & Growth Simulator.</p>
<p><span class="badge badge-blue">Data: L4 dec_production_candidates</span></p>
<ul>
  <li><strong>Candidate List:</strong> FC × Size đề xuất sản xuất: qty, unit cost, total investment, expected revenue, expected margin.</li>
  <li><strong>Priority Ranking:</strong> Xếp hạng theo Hero Score + Network Gap severity + Expected ROI.</li>
  <li><strong>Approval Workflow:</strong> Production candidate → Decision Package → 3-tier approval.</li>
</ul>
<div class="usecase-box">
  <strong>Use Case:</strong> "5 Hero FCs cần sản xuất — xếp hạng theo ROI expected, gửi CFO duyệt."
</div>

<!-- Module 7: Decision Queue -->
<h2>4.7 Decision Queue — Hàng Đợi Phê Duyệt</h2>
<p><strong>Mô tả:</strong> Trung tâm phê duyệt quyết định với 3 cấp governance.</p>
<p><span class="badge badge-blue">Data: L4 dec_decision_packages + dec_decision_approvals</span></p>
<ul>
  <li><strong>Package Overview:</strong> Mỗi package: type (TRANSFER/CLEARANCE/PRODUCTION), FC count, total value, risk tier, deadline.</li>
  <li><strong>3-Tier Approval:</strong> SAFE → ELEVATED → HIGH (chi tiết ở Phần 7).</li>
  <li><strong>Evidence Attached:</strong> Mỗi decision package link đến Evidence Packs — approver xem data trước khi quyết.</li>
  <li><strong>Batch Approval:</strong> Approve nhiều SAFE packages cùng lúc để tiết kiệm thời gian.</li>
</ul>
<div class="usecase-box">
  <strong>Use Case:</strong> Head Merchandising mở Decision Queue → thấy 3 ELEVATED packages → review evidence → approve 2, reject 1 với lý do.
</div>

<!-- Module 8: Decision Outcomes -->
<h2>4.8 Decision Outcomes — Replay & Đánh Giá</h2>
<p><strong>Mô tả:</strong> So sánh Dự đoán vs Thực tế, tính accuracy, rút kinh nghiệm.</p>
<p><span class="badge badge-blue">Data: L4 dec_decision_outcomes → inventory-outcome-evaluator engine</span></p>
<ul>
  <li><strong>Predicted vs Actual:</strong> So sánh Expected Revenue Gain vs Actual Revenue, Expected Cost vs Actual Cost.</li>
</ul>
<div class="formula-box">
  Accuracy Score = 1 - |Predicted - Actual| / Predicted<br>
  Variance = Actual - Predicted
</div>
<ul>
  <li><strong>Decision Timeline:</strong> Replay: Created → Approved → Executed → Measured. Mỗi step có timestamp + owner.</li>
  <li><strong>Learning Patterns:</strong> Loại quyết định nào thường accurate, loại nào hay sai → feed back vào AI Decision Advisor.</li>
</ul>
<div class="usecase-box">
  <strong>Use Case:</strong> "Transfer 50 đôi size 39 dự đoán recover 15M → thực tế recover 12M → accuracy 80%."
</div>

<!-- Module 9: Settings -->
<h2>4.9 Settings — Cấu Hình Chính Sách</h2>
<p><strong>Mô tả:</strong> Semantic configurations: Allocation Policies, Size Curves, Markdown Caps, Criticality Tiers.</p>
<p><span class="badge badge-blue">Data: SC layer — sem_* tables + inv_constraint_registry</span></p>

<h3>Allocation Policies & Constraints</h3>
<ul>
  <li><strong>Allocation Policies:</strong> fair-share vs demand-weighted, priority stores, seasonal adjustments. Policy changes require ELEVATED approval.</li>
  <li><strong>Constraint Registry:</strong> Ràng buộc vật lý: min/max qty per store, capacity limits, shipping restrictions.</li>
</ul>

<h3>Size Curve Profiles</h3>
<ul>
  <li><strong>Curve Templates:</strong> Curve lý tưởng theo category: Giày (36-44), Áo (S-XXL). Core sizes, depth targets.</li>
  <li><strong>Store-specific Curves:</strong> Override curve theo store (CBD store vs suburban store có demand khác nhau).</li>
</ul>

<h3>Markdown Caps & Criticality</h3>
<ul>
  <li><strong>Markdown Caps:</strong> Max discount % theo FC/category. Premium: 50%, Standard: 70%, Outlet: không giới hạn.</li>
  <li><strong>SKU Criticality Tiers:</strong> HERO: top revenue, protect at all costs. CORE: standard. TAIL: clearance candidates.</li>
</ul>
<div class="usecase-box">
  <strong>Use Case:</strong> "Set Premium category max discount 50% → hệ thống block mọi clearance proposal quá 50%."
</div>

<h1>PHẦN 5: ENGINE & EDGE FUNCTIONS</h1>

<table>
  <tr><th>Engine</th><th>Mô tả</th><th>Inputs</th><th>Outputs</th></tr>
  <tr>
    <td><code>inventory-kpi-engine</code></td>
    <td>Engine chính: tính toán Size Health, Cash Lock, Margin Leak, Lost Revenue, Transfer Suggestions hàng ngày.</td>
    <td>inv_state_positions, inv_state_demand, inv_sku_fc_mapping</td>
    <td>state_size_health_daily, state_cash_lock_daily, state_margin_leak_daily, state_lost_revenue_daily, state_size_transfer_daily, state_markdown_risk_daily</td>
  </tr>
  <tr>
    <td><code>inventory-allocation-engine</code></td>
    <td>Phân bổ tồn kho Push (DC → Store) và Lateral (Store ↔ Store). Tôn trọng constraints và policies.</td>
    <td>sem_allocation_policies, inv_state_positions, inv_constraint_registry</td>
    <td>Allocation recommendations → dec_decision_packages</td>
  </tr>
  <tr>
    <td><code>inventory-decision-packager</code></td>
    <td>Đóng gói recommendations thành Decision Packages với approval levels. Tự động gán risk tier.</td>
    <td>Transfer suggestions, allocation recs, clearance candidates</td>
    <td>dec_decision_packages, dec_decision_package_lines</td>
  </tr>
  <tr>
    <td><code>inventory-outcome-evaluator</code></td>
    <td>Đánh giá kết quả: So sánh Dự đoán vs Thực tế. Tính accuracy score.</td>
    <td>dec_decision_packages (expected), actual sales/inventory changes</td>
    <td>dec_decision_outcomes (accuracy_score, variance)</td>
  </tr>
  <tr>
    <td><code>growth-simulator</code></td>
    <td>Mô phỏng tăng trưởng: "Muốn tăng X% revenue cần sản xuất thêm gì?". Hero FC + production requirements.</td>
    <td>Historical sales, network gap, size curves, margin data</td>
    <td>dec_production_candidates, hero FC rankings</td>
  </tr>
</table>

<h1>PHẦN 6: USE CASES</h1>

<div class="usecase-box no-break">
  <h3>UC1: Phát hiện & xử lý lẻ size</h3>
  <p><strong>Flow:</strong> Size Health Score &lt; 60 → Smart Transfer gợi ý → Decision Package → Approval → Execution → Outcome Evaluation</p>
  <p><strong>Impact:</strong> Khôi phục doanh thu mất do curve size vỡ, giải phóng vốn khóa ở store thừa</p>
  <p><strong>Roles:</strong> Merchandiser → Head Merchandising → (CFO nếu HIGH)</p>
</div>

<div class="usecase-box no-break">
  <h3>UC2: Thanh lý hàng tồn kho</h3>
  <p><strong>Flow:</strong> Markdown Risk ≥ 60 → Clearance Intelligence → Channel Selection → Markdown Ladder → Premium Guardrails → Execution</p>
  <p><strong>Impact:</strong> Thu hồi vốn khóa, giảm aging inventory, bảo vệ thương hiệu (premium cap 50%)</p>
  <p><strong>Roles:</strong> Merchandiser → CFO</p>
</div>

<div class="usecase-box no-break">
  <h3>UC3: Lập kế hoạch sản xuất</h3>
  <p><strong>Flow:</strong> Network Gap Analysis → Hero FC Identification → Production Candidate → Cost/Timeline → Approval → Production Order</p>
  <p><strong>Impact:</strong> Sản xuất đúng sản phẩm, đúng size, đúng lượng — giảm dead stock tương lai</p>
  <p><strong>Roles:</strong> Planner → Head Merchandising → CFO/COO</p>
</div>

<div class="usecase-box no-break">
  <h3>UC4: Mô phỏng tăng trưởng</h3>
  <p><strong>Flow:</strong> Growth Simulator → Target Revenue Input → Hero Plan → Size Distribution → Production Requirements → Budget Approval</p>
  <p><strong>Impact:</strong> Lập kế hoạch mở rộng dựa trên data thay vì cảm tính</p>
  <p><strong>Roles:</strong> CEO/CFO → Planner</p>
</div>

<div class="usecase-box no-break">
  <h3>UC5: Đánh giá quyết định</h3>
  <p><strong>Flow:</strong> Decision Executed → 7-30 ngày → Outcome Evaluator → Predicted vs Actual → Accuracy Score → Learning Pattern</p>
  <p><strong>Impact:</strong> Cải thiện chất lượng quyết định theo thời gian, giảm bias</p>
  <p><strong>Roles:</strong> All decision makers</p>
</div>

<h1>PHẦN 7: QUY TRÌNH PHÊ DUYỆT (3 CẤP)</h1>

<table>
  <tr><th>Cấp</th><th>Người duyệt</th><th>Tiêu chí</th><th>Auto Approve?</th></tr>
  <tr><td><span class="badge badge-green">SAFE</span></td><td>Planner / Merchandiser</td><td>Impact thấp, &lt; threshold VNĐ, routine transfers</td><td>Có thể batch approve</td></tr>
  <tr><td><span class="badge badge-amber">ELEVATED</span></td><td>Head Merchandising</td><td>Medium impact, nhiều FC, cross-region transfers</td><td>Không, review từng package</td></tr>
  <tr><td><span class="badge badge-red">HIGH</span></td><td>CFO / COO</td><td>High impact, production decisions, policy overrides, premium guardrail exceptions</td><td>Không, cần evidence pack đầy đủ</td></tr>
</table>

<div class="section-box">
  <h3>Grain Invariants</h3>
  <ul>
    <li>Mọi quyết định ở cấp <strong>Family Code</strong>, không phải SKU — giảm noise, tăng khả năng hành động.</li>
    <li>Risk tier tự động gán dựa trên: total value + FC count + decision type.</li>
    <li>Escalation tự động nếu quá deadline mà chưa approve.</li>
    <li>Evidence Pack bắt buộc cho ELEVATED và HIGH.</li>
  </ul>
</div>

<hr>
<p style="text-align:center; color:#94a3b8; font-size:10pt; margin-top:30px;">
  Bluecore Command — Retail Inventory Operating System<br>
  Tài liệu tự động sinh từ hệ thống · Phiên bản 1.0 · Tháng 2/2026
</p>

</body>
</html>`;
}
