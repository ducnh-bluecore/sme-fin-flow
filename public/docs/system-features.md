# 📊 Hệ thống Giám sát & Phân tích Tài chính Doanh nghiệp

## Tổng quan Hệ thống

Hệ thống là nền tảng Enterprise Finance Management toàn diện, hỗ trợ doanh nghiệp quản lý tài chính, kế toán và phân tích dữ liệu với AI. Được thiết kế theo kiến trúc multi-tenant, bảo mật với RLS (Row Level Security).

---

## 📁 Kiến trúc Hệ thống

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack React Query
- **Database**: Supabase (PostgreSQL)
- **Backend Functions**: Deno Edge Functions
- **AI Integration**: OpenAI GPT-4o-mini

### Cấu trúc Multi-tenant
- Mỗi tenant (doanh nghiệp) có dữ liệu riêng biệt
- RLS policies bảo vệ dữ liệu giữa các tenant
- Super Admin có quyền quản lý toàn hệ thống

---

## 🔧 Edge Functions

### 1. `analyze-financial-data`
**Mục đích**: Phân tích tổng quan sức khỏe tài chính doanh nghiệp bằng AI

**Input**:
- Authorization header (JWT token)

**Process**:
1. Xác thực user và lấy active tenant
2. Fetch song song dữ liệu từ 8 bảng: invoices, expenses, bank_accounts, bank_transactions, revenues, customers, payments, cash_forecasts
3. Tính toán các metrics:
   - Tổng tiền mặt (totalCash)
   - Tổng AR (công nợ phải thu)
   - Hóa đơn quá hạn
   - Tỷ lệ đối soát giao dịch ngân hàng
   - Tổng doanh thu / chi phí

4. Gửi context đến OpenAI với prompt phân tích
5. Log usage và chi phí vào bảng `ai_usage_logs`

**Output**:
```json
{
  "analysis": "Phân tích AI bằng tiếng Việt",
  "summary": { "totalCash": 0, "totalAR": 0, ... },
  "generatedAt": "ISO timestamp",
  "model": "gpt-4o-mini",
  "usage": { "promptTokens": 0, "completionTokens": 0, "estimatedCost": 0 }
}
```

---

### 2. `analyze-contextual`
**Mục đích**: Phân tích chuyên sâu theo ngữ cảnh cụ thể (từng trang/tính năng)

**Contexts hỗ trợ**:
| Context | Mô tả |
|---------|-------|
| `general` | Tổng quan tài chính |
| `profitability` | Phân tích lợi nhuận, biên lợi nhuận |
| `pl_report` | Báo cáo Lãi/Lỗ (P&L) |
| `analytics` | KPIs tổng hợp |
| `financial_analysis` | Tỷ số tài chính |
| `revenue` | Phân tích doanh thu |
| `expenses` | Phân tích chi phí |
| `scenario` | Sensitivity analysis + Monte Carlo |

**Input**:
```json
{
  "context": "profitability"
}
```

**Process**:
1. Xác thực user và tenant
2. Fetch dữ liệu tài chính cơ bản
3. Nếu context là `scenario`: fetch thêm `scenarios` và `monte_carlo_results`
4. Tính metrics phù hợp với context
5. Gọi OpenAI với prompt chuyên biệt cho từng context

**Output**: Tương tự `analyze-financial-data` nhưng với phân tích chuyên sâu theo context

---

### 3. `create-tenant-with-owner`
**Mục đích**: Tạo tenant mới kèm owner (chỉ Super Admin)

**Actions**:

#### `find-user-by-email`
Tìm user theo email
```json
{
  "action": "find-user-by-email",
  "email": "user@example.com"
}
```

#### Create tenant (default)
```json
{
  "tenantName": "Công ty ABC",
  "slug": "cong-ty-abc",
  "plan": "professional",
  "ownerEmail": "owner@example.com"
}
```

**Process**:
1. Verify Super Admin role
2. Kiểm tra slug đã tồn tại chưa
3. Tìm hoặc tạo user với email
4. Nếu tạo user mới: xóa tenant tự động tạo bởi trigger
5. Tạo tenant mới
6. Gán user làm owner trong `tenant_users`
7. Update `active_tenant_id` cho user

