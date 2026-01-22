# Product Review & Scoping Hub

## Tổng quan

**Product Review & Scoping Hub** là một công cụ quản trị sản phẩm trung lập, được thiết kế để xem xét, đánh giá và lập kế hoạch cho tất cả các trang và tính năng trên 4 hệ thống độc lập của Bluecore Platform:

1. **FDP** - Finance Data Platform
2. **MDP** - Marketing Data Platform  
3. **CDP** - Customer Data Platform
4. **Control Tower** - Hệ thống cảnh báo và quản lý rủi ro vận hành

### Mục đích

- Xem xét tất cả các trang trên FDP, MDP, CDP, Control Tower
- Quyết định tính năng nào cần **BUILD** (xây dựng), **HOLD** (tạm dừng), hoặc **DROP** (loại bỏ)
- Xác định phiên bản mục tiêu (v1/v2/v3) cho từng tính năng
- Thu thập yêu cầu dữ liệu để định nghĩa hợp đồng dữ liệu chung (Data Contract)
- Phục vụ cho việc lập kế hoạch và quản trị, **KHÔNG** dùng để chạy phân tích

### Nguyên tắc cốt lõi

1. **Không nhúng hoặc hợp nhất dashboard** từ các hệ thống khác
2. Hỗ trợ **thu thập quyết định có cấu trúc** cho từng trang/tính năng
3. **Lưu trữ bền vững** trong Supabase (hoặc localStorage nếu không có kết nối)

---

## Kiến trúc dữ liệu

### Bảng `feature_decisions`

Lưu trữ quyết định review cho từng tính năng/trang.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID | Khóa chính, tự động sinh |
| `system` | ENUM | Hệ thống: FDP / CT / MDP / CDP |
| `route` | TEXT | Đường dẫn route của trang |
| `feature_name` | TEXT | Tên tính năng/trang |
| `status` | ENUM | Trạng thái quyết định: BUILD / HOLD / DROP / PENDING |
| `target_version` | ENUM | Phiên bản mục tiêu: v1 / v2 / v3 |
| `priority` | ENUM | Độ ưu tiên: P0 / P1 / P2 / P3 |
| `persona` | TEXT | Đối tượng sử dụng: CFO, CEO, Ops, Growth, CRM, etc. |
| `data_entities` | JSONB | Yêu cầu thực thể dữ liệu |
| `required_tables` | JSONB | Các bảng serving cần thiết |
| `dependencies` | JSONB | Các phụ thuộc pipeline |
| `rationale` | TEXT | Lý do cho quyết định |
| `owner` | TEXT | Người chịu trách nhiệm |
| `reviewed_by` | TEXT | Người review |
| `reviewed_at` | TIMESTAMPTZ | Thời điểm review |

#### Cấu trúc JSONB

**data_entities:**
```json
{
  "entities": ["order", "sku", "customer", "channel"],
  "grain": "daily by channel"
}
```

**required_tables:**
```json
{
  "serve_tables": ["serve_statement_daily", "serve_sku_daily"],
  "dims": ["dim_channel", "dim_sku"]
}
```

**dependencies:**
```json
{
  "pipelines": ["FDP_SERVE", "CDP_SERVE"],
  "upstream": ["fin_mart.statement_daily"]
}
```

### Bảng `page_reviews`

Lưu trữ trạng thái review đơn giản cho từng trang.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID | Khóa chính |
| `route` | TEXT | Đường dẫn route |
| `system` | ENUM | Hệ thống |
| `reviewed_status` | ENUM | not_reviewed / reviewed / needs_changes |
| `notes` | TEXT | Ghi chú |
| `updated_by` | TEXT | Người cập nhật |
| `updated_at` | TIMESTAMPTZ | Thời điểm cập nhật |

---

## Các trang trong Hub

### 1. Trang chủ (`/`)

**Mục đích:** Điểm vào chính của Hub, hiển thị tổng quan 4 hệ thống.

