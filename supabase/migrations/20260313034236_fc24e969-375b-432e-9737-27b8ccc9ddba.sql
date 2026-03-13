
-- Create mapping table with smaller scope first
CREATE TABLE IF NOT EXISTS tenant_icondenim.order_id_remap (
  old_id UUID NOT NULL,
  new_id UUID NOT NULL
);

-- Populate in a single pass using the existing index
INSERT INTO tenant_icondenim.order_id_remap (old_id, new_id)
SELECT po.id, to2.id
FROM public.cdp_orders po
JOIN tenant_icondenim.cdp_orders to2 ON to2.order_key = po.order_key AND to2.channel = po.channel
WHERE po.tenant_id = '364a23ad-66f5-44d6-8da9-74c7ff333dcc';

CREATE INDEX idx_order_id_remap_old ON tenant_icondenim.order_id_remap (old_id);
