-- Add metadata column to store data analysis details
ALTER TABLE decision_cards 
ADD COLUMN IF NOT EXISTS analysis_metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN decision_cards.analysis_metadata IS 'Stores data counts and analysis details: data_rows, sku_count, transaction_count, order_count, analyzed_at';

-- Update existing cards with placeholder metadata (for demo)
UPDATE decision_cards 
SET analysis_metadata = jsonb_build_object(
  'data_rows', CASE 
    WHEN card_type LIKE '%SKU%' THEN 170
    WHEN card_type LIKE '%CASH%' THEN 342
    ELSE 100
  END,
  'analyzed_at', now()
)
WHERE analysis_metadata IS NULL OR analysis_metadata = '{}'::jsonb;