**Nội dung:**
- 4 thẻ sản phẩm lớn (FDP, Control Tower, MDP, CDP)
- Thống kê tiến độ review tổng thể
- Nút "Start Review" để bắt đầu đánh giá
- Nút "Data Contract" để xem hợp đồng dữ liệu
- Nút "Route Map" để xem bản đồ routes

**Thông tin mỗi thẻ hệ thống:**
- Tên và mô tả ngắn
- Persona chính
- Số route LIVE / Coming Soon
- Tiến độ quyết định (% đã quyết định)
- Thống kê BUILD / HOLD / DROP

### 2. Bản đồ Routes (`/routes`)

**Mục đích:** Hiển thị toàn bộ routes của tất cả hệ thống.

**Nội dung:**
- Danh sách routes nhóm theo hệ thống và phiên bản (v1/v2/v3)
- Trạng thái: LIVE hoặc COMING SOON
- Maturity gates cho các tính năng v2/v3
- Link trực tiếp đến trang (nếu LIVE)

### 3. System Index (`/systems/{system}`)

**Mục đích:** Trang chi tiết cho từng hệ thống, nơi thực hiện review chính.

**Nội dung:**

#### Thông tin hệ thống
- Tên, mô tả, tagline
- Persona chính và phụ
- Thống kê routes

#### Bảng Routes
Mỗi route hiển thị:
- Tên trang
- Route path
- Trạng thái (LIVE / COMING SOON)
- Phiên bản hiện tại

#### Feature Editor (Dialog)
Khi click "Edit Decision", mở dialog chỉnh sửa:

**Tab Basic Info:**
- Decision Status: BUILD / HOLD / DROP / PENDING
- Target Version: v1 / v2 / v3
- Priority: P0 / P1 / P2 / P3
- Persona
- Owner
- Rationale

**Tab Data Requirements:**
- Entities (multi-select): order, customer, sku, channel, campaign, product
- Grain: daily, order-level, customer-level, sku-level, campaign-level
- Required Serve Tables (tags input)
- Required Dimensions (tags input)
- Pipeline Dependencies (tags input)
- Upstream Dependencies (tags input)

### 4. Review Dashboard (`/review`)

**Mục đích:** Dashboard tổng hợp để xem và lọc tất cả quyết định.

**Bộ lọc:**
- Theo trạng thái quyết định (BUILD/HOLD/DROP/PENDING)
- Theo phiên bản mục tiêu
- Theo hệ thống
- Theo độ ưu tiên

**Thống kê:**
- Tổng số features
- % đã quyết định
- Số BUILD / HOLD / DROP / PENDING

**Bảng dữ liệu:**
- System
- Feature Name
- Route
- Status (với badge màu)
- Version
- Priority
- Owner
- Last Updated

### 5. Data Contract (`/data-contract`)

**Mục đích:** Tạo hợp đồng dữ liệu tự động từ các quyết định BUILD.

**Nội dung:**

#### Thống kê tổng quan
- Tổng entities được yêu cầu
- Tổng serve tables
- Tổng dimensions
- Tổng pipelines

#### Shared Entities
Bảng các thực thể dữ liệu được yêu cầu:
- Entity name
- Các hệ thống yêu cầu
- Features sử dụng

#### Serve Tables Required
Bảng các bảng serving cần xây dựng:
- Table name
- Các hệ thống yêu cầu
- Features phụ thuộc

#### Dimension Tables
Bảng các dimension cần thiết:
- Dimension name
- Các hệ thống yêu cầu

#### Pipeline Dependencies
Bảng các pipeline cần chạy:
- Pipeline name
- Các hệ thống phụ thuộc

#### Potential Conflicts
Cảnh báo các xung đột tiềm ẩn:
- Nhiều hệ thống yêu cầu cùng một entity
- Các phụ thuộc chồng chéo

#### Export
- Export CSV
- Export JSON

