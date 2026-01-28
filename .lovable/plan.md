

# CONTROL TOWER - FULL REBUILD (Option A)

## PHASE 1: CLEANUP - Xóa toàn bộ code cũ

### Files sẽ xóa (11 pages):
- `src/pages/control-tower/TasksPage.tsx`
- `src/pages/control-tower/AlertsPage.tsx`
- `src/pages/control-tower/KPINotificationRulesPage.tsx`
- `src/pages/control-tower/TeamPage.tsx`
- `src/pages/control-tower/SettingsPage.tsx`
- `src/pages/control-tower/SituationRoomPage.tsx`
- `src/pages/control-tower/DecisionsPage.tsx`
- `src/pages/control-tower/BoardViewPage.tsx`
- `src/pages/control-tower/CEOControlTowerPage.tsx`
- `src/pages/control-tower/COOControlTowerPage.tsx`
- `src/pages/control-tower/CommandCenterPage.tsx`

### Folders sẽ xóa:
- `src/components/control-tower/pulse/`
- `src/components/control-tower/heatmap/`
- `src/components/control-tower/timer/`
- `src/components/control-tower/ai/`
- `src/components/control-tower/outcomes/`
- `src/components/control-tower/cascade/`
- `src/components/control-tower/ceo/`
- `src/components/control-tower/coo/`

### Giữ lại:
- Database schema (tables, views, RPCs)
- `src/hooks/control-tower/` (refactor later)

---

## PHASE 2: NEW LAYOUT

### ControlTowerLayout.tsx (Rebuild)
```text
Navigation: 6 items
├── Command (default) - Activity icon
├── Signals - Layers icon  
├── Variance - GitCompare icon
├── Queue - ListTodo icon
├── Outcomes - Target icon
└── Settings - Settings icon
```

---

## PHASE 3: BUILD 6 VIEWS

### View 1: CommandPage (Default)
- SystemPulse component (overall health indicator)
- ModuleHealthSummary (FDP/MDP/CDP cards)
- CriticalAlertsList (max 7 items)
- ExposureFooter (total risk amount)

### View 2: SignalsPage
- Tab navigation: FDP | MDP | CDP
- SignalsTable per module
- Filters: Status, Severity, Owner

### View 3: VariancePage
- VarianceTable (cross-module mismatches)
- CascadeFlow visualization
- Variance alerts list

### View 4: QueuePage
- OwnerCards (CEO/CFO/CMO/COO workload)
- QueueList grouped by status
- AssignmentDialog for reassignment

### View 5: OutcomesPage
- OutcomeSummary (resolved count, success rate, saved amount)
- OutcomesTable (predicted vs actual)
- Period filter

### View 6: SettingsPage
- EscalationRules config
- ThresholdsConfig
- TeamManagement

---

## PHASE 4: HOOKS REFACTOR

### New hooks structure:
- `useCommandData.ts` - Aggregate data for Command view
- `useModuleSignals.ts` - FDP/MDP/CDP signals
- `useVarianceMonitor.ts` - Cross-module variance
- `useExecutionQueue.ts` - Queue assignments
- `useOutcomeAnalysis.ts` - Outcomes data
- `useControlTowerSettings.ts` - Settings management

---

## PHASE 5: ROUTING UPDATE

```typescript
/control-tower → redirect to /control-tower/command
/control-tower/command → CommandPage
/control-tower/signals → SignalsPage
/control-tower/variance → VariancePage
/control-tower/queue → QueuePage
/control-tower/outcomes → OutcomesPage
/control-tower/settings → SettingsPage
```

---

## IMPLEMENTATION ORDER

1. **Step 1**: Delete all old files
2. **Step 2**: Rebuild ControlTowerLayout với 6 nav items
3. **Step 3**: Create shared components (DecisionCard, ModuleBadge, etc.)
4. **Step 4**: Build CommandPage (View 1)
5. **Step 5**: Build SignalsPage (View 2)
6. **Step 6**: Build VariancePage (View 3)
7. **Step 7**: Build QueuePage (View 4)
8. **Step 8**: Build OutcomesPage (View 5)
9. **Step 9**: Build SettingsPage (View 6)
10. **Step 10**: Update App.tsx routes
11. **Step 11**: Refactor hooks
12. **Step 12**: Testing & polish

---

## KẾT QUẢ SAU REBUILD

- 6 pages thay vì 11 pages
- Navigation rõ ràng, không chồng chéo
- Theo đúng Decision OS philosophy
- Cover đầy đủ 30+ decision types từ FDP/MDP/CDP
- Cross-module variance monitoring
- Team assignment tracking
- Outcome analysis