**Output**:
```json
{
  "success": true,
  "tenant": { "id": "uuid", "name": "...", "slug": "..." },
  "ownerId": "uuid",
  "isNewUser": true
}
```

---

### 4. `optimize-channel-budget`
**Mục đích**: Tối ưu ngân sách marketing đa kênh với AI + phân tích retention

**Input**:
```json
{
  "channels": [
    {
      "name": "Shopee",
      "key": "shopee",
      "revenue": 5000000000,
      "channelCost": 500000000,
      "grossProfit": 1500000000,
      "margin": 30,
      "share": 25,
      "growth": 15,
      "commission": 8
    }
  ],
  "totalBudget": 3000000000,
  "targetROI": 300,
  "tenantId": "uuid (optional)"
}
```

**Process**:
1. Fetch dữ liệu thực từ bảng `orders` để tính retention metrics:
   - Tổng khách hàng
   - Khách hàng quay lại
   - Tỷ lệ quay lại (Return Rate)
   - Giá trị đơn hàng trung bình
   - CLV (Customer Lifetime Value)

2. Map channel với source trong database
3. Tính toán cho mỗi kênh:
   - ROI
   - Efficiency
   - CAC (Customer Acquisition Cost)
   - Sustainability Score

4. Gọi OpenAI với prompt phân tích chi tiết

**Output**:
```json
{
  "success": true,
  "analysis": {
    "summary": "...",
    "dataQualityNote": "...",
    "retentionInsights": { ... },
    "sustainabilityAnalysis": { ... },
    "recommendations": [ ... ],
    "actionItems": [ ... ],
    "projectedResults": { ... }
  },
  "channelAnalysis": [ ... ]
}
```

---

## 📱 Các Module Chức năng

### 1. Dashboard CFO (`/`)
**File**: `src/pages/CFODashboard.tsx`

**Tính năng**:
- KPI Cards: Tiền mặt, AR, Doanh thu, Chi phí
- Cash Forecast Chart
- AR Aging Chart
- Overdue Invoices Table
- AI Insights Panel
- Alerts Panel
- Scenario Planner Widget

**Hooks sử dụng**:
- `useDashboardData`
- `useKPIData`
- `useCashForecasts`
- `useAlertsData`
- `useAIInsights`

---

### 2. Quản lý Hóa đơn (AR Operations)

#### 2.1 Import & Duyệt đơn hàng (`/invoice/create`)
**File**: `src/pages/InvoiceCreatePage.tsx`

**Tính năng**:
- Hiển thị đơn hàng từ nhiều nguồn (ERP, E-commerce, POS)
- Duyệt đơn lẻ hoặc batch
- Auto-approval rules theo nguồn
- Xuất invoice từ đơn hàng đã duyệt

**Hooks**: `useOrders`, `useOrderStats`

#### 2.2 Tracking Hóa đơn (`/invoice/tracking`)
**File**: `src/pages/InvoiceTrackingPage.tsx`

**Tính năng**:
- Theo dõi trạng thái hóa đơn
- Collection progress bar
- Filter theo status, customer
- Actions: gửi nhắc nợ, gọi điện

**Hooks**: `useInvoiceTracking`, `useCollectionStats`

#### 2.3 Chi tiết Hóa đơn (`/invoice/:id`)
**File**: `src/pages/InvoiceDetailPage.tsx`

**Tính năng**:
- Xem chi tiết invoice
- Danh sách invoice items
- Lịch sử thanh toán
- Credit/Debit notes liên quan

---

### 3. Quản lý Chi phí & Mua hàng

#### 3.1 Bills (Hóa đơn mua) (`/bills`)
**File**: `src/pages/BillsPage.tsx`

**Tính năng**:
- Danh sách bills từ nhà cung cấp
- Tracking payment status
- AP Aging overview

**Hooks**: `useBillsData`

#### 3.2 Expenses (`/expenses`)
**File**: `src/pages/ExpensesPage.tsx`

