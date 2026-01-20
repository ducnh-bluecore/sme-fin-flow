# Bluecore SME - Database Schema Documentation

> **Tổng số: 163 tables** (146 Base Tables + 17 Views)
> 
> Last Updated: 2025-01-20

---

## 📊 Tổng quan theo Module

| Module | Tables | Mô tả |
|--------|--------|-------|
| Core | 5 | Tenant, User, Profile, Roles |
| Financial Accounting | 18 | GL, Journal, Invoice, Bill, Payment |
| Alerts & Control Tower | 16 | Alert rules, instances, notifications |
| Decision Support | 12 | Decision cards, analyses, outcomes |
| Banking & Cash | 10 | Bank accounts, transactions, cash flow |
| Products & Inventory | 12 | Products, inventory, external sync |
| Orders & Sales | 10 | Orders, returns, channels |
| Marketing & Analytics | 12 | Campaigns, performance, analytics |
| BigQuery & ETL | 6 | Data warehouse integration |
| Reporting & Planning | 8 | Scenarios, forecasts, budgets |
| Others | 54 | Supporting tables |

---

## 🏢 1. CORE - Tenant & User Management

### Base Tables

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 1 | `tenants` | TABLE | Quản lý tenant (công ty/tổ chức) |
| 2 | `profiles` | TABLE | Thông tin profile người dùng |
| 3 | `user_roles` | TABLE | Phân quyền app-level (admin, user) |
| 4 | `tenant_users` | TABLE | Quan hệ user-tenant với role trong tenant |
| 5 | `api_keys` | TABLE | API keys cho external integrations |

---

## 💰 2. FINANCIAL ACCOUNTING - Kế toán Tài chính

### Chart of Accounts & Journals

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 6 | `gl_accounts` | TABLE | Hệ thống tài khoản (Chart of Accounts) |
| 7 | `gl_account_defaults` | TABLE | Default GL mappings |
| 8 | `journal_entries` | TABLE | Bút toán chính |
| 9 | `journal_entry_lines` | TABLE | Chi tiết dòng bút toán |
| 10 | `financial_periods` | TABLE | Kỳ kế toán |

### Accounts Receivable (AR) - Công nợ Phải thu

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 11 | `customers` | TABLE | Khách hàng |
| 12 | `invoices` | TABLE | Hóa đơn bán hàng |
| 13 | `invoice_items` | TABLE | Chi tiết hóa đơn |
| 14 | `invoice_promotions` | TABLE | Khuyến mãi trên hóa đơn |
| 15 | `payments` | TABLE | Thanh toán từ khách hàng |
| 16 | `ar_aging` | VIEW | Phân tích tuổi nợ phải thu |

### Accounts Payable (AP) - Công nợ Phải trả

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 17 | `vendors` | TABLE | Nhà cung cấp |
| 18 | `bills` | TABLE | Hóa đơn mua hàng |
| 19 | `bill_items` | TABLE | Chi tiết hóa đơn mua |
| 20 | `vendor_payments` | TABLE | Thanh toán cho NCC |
| 21 | `ap_aging` | VIEW | Phân tích tuổi nợ phải trả |

### Adjustment Notes

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 22 | `adjustment_notes` | TABLE | Phiếu điều chỉnh tổng hợp |
| 23 | `adjustment_note_items` | TABLE | Chi tiết phiếu điều chỉnh |
| 24 | `credit_notes_view` | VIEW | View credit notes |
| 25 | `debit_notes_view` | VIEW | View debit notes |
| 26 | `vendor_credit_notes_view` | VIEW | View vendor credit notes |

### Others

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 27 | `payment_terms` | TABLE | Điều khoản thanh toán |
| 28 | `tax_codes` | TABLE | Mã thuế |
| 29 | `currencies` | TABLE | Tiền tệ |
| 30 | `exchange_rates` | TABLE | Tỷ giá |
| 31 | `cost_centers` | TABLE | Trung tâm chi phí |
| 32 | `expenses` | TABLE | Chi phí |
| 33 | `revenues` | TABLE | Doanh thu |
| 34 | `revenue_entries` | TABLE | Chi tiết ghi nhận doanh thu |

---

## 🚨 3. ALERTS & CONTROL TOWER

