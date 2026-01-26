-- Add 'refunded' value to order_status enum
-- This is required by compute_central_metrics_snapshot RPC which filters by this status

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refunded' AFTER 'returned';