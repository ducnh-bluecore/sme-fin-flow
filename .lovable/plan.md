# BLUECORE ARCHITECTURE FIX PLAN
## Roadmap Sửa lỗi Kiến trúc FDP-MDP-CDP-Control Tower

**Phiên bản:** 2.0  
**Ngày tạo:** 28/01/2026  
**Trạng thái:** Planning

---

## 📋 TỔNG QUAN

### Mục tiêu
Sửa tất cả các tồn tại được xác định trong rà soát kiến trúc để đạt:
- 100% SSOT compliance
- 0 business logic trong frontend hooks
- Cross-module integration hoàn chỉnh

### Timeline: 6 Tuần

---

## 🔴 PHASE 1: CRITICAL FIXES (Week 1)

### Task 1.1: Fix Metric Registry - External Orders Reference
**Priority:** 🔴 HIGH  
**Module:** FDP  
**Status:** [ ] TODO

**Vấn đề:**
- `src/lib/metric-registry.ts` đang reference `external_orders` thay vì `cdp_orders`

**Giải pháp:**
- [ ] Đọc và audit `metric-registry.ts`
- [ ] Update tất cả references từ `external_orders` → `cdp_orders`
- [ ] Verify với ESLint rule không còn vi phạm

**Files cần sửa:**
- `src/lib/metric-registry.ts`

---

### Task 1.2: Migrate MDP Decision Logic to Database
**Priority:** 🔴 HIGH  
**Module:** MDP  
**Status:** [ ] TODO

**Vấn đề:**
- `useMarketingDecisionEngine.ts` chứa hardcoded business rules
- Thresholds `MDP_V2_THRESHOLDS` trong frontend

**Giải pháp:**
- [ ] Tạo view `v_mdp_decision_signals` trong database
- [ ] Migrate logic KILL/PAUSE/SCALE/MONITOR sang SQL
- [ ] Refactor hook thành thin wrapper
- [ ] Tạo table `mdp_config` cho configurable thresholds

**Database Migration:**
```sql
-- View cho decision signals
CREATE OR REPLACE VIEW v_mdp_decision_signals AS
SELECT 
  campaign_id,
  campaign_name,
  profit_roas,
  cm_percent,
  cash_conversion_rate,
  consecutive_negative_days,
  CASE 
    WHEN profit_roas < 0 AND consecutive_negative_days >= 3 THEN 'KILL'
    WHEN cash_conversion_rate < 0.5 THEN 'PAUSE'
    WHEN cm_percent < -0.1 THEN 'KILL'
    WHEN cm_percent >= 0.15 AND cash_conversion_rate >= 0.7 THEN 'SCALE'
    ELSE 'MONITOR'
  END AS recommended_action,
  CASE 
    WHEN profit_roas < 0 THEN 'critical'
    WHEN cm_percent < 0 THEN 'warning'
    ELSE 'info'
  END AS severity
FROM v_mdp_campaign_performance;

-- Config table cho thresholds
CREATE TABLE mdp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  config_key text NOT NULL,
  config_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, config_key)
);

-- Default thresholds
INSERT INTO mdp_config (tenant_id, config_key, config_value) VALUES
  ('{{tenant_id}}', 'decision_thresholds', '{
    "kill_roas_threshold": 0,
    "kill_cm_threshold": -0.1,
    "pause_cash_conversion": 0.5,
    "scale_cm_threshold": 0.15,
    "scale_cash_conversion": 0.7,
    "consecutive_days_for_kill": 3
  }');
```

**Files cần sửa:**
- `src/hooks/useMarketingDecisionEngine.ts` → Thin wrapper
- `src/types/mdp-v2.ts` → Remove hardcoded thresholds

---

### Task 1.3: Move Control Tower Escalation to Database
**Priority:** 🔴 HIGH  
**Module:** Control Tower  
**Status:** [ ] TODO

**Vấn đề:**
- `shouldEscalate` logic trong frontend hook

**Giải pháp:**
- [ ] Tạo trigger `auto_escalate_alerts`
- [ ] Tạo table `escalations` để track
- [ ] Refactor hook để chỉ fetch escalation status