### Alert Configuration

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 35 | `alerts` | TABLE | Legacy alerts |
| 36 | `alert_settings` | TABLE | Cấu hình alert cho tenant |
| 37 | `alert_instances` | TABLE | Alert instances đang active |
| 38 | `alert_objects` | TABLE | Đối tượng giám sát (SKU, store...) |
| 39 | `alert_object_metrics` | TABLE | Metrics của từng object |
| 40 | `extended_alert_configs` | TABLE | Cấu hình alert mở rộng |
| 41 | `intelligent_alert_rules` | TABLE | Rules AI-powered |
| 42 | `cross_domain_alert_rules` | TABLE | Rules liên domain |

### Alert Execution & Notification

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 43 | `alert_calculations_log` | TABLE | Log tính toán alert |
| 44 | `alert_notification_logs` | TABLE | Log gửi notification |
| 45 | `alert_data_sources` | TABLE | Nguồn dữ liệu cho alert |
| 46 | `alert_digest_configs` | TABLE | Cấu hình email digest |
| 47 | `alert_escalation_rules` | TABLE | Rules leo thang |
| 48 | `alert_rule_recipients` | TABLE | Người nhận alert |
| 49 | `notification_recipients` | TABLE | Danh sách người nhận |
| 50 | `notifications` | TABLE | Notifications đã gửi |

---

## 🎯 4. DECISION SUPPORT CENTER

### Decision Cards

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 51 | `decision_cards` | TABLE | Thẻ quyết định chính |
| 52 | `decision_card_facts` | TABLE | Facts/Evidence cho card |
| 53 | `decision_card_actions` | TABLE | Actions có thể thực hiện |
| 54 | `decision_card_decisions` | TABLE | Decisions đã thực hiện |
| 55 | `auto_decision_card_states` | TABLE | Trạng thái auto-generated cards |
| 56 | `decision_threshold_configs` | TABLE | Ngưỡng trigger decision cards |

### Decision Analytics

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 57 | `decision_analyses` | TABLE | Phân tích AI cho decisions |
| 58 | `decision_outcomes` | TABLE | Kết quả sau quyết định |
| 59 | `decision_audit_log` | TABLE | Audit log quyết định |
| 60 | `decisions_pending_followup` | VIEW | Decisions cần follow-up |
| 61 | `unified_decision_history` | VIEW | Lịch sử tổng hợp |

---

## 🏦 5. BANKING & CASH MANAGEMENT

### Bank Accounts

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 62 | `bank_accounts` | TABLE | Tài khoản ngân hàng |
| 63 | `bank_transactions` | TABLE | Giao dịch ngân hàng |
| 64 | `bank_connection_configs` | TABLE | Cấu hình kết nối bank |
| 65 | `bank_covenants` | TABLE | Covenants với ngân hàng |
| 66 | `covenant_measurements` | TABLE | Đo lường covenant |

### Cash Management

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 67 | `cash_forecasts` | TABLE | Dự báo dòng tiền |
| 68 | `cash_flow_daily` | TABLE | Cash flow hàng ngày |
| 69 | `cash_flow_direct` | TABLE | Cash flow trực tiếp |
| 70 | `cash_position` | VIEW | Vị thế tiền mặt hiện tại |
| 71 | `working_capital_metrics` | TABLE | Metrics vốn lưu động |

---

## 📦 6. PRODUCTS & INVENTORY

### Product Master Data

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 72 | `products` | TABLE | Sản phẩm nội bộ |
| 73 | `product_master` | TABLE | Master data sản phẩm |
| 74 | `product_metrics` | TABLE | Metrics sản phẩm |
| 75 | `external_products` | TABLE | Sản phẩm từ external sources |

### Inventory

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 76 | `inventory_items` | TABLE | Items trong kho |
| 77 | `inventory_levels` | TABLE | Mức tồn kho |
| 78 | `inventory_batches` | TABLE | Lô hàng |
| 79 | `external_inventory` | TABLE | Tồn kho external |
| 80 | `warehouse_capacity` | TABLE | Công suất kho |
| 81 | `warehouse_operations` | TABLE | Hoạt động kho |

---

## 🛒 7. ORDERS & SALES

