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
import { CrashOverlay } from "@/components/debug/CrashOverlay";
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
const DocumentationPage = lazy(() => import("./pages/DocumentationPage"));
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
const ExceptionsPage = lazy(() => import("./pages/ExceptionsPage"));
const VarianceAnalysisPage = lazy(() => import("./pages/VarianceAnalysisPage"));
const BoardReportsPage = lazy(() => import("./pages/BoardReportsPage"));
const StrategicInitiativesPage = lazy(() => import("./pages/StrategicInitiativesPage"));
const RBACPage = lazy(() => import("./pages/RBACPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const APIPage = lazy(() => import("./pages/APIPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
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
const DataGuidePage = lazy(() => import("./pages/DataGuidePage"));
const ScenarioHubPage = lazy(() => import("./pages/ScenarioHubPage"));
const ScenarioPage = lazy(() => import("./pages/ScenarioPage"));
const FinancialReportsPage = lazy(() => import("./pages/FinancialReportsPage"));

const WorkingCapitalHubPage = lazy(() => import("./pages/WorkingCapitalHubPage"));
const PerformanceAnalysisPage = lazy(() => import("./pages/PerformanceAnalysisPage"));

// CDP pages - Restructured per spec v2
const CDPPage = lazy(() => import("./pages/cdp/CDPOverviewPage"));
const InsightsPage = lazy(() => import("./pages/cdp/InsightsPage"));
// CDP Explore sub-pages
const CustomerResearchPage = lazy(() => import("./pages/cdp/explore/CustomerResearchPage"));
const BehaviorFiltersPage = lazy(() => import("./pages/cdp/explore/BehaviorFiltersPage"));
const ComparePopulationsPage = lazy(() => import("./pages/cdp/explore/ComparePopulationsPage"));
const SavedViewsPage = lazy(() => import("./pages/cdp/explore/SavedViewsPage"));
const InsightDetailPage = lazy(() => import("./pages/cdp/InsightDetailPage"));
const InsightRegistryPage = lazy(() => import("./pages/cdp/InsightRegistryPage"));
const DemandInsightsPage = lazy(() => import("./pages/cdp/DemandInsightsPage"));
// Equity pages consolidated into LTV Engine
const LTVEnginePage = lazy(() => import("./pages/cdp/LTVEnginePage"));
// CDP Q&A
const CustomerQAPage = lazy(() => import("./pages/cdp/CustomerQAPage"));
const PopulationsPage = lazy(() => import("./pages/cdp/PopulationsPage"));
const PopulationDetailPage = lazy(() => import("./pages/cdp/PopulationDetailPage"));
const PopulationGovernancePage = lazy(() => import("./pages/cdp/PopulationGovernancePage"));
const DecisionCardsPage = lazy(() => import("./pages/cdp/DecisionCardsPage"));
const DecisionDetailPage = lazy(() => import("./pages/cdp/DecisionDetailPage"));
const DataConfidencePage = lazy(() => import("./pages/cdp/DataConfidencePage"));
const CustomerAuditPage = lazy(() => import("./pages/cdp/CustomerAuditPage"));
// Legacy CDP pages (keep for backwards compatibility)
const ValueDistributionPage = lazy(() => import("./pages/cdp/ValueDistributionPage"));
const TrendEnginePage = lazy(() => import("./pages/cdp/TrendEnginePage"));


// Strategy & Decision pages
const ExecutiveSummaryPage = lazy(() => import("./pages/ExecutiveSummaryPage"));
const CapitalAllocationPage = lazy(() => import("./pages/CapitalAllocationPage"));
const DecisionSupportPage = lazy(() => import("./pages/DecisionSupportPage"));
const RiskDashboardPage = lazy(() => import("./pages/RiskDashboardPage"));
const DecisionCenterPage = lazy(() => import("./pages/DecisionCenterPage"));

// New retail CFO modules
const InventoryAgingPage = lazy(() => import("./pages/InventoryAgingPage"));
const PromotionROIPage = lazy(() => import("./pages/PromotionROIPage"));
const SupplierPaymentsPage = lazy(() => import("./pages/SupplierPaymentsPage"));
const CashFlowDirectPage = lazy(() => import("./pages/CashFlowDirectPage"));

// Sales Kit pages
const DataWarehouseSalesKit = lazy(() => import("./pages/sales-kit/DataWarehouseSalesKit"));
const FDPSalesKit = lazy(() => import("./pages/sales-kit/FDPSalesKit"));
const FDPSalesDeckPage = lazy(() => import("./pages/fdp/FDPSalesDeckPage"));
const FDPExecutiveDeck = lazy(() => import("./pages/fdp/FDPExecutiveDeck"));
const MDPExecutiveDeck = lazy(() => import("./pages/mdp/MDPExecutiveDeck"));
// Product Review Hub pages
const ReviewHubHome = lazy(() => import("./pages/review-hub/ReviewHubHome"));
const ReviewHubRoutes = lazy(() => import("./pages/review-hub/ReviewHubRoutes"));
const SystemReviewIndex = lazy(() => import("./pages/review-hub/SystemReviewIndex"));
const CrossSystemReview = lazy(() => import("./pages/review-hub/CrossSystemReview"));
const DataContractView = lazy(() => import("./pages/review-hub/DataContractView"));

// MDP pages - eager import to avoid reload issues
import MDPDashboardPage from "./pages/MDPDashboardPage";
import MarketingModePage from "./pages/mdp/MarketingModePage";
import CMOModePage from "./pages/mdp/CMOModePage";
import CampaignsPage from "./pages/mdp/CampaignsPage";
import ChannelsPage from "./pages/mdp/ChannelsPage";
import FunnelPage from "./pages/mdp/FunnelPage";
import ABTestingPage from "./pages/mdp/ABTestingPage";
import AudienceInsightsPage from "./pages/mdp/AudienceInsightsPage";
import BudgetOptimizerPage from "./pages/mdp/BudgetOptimizerPage";
import ScenarioPlannerPage from "./pages/mdp/ScenarioPlannerPage";
import ROIAnalyticsPage from "./pages/mdp/ROIAnalyticsPage";
import CustomerLTVPage from "./pages/mdp/CustomerLTVPage";
import DataSourcesPage from "./pages/mdp/DataSourcesPage";
import DataReadinessPage from "./pages/mdp/DataReadinessPage";
// CMO Mode pages
import ProfitAttributionPage from "./pages/mdp/ProfitAttributionPage";
import CashImpactPage from "./pages/mdp/CashImpactPage";
import RiskAlertsPage from "./pages/mdp/RiskAlertsPage";
import MDPDecisionSupportPage from "./pages/mdp/DecisionSupportPage";
// MDP V2 - CEO Decision View
import MDPV2CEOPage from "./pages/mdp/MDPV2CEOPage";
// MDP Sales Deck - CEO Presentation
import MDPSalesDeckPage from "./pages/mdp/MDPSalesDeckPage";

// Control Tower pages - CEO = Strategic | COO = Execution
import CTTasksPage from "./pages/control-tower/TasksPage";
import CTAlertsPage from "./pages/control-tower/AlertsPage";
import CTKPIRulesPage from "./pages/control-tower/KPINotificationRulesPage";
import CTTeamPage from "./pages/control-tower/TeamPage";
import CTSettingsPage from "./pages/control-tower/SettingsPage";
import CTSituationRoomPage from "./pages/control-tower/SituationRoomPage";
import CTDecisionsPage from "./pages/control-tower/DecisionsPage";
import CTBoardViewPage from "./pages/control-tower/BoardViewPage";
import CTCEOPage from "./pages/control-tower/CEOControlTowerPage";
import CTCOOPage from "./pages/control-tower/COOControlTowerPage";


// Mobile App pages
const MobileLayout = lazy(() => import("./pages/mobile/MobileLayout"));
const MobileHomePage = lazy(() => import("./pages/mobile/MobileHomePage"));
const MobileAlertsPage = lazy(() => import("./pages/mobile/MobileAlertsPage"));
const MobileSettingsPage = lazy(() => import("./pages/mobile/MobileSettingsPage"));

// Docs Download page


import { ControlTowerLayout } from "@/components/layout/ControlTowerLayout";
import { MDPLayout } from "@/components/layout/MDPLayout";

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
      {/* Backwards-compat: some environments/users still land on /login */}
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/portal" element={
        <ProtectedRoute>
          <PortalPage />
        </ProtectedRoute>
      } />
      <Route path="/documentation" element={
        <ProtectedRoute>
          <DocumentationPage />
        </ProtectedRoute>
      } />
      {/* Redirect /formulas to /documentation since formulas are documented there */}
      <Route path="/formulas" element={<Navigate to="/documentation" replace />} />
      
      {/* CDP Routes - Restructured per spec v2 */}
      <Route path="/cdp" element={
        <ProtectedRoute>
          <CDPPage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/explore" element={
        <ProtectedRoute>
          <CustomerResearchPage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/explore/filters" element={
        <ProtectedRoute>
          <BehaviorFiltersPage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/explore/compare" element={
        <ProtectedRoute>
          <ComparePopulationsPage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/explore/saved" element={
        <ProtectedRoute>
          <SavedViewsPage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/insights" element={
        <ProtectedRoute>
          <InsightsPage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/insights/:insightCode" element={
        <ProtectedRoute>
          <InsightDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/insight-registry" element={
        <ProtectedRoute>
          <InsightRegistryPage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/insights/demand" element={
        <ProtectedRoute>
          <DemandInsightsPage />
        </ProtectedRoute>
      } />
      {/* Redirect old equity routes to unified LTV Engine */}
      <Route path="/cdp/equity" element={<Navigate to="/cdp/ltv-engine" replace />} />
      <Route path="/cdp/equity/model" element={<Navigate to="/cdp/ltv-engine" replace />} />
      <Route path="/cdp/equity/drivers" element={<Navigate to="/cdp/ltv-engine" replace />} />
      <Route path="/cdp/equity/evidence" element={<Navigate to="/cdp/ltv-engine" replace />} />
      <Route path="/cdp/ltv-engine" element={
        <ProtectedRoute>
          <LTVEnginePage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/qa" element={
        <ProtectedRoute>
          <CustomerQAPage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/populations" element={
        <ProtectedRoute>
          <PopulationsPage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/populations/governance" element={
        <ProtectedRoute>
          <PopulationGovernancePage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/populations/:populationId" element={
        <ProtectedRoute>
          <PopulationDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/decisions" element={
        <ProtectedRoute>
          <DecisionCardsPage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/decisions/:cardId" element={
        <ProtectedRoute>
          <DecisionDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/confidence" element={
        <ProtectedRoute>
          <DataConfidencePage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/audit/:customerId" element={
        <ProtectedRoute>
          <CustomerAuditPage />
        </ProtectedRoute>
      } />
      {/* Legacy CDP routes - redirect to new structure */}
      <Route path="/cdp/value-distribution" element={
        <ProtectedRoute>
          <ValueDistributionPage />
        </ProtectedRoute>
      } />
      <Route path="/cdp/trend-engine" element={
        <ProtectedRoute>
          <TrendEnginePage />
        </ProtectedRoute>
      } />

      {/* Sales Kit Routes - PDF-style pages */}
      <Route path="/sales-kit/data-warehouse" element={
        <ProtectedRoute>
          <DataWarehouseSalesKit />
        </ProtectedRoute>
      } />
      <Route path="/sales-kit/fdp" element={
        <ProtectedRoute>
          <FDPSalesKit />
        </ProtectedRoute>
      } />
      <Route path="/sales-kit/fdp-deck" element={
        <ProtectedRoute>
          <FDPSalesDeckPage />
        </ProtectedRoute>
      } />
      <Route path="/sales-kit/fdp-executive" element={
        <ProtectedRoute>
          <FDPExecutiveDeck />
        </ProtectedRoute>
      } />
      <Route path="/sales-kit/mdp" element={
        <ProtectedRoute>
          <MDPSalesDeckPage />
        </ProtectedRoute>
      } />
      <Route path="/sales-kit/mdp-executive" element={
        <ProtectedRoute>
          <MDPExecutiveDeck />
        </ProtectedRoute>
      } />

      {/* Product Review Hub Routes - Standalone governance system */}
      <Route path="/review-hub" element={
        <ProtectedRoute>
          <ReviewHubHome />
        </ProtectedRoute>
      } />
      <Route path="/review-hub/routes" element={
        <ProtectedRoute>
          <ReviewHubRoutes />
        </ProtectedRoute>
      } />
      <Route path="/review-hub/systems/:system" element={
        <ProtectedRoute>
          <SystemReviewIndex />
        </ProtectedRoute>
      } />
      <Route path="/review-hub/review" element={
        <ProtectedRoute>
          <CrossSystemReview />
        </ProtectedRoute>
      } />
      <Route path="/review-hub/data-contract" element={
        <ProtectedRoute>
          <DataContractView />
        </ProtectedRoute>
      } />

      {/* Mobile App Routes */}
      <Route
        element={
          <ProtectedRoute>
            <MobileLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/mobile" element={<MobileHomePage />} />
        <Route path="/mobile/alerts" element={<MobileAlertsPage />} />
        <Route path="/mobile/settings" element={<MobileSettingsPage />} />
      </Route>

      {/* Control Tower Routes */}
      <Route
        element={
          <ProtectedRoute>
            <ControlTowerLayout />
          </ProtectedRoute>
        }
      >
        {/* Control Tower: CEO = Strategic | COO = Execution */}
        <Route path="/control-tower" element={<Navigate to="/control-tower/ceo" replace />} />
        <Route path="/control-tower/ceo" element={<CTCEOPage />} />
        <Route path="/control-tower/coo" element={<CTCOOPage />} />
        <Route path="/control-tower/situation" element={<CTSituationRoomPage />} />
        <Route path="/control-tower/board" element={<CTBoardViewPage />} />
        <Route path="/control-tower/decisions" element={<CTDecisionsPage />} />
        <Route path="/control-tower/alerts" element={<CTAlertsPage />} />
        <Route path="/control-tower/tasks" element={<CTTasksPage />} />
        <Route path="/control-tower/kpi-rules" element={<CTKPIRulesPage />} />
        <Route path="/control-tower/team" element={<CTTeamPage />} />
        <Route path="/control-tower/settings" element={<CTSettingsPage />} />
        
      </Route>

      {/* MDP Routes - Independent system like Control Tower */}
      <Route
        element={
          <ProtectedRoute>
            <MDPLayout />
          </ProtectedRoute>
        }
      >
        {/* MDP Manifesto: Profit before Performance. Cash before Clicks. */}
        <Route path="/mdp" element={<Navigate to="/mdp/ceo" replace />} />
        <Route path="/mdp/ceo" element={<MDPV2CEOPage />} />
        <Route path="/mdp/marketing-mode" element={<MarketingModePage />} />
        <Route path="/mdp/cmo-mode" element={<CMOModePage />} />
        <Route path="/mdp/campaigns" element={<CampaignsPage />} />
        <Route path="/mdp/channels" element={<ChannelsPage />} />
        <Route path="/mdp/funnel" element={<FunnelPage />} />
        <Route path="/mdp/ab-testing" element={<ABTestingPage />} />
        <Route path="/mdp/audience" element={<AudienceInsightsPage />} />
        <Route path="/mdp/profit" element={<ProfitAttributionPage />} />
        <Route path="/mdp/cash-impact" element={<CashImpactPage />} />
        <Route path="/mdp/risks" element={<RiskAlertsPage />} />
        <Route path="/mdp/decisions" element={<MDPDecisionSupportPage />} />
        <Route path="/mdp/budget-optimizer" element={<BudgetOptimizerPage />} />
        <Route path="/mdp/scenario-planner" element={<ScenarioPlannerPage />} />
        <Route path="/mdp/roi-analytics" element={<ROIAnalyticsPage />} />
        <Route path="/mdp/customer-ltv" element={<CustomerLTVPage />} />
        <Route path="/mdp/data-sources" element={<DataSourcesPage />} />
        <Route path="/mdp/data-readiness" element={<DataReadinessPage />} />
        <Route path="/mdp/docs" element={<MarketingModePage />} />
        <Route path="/mdp/settings" element={<MarketingModePage />} />
      </Route>
      
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

      {/* Tenant Operations Routes (FDP) */}
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
        <Route path="/exceptions" element={<ExceptionsPage />} />
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
        <Route path="/data-guide" element={<DataGuidePage />} />
        <Route path="/etl-rules" element={<ETLRulesPage />} />
        <Route path="/cash-forecast" element={<CashForecastPage />} />
        <Route path="/channel-analytics" element={<ChannelAnalyticsPage />} />
        <Route path="/channel/:channelId" element={<ChannelPLPage />} />
        <Route path="/channel/:channelId/whatif" element={<ChannelWhatIfPage />} />
        <Route path="/unit-economics" element={<UnitEconomicsPage />} />
        <Route path="/working-capital-hub" element={<WorkingCapitalHubPage />} />
        <Route path="/performance-analysis" element={<PerformanceAnalysisPage />} />
        {/* Legacy routes - redirect to new hubs */}
        <Route path="/cash-conversion-cycle" element={<Navigate to="/working-capital-hub" replace />} />
        <Route path="/working-capital" element={<Navigate to="/working-capital-hub" replace />} />
        <Route path="/budget-vs-actual" element={<Navigate to="/performance-analysis" replace />} />
        <Route path="/variance-analysis" element={<Navigate to="/performance-analysis" replace />} />
        <Route path="/rolling-forecast" element={<RollingForecastPage />} />
        <Route path="/covenant-tracking" element={<CovenantTrackingPage />} />
        <Route path="/board-reports" element={<BoardReportsPage />} />
        <Route path="/strategic-initiatives" element={<StrategicInitiativesPage />} />
        <Route path="/executive-summary" element={<ExecutiveSummaryPage />} />
        <Route path="/capital-allocation" element={<CapitalAllocationPage />} />
        <Route path="/decision-support" element={<DecisionSupportPage />} />
        <Route path="/risk-dashboard" element={<RiskDashboardPage />} />
        <Route path="/decision-center" element={<DecisionCenterPage />} />
        <Route path="/inventory-aging" element={<InventoryAgingPage />} />
        <Route path="/promotion-roi" element={<PromotionROIPage />} />
        <Route path="/supplier-payments" element={<SupplierPaymentsPage />} />
        <Route path="/cash-flow-direct" element={<CashFlowDirectPage />} />
        <Route path="/rbac" element={<RBACPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
        <Route path="/api" element={<APIPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        
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
        <GlobalErrorBoundary level="page">
          <LanguageProvider>
            <AuthProvider>
              <TenantProvider>
                <DateRangeProvider>
                  <CrashOverlay />
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
                </DateRangeProvider>
              </TenantProvider>
            </AuthProvider>
          </LanguageProvider>
        </GlobalErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