**Database Migration:**
```sql
-- Escalations table
CREATE TABLE escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  alert_id uuid NOT NULL REFERENCES alert_instances(id),
  escalate_to text NOT NULL, -- 'CEO', 'CFO', 'COO'
  escalated_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid
);

-- Auto-escalation function
CREATE OR REPLACE FUNCTION auto_escalate_alerts() 
RETURNS trigger AS $$
DECLARE
  age_hours numeric;
BEGIN
  age_hours := EXTRACT(EPOCH FROM (now() - NEW.created_at)) / 3600;
  
  -- Critical alerts > 24h → CEO
  IF NEW.severity = 'critical' AND age_hours > 24 AND NEW.status = 'open' THEN
    INSERT INTO escalations (tenant_id, alert_id, escalate_to)
    VALUES (NEW.tenant_id, NEW.id, 'CEO')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Warning alerts > 48h → CFO
  IF NEW.severity = 'warning' AND age_hours > 48 AND NEW.status = 'open' THEN
    INSERT INTO escalations (tenant_id, alert_id, escalate_to)
    VALUES (NEW.tenant_id, NEW.id, 'CFO')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trigger_auto_escalate
  AFTER INSERT OR UPDATE ON alert_instances
  FOR EACH ROW
  EXECUTE FUNCTION auto_escalate_alerts();
```

**Files cần sửa:**
- `src/hooks/useAlertEscalation.ts` → Thin wrapper

---

## 🟡 PHASE 2: CROSS-MODULE INTEGRATION (Week 2-3)

### Task 2.1: Complete AR → Credit Risk Flow (Case 8)
**Priority:** 🟡 MEDIUM  
**Module:** FDP → CDP  
**Status:** [ ] TODO

**Vấn đề:**
- Customer ID join không đúng giữa `invoices` và `cdp_customers`

**Giải pháp:**
- [ ] Fix `fdp_push_ar_to_cdp` để join qua `external_id`
- [ ] Verify credit_risk scores được update đúng

**Database Migration:**
```sql
CREATE OR REPLACE FUNCTION fdp_push_ar_to_cdp(p_tenant_id uuid)
RETURNS void AS $$
BEGIN
  -- Update credit risk based on AR aging
  INSERT INTO cdp_customer_credit_risk (tenant_id, customer_id, risk_score, ar_overdue_amount, last_calculated_at)
  SELECT 
    i.tenant_id,
    c.id as customer_id,
    CASE 
      WHEN SUM(CASE WHEN age_days > 90 THEN remaining_amount ELSE 0 END) > 0 THEN 'high'
      WHEN SUM(CASE WHEN age_days > 60 THEN remaining_amount ELSE 0 END) > 0 THEN 'medium'
      WHEN SUM(CASE WHEN age_days > 30 THEN remaining_amount ELSE 0 END) > 0 THEN 'low'
      ELSE 'minimal'
    END as risk_score,
    SUM(CASE WHEN age_days > 30 THEN remaining_amount ELSE 0 END) as ar_overdue_amount,
    now()
  FROM ar_aging i
  JOIN cdp_customers c ON c.external_id = i.customer_id::text AND c.tenant_id = i.tenant_id
  WHERE i.tenant_id = p_tenant_id
  GROUP BY i.tenant_id, c.id
  ON CONFLICT (tenant_id, customer_id) 
  DO UPDATE SET
    risk_score = EXCLUDED.risk_score,
    ar_overdue_amount = EXCLUDED.ar_overdue_amount,
    last_calculated_at = now();
END;
$$ LANGUAGE plpgsql;
```

---

### Task 2.2: Implement Seasonal Pattern Sync (Case 9)
**Priority:** 🟡 MEDIUM  
**Module:** MDP → FDP  
**Status:** [ ] TODO

**Vấn đề:**
- Seasonal patterns từ MDP chưa được sync sang FDP forecast

**Giải pháp:**
- [ ] Tạo table `seasonal_patterns` 
- [ ] Tạo RPC `mdp_push_seasonal_to_fdp`
- [ ] Update Cash Forecast logic để sử dụng patterns

