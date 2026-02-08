

# Audit Vi phạm Kiến trúc: Hooks Query Trực tiếp vào Model Tables

## Vấn đề

Theo kiến trúc DB-First của Bluecore:

```text
Hook (Thin Wrapper) --> View / RPC --> Table
```

Hiện tại **~25+ hooks** đang bypass tầng View/RPC, query thẳng vào bảng model:

```text
Hook --> Table (VI PHAM)
```

## Danh sách vi phạm

### Nhóm 1: Query trực tiếp `cdp_orders` (11 hooks)

| Hook | File | Muc do |
|------|------|--------|
| `useAudienceData` | src/hooks/useAudienceData.ts | 2 queries |
| `useCDPSSOT` | src/hooks/useCDPSSOT.ts | 1 query (count) |
| `useCDPLTVEngine` | src/hooks/useCDPLTVEngine.ts | 1 query |
| `useWeeklyCashForecast` | src/hooks/useWeeklyCashForecast.ts | 1 query |
| `useVarianceAnalysis` | src/hooks/useVarianceAnalysis.ts | 3 queries |
| `useRevenuePageData` | src/hooks/useRevenuePageData.ts | 1 query |
| `useCDPTierData` | src/hooks/useCDPTierData.ts | 1 query |
| `useMDPSSOT` | src/hooks/useMDPSSOT.ts | 1 query |
| `useMDPData` | src/hooks/useMDPData.ts | 1 query (deprecated) |
| `useFDPMetrics` | src/hooks/useFDPMetrics.ts | 1 query (deprecated) |
| `SSOTComplianceDashboard` | src/components/governance/ | 1 query |

### Nhom 2: Query truc tiep `cdp_order_items` (1 hook)

| Hook | File |
|------|------|
| `useCDPCustomerOrderItems` | src/hooks/useCDPCustomerOrderItems.ts |

### Nhom 3: Query truc tiep `invoices`, `bills`, `expenses`, `bank_accounts` (~14 hooks)

| Hook | Tables truy cap |
|------|----------------|
| `useWeeklyCashForecast` | invoices, bills, expenses |
| `useAutoMeasureOutcome` | bank_accounts, expenses |
| `useDashboardData` | invoices |
| `useExceptions` | invoices |
| `useFDPMetrics` | invoices, expenses (deprecated) |
| `useFinancialAnalysisData` | invoices, expenses |
| `useFDPCrossScreenConsistency` | bank_accounts |
| `useVarianceAnalysis` | expenses |
| `useReconciliation` | invoices (mutation - co the chap nhan) |
| `useBoardReports` | invoices |
| `TenantStatsCard` | invoices, bills (admin - co the chap nhan) |

### Nhom 4: Query truc tiep `promotion_campaigns` (3 hooks)

| Hook | File |
|------|------|
| `useMDPSSOT` | src/hooks/useMDPSSOT.ts |
| `useMDPData` | src/hooks/useMDPData.ts (deprecated) |
| `useFDPMetrics` | src/hooks/useFDPMetrics.ts (deprecated) |

## Ke hoach sua

### Buoc 1: Xac dinh Views/RPCs da co san

Kiem tra xem DB da co views nao co the thay the:
- `fdp_daily_metrics` -- revenue/orders theo ngay
- `fdp_monthly_metrics` -- revenue/orders theo thang
- `fdp_sku_summary` -- SKU-level metrics
- `channel_performance_summary` -- channel metrics
- `v_cdp_data_quality` -- data quality counts
- `get_fdp_period_summary` RPC -- period aggregation
- `compute_central_metrics_snapshot` RPC -- central metrics

### Buoc 2: Tao them Views/RPCs con thieu

Cho cac use case chua co view:
- `v_weekly_cash_forecast` -- forecast cash inflow/outflow
- `v_variance_analysis` -- period-over-period comparison
- `v_audience_channel_summary` -- audience by channel
- `v_revenue_by_channel_daily` -- revenue breakdown

### Buoc 3: Chuyen hooks thanh thin wrappers

Moi hook chi duoc phep:
1. Goi View hoac RPC
2. Map columns sang interface (khong tinh toan)
3. Return data

### Buoc 4: Ngoai le hop le

Cac truong hop KHONG can sua:
- **Mutations** (useReconciliation: update invoices) -- ghi du lieu, khong phai doc
- **Admin/Control Plane** (TenantStatsCard) -- cross-tenant, khong thuoc data plane
- **Deprecated hooks** (useFDPMetrics, useMDPData) -- se bi xoa, khong can sua

## Thu tu uu tien

1. **Cao**: Hooks SSOT dang active ma van query truc tiep (useMDPSSOT, useRevenuePageData, useWeeklyCashForecast)
2. **Trung binh**: Hooks analytics (useVarianceAnalysis, useBoardReports, useAudienceData)  
3. **Thap**: Deprecated hooks (se bi xoa)

## Luu y

- KHONG thay doi cau truc bang/cot
- CHI tao them Views/RPCs va chuyen hooks sang dung chung
- Moi View/RPC phai co `tenant_id` filter
- Performance: Views tren 1.1M rows can index hoac materialized views

