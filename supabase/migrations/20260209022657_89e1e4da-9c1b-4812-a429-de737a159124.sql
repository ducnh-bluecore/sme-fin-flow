-- Add channel column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS channel text DEFAULT 'kiotviet';

-- Drop old unique constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_tenant_id_sku_key;

-- Create new unique constraint with channel
ALTER TABLE products ADD CONSTRAINT products_tenant_channel_sku_key 
  UNIQUE (tenant_id, channel, sku);