---

## Hệ thống và Routes

### FDP - Finance Data Platform

**Tagline:** "Finance truth & reconciliation"

**Persona chính:** CFO, Finance Director, Accounting Lead

| Route | Tên | Phiên bản | Trạng thái |
|-------|-----|-----------|------------|
| `/fdp/executive-overview` | Executive Overview | v1 | LIVE |
| `/fdp/financial-statement` | Financial Statement | v1 | LIVE |
| `/fdp/financial-statement/drilldown` | Financial Drilldown | v1 | LIVE |
| `/fdp/sku-profitability` | SKU Profitability | v1 | LIVE |
| `/fdp/reconciliation` | Reconciliation | v1 | LIVE |
| `/fdp/cash-settlements` | Cash Settlements | v2 | COMING SOON |
| `/fdp/refunds-chargebacks` | Refunds & Chargebacks | v2 | COMING SOON |
| `/fdp/period-close` | Period Close | v2 | COMING SOON |
| `/fdp/cash-runway` | Cash Runway | v3 | COMING SOON |
| `/fdp/scenario` | Scenario Comparison | v3 | COMING SOON |
| `/fdp/board-views` | Board Views | v3 | COMING SOON |

### Control Tower

**Tagline:** "Alerts & operational risk"

**Persona chính:** Ops Lead, Finance Controller, CEO

| Route | Tên | Phiên bản | Trạng thái |
|-------|-----|-----------|------------|
| `/control-tower` | Command Center | v1 | LIVE |
| `/control-tower/alerts/:id` | Alert Detail | v1 | LIVE |
| `/control-tower/risk-appetite` | Risk Appetite | v2 | COMING SOON |
| `/control-tower/sla` | SLA Management | v2 | COMING SOON |
| `/control-tower/ownership` | Ownership Matrix | v2 | COMING SOON |
| `/control-tower/incidents` | Incident History | v3 | COMING SOON |
| `/control-tower/playbooks` | Playbooks | v3 | COMING SOON |
| `/control-tower/cross-system` | Cross-System View | v3 | COMING SOON |

### MDP - Marketing Data Platform

**Tagline:** "Marketing performance visibility"

**Persona chính:** Growth Lead, Marketing Analyst, CMO

| Route | Tên | Phiên bản | Trạng thái |
|-------|-----|-----------|------------|
| `/mdp/channel-overview` | Channel Overview | v1 | LIVE |
| `/mdp/campaign-performance` | Campaign Performance | v1 | LIVE |
| `/mdp/spend-budget` | Spend & Budget | v2 | COMING SOON |
| `/mdp/roi` | ROI Analysis | v2 | COMING SOON |
| `/mdp/attribution` | Attribution | v3 | COMING SOON |
| `/mdp/margin-view` | Margin View | v3 | COMING SOON |

### CDP - Customer Data Platform

**Tagline:** "Customer understanding (finance-aligned)"

**Persona chính:** Product Manager, CRM Manager, Growth Analyst

| Route | Tên | Phiên bản | Trạng thái |
|-------|-----|-----------|------------|
| `/cdp/customer-overview` | Customer Overview | v1 | LIVE |
| `/cdp/cohorts` | Cohorts | v1 | LIVE |
| `/cdp/customer-profitability` | Customer Profitability | v2 | COMING SOON |
| `/cdp/segments` | Segments | v2 | COMING SOON |
| `/cdp/ltv` | LTV (Guarded) | v3 | COMING SOON |
| `/cdp/retention` | Retention & Expansion | v3 | COMING SOON |

---

## Workflow sử dụng

### 1. Khởi đầu Review

1. Truy cập trang chủ (`/`)
2. Click "Start Review" để đến Review Dashboard
3. Hoặc chọn một hệ thống cụ thể để review

### 2. Review từng hệ thống

