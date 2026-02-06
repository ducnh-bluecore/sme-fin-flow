# Hooks Layer Audit Report
## Schema-per-Tenant v1.4.1

**Generated**: 2026-02-06  
**Total Hooks Analyzed**: ~180 files

---

## 📐 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONTROL PLANE                                      │
│                    (Platform Schema - public)                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Auth & Identity        │ Tenant Management    │ Platform Config          ││
│  │ • useAuth              │ • useTenant          │ • usePlatformModules     ││
│  │ • useActiveTenantId    │ • useTenantSession   │ • usePlatformPlans       ││
│  │ • useIsSuperAdmin      │ • useTenantSchemaStatus│ • usePlatformData      ││
│  │ • useAuthRedirect      │ • useTenantHealth    │ • useTenantModules       ││
│  │ • useImpersonation     │ • useActivityTracker │                          ││
│  │ • useOnboardingStatus  │ • useCSAlertsSummary │                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                    ↓ Uses: supabase (direct) ↓                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA PLANE                                        │
│                   (Tenant Schemas - tenant_{id})                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ FDP (Finance)          │ MDP (Marketing)      │ CDP (Customer)           ││
│  │ • usePLData            │ • useMDPSSOT         │ • useCDPEquity           ││
│  │ • useBankData          │ • useUnifiedChannel  │ • useCDPOverview         ││
│  │ • useInvoiceData       │ • useChannelBudgets  │ • useCDPSegmentLTV       ││
│  │ • useBillsData         │ • useChannelPLSSOT   │ • useCDPLTVEngine        ││
│  │ • useExpenseBaselines  │ • useMDPCEOSnapshot  │ • useCDPPopulations      ││
│  │ • useCashFlowDirect    │ • useMDPChannelROI   │ • useCDPCohortCAC        ││
│  │ • useReconciliation    │ • useMDPDecisionSig  │ • useCDPCreditRisk       ││
│  │ • useWorkingCapital    │                      │                          ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ Control Tower (L4)     │ Cross-Module         │ Ingestion & KPI          ││
│  │ • useAlertInstances    │ • useFDPLockedCosts  │ • useIngestionBatches    ││
│  │ • useDecisionCards     │ • useMDPAttribution  │ • useDataWatermarks      ││
│  │ • useOutcomeRecording  │ • useCDPRevenueAlloc │ • useKPIDefinitions      ││
│  │ • usePendingFollowups  │ • useCrossModuleVar  │ • useKPITargets          ││
│  │ • useDecisionEffective │                      │                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                ↓ Uses: useTenantQueryBuilder ↓                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏛️ CONTROL PLANE HOOKS (17 files)
> Uses direct `supabase` client. Tables in `public` schema.

### Auth & Identity (6 hooks)
| Hook | Purpose | Tables/RPCs |
|------|---------|-------------|
| `useAuth.tsx` | Authentication state | `auth.users`, session |
| `useActiveTenantId.ts` | Get current tenant | `profiles.active_tenant_id` |
| `useIsSuperAdmin.ts` | Check super admin role | `user_roles` |
| `useAuthRedirect.ts` | Post-login routing | `profiles`, `user_roles` |
| `useImpersonation.ts` | Admin impersonation | `profiles`, `tenants` |
| `useOnboardingStatus.ts` | Onboarding state | `profiles`, `tenants` |

### Tenant Management (6 hooks)
| Hook | Purpose | Tables/RPCs |
|------|---------|-------------|
| `useTenant.ts` | Tenant CRUD | `tenants`, `tenant_users` |
| `useTenantSession.ts` | Session initialization | RPC: `init_tenant_session` |
| `useTenantSchemaStatus.ts` | Schema provisioning | RPC: `is_tenant_schema_provisioned` |
| `useTenantHealth.ts` | CS monitoring | `cs_alerts`, `tenant_events` |
| `useActivityTracker.ts` | Event tracking | RPC: `track_tenant_event` |
| `useCSAlertsSummary.ts` | CS dashboard (cross-tenant) | RPC: `get_cs_alerts_summary` |

### Platform Config (5 hooks)
| Hook | Purpose | Tables/RPCs |
|------|---------|-------------|
| `usePlatformModules.ts` | Module definitions | `platform_modules` |
| `usePlatformPlans.ts` | Pricing/plans | `platform_plans` |
| `usePlatformData.ts` | AI/KPI templates | `ai_metric_definitions`, `kpi_templates` |
| `useTenantModules.ts` | Module assignments | `tenant_modules` |
| `useCapacitorPushNotifications.ts` | Device tokens | `push_subscriptions` |

