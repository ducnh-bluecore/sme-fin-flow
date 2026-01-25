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

### CDP Module
```
cdp_customer_equity_computed (source table)
  └── v_cdp_equity_overview (aggregation)
       └── v_cdp_equity_snapshot (simplified view)
            └── useCDPEquitySnapshot hook
                 └── CustomerEquitySnapshot.tsx
                 └── EquityKPICards.tsx
```

### FDP Module
```
external_orders + invoices + bills (source tables)
  └── central_metrics_snapshots (pre-computed)
       └── useFinanceTruthSnapshot hook
            └── FinanceSummaryCard.tsx
            └── CashflowChart.tsx
```

### Control Tower
```
early_warning_alerts (source)
  └── v_active_alerts_hierarchy
       └── useControlTowerSSOT hook
            └── AlertGrid.tsx
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

### 1. Database Changes
```sql
-- Chạy sau mỗi migration
SELECT 
  view_name,
  CASE WHEN result IS NOT NULL THEN 'PASS' ELSE 'FAIL' END as status
FROM (
  SELECT 'v_cdp_equity_snapshot' as view_name, 
         (SELECT total_equity_12m FROM v_cdp_equity_snapshot LIMIT 1) as result
  UNION ALL
  SELECT 'v_cdp_data_quality', 
         (SELECT confidence_level FROM v_cdp_data_quality LIMIT 1)
) checks;
```

### 2. Frontend Changes
- Mở page bị ảnh hưởng
- Check console không có errors mới
- Verify data hiển thị đúng (không phải 0, null, hoặc loading vô hạn)

### 3. Full System Check
- Thêm ?governance=1 vào URL
- Tất cả health checks phải PASS

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
| 2025-01-25 | Fixed v_cdp_equity_overview to filter by non-null equity | Restored 149M equity display |
| 2025-01-25 | Created SSOT Governance Dashboard | Enables proactive monitoring |