1. Vào `/systems/{system}` (ví dụ: `/systems/fdp`)
2. Xem danh sách tất cả routes của hệ thống
3. Click "Edit Decision" trên từng route
4. Điền thông tin:
   - Quyết định: BUILD / HOLD / DROP
   - Phiên bản mục tiêu
   - Độ ưu tiên
   - Yêu cầu dữ liệu
5. Click "Save Decision"

### 3. Theo dõi tiến độ

1. Vào `/review` để xem tổng quan
2. Lọc theo trạng thái, hệ thống, phiên bản
3. Xem % hoàn thành review

### 4. Tạo Data Contract

1. Sau khi review xong, vào `/data-contract`
2. Xem tổng hợp yêu cầu dữ liệu từ các feature BUILD
3. Xác định xung đột và phụ thuộc
4. Export để chia sẻ với team Data Engineering

---

## Định nghĩa trạng thái

### Decision Status

| Status | Màu | Ý nghĩa |
|--------|-----|---------|
| **BUILD** | Xanh lá | Sẽ xây dựng trong phiên bản được chỉ định |
| **HOLD** | Vàng | Tạm dừng, chờ điều kiện hoặc ưu tiên |
| **DROP** | Đỏ | Không xây dựng, loại khỏi roadmap |
| **PENDING** | Xám | Chưa có quyết định |

### Priority Levels

| Priority | Ý nghĩa |
|----------|---------|
| **P0** | Critical - Phải có trong release |
| **P1** | High - Rất quan trọng |
| **P2** | Medium - Quan trọng nhưng có thể delay |
| **P3** | Low - Nice to have |

### Target Versions

| Version | Ý nghĩa |
|---------|---------|
| **v1** | Foundation - MVP, tính năng cơ bản |
| **v2** | Expansion - Mở rộng tính năng |
| **v3** | Advanced - Tính năng nâng cao, tối ưu |

---

## Cấu trúc thư mục

```
src/
├── pages/portal/
│   ├── PortalHome.tsx      # Trang chủ
│   ├── SystemIndex.tsx     # System Index với Feature Editor
│   ├── ReviewDashboard.tsx # Dashboard tổng hợp
│   ├── DataContract.tsx    # Hợp đồng dữ liệu
│   └── RouteMap.tsx        # Bản đồ routes
├── components/layout/
│   └── PortalLayout.tsx    # Layout cho Portal
├── hooks/
│   ├── use-feature-decisions.ts  # Hook quản lý decisions
│   └── use-page-reviews.ts       # Hook quản lý reviews
└── lib/
    └── portal-data.ts      # Dữ liệu hệ thống và routes
```

---

## API Hooks

### useAllFeatureDecisions

Lấy tất cả quyết định từ database.

```typescript
const { data: decisions, isLoading } = useAllFeatureDecisions();
```

### useFeatureDecisions

Lấy quyết định theo hệ thống.

```typescript
const { data: decisions } = useFeatureDecisions('FDP');
```

### useUpsertFeatureDecision

Tạo hoặc cập nhật quyết định.

```typescript
const mutation = useUpsertFeatureDecision();
mutation.mutate({
  system: 'FDP',
  route: '/fdp/executive-overview',
  feature_name: 'Executive Overview',
  status: 'BUILD',
  target_version: 'v1',
  priority: 'P0'
});
```

### aggregateDataContract

Tổng hợp yêu cầu dữ liệu từ các quyết định BUILD.

```typescript
const contract = aggregateDataContract(decisions);
// Returns: { entities, serveTables, dimensions, pipelines }
```

---

## Lưu ý quan trọng

1. **Hub này chỉ dùng cho planning** - Không chạy analytics hay metrics
2. **Mỗi hệ thống là sản phẩm riêng biệt** - Không merge UI
3. **Data Contract là output chính** - Dùng để align với Data Engineering
4. **Quyết định được lưu bền vững** - Có thể track lịch sử
5. **Coming Soon pages** có maturity gates rõ ràng
