# BLUECORE HOOKS DOCUMENTATION
## Tài liệu mô tả logic và ứng dụng của từng Hook

**Phiên bản:** 1.0  
**Cập nhật:** 14/01/2026

---

## 📋 MỤC LỤC

1. [Tổng quan](#tổng-quan)
2. [Authentication & Authorization](#authentication--authorization)
3. [Tenant & User Management](#tenant--user-management)
4. [Financial Data Platform (FDP)](#financial-data-platform-fdp)
5. [Control Tower](#control-tower)
6. [Marketing Data Platform (MDP)](#marketing-data-platform-mdp)
7. [Decision Center](#decision-center)
8. [Alert System](#alert-system)
9. [Data Integration](#data-integration)
10. [Notification System](#notification-system)
11. [Utility Hooks](#utility-hooks)

---

## Tổng quan

Hệ thống Bluecore sử dụng React Query (TanStack Query) làm nền tảng cho việc quản lý state và data fetching. Các hook được thiết kế theo nguyên tắc:

- **Single Source of Truth (SSOT)**: Mỗi metric chỉ có 1 nguồn duy nhất
- **Real-time**: Dữ liệu được cập nhật realtime khi có thay đổi
- **Caching**: Tối ưu performance với caching strategy
- **Error Handling**: Xử lý lỗi nhất quán

---

## Authentication & Authorization

### `useAuth`
**File:** `src/hooks/useAuth.tsx`

**Mô tả:**
Hook quản lý toàn bộ authentication flow bao gồm đăng nhập, đăng ký, đăng xuất và theo dõi session người dùng.

**Logic chính:**
- Sử dụng Supabase Auth
- Theo dõi session changes qua `onAuthStateChange`
- Cung cấp thông tin user hiện tại
- Xử lý redirect sau login/logout

**Sử dụng trong:**
- `AuthPage.tsx` - Trang đăng nhập/đăng ký
- `Header.tsx` - Hiển thị thông tin user, nút logout
- `MobileDrawer.tsx` - Navigation mobile
- Mọi page cần kiểm tra authentication

**Exports:**
```typescript
{
  user: User | null,
  session: Session | null,
  isLoading: boolean,
  signIn: (email, password) => Promise,
  signUp: (email, password) => Promise,
  signOut: () => Promise,
}
```

---

### `useAuthRedirect`
**File:** `src/hooks/useAuthRedirect.ts`

**Mô tả:**
Hook xử lý redirect logic sau khi authentication thành công hoặc thất bại.

**Logic chính:**
- Lưu intended URL trước khi redirect đến login
- Redirect về URL ban đầu sau login thành công
- Xử lý deep linking

**Sử dụng trong:**
- `AuthPage.tsx`
- Protected routes

---

### `useIsSuperAdmin`
**File:** `src/hooks/useIsSuperAdmin.ts`

**Mô tả:**
Kiểm tra xem user hiện tại có phải Super Admin hay không.

**Logic chính:**
- Query bảng `user_profiles` với `is_super_admin = true`
- Dùng để hiển thị/ẩn admin features

**Sử dụng trong:**
- `SuperAdminRoute.tsx` - Protected admin routes
- `AdminLayout.tsx` - Admin navigation

---

### `useImpersonation`
**File:** `src/hooks/useImpersonation.ts`

**Mô tả:**
Cho phép Super Admin "nhập vai" tenant khác để debug/support.

**Logic chính:**
- Lưu impersonated tenant ID trong session storage
- Override tenant context khi active
- Hiển thị banner cảnh báo đang impersonate

**Sử dụng trong:**
- `ImpersonationBanner.tsx`
- `AdminTenantsPage.tsx`

---

## Tenant & User Management

### `useTenant`
**File:** `src/hooks/useTenant.ts`

**Mô tả:**
Quản lý thông tin và operations của tenant (công ty).

**Logic chính:**
- Fetch thông tin tenant hiện tại
- CRUD operations cho tenant settings
- Quản lý tenant members

**Sử dụng trong:**
- `TenantSettingsPage.tsx`
- `TenantMembersPage.tsx`
- `TenantSwitcher.tsx`

---

### `useActiveTenantId`
**File:** `src/hooks/useActiveTenantId.ts`

**Mô tả:**
Lấy tenant ID đang active để sử dụng trong các queries.

**Logic chính:**
- Ưu tiên impersonated tenant (nếu có)
- Fallback về tenant mặc định của user
- Caching để tránh redundant queries

**Sử dụng trong:**
- **Hầu hết mọi hook** cần tenant context
- Tất cả data fetching hooks

**Exports:**
```typescript
tenantId: string | null
```

---

### `useTeamMembers`
**File:** `src/hooks/useTeamMembers.ts`

**Mô tả:**
Quản lý danh sách thành viên trong tenant.

**Logic chính:**
- Fetch members với role và permissions
- Invite/remove members
- Update member roles

**Sử dụng trong:**
- `TenantMembersPage.tsx`
- `TeamPage.tsx` (Control Tower)
- `AssignOwnerDropdown.tsx`

---

## Financial Data Platform (FDP)

### `useCentralFinancialMetrics`
**File:** `src/hooks/useCentralFinancialMetrics.ts`

**Mô tả:**
**HOOK TRUNG TÂM** - Single Source of Truth cho tất cả metrics tài chính cốt lõi.

**Logic chính:**
- Tính toán Net Revenue, COGS, Gross Profit, CM, Net Income
- Aggregation từ nhiều nguồn: invoices, bills, orders
- Apply FDP formulas chuẩn hóa
- Caching với invalidation strategy

**Metrics cung cấp:**
```typescript
{
  netRevenue: number,
  cogs: number,
  grossProfit: number,
  grossMargin: number,
  contributionMargin: number,
  contributionMarginPercent: number,
  operatingExpenses: number,
  netIncome: number,
  netMargin: number,
}
```

**Sử dụng trong:**
- `CFODashboard.tsx` - Dashboard chính
- `FinancialTruthCard.tsx` - Card hiển thị metrics
- `PLReportPage.tsx` - Báo cáo P&L
- `DecisionCard.tsx` - Facts cho decision cards

---

### `useCashRunway`
**File:** `src/hooks/useCashRunway.ts`

**Mô tả:**
Tính toán số ngày còn hoạt động được với cash hiện tại.

**Logic chính:**
```
Cash Runway = Available Cash / Average Daily Burn Rate
```
- Lấy cash balance từ bank accounts
- Tính average daily operating expenses
- Alert khi runway < 90 ngày

**Sử dụng trong:**
- `FinancialTruthCard.tsx`
- `CFODashboard.tsx`
- `RiskDashboardPage.tsx`
- Control Tower alerts

---

### `useCashFlowDirect`
**File:** `src/hooks/useCashFlowDirect.ts`

**Mô tả:**
Phân tích cash flow theo phương pháp trực tiếp.

**Logic chính:**
- Phân loại transactions: Operating, Investing, Financing
- Tính Net Cash Flow cho từng category
- Track cash in vs cash out

**Categories:**
```typescript
{
  operating: { inflow, outflow, net },
  investing: { inflow, outflow, net },
  financing: { inflow, outflow, net },
  netCashFlow: number,
}
```

**Sử dụng trong:**
- `CashFlowDirectPage.tsx`
- `CFODashboard.tsx`

---

### `useCashConversionCycle`
**File:** `src/hooks/useCashConversionCycle.ts`

**Mô tả:**
Tính Cash Conversion Cycle (CCC) - thời gian từ lúc trả tiền supplier đến lúc thu tiền từ customer.

**Logic chính:**
```
CCC = DIO + DSO - DPO
- DIO: Days Inventory Outstanding
- DSO: Days Sales Outstanding  
- DPO: Days Payable Outstanding
```

**Sử dụng trong:**
- `CashConversionCyclePage.tsx`
- `WorkingCapitalPage.tsx`
- Control Tower - Cash alerts

---

### `useWorkingCapital`
**File:** `src/hooks/useWorkingCapital.ts`

**Mô tả:**
Tính toán và phân tích Working Capital.

**Logic chính:**
```
Working Capital = Current Assets - Current Liabilities
- Current Assets: Cash + AR + Inventory
- Current Liabilities: AP + Short-term debt
```

**Sử dụng trong:**
- `WorkingCapitalPage.tsx`
- `CFODashboard.tsx`

---

### `usePLData`
**File:** `src/hooks/usePLData.ts`

**Mô tả:**
Fetch và tính toán báo cáo P&L đầy đủ.

**Logic chính:**
- Aggregate revenue và expenses từ GL entries
- Group by account categories
- Support period comparison (MTD, QTD, YTD)
- Budget vs Actual comparison

**Sử dụng trong:**
- `PLReportPage.tsx`
- `FinancialReportsPage.tsx`
- `BudgetVsActualPage.tsx`

---

### `useChannelPL`
**File:** `src/hooks/useChannelPL.ts`

**Mô tả:**
P&L breakdown theo từng sales channel (Shopee, Lazada, Tiki, TikTok...).

**Logic chính:**
- Map orders/invoices về channel
- Allocate shared costs theo revenue ratio
- Tính Contribution Margin per channel

**Sử dụng trong:**
- `ChannelPLPage.tsx`
- `ChannelWhatIfPage.tsx`
- MDP CMO Mode

---

### `useAllChannelsPL`
**File:** `src/hooks/useAllChannelsPL.ts`

**Mô tả:**
Aggregate P&L của tất cả channels cho overview.

**Sử dụng trong:**
- `CFODashboard.tsx`
- `FinancialTruthCard.tsx`
- MDP Overview

---

### `useSKUProfitabilityCache`
**File:** `src/hooks/useSKUProfitabilityCache.ts`

**Mô tả:**
Cache và tính toán profitability cho từng SKU.

**Logic chính:**
```
SKU Profit = (Selling Price - COGS - Variable Costs) × Units Sold
SKU Margin = SKU Profit / Revenue
```
- Identify problematic SKUs (margin < 0)
- Rank by contribution margin

**Sử dụng trong:**
- `UnitEconomicsPage.tsx`
- `SKUProfitabilityAnalysis.tsx`
- Decision Cards - SKU STOP recommendations

---

### `useAllProblematicSKUs`
**File:** `src/hooks/useAllProblematicSKUs.ts`

**Mô tả:**
Lấy danh sách tất cả SKU có vấn đề (lỗ hoặc margin thấp).

**Logic chính:**
- Filter SKUs với margin < threshold
- Sort by impact (revenue × margin deficit)
- Cung cấp data cho auto decision cards

**Sử dụng trong:**
- `useAutoDecisionCards.ts` - Generate SKU STOP cards
- `SKUStopAction.tsx`
- Control Tower alerts

---

### `useUnitEconomics`
**File:** `src/hooks/useUnitEconomics.ts`

**Mô tả:**
Phân tích Unit Economics cho products/SKUs.

**Metrics:**
```typescript
{
  averageOrderValue: number,
  customerAcquisitionCost: number,
  lifetimeValue: number,
  ltvCacRatio: number,
  contributionMarginPerUnit: number,
}
```

**Sử dụng trong:**
- `UnitEconomicsPage.tsx`
- MDP Analysis

---

### `useInvoiceData`
**File:** `src/hooks/useInvoiceData.ts`

**Mô tả:**
Quản lý invoices và AR (Accounts Receivable).

**Exports:**
- `useInvoices` - List invoices
- `useInvoiceTracking` - Track collection status
- `useCollectionStats` - AR aging statistics
- `useCreateInvoice`, `useUpdateInvoice` - CRUD

**Sử dụng trong:**
- `InvoiceTrackingPage.tsx`
- `InvoiceCreatePage.tsx`
- `AROperations.tsx`
- Reconciliation

---

### `useBillsData`
**File:** `src/hooks/useBillsData.ts`

**Mô tả:**
Quản lý bills và AP (Accounts Payable).

**Sử dụng trong:**
- `BillsPage.tsx`
- `SupplierPaymentsPage.tsx`
- Working Capital analysis

---

### `useBankData`
**File:** `src/hooks/useBankData.ts`

**Mô tả:**
Quản lý bank accounts và transactions.

**Sử dụng trong:**
- `BankConnectionsPage.tsx`
- Cash flow analysis
- Reconciliation

---

### `useInventoryData`
**File:** `src/hooks/useInventoryData.ts`

**Mô tả:**
Quản lý inventory levels và movements.

**Sử dụng trong:**
- `InventoryAgingPage.tsx`
- Working Capital
- SKU Analysis

---

### `useInventoryAging`
**File:** `src/hooks/useInventoryAging.ts`

**Mô tả:**
Phân tích inventory aging để identify slow-moving stock.

**Logic chính:**
- Group by age brackets (0-30, 31-60, 61-90, >90 days)
- Calculate locked cash in inventory
- Alert for slow movers

**Sử dụng trong:**
- `InventoryAgingPage.tsx`
- Control Tower - Inventory alerts

---

## Control Tower

### `useAlertInstances`
**File:** `src/hooks/useAlertInstances.ts`

**Mô tả:**
Quản lý các alert instances đang active.

**Logic chính:**
- Fetch alerts by status (open, acknowledged, resolved)
- Filter by severity, category
- Support assignment to team members
- Track resolution time

**Sử dụng trong:**
- `AlertsPage.tsx` (Control Tower)
- `AlertInstancesPanel.tsx`
- `MobileAlertsPage.tsx`

---

### `useIntelligentAlertRules`
**File:** `src/hooks/useIntelligentAlertRules.ts`

**Mô tả:**
Cấu hình và quản lý intelligent alert rules.

**Logic chính:**
- Define thresholds per metric
- Set severity levels
- Configure notification channels
- Multi-channel support (per sales channel)

**Rule Types:**
```typescript
type AlertRuleType = 
  | 'INVENTORY_STOCKOUT_RISK'
  | 'SALES_VELOCITY_DROP'
  | 'MARGIN_BELOW_THRESHOLD'
  | 'PAYMENT_OVERDUE'
  | 'CASH_RUNWAY_LOW'
  | ...
```

**Sử dụng trong:**
- `IntelligentRulesPage.tsx`
- `CreateRuleDialog.tsx`
- `EditRuleParamsDialog.tsx`

---

### `useAlertDataSources`
**File:** `src/hooks/useAlertDataSources.ts`

**Mô tả:**
Quản lý data sources cho alert system.

**Sử dụng trong:**
- `AlertDataSourcesPanel.tsx`
- `DataSourceHealthPanel.tsx`

---

### `useAlertObjects`
**File:** `src/hooks/useAlertObjects.ts`

**Mô tả:**
Quản lý objects được monitor (stores, SKUs, campaigns...).

**Sử dụng trong:**
- `AlertObjectsPanel.tsx`
- `StoreHealthMap.tsx`

---

### `useAlertSettings`
**File:** `src/hooks/useAlertSettings.ts`

**Mô tả:**
Cấu hình global settings cho alert system.

**Sử dụng trong:**
- `SettingsPage.tsx` (Control Tower)
- `AlertConfigDialog.tsx`

---

### `useAlertEscalation`
**File:** `src/hooks/useAlertEscalation.ts`

**Mô tả:**
Quản lý escalation rules khi alerts không được xử lý.

**Logic chính:**
- Define escalation timelines
- Auto-escalate to higher roles
- Notify additional channels

**Sử dụng trong:**
- `AlertEscalationPanel.tsx`
- `SettingsPage.tsx`

---

### `useControlTowerAnalytics`
**File:** `src/hooks/useControlTowerAnalytics.ts`

**Mô tả:**
Analytics cho Control Tower performance.

**Metrics:**
- Alert volume by category
- Average resolution time
- Escalation rate
- Team performance

**Sử dụng trong:**
- `AnalyticsPage.tsx` (Control Tower)

---

### `useStores`
**File:** `src/hooks/useStores.ts`

**Mô tả:**
Quản lý danh sách stores/locations.

**Sử dụng trong:**
- `StoresPage.tsx`
- `StoreHealthMap.tsx`

---

## Marketing Data Platform (MDP)

### `useMDPData`
**File:** `src/hooks/useMDPData.ts`

**Mô tả:**
**HOOK TRUNG TÂM MDP** - Cung cấp tất cả marketing metrics với financial truth overlay.

**Logic chính:**
- Fetch campaign performance data
- Calculate TRUE ROAS (sau COGS và returns)
- Attribution modeling
- Cash impact analysis

**Modes:**
```typescript
type MDPMode = 'marketing' | 'cmo';
// Marketing Mode: Metrics cho execution
// CMO Mode: Financial impact cho strategy
```

**Key Metrics:**
```typescript
{
  trueROAS: number,        // Net Revenue / Ad Spend
  contributionMargin: number,
  cashImpact: number,
  paybackPeriod: number,
  ltv: number,
  cac: number,
}
```

**Sử dụng trong:**
- `MDPDashboardPage.tsx`
- All MDP sub-pages
- CMO Mode components
- Marketing Mode components

---

### `useMDPDataReadiness`
**File:** `src/hooks/useMDPDataReadiness.ts`

**Mô tả:**
Kiểm tra data readiness cho MDP analysis.

**Logic chính:**
- Check required data sources
- Validate data quality
- Report missing data

**Sử dụng trong:**
- `DataReadinessPage.tsx` (MDP)

---

### `useMarketingProfitability`
**File:** `src/hooks/useMarketingProfitability.ts`

**Mô tả:**
Phân tích profitability của marketing activities.

**Logic chính:**
```
Marketing Profit = Revenue Attributed - (Ad Spend + COGS + Returns)
Marketing ROI = Marketing Profit / Marketing Investment
```

**Sử dụng trong:**
- `MarketingProfitPanel.tsx`
- `ProfitAttributionPage.tsx`

---

### `useChannelAnalytics`
**File:** `src/hooks/useChannelAnalytics.ts`

**Mô tả:**
Analytics chi tiết cho từng marketing channel.

**Sử dụng trong:**
- `ChannelAnalyticsPage.tsx`
- `ChannelsPage.tsx` (MDP)

---

### `useABTestingData`
**File:** `src/hooks/useABTestingData.ts`

**Mô tả:**
Data cho A/B testing analysis.

**Sử dụng trong:**
- `ABTestingPage.tsx`

---

### `useAudienceData`
**File:** `src/hooks/useAudienceData.ts`

**Mô tả:**
Audience insights và segmentation data.

**Sử dụng trong:**
- `AudienceInsightsPage.tsx`

---

### `usePromotions`
**File:** `src/hooks/usePromotions.ts`

**Mô tả:**
Quản lý promotions và analyze ROI.

**Sử dụng trong:**
- `PromotionROIPage.tsx`

---

## Decision Center

### `useDecisionCards`
**File:** `src/hooks/useDecisionCards.ts`

**Mô tả:**
**HOOK TRUNG TÂM DECISION CENTER** - Quản lý toàn bộ decision cards.

**Logic chính:**
- CRUD operations cho decision cards
- Track card status (OPEN, IN_PROGRESS, DECIDED, DISMISSED)
- Record decisions with audit trail
- Snooze functionality

**Exports:**
```typescript
useDecisionCards({ status, priority }) // List cards
useDecisionCard(id) // Single card
useDecisionCardStats() // Statistics
useDecideCard() // Make decision
useDismissCard() // Dismiss card
useSnoozeCard() // Snooze card
```

**Sử dụng trong:**
- `DecisionCenterPage.tsx`
- `DecisionCard.tsx`
- `PendingDecisionsPanel.tsx`

---

### `useAutoDecisionCards`
**File:** `src/hooks/useAutoDecisionCards.ts`

**Mô tả:**
Tự động generate decision cards từ FDP analysis.

**Logic chính:**
- Analyze problematic SKUs → Generate SKU STOP cards
- Analyze cash position → Generate CASH SURVIVAL cards
- Use real-time data (SSOT)
- Priority assignment based on impact

**Card Types Generated:**
```typescript
- SKU_STOP: SKU đang lỗ, khuyên dừng bán
- CASH_SURVIVAL: Cash runway low
- INVENTORY_CASH_LOCK: Tiền bị khóa trong hàng tồn
- GROWTH_SCALE: Cơ hội scale
```

**Sử dụng trong:**
- `DecisionCenterPage.tsx` - Auto cards
- Realtime decision recommendations

---

### `useDecisionAnalyses`
**File:** `src/hooks/useDecisionAnalyses.ts`

**Mô tả:**
Lưu và quản lý các financial analyses cho decisions.

**Analysis Types:**
- NPV/IRR Analysis
- Payback Analysis
- ROI Analysis
- Sensitivity Analysis

**Sử dụng trong:**
- `DecisionSupportPage.tsx`
- `SavedAnalysesList.tsx`
- NPV/IRR/ROI Analysis components

---

### `usePendingDecisions`
**File:** `src/hooks/usePendingDecisions.ts`

**Mô tả:**
Lấy danh sách decisions đang pending approval.

**Sử dụng trong:**
- `PendingDecisionsPanel.tsx`
- `ExecutiveSummaryPage.tsx`

---

### `useBluecoreScores`
**File:** `src/hooks/useBluecoreScores.ts`

**Mô tả:**
Tính toán Bluecore Health Scores.

**Score Types:**
```typescript
- FINANCIAL_HEALTH: Sức khỏe tài chính tổng thể
- OPERATIONAL_EFFICIENCY: Hiệu quả vận hành
- GROWTH_MOMENTUM: Động lực tăng trưởng
- RISK_EXPOSURE: Mức độ rủi ro
```

**Sử dụng trong:**
- `BluecoreScoresPanel.tsx`
- `CFODashboard.tsx`
- Executive views

---

## Alert System

### `useNotificationCenter`
**File:** `src/hooks/useNotificationCenter.ts`

**Mô tả:**
Central hub cho tất cả notifications.

**Logic chính:**
- Aggregate alerts từ nhiều sources
- Group by category/severity
- Track read/unread status
- Support multiple channels (in-app, email, push)

**Sử dụng trong:**
- `NotificationCenter.tsx`
- `AlertsPage.tsx`
- `MobileAlertsPage.tsx`

---

### `useNotifications`
**File:** `src/hooks/useNotifications.ts`

**Mô tả:**
User-specific notification preferences.

**Sử dụng trong:**
- `SettingsPage.tsx`
- Notification preferences

---

### `useNotificationRecipients`
**File:** `src/hooks/useNotificationRecipients.ts`

**Mô tả:**
Quản lý danh sách recipients cho notifications.

**Sử dụng trong:**
- `NotificationRecipientsPanel.tsx`
- `RuleRecipientsDialog.tsx`

---

### `usePushNotifications`
**File:** `src/hooks/usePushNotifications.ts`

**Mô tả:**
Web Push notifications setup và management.

**Sử dụng trong:**
- `PushNotificationSettings.tsx`

---

### `useCapacitorPushNotifications`
**File:** `src/hooks/useCapacitorPushNotifications.ts`

**Mô tả:**
Native push notifications cho mobile apps (iOS/Android).

**Sử dụng trong:**
- `NativePushSettings.tsx`
- Mobile app

---

### `useScheduledNotifications`
**File:** `src/hooks/useScheduledNotifications.ts`

**Mô tả:**
Quản lý scheduled/recurring notifications.

**Sử dụng trong:**
- `ScheduledNotificationsManager.tsx`

---

### `useRiskAlerts`
**File:** `src/hooks/useRiskAlerts.ts`

**Mô tả:**
Alerts liên quan đến risk factors.

**Sử dụng trong:**
- `RiskDashboardPage.tsx`
- `RiskAlertsPanel.tsx` (MDP)

---

## Data Integration

### `useConnectorIntegrations`
**File:** `src/hooks/useConnectorIntegrations.ts`

**Mô tả:**
Quản lý data connectors (Shopee, Lazada, Google Ads...).

**Sử dụng trong:**
- `DataHubPage.tsx`
- `IntegrationCard.tsx`
- `AddConnectorDialog.tsx`

---

### `useBigQueryRealtime`
**File:** `src/hooks/useBigQueryRealtime.ts`

**Mô tả:**
Real-time sync với BigQuery data warehouse.

**Exports:**
- `useBigQueryConfigs`
- `useBigQueryDataModels`
- `useSyncWatermarks`

**Sử dụng trong:**
- `DataWarehousePage.tsx`
- `BigQueryRealtimeDashboard.tsx`
- `BigQuerySyncManager.tsx`

---

### `useDataImport`
**File:** `src/hooks/useDataImport.ts`

**Mô tả:**
Import data từ files (CSV, Excel).

**Sử dụng trong:**
- `FileImportDialog.tsx`

---

### `useEcommerceReconciliation`
**File:** `src/hooks/useEcommerceReconciliation.ts`

**Mô tả:**
Reconcile orders giữa e-commerce platforms và internal systems.

**Sử dụng trong:**
- `ReconciliationHubPage.tsx`
- `ReconciliationBoard.tsx`

---

### `useReconciliation`
**File:** `src/hooks/useReconciliation.ts`

**Mô tả:**
Bank reconciliation operations.

**Sử dụng trong:**
- `ReconciliationHubPage.tsx`
- `AutoMatchDialog.tsx`

---

### `useOrders`
**File:** `src/hooks/useOrders.ts`

**Mô tả:**
Quản lý orders từ các platforms.

**Sử dụng trong:**
- Order tracking
- Reconciliation
- Revenue analysis

---

## Scenario & Forecasting

### `useScenarioData`
**File:** `src/hooks/useScenarioData.ts`

**Mô tả:**
Quản lý scenarios cho planning.

**Sử dụng trong:**
- `ScenarioPage.tsx`
- `ScenarioHubPage.tsx`
- `ScenarioPlanner.tsx`

---

### `useScenarioBudgetData`
**File:** `src/hooks/useScenarioBudgetData.ts`

**Mô tả:**
Budget data theo scenarios.

**Sử dụng trong:**
- `BudgetVsActualPage.tsx`
- `ScenarioBudgetSummary.tsx`

---

### `useMonthlyPlans`
**File:** `src/hooks/useMonthlyPlans.ts`

**Mô tả:**
Monthly planning data.

**Sử dụng trong:**
- `MonthlyPlanEditor.tsx`
- `ScenarioPage.tsx`

---

### `useRollingForecast`
**File:** `src/hooks/useRollingForecast.ts`

**Mô tả:**
Rolling forecast calculations.

**Sử dụng trong:**
- `RollingForecastPage.tsx`
- `CashForecastPage.tsx`

---

### `useWeeklyCashForecast`
**File:** `src/hooks/useWeeklyCashForecast.ts`

**Mô tả:**
Weekly cash flow forecast.

**Sử dụng trong:**
- `CashForecastPage.tsx`
- `WeeklyForecastView.tsx`

---

### `useForecastInputs`
**File:** `src/hooks/useForecastInputs.ts`

**Mô tả:**
User inputs cho forecasting.

**Sử dụng trong:**
- `CashForecastPage.tsx`
- Forecast configuration

---

### `useMonteCarloSimulation`
**File:** `src/hooks/useMonteCarloSimulation.ts`

**Mô tả:**
Monte Carlo simulation cho risk analysis.

**Sử dụng trong:**
- `RiskDashboardPage.tsx`
- `StressTestingPanel.tsx`

---

### `useWhatIfScenarios`
**File:** `src/hooks/useWhatIfScenarios.ts`

**Mô tả:**
What-If scenario analysis.

**Sử dụng trong:**
- `ChannelWhatIfPage.tsx`
- `WhatIfSimulationPanel.tsx`

---

### `useWhatIfRealData`
**File:** `src/hooks/useWhatIfRealData.ts`

**Mô tả:**
Real data cho what-if comparisons.

**Sử dụng trong:**
- `HistoricalComparisonPanel.tsx`
- What-if analysis

---

### `useWhatIfDefaults`
**File:** `src/hooks/useWhatIfDefaults.ts`

**Mô tả:**
Default values cho what-if inputs.

**Sử dụng trong:**
- What-if initialization

---

## Utility Hooks

### `use-mobile`
**File:** `src/hooks/use-mobile.tsx`

**Mô tả:**
Detect mobile device cho responsive UI.

**Sử dụng trong:**
- Layout components
- Responsive components

---

### `use-toast`
**File:** `src/hooks/use-toast.ts`

**Mô tả:**
Toast notifications utility.

**Sử dụng trong:**
- Toàn bộ app cho notifications

---

### `useAIInsights`
**File:** `src/hooks/useAIInsights.ts`

**Mô tả:**
Fetch AI-generated insights.

**Sử dụng trong:**
- `AIInsightsPanel.tsx`
- `ContextualAIPanel.tsx`

---

### `useAIUsageData`
**File:** `src/hooks/useAIUsageData.ts`

**Mô tả:**
Track AI feature usage.

**Sử dụng trong:**
- `AIUsagePanel.tsx`

---

### `useAuditLogs`
**File:** `src/hooks/useAuditLogs.ts`

**Mô tả:**
Audit trail cho system changes.

**Sử dụng trong:**
- `AuditLogPage.tsx`

---

### `useGLAccounts`
**File:** `src/hooks/useGLAccounts.ts`

**Mô tả:**
Chart of Accounts management.

**Sử dụng trong:**
- `ChartOfAccountsPage.tsx`

---

### `useCovenantTracking`
**File:** `src/hooks/useCovenantTracking.ts`

**Mô tả:**
Track bank loan covenants.

**Sử dụng trong:**
- `CovenantTrackingPage.tsx`

---

### `useCreditDebitNotes`
**File:** `src/hooks/useCreditDebitNotes.ts`

**Mô tả:**
Manage credit/debit notes.

**Sử dụng trong:**
- `CreditDebitNotesPage.tsx`

---

### `useCapexProjects`
**File:** `src/hooks/useCapexProjects.ts`

**Mô tả:**
Capital expenditure projects.

**Sử dụng trong:**
- `CapitalAllocationPage.tsx`

---

### `useInvestments`
**File:** `src/hooks/useInvestments.ts`

**Mô tả:**
Investment tracking.

**Sử dụng trong:**
- `CapitalAllocationPage.tsx`

---

### `useSupplierPayments`
**File:** `src/hooks/useSupplierPayments.ts`

**Mô tả:**
Supplier payment scheduling.

**Sử dụng trong:**
- `SupplierPaymentsPage.tsx`

---

### `useBoardReports`
**File:** `src/hooks/useBoardReports.ts`

**Mô tả:**
Generate board-level reports.

**Sử dụng trong:**
- `BoardReportsPage.tsx`

---

### `useQuickWins`
**File:** `src/hooks/useQuickWins.ts`

**Mô tả:**
Identify quick win opportunities.

**Sử dụng trong:**
- Dashboard recommendations

---

### `useRiskScores`
**File:** `src/hooks/useRiskScores.ts`

**Mô tả:**
Calculate risk scores.

**Sử dụng trong:**
- `RiskDashboardPage.tsx`

---

### `useVarianceAnalysis`
**File:** `src/hooks/useVarianceAnalysis.ts`

**Mô tả:**
Budget variance analysis.

**Sử dụng trong:**
- `VarianceAnalysisPage.tsx`

---

## 📊 HOOKS BY MODULE SUMMARY

| Module | Hooks Count | Primary Hooks |
|--------|-------------|---------------|
| **FDP** | 15+ | `useCentralFinancialMetrics`, `useCashRunway`, `usePLData` |
| **Control Tower** | 10+ | `useAlertInstances`, `useIntelligentAlertRules` |
| **MDP** | 8+ | `useMDPData`, `useMarketingProfitability`, `useChannelAnalytics` |
| **Decision Center** | 5+ | `useDecisionCards`, `useAutoDecisionCards`, `useBluecoreScores` |
| **Notifications** | 6+ | `useNotificationCenter`, `usePushNotifications` |
| **Data Integration** | 6+ | `useConnectorIntegrations`, `useBigQueryRealtime` |
| **Scenario/Forecast** | 8+ | `useScenarioData`, `useRollingForecast`, `useMonteCarloSimulation` |

---

## 🔄 DATA FLOW DIAGRAM

```
┌──────────────────────────────────────────────────────────────┐
│                     DATA SOURCES                              │
│  BigQuery │ Supabase │ E-commerce APIs │ Bank APIs │ Files   │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                   DATA INTEGRATION HOOKS                      │
│  useConnectorIntegrations │ useBigQueryRealtime │ useDataImport │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                     CORE DATA HOOKS                           │
│  useInvoiceData │ useBillsData │ useOrders │ useInventoryData │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                  FINANCIAL ANALYSIS HOOKS (FDP)               │
│  useCentralFinancialMetrics │ useCashRunway │ usePLData      │
│  useChannelPL │ useSKUProfitabilityCache                      │
└───────────────────────────┬──────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│  CONTROL TOWER  │ │     MDP     │ │ DECISION CENTER │
│ useAlertInstances│ │ useMDPData │ │useDecisionCards │
│ useAlertRules   │ │useChannelAn.│ │useAutoDecision..│
└─────────────────┘ └─────────────┘ └─────────────────┘
              │             │             │
              └─────────────┼─────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    UI COMPONENTS                              │
│  Pages │ Dashboards │ Cards │ Charts │ Tables                │
└──────────────────────────────────────────────────────────────┘
```

---

*Tài liệu này được tạo tự động và cập nhật theo code base. Liên hệ team phát triển nếu có thắc mắc.*
