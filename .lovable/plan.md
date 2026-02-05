
# Plan: Migrate Remaining Hooks từ `useTenantSupabaseCompat` → `useTenantQueryBuilder`

## Tổng quan

Sau khi audit, còn **~12 hooks** đang sử dụng pattern cũ `useTenantSupabaseCompat` cần migrate sang `useTenantQueryBuilder` để đảm bảo nhất quán kiến trúc Schema-per-Tenant v1.4.1.

## Danh sách Hooks cần Migrate

| # | Hook | Loại data | Độ phức tạp |
|---|------|-----------|-------------|
| 1 | `useCashFlowDirect.ts` | Finance/FDP | Trung bình (CRUD) |
| 2 | `useCDPEquity.ts` | CDP/Equity | Đơn giản (SELECT) |
| 3 | `useCDPValueDistribution.ts` | CDP/Analytics | Đơn giản (SELECT) |
| 4 | `useTeamMembers.ts` | Settings | Trung bình (CRUD) |
| 5 | `useUnifiedChannelMetrics.ts` | MDP/Channels | Đơn giản (SELECT) |
| 6 | `useAllChannelsPL.ts` | MDP/P&L | Đơn giản (SELECT) |
| 7 | `useTopCustomersAR.ts` | FDP/AR | Đã gần xong (hybrid) |
| 8 | `usePushNotifications.ts` | Platform | Đặc biệt* |
| 9 | `useMLReconciliation.ts` | ML/Finance | Đặc biệt* |

*Lưu ý: `usePushNotifications` và `useMLReconciliation` sử dụng Edge Functions, chỉ cần migrate phần client accessor.

## Quy tắc Migration

### Pattern chuyển đổi:

```text
TRƯỚC (useTenantSupabaseCompat):
┌─────────────────────────────────────────────────────────┐
│ const { client, tenantId, shouldAddTenantFilter } =     │
│   useTenantSupabaseCompat();                            │
│                                                         │
│ let query = client.from('table').select('*');           │
│ if (shouldAddTenantFilter) {                            │
│   query = query.eq('tenant_id', tenantId);              │
│ }                                                       │
└─────────────────────────────────────────────────────────┘

SAU (useTenantQueryBuilder):
┌─────────────────────────────────────────────────────────┐
│ const { buildSelectQuery, tenantId, isReady } =         │
│   useTenantQueryBuilder();                              │
│                                                         │
│ const { data, error } = await buildSelectQuery(         │
│   'table', '*');                                        │
│ // tenant_id filter auto-applied                        │
└─────────────────────────────────────────────────────────┘
```

### Mapping methods:

| Compat Method | Query Builder Method |
|---------------|---------------------|
| `client.from(table).select()` | `buildSelectQuery(table, columns)` |
| `client.from(table).insert()` | `buildInsertQuery(table, data)` |
| `client.from(table).update()` | `buildUpdateQuery(table, data)` |
| `client.from(table).delete()` | `buildDeleteQuery(table)` |
| `client.rpc()` | `callRpc(name, params)` |

## Chi tiết Implementation

### 1. useCashFlowDirect.ts (~60 dòng thay đổi)
- Thay `client.from('cash_flow_direct')` → `buildSelectQuery('cash_flow_direct', '*')`
- Loại bỏ logic `shouldAddTenantFilter` thủ công
- 4 functions: `useCashFlowDirect`, `useCreateCashFlowDirect`, `useUpdateCashFlowDirect`, `useDeleteCashFlowDirect`

### 2. useCDPEquity.ts (~80 dòng thay đổi)
- 8 hooks cần migrate: `useCDPEquityOverview`, `useCDPEquityDistribution`, `useCDPEquityDrivers`, `useCDPEquitySnapshot`, `useCDPLTVModels`, `useCDPLTVRules`, `useCDPLTVAuditHistory`, `useCDPEquityEvidence`
- Views: `v_cdp_equity_*`

### 3. useCDPValueDistribution.ts (~70 dòng thay đổi)
- 5 hooks: `useCDPValueDistribution`, `useCDPSegmentSummaries`, `useCDPSummaryStats`, `useCDPDataQuality`, `useCDPTrendData`
- Views: `v_cdp_value_distribution`, `v_cdp_segment_summaries`, etc.

### 4. useTeamMembers.ts (~40 dòng thay đổi)
- 4 hooks: `useTeamMembers`, `useCreateTeamMember`, `useUpdateTeamMember`, `useDeleteTeamMember`
- Table: `team_members`

### 5. useUnifiedChannelMetrics.ts (~30 dòng thay đổi)
- 1 hook: `useUnifiedChannelMetrics`
- View: `v_channel_pl_summary`

### 6. useAllChannelsPL.ts (~30 dòng thay đổi)
- 1 hook: `useAllChannelsPL`
- View: `v_channel_pl_summary`

### 7. useTopCustomersAR.ts (~5 dòng thay đổi)
- Đã dùng `buildSelectQuery` nhưng vẫn import `useTenantSupabaseCompat` cho `tenantId`
- Chỉ cần cleanup import

### 8. usePushNotifications.ts (~20 dòng thay đổi)
- Push subscriptions là per-user, có thể giữ `useTenantSupabaseCompat` hoặc migrate
- Sử dụng table `push_subscriptions`

### 9. useMLReconciliation.ts (Không cần migrate)
- Chỉ dùng `client.auth.getSession()` cho Edge Function calls
- Có thể giữ nguyên vì không query database trực tiếp

## Files không cần migrate (Platform Layer)

Các hooks sau KHÔNG migrate vì chúng truy cập platform-level tables:
- `useAuth.tsx` - Auth/Session
- `useTenant.ts` - Tenant switching
- `useTenantSession.ts` - Session init
- `useIsSuperAdmin.ts` - Admin check
- `usePlatformModules.ts` - Platform config
- `useOnboardingStatus.ts` - User onboarding

## Thứ tự thực hiện

1. **Batch 1** (CDP hooks - read-only):
   - `useCDPEquity.ts`
   - `useCDPValueDistribution.ts`
   
2. **Batch 2** (MDP hooks - read-only):
   - `useUnifiedChannelMetrics.ts`
   - `useAllChannelsPL.ts`
   
3. **Batch 3** (CRUD hooks):
   - `useCashFlowDirect.ts`
   - `useTeamMembers.ts`
   
4. **Batch 4** (Cleanup):
   - `useTopCustomersAR.ts`
   - `usePushNotifications.ts`

## Kết quả mong đợi

| Metric | Trước | Sau |
|--------|-------|-----|
| Hooks dùng `useTenantSupabaseCompat` | ~12 | 0-2* |
| Hooks dùng `useTenantQueryBuilder` | ~90 | ~100 |
| Migration rate | 87% | 98%+ |

*Có thể giữ 1-2 hooks như `useMLReconciliation` nếu chỉ dùng cho auth session.

## Technical Notes

- Không thay đổi interface/return types của hooks
- Không thay đổi query logic, chỉ thay accessor pattern
- TypeScript types được preserve thông qua `as unknown as Type[]` casting
- Invalidation keys giữ nguyên để không break cache
