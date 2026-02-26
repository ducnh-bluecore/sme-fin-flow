-- Allow 'recall' transfer_type in inv_rebalance_suggestions
ALTER TABLE public.inv_rebalance_suggestions
  DROP CONSTRAINT inv_rebalance_suggestions_transfer_type_check;

ALTER TABLE public.inv_rebalance_suggestions
  ADD CONSTRAINT inv_rebalance_suggestions_transfer_type_check
  CHECK (transfer_type = ANY (ARRAY['push'::text, 'lateral'::text, 'recall'::text]));
