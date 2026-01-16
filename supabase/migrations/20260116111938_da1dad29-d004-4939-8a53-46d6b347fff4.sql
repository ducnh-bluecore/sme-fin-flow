
-- Set SECURITY INVOKER for new views (uses caller's permissions, respecting RLS)
ALTER VIEW public.fdp_daily_metrics SET (security_invoker = on);
ALTER VIEW public.fdp_monthly_metrics SET (security_invoker = on);
ALTER VIEW public.fdp_channel_summary SET (security_invoker = on);
ALTER VIEW public.fdp_sku_summary SET (security_invoker = on);
ALTER VIEW public.fdp_expense_summary SET (security_invoker = on);
ALTER VIEW public.fdp_invoice_summary SET (security_invoker = on);
