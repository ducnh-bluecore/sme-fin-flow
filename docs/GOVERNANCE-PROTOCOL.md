# BLUECORE GOVERNANCE PROTOCOL

## Mục tiêu
Loại bỏ hoàn toàn regression bugs khi refactor hoặc fix lỗi.

## Nguyên tắc bất biến

### 1. KHÔNG SỬA GÌ MÀ KHÔNG BIẾT DEPENDENCY

Trước khi sửa bất kỳ:
- Database View: Phải query xem view nào phụ thuộc
- Database Function: Phải check view/trigger nào gọi function đó
- Hook: Phải search xem component nào dùng hook
- Component: Phải xác định parent/child relationships

### 2. PHẢI VERIFY OUTPUT SAU MỖI THAY ĐỔI

Sau mỗi migration hoặc code change:
```sql
-- Luôn chạy query này để verify view trả về đúng data
SELECT * FROM [affected_view] WHERE tenant_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
```

### 3. HEALTH CHECK TRƯỚC KHI KẾT THÚC

Trước khi kết thúc task, chạy governance dashboard:
- Mở ?governance=1 trên bất kỳ trang nào
- Tất cả checks phải PASS hoặc có lý do hợp lệ cho WARN

---

## Dependency Map - Critical Views

### CDP Module (Customer Data Platform)
```
cdp_customer_equity_computed (source table)
  └── v_cdp_equity_overview (aggregation)
       └── v_cdp_equity_snapshot (simplified view)
            └── useCDPEquitySnapshot hook
                 └── CustomerEquitySnapshot.tsx
                 └── EquityKPICards.tsx

cdp_orders (synced from external_orders)
  └── v_cdp_data_quality (data quality metrics)
       └── useCDPDataQuality hook
            └── DataQualityBadge.tsx
```

### FDP Module (Financial Data Platform)
```
external_orders + external_order_items (source tables)
  └── v_fdp_finance_summary (90-day aggregation)
       └── useFDPFinanceSSOT hook
            └── FDPDashboard.tsx

external_orders + invoices + bills
  └── get_fdp_period_summary (RPC - dynamic date range)
       └── useFDPPeriodSummary hook
            └── PeriodComparisonCard.tsx

central_metrics_snapshots (pre-computed CFO metrics)
  └── useFinanceTruthSnapshot hook
       └── FinanceSummaryCard.tsx
       └── CashflowChart.tsx
       └── ExecutiveSummaryPage.tsx
```

### MDP Module (Marketing Data Platform)
```
promotion_campaigns (source table)
  └── v_mdp_campaign_performance (campaign-level metrics)
       └── useMDPSSOT hook
            └── CampaignsPage.tsx
            └── ROIAnalyticsPage.tsx

  └── v_mdp_mode_summary (top-level KPIs)
       └── useMDPDataSSOT hook
            └── MarketingModePage.tsx

  └── v_mdp_funnel_summary (funnel stages)
       └── useMDPDataSSOT hook
            └── FunnelPage.tsx
```

### Control Tower Module
```
early_warning_alerts (source table)
  └── v_active_alerts_hierarchy (prioritized alerts)
       └── useControlTowerSSOT hook
            └── AlertGrid.tsx
            └── AlertStream.tsx

external_orders
  └── get_control_tower_summary (RPC - real-time dashboard)
       └── useControlTowerSSOT hook
            └── ControlTowerCEO.tsx
            └── ControlTowerDashboard.tsx

decision_cards (source table)
  └── useDecisionCards hook
       └── DecisionQueueView.tsx
       └── StrategicDecisionCard.tsx
```

---

## Pre-Change Checklist

### Trước khi sửa Database View
- [ ] Đã query CASCADE dependencies: `SELECT * FROM pg_depend WHERE ...`
- [ ] Đã list tất cả hooks sử dụng view này
- [ ] Đã backup current output để compare

### Trước khi sửa Hook
- [ ] Đã search tất cả components import hook này
- [ ] Đã verify return type không thay đổi
- [ ] Đã test với edge cases (null, empty array, error)

### Trước khi sửa Component
- [ ] Đã xác định props interface không thay đổi
- [ ] Đã test cả loading và data states
- [ ] Đã verify parent components không bị ảnh hưởng

---

## Post-Change Validation