### Orders

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 82 | `orders` | TABLE | Đơn hàng nội bộ |
| 83 | `external_orders` | TABLE | Đơn hàng từ sàn TMĐT |
| 84 | `external_order_items` | TABLE | Chi tiết đơn external |
| 85 | `order_returns` | TABLE | Đơn trả hàng |
| 86 | `order_auto_approval_rules` | TABLE | Rules tự động duyệt đơn |

### Purchase Orders

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 87 | `purchase_orders` | TABLE | Đơn mua hàng |
| 88 | `purchase_order_items` | TABLE | Chi tiết đơn mua |
| 89 | `supplier_payment_schedules` | TABLE | Lịch thanh toán NCC |

### Shipping & Delivery

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 90 | `shipments` | TABLE | Vận chuyển |
| 91 | `carrier_performance` | TABLE | Hiệu suất hãng vận chuyển |

---

## 📢 8. CHANNELS & MARKETING

### Channel Management

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 92 | `channel_analytics` | TABLE | Analytics theo kênh |
| 93 | `channel_analytics_cache` | TABLE | Cache analytics |
| 94 | `channel_budgets` | TABLE | Ngân sách theo kênh |
| 95 | `channel_fees` | TABLE | Phí kênh bán |
| 96 | `channel_settlements` | TABLE | Đối soát kênh |
| 97 | `channel_performance_summary` | VIEW | Tổng hợp hiệu suất kênh |
| 98 | `daily_channel_revenue` | VIEW | Doanh thu hàng ngày theo kênh |

### Marketing

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 99 | `marketing_expenses` | TABLE | Chi phí marketing |
| 100 | `promotions` | TABLE | Chương trình khuyến mãi |
| 101 | `promotion_campaigns` | TABLE | Campaigns marketing |
| 102 | `promotion_performance` | TABLE | Hiệu suất promotion |
| 103 | `voucher_usage` | TABLE | Sử dụng voucher |

### Analytics & Social

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 104 | `website_analytics` | TABLE | Analytics website |
| 105 | `social_mentions` | TABLE | Mentions mạng xã hội |
| 106 | `reviews` | TABLE | Đánh giá sản phẩm |
| 107 | `platform_violations` | TABLE | Vi phạm platform |

---

## 📊 9. BIGQUERY & DATA WAREHOUSE

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 108 | `bigquery_configs` | TABLE | Cấu hình BigQuery |
| 109 | `bigquery_data_models` | TABLE | Data models định nghĩa |
| 110 | `bigquery_query_cache` | TABLE | Cache query results |
| 111 | `bigquery_sync_watermarks` | TABLE | Watermarks sync |
| 112 | `etl_pipelines` | TABLE | ETL pipelines |
| 113 | `etl_transform_rules` | TABLE | Rules transform |
| 114 | `connector_integrations` | TABLE | Connector integrations |

---

## 📈 10. REPORTING & PLANNING

### Scenarios & Forecasts

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 115 | `scenarios` | TABLE | Kịch bản tài chính |
| 116 | `scenario_monthly_plans` | TABLE | Kế hoạch tháng |
| 117 | `scenario_monthly_actuals` | TABLE | Thực tế tháng |
| 118 | `what_if_scenarios` | TABLE | Kịch bản What-If |
| 119 | `whatif_metrics_cache` | TABLE | Cache metrics what-if |
| 120 | `rolling_forecasts` | TABLE | Dự báo cuốn chiếu |
| 121 | `monte_carlo_results` | TABLE | Kết quả Monte Carlo |

### Budgets & Variance

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 122 | `budgets` | TABLE | Ngân sách |
| 123 | `variance_analysis` | TABLE | Phân tích chênh lệch |

### Reports & Scores

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 124 | `board_reports` | TABLE | Báo cáo HĐQT |
| 125 | `bluecore_scores` | TABLE | Điểm sức khỏe tài chính |
| 126 | `strategic_initiatives` | TABLE | Sáng kiến chiến lược |

---

## 🏪 11. STORES & RETAIL

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 127 | `stores` | TABLE | Cửa hàng |
| 128 | `store_daily_metrics` | TABLE | Metrics hàng ngày |
| 129 | `pos_terminals` | TABLE | Máy POS |

---

