-- =============================================
-- FULL DATABASE SCHEMA EXPORT FOR SELF-HOSTING
-- Generated for CFO Financial Dashboard
-- =============================================

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');
CREATE TYPE public.tenant_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE public.expense_category AS ENUM (
  'office', 'utilities', 'salary', 'marketing', 
  'travel', 'supplies', 'maintenance', 'other'
);

-- =============================================
-- CORE TABLES
-- =============================================

-- Tenants (Multi-tenancy)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  active_tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles (App-level)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tenant Users (Tenant-level membership)
CREATE TABLE public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role tenant_role NOT NULL DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- =============================================
-- FINANCIAL TABLES
-- =============================================

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_code TEXT,
  customer_type TEXT DEFAULT 'regular',
  credit_limit NUMERIC DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,
  payment_term_id UUID,
  gl_receivable_account_id UUID,
  currency_code TEXT DEFAULT 'VND',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vendors
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_code TEXT,
  vendor_type TEXT DEFAULT 'regular',
  payment_terms INTEGER DEFAULT 30,
  currency_code TEXT DEFAULT 'VND',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'piece',
  unit_price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment Terms
CREATE TABLE public.payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  days INTEGER NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tax Codes
CREATE TABLE public.tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cost Centers
CREATE TABLE public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.cost_centers(id),
  manager_id UUID,
  budget_amount NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Currencies
CREATE TABLE public.currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT,
  decimal_places INTEGER DEFAULT 0,
  is_base BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exchange Rates
CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  from_currency_id UUID NOT NULL REFERENCES public.currencies(id),
  to_currency_id UUID NOT NULL REFERENCES public.currencies(id),
  rate NUMERIC NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- GL ACCOUNTS
-- =============================================

CREATE TABLE public.gl_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_subtype TEXT,
  normal_balance TEXT NOT NULL,
  parent_account_id UUID REFERENCES public.gl_accounts(id),
  level INTEGER DEFAULT 1,
  is_header BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  current_balance NUMERIC DEFAULT 0,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.gl_account_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id),
  accounts_receivable_id UUID REFERENCES public.gl_accounts(id),
  accounts_payable_id UUID REFERENCES public.gl_accounts(id),
  sales_revenue_id UUID REFERENCES public.gl_accounts(id),
  sales_vat_id UUID REFERENCES public.gl_accounts(id),
  sales_discount_id UUID REFERENCES public.gl_accounts(id),
  purchase_expense_id UUID REFERENCES public.gl_accounts(id),
  purchase_vat_id UUID REFERENCES public.gl_accounts(id),
  cash_id UUID REFERENCES public.gl_accounts(id),
  bank_id UUID REFERENCES public.gl_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- FINANCIAL PERIODS
-- =============================================

CREATE TABLE public.financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  period_name TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- JOURNAL ENTRIES
-- =============================================

CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL,
  period_id UUID REFERENCES public.financial_periods(id),
  description TEXT NOT NULL,
  reference TEXT,
  source_type TEXT,
  source_id UUID,
  status TEXT DEFAULT 'draft',
  total_debit NUMERIC DEFAULT 0,
  total_credit NUMERIC DEFAULT 0,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  posted_by UUID,
  posted_at TIMESTAMPTZ,
  voided_by UUID,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  account_id UUID NOT NULL REFERENCES public.gl_accounts(id),
  description TEXT,
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  currency_code TEXT,
  exchange_rate NUMERIC DEFAULT 1,
  debit_amount_base NUMERIC,
  credit_amount_base NUMERIC,
  cost_center_id UUID REFERENCES public.cost_centers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INVOICES (AR)
