

# Tài Liệu Toàn Diện Bluecore Command Module

## Mục tiêu
Tạo trang tài liệu chuyên biệt cho module **Command** (Retail Inventory Operating System), bao gồm toàn bộ kiến trúc database, tính năng 9 module con, use cases, và quy trình vận hành. Tài liệu sẽ phục vụ cả người dùng nghiệp vụ (CEO/CFO/Merchandiser) và đội ngũ kỹ thuật.

---

## Cấu trúc tài liệu

### Phần 1: Tổng quan hệ thống
- Triết lý "Decision Stack" (3 bộ não: Operational, Executive, Strategic)
- 9 module và vai trò từng module
- Luồng dữ liệu tổng thể: Ingestion -> State Tables -> KPI -> Decision -> Outcome

### Phần 2: Kiến trúc Database (4 tầng)
- **L1 - Foundation Tables**: `inv_family_codes`, `inv_stores`, `inv_sku_fc_mapping`, `inv_state_positions`, `inv_state_demand`, `inv_collections`
- **L2 - State Tables (Daily Computed)**: `state_size_health_daily`, `state_size_transfer_daily`, `state_cash_lock_daily`, `state_margin_leak_daily`, `state_markdown_risk_daily`, `state_lost_revenue_daily`
- **L3 - KPI & Evidence**: `kpi_inventory_distortion`, `kpi_network_gap`, `kpi_size_completeness`, `si_evidence_packs`, Views (`v_size_intelligence_summary`, `v_cash_lock_summary`, etc.)
- **L4 - Decision Layer**: `dec_decision_packages`, `dec_decision_package_lines`, `dec_decision_approvals`, `dec_decision_outcomes`, `dec_production_candidates`
- **Semantic Config**: `sem_allocation_policies`, `sem_sku_criticality`, `sem_size_curve_profiles`, `sem_markdown_ladders`, `sem_markdown_caps`, `inv_constraint_registry`

### Phần 3: Tính năng 9 Module
1. **Overview** - Bảng điều khiển vận hành (KPI cards, Capital Misallocation breakdown)
2. **Allocation** - Phân bổ tồn kho (Push/Lateral)
3. **Assortment (Size Control Tower)** - Phát hiện lẻ size, Smart Transfer, Evidence Pack
4. **Clearance Intelligence** - Thanh lý hàng tồn, Markdown Memory, Premium Guardrails
5. **Network Gap** - Phân tích thiếu hụt nguồn cung, Transfer Coverage
6. **Production Candidates** - Đề xuất sản xuất từ Network Gap
7. **Decision Queue** - Hàng đợi phê duyệt quyết định
8. **Decision Outcomes** - Replay & đánh giá độ chính xác
9. **Settings** - Cấu hình chính sách, ràng buộc, size curves

### Phần 4: Use Cases
- UC1: Phát hiện và xử lý lẻ size (Size Break Detection -> Transfer -> Recovery)
- UC2: Thanh lý hàng tồn kho (Markdown Risk -> Clearance -> Channel Optimization)
- UC3: Lập kế hoạch sản xuất (Network Gap -> Production Candidate -> Approval)
- UC4: Mô phỏng tăng trưởng (Growth Simulator -> Hero Plan -> Production)
- UC5: Đánh giá quyết định (Decision -> Execution -> Outcome Evaluation)

### Phần 5: Engine & Edge Functions
- `inventory-kpi-engine`: Tính toán Size Health, Cash Lock, Margin Leak, Transfer Suggestions
- `inventory-allocation-engine`: Phân bổ Push/Lateral
- `inventory-decision-packager`: Đóng gói quyết định từ recommendations
- `inventory-outcome-evaluator`: Đánh giá Dự đoán vs Thực tế
- `growth-simulator`: Mô phỏng tăng trưởng doanh thu

### Phần 6: KPI & Scoring Spec
- Size Health Score (0-100): Critical <60, Warning 60-79, Good >=80
- Markdown Risk Score (0-100): Ngưỡng thanh lý >= 60
- Capital Misallocation = Doanh Thu Mất + Vốn Khóa + Ro Bien
- Distortion Score (0-100)
- Fixability Score, Transfer Score, Hero Score

### Phần 7: Quy trình phê duyệt
- 3 cấp: SAFE (Planner) -> ELEVATED (Head Merchandising) -> HIGH (CFO/COO)
- Grain Invariants (FC-level, not SKU-level decisions)

---

## Kỹ thuật triển khai

### File mới tạo
1. **`src/components/docs/CommandDocumentation.tsx`** - Component tài liệu chính, theo pattern giống `FDPDocumentation.tsx` / `MDPDocumentation.tsx` (searchable, collapsible sections)

### File cần sửa
2. **`src/components/docs/index.ts`** - Export thêm `CommandDocumentation`
3. **`src/pages/DocumentationPage.tsx`** - Thêm tab "Command" vào module selector

### Cấu trúc component
- Sử dụng Accordion/Collapsible cho từng phần lớn
- Hỗ trợ `searchQuery` prop để filter nội dung
- Bảng database schema dạng Table
- Sơ đồ luồng dữ liệu bằng text/ASCII
- Badge cho severity levels, status codes

### Ngôn ngữ
- Tiếng Việt cho nội dung nghiệp vụ
- Tiếng Anh cho tên kỹ thuật (table names, function names, metric codes)