### 1. Database Changes - Full Module Verification
```sql
-- Chạy sau mỗi migration để verify TẤT CẢ modules
WITH health_checks AS (
  -- CDP
  SELECT 'CDP: v_cdp_equity_snapshot' as check_name, 
         CASE WHEN total_equity_12m IS NOT NULL THEN 'PASS' ELSE 'FAIL' END as status
  FROM v_cdp_equity_snapshot LIMIT 1
  
  UNION ALL
  
  SELECT 'CDP: v_cdp_data_quality', 
         CASE WHEN confidence_level IS NOT NULL THEN 'PASS' ELSE 'WARN' END
  FROM v_cdp_data_quality LIMIT 1
  
  UNION ALL
  
  -- FDP
  SELECT 'FDP: v_fdp_finance_summary', 
         CASE WHEN net_revenue > 0 THEN 'PASS' ELSE 'WARN' END
  FROM v_fdp_finance_summary LIMIT 1
  
  UNION ALL
  
  SELECT 'FDP: central_metrics_snapshots', 
         CASE WHEN snapshot_at > NOW() - INTERVAL '24 hours' THEN 'PASS' ELSE 'WARN' END
  FROM central_metrics_snapshots ORDER BY snapshot_at DESC LIMIT 1
  
  UNION ALL
  
  -- MDP
  SELECT 'MDP: v_mdp_campaign_performance', 
         CASE WHEN campaign_id IS NOT NULL THEN 'PASS' ELSE 'WARN' END
  FROM v_mdp_campaign_performance LIMIT 1
  
  UNION ALL
  
  SELECT 'MDP: v_mdp_mode_summary', 
         CASE WHEN total_spend IS NOT NULL THEN 'PASS' ELSE 'WARN' END
  FROM v_mdp_mode_summary LIMIT 1
)
SELECT * FROM health_checks;
```

### 2. Frontend Changes
- Mở page bị ảnh hưởng
- Check console không có errors mới
- Verify data hiển thị đúng (không phải 0, null, hoặc loading vô hạn)

### 3. Full System Check - Governance Dashboard
- Thêm `?governance=1` vào URL
- **TẤT CẢ 12 health checks phải PASS:**
  - CDP: Equity Snapshot, Data Quality
  - FDP: Finance Summary, Period Summary RPC, Central Snapshots
  - MDP: Campaign Performance, Mode Summary, Funnel Summary
  - Control Tower: Summary RPC, Decision Cards, Early Warning Alerts

---

## Emergency Rollback

Nếu phát hiện regression sau khi deploy:

1. **Không sửa tiếp** - rollback trước
2. Dùng History tab để restore version trước
3. Phân tích root cause trên branch riêng
4. Tạo fix với đầy đủ test coverage

---

## Monitoring Alerts

Cần setup (TODO):
- [ ] Slack/Discord webhook khi health check FAIL
- [ ] Daily automated regression scan
- [ ] Metric drift detection (value changes >20%)

---

## Version History

| Date | Change | Impact |
|------|--------|--------|
| 2025-01-25 | Extended Governance to FDP, MDP, Control Tower | 12 critical health checks now monitored |
| 2025-01-25 | Fixed v_cdp_equity_overview to filter by non-null equity | Restored 149M equity display |
| 2025-01-25 | Created SSOT Governance Dashboard | Enables proactive monitoring |

---

## Health Check Reference

### CDP Module (2 checks)
| Check | View/Table | Expected |
|-------|------------|----------|
| CDP Equity Snapshot | v_cdp_equity_snapshot | total_equity_12m > 0 khi có equity data |
| CDP Data Quality | v_cdp_data_quality | confidence_level NOT NULL |

### FDP Module (3 checks)
| Check | View/RPC | Expected |
|-------|----------|----------|
| FDP Finance Summary | v_fdp_finance_summary | net_revenue > 0 khi có delivered orders |
| FDP Period Summary | get_fdp_period_summary | totalRevenue > 0 trong date range |
| Central Snapshots | central_metrics_snapshots | snapshot_at < 24h ago |

### MDP Module (3 checks)
| Check | View | Expected |
|-------|------|----------|
| Campaign Performance | v_mdp_campaign_performance | campaigns hiển thị khi có data |
| Mode Summary | v_mdp_mode_summary | total_spend NOT NULL |
| Funnel Summary | v_mdp_funnel_summary | orders > 0 khi có campaigns |

### Control Tower (3 checks)
| Check | View/RPC | Expected |
|-------|----------|----------|
| Summary RPC | get_control_tower_summary | totalRevenue > 0 |
| Decision Cards | decision_cards | table accessible |
| Early Warning Alerts | early_warning_alerts | table accessible |
