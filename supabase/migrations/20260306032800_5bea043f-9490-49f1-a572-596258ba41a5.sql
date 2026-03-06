
-- Add statement_timeout to all heavy functions missing it

ALTER FUNCTION compute_size_transfers(uuid, date) SET statement_timeout = '120s';
ALTER FUNCTION compute_inventory_kpi_all(uuid, date) SET statement_timeout = '120s';
ALTER FUNCTION backfill_cogs_pipeline(uuid) SET statement_timeout = '120s';
ALTER FUNCTION detect_threshold_breaches(uuid, date) SET statement_timeout = '60s';
ALTER FUNCTION fn_batch_size_split_alloc(uuid, uuid, integer) SET statement_timeout = '120s';
ALTER FUNCTION fn_allocate_size_split(uuid, uuid, uuid, uuid, integer) SET statement_timeout = '120s';
ALTER FUNCTION populate_first_sale_dates(uuid) SET statement_timeout = '60s';
ALTER FUNCTION update_order_items_cogs(uuid) SET statement_timeout = '120s';
ALTER FUNCTION fn_clearance_candidates(uuid, integer) SET statement_timeout = '60s';
ALTER FUNCTION fn_inv_positions_agg(uuid) SET statement_timeout = '60s';
ALTER FUNCTION fn_inv_overview_stats(uuid) SET statement_timeout = '30s';
ALTER FUNCTION fn_trigger_async_size_split(uuid, uuid, text) SET statement_timeout = '120s';
ALTER FUNCTION fn_size_breakdown(uuid, text) SET statement_timeout = '30s';
ALTER FUNCTION fn_store_breakdown_comparison(uuid, uuid) SET statement_timeout = '30s';
ALTER FUNCTION cleanup_kiotviet_marketplace_orders(uuid, text[], boolean) SET statement_timeout = '60s';