**Tính năng**:
- Phân tích chi phí theo category
- Pie chart category distribution
- Trend chart theo tháng
- Top vendors

**Hooks**: Queries trực tiếp từ Supabase

---

### 4. Đối soát Ngân hàng

#### 4.1 Bank Connections (`/bank-connections`)
**File**: `src/pages/BankConnectionsPage.tsx`

**Tính năng**:
- Kết nối tài khoản ngân hàng
- Theo dõi số dư
- Sync transactions

**Hooks**: `useBankData`

#### 4.2 Reconciliation (`/bank-reconciliation`)
**File**: `src/pages/BankReconciliationPage.tsx`

**Tính năng**:
- Kanban board đối soát
- Auto-match suggestions
- Manual matching
- Match status tracking

**Hooks**: `useReconciliation`

---

### 5. Báo cáo Tài chính

#### 5.1 P&L Report (`/pl-report`)
**File**: `src/pages/PLReportPage.tsx`

**Tính năng**:
- Báo cáo Lãi/Lỗ
- So sánh kỳ trước
- AI analysis

**Hooks**: `usePLData`

#### 5.2 Financial Analysis (`/financial-analysis`)
**File**: `src/pages/FinancialAnalysisPage.tsx`

**Tính năng**:
- Các tỷ số tài chính
- Trend analysis
- Peer comparison

**Hooks**: `useFinancialAnalysisData`

#### 5.3 Profitability (`/profitability`)
**File**: `src/pages/ProfitabilityPage.tsx`

**Tính năng**:
- Phân tích lợi nhuận theo sản phẩm/kênh
- Margin analysis

---

### 6. What-If Analysis & Scenarios

#### 6.1 Scenario Planning (`/scenario`)
**File**: `src/pages/ScenarioPage.tsx`

**Tính năng**:
- Tạo và so sánh scenarios
- Monte Carlo simulation
- Sensitivity analysis
- AI-powered insights

**Hooks**: `useScenarioData`, `useMonteCarloData`

#### 6.2 What-If Analysis (`/what-if`)
**File**: `src/pages/WhatIfAnalysisPage.tsx`

**Tính năng**:
- Budget optimization cho marketing channels
- Retail channel parameters
- Profit trend projection

**Hooks**: `useWhatIfScenarios`

---

### 7. Data Integration

#### 7.1 Data Integration Hub (`/data-integration`)
**File**: `src/pages/DataIntegrationPage.tsx`

**Tính năng**:
- File import (CSV, Excel, JSON)
- Sync status monitoring
- Import job history

#### 7.2 ETL Rules (`/etl-rules`)
**File**: `src/pages/ETLRulesPage.tsx`

**Tính năng**:
- Quản lý ETL pipelines
- Transform rules configuration

#### 7.3 Connectors (`/connectors`)
**File**: `src/pages/ConnectorsPage.tsx`

**Tính năng**:
- Kết nối ERP (MISA, SAP, Fast)
- E-commerce connectors (Shopee, Lazada, Tiki)
- Bank API connections

---

### 8. Quản trị Hệ thống

#### 8.1 Tenant Management (`/tenant`)
**File**: `src/pages/TenantManagementPage.tsx`

**Tính năng**:
- Thông tin tenant
- Settings cấu hình

#### 8.2 Team Members (`/tenant/members`)
**File**: `src/pages/TenantMembersPage.tsx`

**Tính năng**:
- Quản lý thành viên
- Phân quyền role

#### 8.3 RBAC (`/rbac`)
**File**: `src/pages/RBACPage.tsx`

**Tính năng**:
- Role-based access control
- Permission management

#### 8.4 Audit Log (`/audit-log`)
**File**: `src/pages/AuditLogPage.tsx`

**Tính năng**:
- Lịch sử thao tác
- Filter theo action, entity

**Hooks**: `useAuditLogs`

---

### 9. Admin (Super Admin Only)

#### 9.1 Admin Dashboard (`/admin`)
**File**: `src/pages/admin/AdminDashboard.tsx`

