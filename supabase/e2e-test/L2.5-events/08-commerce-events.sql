-- ============================================================================
-- E2E TEST SUITE - SCRIPT 08: COMMERCE EVENTS (L2.5 Events)
-- ============================================================================
-- Architecture: v1.4.2 Layer 2.5 - Events
-- Creates ~27,500 commerce events (5 events per order)
--
-- EVENT TYPES:
--   - page_view: Customer views product
--   - add_to_cart: Customer adds to cart
--   - checkout_start: Customer starts checkout
--   - checkout_complete: Payment processed
--   - purchase: Order confirmed
--
-- EXPECTED VALUES:
--   - Total Events: ~27,500 (5,500 orders × 5 events)
--   - Events per order: 5
-- ============================================================================

-- Clean existing data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commerce_events') THEN
    DELETE FROM commerce_events 
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    
    -- Generate commerce events from orders
    INSERT INTO commerce_events (
      id, tenant_id, event_type, customer_id, order_id,
      event_at, channel, metadata, created_at
    )
    WITH order_events AS (
      SELECT 
        o.id as order_id,
        o.customer_id,
        o.order_at,
        o.channel,
        o.net_revenue,
        ROW_NUMBER() OVER (ORDER BY o.order_at) as order_seq,
        event_type.event_type,
        event_type.event_offset
      FROM cdp_orders o
      CROSS JOIN (
        VALUES 
          ('page_view', -300),      -- 5 minutes before
          ('add_to_cart', -180),    -- 3 minutes before
          ('checkout_start', -60),  -- 1 minute before
          ('checkout_complete', -10), -- 10 seconds before
          ('purchase', 0)           -- At order time
      ) as event_type(event_type, event_offset)
      WHERE o.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    )
    SELECT
      ('55555555-' || LPAD((order_seq / 10000)::text, 4, '0') || '-' || 
       LPAD(((order_seq / 100) % 100)::text, 4, '0') || '-' ||
       LPAD(ABS(event_offset)::text, 4, '0') || '-' || 
       LPAD((order_seq % 10000)::text, 12, '0'))::uuid as id,
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid as tenant_id,
      event_type,
      customer_id,
      CASE WHEN event_type = 'purchase' THEN order_id ELSE NULL END as order_id,
      (order_at + (event_offset || ' seconds')::interval) as event_at,
      channel,
      jsonb_build_object(
        'order_value', CASE WHEN event_type = 'purchase' THEN net_revenue ELSE NULL END,
        'session_id', 'session_' || order_seq,
        'device', CASE order_seq % 3 
          WHEN 0 THEN 'mobile'
          WHEN 1 THEN 'desktop'
          ELSE 'tablet'
        END
      ) as metadata,
      order_at as created_at
    FROM order_events;
    
    RAISE NOTICE 'Created commerce events';
  ELSE
    RAISE NOTICE 'commerce_events table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  v_count integer;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commerce_events') THEN
    SELECT COUNT(*) INTO v_count
    FROM commerce_events
    WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    
    RAISE NOTICE 'L2.5_EVENTS: COMMERCE_EVENTS total_events=%', v_count;
  ELSE
    RAISE NOTICE 'commerce_events table does not exist';
  END IF;
END $$;