**Database Migration:**
```sql
CREATE TABLE seasonal_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  source_module text NOT NULL, -- 'MDP', 'CDP'
  pattern_type text NOT NULL, -- 'monthly', 'weekly', 'quarterly'
  month int, -- 1-12 for monthly
  week int, -- 1-52 for weekly
  multiplier numeric NOT NULL DEFAULT 1.0,
  confidence numeric DEFAULT 0.7,
  sample_size int,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, source_module, pattern_type, month, week)
);

CREATE OR REPLACE FUNCTION mdp_push_seasonal_to_fdp(p_tenant_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO seasonal_patterns (tenant_id, source_module, pattern_type, month, multiplier, sample_size)
  SELECT 
    tenant_id,
    'MDP',
    'monthly',
    EXTRACT(MONTH FROM order_date)::int,
    SUM(gross_revenue) / NULLIF(AVG(SUM(gross_revenue)) OVER (), 0),
    COUNT(*)
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_date >= now() - interval '2 years'
  GROUP BY tenant_id, EXTRACT(MONTH FROM order_date)
  ON CONFLICT (tenant_id, source_module, pattern_type, month, week) 
  DO UPDATE SET 
    multiplier = EXCLUDED.multiplier,
    sample_size = EXCLUDED.sample_size;
END;
$$ LANGUAGE plpgsql;
```

---

### Task 2.3: Channel ROI → Budget Reallocation (Case 10)
**Priority:** 🟡 MEDIUM  
**Module:** MDP → FDP  
**Status:** [ ] TODO

**Vấn đề:**
- Channel ROI chưa trigger budget reallocation suggestions

**Giải pháp:**
- [ ] Tạo view `v_budget_reallocation_suggestions`
- [ ] Integrate với Control Tower decision cards

---

## 🟢 PHASE 3: AUTOMATION & TRIGGERS (Week 4)

### Task 3.1: Schedule Cross-Module Daily Sync
**Priority:** 🟢 MEDIUM  
**Module:** Cross-Module  
**Status:** [ ] TODO

**Giải pháp:**
- [ ] Verify `cross_module_run_daily_sync` function
- [ ] Add to pg_cron schedule

```sql
SELECT cron.schedule(
  'cross-module-daily-sync',
  '0 4 * * *',  -- 04:00 daily (after all module builds)
  $$SELECT cross_module_run_daily_sync()$$
);
```

---

### Task 3.2: Alert Clustering Implementation
**Priority:** 🟢 MEDIUM  
**Module:** Control Tower  
**Status:** [ ] TODO

**Giải pháp:**
- [ ] Tạo table `alert_clusters`
- [ ] Tạo function `cluster_related_alerts`
- [ ] Update UI để show clustered alerts

---

### Task 3.3: Variance Auto-Dispatch
**Priority:** 🟢 MEDIUM  
**Module:** Control Tower  
**Status:** [ ] TODO

**Giải pháp:**
- [ ] Tạo trigger sau `detect_cross_domain_variance`
- [ ] Auto-create decision cards cho relevant module

---

## 🔵 PHASE 4: CONFIGURATION TABLE (Week 5)

### Task 4.1: Cross-Module Config Table
**Priority:** 🔵 LOW  
**Module:** Cross-Module  
**Status:** [ ] TODO

**Database Migration:**
```sql
CREATE TABLE cross_module_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  config_key text NOT NULL,
  config_value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, config_key)
);

-- Default configs
INSERT INTO cross_module_config (tenant_id, config_key, config_value, description) VALUES
  ('{{tenant_id}}', 'variance_threshold', '{"default": 0.10, "critical": 0.20}', 'Threshold để trigger variance alert'),
  ('{{tenant_id}}', 'cost_fallback', '{"cogs_percent": 0.55, "fee_percent": 0.20}', 'Fallback costs khi không có actual'),
  ('{{tenant_id}}', 'escalation_hours', '{"critical": 24, "warning": 48}', 'Giờ trước khi auto-escalate'),
  ('{{tenant_id}}', 'sync_schedule', '{"daily_build": "02:00", "cross_sync": "04:00"}', 'Schedule cho sync jobs');
```

---

### Task 4.2: LTV Auto-Seed Assumptions
**Priority:** 🔵 LOW  
**Module:** CDP  
**Status:** [ ] TODO

**Giải pháp:**
- [ ] Tạo default assumptions per industry
- [ ] Auto-seed khi tenant mới được tạo

---

## 🟣 PHASE 5: CASH FORECAST MIGRATION (Week 5-6)