-- =============================================

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  currency_code TEXT DEFAULT 'VND',
  exchange_rate NUMERIC DEFAULT 1,
  subtotal NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  total_amount_base NUMERIC,
  paid_amount NUMERIC DEFAULT 0,
  credit_note_amount NUMERIC DEFAULT 0,
  debit_note_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC,
  status TEXT DEFAULT 'draft',
  payment_term_id UUID REFERENCES public.payment_terms(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  vat_rate NUMERIC DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  promotion_type TEXT NOT NULL,
  code TEXT,
  description TEXT,
  discount_percent NUMERIC,
  discount_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PAYMENTS
-- =============================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  invoice_id UUID REFERENCES public.invoices(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  reference_code TEXT,
  bank_account_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- BILLS (AP)
-- =============================================

CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  bill_number TEXT NOT NULL,
  vendor_bill_number TEXT,
  vendor_id UUID REFERENCES public.vendors(id),
  vendor_name TEXT NOT NULL,
  bill_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  received_date DATE,
  currency_code TEXT DEFAULT 'VND',
  exchange_rate NUMERIC DEFAULT 1,
  subtotal NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  total_amount_base NUMERIC,
  paid_amount NUMERIC DEFAULT 0,
  credit_note_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  expense_category TEXT,
  gl_account_id UUID REFERENCES public.gl_accounts(id),
  payment_terms INTEGER DEFAULT 30,
  payment_term_id UUID REFERENCES public.payment_terms(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  gl_account_id UUID REFERENCES public.gl_accounts(id),
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  vat_rate NUMERIC DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vendor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  bill_id UUID REFERENCES public.bills(id),
  vendor_id UUID REFERENCES public.vendors(id),
  payment_number TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'bank_transfer',
  reference_code TEXT,
  bank_account_id UUID,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- CREDIT/DEBIT NOTES
-- =============================================

CREATE TABLE public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  credit_note_number TEXT NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id),
  customer_id UUID REFERENCES public.customers(id),
  credit_note_date DATE DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  description TEXT,
  currency_code TEXT DEFAULT 'VND',
  exchange_rate NUMERIC DEFAULT 1,
  subtotal NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  total_amount_base NUMERIC,
  status TEXT DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.credit_note_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  credit_note_id UUID NOT NULL REFERENCES public.credit_notes(id) ON DELETE CASCADE,
  invoice_item_id UUID REFERENCES public.invoice_items(id),
  product_id UUID REFERENCES public.products(id),
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  vat_rate NUMERIC DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.debit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  debit_note_number TEXT NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id),
  customer_id UUID REFERENCES public.customers(id),
  debit_note_date DATE DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  description TEXT,
  currency_code TEXT DEFAULT 'VND',
  exchange_rate NUMERIC DEFAULT 1,
  subtotal NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  total_amount_base NUMERIC,
  status TEXT DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.debit_note_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  debit_note_id UUID NOT NULL REFERENCES public.debit_notes(id) ON DELETE CASCADE,
  invoice_item_id UUID REFERENCES public.invoice_items(id),
  product_id UUID REFERENCES public.products(id),
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  vat_rate NUMERIC DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vendor_credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  credit_note_number TEXT NOT NULL,
  bill_id UUID REFERENCES public.bills(id),
  vendor_id UUID REFERENCES public.vendors(id),
  credit_note_date DATE DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  description TEXT,
  currency_code TEXT DEFAULT 'VND',
  exchange_rate NUMERIC DEFAULT 1,
  subtotal NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  total_amount_base NUMERIC,
  status TEXT DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- BANKING
-- =============================================

CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT,
  currency TEXT DEFAULT 'VND',
  current_balance NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  reference TEXT,
  match_status TEXT DEFAULT 'unmatched',
  matched_invoice_id UUID REFERENCES public.invoices(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- EXPENSES & REVENUES
-- =============================================

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  expense_date DATE DEFAULT CURRENT_DATE,
  category expense_category NOT NULL,
  subcategory TEXT,
  description TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  currency_code TEXT DEFAULT 'VND',
  exchange_rate NUMERIC DEFAULT 1,
  amount_base NUMERIC,
  vendor_id UUID REFERENCES public.vendors(id),
  vendor_name TEXT,
  cost_center_id UUID REFERENCES public.cost_centers(id),
  tax_code_id UUID REFERENCES public.tax_codes(id),
  payment_method TEXT,
  reference_number TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_period TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  source TEXT NOT NULL,
  channel TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  currency_code TEXT DEFAULT 'VND',
  exchange_rate NUMERIC DEFAULT 1,
  amount_base NUMERIC,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  customer_id UUID REFERENCES public.customers(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- BUDGETS
-- =============================================

CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  budget_type TEXT DEFAULT 'expense',
  category TEXT NOT NULL,
  subcategory TEXT,
  period_type TEXT DEFAULT 'monthly',
  period_year INTEGER NOT NULL,
  period_month INTEGER,
  period_quarter INTEGER,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budgeted_amount NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  variance_amount NUMERIC,
  variance_percent NUMERIC,
  status TEXT DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- FIXED ASSETS
-- =============================================

CREATE TABLE public.fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  asset_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  purchase_value NUMERIC NOT NULL,
  residual_value NUMERIC DEFAULT 0,
  useful_life_months INTEGER NOT NULL,
  depreciation_method TEXT DEFAULT 'straight_line',
  accumulated_depreciation NUMERIC DEFAULT 0,
  current_value NUMERIC,
  status TEXT DEFAULT 'active',
  location TEXT,
  vendor_id UUID REFERENCES public.vendors(id),
  bill_id UUID REFERENCES public.bills(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  gl_asset_account_id UUID REFERENCES public.gl_accounts(id),
  gl_depreciation_account_id UUID REFERENCES public.gl_accounts(id),
  gl_expense_account_id UUID REFERENCES public.gl_accounts(id),
  disposed_date DATE,
  disposed_value NUMERIC,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.depreciation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  fixed_asset_id UUID NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  depreciation_amount NUMERIC NOT NULL,
  accumulated_amount NUMERIC NOT NULL,
  remaining_value NUMERIC NOT NULL,
  is_posted BOOLEAN DEFAULT false,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ORDERS
-- =============================================

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  order_number TEXT NOT NULL,
  external_order_id TEXT,
  source TEXT DEFAULT 'manual',
  channel TEXT,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  order_date TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending',
  subtotal NUMERIC DEFAULT 0,
  shipping_fee NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  shipping_status TEXT DEFAULT 'pending',
  tracking_number TEXT,
  invoice_id UUID REFERENCES public.invoices(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  sku TEXT,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- CASH FORECASTS
-- =============================================

CREATE TABLE public.cash_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  forecast_date DATE NOT NULL UNIQUE,
  forecast_type TEXT DEFAULT 'actual',
  opening_balance NUMERIC NOT NULL,
  inflows NUMERIC DEFAULT 0,
  outflows NUMERIC DEFAULT 0,
  closing_balance NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ALERTS & AUDIT
-- =============================================

CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  severity TEXT DEFAULT 'medium',
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id),
  alert_configs JSONB DEFAULT '{"risk": {"enabled": true, "severity": "high"}, "ar_overdue": {"enabled": true, "severity": "high", "threshold": 30}, "data_quality": {"enabled": true, "severity": "medium"}, "cash_critical": {"enabled": true, "severity": "high", "threshold": 100000000}, "reconciliation": {"enabled": true, "severity": "medium", "threshold": 7}}'::jsonb,
  notification_email BOOLEAN DEFAULT true,
  notification_slack BOOLEAN DEFAULT false,
  notification_push BOOLEAN DEFAULT false,
  email_address TEXT,
  slack_webhook TEXT,
  notify_immediately BOOLEAN DEFAULT true,
  notify_daily_summary BOOLEAN DEFAULT false,
  notify_weekly_summary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID,
  function_name TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- VIEWS
-- =============================================

CREATE OR REPLACE VIEW public.ar_aging AS
SELECT 
  i.id as invoice_id,
  i.tenant_id,
  i.invoice_number,
  i.customer_id,
  c.name as customer_name,
  i.issue_date,
  i.due_date,
  i.total_amount,
  COALESCE(i.paid_amount, 0) as paid_amount,
  i.total_amount - COALESCE(i.paid_amount, 0) as balance_due,
  i.status,
  CASE 
    WHEN i.due_date >= CURRENT_DATE THEN 0
    ELSE CURRENT_DATE - i.due_date 
  END as days_overdue,
  CASE
    WHEN i.due_date >= CURRENT_DATE THEN 'current'
    WHEN CURRENT_DATE - i.due_date <= 30 THEN '1-30'
    WHEN CURRENT_DATE - i.due_date <= 60 THEN '31-60'
    WHEN CURRENT_DATE - i.due_date <= 90 THEN '61-90'
    ELSE '90+'
  END as aging_bucket
FROM public.invoices i
LEFT JOIN public.customers c ON i.customer_id = c.id
WHERE i.status NOT IN ('paid', 'cancelled', 'draft');

CREATE OR REPLACE VIEW public.ap_aging AS
SELECT 
  b.id as bill_id,
  b.tenant_id,
  b.bill_number,
  b.vendor_id,
  b.vendor_name,
  b.bill_date,
  b.due_date,
  b.total_amount,
  COALESCE(b.paid_amount, 0) as paid_amount,
  b.total_amount - COALESCE(b.paid_amount, 0) as balance_due,
  b.status,
  CASE 
    WHEN b.due_date >= CURRENT_DATE THEN 0
    ELSE CURRENT_DATE - b.due_date 
  END as days_overdue,
  CASE
    WHEN b.due_date >= CURRENT_DATE THEN 'current'
    WHEN CURRENT_DATE - b.due_date <= 30 THEN '1-30'
    WHEN CURRENT_DATE - b.due_date <= 60 THEN '31-60'
    WHEN CURRENT_DATE - b.due_date <= 90 THEN '61-90'
    ELSE '90+'
  END as aging_bucket
FROM public.bills b
WHERE b.status NOT IN ('paid', 'cancelled', 'draft');

CREATE OR REPLACE VIEW public.cash_position AS
SELECT 
  ba.id as bank_account_id,
  ba.tenant_id,
  ba.bank_name,
  ba.account_number,
  ba.currency,
  ba.current_balance,
  ba.last_sync_at,
  (SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) 
   FROM public.invoices 
   WHERE tenant_id = ba.tenant_id AND status NOT IN ('paid', 'cancelled', 'draft')) as ar_outstanding,
  (SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) 
   FROM public.bills 
   WHERE tenant_id = ba.tenant_id AND status NOT IN ('paid', 'cancelled', 'draft')) as ap_outstanding
FROM public.bank_accounts ba
WHERE ba.status = 'active';

CREATE OR REPLACE VIEW public.trial_balance AS
SELECT
  ga.id as account_id,
  ga.tenant_id,
  ga.account_code,
  ga.account_name,
  ga.account_type,
  ga.normal_balance,
  ga.current_balance,
  CASE WHEN ga.normal_balance = 'debit' THEN ga.current_balance ELSE 0 END as debit_balance,
  CASE WHEN ga.normal_balance = 'credit' THEN ga.current_balance ELSE 0 END as credit_balance
FROM public.gl_accounts ga
WHERE ga.is_active = true AND ga.is_header = false;

CREATE OR REPLACE VIEW public.balance_sheet_summary AS
SELECT
  tenant_id,
  account_type,
  SUM(current_balance) as total_balance
FROM public.gl_accounts
WHERE is_active = true AND is_header = false
GROUP BY tenant_id, account_type;

CREATE OR REPLACE VIEW public.invoice_adjustments_summary AS
SELECT
  i.id as invoice_id,
  i.tenant_id,
  i.invoice_number,
  i.customer_id,
  c.name as customer_name,
  i.total_amount as original_amount,
  COALESCE(i.credit_note_amount, 0) as total_credit_notes,
  COALESCE(i.debit_note_amount, 0) as total_debit_notes,
  i.total_amount - COALESCE(i.credit_note_amount, 0) + COALESCE(i.debit_note_amount, 0) as net_amount,
  COALESCE(i.paid_amount, 0) as paid_amount,
  i.total_amount - COALESCE(i.credit_note_amount, 0) + COALESCE(i.debit_note_amount, 0) - COALESCE(i.paid_amount, 0) as balance_due,
  (SELECT COUNT(*) FROM public.credit_notes cn WHERE cn.invoice_id = i.id AND cn.status = 'applied') as credit_note_count,
  (SELECT COUNT(*) FROM public.debit_notes dn WHERE dn.invoice_id = i.id AND dn.status = 'applied') as debit_note_count
FROM public.invoices i
LEFT JOIN public.customers c ON i.customer_id = c.id;

-- =============================================
-- IMPORTANT: After importing this schema, you need to:
-- 1. Create the helper functions (see functions section in your Supabase project)
-- 2. Set up RLS policies for each table
-- 3. Create the auth trigger for new users
-- =============================================
