import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { TenantProvider } from "@/contexts/TenantContext";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { GlobalErrorBoundary } from "@/components/shared/GlobalErrorBoundary";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { SuperAdminRoute } from "@/components/admin/SuperAdminRoute";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { Loader2 } from "lucide-react";

// Eager loaded pages (critical path)
import AuthPage from "./pages/AuthPage";
import CFODashboard from "./pages/CFODashboard";
import NotFound from "./pages/NotFound";

// Lazy loaded pages (chart-heavy and complex pages)
const PortalPage = lazy(() => import("./pages/PortalPage"));
const AROperations = lazy(() => import("./pages/AROperations"));
const ChartOfAccountsPage = lazy(() => import("./pages/ChartOfAccountsPage"));
const BillsPage = lazy(() => import("./pages/BillsPage"));
const CreditDebitNotesPage = lazy(() => import("./pages/CreditDebitNotesPage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const BankConnectionsPage = lazy(() => import("./pages/BankConnectionsPage"));
const PLReportPage = lazy(() => import("./pages/PLReportPage"));
const InvoiceCreatePage = lazy(() => import("./pages/InvoiceCreatePage"));
const InvoiceTrackingPage = lazy(() => import("./pages/InvoiceTrackingPage"));
const InvoiceDetailPage = lazy(() => import("./pages/InvoiceDetailPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const RevenuePage = lazy(() => import("./pages/RevenuePage"));
const TaxCompliancePage = lazy(() => import("./pages/TaxCompliancePage"));
const ETLRulesPage = lazy(() => import("./pages/ETLRulesPage"));
const CashForecastPage = lazy(() => import("./pages/CashForecastPage"));
const ChannelAnalyticsPage = lazy(() => import("./pages/ChannelAnalyticsPage"));
const ChannelPLPage = lazy(() => import("./pages/ChannelPLPage"));
const ChannelWhatIfPage = lazy(() => import("./pages/ChannelWhatIfPage"));
const UnitEconomicsPage = lazy(() => import("./pages/UnitEconomicsPage"));
const CashConversionCyclePage = lazy(() => import("./pages/CashConversionCyclePage"));
const BudgetVsActualPage = lazy(() => import("./pages/BudgetVsActualPage"));
const RollingForecastPage = lazy(() => import("./pages/RollingForecastPage"));
const CovenantTrackingPage = lazy(() => import("./pages/CovenantTrackingPage"));
const WorkingCapitalPage = lazy(() => import("./pages/WorkingCapitalPage"));
const VarianceAnalysisPage = lazy(() => import("./pages/VarianceAnalysisPage"));
const BoardReportsPage = lazy(() => import("./pages/BoardReportsPage"));
const StrategicInitiativesPage = lazy(() => import("./pages/StrategicInitiativesPage"));
const RBACPage = lazy(() => import("./pages/RBACPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const APIPage = lazy(() => import("./pages/APIPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const DataEntryGuidePage = lazy(() => import("./pages/DataEntryGuidePage"));
const UserGuidePage = lazy(() => import("./pages/UserGuidePage"));
const TenantManagementPage = lazy(() => import("./pages/TenantManagementPage"));
const TenantMembersPage = lazy(() => import("./pages/TenantMembersPage"));
const TenantSettingsPage = lazy(() => import("./pages/TenantSettingsPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminTenantsPage = lazy(() => import("./pages/admin/AdminTenantsPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));

// New merged pages
const ReconciliationHubPage = lazy(() => import("./pages/ReconciliationHubPage"));
const DataHubPage = lazy(() => import("./pages/DataHubPage"));
const DataWarehousePage = lazy(() => import("./pages/DataWarehousePage"));
const ScenarioHubPage = lazy(() => import("./pages/ScenarioHubPage"));
const ScenarioPage = lazy(() => import("./pages/ScenarioPage"));
const FinancialReportsPage = lazy(() => import("./pages/FinancialReportsPage"));
const FormulasPage = lazy(() => import("./pages/FormulasPage"));
const FormulaSettingsPage = lazy(() => import("./pages/FormulaSettingsPage"));

// Strategy & Decision pages
const ExecutiveSummaryPage = lazy(() => import("./pages/ExecutiveSummaryPage"));
const CapitalAllocationPage = lazy(() => import("./pages/CapitalAllocationPage"));
const DecisionSupportPage = lazy(() => import("./pages/DecisionSupportPage"));
const RiskDashboardPage = lazy(() => import("./pages/RiskDashboardPage"));

// New retail CFO modules
const InventoryAgingPage = lazy(() => import("./pages/InventoryAgingPage"));
const PromotionROIPage = lazy(() => import("./pages/PromotionROIPage"));
const SupplierPaymentsPage = lazy(() => import("./pages/SupplierPaymentsPage"));
const CashFlowDirectPage = lazy(() => import("./pages/CashFlowDirectPage"));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/portal" element={
        <ProtectedRoute>
          <PortalPage />
        </ProtectedRoute>
      } />
      
      {/* Super Admin Routes */}
      <Route
        element={
          <ProtectedRoute>
            <SuperAdminRoute />
          </ProtectedRoute>
        }
      >
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/tenants" element={<AdminTenantsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      {/* Tenant Operations Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/portal" replace />} />
        <Route path="/dashboard" element={<CFODashboard />} />
        <Route path="/ar-operations" element={<AROperations />} />
        <Route path="/reconciliation" element={<ReconciliationHubPage />} />
        <Route path="/chart-of-accounts" element={<ChartOfAccountsPage />} />
        <Route path="/bills" element={<BillsPage />} />
        <Route path="/credit-debit-notes" element={<CreditDebitNotesPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/bank-connections" element={<BankConnectionsPage />} />
        <Route path="/financial-reports" element={<FinancialReportsPage />} />
        <Route path="/pl-report" element={<PLReportPage />} />
        <Route path="/scenario" element={<ScenarioHubPage />} />
        <Route path="/scenario-hub" element={<ScenarioHubPage />} />
        <Route path="/scenario/:id" element={<ScenarioPage />} />
        <Route path="/invoice/create" element={<InvoiceCreatePage />} />
        <Route path="/invoice/tracking" element={<InvoiceTrackingPage />} />
        <Route path="/invoice/:id" element={<InvoiceDetailPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/revenue" element={<RevenuePage />} />
        <Route path="/tax-compliance" element={<TaxCompliancePage />} />
        <Route path="/data-hub" element={<DataHubPage />} />
        <Route path="/data-warehouse" element={<DataWarehousePage />} />
        <Route path="/etl-rules" element={<ETLRulesPage />} />
        <Route path="/cash-forecast" element={<CashForecastPage />} />
        <Route path="/channel-analytics" element={<ChannelAnalyticsPage />} />
        <Route path="/channel/:channelId" element={<ChannelPLPage />} />
        <Route path="/channel/:channelId/whatif" element={<ChannelWhatIfPage />} />
        <Route path="/unit-economics" element={<UnitEconomicsPage />} />
        <Route path="/cash-conversion-cycle" element={<CashConversionCyclePage />} />
        <Route path="/budget-vs-actual" element={<BudgetVsActualPage />} />
        <Route path="/rolling-forecast" element={<RollingForecastPage />} />
        <Route path="/covenant-tracking" element={<CovenantTrackingPage />} />
        <Route path="/working-capital" element={<WorkingCapitalPage />} />
        <Route path="/variance-analysis" element={<VarianceAnalysisPage />} />
        <Route path="/board-reports" element={<BoardReportsPage />} />
        <Route path="/strategic-initiatives" element={<StrategicInitiativesPage />} />
        <Route path="/executive-summary" element={<ExecutiveSummaryPage />} />
        <Route path="/capital-allocation" element={<CapitalAllocationPage />} />
        <Route path="/decision-support" element={<DecisionSupportPage />} />
        <Route path="/risk-dashboard" element={<RiskDashboardPage />} />
        <Route path="/inventory-aging" element={<InventoryAgingPage />} />
        <Route path="/promotion-roi" element={<PromotionROIPage />} />
        <Route path="/supplier-payments" element={<SupplierPaymentsPage />} />
        <Route path="/cash-flow-direct" element={<CashFlowDirectPage />} />
        <Route path="/rbac" element={<RBACPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
        <Route path="/api" element={<APIPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/user-guide" element={<UserGuidePage />} />
        <Route path="/data-guide" element={<DataEntryGuidePage />} />
        <Route path="/formulas" element={<FormulasPage />} />
        <Route path="/formula-settings" element={<FormulaSettingsPage />} />
        <Route path="/tenant" element={<TenantManagementPage />} />
        <Route path="/tenant/members" element={<TenantMembersPage />} />
        <Route path="/tenant/settings" element={<TenantSettingsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AuthProvider>
            <TenantProvider>
              <DateRangeProvider>
                <GlobalErrorBoundary level="page">
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <ImpersonationBanner />
                    <Suspense fallback={
                      <div className="min-h-screen flex items-center justify-center bg-background">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    }>
                      <AppRoutes />
                    </Suspense>
                  </BrowserRouter>
                </GlobalErrorBoundary>
              </DateRangeProvider>
            </TenantProvider>
          </AuthProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