### Task 5.1: Migrate Forecast Logic to RPC
**Priority:** 🟡 MEDIUM  
**Module:** FDP  
**Status:** [ ] TODO

**Vấn đề:**
- `useForecastInputs.ts` có `generateForecast()` logic trong frontend

**Giải pháp:**
- [ ] Tạo RPC `generate_cash_forecast`
- [ ] Move AR collection probability logic sang DB
- [ ] Move T+14 settlement logic sang DB
- [ ] Refactor hook thành thin wrapper

---

## 🟤 PHASE 6: UI POLISH & GOVERNANCE (Week 6)

### Task 6.1: Insight Dismiss/Snooze UI
**Priority:** 🔵 LOW  
**Module:** CDP  
**Status:** [ ] TODO

---

### Task 6.2: Resolution Workflow UI
**Priority:** 🔵 LOW  
**Module:** Control Tower  
**Status:** [ ] TODO

---

### Task 6.3: Governance Dashboard Enhancement
**Priority:** 🔵 LOW  
**Module:** All  
**Status:** [ ] TODO

---

## ✅ ACCEPTANCE CRITERIA

### Phase 1 Complete When:
- [ ] ESLint shows 0 `external_orders` violations
- [ ] `useMarketingDecisionEngine` chỉ fetch, không compute
- [ ] Escalation happens via DB trigger, không frontend

### Phase 2 Complete When:
- [ ] Credit Risk scores update từ AR aging
- [ ] Seasonal patterns available trong FDP forecast
- [ ] Budget suggestions generated từ Channel ROI

### Phase 3 Complete When:
- [ ] Daily sync runs automatically at 04:00
- [ ] Alerts được cluster và hiển thị grouped
- [ ] Variance tự động tạo decision cards

### Phase 4 Complete When:
- [ ] Tất cả thresholds configurable từ DB
- [ ] New tenants có auto-seeded LTV assumptions

### Phase 5 Complete When:
- [ ] Cash forecast 100% từ RPC
- [ ] `useForecastInputs` chỉ là thin wrapper

### Phase 6 Complete When:
- [ ] Insights có dismiss/snooze buttons
- [ ] Alerts có resolution workflow
- [ ] Governance dashboard shows all health metrics

---

## 📊 METRICS TRACKING

| Metric | Current | Target |
|--------|---------|--------|
| FDP SSOT % | 85% | 100% |
| MDP SSOT % | 75% | 95% |
| CDP SSOT % | 90% | 100% |
| CT SSOT % | 80% | 95% |
| Cross-Module Integration | 8/12 | 12/12 |
| Frontend Business Logic Lines | ~500 | <50 |

---

## 🚀 NEXT ACTIONS

1. **Bắt đầu Phase 1.1:** Fix metric-registry.ts
2. **Review files:** `useMarketingDecisionEngine.ts`, `useAlertEscalation.ts`
3. **Prepare migrations:** v_mdp_decision_signals, mdp_config, escalations

---

## 📁 PHỤ LỤC: Kế hoạch Chi phí Tạm tính (ĐÃ HOÀN THÀNH)

### Tổng quan
Tích hợp chi phí tạm tính từ `expense_baselines` và `expense_estimates` vào P&L Report.

### Rule Ưu tiên Dữ liệu

| Ưu tiên | Nguồn | Badge |
|---------|-------|-------|
| 1 | `expenses` / `finance_expenses_daily` | "Thực tế" |
| 2 | `expense_baselines` | "Tạm tính" |
| 3 | `expense_estimates` | "Tạm tính" |

### Rule Cảnh báo

- **Underestimate**: Thực tế > Tạm tính + 10% → Cảnh báo đỏ
- **On Track**: Chênh lệch ±10% → OK xanh
- **Overestimate**: Thực tế < Tạm tính - 20% → Thông tin cam

### Kết quả đã triển khai

✅ View `v_expense_variance_alerts` đã tạo  
✅ Hook `useExpenseVarianceAlerts.ts` đã tạo  
✅ P&L Report hiển thị badge nguồn dữ liệu  
✅ Cảnh báo variance hoạt động  

---

**Người thực hiện:** AI Assistant  
**Reviewer:** User  
**Approval Required:** Yes (trước mỗi migration)
