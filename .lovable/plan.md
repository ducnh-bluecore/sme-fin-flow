

## Optimize cdp_run_daily_build for 1M+ Orders

### Root Cause

Pipeline has 3 steps, each with a different bottleneck:

| Step | Function | Current Behavior | Problem |
|------|----------|-----------------|---------|
| 1 | `cdp_build_customer_metrics_daily` | Processes only 1 day (p_as_of_date) | Works fine daily, but `cdp_customer_metrics_daily` has **0 rows** -- no historical backfill was ever run |
| 2 | `cdp_build_customer_metrics_rolling` | Aggregates from daily metrics table | **Produces nothing** because daily table is empty |
| 3 | `cdp_build_customer_equity` | Single query: 310K customers x 1M+ orders | **Timeout** -- massive JOIN with no batching |
| 4 | MV Refresh (4 views) | `REFRESH MATERIALIZED VIEW CONCURRENTLY` | Depends on rolling data existing |

The core issue: Step 3 tries to compute equity for all 310K customers in one SQL statement, scanning all 1M+ orders. This exceeds the statement timeout.

Additionally, daily metrics were never backfilled, so rolling/equity have no foundation.

### Solution: 3 Database Changes + 1 Edge Function Update

#### 1. New function: `cdp_build_customer_metrics_daily_range`

Backfill daily metrics for a date range by looping day-by-day internally.

```sql
CREATE FUNCTION cdp_build_customer_metrics_daily_range(
  p_tenant_id uuid, p_start_date date, p_end_date date
) RETURNS jsonb
```

- Loops from start to end, calling existing `cdp_build_customer_metrics_daily` per day
- Returns `{ days_processed, total_rows }`
- Needed once for historical backfill, then daily runs handle 1 day at a time

#### 2. New function: `cdp_build_customer_equity_batched`

Process equity in batches of ~10,000 customers.

```sql
CREATE FUNCTION cdp_build_customer_equity_batched(
  p_tenant_id uuid, p_as_of_date date, p_batch_size int DEFAULT 10000
) RETURNS jsonb
```

- Fetches customer IDs in batches using LIMIT/OFFSET
- Runs the same equity computation logic but filtered to batch of customers
- Returns `{ total_batches, total_processed }`

#### 3. Replace `cdp_run_daily_build` orchestrator

New version that:
- Calls daily metrics (single day -- fast)
- Calls rolling metrics (reads from daily table -- fast if daily exists)
- Calls `cdp_build_customer_equity_batched` instead of the monolithic version
- Refreshes MVs at the end
- Returns same JSON shape for backward compatibility

#### 4. Update Edge Function: `compute-kpi-pipeline`

Add a new option `backfill_cdp_daily = true` that:
- Calls `cdp_build_customer_metrics_daily_range` for the date range before running the main CDP build
- Only needed for first-time backfill; daily cron skips this

### Technical Details

**Batch size**: 10,000 customers per batch = ~32 batches for 310K customers. Each batch scans orders with `WHERE customer_id IN (...)` which uses the index efficiently.

**Daily range backfill**: For 1M+ orders spanning ~3 years, this creates ~1,095 daily snapshots. Each day's query is fast (filtered by `order_at::date = date`). Can process ~50 days/second.

**No schema changes**: All changes are function replacements. No new tables or columns needed.

**Backward compatible**: `cdp_run_daily_build` keeps the same signature and return format.

### Migration SQL Summary

1. `CREATE OR REPLACE FUNCTION cdp_build_customer_metrics_daily_range(...)` -- loop wrapper
2. `CREATE OR REPLACE FUNCTION cdp_build_customer_equity_batched(...)` -- batched equity
3. `CREATE OR REPLACE FUNCTION cdp_run_daily_build(...)` -- updated orchestrator using batched equity

### Edge Function Change

**File: `supabase/functions/compute-kpi-pipeline/index.ts`**

Add handling for `backfill_cdp_daily` flag:
- When true: call `cdp_build_customer_metrics_daily_range` in date-range chunks (14-day windows, same pattern as KPI chunking)
- Then proceed with normal `cdp_run_daily_build` which now uses batched equity