**Tính năng**:
- Overview toàn hệ thống
- AI usage statistics
- System metrics

#### 9.2 Tenants Management (`/admin/tenants`)
**File**: `src/pages/admin/AdminTenantsPage.tsx`

**Tính năng**:
- Danh sách tất cả tenants
- Create/Edit tenant
- Impersonate tenant

#### 9.3 Users Management (`/admin/users`)
**File**: `src/pages/admin/AdminUsersPage.tsx`

**Tính năng**:
- Danh sách users
- Role assignment

---

## 📊 Database Schema

### Core Tables

| Table | Mô tả |
|-------|-------|
| `tenants` | Danh sách doanh nghiệp |
| `profiles` | Thông tin user, active_tenant_id |
| `user_roles` | Roles: admin, user |
| `tenant_users` | Mapping user-tenant với role (owner, admin, member) |

### Financial Tables

| Table | Mô tả |
|-------|-------|
| `customers` | Khách hàng |
| `vendors` | Nhà cung cấp |
| `products` | Sản phẩm/dịch vụ |
| `invoices` | Hóa đơn bán |
| `invoice_items` | Chi tiết hóa đơn |
| `bills` | Hóa đơn mua |
| `bill_items` | Chi tiết bill |
| `payments` | Thanh toán |
| `expenses` | Chi phí |
| `revenues` | Doanh thu |
| `orders` | Đơn hàng (từ nhiều nguồn) |

### Banking

| Table | Mô tả |
|-------|-------|
| `bank_accounts` | Tài khoản ngân hàng |
| `bank_transactions` | Giao dịch ngân hàng |

### Accounting

| Table | Mô tả |
|-------|-------|
| `gl_accounts` | Hệ thống tài khoản |
| `journal_entries` | Bút toán |
| `journal_entry_lines` | Chi tiết bút toán |
| `credit_notes` | Giảm giá hàng bán |
| `debit_notes` | Tăng giá hàng bán |

### Analysis

| Table | Mô tả |
|-------|-------|
| `scenarios` | Kịch bản phân tích |
| `monte_carlo_results` | Kết quả Monte Carlo |
| `cash_forecasts` | Dự báo dòng tiền |
| `budgets` | Ngân sách |

### Views

| View | Mô tả |
|------|-------|
| `ar_aging` | Tuổi nợ phải thu |
| `ap_aging` | Tuổi nợ phải trả |
| `cash_position` | Vị thế tiền mặt |
| `trial_balance` | Bảng cân đối thử |

---

## 🔐 Bảo mật

### Authentication
- Supabase Auth với email/password
- JWT tokens cho API calls
- Auto-confirm email (dev mode)

### Row Level Security (RLS)
- Mỗi table có RLS policies
- Dữ liệu isolated theo tenant
- Functions: `get_active_tenant_id()`, `has_tenant_access()`, `is_tenant_admin()`

### Roles
- **Super Admin**: Quản lý toàn hệ thống
- **Tenant Owner**: Full access tenant
- **Tenant Admin**: Quản lý tenant (trừ delete)
- **Tenant Member**: Read + basic write

---

## 📈 AI Integration

### Pricing (GPT-4o-mini)
- Input: $0.15/1M tokens
- Output: $0.60/1M tokens

### Usage Tracking
Table `ai_usage_logs` ghi lại:
- Function name
- Model used
- Token counts
- Estimated cost
- Tenant & user ID

### Contexts
AI có thể phân tích theo nhiều context khác nhau với prompts chuyên biệt cho từng loại phân tích.

---

## 🚀 Deployment

### Self-hosted
1. Clone Supabase Docker
2. Import schema từ `public/docs/self-host-schema.sql`
3. Deploy Edge Functions
4. Cấu hình `.env` với URL và keys

### Lovable Cloud
- Tự động deploy
- Managed infrastructure
- Built-in Supabase

---

## 📞 Support

Hệ thống được thiết kế để:
- Tích hợp dữ liệu từ nhiều nguồn (ERP, E-commerce, Bank)
- Phân tích AI-powered
- Real-time monitoring
- Enterprise-grade security