---

## 📊 DATA PLANE HOOKS (~154 files)
> Uses `useTenantQueryBuilder`. Tables in tenant schema.

### FDP - Financial Data Platform (45+ hooks)

#### Core Finance
| Hook | Purpose | Tables |
|------|---------|--------|
| `usePLData.ts` | P&L statements | `v_pl_summary`, `v_pl_daily` |
| `useBankData.ts` | Bank accounts/transactions | `bank_accounts`, `bank_transactions` |
| `useInvoiceData.ts` | AR management | `invoices`, `invoice_items` |
| `useBillsData.ts` | AP management | `bills`, `bill_items` |
| `useExpenseBaselines.ts` | Fixed costs | `expense_baselines` |
| `useExpensesDaily.ts` | Daily expenses | `finance_expenses_daily` |
| `useCashFlowDirect.ts` | Cash flow | `cash_flow_direct` |
| `useWorkingCapitalDaily.ts` | Working capital | `finance_working_capital_daily` |
| `useCashRunway.ts` | Runway calculation | `v_cash_runway` |
| `useFDPFinanceSSOT.ts` | Finance SSOT | `central_metrics_snapshots` |
| `useFinanceTruthSnapshot.ts` | Truth snapshot | `central_metrics_snapshots` |

#### Reconciliation & Analysis
| Hook | Purpose | Tables |
|------|---------|--------|
| `useReconciliation.ts` | Bank rec | `reconciliation_sessions` |
| `useReconciliationSSOT.ts` | Rec SSOT | `v_reconciliation_*` |
| `useGLAccounts.ts` | Chart of accounts | `gl_accounts` |
| `useVarianceAnalysis.ts` | Variance | `variance_analysis` |
| `useCovenantTracking.ts` | Covenant compliance | `covenant_tracking` |
| `useInvestorDisclosure.ts` | Investor reports | `investor_disclosures` |

### MDP - Marketing Data Platform (25+ hooks)

| Hook | Purpose | Tables |
|------|---------|--------|
| `useMDPSSOT.ts` | Marketing SSOT | `v_mdp_*`, `decision_cards` |
| `useMDPDataSSOT.ts` | Data layer | `marketing_expenses`, `channel_analytics` |
| `useMDPCEOSnapshot.ts` | Executive view | `v_mdp_ceo_snapshot` |
| `useUnifiedChannelMetrics.ts` | Channel metrics | `v_unified_channel_metrics` |
| `useChannelBudgets.ts` | Budget management | `channel_budgets` |
| `useChannelPLSSOT.ts` | Channel P&L | `v_channel_pl_ssot` |
| `useMDPDecisionSignals.ts` | Decision cards | `decision_cards` |
| `usePromotions.ts` | Campaigns | `promotion_campaigns` |
| `usePlatformAdsData.ts` | Ad spend | `ad_spend_daily` |
| `useChannelAnalytics.ts` | Analytics | `channel_analytics` |

### CDP - Customer Data Platform (30+ hooks)

| Hook | Purpose | Tables |
|------|---------|--------|
| `useCDPEquity.ts` | Customer equity | `v_cdp_equity_*` |
| `useCDPOverview.ts` | Overview stats | `v_cdp_overview` |
| `useCDPLTVEngine.ts` | LTV calculation | `cdp_ltv_rules`, `v_cdp_ltv_*` |
| `useCDPSegmentLTV.ts` | Segment LTV | `v_cdp_segment_ltv` |
| `useCDPPopulations.ts` | Population tracking | `cdp_population_snapshots` |
| `useCDPTierData.ts` | Customer tiers | `v_cdp_tier_*` |
| `useCDPInsightRegistry.ts` | Insight config | `cdp_insight_registry` |
| `useCDPInsightFeed.ts` | Insight events | `cdp_insight_events` |
| `useCDPScenarios.ts` | What-if | `cdp_scenarios` |
| `useCDPExplore.ts` | Customer explore | `master_customers` |

### Control Tower - Layer 4 (15+ hooks)

