
# Audit Vi phạm Kiến trúc: Hooks Query Trực tiếp vào Model Tables

## Tiến độ: Batch 1 HOÀN THÀNH

### Views đã tạo (Migration applied)
1. `v_revenue_channel_daily` - revenue by channel/date (replaces cdp_orders)
2. `v_cdp_orders_stats` - count + totals per tenant (replaces cdp_orders count/sum)
3. `v_mdp_order_items_summary` - order items for MDP (replaces cdp_order_items)
4. `v_cash_forecast_orders_weekly` - weekly aggregated orders (replaces cdp_orders)
5. `v_audience_customer_summary` - customer-level metrics (replaces cdp_orders)
6. `v_variance_orders_monthly` - monthly aggregated orders (replaces cdp_orders)
7. `v_board_report_invoices` - invoice data for reports (replaces invoices)
8. `v_expenses_by_category_monthly` - expense aggregation (replaces expenses)

### Hooks đã refactor (Batch 1)
| Hook | Status | View used |
|------|--------|-----------|
| `useRevenuePageData` | ✅ DONE | v_revenue_channel_daily |
| `useMDPSSOT` (orders) | ✅ DONE | v_revenue_channel_daily |
| `useMDPSSOT` (order items) | ✅ DONE | v_mdp_order_items_summary |
| `useWeeklyCashForecast` (orders) | ✅ DONE | v_cash_forecast_orders_weekly |
| `useCDPSSOT` (orders count) | ✅ DONE | v_cdp_orders_stats |
| `useCDPLTVEngine.useRealizedRevenue` | ✅ DONE | v_cdp_orders_stats |
| `useCDPTierData.useCDPRFMData` | ✅ DONE | v_audience_customer_summary |
| `useVarianceAnalysis` (generate) | ✅ DONE | v_variance_orders_monthly + v_expenses_by_category_monthly |
| `useAudienceData` | ✅ DONE | v_audience_customer_summary + v_revenue_channel_daily |

## Còn lại (Batch 2 - ưu tiên thấp hơn)

### Hooks chưa refactor
| Hook | Tables truy cập | Ghi chú |
|------|----------------|---------|
| `useBoardReports` | invoices, expenses, bank_accounts, bank_transactions | Complex - nhiều helper functions |
| `useWeeklyCashForecast` | invoices, bills | AR/AP queries - vẫn query trực tiếp |
| `useFinancialAnalysisData` | invoices, expenses | Complex analysis |
| `useFDPCrossScreenConsistency` | bank_accounts | Consistency check |
| `useCDPCustomerOrderItems` | cdp_order_items + cdp_orders join | Customer detail page |

### Ngoại lệ (không cần sửa)
- **Mutations**: useReconciliation (write ops)
- **Admin**: TenantStatsCard (cross-tenant)
- **Deprecated**: useFDPMetrics, useMDPData (sẽ bị xóa)