## 🏭 12. FIXED ASSETS & INVESTMENTS

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 130 | `fixed_assets` | TABLE | Tài sản cố định |
| 131 | `depreciation_schedules` | TABLE | Lịch khấu hao |
| 132 | `capex_projects` | TABLE | Dự án CAPEX |
| 133 | `investments` | TABLE | Đầu tư |
| 134 | `market_data` | TABLE | Dữ liệu thị trường |

---

## 📋 13. TAX & COMPLIANCE

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 135 | `tax_filings` | TABLE | Hồ sơ thuế |
| 136 | `tax_obligations` | TABLE | Nghĩa vụ thuế |

---

## 👥 14. TEAM & TASKS

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 137 | `team_members` | TABLE | Thành viên team |
| 138 | `tasks` | TABLE | Công việc |
| 139 | `support_tickets` | TABLE | Tickets hỗ trợ |

---

## 💬 15. COMMUNICATION

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 140 | `chat_messages` | TABLE | Tin nhắn chat |
| 141 | `push_subscriptions` | TABLE | Subscriptions push notification |
| 142 | `scheduled_notifications` | TABLE | Notifications đã lên lịch |

---

## 📊 16. CACHE & PERFORMANCE

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 143 | `dashboard_kpi_cache` | TABLE | Cache KPI dashboard |
| 144 | `pl_report_cache` | TABLE | Cache báo cáo P&L |
| 145 | `sku_profitability_cache` | TABLE | Cache lợi nhuận SKU |
| 146 | `object_calculated_metrics` | TABLE | Metrics đã tính toán |

---

## 📝 17. AUDIT & LOGS

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 147 | `audit_logs` | TABLE | Log kiểm toán |
| 148 | `ai_usage_logs` | TABLE | Log sử dụng AI |
| 149 | `sync_logs` | TABLE | Log đồng bộ |
| 150 | `import_jobs` | TABLE | Jobs import dữ liệu |

---

## ⚙️ 18. CONFIGURATION

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 151 | `formula_definitions` | TABLE | Định nghĩa công thức |
| 152 | `formula_settings` | TABLE | Cài đặt công thức |
| 153 | `vertical_configs` | TABLE | Cấu hình theo ngành |
| 154 | `recurring_templates` | TABLE | Templates định kỳ |

---

## 📊 19. FDP VIEWS - Financial Data Platform

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 155 | `fdp_channel_summary` | VIEW | Tổng hợp theo kênh |
| 156 | `fdp_daily_metrics` | VIEW | Metrics hàng ngày |
| 157 | `fdp_expense_summary` | VIEW | Tổng hợp chi phí |
| 158 | `fdp_invoice_summary` | VIEW | Tổng hợp hóa đơn |
| 159 | `fdp_monthly_metrics` | VIEW | Metrics hàng tháng |
| 160 | `fdp_sku_summary` | VIEW | Tổng hợp theo SKU |

---

## 📈 20. OTHER VIEWS

| # | Table Name | Type | Mô tả |
|---|------------|------|-------|
| 161 | `balance_sheet_summary` | VIEW | Tổng hợp Balance Sheet |
| 162 | `pl_summary` | VIEW | Tổng hợp P&L |
| 163 | `trial_balance` | VIEW | Bảng cân đối thử |

---

## 🔗 Quan hệ chính

```
tenants (1) ──→ (N) tenant_users ←── (1) profiles
    │
    └──→ (N) gl_accounts
    │         │
    │         └──→ journal_entry_lines
    │
    └──→ (N) customers ──→ invoices ──→ payments
    │
    └──→ (N) vendors ──→ bills ──→ vendor_payments
    │
    └──→ (N) alert_objects ──→ alert_instances
    │
    └──→ (N) decision_cards ──→ decision_outcomes
    │
    └──→ (N) external_orders ──→ external_order_items
    │
    └──→ (N) products ──→ inventory_levels
```

---

## 📌 Notes

1. **Multi-tenant**: Hầu hết tables đều có `tenant_id` để phân tách data
2. **RLS Enabled**: Row Level Security được bật cho tất cả tables
3. **Soft Delete**: Nhiều tables sử dụng `is_active` thay vì hard delete
4. **Timestamps**: `created_at`, `updated_at` có mặt ở hầu hết tables
5. **UUID**: Primary keys sử dụng UUID v4

---

*Document generated for Bluecore SME CFO Platform v2.0*
