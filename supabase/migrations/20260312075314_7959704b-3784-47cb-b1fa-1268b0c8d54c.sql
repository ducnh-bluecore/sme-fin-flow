
-- Add a materialized phone extraction column for faster Haravan linking
ALTER TABLE tenant_icondenim.cdp_customers ADD COLUMN IF NOT EXISTS phone_extracted text;

-- Populate from canonical_key
UPDATE tenant_icondenim.cdp_customers 
SET phone_extracted = regexp_replace(substring(canonical_key from 'guest\+(.+)@haravan\.com'), '[^0-9]', '', 'g')
WHERE tenant_id = '364a23ad-66f5-44d6-8da9-74c7ff333dcc'
  AND canonical_key LIKE 'guest+%@haravan.com'
  AND phone_extracted IS NULL;

-- Also set from phone column where available
UPDATE tenant_icondenim.cdp_customers 
SET phone_extracted = regexp_replace(phone, '[^0-9]', '', 'g')
WHERE tenant_id = '364a23ad-66f5-44d6-8da9-74c7ff333dcc'
  AND phone IS NOT NULL
  AND phone_extracted IS NULL;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_cdp_customers_phone_extracted 
  ON tenant_icondenim.cdp_customers(tenant_id, phone_extracted) 
  WHERE phone_extracted IS NOT NULL AND length(phone_extracted) >= 9;