| Hook | Purpose | Tables |
|------|---------|--------|
| `useAlertInstances.ts` | Alert CRUD | `alert_instances` |
| `useAlertSettings.ts` | Alert config | `extended_alert_configs` |
| `useDecisionCards.ts` | Decision cards | `decision_cards` |
| `usePendingDecisions.ts` | Pending items | `decision_cards` (status=pending) |
| `useOutcomeRecording.ts` | Record outcomes | `decision_outcomes` |
| `useDecisionEffectiveness.ts` | Effectiveness | `v_decision_effectiveness` |
| `usePendingFollowups.ts` | Follow-ups | `v_decision_pending_followup` |
| `useLearningInsights.ts` | ML insights | `decision_learning_patterns` |
| `useControlTowerSSOT.ts` | Tower SSOT | RPC: aggregated metrics |

### Cross-Module Bridge (14 hooks)

| Hook | Source → Target | Purpose |
|------|-----------------|---------|
| `useFDPLockedCosts.ts` | FDP → MDP | Cost data for ROAS |
| `useMDPAttributionPush.ts` | MDP → CDP | Attribution for CAC |
| `useCDPCohortCAC.ts` | MDP → CDP | CAC by cohort |
| `useCDPRevenueAllocation.ts` | CDP → FDP | Equity to forecast |
| `useCDPCreditRisk.ts` | FDP → CDP | AR aging to risk |
| `useCDPSegmentLTV.ts` | CDP ← FDP | Segment LTV |
| `useMDPChannelROI.ts` | MDP → FDP | Channel ROI |
| `useFDPActualRevenue.ts` | FDP → CDP | Actual revenue |
| `useMDPSeasonalPatterns.ts` | MDP | Seasonality |
| `useCDPChurnSignals.ts` | CDP | Churn prediction |
| `useControlTowerPriorityQueue.ts` | CT | Alert priority |
| `useCrossModuleVarianceAlerts.ts` | All | Cross-module alerts |
| `useMDPAcquisitionSource.ts` | MDP → CDP | Acquisition source |

### Ingestion & KPI (5 hooks)

| Hook | Purpose | Tables |
|------|---------|--------|
| `useIngestionBatches.ts` | Batch tracking | `ingestion_batches` |
| `useDataWatermarks.ts` | Watermarks | `data_watermarks` |
| `useKPIDefinitions.ts` | KPI definitions | `kpi_fact_definitions` |
| `useKPITargets.ts` | KPI targets | `kpi_targets` |

---

## ⚠️ DEPRECATED HOOKS (12 files)
> Kept for backward compatibility. Should NOT be used in new code.

| Hook | Replacement | Reason |
|------|-------------|--------|
| `useFDPMetrics.ts` | `useFDPFinanceSSOT` | Client-side computation |
| `useMDPData.ts` | `useMDPSSOT` | Client-side computation |
| `useFDPAggregatedMetrics.ts` | `useFDPAggregatedMetricsSSOT` | Wrapper only |
| `useKPIData.ts` | `useFinanceTruthSnapshot` | Legacy shape |
| `useFinancialMetrics.ts` | `useCentralFinancialMetrics` | Wrapper only |
| `useCentralFinancialMetrics.ts` | `useFinanceTruthSnapshot` | Legacy shape |
| `useMarketingProfitability.ts` | `useFDPMetrics` | Wrapper only |
| `useChannelPL.ts` | `useChannelPLSSOT` | Old pattern |
| `useMarketingDecisionEngine.ts` | `useMDPDecisionSignals` | Frontend logic |

---

## 📈 Statistics

| Layer | Count | Pattern |
|-------|-------|---------|
| Control Plane | 17 | `supabase` (direct) |
| Data Plane | ~154 | `useTenantQueryBuilder` |
| Deprecated | 12 | Legacy wrappers |
| **Total** | **~183** | |

### Coverage
- **Data Plane hooks using `useTenantQueryBuilder`**: 100%
- **Control Plane hooks properly annotated**: 100%
- **Deprecated hooks marked**: 100%

---

## 🔒 Security Model

```
Control Plane:
├── Public schema tables (profiles, tenants, platform_*)
├── Cross-tenant RPCs (get_cs_alerts_summary, check_tenant_schema_status)
└── Auth operations (no tenant filter needed)

Data Plane:
├── Tenant schema tables (auto-routed via search_path)
├── tenant_id filter auto-applied (shared schema mode)
└── RLS policies enforce row-level access
```
