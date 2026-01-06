CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'accountant',
    'viewer'
);


--
-- Name: connector_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.connector_type AS ENUM (
    'haravan',
    'sapo',
    'kiotviet',
    'nhanh',
    'shopee',
    'lazada',
    'tiki',
    'tiktok_shop',
    'sendo',
    'shopify',
    'woocommerce',
    'misa',
    'fast',
    'sap',
    'bank_api',
    'manual',
    'bigquery'
);


--
-- Name: expense_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.expense_category AS ENUM (
    'cogs',
    'salary',
    'rent',
    'utilities',
    'marketing',
    'logistics',
    'depreciation',
    'interest',
    'tax',
    'other'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'shipping',
    'delivered',
    'cancelled',
    'returned'
);


--
-- Name: revenue_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.revenue_source AS ENUM (
    'manual',
    'integrated'
);


--
-- Name: revenue_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.revenue_type AS ENUM (
    'one_time',
    'recurring'
);


--
-- Name: settlement_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.settlement_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'disputed'
);


--
-- Name: sync_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sync_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled'
);


--
-- Name: tenant_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tenant_role AS ENUM (
    'owner',
    'admin',
    'member',
    'viewer'
);


--
-- Name: apply_credit_note(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_credit_note() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only process when status changes to 'applied'
  IF NEW.status = 'applied' AND OLD.status != 'applied' THEN
    -- Update invoice credit_note_amount
    IF NEW.invoice_id IS NOT NULL THEN
      UPDATE public.invoices
      SET credit_note_amount = COALESCE(credit_note_amount, 0) + NEW.total_amount,
          updated_at = now()
      WHERE id = NEW.invoice_id;
    END IF;
    
    NEW.applied_at := now();
  END IF;
  
  -- Handle cancellation - reverse the credit
  IF NEW.status = 'cancelled' AND OLD.status = 'applied' THEN
    IF OLD.invoice_id IS NOT NULL THEN
      UPDATE public.invoices
      SET credit_note_amount = GREATEST(COALESCE(credit_note_amount, 0) - OLD.total_amount, 0),
          updated_at = now()
      WHERE id = OLD.invoice_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: apply_debit_note(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_debit_note() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only process when status changes to 'applied'
  IF NEW.status = 'applied' AND OLD.status != 'applied' THEN
    -- Update invoice debit_note_amount
    IF NEW.invoice_id IS NOT NULL THEN
      UPDATE public.invoices
      SET debit_note_amount = COALESCE(debit_note_amount, 0) + NEW.total_amount,
          updated_at = now()
      WHERE id = NEW.invoice_id;
    END IF;
    
    NEW.applied_at := now();
  END IF;
  
  -- Handle cancellation - reverse the debit
  IF NEW.status = 'cancelled' AND OLD.status = 'applied' THEN
    IF OLD.invoice_id IS NOT NULL THEN
      UPDATE public.invoices
      SET debit_note_amount = GREATEST(COALESCE(debit_note_amount, 0) - OLD.total_amount, 0),
          updated_at = now()
      WHERE id = OLD.invoice_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: auto_post_journal_entry(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_post_journal_entry(p_entry_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_entry record;
BEGIN
  SELECT * INTO v_entry FROM public.journal_entries WHERE id = p_entry_id;
  
  IF v_entry IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if balanced
  IF v_entry.total_debit != v_entry.total_credit THEN
    RETURN false;
  END IF;
  
  -- Check if has lines
  IF v_entry.total_debit = 0 THEN
    RETURN false;
  END IF;
  
  -- Post the entry
  RETURN post_journal_entry(p_entry_id);
END;
$$;


--
-- Name: calculate_ap_aging_detail(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_ap_aging_detail(p_tenant_id uuid, p_as_of_date date DEFAULT CURRENT_DATE) RETURNS TABLE(vendor_id uuid, vendor_name text, current_amount numeric, days_1_30 numeric, days_31_60 numeric, days_61_90 numeric, over_90_days numeric, total_outstanding numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id as vendor_id,
    v.name as vendor_name,
    COALESCE(SUM(CASE WHEN (p_as_of_date - b.due_date) <= 0 THEN b.total_amount - b.paid_amount ELSE 0 END), 0) as current_amount,
    COALESCE(SUM(CASE WHEN (p_as_of_date - b.due_date) BETWEEN 1 AND 30 THEN b.total_amount - b.paid_amount ELSE 0 END), 0) as days_1_30,
    COALESCE(SUM(CASE WHEN (p_as_of_date - b.due_date) BETWEEN 31 AND 60 THEN b.total_amount - b.paid_amount ELSE 0 END), 0) as days_31_60,
    COALESCE(SUM(CASE WHEN (p_as_of_date - b.due_date) BETWEEN 61 AND 90 THEN b.total_amount - b.paid_amount ELSE 0 END), 0) as days_61_90,
    COALESCE(SUM(CASE WHEN (p_as_of_date - b.due_date) > 90 THEN b.total_amount - b.paid_amount ELSE 0 END), 0) as over_90_days,
    COALESCE(SUM(b.total_amount - b.paid_amount), 0) as total_outstanding
  FROM public.vendors v
  LEFT JOIN public.bills b ON b.vendor_id = v.id 
    AND b.tenant_id = p_tenant_id
    AND b.status NOT IN ('draft', 'cancelled', 'paid')
  WHERE v.tenant_id = p_tenant_id
  GROUP BY v.id, v.name
  HAVING COALESCE(SUM(b.total_amount - b.paid_amount), 0) > 0
  ORDER BY total_outstanding DESC;
END;
$$;


--
-- Name: calculate_ar_aging_detail(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_ar_aging_detail(p_tenant_id uuid, p_as_of_date date DEFAULT CURRENT_DATE) RETURNS TABLE(customer_id uuid, customer_name text, current_amount numeric, days_1_30 numeric, days_31_60 numeric, days_61_90 numeric, over_90_days numeric, total_outstanding numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as customer_id,
    c.name as customer_name,
    COALESCE(SUM(CASE WHEN (p_as_of_date - i.due_date) <= 0 THEN i.total_amount - i.paid_amount ELSE 0 END), 0) as current_amount,
    COALESCE(SUM(CASE WHEN (p_as_of_date - i.due_date) BETWEEN 1 AND 30 THEN i.total_amount - i.paid_amount ELSE 0 END), 0) as days_1_30,
    COALESCE(SUM(CASE WHEN (p_as_of_date - i.due_date) BETWEEN 31 AND 60 THEN i.total_amount - i.paid_amount ELSE 0 END), 0) as days_31_60,
    COALESCE(SUM(CASE WHEN (p_as_of_date - i.due_date) BETWEEN 61 AND 90 THEN i.total_amount - i.paid_amount ELSE 0 END), 0) as days_61_90,
    COALESCE(SUM(CASE WHEN (p_as_of_date - i.due_date) > 90 THEN i.total_amount - i.paid_amount ELSE 0 END), 0) as over_90_days,
    COALESCE(SUM(i.total_amount - i.paid_amount), 0) as total_outstanding
  FROM public.customers c
  LEFT JOIN public.invoices i ON i.customer_id = c.id 
    AND i.tenant_id = p_tenant_id
    AND i.status NOT IN ('draft', 'cancelled', 'paid')
  WHERE c.tenant_id = p_tenant_id
  GROUP BY c.id, c.name
  HAVING COALESCE(SUM(i.total_amount - i.paid_amount), 0) > 0
  ORDER BY total_outstanding DESC;
END;
$$;


--
-- Name: calculate_asset_depreciation(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_asset_depreciation(p_asset_id uuid) RETURNS TABLE(period_date date, depreciation_amount numeric, accumulated_amount numeric, remaining_value numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_asset record;
  v_monthly_depreciation numeric;
  v_current_accumulated numeric := 0;
  v_period date;
BEGIN
  SELECT * INTO v_asset FROM public.fixed_assets WHERE id = p_asset_id;
  
  IF v_asset IS NULL THEN
    RETURN;
  END IF;

  -- Straight line depreciation
  v_monthly_depreciation := (v_asset.purchase_value - v_asset.residual_value) / v_asset.useful_life_months;
  
  FOR i IN 1..v_asset.useful_life_months LOOP
    v_period := v_asset.purchase_date + (i || ' months')::interval;
    v_current_accumulated := v_current_accumulated + v_monthly_depreciation;
    
    RETURN QUERY SELECT 
      v_period,
      v_monthly_depreciation,
      v_current_accumulated,
      v_asset.purchase_value - v_current_accumulated;
  END LOOP;
END;
$$;


--
-- Name: close_financial_period(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.close_financial_period(p_period_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_unposted_count integer;
  v_period record;
BEGIN
  -- Get period info
  SELECT * INTO v_period FROM public.financial_periods WHERE id = p_period_id;
  
  IF v_period IS NULL THEN
    RAISE EXCEPTION 'Kỳ kế toán không tồn tại';
  END IF;
  
  IF v_period.is_closed THEN
    RAISE EXCEPTION 'Kỳ kế toán đã được đóng';
  END IF;
  
  -- Check for unposted journal entries
  SELECT COUNT(*) INTO v_unposted_count
  FROM public.journal_entries
  WHERE period_id = p_period_id
    AND status = 'draft';
  
  IF v_unposted_count > 0 THEN
    RAISE EXCEPTION 'Còn % bút toán chưa ghi sổ trong kỳ này', v_unposted_count;
  END IF;
  
  -- Close the period
  UPDATE public.financial_periods
  SET 
    is_closed = true,
    closed_at = now(),
    closed_by = auth.uid()
  WHERE id = p_period_id;
  
  RETURN true;
END;
$$;


--
-- Name: create_journal_entry_for_bill(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_journal_entry_for_bill() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_defaults record;
  v_entry_id uuid;
  v_entry_number text;
  v_period_id uuid;
BEGIN
  -- Only create JE when bill status changes to 'approved'
  IF NEW.status != 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Get GL defaults
  SELECT * INTO v_defaults
  FROM public.gl_account_defaults
  WHERE tenant_id = NEW.tenant_id;

  -- Skip if no defaults configured
  IF v_defaults IS NULL OR v_defaults.accounts_payable_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get period
  SELECT id INTO v_period_id
  FROM public.financial_periods
  WHERE tenant_id = NEW.tenant_id
    AND NEW.bill_date BETWEEN start_date AND end_date
    AND is_closed = false
  LIMIT 1;

  -- Generate entry number
  v_entry_number := generate_journal_entry_number(NEW.tenant_id);

  -- Create journal entry header
  INSERT INTO public.journal_entries (
    tenant_id, entry_number, entry_date, period_id,
    description, reference, source_type, source_id,
    status, created_by
  ) VALUES (
    NEW.tenant_id, v_entry_number, NEW.bill_date, v_period_id,
    'Hóa đơn mua hàng: ' || NEW.bill_number || ' - ' || NEW.vendor_name,
    NEW.bill_number, 'bill', NEW.id,
    'draft', NEW.created_by
  ) RETURNING id INTO v_entry_id;

  -- Update bill with journal entry reference
  NEW.journal_entry_id := v_entry_id;

  -- DR: Purchase Expense (subtotal)
  IF v_defaults.purchase_expense_id IS NOT NULL THEN
    INSERT INTO public.journal_entry_lines (
      tenant_id, journal_entry_id, account_id,
      debit_amount, credit_amount, description, line_number
    ) VALUES (
      NEW.tenant_id, v_entry_id, COALESCE(NEW.gl_account_id, v_defaults.purchase_expense_id),
      NEW.subtotal, 0, 'Chi phí mua hàng', 1
    );
  END IF;

  -- DR: VAT Deductible (vat_amount)
  IF v_defaults.purchase_vat_id IS NOT NULL AND NEW.vat_amount > 0 THEN
    INSERT INTO public.journal_entry_lines (
      tenant_id, journal_entry_id, account_id,
      debit_amount, credit_amount, description, line_number
    ) VALUES (
      NEW.tenant_id, v_entry_id, v_defaults.purchase_vat_id,
      NEW.vat_amount, 0, 'Thuế GTGT đầu vào', 2
    );
  END IF;

  -- CR: Accounts Payable (total_amount)
  INSERT INTO public.journal_entry_lines (
    tenant_id, journal_entry_id, account_id,
    debit_amount, credit_amount, description, line_number
  ) VALUES (
    NEW.tenant_id, v_entry_id, v_defaults.accounts_payable_id,
    0, NEW.total_amount, 'Phải trả nhà cung cấp', 3
  );

  RETURN NEW;
END;
$$;


--
-- Name: create_journal_entry_for_credit_note(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_journal_entry_for_credit_note() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_defaults record;
  v_entry_id uuid;
  v_entry_number text;
  v_period_id uuid;
BEGIN
  -- Only create JE when status changes to 'approved'
  IF NEW.status != 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Get GL defaults
  SELECT * INTO v_defaults
  FROM public.gl_account_defaults
  WHERE tenant_id = NEW.tenant_id;

  IF v_defaults IS NULL OR v_defaults.accounts_receivable_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get period
  SELECT id INTO v_period_id
  FROM public.financial_periods
  WHERE tenant_id = NEW.tenant_id
    AND NEW.credit_note_date BETWEEN start_date AND end_date
    AND is_closed = false
  LIMIT 1;

  v_entry_number := generate_journal_entry_number(NEW.tenant_id);

  -- Create journal entry
  -- Credit Note: DR Sales Revenue/Sales Returns, CR Accounts Receivable
  INSERT INTO public.journal_entries (
    tenant_id, entry_number, entry_date, period_id,
    description, reference, source_type, source_id,
    status, created_by
  ) VALUES (
    NEW.tenant_id, v_entry_number, NEW.credit_note_date, v_period_id,
    'Giảm giá/Trả lại: ' || NEW.credit_note_number,
    NEW.credit_note_number, 'credit_note', NEW.id,
    'draft', NEW.created_by
  ) RETURNING id INTO v_entry_id;

  -- DR: Sales Returns (or reduce Sales Revenue)
  INSERT INTO public.journal_entry_lines (
    tenant_id, journal_entry_id, account_id,
    debit_amount, credit_amount, description, line_number
  ) VALUES (
    NEW.tenant_id, v_entry_id, 
    COALESCE(v_defaults.sales_discount_id, v_defaults.sales_revenue_id),
    NEW.subtotal, 0, 'Giảm doanh thu', 1
  );

  -- DR: VAT Output (reduce VAT liability)
  IF v_defaults.sales_vat_id IS NOT NULL AND NEW.vat_amount > 0 THEN
    INSERT INTO public.journal_entry_lines (
      tenant_id, journal_entry_id, account_id,
      debit_amount, credit_amount, description, line_number
    ) VALUES (
      NEW.tenant_id, v_entry_id, v_defaults.sales_vat_id,
      NEW.vat_amount, 0, 'Giảm thuế GTGT đầu ra', 2
    );
  END IF;

  -- CR: Accounts Receivable
  INSERT INTO public.journal_entry_lines (
    tenant_id, journal_entry_id, account_id,
    debit_amount, credit_amount, description, line_number
  ) VALUES (
    NEW.tenant_id, v_entry_id, v_defaults.accounts_receivable_id,
    0, NEW.total_amount, 'Giảm phải thu khách hàng', 3
  );

  NEW.journal_entry_id := v_entry_id;
  NEW.approved_at := now();

  RETURN NEW;
END;
$$;


--
-- Name: create_journal_entry_for_debit_note(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_journal_entry_for_debit_note() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_defaults record;
  v_entry_id uuid;
  v_entry_number text;
  v_period_id uuid;
BEGIN
  -- Only create JE when status changes to 'approved'
  IF NEW.status != 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_defaults
  FROM public.gl_account_defaults
  WHERE tenant_id = NEW.tenant_id;

  IF v_defaults IS NULL OR v_defaults.accounts_receivable_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_period_id
  FROM public.financial_periods
  WHERE tenant_id = NEW.tenant_id
    AND NEW.debit_note_date BETWEEN start_date AND end_date
    AND is_closed = false
  LIMIT 1;

  v_entry_number := generate_journal_entry_number(NEW.tenant_id);

  -- Debit Note: DR Accounts Receivable, CR Sales Revenue
  INSERT INTO public.journal_entries (
    tenant_id, entry_number, entry_date, period_id,
    description, reference, source_type, source_id,
    status, created_by
  ) VALUES (
    NEW.tenant_id, v_entry_number, NEW.debit_note_date, v_period_id,
    'Phụ thu/Điều chỉnh tăng: ' || NEW.debit_note_number,
    NEW.debit_note_number, 'debit_note', NEW.id,
    'draft', NEW.created_by
  ) RETURNING id INTO v_entry_id;

  -- DR: Accounts Receivable
  INSERT INTO public.journal_entry_lines (
    tenant_id, journal_entry_id, account_id,
    debit_amount, credit_amount, description, line_number
  ) VALUES (
    NEW.tenant_id, v_entry_id, v_defaults.accounts_receivable_id,
    NEW.total_amount, 0, 'Tăng phải thu khách hàng', 1
  );

  -- CR: Sales Revenue
  IF v_defaults.sales_revenue_id IS NOT NULL THEN
    INSERT INTO public.journal_entry_lines (
      tenant_id, journal_entry_id, account_id,
      debit_amount, credit_amount, description, line_number
    ) VALUES (
      NEW.tenant_id, v_entry_id, v_defaults.sales_revenue_id,
      0, NEW.subtotal, 'Tăng doanh thu', 2
    );
  END IF;

  -- CR: VAT Output
  IF v_defaults.sales_vat_id IS NOT NULL AND NEW.vat_amount > 0 THEN
    INSERT INTO public.journal_entry_lines (
      tenant_id, journal_entry_id, account_id,
      debit_amount, credit_amount, description, line_number
    ) VALUES (
      NEW.tenant_id, v_entry_id, v_defaults.sales_vat_id,
      0, NEW.vat_amount, 'Tăng thuế GTGT đầu ra', 3
    );
  END IF;

  NEW.journal_entry_id := v_entry_id;
  NEW.approved_at := now();

  RETURN NEW;
END;
$$;


--
-- Name: create_journal_entry_for_invoice(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_journal_entry_for_invoice() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_defaults record;
  v_entry_id uuid;
  v_entry_number text;
  v_period_id uuid;
BEGIN
  -- Only create JE when invoice status changes to 'sent' (posted)
  IF NEW.status != 'sent' OR OLD.status = 'sent' THEN
    RETURN NEW;
  END IF;

  -- Get GL defaults
  SELECT * INTO v_defaults
  FROM public.gl_account_defaults
  WHERE tenant_id = NEW.tenant_id;

  -- Skip if no defaults configured
  IF v_defaults IS NULL OR v_defaults.accounts_receivable_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get or skip period
  SELECT id INTO v_period_id
  FROM public.financial_periods
  WHERE tenant_id = NEW.tenant_id
    AND NEW.issue_date BETWEEN start_date AND end_date
    AND is_closed = false
  LIMIT 1;

  -- Generate entry number
  v_entry_number := generate_journal_entry_number(NEW.tenant_id);

  -- Create journal entry header
  INSERT INTO public.journal_entries (
    tenant_id, entry_number, entry_date, period_id,
    description, reference, source_type, source_id,
    status, created_by
  ) VALUES (
    NEW.tenant_id, v_entry_number, NEW.issue_date, v_period_id,
    'Hóa đơn bán hàng: ' || NEW.invoice_number,
    NEW.invoice_number, 'invoice', NEW.id,
    'draft', NEW.created_by
  ) RETURNING id INTO v_entry_id;

  -- DR: Accounts Receivable (total_amount)
  INSERT INTO public.journal_entry_lines (
    tenant_id, journal_entry_id, account_id,
    debit_amount, credit_amount, description, line_number
  ) VALUES (
    NEW.tenant_id, v_entry_id, v_defaults.accounts_receivable_id,
    NEW.total_amount, 0, 'Phải thu khách hàng', 1
  );

  -- CR: Sales Revenue (subtotal)
  IF v_defaults.sales_revenue_id IS NOT NULL AND NEW.subtotal > 0 THEN
    INSERT INTO public.journal_entry_lines (
      tenant_id, journal_entry_id, account_id,
      debit_amount, credit_amount, description, line_number
    ) VALUES (
      NEW.tenant_id, v_entry_id, v_defaults.sales_revenue_id,
      0, NEW.subtotal, 'Doanh thu bán hàng', 2
    );
  END IF;

  -- CR: VAT Payable (vat_amount)
  IF v_defaults.sales_vat_id IS NOT NULL AND NEW.vat_amount > 0 THEN
    INSERT INTO public.journal_entry_lines (
      tenant_id, journal_entry_id, account_id,
      debit_amount, credit_amount, description, line_number
    ) VALUES (
      NEW.tenant_id, v_entry_id, v_defaults.sales_vat_id,
      0, NEW.vat_amount, 'Thuế GTGT đầu ra', 3
    );
  END IF;

  -- DR: Sales Discount (if any)
  IF v_defaults.sales_discount_id IS NOT NULL AND COALESCE(NEW.discount_amount, 0) > 0 THEN
    INSERT INTO public.journal_entry_lines (
      tenant_id, journal_entry_id, account_id,
      debit_amount, credit_amount, description, line_number
    ) VALUES (
      NEW.tenant_id, v_entry_id, v_defaults.sales_discount_id,
      NEW.discount_amount, 0, 'Chiết khấu bán hàng', 4
    );
    
    -- Adjust revenue credit
    UPDATE public.journal_entry_lines
    SET credit_amount = credit_amount + NEW.discount_amount
    WHERE journal_entry_id = v_entry_id AND line_number = 2;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: create_journal_entry_for_payment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_journal_entry_for_payment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_defaults record;
  v_entry_id uuid;
  v_entry_number text;
  v_period_id uuid;
  v_invoice record;
  v_cash_account_id uuid;
BEGIN
  -- Get invoice details
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = NEW.invoice_id;

  IF v_invoice IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get GL defaults
  SELECT * INTO v_defaults
  FROM public.gl_account_defaults
  WHERE tenant_id = NEW.tenant_id;

  -- Skip if no defaults configured
  IF v_defaults IS NULL OR v_defaults.accounts_receivable_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine cash/bank account
  IF NEW.payment_method IN ('bank_transfer', 'check') THEN
    v_cash_account_id := v_defaults.bank_id;
  ELSE
    v_cash_account_id := v_defaults.cash_id;
  END IF;

  IF v_cash_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get period
  SELECT id INTO v_period_id
  FROM public.financial_periods
  WHERE tenant_id = NEW.tenant_id
    AND NEW.payment_date BETWEEN start_date AND end_date
    AND is_closed = false
  LIMIT 1;

  -- Generate entry number
  v_entry_number := generate_journal_entry_number(NEW.tenant_id);

  -- Create journal entry header
  INSERT INTO public.journal_entries (
    tenant_id, entry_number, entry_date, period_id,
    description, reference, source_type, source_id,
    status, created_by
  ) VALUES (
    NEW.tenant_id, v_entry_number, NEW.payment_date, v_period_id,
    'Thu tiền hóa đơn: ' || v_invoice.invoice_number,
    NEW.reference_code, 'payment', NEW.id,
    'draft', NEW.created_by
  ) RETURNING id INTO v_entry_id;

  -- DR: Cash/Bank
  INSERT INTO public.journal_entry_lines (
    tenant_id, journal_entry_id, account_id,
    debit_amount, credit_amount, description, line_number
  ) VALUES (
    NEW.tenant_id, v_entry_id, v_cash_account_id,
    NEW.amount, 0, 'Thu tiền ' || COALESCE(NEW.payment_method, 'cash'), 1
  );

  -- CR: Accounts Receivable
  INSERT INTO public.journal_entry_lines (
    tenant_id, journal_entry_id, account_id,
    debit_amount, credit_amount, description, line_number
  ) VALUES (
    NEW.tenant_id, v_entry_id, v_defaults.accounts_receivable_id,
    0, NEW.amount, 'Giảm phải thu khách hàng', 2
  );

  RETURN NEW;
END;
$$;


--
-- Name: create_journal_entry_for_vendor_payment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_journal_entry_for_vendor_payment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_defaults record;
  v_entry_id uuid;
  v_entry_number text;
  v_period_id uuid;
  v_bill record;
  v_cash_account_id uuid;
BEGIN
  -- Get bill details
  SELECT * INTO v_bill
  FROM public.bills
  WHERE id = NEW.bill_id;

  -- Get GL defaults
  SELECT * INTO v_defaults
  FROM public.gl_account_defaults
  WHERE tenant_id = NEW.tenant_id;

  -- Skip if no defaults configured
  IF v_defaults IS NULL OR v_defaults.accounts_payable_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine cash/bank account
  IF NEW.payment_method IN ('bank_transfer', 'check') THEN
    v_cash_account_id := v_defaults.bank_id;
  ELSE
    v_cash_account_id := v_defaults.cash_id;
  END IF;

  IF v_cash_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get period
  SELECT id INTO v_period_id
  FROM public.financial_periods
  WHERE tenant_id = NEW.tenant_id
    AND NEW.payment_date BETWEEN start_date AND end_date
    AND is_closed = false
  LIMIT 1;

  -- Generate entry number
  v_entry_number := generate_journal_entry_number(NEW.tenant_id);

  -- Create journal entry header
  INSERT INTO public.journal_entries (
    tenant_id, entry_number, entry_date, period_id,
    description, reference, source_type, source_id,
    status, created_by
  ) VALUES (
    NEW.tenant_id, v_entry_number, NEW.payment_date, v_period_id,
    'Chi tiền NCC: ' || COALESCE(v_bill.bill_number, NEW.payment_number),
    NEW.reference_code, 'vendor_payment', NEW.id,
    'draft', NEW.created_by
  ) RETURNING id INTO v_entry_id;

  -- Update vendor payment with journal entry reference
  NEW.journal_entry_id := v_entry_id;

  -- DR: Accounts Payable
  INSERT INTO public.journal_entry_lines (
    tenant_id, journal_entry_id, account_id,
    debit_amount, credit_amount, description, line_number
  ) VALUES (
    NEW.tenant_id, v_entry_id, v_defaults.accounts_payable_id,
    NEW.amount, 0, 'Giảm phải trả nhà cung cấp', 1
  );

  -- CR: Cash/Bank
  INSERT INTO public.journal_entry_lines (
    tenant_id, journal_entry_id, account_id,
    debit_amount, credit_amount, description, line_number
  ) VALUES (
    NEW.tenant_id, v_entry_id, v_cash_account_id,
    0, NEW.amount, 'Chi tiền ' || COALESCE(NEW.payment_method, 'cash'), 2
  );

  RETURN NEW;
END;
$$;


--
-- Name: ensure_single_primary_scenario(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_single_primary_scenario() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Set all other scenarios in the same tenant to not primary
    UPDATE public.scenarios 
    SET is_primary = false 
    WHERE tenant_id = NEW.tenant_id 
      AND id != NEW.id 
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: generate_asset_code(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_asset_code(p_tenant_id uuid, p_category text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
  v_prefix text;
BEGIN
  -- Prefix based on asset category
  CASE p_category
    WHEN 'building' THEN v_prefix := 'BLD';
    WHEN 'vehicle' THEN v_prefix := 'VEH';
    WHEN 'machinery' THEN v_prefix := 'MCH';
    WHEN 'equipment' THEN v_prefix := 'EQP';
    WHEN 'furniture' THEN v_prefix := 'FRN';
    WHEN 'computer' THEN v_prefix := 'CMP';
    WHEN 'software' THEN v_prefix := 'SFT';
    ELSE v_prefix := 'AST';
  END CASE;
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.fixed_assets
  WHERE tenant_id = p_tenant_id
    AND asset_code LIKE v_prefix || '-%';
  
  RETURN v_prefix || '-' || LPAD(v_count::text, 5, '0');
END;
$$;


--
-- Name: generate_bill_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_bill_number(p_tenant_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
  v_year text;
  v_month text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_month := to_char(CURRENT_DATE, 'MM');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.bills
  WHERE tenant_id = p_tenant_id
    AND bill_number LIKE 'BILL-' || v_year || v_month || '-%';
  
  RETURN 'BILL-' || v_year || v_month || '-' || LPAD(v_count::text, 5, '0');
END;
$$;


--
-- Name: generate_credit_note_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_credit_note_number(p_tenant_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
  v_year text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.credit_notes
  WHERE tenant_id = p_tenant_id
    AND credit_note_number LIKE 'CN-' || v_year || '-%';
  
  RETURN 'CN-' || v_year || '-' || LPAD(v_count::text, 5, '0');
END;
$$;


--
-- Name: generate_debit_note_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_debit_note_number(p_tenant_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
  v_year text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.debit_notes
  WHERE tenant_id = p_tenant_id
    AND debit_note_number LIKE 'DN-' || v_year || '-%';
  
  RETURN 'DN-' || v_year || '-' || LPAD(v_count::text, 5, '0');
END;
$$;


--
-- Name: generate_invoice_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invoice_number(p_tenant_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
  v_year text;
  v_month text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_month := to_char(CURRENT_DATE, 'MM');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.invoices
  WHERE tenant_id = p_tenant_id
    AND invoice_number LIKE 'INV-' || v_year || v_month || '-%';
  
  RETURN 'INV-' || v_year || v_month || '-' || LPAD(v_count::text, 5, '0');
END;
$$;


--
-- Name: generate_journal_entry_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_journal_entry_number(p_tenant_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
  v_year text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.journal_entries
  WHERE tenant_id = p_tenant_id
    AND entry_number LIKE 'JE-' || v_year || '-%';
  
  RETURN 'JE-' || v_year || '-' || LPAD(v_count::text, 6, '0');
END;
$$;


--
-- Name: generate_order_number(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number(p_tenant_id uuid, p_source text DEFAULT 'manual'::text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
  v_year text;
  v_prefix text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  
  -- Different prefix based on source
  CASE p_source
    WHEN 'shopee' THEN v_prefix := 'SPE';
    WHEN 'lazada' THEN v_prefix := 'LZD';
    WHEN 'tiktok' THEN v_prefix := 'TTK';
    WHEN 'website' THEN v_prefix := 'WEB';
    ELSE v_prefix := 'ORD';
  END CASE;
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.orders
  WHERE tenant_id = p_tenant_id
    AND order_number LIKE v_prefix || '-' || v_year || '-%';
  
  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_count::text, 6, '0');
END;
$$;


--
-- Name: generate_payment_number(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_payment_number(p_tenant_id uuid, p_type text DEFAULT 'receipt'::text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
  v_year text;
  v_prefix text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  
  IF p_type = 'receipt' THEN
    v_prefix := 'PT'; -- Phiếu Thu
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.payments
    WHERE tenant_id = p_tenant_id
      AND reference_code LIKE v_prefix || '-' || v_year || '-%';
  ELSE
    v_prefix := 'PC'; -- Phiếu Chi
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.vendor_payments
    WHERE tenant_id = p_tenant_id
      AND payment_number LIKE v_prefix || '-' || v_year || '-%';
  END IF;
  
  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_count::text, 6, '0');
END;
$$;


--
-- Name: generate_trial_balance(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_trial_balance(p_tenant_id uuid, p_start_date date, p_end_date date) RETURNS TABLE(account_id uuid, account_code text, account_name text, account_type text, opening_debit numeric, opening_credit numeric, period_debit numeric, period_credit numeric, closing_debit numeric, closing_credit numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH opening_balances AS (
    SELECT 
      jel.account_id,
      SUM(jel.debit_amount) as total_debit,
      SUM(jel.credit_amount) as total_credit
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    WHERE je.tenant_id = p_tenant_id
      AND je.status = 'posted'
      AND je.entry_date < p_start_date
    GROUP BY jel.account_id
  ),
  period_movements AS (
    SELECT 
      jel.account_id,
      SUM(jel.debit_amount) as total_debit,
      SUM(jel.credit_amount) as total_credit
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    WHERE je.tenant_id = p_tenant_id
      AND je.status = 'posted'
      AND je.entry_date BETWEEN p_start_date AND p_end_date
    GROUP BY jel.account_id
  )
  SELECT 
    ga.id as account_id,
    ga.account_code,
    ga.account_name,
    ga.account_type,
    CASE WHEN ga.normal_balance = 'debit' 
      THEN GREATEST(COALESCE(ob.total_debit, 0) - COALESCE(ob.total_credit, 0), 0)
      ELSE 0 
    END as opening_debit,
    CASE WHEN ga.normal_balance = 'credit' 
      THEN GREATEST(COALESCE(ob.total_credit, 0) - COALESCE(ob.total_debit, 0), 0)
      ELSE 0 
    END as opening_credit,
    COALESCE(pm.total_debit, 0) as period_debit,
    COALESCE(pm.total_credit, 0) as period_credit,
    CASE WHEN ga.normal_balance = 'debit' 
      THEN GREATEST(
        COALESCE(ob.total_debit, 0) - COALESCE(ob.total_credit, 0) + 
        COALESCE(pm.total_debit, 0) - COALESCE(pm.total_credit, 0), 0)
      ELSE 0 
    END as closing_debit,
    CASE WHEN ga.normal_balance = 'credit' 
      THEN GREATEST(
        COALESCE(ob.total_credit, 0) - COALESCE(ob.total_debit, 0) + 
        COALESCE(pm.total_credit, 0) - COALESCE(pm.total_debit, 0), 0)
      ELSE 0 
    END as closing_credit
  FROM public.gl_accounts ga
  LEFT JOIN opening_balances ob ON ob.account_id = ga.id
  LEFT JOIN period_movements pm ON pm.account_id = ga.id
  WHERE ga.tenant_id = p_tenant_id
    AND ga.is_active = true
    AND ga.is_header = false
  ORDER BY ga.account_code;
END;
$$;


--
-- Name: generate_vendor_credit_note_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_vendor_credit_note_number(p_tenant_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
  v_year text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.vendor_credit_notes
  WHERE tenant_id = p_tenant_id
    AND credit_note_number LIKE 'VCN-' || v_year || '-%';
  
  RETURN 'VCN-' || v_year || '-' || LPAD(v_count::text, 5, '0');
END;
$$;


--
-- Name: get_active_tenant_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_tenant_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT active_tenant_id 
  FROM public.profiles 
  WHERE id = auth.uid()
$$;


--
-- Name: get_exchange_rate(uuid, text, text, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_exchange_rate(p_tenant_id uuid, p_from_currency text, p_to_currency text, p_date date DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_rate numeric;
BEGIN
  IF p_from_currency = p_to_currency THEN
    RETURN 1;
  END IF;

  SELECT er.rate INTO v_rate
  FROM public.exchange_rates er
  JOIN public.currencies fc ON fc.id = er.from_currency_id
  JOIN public.currencies tc ON tc.id = er.to_currency_id
  WHERE er.tenant_id = p_tenant_id
    AND fc.code = p_from_currency
    AND tc.code = p_to_currency
    AND er.effective_date <= p_date
  ORDER BY er.effective_date DESC
  LIMIT 1;

  RETURN COALESCE(v_rate, 1);
END;
$$;


--
-- Name: get_user_tenant_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_tenant_ids(_user_id uuid) RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT tenant_id 
  FROM public.tenant_users 
  WHERE user_id = _user_id AND is_active = true
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_tenant_id uuid;
  user_count INTEGER;
  assigned_role app_role;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'viewer';
  END IF;
  
  -- Create default tenant for new user
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'My Company'),
    LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'company-' || SUBSTRING(NEW.id::text, 1, 8)), ' ', '-'))
  )
  RETURNING id INTO new_tenant_id;
  
  -- Create profile with active tenant
  INSERT INTO public.profiles (id, full_name, active_tenant_id)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', new_tenant_id);
  
  -- Add user as owner of the tenant
  INSERT INTO public.tenant_users (tenant_id, user_id, role, joined_at)
  VALUES (new_tenant_id, NEW.id, 'owner', now());
  
  -- Assign app role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: has_tenant_access(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_tenant_access(_tenant_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    -- Super admins can access any tenant
    is_super_admin()
    OR
    -- Regular users can only access tenants they are members of
    EXISTS (
      SELECT 1 
      FROM public.tenant_users 
      WHERE tenant_id = _tenant_id 
        AND user_id = auth.uid() 
        AND is_active = true
    )
$$;


--
-- Name: has_tenant_role(uuid, public.tenant_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_tenant_role(_tenant_id uuid, _role public.tenant_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.tenant_users 
    WHERE tenant_id = _tenant_id 
      AND user_id = auth.uid() 
      AND role = _role
      AND is_active = true
  )
$$;


--
-- Name: is_authenticated(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_authenticated() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL
$$;


--
-- Name: is_super_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;


--
-- Name: is_tenant_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_tenant_admin(_tenant_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    -- Super admins can act as admin on any tenant
    is_super_admin()
    OR
    -- Regular tenant admins/owners
    EXISTS (
      SELECT 1 
      FROM public.tenant_users 
      WHERE tenant_id = _tenant_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
$$;


--
-- Name: post_journal_entry(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.post_journal_entry(p_entry_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_debit numeric;
  v_total_credit numeric;
  v_entry_date date;
  v_period_closed boolean;
  v_line record;
BEGIN
  -- Get entry totals
  SELECT total_debit, total_credit, entry_date 
  INTO v_total_debit, v_total_credit, v_entry_date
  FROM public.journal_entries 
  WHERE id = p_entry_id;

  -- Validate balanced entry
  IF v_total_debit != v_total_credit THEN
    RAISE EXCEPTION 'Bút toán không cân: Nợ (%) ≠ Có (%)', v_total_debit, v_total_credit;
  END IF;

  -- Validate entry has lines
  IF v_total_debit = 0 THEN
    RAISE EXCEPTION 'Bút toán phải có ít nhất một dòng chi tiết';
  END IF;

  -- Check period not closed
  SELECT is_closed INTO v_period_closed
  FROM public.financial_periods
  WHERE id = (SELECT period_id FROM public.journal_entries WHERE id = p_entry_id);
  
  IF v_period_closed = true THEN
    RAISE EXCEPTION 'Kỳ kế toán đã đóng, không thể ghi nhận bút toán';
  END IF;

  -- Update GL account balances
  FOR v_line IN 
    SELECT jel.account_id, jel.debit_amount, jel.credit_amount, ga.normal_balance
    FROM public.journal_entry_lines jel
    JOIN public.gl_accounts ga ON ga.id = jel.account_id
    WHERE jel.journal_entry_id = p_entry_id
  LOOP
    UPDATE public.gl_accounts
    SET current_balance = current_balance + 
      CASE 
        WHEN v_line.normal_balance = 'debit' THEN v_line.debit_amount - v_line.credit_amount
        ELSE v_line.credit_amount - v_line.debit_amount
      END
    WHERE id = v_line.account_id;
  END LOOP;

  -- Mark entry as posted
  UPDATE public.journal_entries
  SET 
    status = 'posted',
    posted_at = now(),
    posted_by = auth.uid()
  WHERE id = p_entry_id;

  RETURN true;
END;
$$;


--
-- Name: recalculate_bill_totals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalculate_bill_totals() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_bill_id uuid;
  v_subtotal numeric;
  v_vat_amount numeric;
  v_discount numeric;
  v_total numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_bill_id := OLD.bill_id;
  ELSE
    v_bill_id := NEW.bill_id;
  END IF;

  IF v_bill_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(amount * COALESCE(vat_rate, 0) / 100), 0)
  INTO v_subtotal, v_vat_amount
  FROM public.bill_items
  WHERE bill_id = v_bill_id;

  SELECT COALESCE(discount_amount, 0) INTO v_discount
  FROM public.bills WHERE id = v_bill_id;

  v_total := v_subtotal + v_vat_amount - v_discount;

  UPDATE public.bills
  SET 
    subtotal = v_subtotal,
    vat_amount = v_vat_amount,
    total_amount = v_total,
    updated_at = now()
  WHERE id = v_bill_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


--
-- Name: recalculate_credit_note_totals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalculate_credit_note_totals() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_credit_note_id uuid;
  v_subtotal numeric;
  v_vat_amount numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_credit_note_id := OLD.credit_note_id;
  ELSE
    v_credit_note_id := NEW.credit_note_id;
  END IF;

  IF v_credit_note_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(amount * COALESCE(vat_rate, 0) / 100), 0)
  INTO v_subtotal, v_vat_amount
  FROM public.credit_note_items
  WHERE credit_note_id = v_credit_note_id;

  UPDATE public.credit_notes
  SET 
    subtotal = v_subtotal,
    vat_amount = v_vat_amount,
    total_amount = v_subtotal + v_vat_amount,
    updated_at = now()
  WHERE id = v_credit_note_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


--
-- Name: recalculate_debit_note_totals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalculate_debit_note_totals() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_debit_note_id uuid;
  v_subtotal numeric;
  v_vat_amount numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_debit_note_id := OLD.debit_note_id;
  ELSE
    v_debit_note_id := NEW.debit_note_id;
  END IF;

  IF v_debit_note_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(amount * COALESCE(vat_rate, 0) / 100), 0)
  INTO v_subtotal, v_vat_amount
  FROM public.debit_note_items
  WHERE debit_note_id = v_debit_note_id;

  UPDATE public.debit_notes
  SET 
    subtotal = v_subtotal,
    vat_amount = v_vat_amount,
    total_amount = v_subtotal + v_vat_amount,
    updated_at = now()
  WHERE id = v_debit_note_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


--
-- Name: recalculate_invoice_on_discount_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalculate_invoice_on_discount_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only recalculate if discount changed
  IF OLD.discount_amount IS DISTINCT FROM NEW.discount_amount THEN
    NEW.total_amount := NEW.subtotal + NEW.vat_amount - COALESCE(NEW.discount_amount, 0);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: recalculate_invoice_totals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalculate_invoice_totals() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_invoice_id uuid;
  v_subtotal numeric;
  v_vat_amount numeric;
  v_discount numeric;
  v_total numeric;
BEGIN
  -- Get the invoice_id from the affected row
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- Skip if no invoice_id
  IF v_invoice_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Calculate subtotal and VAT from all items
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(amount * COALESCE(vat_rate, 0) / 100), 0)
  INTO v_subtotal, v_vat_amount
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id;

  -- Get current discount
  SELECT COALESCE(discount_amount, 0) INTO v_discount
  FROM public.invoices
  WHERE id = v_invoice_id;

  -- Calculate total
  v_total := v_subtotal + v_vat_amount - v_discount;

  -- Update invoice
  UPDATE public.invoices
  SET 
    subtotal = v_subtotal,
    vat_amount = v_vat_amount,
    total_amount = v_total,
    updated_at = now()
  WHERE id = v_invoice_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


--
-- Name: refresh_channel_analytics_cache(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_channel_analytics_cache(p_tenant_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_orders integer := 0;
  v_gross_revenue numeric := 0;
  v_net_revenue numeric := 0;
  v_total_fees numeric := 0;
  v_total_cogs numeric := 0;
  v_gross_profit numeric := 0;
  v_cancelled integer := 0;
  v_returned integer := 0;
  v_channel_metrics jsonb := '{}';
  v_fee_breakdown jsonb := '{}';
  v_status_breakdown jsonb := '{}';
  v_data_start date;
  v_data_end date;
BEGIN
  -- Get date range
  SELECT MIN(order_date::date), MAX(order_date::date)
  INTO v_data_start, v_data_end
  FROM external_orders
  WHERE tenant_id = p_tenant_id;

  -- Aggregate totals from completed orders
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_amount), 0),
    COALESCE(SUM(seller_income), 0),
    COALESCE(SUM(COALESCE(platform_fee, 0) + COALESCE(commission_fee, 0) + COALESCE(payment_fee, 0) + COALESCE(shipping_fee, 0)), 0),
    COALESCE(SUM(cost_of_goods), 0),
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END),
    COUNT(CASE WHEN status = 'returned' THEN 1 END)
  INTO v_total_orders, v_gross_revenue, v_net_revenue, v_total_fees, v_total_cogs, v_cancelled, v_returned
  FROM external_orders
  WHERE tenant_id = p_tenant_id;

  v_gross_profit := v_net_revenue - v_total_cogs;

  -- Channel breakdown
  SELECT jsonb_object_agg(
    channel,
    jsonb_build_object(
      'orders', channel_orders,
      'revenue', channel_revenue,
      'fees', channel_fees,
      'cogs', channel_cogs,
      'profit', channel_revenue - channel_fees - channel_cogs,
      'aov', CASE WHEN channel_orders > 0 THEN channel_revenue / channel_orders ELSE 0 END
    )
  ) INTO v_channel_metrics
  FROM (
    SELECT 
      UPPER(channel) as channel,
      COUNT(*) as channel_orders,
      SUM(total_amount) as channel_revenue,
      SUM(COALESCE(platform_fee, 0) + COALESCE(commission_fee, 0) + COALESCE(payment_fee, 0)) as channel_fees,
      SUM(COALESCE(cost_of_goods, 0)) as channel_cogs
    FROM external_orders
    WHERE tenant_id = p_tenant_id
    GROUP BY UPPER(channel)
  ) channel_agg;

  -- Fee breakdown
  SELECT jsonb_object_agg(fee_type, total_amount)
  INTO v_fee_breakdown
  FROM (
    SELECT fee_type, SUM(amount) as total_amount
    FROM channel_fees
    WHERE tenant_id = p_tenant_id
    GROUP BY fee_type
  ) fee_agg;

  -- Status breakdown
  SELECT jsonb_object_agg(status, jsonb_build_object('count', cnt, 'amount', amt))
  INTO v_status_breakdown
  FROM (
    SELECT status::text, COUNT(*) as cnt, SUM(total_amount) as amt
    FROM external_orders
    WHERE tenant_id = p_tenant_id
    GROUP BY status
  ) status_agg;

  -- Upsert cache
  INSERT INTO channel_analytics_cache (
    tenant_id, total_orders, gross_revenue, net_revenue, total_fees,
    total_cogs, gross_profit, avg_order_value, cancelled_orders, returned_orders,
    channel_metrics, fee_breakdown, status_breakdown,
    data_start_date, data_end_date, calculated_at, updated_at
  ) VALUES (
    p_tenant_id, v_total_orders, v_gross_revenue, v_net_revenue, v_total_fees,
    v_total_cogs, v_gross_profit,
    CASE WHEN v_total_orders > 0 THEN v_gross_revenue / v_total_orders ELSE 0 END,
    v_cancelled, v_returned,
    COALESCE(v_channel_metrics, '{}'), COALESCE(v_fee_breakdown, '{}'), COALESCE(v_status_breakdown, '{}'),
    v_data_start, v_data_end, now(), now()
  )
  ON CONFLICT (tenant_id)
  DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    gross_revenue = EXCLUDED.gross_revenue,
    net_revenue = EXCLUDED.net_revenue,
    total_fees = EXCLUDED.total_fees,
    total_cogs = EXCLUDED.total_cogs,
    gross_profit = EXCLUDED.gross_profit,
    avg_order_value = EXCLUDED.avg_order_value,
    cancelled_orders = EXCLUDED.cancelled_orders,
    returned_orders = EXCLUDED.returned_orders,
    channel_metrics = EXCLUDED.channel_metrics,
    fee_breakdown = EXCLUDED.fee_breakdown,
    status_breakdown = EXCLUDED.status_breakdown,
    data_start_date = EXCLUDED.data_start_date,
    data_end_date = EXCLUDED.data_end_date,
    calculated_at = now(),
    updated_at = now();
END;
$$;


--
-- Name: refresh_dashboard_kpi_cache(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_dashboard_kpi_cache(p_tenant_id uuid, p_date_range integer DEFAULT 90) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_start_date date := CURRENT_DATE - p_date_range;
  v_end_date date := CURRENT_DATE;
  v_cash_today numeric := 0;
  v_cash_7d numeric := 0;
  v_total_ar numeric := 0;
  v_overdue_ar numeric := 0;
  v_dso integer := 0;
  v_total_revenue numeric := 0;
  v_total_cogs numeric := 0;
  v_total_opex numeric := 0;
  v_invoice_count integer := 0;
  v_overdue_count integer := 0;
  v_transaction_count integer := 0;
  v_matched_count integer := 0;
  v_dso_sum numeric := 0;
  v_ar_invoice_count integer := 0;
BEGIN
  -- Cash today from bank accounts
  SELECT COALESCE(SUM(current_balance), 0) INTO v_cash_today
  FROM bank_accounts
  WHERE tenant_id = p_tenant_id AND status = 'active';

  -- Cash 7d from forecasts
  SELECT COALESCE(closing_balance, v_cash_today) INTO v_cash_7d
  FROM cash_forecasts
  WHERE tenant_id = p_tenant_id
    AND forecast_date >= CURRENT_DATE
  ORDER BY forecast_date ASC
  LIMIT 1;

  -- AR metrics from invoices
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN status NOT IN ('paid', 'cancelled') THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status NOT IN ('paid', 'cancelled') AND due_date < CURRENT_DATE THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COUNT(CASE WHEN status NOT IN ('paid', 'cancelled') AND due_date < CURRENT_DATE THEN 1 END)
  INTO v_invoice_count, v_total_ar, v_overdue_ar, v_overdue_count
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND issue_date >= v_start_date
    AND issue_date <= v_end_date;

  -- Calculate DSO - Fix: cast issue_date properly
  SELECT 
    COUNT(*),
    COALESCE(SUM(CURRENT_DATE - issue_date), 0)
  INTO v_ar_invoice_count, v_dso_sum
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND status NOT IN ('paid', 'cancelled')
    AND total_amount - COALESCE(paid_amount, 0) > 0;
  
  IF v_ar_invoice_count > 0 THEN
    v_dso := ROUND(v_dso_sum / v_ar_invoice_count);
  END IF;

  -- Match rate from transactions
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN match_status = 'matched' THEN 1 END)
  INTO v_transaction_count, v_matched_count
  FROM bank_transactions
  WHERE tenant_id = p_tenant_id
    AND transaction_date >= v_start_date
    AND transaction_date <= v_end_date;

  -- Revenue
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue
  FROM revenues
  WHERE tenant_id = p_tenant_id
    AND is_active = true
    AND start_date >= v_start_date
    AND start_date <= v_end_date;

  -- Expenses
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'cogs' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category NOT IN ('cogs', 'interest', 'tax') THEN amount ELSE 0 END), 0)
  INTO v_total_cogs, v_total_opex
  FROM expenses
  WHERE tenant_id = p_tenant_id
    AND expense_date >= v_start_date
    AND expense_date <= v_end_date;

  -- Upsert cache
  INSERT INTO dashboard_kpi_cache (
    tenant_id, cash_today, cash_7d, total_ar, overdue_ar,
    dso, ccc, gross_margin, ebitda, auto_match_rate,
    total_revenue, total_cogs, total_opex,
    invoice_count, overdue_invoice_count, transaction_count, matched_transaction_count,
    date_range_start, date_range_end, calculated_at, updated_at
  ) VALUES (
    p_tenant_id, v_cash_today, COALESCE(v_cash_7d, v_cash_today), v_total_ar, v_overdue_ar,
    v_dso, v_dso + 16,
    CASE WHEN v_total_revenue > 0 THEN ROUND(((v_total_revenue - v_total_cogs) / v_total_revenue) * 100, 1) ELSE 0 END,
    v_total_revenue - v_total_opex,
    CASE WHEN v_transaction_count > 0 THEN ROUND((v_matched_count::numeric / v_transaction_count) * 100) ELSE 0 END,
    v_total_revenue, v_total_cogs, v_total_opex,
    v_invoice_count, v_overdue_count, v_transaction_count, v_matched_count,
    v_start_date, v_end_date, now(), now()
  )
  ON CONFLICT (tenant_id)
  DO UPDATE SET
    cash_today = EXCLUDED.cash_today,
    cash_7d = EXCLUDED.cash_7d,
    total_ar = EXCLUDED.total_ar,
    overdue_ar = EXCLUDED.overdue_ar,
    dso = EXCLUDED.dso,
    ccc = EXCLUDED.ccc,
    gross_margin = EXCLUDED.gross_margin,
    ebitda = EXCLUDED.ebitda,
    auto_match_rate = EXCLUDED.auto_match_rate,
    total_revenue = EXCLUDED.total_revenue,
    total_cogs = EXCLUDED.total_cogs,
    total_opex = EXCLUDED.total_opex,
    invoice_count = EXCLUDED.invoice_count,
    overdue_invoice_count = EXCLUDED.overdue_invoice_count,
    transaction_count = EXCLUDED.transaction_count,
    matched_transaction_count = EXCLUDED.matched_transaction_count,
    date_range_start = EXCLUDED.date_range_start,
    date_range_end = EXCLUDED.date_range_end,
    calculated_at = now(),
    updated_at = now();
END;
$$;


--
-- Name: refresh_pl_cache(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_pl_cache(p_tenant_id uuid, p_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer, p_month integer DEFAULT NULL::integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_gross_sales numeric := 0;
  v_discounts numeric := 0;
  v_net_sales numeric := 0;
  v_invoice_revenue numeric := 0;
  v_contract_revenue numeric := 0;
  v_cogs numeric := 0;
  v_opex_salaries numeric := 0;
  v_opex_rent numeric := 0;
  v_opex_utilities numeric := 0;
  v_opex_marketing numeric := 0;
  v_opex_depreciation numeric := 0;
  v_opex_other numeric := 0;
  v_total_opex numeric := 0;
  v_interest numeric := 0;
  v_tax_rate numeric := 0.20;
  v_period_type text;
BEGIN
  -- Determine period
  IF p_month IS NOT NULL THEN
    v_period_type := 'monthly';
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::date;
  ELSE
    v_period_type := 'yearly';
    v_start_date := make_date(p_year, 1, 1);
    v_end_date := make_date(p_year, 12, 31);
  END IF;

  -- Invoice revenue
  SELECT 
    COALESCE(SUM(subtotal), 0),
    COALESCE(SUM(discount_amount), 0)
  INTO v_gross_sales, v_discounts
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND status != 'cancelled'
    AND issue_date >= v_start_date
    AND issue_date <= v_end_date;

  v_invoice_revenue := v_gross_sales - v_discounts;

  -- Contract revenue from revenues table
  SELECT COALESCE(SUM(amount), 0) INTO v_contract_revenue
  FROM revenues
  WHERE tenant_id = p_tenant_id
    AND is_active = true
    AND source = 'manual'
    AND start_date >= v_start_date
    AND start_date <= v_end_date;

  v_net_sales := v_invoice_revenue + v_contract_revenue;

  -- Expenses by category
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'cogs' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'salary' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'rent' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'utilities' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'marketing' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'depreciation' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category NOT IN ('cogs', 'salary', 'rent', 'utilities', 'marketing', 'depreciation', 'interest', 'tax') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'interest' THEN amount ELSE 0 END), 0)
  INTO v_cogs, v_opex_salaries, v_opex_rent, v_opex_utilities, v_opex_marketing, v_opex_depreciation, v_opex_other, v_interest
  FROM expenses
  WHERE tenant_id = p_tenant_id
    AND expense_date >= v_start_date
    AND expense_date <= v_end_date;

  v_total_opex := v_opex_salaries + v_opex_rent + v_opex_utilities + v_opex_marketing + v_opex_depreciation + v_opex_other;

  -- Upsert cache
  INSERT INTO pl_report_cache (
    tenant_id, period_type, period_year, period_month,
    gross_sales, sales_discounts, net_sales,
    invoice_revenue, contract_revenue,
    cogs, gross_profit, gross_margin,
    opex_salaries, opex_rent, opex_utilities, opex_marketing, opex_depreciation, opex_other, total_opex,
    operating_income, operating_margin,
    interest_expense, income_before_tax, income_tax, net_income, net_margin,
    calculated_at, updated_at
  ) VALUES (
    p_tenant_id, v_period_type, p_year, p_month,
    v_gross_sales, v_discounts, v_net_sales,
    v_invoice_revenue, v_contract_revenue,
    v_cogs, v_net_sales - v_cogs,
    CASE WHEN v_net_sales > 0 THEN (v_net_sales - v_cogs) / v_net_sales ELSE 0 END,
    v_opex_salaries, v_opex_rent, v_opex_utilities, v_opex_marketing, v_opex_depreciation, v_opex_other, v_total_opex,
    v_net_sales - v_cogs - v_total_opex,
    CASE WHEN v_net_sales > 0 THEN (v_net_sales - v_cogs - v_total_opex) / v_net_sales ELSE 0 END,
    v_interest,
    v_net_sales - v_cogs - v_total_opex - v_interest,
    GREATEST((v_net_sales - v_cogs - v_total_opex - v_interest) * v_tax_rate, 0),
    (v_net_sales - v_cogs - v_total_opex - v_interest) * (1 - v_tax_rate),
    CASE WHEN v_net_sales > 0 THEN ((v_net_sales - v_cogs - v_total_opex - v_interest) * (1 - v_tax_rate)) / v_net_sales ELSE 0 END,
    now(), now()
  )
  ON CONFLICT (tenant_id, period_type, period_year, period_month, period_quarter)
  DO UPDATE SET
    gross_sales = EXCLUDED.gross_sales,
    sales_discounts = EXCLUDED.sales_discounts,
    net_sales = EXCLUDED.net_sales,
    invoice_revenue = EXCLUDED.invoice_revenue,
    contract_revenue = EXCLUDED.contract_revenue,
    cogs = EXCLUDED.cogs,
    gross_profit = EXCLUDED.gross_profit,
    gross_margin = EXCLUDED.gross_margin,
    opex_salaries = EXCLUDED.opex_salaries,
    opex_rent = EXCLUDED.opex_rent,
    opex_utilities = EXCLUDED.opex_utilities,
    opex_marketing = EXCLUDED.opex_marketing,
    opex_depreciation = EXCLUDED.opex_depreciation,
    opex_other = EXCLUDED.opex_other,
    total_opex = EXCLUDED.total_opex,
    operating_income = EXCLUDED.operating_income,
    operating_margin = EXCLUDED.operating_margin,
    interest_expense = EXCLUDED.interest_expense,
    income_before_tax = EXCLUDED.income_before_tax,
    income_tax = EXCLUDED.income_tax,
    net_income = EXCLUDED.net_income,
    net_margin = EXCLUDED.net_margin,
    calculated_at = now(),
    updated_at = now();
END;
$$;


--
-- Name: refresh_whatif_metrics_cache(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_whatif_metrics_cache(p_tenant_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_revenue numeric := 0;
  v_total_cogs numeric := 0;
  v_total_fees numeric := 0;
  v_total_orders integer := 0;
  v_avg_order_value numeric := 0;
  v_return_rate numeric := 0;
  v_monthly_growth numeric := 0;
  v_channel_metrics jsonb := '{}';
  v_marketing_cost numeric := 0;
  v_overhead_cost numeric := 0;
  v_data_start date;
  v_data_end date;
  v_order_count integer := 0;
  v_cancelled_count integer := 0;
BEGIN
  -- Get date range
  SELECT MIN(order_date::date), MAX(order_date::date), COUNT(*)
  INTO v_data_start, v_data_end, v_order_count
  FROM external_orders
  WHERE tenant_id = p_tenant_id;

  -- Calculate totals from completed orders
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COALESCE(SUM(cost_of_goods), 0),
    COALESCE(SUM(COALESCE(platform_fee, 0) + COALESCE(commission_fee, 0) + COALESCE(payment_fee, 0) + COALESCE(shipping_fee, 0)), 0),
    COUNT(*)
  INTO v_total_revenue, v_total_cogs, v_total_fees, v_total_orders
  FROM external_orders
  WHERE tenant_id = p_tenant_id
    AND status = 'delivered';

  IF v_total_orders > 0 THEN
    v_avg_order_value := v_total_revenue / v_total_orders;
  END IF;

  SELECT COUNT(*) INTO v_cancelled_count
  FROM external_orders
  WHERE tenant_id = p_tenant_id
    AND status IN ('cancelled', 'returned');
  
  IF v_order_count > 0 THEN
    v_return_rate := (v_cancelled_count::numeric / v_order_count) * 100;
  END IF;

  SELECT jsonb_object_agg(
    channel,
    jsonb_build_object(
      'revenue', channel_revenue,
      'orders', channel_orders,
      'cogs', channel_cogs,
      'fees', channel_fees,
      'aov', CASE WHEN channel_orders > 0 THEN channel_revenue / channel_orders ELSE 0 END,
      'share', CASE WHEN v_total_revenue > 0 THEN (channel_revenue / v_total_revenue) * 100 ELSE 0 END
    )
  ) INTO v_channel_metrics
  FROM (
    SELECT 
      UPPER(channel) as channel,
      SUM(total_amount) as channel_revenue,
      COUNT(*) as channel_orders,
      SUM(COALESCE(cost_of_goods, 0)) as channel_cogs,
      SUM(COALESCE(platform_fee, 0) + COALESCE(commission_fee, 0) + COALESCE(payment_fee, 0)) as channel_fees
    FROM external_orders
    WHERE tenant_id = p_tenant_id
      AND status = 'delivered'
    GROUP BY UPPER(channel)
  ) channel_agg;

  WITH monthly_revenue AS (
    SELECT 
      DATE_TRUNC('month', order_date) as month,
      SUM(total_amount) as revenue
    FROM external_orders
    WHERE tenant_id = p_tenant_id
      AND status = 'delivered'
      AND order_date >= NOW() - INTERVAL '3 months'
    GROUP BY DATE_TRUNC('month', order_date)
    ORDER BY month DESC
    LIMIT 2
  )
  SELECT 
    CASE 
      WHEN COUNT(*) = 2 AND MIN(revenue) > 0 
      THEN ((MAX(revenue) - MIN(revenue)) / MIN(revenue)) * 100
      ELSE 0
    END INTO v_monthly_growth
  FROM monthly_revenue;

  -- CORRECT ENUM VALUES: marketing, rent, utilities, salary
  SELECT COALESCE(SUM(amount), 0) INTO v_marketing_cost
  FROM expenses
  WHERE tenant_id = p_tenant_id
    AND category = 'marketing';

  SELECT COALESCE(SUM(amount), 0) INTO v_overhead_cost
  FROM expenses
  WHERE tenant_id = p_tenant_id
    AND category IN ('rent', 'utilities', 'salary');

  INSERT INTO whatif_metrics_cache (
    tenant_id, total_revenue, total_cogs, total_fees, total_orders,
    avg_order_value, return_rate, monthly_growth_rate,
    channel_metrics, marketing_cost, overhead_cost,
    data_start_date, data_end_date, order_count,
    calculated_at, updated_at
  ) VALUES (
    p_tenant_id, v_total_revenue, v_total_cogs, v_total_fees, v_total_orders,
    v_avg_order_value, v_return_rate, COALESCE(v_monthly_growth, 0),
    COALESCE(v_channel_metrics, '{}'), v_marketing_cost, v_overhead_cost,
    v_data_start, v_data_end, v_order_count,
    now(), now()
  )
  ON CONFLICT (tenant_id)
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_cogs = EXCLUDED.total_cogs,
    total_fees = EXCLUDED.total_fees,
    total_orders = EXCLUDED.total_orders,
    avg_order_value = EXCLUDED.avg_order_value,
    return_rate = EXCLUDED.return_rate,
    monthly_growth_rate = EXCLUDED.monthly_growth_rate,
    channel_metrics = EXCLUDED.channel_metrics,
    marketing_cost = EXCLUDED.marketing_cost,
    overhead_cost = EXCLUDED.overhead_cost,
    data_start_date = EXCLUDED.data_start_date,
    data_end_date = EXCLUDED.data_end_date,
    order_count = EXCLUDED.order_count,
    calculated_at = now(),
    updated_at = now();
END;
$$;


--
-- Name: reverse_journal_entry(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reverse_journal_entry(p_entry_id uuid, p_reversal_date date DEFAULT CURRENT_DATE) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_original record;
  v_new_entry_id uuid;
  v_new_entry_number text;
  v_period_id uuid;
BEGIN
  -- Get original entry
  SELECT * INTO v_original FROM public.journal_entries WHERE id = p_entry_id;
  
  IF v_original IS NULL THEN
    RAISE EXCEPTION 'Bút toán không tồn tại';
  END IF;
  
  IF v_original.status != 'posted' THEN
    RAISE EXCEPTION 'Chỉ có thể đảo bút toán đã ghi sổ';
  END IF;
  
  -- Get period for reversal date
  SELECT id INTO v_period_id
  FROM public.financial_periods
  WHERE tenant_id = v_original.tenant_id
    AND p_reversal_date BETWEEN start_date AND end_date
    AND is_closed = false
  LIMIT 1;
  
  -- Generate new entry number
  v_new_entry_number := generate_journal_entry_number(v_original.tenant_id);
  
  -- Create reversal entry
  INSERT INTO public.journal_entries (
    tenant_id, entry_number, entry_date, period_id,
    description, reference, source_type, source_id,
    status, created_by, notes
  ) VALUES (
    v_original.tenant_id, 
    v_new_entry_number, 
    p_reversal_date, 
    v_period_id,
    'Đảo ngược: ' || v_original.description,
    'REV-' || v_original.entry_number, 
    'reversal', 
    v_original.id,
    'draft', 
    auth.uid(),
    'Bút toán đảo ngược cho ' || v_original.entry_number
  ) RETURNING id INTO v_new_entry_id;
  
  -- Create reversed lines (swap debit/credit)
  INSERT INTO public.journal_entry_lines (
    tenant_id, journal_entry_id, account_id,
    debit_amount, credit_amount, description, 
    line_number, cost_center_id, currency_code, exchange_rate
  )
  SELECT 
    tenant_id, v_new_entry_id, account_id,
    credit_amount, debit_amount, 'Đảo: ' || COALESCE(description, ''),
    line_number, cost_center_id, currency_code, exchange_rate
  FROM public.journal_entry_lines
  WHERE journal_entry_id = p_entry_id
  ORDER BY line_number;
  
  RETURN v_new_entry_id;
END;
$$;


--
-- Name: sync_bill_due_date(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_bill_due_date() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_days integer;
BEGIN
  -- If payment_term_id is set, calculate due_date
  IF NEW.payment_term_id IS NOT NULL THEN
    SELECT days INTO v_days FROM public.payment_terms WHERE id = NEW.payment_term_id;
    IF v_days IS NOT NULL THEN
      NEW.due_date := NEW.bill_date + v_days;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: sync_budget_actuals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_budget_actuals() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update actual_amount for expense budgets
  UPDATE public.budgets b
  SET actual_amount = COALESCE((
    SELECT SUM(e.amount)
    FROM public.expenses e
    WHERE e.tenant_id = b.tenant_id
      AND e.category::text = b.category
      AND (b.subcategory IS NULL OR e.subcategory = b.subcategory)
      AND e.expense_date BETWEEN b.start_date AND b.end_date
  ), 0)
  WHERE b.budget_type = 'expense';
  
  -- Update actual_amount for revenue budgets
  UPDATE public.budgets b
  SET actual_amount = COALESCE((
    SELECT SUM(r.amount)
    FROM public.revenues r
    WHERE r.tenant_id = b.tenant_id
      AND r.source::text = b.category
      AND r.start_date BETWEEN b.start_date AND b.end_date
      AND r.is_active = true
  ), 0)
  WHERE b.budget_type = 'revenue';
END;
$$;


--
-- Name: sync_cash_forecast_from_bank(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_cash_forecast_from_bank() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  total_bank_balance numeric;
  today_date date := CURRENT_DATE;
BEGIN
  -- Calculate total balance from all bank accounts
  SELECT COALESCE(SUM(current_balance), 0) INTO total_bank_balance
  FROM public.bank_accounts
  WHERE status = 'active';
  
  -- Update or insert today's cash forecast with new opening balance
  INSERT INTO public.cash_forecasts (
    forecast_date, 
    opening_balance, 
    closing_balance, 
    forecast_type,
    inflows,
    outflows
  )
  VALUES (
    today_date, 
    total_bank_balance, 
    total_bank_balance, 
    'actual',
    0,
    0
  )
  ON CONFLICT (forecast_date) 
  DO UPDATE SET 
    opening_balance = total_bank_balance,
    closing_balance = total_bank_balance + COALESCE(cash_forecasts.inflows, 0) - COALESCE(cash_forecasts.outflows, 0);
  
  RETURN NEW;
END;
$$;


--
-- Name: sync_invoice_due_date(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_invoice_due_date() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_days integer;
BEGIN
  -- If payment_term_id is set, calculate due_date
  IF NEW.payment_term_id IS NOT NULL THEN
    SELECT days INTO v_days FROM public.payment_terms WHERE id = NEW.payment_term_id;
    IF v_days IS NOT NULL THEN
      NEW.due_date := NEW.issue_date + v_days;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: trigger_refresh_channel_analytics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_refresh_channel_analytics() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM refresh_channel_analytics_cache(COALESCE(NEW.tenant_id, OLD.tenant_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: trigger_refresh_dashboard_kpi(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_refresh_dashboard_kpi() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM refresh_dashboard_kpi_cache(COALESCE(NEW.tenant_id, OLD.tenant_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: trigger_refresh_pl_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_refresh_pl_cache() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM refresh_pl_cache(COALESCE(NEW.tenant_id, OLD.tenant_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: trigger_refresh_whatif_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_refresh_whatif_metrics() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Queue refresh (using async approach to avoid slow triggers)
  PERFORM refresh_whatif_metrics_cache(COALESCE(NEW.tenant_id, OLD.tenant_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_bill_paid_amount(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_bill_paid_amount() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_bill_id uuid;
  v_total_paid numeric;
  v_total_amount numeric;
  v_new_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_bill_id := OLD.bill_id;
  ELSE
    v_bill_id := NEW.bill_id;
  END IF;

  IF v_bill_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.vendor_payments
  WHERE bill_id = v_bill_id;

  SELECT total_amount INTO v_total_amount
  FROM public.bills WHERE id = v_bill_id;

  IF v_total_paid >= v_total_amount THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'approved';
  END IF;

  UPDATE public.bills
  SET 
    paid_amount = v_total_paid,
    status = v_new_status,
    updated_at = now()
  WHERE id = v_bill_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


--
-- Name: update_budget_on_expense_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_budget_on_expense_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_tenant_id uuid;
  v_category text;
  v_subcategory text;
  v_expense_date date;
BEGIN
  -- Get values based on operation
  IF TG_OP = 'DELETE' THEN
    v_tenant_id := OLD.tenant_id;
    v_category := OLD.category::text;
    v_subcategory := OLD.subcategory;
    v_expense_date := OLD.expense_date;
  ELSE
    v_tenant_id := NEW.tenant_id;
    v_category := NEW.category::text;
    v_subcategory := NEW.subcategory;
    v_expense_date := NEW.expense_date;
  END IF;

  -- Update matching budget
  UPDATE public.budgets b
  SET actual_amount = COALESCE((
    SELECT SUM(e.amount)
    FROM public.expenses e
    WHERE e.tenant_id = b.tenant_id
      AND e.category::text = b.category
      AND (b.subcategory IS NULL OR e.subcategory = b.subcategory)
      AND e.expense_date BETWEEN b.start_date AND b.end_date
  ), 0)
  WHERE b.tenant_id = v_tenant_id
    AND b.budget_type = 'expense'
    AND b.category = v_category
    AND (b.subcategory IS NULL OR b.subcategory = v_subcategory)
    AND v_expense_date BETWEEN b.start_date AND b.end_date;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


--
-- Name: update_cash_forecast_flows(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_cash_forecast_flows() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  today_date date := CURRENT_DATE;
  total_revenue numeric;
  total_expense numeric;
  opening numeric;
BEGIN
  -- Calculate today's revenues
  SELECT COALESCE(SUM(amount), 0) INTO total_revenue
  FROM public.revenues
  WHERE start_date = today_date AND is_active = true;
  
  -- Calculate today's expenses  
  SELECT COALESCE(SUM(amount), 0) INTO total_expense
  FROM public.expenses
  WHERE expense_date = today_date;
  
  -- Get current opening balance
  SELECT COALESCE(opening_balance, 0) INTO opening
  FROM public.cash_forecasts
  WHERE forecast_date = today_date;
  
  -- Update today's cash forecast
  UPDATE public.cash_forecasts
  SET 
    inflows = total_revenue,
    outflows = total_expense,
    closing_balance = opening + total_revenue - total_expense
  WHERE forecast_date = today_date;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_invoice_paid_amount(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_invoice_paid_amount() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_invoice_id uuid;
  v_total_paid numeric;
  v_total_amount numeric;
  v_new_status text;
BEGIN
  -- Get the invoice_id
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- Skip if no invoice_id
  IF v_invoice_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Calculate total paid for this invoice
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.payments
  WHERE invoice_id = v_invoice_id;

  -- Get invoice total
  SELECT total_amount INTO v_total_amount
  FROM public.invoices
  WHERE id = v_invoice_id;

  -- Determine new status
  IF v_total_paid >= v_total_amount THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'sent'; -- Keep as sent if no payment
  END IF;

  -- Update invoice paid_amount and status
  UPDATE public.invoices
  SET 
    paid_amount = v_total_paid,
    status = v_new_status,
    updated_at = now()
  WHERE id = v_invoice_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


--
-- Name: update_journal_entry_totals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_journal_entry_totals() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_journal_entry_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_journal_entry_id := OLD.journal_entry_id;
  ELSE
    v_journal_entry_id := NEW.journal_entry_id;
  END IF;

  UPDATE public.journal_entries
  SET 
    total_debit = COALESCE((
      SELECT SUM(debit_amount) FROM public.journal_entry_lines 
      WHERE journal_entry_id = v_journal_entry_id
    ), 0),
    total_credit = COALESCE((
      SELECT SUM(credit_amount) FROM public.journal_entry_lines 
      WHERE journal_entry_id = v_journal_entry_id
    ), 0)
  WHERE id = v_journal_entry_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_bill_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_bill_item() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.amount := NEW.quantity * NEW.unit_price;
  
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Số lượng phải lớn hơn 0';
  END IF;

  IF NEW.unit_price < 0 THEN
    RAISE EXCEPTION 'Đơn giá không được âm';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: validate_invoice_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_invoice_item() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Auto-calculate amount if not provided or mismatched
  NEW.amount := NEW.quantity * NEW.unit_price;
  
  -- Validate
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Số lượng phải lớn hơn 0';
  END IF;

  IF NEW.unit_price < 0 THEN
    RAISE EXCEPTION 'Đơn giá không được âm';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: validate_note_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_note_item() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.amount := NEW.quantity * NEW.unit_price;
  
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Số lượng phải lớn hơn 0';
  END IF;

  IF NEW.unit_price < 0 THEN
    RAISE EXCEPTION 'Đơn giá không được âm';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: validate_payment_amount(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_payment_amount() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_amount numeric;
  v_current_paid numeric;
  v_max_allowed numeric;
BEGIN
  -- Skip validation if no invoice_id
  IF NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get invoice total and current paid (excluding this payment if update)
  SELECT total_amount, COALESCE(paid_amount, 0) 
  INTO v_total_amount, v_current_paid
  FROM public.invoices
  WHERE id = NEW.invoice_id;

  -- If updating, subtract old amount
  IF TG_OP = 'UPDATE' THEN
    v_current_paid := v_current_paid - COALESCE(OLD.amount, 0);
  END IF;

  -- Calculate max allowed
  v_max_allowed := v_total_amount - v_current_paid;

  -- Validate
  IF NEW.amount > v_max_allowed THEN
    RAISE EXCEPTION 'Số tiền thanh toán (%) vượt quá số tiền còn lại (%). Tổng hóa đơn: %', 
      NEW.amount, v_max_allowed, v_total_amount;
  END IF;

  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Số tiền thanh toán phải lớn hơn 0';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: validate_period_date(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_period_date(p_tenant_id uuid, p_date date) RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_period_id uuid;
  v_is_closed boolean;
BEGIN
  SELECT id, is_closed INTO v_period_id, v_is_closed
  FROM public.financial_periods
  WHERE tenant_id = p_tenant_id
    AND p_date BETWEEN start_date AND end_date
  LIMIT 1;
  
  IF v_period_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy kỳ kế toán cho ngày %', p_date;
  END IF;
  
  IF v_is_closed THEN
    RAISE EXCEPTION 'Kỳ kế toán đã đóng, không thể thao tác vào ngày %', p_date;
  END IF;
  
  RETURN v_period_id;
END;
$$;


--
-- Name: validate_vendor_payment_amount(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_vendor_payment_amount() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_amount numeric;
  v_current_paid numeric;
  v_max_allowed numeric;
BEGIN
  IF NEW.bill_id IS NULL THEN RETURN NEW; END IF;

  SELECT total_amount, COALESCE(paid_amount, 0) 
  INTO v_total_amount, v_current_paid
  FROM public.bills WHERE id = NEW.bill_id;

  IF TG_OP = 'UPDATE' THEN
    v_current_paid := v_current_paid - COALESCE(OLD.amount, 0);
  END IF;

  v_max_allowed := v_total_amount - v_current_paid;

  IF NEW.amount > v_max_allowed THEN
    RAISE EXCEPTION 'Số tiền thanh toán (%) vượt quá số tiền còn lại (%)', NEW.amount, v_max_allowed;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: void_journal_entry(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.void_journal_entry(p_entry_id uuid, p_reason text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_status text;
  v_line record;
BEGIN
  -- Check current status
  SELECT status INTO v_status FROM public.journal_entries WHERE id = p_entry_id;
  
  IF v_status != 'posted' THEN
    RAISE EXCEPTION 'Chỉ có thể hủy bút toán đã ghi sổ';
  END IF;

  -- Reverse GL account balances
  FOR v_line IN 
    SELECT jel.account_id, jel.debit_amount, jel.credit_amount, ga.normal_balance
    FROM public.journal_entry_lines jel
    JOIN public.gl_accounts ga ON ga.id = jel.account_id
    WHERE jel.journal_entry_id = p_entry_id
  LOOP
    UPDATE public.gl_accounts
    SET current_balance = current_balance - 
      CASE 
        WHEN v_line.normal_balance = 'debit' THEN v_line.debit_amount - v_line.credit_amount
        ELSE v_line.credit_amount - v_line.debit_amount
      END
    WHERE id = v_line.account_id;
  END LOOP;

  -- Mark entry as voided
  UPDATE public.journal_entries
  SET 
    status = 'voided',
    voided_at = now(),
    voided_by = auth.uid(),
    void_reason = p_reason
  WHERE id = p_entry_id;

  RETURN true;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: ai_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    user_id uuid,
    model text NOT NULL,
    prompt_tokens integer DEFAULT 0 NOT NULL,
    completion_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    estimated_cost numeric(10,6) DEFAULT 0,
    function_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alert_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    alert_configs jsonb DEFAULT '{"risk": {"enabled": true, "severity": "high"}, "ar_overdue": {"enabled": true, "severity": "high", "threshold": 30}, "data_quality": {"enabled": true, "severity": "medium"}, "cash_critical": {"enabled": true, "severity": "high", "threshold": 100000000}, "reconciliation": {"enabled": true, "severity": "medium", "threshold": 7}}'::jsonb NOT NULL,
    notification_email boolean DEFAULT true,
    notification_slack boolean DEFAULT false,
    notification_push boolean DEFAULT false,
    email_address text,
    slack_webhook text,
    notify_immediately boolean DEFAULT true,
    notify_daily_summary boolean DEFAULT false,
    notify_weekly_summary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type text NOT NULL,
    severity text DEFAULT 'medium'::text,
    title text NOT NULL,
    message text,
    entity_type text,
    entity_id uuid,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid
);


--
-- Name: bills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    bill_number text NOT NULL,
    vendor_bill_number text,
    vendor_id uuid,
    vendor_name text NOT NULL,
    bill_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date NOT NULL,
    received_date date,
    subtotal numeric DEFAULT 0 NOT NULL,
    vat_amount numeric DEFAULT 0 NOT NULL,
    discount_amount numeric DEFAULT 0,
    total_amount numeric DEFAULT 0 NOT NULL,
    paid_amount numeric DEFAULT 0,
    status text DEFAULT 'draft'::text NOT NULL,
    payment_terms integer DEFAULT 30,
    approved_by uuid,
    approved_at timestamp with time zone,
    expense_category text,
    gl_account_id uuid,
    journal_entry_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cost_center_id uuid,
    currency_code text DEFAULT 'VND'::text,
    exchange_rate numeric DEFAULT 1,
    total_amount_base numeric GENERATED ALWAYS AS ((total_amount * exchange_rate)) STORED,
    payment_term_id uuid,
    credit_note_amount numeric DEFAULT 0,
    CONSTRAINT bills_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'approved'::text, 'partial'::text, 'paid'::text, 'cancelled'::text])))
);


--
-- Name: ap_aging; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ap_aging WITH (security_invoker='true') AS
 SELECT tenant_id,
    id AS bill_id,
    bill_number,
    vendor_id,
    vendor_name,
    bill_date,
    due_date,
    total_amount,
    COALESCE(paid_amount, (0)::numeric) AS paid_amount,
    (total_amount - COALESCE(paid_amount, (0)::numeric)) AS balance_due,
    status,
    GREATEST((CURRENT_DATE - due_date), 0) AS days_overdue,
        CASE
            WHEN (CURRENT_DATE <= due_date) THEN 'current'::text
            WHEN (((CURRENT_DATE - due_date) >= 1) AND ((CURRENT_DATE - due_date) <= 30)) THEN '1-30 days'::text
            WHEN (((CURRENT_DATE - due_date) >= 31) AND ((CURRENT_DATE - due_date) <= 60)) THEN '31-60 days'::text
            WHEN (((CURRENT_DATE - due_date) >= 61) AND ((CURRENT_DATE - due_date) <= 90)) THEN '61-90 days'::text
            ELSE 'over 90 days'::text
        END AS aging_bucket
   FROM public.bills b
  WHERE (status <> ALL (ARRAY['draft'::text, 'cancelled'::text, 'paid'::text]));


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    key_prefix text NOT NULL,
    key_hash text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    requests_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT api_keys_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'revoked'::text])))
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    tax_code text,
    credit_limit numeric(15,2) DEFAULT 0,
    payment_terms integer DEFAULT 30,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    customer_type text DEFAULT 'regular'::text,
    payment_term_id uuid,
    currency_code text DEFAULT 'VND'::text,
    gl_receivable_account_id uuid,
    CONSTRAINT customers_customer_type_check CHECK ((customer_type = ANY (ARRAY['regular'::text, 'vip'::text, 'wholesale'::text, 'retail'::text])))
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text NOT NULL,
    customer_id uuid,
    issue_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date NOT NULL,
    subtotal numeric(15,2) DEFAULT 0 NOT NULL,
    vat_amount numeric(15,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    paid_amount numeric(15,2) DEFAULT 0,
    status text DEFAULT 'draft'::text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    cost_center_id uuid,
    currency_code text DEFAULT 'VND'::text,
    exchange_rate numeric DEFAULT 1,
    total_amount_base numeric GENERATED ALWAYS AS ((total_amount * exchange_rate)) STORED,
    payment_term_id uuid,
    credit_note_amount numeric DEFAULT 0,
    debit_note_amount numeric DEFAULT 0,
    net_amount numeric GENERATED ALWAYS AS (((total_amount - COALESCE(credit_note_amount, (0)::numeric)) + COALESCE(debit_note_amount, (0)::numeric))) STORED
);

ALTER TABLE ONLY public.invoices REPLICA IDENTITY FULL;


--
-- Name: ar_aging; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ar_aging WITH (security_invoker='true') AS
 SELECT i.tenant_id,
    i.id AS invoice_id,
    i.invoice_number,
    i.customer_id,
    c.name AS customer_name,
    i.issue_date,
    i.due_date,
    i.total_amount,
    COALESCE(i.paid_amount, (0)::numeric) AS paid_amount,
    (i.total_amount - COALESCE(i.paid_amount, (0)::numeric)) AS balance_due,
    i.status,
    GREATEST((CURRENT_DATE - i.due_date), 0) AS days_overdue,
        CASE
            WHEN (CURRENT_DATE <= i.due_date) THEN 'current'::text
            WHEN (((CURRENT_DATE - i.due_date) >= 1) AND ((CURRENT_DATE - i.due_date) <= 30)) THEN '1-30 days'::text
            WHEN (((CURRENT_DATE - i.due_date) >= 31) AND ((CURRENT_DATE - i.due_date) <= 60)) THEN '31-60 days'::text
            WHEN (((CURRENT_DATE - i.due_date) >= 61) AND ((CURRENT_DATE - i.due_date) <= 90)) THEN '61-90 days'::text
            ELSE 'over 90 days'::text
        END AS aging_bucket
   FROM (public.invoices i
     LEFT JOIN public.customers c ON ((c.id = i.customer_id)))
  WHERE (i.status <> ALL (ARRAY['draft'::text, 'cancelled'::text, 'paid'::text]));


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid
);


--
-- Name: gl_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gl_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    account_code text NOT NULL,
    account_name text NOT NULL,
    description text,
    account_type text NOT NULL,
    account_subtype text,
    parent_account_id uuid,
    level integer DEFAULT 1 NOT NULL,
    is_header boolean DEFAULT false NOT NULL,
    normal_balance text NOT NULL,
    current_balance numeric DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gl_accounts_account_type_check CHECK ((account_type = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text, 'revenue'::text, 'expense'::text]))),
    CONSTRAINT gl_accounts_normal_balance_check CHECK ((normal_balance = ANY (ARRAY['debit'::text, 'credit'::text])))
);


--
-- Name: balance_sheet_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.balance_sheet_summary WITH (security_invoker='true') AS
 SELECT tenant_id,
    account_type,
    sum(current_balance) AS total_balance
   FROM public.gl_accounts ga
  WHERE ((is_active = true) AND (is_header = false) AND (account_type = ANY (ARRAY['asset'::text, 'liability'::text, 'equity'::text])))
  GROUP BY tenant_id, account_type;


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_name text NOT NULL,
    account_number text NOT NULL,
    account_name text,
    current_balance numeric(15,2) DEFAULT 0,
    currency text DEFAULT 'VND'::text,
    status text DEFAULT 'active'::text,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid
);

ALTER TABLE ONLY public.bank_accounts REPLICA IDENTITY FULL;


--
-- Name: bank_connection_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_connection_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    bank_code text NOT NULL,
    bank_name text NOT NULL,
    connection_type text DEFAULT 'bank'::text NOT NULL,
    status text DEFAULT 'disconnected'::text NOT NULL,
    credentials_encrypted text,
    last_sync_at timestamp with time zone,
    transaction_count integer DEFAULT 0,
    is_configured boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bank_connection_configs_connection_type_check CHECK ((connection_type = ANY (ARRAY['bank'::text, 'payment'::text]))),
    CONSTRAINT bank_connection_configs_status_check CHECK ((status = ANY (ARRAY['connected'::text, 'disconnected'::text, 'error'::text])))
);


--
-- Name: bank_covenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_covenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    covenant_name text NOT NULL,
    covenant_type text NOT NULL,
    lender_name text NOT NULL,
    threshold_value numeric NOT NULL,
    threshold_operator text DEFAULT '>='::text NOT NULL,
    warning_threshold numeric,
    current_value numeric DEFAULT 0,
    status text DEFAULT 'compliant'::text,
    compliance_margin numeric GENERATED ALWAYS AS (
CASE
    WHEN (threshold_operator = ANY (ARRAY['>='::text, '>'::text])) THEN (current_value - threshold_value)
    ELSE (threshold_value - current_value)
END) STORED,
    measurement_frequency text DEFAULT 'quarterly'::text,
    next_measurement_date date,
    last_measured_at timestamp with time zone,
    waiver_end_date date,
    waiver_notes text,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bank_covenants_covenant_type_check CHECK ((covenant_type = ANY (ARRAY['debt_equity'::text, 'current_ratio'::text, 'dscr'::text, 'interest_coverage'::text, 'leverage'::text, 'liquidity'::text, 'custom'::text]))),
    CONSTRAINT bank_covenants_measurement_frequency_check CHECK ((measurement_frequency = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'annually'::text]))),
    CONSTRAINT bank_covenants_status_check CHECK ((status = ANY (ARRAY['compliant'::text, 'warning'::text, 'breach'::text, 'waiver'::text]))),
    CONSTRAINT bank_covenants_threshold_operator_check CHECK ((threshold_operator = ANY (ARRAY['>='::text, '<='::text, '>'::text, '<'::text, '='::text])))
);


--
-- Name: bank_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_account_id uuid,
    transaction_date date NOT NULL,
    description text,
    amount numeric(15,2) NOT NULL,
    transaction_type text NOT NULL,
    reference text,
    matched_invoice_id uuid,
    match_status text DEFAULT 'unmatched'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid
);


--
-- Name: bill_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    bill_id uuid NOT NULL,
    description text NOT NULL,
    product_id uuid,
    quantity numeric DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    vat_rate numeric DEFAULT 10,
    gl_account_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: board_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    report_title text NOT NULL,
    report_period text NOT NULL,
    report_type text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    executive_summary text,
    financial_highlights jsonb,
    key_metrics jsonb,
    risk_assessment jsonb,
    strategic_initiatives jsonb,
    recommendations text[],
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cash_flow_analysis jsonb,
    ar_aging_analysis jsonb,
    CONSTRAINT board_reports_report_type_check CHECK ((report_type = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'annual'::text]))),
    CONSTRAINT board_reports_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'published'::text])))
);


--
-- Name: budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    period_type text DEFAULT 'monthly'::text NOT NULL,
    period_year integer NOT NULL,
    period_month integer,
    period_quarter integer,
    start_date date NOT NULL,
    end_date date NOT NULL,
    budget_type text DEFAULT 'expense'::text NOT NULL,
    category text NOT NULL,
    subcategory text,
    budgeted_amount numeric DEFAULT 0 NOT NULL,
    actual_amount numeric DEFAULT 0,
    variance_amount numeric GENERATED ALWAYS AS ((budgeted_amount - actual_amount)) STORED,
    variance_percent numeric GENERATED ALWAYS AS (
CASE
    WHEN (budgeted_amount = (0)::numeric) THEN (0)::numeric
    ELSE round((((budgeted_amount - actual_amount) / budgeted_amount) * (100)::numeric), 2)
END) STORED,
    status text DEFAULT 'draft'::text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT budgets_budget_type_check CHECK ((budget_type = ANY (ARRAY['expense'::text, 'revenue'::text, 'capex'::text]))),
    CONSTRAINT budgets_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12))),
    CONSTRAINT budgets_period_quarter_check CHECK (((period_quarter >= 1) AND (period_quarter <= 4))),
    CONSTRAINT budgets_period_type_check CHECK ((period_type = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'yearly'::text]))),
    CONSTRAINT budgets_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'active'::text, 'closed'::text]))),
    CONSTRAINT valid_monthly_period CHECK (((period_type <> 'monthly'::text) OR (period_month IS NOT NULL))),
    CONSTRAINT valid_period_dates CHECK ((end_date >= start_date)),
    CONSTRAINT valid_quarterly_period CHECK (((period_type <> 'quarterly'::text) OR (period_quarter IS NOT NULL)))
);


--
-- Name: cash_forecasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_forecasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    forecast_date date NOT NULL,
    opening_balance numeric(15,2) NOT NULL,
    inflows numeric(15,2) DEFAULT 0,
    outflows numeric(15,2) DEFAULT 0,
    closing_balance numeric(15,2) NOT NULL,
    forecast_type text DEFAULT 'actual'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid
);

ALTER TABLE ONLY public.cash_forecasts REPLICA IDENTITY FULL;


--
-- Name: cash_position; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cash_position WITH (security_invoker='true') AS
 SELECT tenant_id,
    id AS bank_account_id,
    bank_name,
    account_number,
    current_balance,
    currency,
    last_sync_at,
    ( SELECT COALESCE(sum((invoices.total_amount - invoices.paid_amount)), (0)::numeric) AS "coalesce"
           FROM public.invoices
          WHERE ((invoices.tenant_id = ba.tenant_id) AND (invoices.status <> ALL (ARRAY['draft'::text, 'cancelled'::text, 'paid'::text])))) AS ar_outstanding,
    ( SELECT COALESCE(sum((bills.total_amount - bills.paid_amount)), (0)::numeric) AS "coalesce"
           FROM public.bills
          WHERE ((bills.tenant_id = ba.tenant_id) AND (bills.status <> ALL (ARRAY['draft'::text, 'cancelled'::text, 'paid'::text])))) AS ap_outstanding
   FROM public.bank_accounts ba
  WHERE (status = 'active'::text);


--
-- Name: channel_analytics_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_analytics_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    total_orders integer DEFAULT 0,
    gross_revenue numeric DEFAULT 0,
    net_revenue numeric DEFAULT 0,
    total_fees numeric DEFAULT 0,
    total_cogs numeric DEFAULT 0,
    gross_profit numeric DEFAULT 0,
    avg_order_value numeric DEFAULT 0,
    cancelled_orders integer DEFAULT 0,
    returned_orders integer DEFAULT 0,
    channel_metrics jsonb DEFAULT '{}'::jsonb,
    fee_breakdown jsonb DEFAULT '{}'::jsonb,
    daily_summary jsonb DEFAULT '[]'::jsonb,
    status_breakdown jsonb DEFAULT '{}'::jsonb,
    data_start_date date,
    data_end_date date,
    calculated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: channel_fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    integration_id uuid NOT NULL,
    external_order_id uuid,
    fee_type text NOT NULL,
    fee_category text,
    amount numeric DEFAULT 0 NOT NULL,
    currency text DEFAULT 'VND'::text,
    reference_id text,
    description text,
    fee_date date NOT NULL,
    period_start date,
    period_end date,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: connector_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connector_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    connector_type public.connector_type NOT NULL,
    connector_name text NOT NULL,
    shop_id text,
    shop_name text,
    credentials jsonb DEFAULT '{}'::jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'inactive'::text,
    error_message text,
    last_sync_at timestamp with time zone,
    next_sync_at timestamp with time zone,
    sync_frequency_minutes integer DEFAULT 1440,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT connector_integrations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'error'::text, 'expired'::text])))
);


--
-- Name: external_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    integration_id uuid NOT NULL,
    external_order_id text NOT NULL,
    order_number text NOT NULL,
    channel text NOT NULL,
    order_date timestamp with time zone NOT NULL,
    paid_at timestamp with time zone,
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    customer_name text,
    customer_phone text,
    customer_email text,
    shipping_address jsonb,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    item_count integer DEFAULT 0,
    subtotal numeric DEFAULT 0,
    item_discount numeric DEFAULT 0,
    order_discount numeric DEFAULT 0,
    voucher_discount numeric DEFAULT 0,
    shipping_fee numeric DEFAULT 0,
    shipping_fee_discount numeric DEFAULT 0,
    platform_fee numeric DEFAULT 0,
    commission_fee numeric DEFAULT 0,
    payment_fee numeric DEFAULT 0,
    shipping_fee_paid numeric DEFAULT 0,
    other_fees numeric DEFAULT 0,
    total_amount numeric DEFAULT 0,
    seller_income numeric DEFAULT 0,
    cost_of_goods numeric DEFAULT 0,
    gross_profit numeric GENERATED ALWAYS AS ((seller_income - cost_of_goods)) STORED,
    payment_method text,
    payment_status text DEFAULT 'pending'::text,
    status public.order_status DEFAULT 'pending'::public.order_status,
    fulfillment_status text,
    buyer_note text,
    seller_note text,
    cancel_reason text,
    internal_invoice_id uuid,
    internal_order_id uuid,
    raw_data jsonb,
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: channel_performance_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.channel_performance_summary WITH (security_invoker='true') AS
 SELECT ci.tenant_id,
    ci.connector_type,
    ci.connector_name,
    ci.shop_name,
    count(DISTINCT eo.id) AS total_orders,
    sum(eo.total_amount) AS gross_revenue,
    sum(eo.seller_income) AS net_revenue,
    sum(((((eo.platform_fee + eo.commission_fee) + eo.payment_fee) + eo.shipping_fee_paid) + eo.other_fees)) AS total_fees,
    sum(eo.cost_of_goods) AS total_cogs,
    sum(eo.gross_profit) AS gross_profit,
    avg(eo.total_amount) AS avg_order_value,
    count(
        CASE
            WHEN (eo.status = 'cancelled'::public.order_status) THEN 1
            ELSE NULL::integer
        END) AS cancelled_orders,
    count(
        CASE
            WHEN (eo.status = 'returned'::public.order_status) THEN 1
            ELSE NULL::integer
        END) AS returned_orders
   FROM (public.connector_integrations ci
     LEFT JOIN public.external_orders eo ON ((eo.integration_id = ci.id)))
  GROUP BY ci.tenant_id, ci.connector_type, ci.connector_name, ci.shop_name;


--
-- Name: channel_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    integration_id uuid NOT NULL,
    settlement_id text NOT NULL,
    settlement_number text,
    period_start date NOT NULL,
    period_end date NOT NULL,
    payout_date date,
    gross_sales numeric DEFAULT 0,
    total_orders integer DEFAULT 0,
    total_commission numeric DEFAULT 0,
    total_shipping_fee numeric DEFAULT 0,
    total_payment_fee numeric DEFAULT 0,
    total_service_fee numeric DEFAULT 0,
    total_adjustments numeric DEFAULT 0,
    total_refunds numeric DEFAULT 0,
    total_fees numeric GENERATED ALWAYS AS ((((((total_commission + total_shipping_fee) + total_payment_fee) + total_service_fee) + total_adjustments) + total_refunds)) STORED,
    net_amount numeric DEFAULT 0,
    bank_account text,
    bank_name text,
    transaction_id text,
    status public.settlement_status DEFAULT 'pending'::public.settlement_status,
    order_ids jsonb DEFAULT '[]'::jsonb,
    fee_breakdown jsonb DEFAULT '{}'::jsonb,
    is_reconciled boolean DEFAULT false,
    reconciled_at timestamp with time zone,
    reconciled_by uuid,
    variance_amount numeric DEFAULT 0,
    variance_notes text,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cost_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_centers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    manager_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    budget_amount numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: covenant_measurements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.covenant_measurements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    covenant_id uuid NOT NULL,
    measurement_date date NOT NULL,
    measured_value numeric NOT NULL,
    status text NOT NULL,
    numerator_value numeric,
    denominator_value numeric,
    calculation_details jsonb,
    notes text,
    measured_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT covenant_measurements_status_check CHECK ((status = ANY (ARRAY['compliant'::text, 'warning'::text, 'breach'::text, 'waiver'::text])))
);


--
-- Name: credit_note_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_note_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    credit_note_id uuid NOT NULL,
    invoice_item_id uuid,
    product_id uuid,
    description text NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    vat_rate numeric DEFAULT 10,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: credit_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    credit_note_number text NOT NULL,
    invoice_id uuid,
    customer_id uuid,
    credit_note_date date DEFAULT CURRENT_DATE NOT NULL,
    reason text NOT NULL,
    description text,
    subtotal numeric DEFAULT 0 NOT NULL,
    vat_amount numeric DEFAULT 0 NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    currency_code text DEFAULT 'VND'::text,
    exchange_rate numeric DEFAULT 1,
    total_amount_base numeric,
    status text DEFAULT 'draft'::text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    applied_at timestamp with time zone,
    journal_entry_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);


--
-- Name: currencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.currencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    symbol text,
    is_base boolean DEFAULT false,
    is_active boolean DEFAULT true NOT NULL,
    decimal_places integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: daily_channel_revenue; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.daily_channel_revenue WITH (security_invoker='true') AS
 SELECT tenant_id,
    date(order_date) AS order_date,
    channel,
    count(*) AS order_count,
    sum(total_amount) AS gross_revenue,
    sum(seller_income) AS net_revenue,
    sum((platform_fee + commission_fee)) AS platform_fees,
    sum(gross_profit) AS profit
   FROM public.external_orders eo
  WHERE (status <> ALL (ARRAY['cancelled'::public.order_status, 'returned'::public.order_status]))
  GROUP BY tenant_id, (date(order_date)), channel;


--
-- Name: dashboard_kpi_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_kpi_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    cash_today numeric DEFAULT 0,
    cash_7d numeric DEFAULT 0,
    total_ar numeric DEFAULT 0,
    overdue_ar numeric DEFAULT 0,
    dso integer DEFAULT 0,
    ccc integer DEFAULT 0,
    gross_margin numeric DEFAULT 0,
    ebitda numeric DEFAULT 0,
    auto_match_rate numeric DEFAULT 0,
    total_revenue numeric DEFAULT 0,
    total_cogs numeric DEFAULT 0,
    total_opex numeric DEFAULT 0,
    invoice_count integer DEFAULT 0,
    overdue_invoice_count integer DEFAULT 0,
    transaction_count integer DEFAULT 0,
    matched_transaction_count integer DEFAULT 0,
    date_range_start date,
    date_range_end date,
    calculated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: debit_note_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.debit_note_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    debit_note_id uuid NOT NULL,
    invoice_item_id uuid,
    product_id uuid,
    description text NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    vat_rate numeric DEFAULT 10,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: debit_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.debit_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    debit_note_number text NOT NULL,
    invoice_id uuid,
    customer_id uuid,
    debit_note_date date DEFAULT CURRENT_DATE NOT NULL,
    reason text NOT NULL,
    description text,
    subtotal numeric DEFAULT 0 NOT NULL,
    vat_amount numeric DEFAULT 0 NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    currency_code text DEFAULT 'VND'::text,
    exchange_rate numeric DEFAULT 1,
    total_amount_base numeric,
    status text DEFAULT 'draft'::text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    applied_at timestamp with time zone,
    journal_entry_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);


--
-- Name: depreciation_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.depreciation_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    fixed_asset_id uuid NOT NULL,
    period_date date NOT NULL,
    depreciation_amount numeric NOT NULL,
    accumulated_amount numeric NOT NULL,
    remaining_value numeric NOT NULL,
    is_posted boolean DEFAULT false,
    journal_entry_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: etl_pipelines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.etl_pipelines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    source text NOT NULL,
    destination text NOT NULL,
    schedule text,
    status text DEFAULT 'idle'::text NOT NULL,
    last_run_at timestamp with time zone,
    records_processed integer DEFAULT 0,
    enabled boolean DEFAULT true,
    error_message text,
    config jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT etl_pipelines_status_check CHECK ((status = ANY (ARRAY['idle'::text, 'running'::text, 'success'::text, 'error'::text])))
);


--
-- Name: etl_transform_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.etl_transform_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    rule_type text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    from_currency_id uuid NOT NULL,
    to_currency_id uuid NOT NULL,
    rate numeric NOT NULL,
    effective_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    category public.expense_category NOT NULL,
    subcategory text,
    description text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    vendor_name text,
    reference_number text,
    payment_method text,
    is_recurring boolean DEFAULT false,
    recurring_period text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    vendor_id uuid,
    cost_center_id uuid,
    tax_code_id uuid,
    currency_code text DEFAULT 'VND'::text,
    exchange_rate numeric DEFAULT 1,
    amount_base numeric GENERATED ALWAYS AS ((amount * exchange_rate)) STORED
);

ALTER TABLE ONLY public.expenses REPLICA IDENTITY FULL;


--
-- Name: external_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    integration_id uuid NOT NULL,
    external_product_id uuid,
    warehouse_id text,
    warehouse_name text,
    available_quantity integer DEFAULT 0,
    reserved_quantity integer DEFAULT 0,
    incoming_quantity integer DEFAULT 0,
    unit_cost numeric DEFAULT 0,
    total_value numeric GENERATED ALWAYS AS (((available_quantity)::numeric * unit_cost)) STORED,
    last_movement_at timestamp with time zone,
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: external_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    integration_id uuid NOT NULL,
    external_product_id text NOT NULL,
    external_sku text,
    parent_sku text,
    barcode text,
    name text NOT NULL,
    description text,
    category text,
    brand text,
    cost_price numeric DEFAULT 0,
    selling_price numeric DEFAULT 0,
    compare_at_price numeric,
    stock_quantity integer DEFAULT 0,
    reserved_quantity integer DEFAULT 0,
    available_quantity integer GENERATED ALWAYS AS ((stock_quantity - reserved_quantity)) STORED,
    variants jsonb DEFAULT '[]'::jsonb,
    images jsonb DEFAULT '[]'::jsonb,
    weight numeric,
    dimensions jsonb,
    internal_product_id uuid,
    status text DEFAULT 'active'::text,
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT external_products_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'deleted'::text])))
);


--
-- Name: financial_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    period_name text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_closed boolean DEFAULT false NOT NULL,
    closed_at timestamp with time zone,
    closed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT financial_periods_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12))),
    CONSTRAINT valid_period_dates CHECK ((end_date >= start_date))
);


--
-- Name: fixed_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fixed_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    asset_code text NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    purchase_date date NOT NULL,
    purchase_value numeric NOT NULL,
    residual_value numeric DEFAULT 0,
    useful_life_months integer NOT NULL,
    depreciation_method text DEFAULT 'straight_line'::text,
    accumulated_depreciation numeric DEFAULT 0,
    current_value numeric GENERATED ALWAYS AS ((purchase_value - accumulated_depreciation)) STORED,
    location text,
    cost_center_id uuid,
    gl_asset_account_id uuid,
    gl_depreciation_account_id uuid,
    gl_expense_account_id uuid,
    status text DEFAULT 'active'::text,
    disposed_date date,
    disposed_value numeric,
    vendor_id uuid,
    bill_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fixed_assets_depreciation_method_check CHECK ((depreciation_method = ANY (ARRAY['straight_line'::text, 'declining_balance'::text]))),
    CONSTRAINT fixed_assets_status_check CHECK ((status = ANY (ARRAY['active'::text, 'disposed'::text, 'fully_depreciated'::text])))
);


--
-- Name: gl_account_defaults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gl_account_defaults (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    accounts_receivable_id uuid,
    sales_revenue_id uuid,
    sales_vat_id uuid,
    sales_discount_id uuid,
    accounts_payable_id uuid,
    purchase_expense_id uuid,
    purchase_vat_id uuid,
    cash_id uuid,
    bank_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: import_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    source text,
    records_total integer DEFAULT 0,
    records_processed integer DEFAULT 0,
    records_failed integer DEFAULT 0,
    error_message text,
    completed_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT import_jobs_file_type_check CHECK ((file_type = ANY (ARRAY['csv'::text, 'excel'::text, 'json'::text]))),
    CONSTRAINT import_jobs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: invoice_adjustments_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.invoice_adjustments_summary WITH (security_invoker='true') AS
 SELECT i.id AS invoice_id,
    i.tenant_id,
    i.invoice_number,
    i.customer_id,
    c.name AS customer_name,
    i.total_amount AS original_amount,
    COALESCE(i.credit_note_amount, (0)::numeric) AS total_credit_notes,
    COALESCE(i.debit_note_amount, (0)::numeric) AS total_debit_notes,
    i.net_amount,
    COALESCE(i.paid_amount, (0)::numeric) AS paid_amount,
    (i.net_amount - COALESCE(i.paid_amount, (0)::numeric)) AS balance_due,
    ( SELECT count(*) AS count
           FROM public.credit_notes cn
          WHERE ((cn.invoice_id = i.id) AND (cn.status <> 'cancelled'::text))) AS credit_note_count,
    ( SELECT count(*) AS count
           FROM public.debit_notes dn
          WHERE ((dn.invoice_id = i.id) AND (dn.status <> 'cancelled'::text))) AS debit_note_count
   FROM (public.invoices i
     LEFT JOIN public.customers c ON ((c.id = i.customer_id)))
  WHERE (i.status <> 'cancelled'::text);


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid,
    description text NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    vat_rate numeric(5,2) DEFAULT 10,
    amount numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    product_id uuid
);


--
-- Name: invoice_promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid,
    promotion_type text NOT NULL,
    code text,
    description text,
    discount_percent numeric(5,2),
    discount_amount numeric(15,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid
);


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entry_number text NOT NULL,
    entry_date date NOT NULL,
    period_id uuid,
    description text NOT NULL,
    reference text,
    source_type text,
    source_id uuid,
    total_debit numeric DEFAULT 0 NOT NULL,
    total_credit numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    posted_at timestamp with time zone,
    posted_by uuid,
    voided_at timestamp with time zone,
    voided_by uuid,
    void_reason text,
    is_approved boolean DEFAULT false NOT NULL,
    approved_at timestamp with time zone,
    approved_by uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT journal_entries_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'posted'::text, 'voided'::text])))
);


--
-- Name: journal_entry_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entry_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    journal_entry_id uuid NOT NULL,
    account_id uuid NOT NULL,
    debit_amount numeric DEFAULT 0 NOT NULL,
    credit_amount numeric DEFAULT 0 NOT NULL,
    description text,
    line_number integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    currency_code text DEFAULT 'VND'::text,
    exchange_rate numeric DEFAULT 1,
    debit_amount_base numeric GENERATED ALWAYS AS ((debit_amount * exchange_rate)) STORED,
    credit_amount_base numeric GENERATED ALWAYS AS ((credit_amount * exchange_rate)) STORED,
    cost_center_id uuid,
    CONSTRAINT journal_entry_lines_credit_amount_check CHECK ((credit_amount >= (0)::numeric)),
    CONSTRAINT journal_entry_lines_debit_amount_check CHECK ((debit_amount >= (0)::numeric)),
    CONSTRAINT valid_debit_credit CHECK ((((debit_amount > (0)::numeric) AND (credit_amount = (0)::numeric)) OR ((debit_amount = (0)::numeric) AND (credit_amount > (0)::numeric))))
);


--
-- Name: monte_carlo_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monte_carlo_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scenario_id uuid,
    simulation_count integer DEFAULT 1000 NOT NULL,
    mean_ebitda numeric,
    std_dev_ebitda numeric,
    p10_ebitda numeric,
    p50_ebitda numeric,
    p90_ebitda numeric,
    min_ebitda numeric,
    max_ebitda numeric,
    distribution_data jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid
);


--
-- Name: order_auto_approval_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_auto_approval_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source text NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    max_amount numeric,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    CONSTRAINT order_auto_approval_rules_source_check CHECK ((source = ANY (ARRAY['erp'::text, 'ecommerce'::text, 'pos'::text, 'api'::text])))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    customer_id uuid,
    customer_name text NOT NULL,
    source text NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    order_date timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    invoice_id uuid,
    CONSTRAINT orders_source_check CHECK ((source = ANY (ARRAY['erp'::text, 'ecommerce'::text, 'pos'::text, 'api'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'review'::text, 'approved'::text, 'rejected'::text, 'invoiced'::text, 'error'::text])))
);


--
-- Name: payment_terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_terms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    days integer DEFAULT 30 NOT NULL,
    discount_percent numeric DEFAULT 0,
    discount_days integer DEFAULT 0,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid,
    amount numeric(15,2) NOT NULL,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    payment_method text,
    reference_code text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid
);


--
-- Name: pl_report_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pl_report_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    period_type text DEFAULT 'monthly'::text,
    period_year integer NOT NULL,
    period_month integer,
    period_quarter integer,
    gross_sales numeric DEFAULT 0,
    sales_returns numeric DEFAULT 0,
    sales_discounts numeric DEFAULT 0,
    net_sales numeric DEFAULT 0,
    invoice_revenue numeric DEFAULT 0,
    contract_revenue numeric DEFAULT 0,
    integrated_revenue numeric DEFAULT 0,
    cogs numeric DEFAULT 0,
    gross_profit numeric DEFAULT 0,
    gross_margin numeric DEFAULT 0,
    opex_salaries numeric DEFAULT 0,
    opex_rent numeric DEFAULT 0,
    opex_utilities numeric DEFAULT 0,
    opex_marketing numeric DEFAULT 0,
    opex_depreciation numeric DEFAULT 0,
    opex_insurance numeric DEFAULT 0,
    opex_supplies numeric DEFAULT 0,
    opex_maintenance numeric DEFAULT 0,
    opex_professional numeric DEFAULT 0,
    opex_other numeric DEFAULT 0,
    total_opex numeric DEFAULT 0,
    operating_income numeric DEFAULT 0,
    operating_margin numeric DEFAULT 0,
    other_income numeric DEFAULT 0,
    interest_expense numeric DEFAULT 0,
    income_before_tax numeric DEFAULT 0,
    income_tax numeric DEFAULT 0,
    net_income numeric DEFAULT 0,
    net_margin numeric DEFAULT 0,
    category_data jsonb DEFAULT '[]'::jsonb,
    comparison_data jsonb DEFAULT '{}'::jsonb,
    calculated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pl_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.pl_summary WITH (security_invoker='true') AS
 SELECT tenant_id,
    account_type,
    sum(
        CASE
            WHEN (account_type = 'revenue'::text) THEN current_balance
            ELSE (0)::numeric
        END) AS total_revenue,
    sum(
        CASE
            WHEN (account_type = 'expense'::text) THEN current_balance
            ELSE (0)::numeric
        END) AS total_expense
   FROM public.gl_accounts ga
  WHERE ((account_type = ANY (ARRAY['revenue'::text, 'expense'::text])) AND (is_active = true))
  GROUP BY tenant_id, account_type;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    unit text DEFAULT 'cái'::text,
    unit_price numeric DEFAULT 0,
    cost_price numeric DEFAULT 0,
    category text,
    is_service boolean DEFAULT false,
    vat_rate numeric DEFAULT 10,
    status text DEFAULT 'active'::text,
    min_stock numeric DEFAULT 0,
    current_stock numeric DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gl_revenue_account_id uuid,
    gl_cogs_account_id uuid,
    gl_inventory_account_id uuid,
    CONSTRAINT products_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'discontinued'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    avatar_url text,
    phone text,
    "position" text,
    department text,
    company text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    active_tenant_id uuid
);


--
-- Name: recurring_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    template_type text NOT NULL,
    frequency text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    next_run_date date,
    last_run_date date,
    template_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    auto_post boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recurring_templates_frequency_check CHECK ((frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text]))),
    CONSTRAINT recurring_templates_template_type_check CHECK ((template_type = ANY (ARRAY['invoice'::text, 'bill'::text, 'expense'::text, 'journal_entry'::text])))
);


--
-- Name: revenue_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revenue_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    revenue_id uuid,
    entry_date date DEFAULT CURRENT_DATE NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid
);


--
-- Name: revenues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revenues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_name text NOT NULL,
    customer_id uuid,
    customer_name text,
    revenue_type public.revenue_type DEFAULT 'one_time'::public.revenue_type NOT NULL,
    source public.revenue_source DEFAULT 'manual'::public.revenue_source NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    recurring_day integer,
    description text,
    notes text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    CONSTRAINT revenues_recurring_day_check CHECK (((recurring_day >= 1) AND (recurring_day <= 31)))
);

ALTER TABLE ONLY public.revenues REPLICA IDENTITY FULL;


--
-- Name: rolling_forecasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rolling_forecasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    forecast_month date NOT NULL,
    forecast_type text DEFAULT 'revenue'::text NOT NULL,
    original_budget numeric DEFAULT 0 NOT NULL,
    current_forecast numeric DEFAULT 0 NOT NULL,
    actual_amount numeric DEFAULT 0,
    variance_amount numeric GENERATED ALWAYS AS ((current_forecast - original_budget)) STORED,
    variance_percent numeric GENERATED ALWAYS AS (
CASE
    WHEN (original_budget <> (0)::numeric) THEN (((current_forecast - original_budget) / abs(original_budget)) * (100)::numeric)
    ELSE (0)::numeric
END) STORED,
    category text,
    channel text,
    notes text,
    confidence_level text DEFAULT 'medium'::text,
    last_revised_at timestamp with time zone DEFAULT now(),
    last_revised_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rolling_forecasts_confidence_level_check CHECK ((confidence_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT rolling_forecasts_forecast_type_check CHECK ((forecast_type = ANY (ARRAY['revenue'::text, 'expense'::text, 'cash_inflow'::text, 'cash_outflow'::text])))
);


--
-- Name: scenario_monthly_actuals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scenario_monthly_actuals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    metric_type text NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    actual_value numeric DEFAULT 0,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT scenario_monthly_actuals_month_check CHECK (((month >= 1) AND (month <= 12)))
);


--
-- Name: scenario_monthly_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scenario_monthly_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    scenario_id uuid NOT NULL,
    metric_type text NOT NULL,
    year integer NOT NULL,
    month_1 numeric DEFAULT 0,
    month_2 numeric DEFAULT 0,
    month_3 numeric DEFAULT 0,
    month_4 numeric DEFAULT 0,
    month_5 numeric DEFAULT 0,
    month_6 numeric DEFAULT 0,
    month_7 numeric DEFAULT 0,
    month_8 numeric DEFAULT 0,
    month_9 numeric DEFAULT 0,
    month_10 numeric DEFAULT 0,
    month_11 numeric DEFAULT 0,
    month_12 numeric DEFAULT 0,
    total_target numeric DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    revenue_change numeric(5,2) DEFAULT 0,
    cost_change numeric(5,2) DEFAULT 0,
    base_revenue numeric(15,2),
    base_costs numeric(15,2),
    calculated_ebitda numeric(15,2),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    is_primary boolean DEFAULT false
);


--
-- Name: strategic_initiatives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strategic_initiatives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    progress integer DEFAULT 0,
    budget numeric DEFAULT 0,
    spent numeric DEFAULT 0,
    start_date date,
    end_date date,
    kpis text[],
    milestones jsonb DEFAULT '[]'::jsonb,
    owner text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT strategic_initiatives_category_check CHECK ((category = ANY (ARRAY['growth'::text, 'efficiency'::text, 'innovation'::text, 'risk_management'::text, 'cost_optimization'::text, 'digital_transformation'::text, 'market_expansion'::text, 'other'::text]))),
    CONSTRAINT strategic_initiatives_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT strategic_initiatives_progress_check CHECK (((progress >= 0) AND (progress <= 100))),
    CONSTRAINT strategic_initiatives_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text, 'on_hold'::text, 'cancelled'::text])))
);


--
-- Name: sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    integration_id uuid NOT NULL,
    sync_type text NOT NULL,
    sync_mode text DEFAULT 'incremental'::text,
    status public.sync_status DEFAULT 'pending'::public.sync_status,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    duration_seconds integer,
    records_fetched integer DEFAULT 0,
    records_created integer DEFAULT 0,
    records_updated integer DEFAULT 0,
    records_failed integer DEFAULT 0,
    error_message text,
    error_details jsonb,
    triggered_by text DEFAULT 'scheduled'::text,
    request_params jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: tax_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    rate numeric DEFAULT 10 NOT NULL,
    tax_type text DEFAULT 'vat'::text NOT NULL,
    gl_account_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tax_codes_tax_type_check CHECK ((tax_type = ANY (ARRAY['vat'::text, 'pit'::text, 'cit'::text, 'other'::text])))
);


--
-- Name: tax_filings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_filings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    tax_obligation_id uuid,
    name text NOT NULL,
    filing_number text,
    submitted_date timestamp with time zone,
    status text DEFAULT 'draft'::text NOT NULL,
    document_url text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tax_obligations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_obligations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    tax_type text NOT NULL,
    period text NOT NULL,
    due_date date NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    paid_amount numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tenant_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.tenant_role DEFAULT 'member'::public.tenant_role NOT NULL,
    is_active boolean DEFAULT true,
    invited_by uuid,
    invited_at timestamp with time zone DEFAULT now(),
    joined_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    plan text DEFAULT 'free'::text,
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: trial_balance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.trial_balance WITH (security_invoker='true') AS
 SELECT tenant_id,
    id AS account_id,
    account_code,
    account_name,
    account_type,
    normal_balance,
    current_balance,
        CASE
            WHEN (normal_balance = 'debit'::text) THEN current_balance
            ELSE (0)::numeric
        END AS debit_balance,
        CASE
            WHEN (normal_balance = 'credit'::text) THEN current_balance
            ELSE (0)::numeric
        END AS credit_balance
   FROM public.gl_accounts ga
  WHERE ((is_active = true) AND (is_header = false))
  ORDER BY account_code;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'viewer'::public.app_role NOT NULL
);


--
-- Name: variance_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.variance_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    analysis_period date NOT NULL,
    period_type text DEFAULT 'monthly'::text NOT NULL,
    category text NOT NULL,
    subcategory text,
    channel text,
    budget_amount numeric DEFAULT 0 NOT NULL,
    actual_amount numeric DEFAULT 0 NOT NULL,
    prior_period_amount numeric DEFAULT 0,
    prior_year_amount numeric DEFAULT 0,
    variance_to_budget numeric GENERATED ALWAYS AS ((actual_amount - budget_amount)) STORED,
    variance_pct_budget numeric GENERATED ALWAYS AS (
CASE
    WHEN (budget_amount <> (0)::numeric) THEN (((actual_amount - budget_amount) / abs(budget_amount)) * (100)::numeric)
    ELSE (0)::numeric
END) STORED,
    variance_to_prior numeric GENERATED ALWAYS AS ((actual_amount - prior_period_amount)) STORED,
    yoy_variance numeric GENERATED ALWAYS AS ((actual_amount - prior_year_amount)) STORED,
    yoy_variance_pct numeric GENERATED ALWAYS AS (
CASE
    WHEN (prior_year_amount <> (0)::numeric) THEN (((actual_amount - prior_year_amount) / abs(prior_year_amount)) * (100)::numeric)
    ELSE (0)::numeric
END) STORED,
    variance_drivers jsonb DEFAULT '[]'::jsonb,
    is_significant boolean GENERATED ALWAYS AS ((abs(
CASE
    WHEN (budget_amount <> (0)::numeric) THEN (((actual_amount - budget_amount) / abs(budget_amount)) * (100)::numeric)
    ELSE (0)::numeric
END) > (10)::numeric)) STORED,
    requires_action boolean DEFAULT false,
    action_taken text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT variance_analysis_period_type_check CHECK ((period_type = ANY (ARRAY['weekly'::text, 'monthly'::text, 'quarterly'::text])))
);


--
-- Name: vendor_credit_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_credit_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    credit_note_number text NOT NULL,
    vendor_credit_note_number text,
    bill_id uuid,
    vendor_id uuid,
    credit_note_date date DEFAULT CURRENT_DATE NOT NULL,
    reason text NOT NULL,
    description text,
    subtotal numeric DEFAULT 0 NOT NULL,
    vat_amount numeric DEFAULT 0 NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    currency_code text DEFAULT 'VND'::text,
    exchange_rate numeric DEFAULT 1,
    total_amount_base numeric,
    status text DEFAULT 'draft'::text NOT NULL,
    journal_entry_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);


--
-- Name: vendor_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    payment_number text NOT NULL,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    vendor_id uuid,
    bill_id uuid,
    amount numeric NOT NULL,
    payment_method text,
    bank_account_id uuid,
    reference_code text,
    journal_entry_id uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT vendor_payments_payment_method_check CHECK ((payment_method = ANY (ARRAY['bank_transfer'::text, 'cash'::text, 'check'::text, 'credit_card'::text, 'other'::text])))
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    tax_code text,
    address text,
    phone text,
    email text,
    contact_person text,
    payment_terms integer DEFAULT 30,
    bank_name text,
    bank_account text,
    status text DEFAULT 'active'::text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    vendor_type text DEFAULT 'regular'::text,
    payment_term_id uuid,
    currency_code text DEFAULT 'VND'::text,
    gl_payable_account_id uuid,
    CONSTRAINT vendors_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text]))),
    CONSTRAINT vendors_vendor_type_check CHECK ((vendor_type = ANY (ARRAY['regular'::text, 'strategic'::text, 'one_time'::text])))
);


--
-- Name: what_if_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.what_if_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    created_by uuid,
    name text NOT NULL,
    description text,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    results jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_favorite boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    control_mode text DEFAULT 'simple'::text,
    retail_params jsonb DEFAULT '{}'::jsonb,
    monthly_trend_data jsonb
);


--
-- Name: whatif_metrics_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatif_metrics_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    total_revenue numeric DEFAULT 0 NOT NULL,
    total_cogs numeric DEFAULT 0 NOT NULL,
    total_fees numeric DEFAULT 0 NOT NULL,
    total_orders integer DEFAULT 0 NOT NULL,
    avg_order_value numeric DEFAULT 0 NOT NULL,
    return_rate numeric DEFAULT 0 NOT NULL,
    monthly_growth_rate numeric DEFAULT 0 NOT NULL,
    channel_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    marketing_cost numeric DEFAULT 0 NOT NULL,
    overhead_cost numeric DEFAULT 0 NOT NULL,
    data_start_date date,
    data_end_date date,
    order_count integer DEFAULT 0 NOT NULL,
    calculated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: working_capital_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.working_capital_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    metric_date date NOT NULL,
    dso_days integer DEFAULT 0,
    dpo_days integer DEFAULT 0,
    dio_days integer DEFAULT 0,
    ccc_days integer GENERATED ALWAYS AS (((dso_days + dio_days) - dpo_days)) STORED,
    accounts_receivable numeric DEFAULT 0,
    accounts_payable numeric DEFAULT 0,
    inventory_value numeric DEFAULT 0,
    current_assets numeric DEFAULT 0,
    current_liabilities numeric DEFAULT 0,
    net_working_capital numeric GENERATED ALWAYS AS ((current_assets - current_liabilities)) STORED,
    ar_turnover numeric DEFAULT 0,
    ap_turnover numeric DEFAULT 0,
    inventory_turnover numeric DEFAULT 0,
    target_dso integer,
    target_dpo integer,
    target_dio integer,
    potential_cash_release numeric GENERATED ALWAYS AS (
CASE
    WHEN ((accounts_receivable > (0)::numeric) AND (dso_days > COALESCE(target_dso, dso_days))) THEN (((dso_days - COALESCE(target_dso, dso_days)))::numeric * (accounts_receivable / (NULLIF(dso_days, 0))::numeric))
    ELSE (0)::numeric
END) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_usage_logs ai_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: alert_settings alert_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_settings
    ADD CONSTRAINT alert_settings_pkey PRIMARY KEY (id);


--
-- Name: alert_settings alert_settings_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_settings
    ADD CONSTRAINT alert_settings_tenant_id_key UNIQUE (tenant_id);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_connection_configs bank_connection_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_connection_configs
    ADD CONSTRAINT bank_connection_configs_pkey PRIMARY KEY (id);


--
-- Name: bank_connection_configs bank_connection_configs_tenant_id_bank_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_connection_configs
    ADD CONSTRAINT bank_connection_configs_tenant_id_bank_code_key UNIQUE (tenant_id, bank_code);


--
-- Name: bank_covenants bank_covenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_covenants
    ADD CONSTRAINT bank_covenants_pkey PRIMARY KEY (id);


--
-- Name: bank_transactions bank_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_pkey PRIMARY KEY (id);


--
-- Name: bill_items bill_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_items
    ADD CONSTRAINT bill_items_pkey PRIMARY KEY (id);


--
-- Name: bills bills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_pkey PRIMARY KEY (id);


--
-- Name: board_reports board_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_reports
    ADD CONSTRAINT board_reports_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: cash_forecasts cash_forecasts_forecast_date_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_forecasts
    ADD CONSTRAINT cash_forecasts_forecast_date_unique UNIQUE (forecast_date);


--
-- Name: cash_forecasts cash_forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_forecasts
    ADD CONSTRAINT cash_forecasts_pkey PRIMARY KEY (id);


--
-- Name: channel_analytics_cache channel_analytics_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_analytics_cache
    ADD CONSTRAINT channel_analytics_cache_pkey PRIMARY KEY (id);


--
-- Name: channel_analytics_cache channel_analytics_cache_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_analytics_cache
    ADD CONSTRAINT channel_analytics_cache_tenant_id_key UNIQUE (tenant_id);


--
-- Name: channel_fees channel_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_fees
    ADD CONSTRAINT channel_fees_pkey PRIMARY KEY (id);


--
-- Name: channel_settlements channel_settlements_integration_id_settlement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_settlements
    ADD CONSTRAINT channel_settlements_integration_id_settlement_id_key UNIQUE (integration_id, settlement_id);


--
-- Name: channel_settlements channel_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_settlements
    ADD CONSTRAINT channel_settlements_pkey PRIMARY KEY (id);


--
-- Name: connector_integrations connector_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_integrations
    ADD CONSTRAINT connector_integrations_pkey PRIMARY KEY (id);


--
-- Name: cost_centers cost_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_pkey PRIMARY KEY (id);


--
-- Name: covenant_measurements covenant_measurements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.covenant_measurements
    ADD CONSTRAINT covenant_measurements_pkey PRIMARY KEY (id);


--
-- Name: credit_note_items credit_note_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_note_items
    ADD CONSTRAINT credit_note_items_pkey PRIMARY KEY (id);


--
-- Name: credit_notes credit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_pkey PRIMARY KEY (id);


--
-- Name: credit_notes credit_notes_tenant_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_tenant_number_unique UNIQUE (tenant_id, credit_note_number);


--
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: dashboard_kpi_cache dashboard_kpi_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_kpi_cache
    ADD CONSTRAINT dashboard_kpi_cache_pkey PRIMARY KEY (id);


--
-- Name: dashboard_kpi_cache dashboard_kpi_cache_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_kpi_cache
    ADD CONSTRAINT dashboard_kpi_cache_tenant_id_key UNIQUE (tenant_id);


--
-- Name: debit_note_items debit_note_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_note_items
    ADD CONSTRAINT debit_note_items_pkey PRIMARY KEY (id);


--
-- Name: debit_notes debit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_notes
    ADD CONSTRAINT debit_notes_pkey PRIMARY KEY (id);


--
-- Name: debit_notes debit_notes_tenant_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_notes
    ADD CONSTRAINT debit_notes_tenant_number_unique UNIQUE (tenant_id, debit_note_number);


--
-- Name: depreciation_schedules depreciation_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_schedules
    ADD CONSTRAINT depreciation_schedules_pkey PRIMARY KEY (id);


--
-- Name: etl_pipelines etl_pipelines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etl_pipelines
    ADD CONSTRAINT etl_pipelines_pkey PRIMARY KEY (id);


--
-- Name: etl_transform_rules etl_transform_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etl_transform_rules
    ADD CONSTRAINT etl_transform_rules_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: external_inventory external_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_inventory
    ADD CONSTRAINT external_inventory_pkey PRIMARY KEY (id);


--
-- Name: external_orders external_orders_integration_id_external_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_orders
    ADD CONSTRAINT external_orders_integration_id_external_order_id_key UNIQUE (integration_id, external_order_id);


--
-- Name: external_orders external_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_orders
    ADD CONSTRAINT external_orders_pkey PRIMARY KEY (id);


--
-- Name: external_orders external_orders_tenant_integration_order_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_orders
    ADD CONSTRAINT external_orders_tenant_integration_order_unique UNIQUE (tenant_id, integration_id, external_order_id);


--
-- Name: external_products external_products_integration_id_external_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_products
    ADD CONSTRAINT external_products_integration_id_external_product_id_key UNIQUE (integration_id, external_product_id);


--
-- Name: external_products external_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_products
    ADD CONSTRAINT external_products_pkey PRIMARY KEY (id);


--
-- Name: financial_periods financial_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_periods
    ADD CONSTRAINT financial_periods_pkey PRIMARY KEY (id);


--
-- Name: fixed_assets fixed_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT fixed_assets_pkey PRIMARY KEY (id);


--
-- Name: gl_account_defaults gl_account_defaults_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_defaults
    ADD CONSTRAINT gl_account_defaults_pkey PRIMARY KEY (id);


--
-- Name: gl_accounts gl_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_accounts
    ADD CONSTRAINT gl_accounts_pkey PRIMARY KEY (id);


--
-- Name: import_jobs import_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoice_promotions invoice_promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_promotions
    ADD CONSTRAINT invoice_promotions_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journal_entry_lines journal_entry_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_pkey PRIMARY KEY (id);


--
-- Name: monte_carlo_results monte_carlo_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monte_carlo_results
    ADD CONSTRAINT monte_carlo_results_pkey PRIMARY KEY (id);


--
-- Name: order_auto_approval_rules order_auto_approval_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_auto_approval_rules
    ADD CONSTRAINT order_auto_approval_rules_pkey PRIMARY KEY (id);


--
-- Name: order_auto_approval_rules order_auto_approval_rules_source_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_auto_approval_rules
    ADD CONSTRAINT order_auto_approval_rules_source_key UNIQUE (source);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_terms payment_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_terms
    ADD CONSTRAINT payment_terms_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: pl_report_cache pl_report_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_report_cache
    ADD CONSTRAINT pl_report_cache_pkey PRIMARY KEY (id);


--
-- Name: pl_report_cache pl_report_cache_unique_period; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_report_cache
    ADD CONSTRAINT pl_report_cache_unique_period UNIQUE (tenant_id, period_type, period_year, period_month, period_quarter);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_tenant_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_tenant_id_code_key UNIQUE (tenant_id, code);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: recurring_templates recurring_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_templates
    ADD CONSTRAINT recurring_templates_pkey PRIMARY KEY (id);


--
-- Name: revenue_entries revenue_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_entries
    ADD CONSTRAINT revenue_entries_pkey PRIMARY KEY (id);


--
-- Name: revenues revenues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenues
    ADD CONSTRAINT revenues_pkey PRIMARY KEY (id);


--
-- Name: rolling_forecasts rolling_forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rolling_forecasts
    ADD CONSTRAINT rolling_forecasts_pkey PRIMARY KEY (id);


--
-- Name: rolling_forecasts rolling_forecasts_tenant_id_forecast_month_forecast_type_ca_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rolling_forecasts
    ADD CONSTRAINT rolling_forecasts_tenant_id_forecast_month_forecast_type_ca_key UNIQUE (tenant_id, forecast_month, forecast_type, category, channel);


--
-- Name: scenario_monthly_actuals scenario_monthly_actuals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_monthly_actuals
    ADD CONSTRAINT scenario_monthly_actuals_pkey PRIMARY KEY (id);


--
-- Name: scenario_monthly_actuals scenario_monthly_actuals_tenant_id_metric_type_year_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_monthly_actuals
    ADD CONSTRAINT scenario_monthly_actuals_tenant_id_metric_type_year_month_key UNIQUE (tenant_id, metric_type, year, month);


--
-- Name: scenario_monthly_plans scenario_monthly_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_monthly_plans
    ADD CONSTRAINT scenario_monthly_plans_pkey PRIMARY KEY (id);


--
-- Name: scenario_monthly_plans scenario_monthly_plans_tenant_id_scenario_id_metric_type_ye_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_monthly_plans
    ADD CONSTRAINT scenario_monthly_plans_tenant_id_scenario_id_metric_type_ye_key UNIQUE (tenant_id, scenario_id, metric_type, year);


--
-- Name: scenarios scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenarios
    ADD CONSTRAINT scenarios_pkey PRIMARY KEY (id);


--
-- Name: strategic_initiatives strategic_initiatives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_initiatives
    ADD CONSTRAINT strategic_initiatives_pkey PRIMARY KEY (id);


--
-- Name: sync_logs sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_pkey PRIMARY KEY (id);


--
-- Name: tax_codes tax_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_codes
    ADD CONSTRAINT tax_codes_pkey PRIMARY KEY (id);


--
-- Name: tax_filings tax_filings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_filings
    ADD CONSTRAINT tax_filings_pkey PRIMARY KEY (id);


--
-- Name: tax_obligations tax_obligations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_obligations
    ADD CONSTRAINT tax_obligations_pkey PRIMARY KEY (id);


--
-- Name: tenant_users tenant_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_users
    ADD CONSTRAINT tenant_users_pkey PRIMARY KEY (id);


--
-- Name: tenant_users tenant_users_tenant_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_users
    ADD CONSTRAINT tenant_users_tenant_id_user_id_key UNIQUE (tenant_id, user_id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: gl_accounts unique_account_code_per_tenant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_accounts
    ADD CONSTRAINT unique_account_code_per_tenant UNIQUE (tenant_id, account_code);


--
-- Name: fixed_assets unique_asset_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT unique_asset_code UNIQUE (tenant_id, asset_code);


--
-- Name: bills unique_bill_number_per_tenant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT unique_bill_number_per_tenant UNIQUE (tenant_id, bill_number);


--
-- Name: cost_centers unique_cost_center_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT unique_cost_center_code UNIQUE (tenant_id, code);


--
-- Name: currencies unique_currency_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT unique_currency_code UNIQUE (tenant_id, code);


--
-- Name: gl_account_defaults unique_defaults_per_tenant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_defaults
    ADD CONSTRAINT unique_defaults_per_tenant UNIQUE (tenant_id);


--
-- Name: depreciation_schedules unique_depreciation_period; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_schedules
    ADD CONSTRAINT unique_depreciation_period UNIQUE (fixed_asset_id, period_date);


--
-- Name: journal_entries unique_entry_number_per_tenant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT unique_entry_number_per_tenant UNIQUE (tenant_id, entry_number);


--
-- Name: exchange_rates unique_exchange_rate; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT unique_exchange_rate UNIQUE (tenant_id, from_currency_id, to_currency_id, effective_date);


--
-- Name: vendor_payments unique_payment_number_per_tenant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT unique_payment_number_per_tenant UNIQUE (tenant_id, payment_number);


--
-- Name: payment_terms unique_payment_term_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_terms
    ADD CONSTRAINT unique_payment_term_code UNIQUE (tenant_id, code);


--
-- Name: financial_periods unique_period_per_tenant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_periods
    ADD CONSTRAINT unique_period_per_tenant UNIQUE (tenant_id, period_year, period_month);


--
-- Name: tax_codes unique_tax_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_codes
    ADD CONSTRAINT unique_tax_code UNIQUE (tenant_id, code);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: variance_analysis variance_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variance_analysis
    ADD CONSTRAINT variance_analysis_pkey PRIMARY KEY (id);


--
-- Name: variance_analysis variance_analysis_tenant_id_analysis_period_period_type_cat_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variance_analysis
    ADD CONSTRAINT variance_analysis_tenant_id_analysis_period_period_type_cat_key UNIQUE (tenant_id, analysis_period, period_type, category, subcategory, channel);


--
-- Name: vendor_credit_notes vendor_cn_tenant_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_credit_notes
    ADD CONSTRAINT vendor_cn_tenant_number_unique UNIQUE (tenant_id, credit_note_number);


--
-- Name: vendor_credit_notes vendor_credit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_credit_notes
    ADD CONSTRAINT vendor_credit_notes_pkey PRIMARY KEY (id);


--
-- Name: vendor_payments vendor_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_tenant_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_tenant_id_code_key UNIQUE (tenant_id, code);


--
-- Name: what_if_scenarios what_if_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.what_if_scenarios
    ADD CONSTRAINT what_if_scenarios_pkey PRIMARY KEY (id);


--
-- Name: whatif_metrics_cache whatif_metrics_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatif_metrics_cache
    ADD CONSTRAINT whatif_metrics_cache_pkey PRIMARY KEY (id);


--
-- Name: whatif_metrics_cache whatif_metrics_cache_tenant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatif_metrics_cache
    ADD CONSTRAINT whatif_metrics_cache_tenant_unique UNIQUE (tenant_id);


--
-- Name: working_capital_metrics working_capital_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.working_capital_metrics
    ADD CONSTRAINT working_capital_metrics_pkey PRIMARY KEY (id);


--
-- Name: working_capital_metrics working_capital_metrics_tenant_id_metric_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.working_capital_metrics
    ADD CONSTRAINT working_capital_metrics_tenant_id_metric_date_key UNIQUE (tenant_id, metric_date);


--
-- Name: idx_ai_usage_logs_tenant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_logs_tenant_date ON public.ai_usage_logs USING btree (tenant_id, created_at DESC);


--
-- Name: idx_ai_usage_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_logs_user ON public.ai_usage_logs USING btree (user_id, created_at DESC);


--
-- Name: idx_alert_settings_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_settings_tenant ON public.alert_settings USING btree (tenant_id);


--
-- Name: idx_alerts_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerts_tenant ON public.alerts USING btree (tenant_id);


--
-- Name: idx_audit_logs_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_tenant ON public.audit_logs USING btree (tenant_id);


--
-- Name: idx_bank_accounts_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_accounts_tenant ON public.bank_accounts USING btree (tenant_id);


--
-- Name: idx_bank_transactions_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_transactions_tenant ON public.bank_transactions USING btree (tenant_id);


--
-- Name: idx_bank_txn_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_txn_account_id ON public.bank_transactions USING btree (bank_account_id);


--
-- Name: idx_bank_txn_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_txn_date ON public.bank_transactions USING btree (transaction_date);


--
-- Name: idx_bank_txn_match_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_txn_match_status ON public.bank_transactions USING btree (match_status);


--
-- Name: idx_bill_items_bill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_items_bill ON public.bill_items USING btree (bill_id);


--
-- Name: idx_bill_items_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_items_tenant ON public.bill_items USING btree (tenant_id);


--
-- Name: idx_bills_cost_center; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_cost_center ON public.bills USING btree (cost_center_id);


--
-- Name: idx_bills_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_date ON public.bills USING btree (bill_date);


--
-- Name: idx_bills_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_due_date ON public.bills USING btree (due_date);


--
-- Name: idx_bills_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_status ON public.bills USING btree (status);


--
-- Name: idx_bills_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_tenant ON public.bills USING btree (tenant_id);


--
-- Name: idx_bills_tenant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_tenant_status ON public.bills USING btree (tenant_id, status);


--
-- Name: idx_bills_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_vendor ON public.bills USING btree (vendor_id);


--
-- Name: idx_bills_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_vendor_id ON public.bills USING btree (vendor_id);


--
-- Name: idx_board_reports_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_board_reports_created_at ON public.board_reports USING btree (created_at DESC);


--
-- Name: idx_board_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_board_reports_status ON public.board_reports USING btree (status);


--
-- Name: idx_board_reports_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_board_reports_tenant_id ON public.board_reports USING btree (tenant_id);


--
-- Name: idx_budgets_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_category ON public.budgets USING btree (budget_type, category);


--
-- Name: idx_budgets_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_period ON public.budgets USING btree (period_year, period_month);


--
-- Name: idx_budgets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_status ON public.budgets USING btree (status);


--
-- Name: idx_budgets_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_tenant ON public.budgets USING btree (tenant_id);


--
-- Name: idx_budgets_unique_period; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_budgets_unique_period ON public.budgets USING btree (tenant_id, budget_type, category, period_year, COALESCE(period_month, 0), COALESCE(period_quarter, 0)) WHERE (subcategory IS NULL);


--
-- Name: idx_budgets_unique_period_sub; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_budgets_unique_period_sub ON public.budgets USING btree (tenant_id, budget_type, category, subcategory, period_year, COALESCE(period_month, 0), COALESCE(period_quarter, 0)) WHERE (subcategory IS NOT NULL);


--
-- Name: idx_cash_forecasts_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_forecasts_tenant ON public.cash_forecasts USING btree (tenant_id);


--
-- Name: idx_channel_fees_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_fees_date ON public.channel_fees USING btree (fee_date);


--
-- Name: idx_channel_fees_integration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_fees_integration ON public.channel_fees USING btree (integration_id);


--
-- Name: idx_channel_fees_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_fees_tenant ON public.channel_fees USING btree (tenant_id);


--
-- Name: idx_channel_fees_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_fees_type ON public.channel_fees USING btree (fee_type);


--
-- Name: idx_channel_settlements_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_settlements_period ON public.channel_settlements USING btree (period_start, period_end);


--
-- Name: idx_channel_settlements_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_settlements_status ON public.channel_settlements USING btree (status);


--
-- Name: idx_channel_settlements_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_settlements_tenant ON public.channel_settlements USING btree (tenant_id);


--
-- Name: idx_connector_integrations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connector_integrations_status ON public.connector_integrations USING btree (status);


--
-- Name: idx_connector_integrations_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connector_integrations_tenant ON public.connector_integrations USING btree (tenant_id);


--
-- Name: idx_connector_integrations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connector_integrations_type ON public.connector_integrations USING btree (connector_type);


--
-- Name: idx_cost_centers_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cost_centers_tenant ON public.cost_centers USING btree (tenant_id);


--
-- Name: idx_covenant_measurements_covenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_covenant_measurements_covenant ON public.covenant_measurements USING btree (covenant_id, measurement_date DESC);


--
-- Name: idx_credit_note_items_note; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_note_items_note ON public.credit_note_items USING btree (credit_note_id);


--
-- Name: idx_credit_notes_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_notes_customer ON public.credit_notes USING btree (customer_id);


--
-- Name: idx_credit_notes_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_notes_invoice ON public.credit_notes USING btree (invoice_id);


--
-- Name: idx_credit_notes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_notes_status ON public.credit_notes USING btree (status);


--
-- Name: idx_credit_notes_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_notes_tenant ON public.credit_notes USING btree (tenant_id);


--
-- Name: idx_currencies_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_currencies_tenant ON public.currencies USING btree (tenant_id);


--
-- Name: idx_customers_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_tenant ON public.customers USING btree (tenant_id);


--
-- Name: idx_debit_note_items_note; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_debit_note_items_note ON public.debit_note_items USING btree (debit_note_id);


--
-- Name: idx_debit_notes_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_debit_notes_customer ON public.debit_notes USING btree (customer_id);


--
-- Name: idx_debit_notes_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_debit_notes_invoice ON public.debit_notes USING btree (invoice_id);


--
-- Name: idx_debit_notes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_debit_notes_status ON public.debit_notes USING btree (status);


--
-- Name: idx_debit_notes_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_debit_notes_tenant ON public.debit_notes USING btree (tenant_id);


--
-- Name: idx_depreciation_schedules_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_depreciation_schedules_asset ON public.depreciation_schedules USING btree (fixed_asset_id);


--
-- Name: idx_depreciation_schedules_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_depreciation_schedules_date ON public.depreciation_schedules USING btree (period_date);


--
-- Name: idx_exchange_rates_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exchange_rates_date ON public.exchange_rates USING btree (effective_date);


--
-- Name: idx_exchange_rates_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exchange_rates_tenant ON public.exchange_rates USING btree (tenant_id);


--
-- Name: idx_expenses_cost_center; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_cost_center ON public.expenses USING btree (cost_center_id);


--
-- Name: idx_expenses_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_tenant ON public.expenses USING btree (tenant_id);


--
-- Name: idx_expenses_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_vendor ON public.expenses USING btree (vendor_id);


--
-- Name: idx_expenses_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_vendor_id ON public.expenses USING btree (vendor_id);


--
-- Name: idx_external_orders_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_orders_channel ON public.external_orders USING btree (channel);


--
-- Name: idx_external_orders_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_orders_date ON public.external_orders USING btree (order_date DESC);


--
-- Name: idx_external_orders_integration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_orders_integration ON public.external_orders USING btree (integration_id);


--
-- Name: idx_external_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_orders_status ON public.external_orders USING btree (status);


--
-- Name: idx_external_orders_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_orders_tenant ON public.external_orders USING btree (tenant_id);


--
-- Name: idx_external_products_integration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_products_integration ON public.external_products USING btree (integration_id);


--
-- Name: idx_external_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_products_sku ON public.external_products USING btree (external_sku);


--
-- Name: idx_external_products_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_products_tenant ON public.external_products USING btree (tenant_id);


--
-- Name: idx_financial_periods_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_periods_tenant ON public.financial_periods USING btree (tenant_id);


--
-- Name: idx_financial_periods_year_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_financial_periods_year_month ON public.financial_periods USING btree (period_year, period_month);


--
-- Name: idx_fixed_assets_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fixed_assets_category ON public.fixed_assets USING btree (category);


--
-- Name: idx_fixed_assets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fixed_assets_status ON public.fixed_assets USING btree (status);


--
-- Name: idx_fixed_assets_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fixed_assets_tenant ON public.fixed_assets USING btree (tenant_id);


--
-- Name: idx_gl_accounts_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gl_accounts_code ON public.gl_accounts USING btree (account_code);


--
-- Name: idx_gl_accounts_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gl_accounts_parent ON public.gl_accounts USING btree (parent_account_id);


--
-- Name: idx_gl_accounts_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gl_accounts_tenant ON public.gl_accounts USING btree (tenant_id);


--
-- Name: idx_gl_accounts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gl_accounts_type ON public.gl_accounts USING btree (account_type);


--
-- Name: idx_invoice_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_items_product_id ON public.invoice_items USING btree (product_id);


--
-- Name: idx_invoice_items_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_items_tenant ON public.invoice_items USING btree (tenant_id);


--
-- Name: idx_invoices_cost_center; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_cost_center ON public.invoices USING btree (cost_center_id);


--
-- Name: idx_invoices_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_customer_id ON public.invoices USING btree (customer_id);


--
-- Name: idx_invoices_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_due_date ON public.invoices USING btree (due_date);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_invoices_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_tenant ON public.invoices USING btree (tenant_id);


--
-- Name: idx_invoices_tenant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_tenant_status ON public.invoices USING btree (tenant_id, status);


--
-- Name: idx_jel_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jel_account_id ON public.journal_entry_lines USING btree (account_id);


--
-- Name: idx_jel_journal_entry_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jel_journal_entry_id ON public.journal_entry_lines USING btree (journal_entry_id);


--
-- Name: idx_journal_entries_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entries_date ON public.journal_entries USING btree (entry_date);


--
-- Name: idx_journal_entries_entry_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entries_entry_date ON public.journal_entries USING btree (entry_date);


--
-- Name: idx_journal_entries_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entries_period ON public.journal_entries USING btree (period_id);


--
-- Name: idx_journal_entries_period_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entries_period_id ON public.journal_entries USING btree (period_id);


--
-- Name: idx_journal_entries_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entries_source ON public.journal_entries USING btree (source_type, source_id);


--
-- Name: idx_journal_entries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entries_status ON public.journal_entries USING btree (status);


--
-- Name: idx_journal_entries_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entries_tenant ON public.journal_entries USING btree (tenant_id);


--
-- Name: idx_journal_entry_lines_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entry_lines_account ON public.journal_entry_lines USING btree (account_id);


--
-- Name: idx_journal_entry_lines_cost_center; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entry_lines_cost_center ON public.journal_entry_lines USING btree (cost_center_id);


--
-- Name: idx_journal_entry_lines_entry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entry_lines_entry ON public.journal_entry_lines USING btree (journal_entry_id);


--
-- Name: idx_journal_entry_lines_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journal_entry_lines_tenant ON public.journal_entry_lines USING btree (tenant_id);


--
-- Name: idx_orders_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_invoice ON public.orders USING btree (invoice_id);


--
-- Name: idx_orders_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_tenant ON public.orders USING btree (tenant_id);


--
-- Name: idx_payment_terms_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_terms_tenant ON public.payment_terms USING btree (tenant_id);


--
-- Name: idx_payments_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_invoice_id ON public.payments USING btree (invoice_id);


--
-- Name: idx_payments_payment_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_payment_date ON public.payments USING btree (payment_date);


--
-- Name: idx_payments_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_tenant ON public.payments USING btree (tenant_id);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- Name: idx_products_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_code ON public.products USING btree (code);


--
-- Name: idx_products_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_status ON public.products USING btree (status);


--
-- Name: idx_products_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_tenant_id ON public.products USING btree (tenant_id);


--
-- Name: idx_recurring_templates_next_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_templates_next_run ON public.recurring_templates USING btree (next_run_date) WHERE (is_active = true);


--
-- Name: idx_recurring_templates_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_templates_tenant ON public.recurring_templates USING btree (tenant_id);


--
-- Name: idx_revenues_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revenues_tenant ON public.revenues USING btree (tenant_id);


--
-- Name: idx_rolling_forecasts_tenant_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rolling_forecasts_tenant_month ON public.rolling_forecasts USING btree (tenant_id, forecast_month);


--
-- Name: idx_scenarios_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scenarios_tenant ON public.scenarios USING btree (tenant_id);


--
-- Name: idx_strategic_initiatives_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strategic_initiatives_status ON public.strategic_initiatives USING btree (tenant_id, status);


--
-- Name: idx_strategic_initiatives_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strategic_initiatives_tenant ON public.strategic_initiatives USING btree (tenant_id);


--
-- Name: idx_sync_logs_integration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_logs_integration ON public.sync_logs USING btree (integration_id);


--
-- Name: idx_sync_logs_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_logs_started ON public.sync_logs USING btree (started_at DESC);


--
-- Name: idx_sync_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_logs_status ON public.sync_logs USING btree (status);


--
-- Name: idx_tax_codes_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_codes_tenant ON public.tax_codes USING btree (tenant_id);


--
-- Name: idx_tax_filings_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_filings_tenant ON public.tax_filings USING btree (tenant_id);


--
-- Name: idx_tax_obligations_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_obligations_due_date ON public.tax_obligations USING btree (due_date);


--
-- Name: idx_tax_obligations_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_obligations_tenant ON public.tax_obligations USING btree (tenant_id);


--
-- Name: idx_tenant_users_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_users_tenant ON public.tenant_users USING btree (tenant_id);


--
-- Name: idx_tenant_users_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_users_user ON public.tenant_users USING btree (user_id);


--
-- Name: idx_variance_analysis_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_variance_analysis_period ON public.variance_analysis USING btree (tenant_id, analysis_period DESC);


--
-- Name: idx_variance_analysis_significant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_variance_analysis_significant ON public.variance_analysis USING btree (tenant_id, is_significant, requires_action) WHERE (is_significant = true);


--
-- Name: idx_vendor_cn_bill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_cn_bill ON public.vendor_credit_notes USING btree (bill_id);


--
-- Name: idx_vendor_cn_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_cn_tenant ON public.vendor_credit_notes USING btree (tenant_id);


--
-- Name: idx_vendor_cn_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_cn_vendor ON public.vendor_credit_notes USING btree (vendor_id);


--
-- Name: idx_vendor_payments_bill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_payments_bill ON public.vendor_payments USING btree (bill_id);


--
-- Name: idx_vendor_payments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_payments_date ON public.vendor_payments USING btree (payment_date);


--
-- Name: idx_vendor_payments_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_payments_tenant ON public.vendor_payments USING btree (tenant_id);


--
-- Name: idx_vendor_payments_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_payments_vendor ON public.vendor_payments USING btree (vendor_id);


--
-- Name: idx_vendors_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_code ON public.vendors USING btree (code);


--
-- Name: idx_vendors_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_status ON public.vendors USING btree (status);


--
-- Name: idx_vendors_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_tenant_id ON public.vendors USING btree (tenant_id);


--
-- Name: idx_working_capital_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_working_capital_date ON public.working_capital_metrics USING btree (tenant_id, metric_date DESC);


--
-- Name: scenarios ensure_single_primary_scenario_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ensure_single_primary_scenario_trigger BEFORE INSERT OR UPDATE ON public.scenarios FOR EACH ROW EXECUTE FUNCTION public.ensure_single_primary_scenario();


--
-- Name: channel_fees refresh_channel_analytics_on_fee; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_channel_analytics_on_fee AFTER INSERT OR DELETE OR UPDATE ON public.channel_fees FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_channel_analytics();


--
-- Name: external_orders refresh_channel_analytics_on_order; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_channel_analytics_on_order AFTER INSERT OR DELETE OR UPDATE ON public.external_orders FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_channel_analytics();


--
-- Name: bank_accounts refresh_dashboard_kpi_on_bank_account; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_dashboard_kpi_on_bank_account AFTER INSERT OR DELETE OR UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_dashboard_kpi();


--
-- Name: bank_transactions refresh_dashboard_kpi_on_bank_transaction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_dashboard_kpi_on_bank_transaction AFTER INSERT OR DELETE OR UPDATE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_dashboard_kpi();


--
-- Name: expenses refresh_dashboard_kpi_on_expense; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_dashboard_kpi_on_expense AFTER INSERT OR DELETE OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_dashboard_kpi();


--
-- Name: invoices refresh_dashboard_kpi_on_invoice; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_dashboard_kpi_on_invoice AFTER INSERT OR DELETE OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_dashboard_kpi();


--
-- Name: expenses refresh_pl_on_expense; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_pl_on_expense AFTER INSERT OR DELETE OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_pl_cache();


--
-- Name: invoices refresh_pl_on_invoice; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_pl_on_invoice AFTER INSERT OR DELETE OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_pl_cache();


--
-- Name: external_orders refresh_whatif_metrics_on_order_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_whatif_metrics_on_order_change AFTER INSERT OR DELETE OR UPDATE ON public.external_orders FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_whatif_metrics();


--
-- Name: credit_notes trg_apply_credit_note; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_apply_credit_note BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION public.apply_credit_note();


--
-- Name: debit_notes trg_apply_debit_note; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_apply_debit_note BEFORE UPDATE ON public.debit_notes FOR EACH ROW EXECUTE FUNCTION public.apply_debit_note();


--
-- Name: bills trg_create_je_for_bill; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_create_je_for_bill AFTER UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.create_journal_entry_for_bill();


--
-- Name: credit_notes trg_create_je_for_credit_note; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_create_je_for_credit_note BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION public.create_journal_entry_for_credit_note();


--
-- Name: debit_notes trg_create_je_for_debit_note; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_create_je_for_debit_note BEFORE UPDATE ON public.debit_notes FOR EACH ROW EXECUTE FUNCTION public.create_journal_entry_for_debit_note();


--
-- Name: invoices trg_create_je_for_invoice; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_create_je_for_invoice AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.create_journal_entry_for_invoice();


--
-- Name: payments trg_create_je_for_payment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_create_je_for_payment AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.create_journal_entry_for_payment();


--
-- Name: vendor_payments trg_create_je_for_vendor_payment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_create_je_for_vendor_payment AFTER INSERT ON public.vendor_payments FOR EACH ROW EXECUTE FUNCTION public.create_journal_entry_for_vendor_payment();


--
-- Name: invoices trg_invoice_discount_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_invoice_discount_change BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.recalculate_invoice_on_discount_change();


--
-- Name: bill_items trg_recalculate_bill_totals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recalculate_bill_totals AFTER INSERT OR DELETE OR UPDATE ON public.bill_items FOR EACH ROW EXECUTE FUNCTION public.recalculate_bill_totals();


--
-- Name: credit_note_items trg_recalculate_credit_note_totals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recalculate_credit_note_totals AFTER INSERT OR DELETE OR UPDATE ON public.credit_note_items FOR EACH ROW EXECUTE FUNCTION public.recalculate_credit_note_totals();


--
-- Name: debit_note_items trg_recalculate_debit_note_totals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recalculate_debit_note_totals AFTER INSERT OR DELETE OR UPDATE ON public.debit_note_items FOR EACH ROW EXECUTE FUNCTION public.recalculate_debit_note_totals();


--
-- Name: invoice_items trg_recalculate_invoice_totals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recalculate_invoice_totals AFTER INSERT OR DELETE OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.recalculate_invoice_totals();


--
-- Name: bills trg_sync_bill_due_date; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_bill_due_date BEFORE INSERT OR UPDATE OF payment_term_id, bill_date ON public.bills FOR EACH ROW EXECUTE FUNCTION public.sync_bill_due_date();


--
-- Name: invoices trg_sync_invoice_due_date; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_invoice_due_date BEFORE INSERT OR UPDATE OF payment_term_id, issue_date ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_due_date();


--
-- Name: vendor_payments trg_update_bill_paid_amount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_bill_paid_amount AFTER INSERT OR DELETE OR UPDATE ON public.vendor_payments FOR EACH ROW EXECUTE FUNCTION public.update_bill_paid_amount();


--
-- Name: expenses trg_update_budget_on_expense; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_budget_on_expense AFTER INSERT OR DELETE OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_budget_on_expense_change();


--
-- Name: payments trg_update_invoice_paid_amount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_invoice_paid_amount AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_invoice_paid_amount();


--
-- Name: journal_entry_lines trg_update_journal_entry_totals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_journal_entry_totals AFTER INSERT OR DELETE OR UPDATE ON public.journal_entry_lines FOR EACH ROW EXECUTE FUNCTION public.update_journal_entry_totals();


--
-- Name: bill_items trg_validate_bill_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_bill_item BEFORE INSERT OR UPDATE ON public.bill_items FOR EACH ROW EXECUTE FUNCTION public.validate_bill_item();


--
-- Name: credit_note_items trg_validate_credit_note_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_credit_note_item BEFORE INSERT OR UPDATE ON public.credit_note_items FOR EACH ROW EXECUTE FUNCTION public.validate_note_item();


--
-- Name: debit_note_items trg_validate_debit_note_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_debit_note_item BEFORE INSERT OR UPDATE ON public.debit_note_items FOR EACH ROW EXECUTE FUNCTION public.validate_note_item();


--
-- Name: invoice_items trg_validate_invoice_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_invoice_item BEFORE INSERT OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_item();


--
-- Name: payments trg_validate_payment_amount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_payment_amount BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.validate_payment_amount();


--
-- Name: vendor_payments trg_validate_vendor_payment_amount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_vendor_payment_amount BEFORE INSERT OR UPDATE ON public.vendor_payments FOR EACH ROW EXECUTE FUNCTION public.validate_vendor_payment_amount();


--
-- Name: credit_notes trigger_apply_credit_note; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_apply_credit_note BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION public.apply_credit_note();


--
-- Name: debit_notes trigger_apply_debit_note; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_apply_debit_note BEFORE UPDATE ON public.debit_notes FOR EACH ROW EXECUTE FUNCTION public.apply_debit_note();


--
-- Name: bills trigger_create_je_for_bill; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_je_for_bill BEFORE UPDATE ON public.bills FOR EACH ROW WHEN (((new.status = 'approved'::text) AND (old.status IS DISTINCT FROM 'approved'::text))) EXECUTE FUNCTION public.create_journal_entry_for_bill();


--
-- Name: credit_notes trigger_create_je_for_credit_note; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_je_for_credit_note BEFORE UPDATE ON public.credit_notes FOR EACH ROW WHEN (((new.status = 'approved'::text) AND (old.status IS DISTINCT FROM 'approved'::text))) EXECUTE FUNCTION public.create_journal_entry_for_credit_note();


--
-- Name: debit_notes trigger_create_je_for_debit_note; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_je_for_debit_note BEFORE UPDATE ON public.debit_notes FOR EACH ROW WHEN (((new.status = 'approved'::text) AND (old.status IS DISTINCT FROM 'approved'::text))) EXECUTE FUNCTION public.create_journal_entry_for_debit_note();


--
-- Name: invoices trigger_create_je_for_invoice; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_je_for_invoice BEFORE UPDATE ON public.invoices FOR EACH ROW WHEN (((new.status = 'sent'::text) AND (old.status IS DISTINCT FROM 'sent'::text))) EXECUTE FUNCTION public.create_journal_entry_for_invoice();


--
-- Name: payments trigger_create_je_for_payment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_je_for_payment BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.create_journal_entry_for_payment();


--
-- Name: vendor_payments trigger_create_je_for_vendor_payment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_je_for_vendor_payment BEFORE INSERT ON public.vendor_payments FOR EACH ROW EXECUTE FUNCTION public.create_journal_entry_for_vendor_payment();


--
-- Name: bill_items trigger_recalculate_bill_totals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_recalculate_bill_totals AFTER INSERT OR DELETE OR UPDATE ON public.bill_items FOR EACH ROW EXECUTE FUNCTION public.recalculate_bill_totals();


--
-- Name: credit_note_items trigger_recalculate_credit_note_totals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_recalculate_credit_note_totals AFTER INSERT OR DELETE OR UPDATE ON public.credit_note_items FOR EACH ROW EXECUTE FUNCTION public.recalculate_credit_note_totals();


--
-- Name: debit_note_items trigger_recalculate_debit_note_totals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_recalculate_debit_note_totals AFTER INSERT OR DELETE OR UPDATE ON public.debit_note_items FOR EACH ROW EXECUTE FUNCTION public.recalculate_debit_note_totals();


--
-- Name: invoices trigger_recalculate_invoice_on_discount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_recalculate_invoice_on_discount BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.recalculate_invoice_on_discount_change();


--
-- Name: invoice_items trigger_recalculate_invoice_totals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_recalculate_invoice_totals AFTER INSERT OR DELETE OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.recalculate_invoice_totals();


--
-- Name: bills trigger_sync_bill_due_date; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_bill_due_date BEFORE INSERT OR UPDATE ON public.bills FOR EACH ROW WHEN ((new.payment_term_id IS NOT NULL)) EXECUTE FUNCTION public.sync_bill_due_date();


--
-- Name: bank_accounts trigger_sync_cash_forecast; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_cash_forecast AFTER UPDATE ON public.bank_accounts FOR EACH ROW WHEN ((old.current_balance IS DISTINCT FROM new.current_balance)) EXECUTE FUNCTION public.sync_cash_forecast_from_bank();


--
-- Name: invoices trigger_sync_invoice_due_date; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_invoice_due_date BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW WHEN ((new.payment_term_id IS NOT NULL)) EXECUTE FUNCTION public.sync_invoice_due_date();


--
-- Name: vendor_payments trigger_update_bill_paid_amount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_bill_paid_amount AFTER INSERT OR DELETE OR UPDATE ON public.vendor_payments FOR EACH ROW EXECUTE FUNCTION public.update_bill_paid_amount();


--
-- Name: expenses trigger_update_budget_on_expense; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_budget_on_expense AFTER INSERT OR DELETE OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_budget_on_expense_change();


--
-- Name: expenses trigger_update_cash_flows_expense; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_cash_flows_expense AFTER INSERT OR DELETE OR UPDATE ON public.expenses FOR EACH STATEMENT EXECUTE FUNCTION public.update_cash_forecast_flows();


--
-- Name: revenues trigger_update_cash_flows_revenue; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_cash_flows_revenue AFTER INSERT OR DELETE OR UPDATE ON public.revenues FOR EACH STATEMENT EXECUTE FUNCTION public.update_cash_forecast_flows();


--
-- Name: payments trigger_update_invoice_paid_amount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_invoice_paid_amount AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_invoice_paid_amount();


--
-- Name: journal_entry_lines trigger_update_journal_entry_totals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_journal_entry_totals AFTER INSERT OR DELETE OR UPDATE ON public.journal_entry_lines FOR EACH ROW EXECUTE FUNCTION public.update_journal_entry_totals();


--
-- Name: bills trigger_updated_at_bills; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_updated_at_bills BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: budgets trigger_updated_at_budgets; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_updated_at_budgets BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cost_centers trigger_updated_at_cost_centers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_updated_at_cost_centers BEFORE UPDATE ON public.cost_centers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: credit_notes trigger_updated_at_credit_notes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_updated_at_credit_notes BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers trigger_updated_at_customers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_updated_at_customers BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: debit_notes trigger_updated_at_debit_notes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_updated_at_debit_notes BEFORE UPDATE ON public.debit_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expenses trigger_updated_at_expenses; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_updated_at_expenses BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fixed_assets trigger_updated_at_fixed_assets; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_updated_at_fixed_assets BEFORE UPDATE ON public.fixed_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: gl_accounts trigger_updated_at_gl_accounts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_updated_at_gl_accounts BEFORE UPDATE ON public.gl_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices trigger_updated_at_invoices; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_updated_at_invoices BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: journal_entries trigger_updated_at_journal_entries; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_updated_at_journal_entries BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendors trigger_updated_at_vendors; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_updated_at_vendors BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bill_items trigger_validate_bill_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_bill_item BEFORE INSERT OR UPDATE ON public.bill_items FOR EACH ROW EXECUTE FUNCTION public.validate_bill_item();


--
-- Name: credit_note_items trigger_validate_credit_note_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_credit_note_item BEFORE INSERT OR UPDATE ON public.credit_note_items FOR EACH ROW EXECUTE FUNCTION public.validate_note_item();


--
-- Name: debit_note_items trigger_validate_debit_note_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_debit_note_item BEFORE INSERT OR UPDATE ON public.debit_note_items FOR EACH ROW EXECUTE FUNCTION public.validate_note_item();


--
-- Name: invoice_items trigger_validate_invoice_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_invoice_item BEFORE INSERT OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_item();


--
-- Name: payments trigger_validate_payment_amount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_payment_amount BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.validate_payment_amount();


--
-- Name: vendor_payments trigger_validate_vendor_payment_amount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_vendor_payment_amount BEFORE INSERT OR UPDATE ON public.vendor_payments FOR EACH ROW EXECUTE FUNCTION public.validate_vendor_payment_amount();


--
-- Name: alert_settings update_alert_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_alert_settings_updated_at BEFORE UPDATE ON public.alert_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: api_keys update_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bank_connection_configs update_bank_connection_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bank_connection_configs_updated_at BEFORE UPDATE ON public.bank_connection_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bank_covenants update_bank_covenants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bank_covenants_updated_at BEFORE UPDATE ON public.bank_covenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bills update_bills_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: board_reports update_board_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_board_reports_updated_at BEFORE UPDATE ON public.board_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: budgets update_budgets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: channel_settlements update_channel_settlements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_channel_settlements_updated_at BEFORE UPDATE ON public.channel_settlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: connector_integrations update_connector_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_connector_integrations_updated_at BEFORE UPDATE ON public.connector_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cost_centers update_cost_centers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON public.cost_centers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: etl_pipelines update_etl_pipelines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_etl_pipelines_updated_at BEFORE UPDATE ON public.etl_pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: etl_transform_rules update_etl_transform_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_etl_transform_rules_updated_at BEFORE UPDATE ON public.etl_transform_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expenses update_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: external_inventory update_external_inventory_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_external_inventory_updated_at BEFORE UPDATE ON public.external_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: external_orders update_external_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_external_orders_updated_at BEFORE UPDATE ON public.external_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: external_products update_external_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_external_products_updated_at BEFORE UPDATE ON public.external_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: financial_periods update_financial_periods_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_financial_periods_updated_at BEFORE UPDATE ON public.financial_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fixed_assets update_fixed_assets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_fixed_assets_updated_at BEFORE UPDATE ON public.fixed_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: gl_account_defaults update_gl_account_defaults_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_gl_account_defaults_updated_at BEFORE UPDATE ON public.gl_account_defaults FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: gl_accounts update_gl_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_gl_accounts_updated_at BEFORE UPDATE ON public.gl_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: import_jobs update_import_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_import_jobs_updated_at BEFORE UPDATE ON public.import_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: journal_entries update_journal_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: order_auto_approval_rules update_order_auto_approval_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_order_auto_approval_rules_updated_at BEFORE UPDATE ON public.order_auto_approval_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: recurring_templates update_recurring_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_recurring_templates_updated_at BEFORE UPDATE ON public.recurring_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: revenues update_revenues_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_revenues_updated_at BEFORE UPDATE ON public.revenues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rolling_forecasts update_rolling_forecasts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rolling_forecasts_updated_at BEFORE UPDATE ON public.rolling_forecasts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scenario_monthly_actuals update_scenario_monthly_actuals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scenario_monthly_actuals_updated_at BEFORE UPDATE ON public.scenario_monthly_actuals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scenario_monthly_plans update_scenario_monthly_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scenario_monthly_plans_updated_at BEFORE UPDATE ON public.scenario_monthly_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scenarios update_scenarios_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON public.scenarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: strategic_initiatives update_strategic_initiatives_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_strategic_initiatives_updated_at BEFORE UPDATE ON public.strategic_initiatives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenant_users update_tenant_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tenant_users_updated_at BEFORE UPDATE ON public.tenant_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenants update_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: variance_analysis update_variance_analysis_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_variance_analysis_updated_at BEFORE UPDATE ON public.variance_analysis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendors update_vendors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: what_if_scenarios update_what_if_scenarios_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_what_if_scenarios_updated_at BEFORE UPDATE ON public.what_if_scenarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: whatif_metrics_cache update_whatif_metrics_cache_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_whatif_metrics_cache_updated_at BEFORE UPDATE ON public.whatif_metrics_cache FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_usage_logs ai_usage_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: alert_settings alert_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_settings
    ADD CONSTRAINT alert_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: alerts alerts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: api_keys api_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: api_keys api_keys_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: bank_accounts bank_accounts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: bank_connection_configs bank_connection_configs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_connection_configs
    ADD CONSTRAINT bank_connection_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: bank_connection_configs bank_connection_configs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_connection_configs
    ADD CONSTRAINT bank_connection_configs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: bank_covenants bank_covenants_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_covenants
    ADD CONSTRAINT bank_covenants_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: bank_transactions bank_transactions_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON DELETE CASCADE;


--
-- Name: bank_transactions bank_transactions_matched_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_matched_invoice_id_fkey FOREIGN KEY (matched_invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: bank_transactions bank_transactions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: bill_items bill_items_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_items
    ADD CONSTRAINT bill_items_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE CASCADE;


--
-- Name: bill_items bill_items_gl_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_items
    ADD CONSTRAINT bill_items_gl_account_id_fkey FOREIGN KEY (gl_account_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: bill_items bill_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_items
    ADD CONSTRAINT bill_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: bill_items bill_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_items
    ADD CONSTRAINT bill_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: bills bills_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: bills bills_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON DELETE SET NULL;


--
-- Name: bills bills_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: bills bills_gl_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_gl_account_id_fkey FOREIGN KEY (gl_account_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: bills bills_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE SET NULL;


--
-- Name: bills bills_payment_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_payment_term_id_fkey FOREIGN KEY (payment_term_id) REFERENCES public.payment_terms(id) ON DELETE SET NULL;


--
-- Name: bills bills_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: bills bills_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: board_reports board_reports_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_reports
    ADD CONSTRAINT board_reports_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: budgets budgets_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: budgets budgets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: budgets budgets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: cash_forecasts cash_forecasts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_forecasts
    ADD CONSTRAINT cash_forecasts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: channel_analytics_cache channel_analytics_cache_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_analytics_cache
    ADD CONSTRAINT channel_analytics_cache_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: channel_fees channel_fees_external_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_fees
    ADD CONSTRAINT channel_fees_external_order_id_fkey FOREIGN KEY (external_order_id) REFERENCES public.external_orders(id) ON DELETE SET NULL;


--
-- Name: channel_fees channel_fees_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_fees
    ADD CONSTRAINT channel_fees_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.connector_integrations(id) ON DELETE CASCADE;


--
-- Name: channel_fees channel_fees_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_fees
    ADD CONSTRAINT channel_fees_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: channel_settlements channel_settlements_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_settlements
    ADD CONSTRAINT channel_settlements_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.connector_integrations(id) ON DELETE CASCADE;


--
-- Name: channel_settlements channel_settlements_reconciled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_settlements
    ADD CONSTRAINT channel_settlements_reconciled_by_fkey FOREIGN KEY (reconciled_by) REFERENCES auth.users(id);


--
-- Name: channel_settlements channel_settlements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_settlements
    ADD CONSTRAINT channel_settlements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: connector_integrations connector_integrations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_integrations
    ADD CONSTRAINT connector_integrations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: connector_integrations connector_integrations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_integrations
    ADD CONSTRAINT connector_integrations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: cost_centers cost_centers_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES auth.users(id);


--
-- Name: cost_centers cost_centers_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.cost_centers(id) ON DELETE SET NULL;


--
-- Name: cost_centers cost_centers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: covenant_measurements covenant_measurements_covenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.covenant_measurements
    ADD CONSTRAINT covenant_measurements_covenant_id_fkey FOREIGN KEY (covenant_id) REFERENCES public.bank_covenants(id) ON DELETE CASCADE;


--
-- Name: covenant_measurements covenant_measurements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.covenant_measurements
    ADD CONSTRAINT covenant_measurements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: credit_note_items credit_note_items_credit_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_note_items
    ADD CONSTRAINT credit_note_items_credit_note_id_fkey FOREIGN KEY (credit_note_id) REFERENCES public.credit_notes(id) ON DELETE CASCADE;


--
-- Name: credit_note_items credit_note_items_invoice_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_note_items
    ADD CONSTRAINT credit_note_items_invoice_item_id_fkey FOREIGN KEY (invoice_item_id) REFERENCES public.invoice_items(id) ON DELETE SET NULL;


--
-- Name: credit_note_items credit_note_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_note_items
    ADD CONSTRAINT credit_note_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: credit_note_items credit_note_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_note_items
    ADD CONSTRAINT credit_note_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: credit_notes credit_notes_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: credit_notes credit_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: credit_notes credit_notes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: credit_notes credit_notes_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: credit_notes credit_notes_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: credit_notes credit_notes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: currencies currencies_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: customers customers_gl_receivable_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_gl_receivable_account_id_fkey FOREIGN KEY (gl_receivable_account_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: customers customers_payment_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_payment_term_id_fkey FOREIGN KEY (payment_term_id) REFERENCES public.payment_terms(id) ON DELETE SET NULL;


--
-- Name: customers customers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: dashboard_kpi_cache dashboard_kpi_cache_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_kpi_cache
    ADD CONSTRAINT dashboard_kpi_cache_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: debit_note_items debit_note_items_debit_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_note_items
    ADD CONSTRAINT debit_note_items_debit_note_id_fkey FOREIGN KEY (debit_note_id) REFERENCES public.debit_notes(id) ON DELETE CASCADE;


--
-- Name: debit_note_items debit_note_items_invoice_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_note_items
    ADD CONSTRAINT debit_note_items_invoice_item_id_fkey FOREIGN KEY (invoice_item_id) REFERENCES public.invoice_items(id) ON DELETE SET NULL;


--
-- Name: debit_note_items debit_note_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_note_items
    ADD CONSTRAINT debit_note_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: debit_note_items debit_note_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_note_items
    ADD CONSTRAINT debit_note_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: debit_notes debit_notes_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_notes
    ADD CONSTRAINT debit_notes_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: debit_notes debit_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_notes
    ADD CONSTRAINT debit_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: debit_notes debit_notes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_notes
    ADD CONSTRAINT debit_notes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: debit_notes debit_notes_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_notes
    ADD CONSTRAINT debit_notes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: debit_notes debit_notes_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_notes
    ADD CONSTRAINT debit_notes_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: debit_notes debit_notes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_notes
    ADD CONSTRAINT debit_notes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: depreciation_schedules depreciation_schedules_fixed_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_schedules
    ADD CONSTRAINT depreciation_schedules_fixed_asset_id_fkey FOREIGN KEY (fixed_asset_id) REFERENCES public.fixed_assets(id) ON DELETE CASCADE;


--
-- Name: depreciation_schedules depreciation_schedules_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_schedules
    ADD CONSTRAINT depreciation_schedules_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE SET NULL;


--
-- Name: depreciation_schedules depreciation_schedules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_schedules
    ADD CONSTRAINT depreciation_schedules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: etl_pipelines etl_pipelines_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etl_pipelines
    ADD CONSTRAINT etl_pipelines_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: etl_pipelines etl_pipelines_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etl_pipelines
    ADD CONSTRAINT etl_pipelines_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: etl_transform_rules etl_transform_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etl_transform_rules
    ADD CONSTRAINT etl_transform_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: etl_transform_rules etl_transform_rules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etl_transform_rules
    ADD CONSTRAINT etl_transform_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: exchange_rates exchange_rates_from_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_from_currency_id_fkey FOREIGN KEY (from_currency_id) REFERENCES public.currencies(id) ON DELETE CASCADE;


--
-- Name: exchange_rates exchange_rates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: exchange_rates exchange_rates_to_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_to_currency_id_fkey FOREIGN KEY (to_currency_id) REFERENCES public.currencies(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: expenses expenses_tax_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_tax_code_id_fkey FOREIGN KEY (tax_code_id) REFERENCES public.tax_codes(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: expenses expenses_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: external_inventory external_inventory_external_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_inventory
    ADD CONSTRAINT external_inventory_external_product_id_fkey FOREIGN KEY (external_product_id) REFERENCES public.external_products(id) ON DELETE CASCADE;


--
-- Name: external_inventory external_inventory_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_inventory
    ADD CONSTRAINT external_inventory_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.connector_integrations(id) ON DELETE CASCADE;


--
-- Name: external_inventory external_inventory_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_inventory
    ADD CONSTRAINT external_inventory_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: external_orders external_orders_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_orders
    ADD CONSTRAINT external_orders_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.connector_integrations(id) ON DELETE CASCADE;


--
-- Name: external_orders external_orders_internal_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_orders
    ADD CONSTRAINT external_orders_internal_invoice_id_fkey FOREIGN KEY (internal_invoice_id) REFERENCES public.invoices(id);


--
-- Name: external_orders external_orders_internal_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_orders
    ADD CONSTRAINT external_orders_internal_order_id_fkey FOREIGN KEY (internal_order_id) REFERENCES public.orders(id);


--
-- Name: external_orders external_orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_orders
    ADD CONSTRAINT external_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: external_products external_products_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_products
    ADD CONSTRAINT external_products_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.connector_integrations(id) ON DELETE CASCADE;


--
-- Name: external_products external_products_internal_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_products
    ADD CONSTRAINT external_products_internal_product_id_fkey FOREIGN KEY (internal_product_id) REFERENCES public.products(id);


--
-- Name: external_products external_products_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_products
    ADD CONSTRAINT external_products_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: financial_periods financial_periods_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_periods
    ADD CONSTRAINT financial_periods_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES auth.users(id);


--
-- Name: financial_periods financial_periods_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_periods
    ADD CONSTRAINT financial_periods_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: fixed_assets fixed_assets_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT fixed_assets_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE SET NULL;


--
-- Name: fixed_assets fixed_assets_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT fixed_assets_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON DELETE SET NULL;


--
-- Name: fixed_assets fixed_assets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT fixed_assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: fixed_assets fixed_assets_gl_asset_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT fixed_assets_gl_asset_account_id_fkey FOREIGN KEY (gl_asset_account_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: fixed_assets fixed_assets_gl_depreciation_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT fixed_assets_gl_depreciation_account_id_fkey FOREIGN KEY (gl_depreciation_account_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: fixed_assets fixed_assets_gl_expense_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT fixed_assets_gl_expense_account_id_fkey FOREIGN KEY (gl_expense_account_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: fixed_assets fixed_assets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT fixed_assets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: fixed_assets fixed_assets_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT fixed_assets_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: gl_account_defaults gl_account_defaults_accounts_payable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_defaults
    ADD CONSTRAINT gl_account_defaults_accounts_payable_id_fkey FOREIGN KEY (accounts_payable_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: gl_account_defaults gl_account_defaults_accounts_receivable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_defaults
    ADD CONSTRAINT gl_account_defaults_accounts_receivable_id_fkey FOREIGN KEY (accounts_receivable_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: gl_account_defaults gl_account_defaults_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_defaults
    ADD CONSTRAINT gl_account_defaults_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: gl_account_defaults gl_account_defaults_cash_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_defaults
    ADD CONSTRAINT gl_account_defaults_cash_id_fkey FOREIGN KEY (cash_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: gl_account_defaults gl_account_defaults_purchase_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_defaults
    ADD CONSTRAINT gl_account_defaults_purchase_expense_id_fkey FOREIGN KEY (purchase_expense_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: gl_account_defaults gl_account_defaults_purchase_vat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_defaults
    ADD CONSTRAINT gl_account_defaults_purchase_vat_id_fkey FOREIGN KEY (purchase_vat_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: gl_account_defaults gl_account_defaults_sales_discount_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_defaults
    ADD CONSTRAINT gl_account_defaults_sales_discount_id_fkey FOREIGN KEY (sales_discount_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: gl_account_defaults gl_account_defaults_sales_revenue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_defaults
    ADD CONSTRAINT gl_account_defaults_sales_revenue_id_fkey FOREIGN KEY (sales_revenue_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: gl_account_defaults gl_account_defaults_sales_vat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_defaults
    ADD CONSTRAINT gl_account_defaults_sales_vat_id_fkey FOREIGN KEY (sales_vat_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: gl_account_defaults gl_account_defaults_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_account_defaults
    ADD CONSTRAINT gl_account_defaults_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: gl_accounts gl_accounts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_accounts
    ADD CONSTRAINT gl_accounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: gl_accounts gl_accounts_parent_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_accounts
    ADD CONSTRAINT gl_accounts_parent_account_id_fkey FOREIGN KEY (parent_account_id) REFERENCES public.gl_accounts(id) ON DELETE SET NULL;


--
-- Name: gl_accounts gl_accounts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_accounts
    ADD CONSTRAINT gl_accounts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: import_jobs import_jobs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: import_jobs import_jobs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_items invoice_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: invoice_items invoice_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: invoice_promotions invoice_promotions_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_promotions
    ADD CONSTRAINT invoice_promotions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_promotions invoice_promotions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_promotions
    ADD CONSTRAINT invoice_promotions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: invoices invoices_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: invoices invoices_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_payment_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_payment_term_id_fkey FOREIGN KEY (payment_term_id) REFERENCES public.payment_terms(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: journal_entries journal_entries_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: journal_entries journal_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: journal_entries journal_entries_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.financial_periods(id) ON DELETE SET NULL;


--
-- Name: journal_entries journal_entries_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES auth.users(id);


--
-- Name: journal_entries journal_entries_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: journal_entries journal_entries_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES auth.users(id);


--
-- Name: journal_entry_lines journal_entry_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.gl_accounts(id) ON DELETE RESTRICT;


--
-- Name: journal_entry_lines journal_entry_lines_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON DELETE SET NULL;


--
-- Name: journal_entry_lines journal_entry_lines_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE CASCADE;


--
-- Name: journal_entry_lines journal_entry_lines_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: monte_carlo_results monte_carlo_results_scenario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monte_carlo_results
    ADD CONSTRAINT monte_carlo_results_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES public.scenarios(id) ON DELETE CASCADE;


--
-- Name: monte_carlo_results monte_carlo_results_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monte_carlo_results
    ADD CONSTRAINT monte_carlo_results_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: order_auto_approval_rules order_auto_approval_rules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_auto_approval_rules
    ADD CONSTRAINT order_auto_approval_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: orders orders_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: orders orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: payment_terms payment_terms_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_terms
    ADD CONSTRAINT payment_terms_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: payments payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: payments payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: payments payments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: pl_report_cache pl_report_cache_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pl_report_cache
    ADD CONSTRAINT pl_report_cache_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: products products_gl_cogs_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_gl_cogs_account_id_fkey FOREIGN KEY (gl_cogs_account_id) REFERENCES public.gl_accounts(id);


--
-- Name: products products_gl_inventory_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_gl_inventory_account_id_fkey FOREIGN KEY (gl_inventory_account_id) REFERENCES public.gl_accounts(id);


--
-- Name: products products_gl_revenue_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_gl_revenue_account_id_fkey FOREIGN KEY (gl_revenue_account_id) REFERENCES public.gl_accounts(id);


--
-- Name: products products_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_active_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_active_tenant_id_fkey FOREIGN KEY (active_tenant_id) REFERENCES public.tenants(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: recurring_templates recurring_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_templates
    ADD CONSTRAINT recurring_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: recurring_templates recurring_templates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_templates
    ADD CONSTRAINT recurring_templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: revenue_entries revenue_entries_revenue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_entries
    ADD CONSTRAINT revenue_entries_revenue_id_fkey FOREIGN KEY (revenue_id) REFERENCES public.revenues(id) ON DELETE CASCADE;


--
-- Name: revenue_entries revenue_entries_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_entries
    ADD CONSTRAINT revenue_entries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: revenues revenues_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenues
    ADD CONSTRAINT revenues_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: revenues revenues_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenues
    ADD CONSTRAINT revenues_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: rolling_forecasts rolling_forecasts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rolling_forecasts
    ADD CONSTRAINT rolling_forecasts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: scenario_monthly_actuals scenario_monthly_actuals_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_monthly_actuals
    ADD CONSTRAINT scenario_monthly_actuals_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: scenario_monthly_actuals scenario_monthly_actuals_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_monthly_actuals
    ADD CONSTRAINT scenario_monthly_actuals_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: scenario_monthly_plans scenario_monthly_plans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_monthly_plans
    ADD CONSTRAINT scenario_monthly_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: scenario_monthly_plans scenario_monthly_plans_scenario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_monthly_plans
    ADD CONSTRAINT scenario_monthly_plans_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES public.scenarios(id) ON DELETE CASCADE;


--
-- Name: scenario_monthly_plans scenario_monthly_plans_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_monthly_plans
    ADD CONSTRAINT scenario_monthly_plans_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: scenarios scenarios_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenarios
    ADD CONSTRAINT scenarios_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: scenarios scenarios_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenarios
    ADD CONSTRAINT scenarios_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: strategic_initiatives strategic_initiatives_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_initiatives
    ADD CONSTRAINT strategic_initiatives_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: strategic_initiatives strategic_initiatives_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_initiatives
    ADD CONSTRAINT strategic_initiatives_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: sync_logs sync_logs_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.connector_integrations(id) ON DELETE CASCADE;


--
-- Name: sync_logs sync_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tax_codes tax_codes_gl_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_codes
    ADD CONSTRAINT tax_codes_gl_account_id_fkey FOREIGN KEY (gl_account_id) REFERENCES public.gl_accounts(id);


--
-- Name: tax_codes tax_codes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_codes
    ADD CONSTRAINT tax_codes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tax_filings tax_filings_tax_obligation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_filings
    ADD CONSTRAINT tax_filings_tax_obligation_id_fkey FOREIGN KEY (tax_obligation_id) REFERENCES public.tax_obligations(id) ON DELETE SET NULL;


--
-- Name: tax_filings tax_filings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_filings
    ADD CONSTRAINT tax_filings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tax_obligations tax_obligations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_obligations
    ADD CONSTRAINT tax_obligations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_users tenant_users_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_users
    ADD CONSTRAINT tenant_users_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);


--
-- Name: tenant_users tenant_users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_users
    ADD CONSTRAINT tenant_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_users tenant_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_users
    ADD CONSTRAINT tenant_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: variance_analysis variance_analysis_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variance_analysis
    ADD CONSTRAINT variance_analysis_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: vendor_credit_notes vendor_credit_notes_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_credit_notes
    ADD CONSTRAINT vendor_credit_notes_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE SET NULL;


--
-- Name: vendor_credit_notes vendor_credit_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_credit_notes
    ADD CONSTRAINT vendor_credit_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: vendor_credit_notes vendor_credit_notes_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_credit_notes
    ADD CONSTRAINT vendor_credit_notes_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: vendor_credit_notes vendor_credit_notes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_credit_notes
    ADD CONSTRAINT vendor_credit_notes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: vendor_credit_notes vendor_credit_notes_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_credit_notes
    ADD CONSTRAINT vendor_credit_notes_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: vendor_payments vendor_payments_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);


--
-- Name: vendor_payments vendor_payments_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE SET NULL;


--
-- Name: vendor_payments vendor_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: vendor_payments vendor_payments_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE SET NULL;


--
-- Name: vendor_payments vendor_payments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: vendor_payments vendor_payments_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: vendors vendors_gl_payable_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_gl_payable_account_id_fkey FOREIGN KEY (gl_payable_account_id) REFERENCES public.gl_accounts(id);


--
-- Name: vendors vendors_payment_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_payment_term_id_fkey FOREIGN KEY (payment_term_id) REFERENCES public.payment_terms(id);


--
-- Name: vendors vendors_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: what_if_scenarios what_if_scenarios_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.what_if_scenarios
    ADD CONSTRAINT what_if_scenarios_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: whatif_metrics_cache whatif_metrics_cache_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatif_metrics_cache
    ADD CONSTRAINT whatif_metrics_cache_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: working_capital_metrics working_capital_metrics_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.working_capital_metrics
    ADD CONSTRAINT working_capital_metrics_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tenants Authenticated users can create tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create tenants" ON public.tenants FOR INSERT WITH CHECK (public.is_authenticated());


--
-- Name: dashboard_kpi_cache Service role can manage KPI cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage KPI cache" ON public.dashboard_kpi_cache TO service_role USING (true) WITH CHECK (true);


--
-- Name: alerts System can insert alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert alerts" ON public.alerts FOR INSERT WITH CHECK (true);


--
-- Name: audit_logs System can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);


--
-- Name: sync_logs System can insert sync logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert sync logs" ON public.sync_logs FOR INSERT WITH CHECK (true);


--
-- Name: ai_usage_logs System can insert usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert usage logs" ON public.ai_usage_logs FOR INSERT WITH CHECK (true);


--
-- Name: pl_report_cache System can manage PL cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage PL cache" ON public.pl_report_cache USING (true) WITH CHECK (true);


--
-- Name: channel_analytics_cache System can manage channel cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage channel cache" ON public.channel_analytics_cache USING (true) WITH CHECK (true);


--
-- Name: whatif_metrics_cache System can manage metrics cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage metrics cache" ON public.whatif_metrics_cache USING (true) WITH CHECK (true);


--
-- Name: strategic_initiatives Tenant admins can delete initiatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can delete initiatives" ON public.strategic_initiatives FOR DELETE USING (public.is_tenant_admin(tenant_id));


--
-- Name: strategic_initiatives Tenant admins can insert initiatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can insert initiatives" ON public.strategic_initiatives FOR INSERT WITH CHECK (public.is_tenant_admin(tenant_id));


--
-- Name: gl_accounts Tenant admins can manage GL accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage GL accounts" ON public.gl_accounts USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: gl_account_defaults Tenant admins can manage GL defaults; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage GL defaults" ON public.gl_account_defaults USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: alert_settings Tenant admins can manage alert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage alert settings" ON public.alert_settings USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: api_keys Tenant admins can manage api keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage api keys" ON public.api_keys USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: bank_accounts Tenant admins can manage bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage bank accounts" ON public.bank_accounts USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: bank_connection_configs Tenant admins can manage bank connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage bank connections" ON public.bank_connection_configs USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: budgets Tenant admins can manage budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage budgets" ON public.budgets USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: cost_centers Tenant admins can manage cost centers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage cost centers" ON public.cost_centers USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: currencies Tenant admins can manage currencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage currencies" ON public.currencies USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: customers Tenant admins can manage customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage customers" ON public.customers USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: depreciation_schedules Tenant admins can manage depreciation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage depreciation" ON public.depreciation_schedules USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: etl_pipelines Tenant admins can manage etl pipelines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage etl pipelines" ON public.etl_pipelines USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: exchange_rates Tenant admins can manage exchange rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage exchange rates" ON public.exchange_rates USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: fixed_assets Tenant admins can manage fixed assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage fixed assets" ON public.fixed_assets USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: connector_integrations Tenant admins can manage integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage integrations" ON public.connector_integrations USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: tenant_users Tenant admins can manage members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage members" ON public.tenant_users USING (public.is_tenant_admin(tenant_id));


--
-- Name: payment_terms Tenant admins can manage payment terms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage payment terms" ON public.payment_terms USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: financial_periods Tenant admins can manage periods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage periods" ON public.financial_periods USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: order_auto_approval_rules Tenant admins can manage rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage rules" ON public.order_auto_approval_rules USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: tax_codes Tenant admins can manage tax codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage tax codes" ON public.tax_codes USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: etl_transform_rules Tenant admins can manage transform rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage transform rules" ON public.etl_transform_rules USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: strategic_initiatives Tenant admins can update initiatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can update initiatives" ON public.strategic_initiatives FOR UPDATE USING (public.is_tenant_admin(tenant_id));


--
-- Name: audit_logs Tenant admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can view audit logs" ON public.audit_logs FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.is_tenant_admin(tenant_id)));


--
-- Name: budgets Tenant members can create draft budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can create draft budgets" ON public.budgets FOR INSERT WITH CHECK (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id) AND (status = 'draft'::text)));


--
-- Name: what_if_scenarios Tenant members can create scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can create scenarios" ON public.what_if_scenarios FOR INSERT WITH CHECK (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: what_if_scenarios Tenant members can delete their scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can delete their scenarios" ON public.what_if_scenarios FOR DELETE USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: customers Tenant members can insert customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can insert customers" ON public.customers FOR INSERT WITH CHECK (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: alert_settings Tenant members can insert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can insert settings" ON public.alert_settings FOR INSERT WITH CHECK (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: scenario_monthly_actuals Tenant members can manage actuals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage actuals" ON public.scenario_monthly_actuals USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: bill_items Tenant members can manage bill items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage bill items" ON public.bill_items USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: bills Tenant members can manage bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage bills" ON public.bills USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: channel_fees Tenant members can manage channel fees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage channel fees" ON public.channel_fees USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: covenant_measurements Tenant members can manage covenant measurements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage covenant measurements" ON public.covenant_measurements USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: bank_covenants Tenant members can manage covenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage covenants" ON public.bank_covenants USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: credit_note_items Tenant members can manage credit note items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage credit note items" ON public.credit_note_items USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: credit_notes Tenant members can manage credit notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage credit notes" ON public.credit_notes USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: debit_note_items Tenant members can manage debit note items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage debit note items" ON public.debit_note_items USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: debit_notes Tenant members can manage debit notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage debit notes" ON public.debit_notes USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: expenses Tenant members can manage expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage expenses" ON public.expenses USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: external_inventory Tenant members can manage external inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage external inventory" ON public.external_inventory USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: external_orders Tenant members can manage external orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage external orders" ON public.external_orders USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: external_products Tenant members can manage external products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage external products" ON public.external_products USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: cash_forecasts Tenant members can manage forecasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage forecasts" ON public.cash_forecasts USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: import_jobs Tenant members can manage import jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage import jobs" ON public.import_jobs USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: invoice_items Tenant members can manage invoice items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage invoice items" ON public.invoice_items USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: invoices Tenant members can manage invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage invoices" ON public.invoices USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: journal_entries Tenant members can manage journal entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage journal entries" ON public.journal_entries USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: journal_entry_lines Tenant members can manage journal entry lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage journal entry lines" ON public.journal_entry_lines USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: orders Tenant members can manage orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage orders" ON public.orders USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: payments Tenant members can manage payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage payments" ON public.payments USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: scenario_monthly_plans Tenant members can manage plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage plans" ON public.scenario_monthly_plans USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: products Tenant members can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage products" ON public.products USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: invoice_promotions Tenant members can manage promotions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage promotions" ON public.invoice_promotions USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: recurring_templates Tenant members can manage recurring templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage recurring templates" ON public.recurring_templates USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: monte_carlo_results Tenant members can manage results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage results" ON public.monte_carlo_results USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: revenue_entries Tenant members can manage revenue entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage revenue entries" ON public.revenue_entries USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: revenues Tenant members can manage revenues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage revenues" ON public.revenues USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: rolling_forecasts Tenant members can manage rolling forecasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage rolling forecasts" ON public.rolling_forecasts USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: scenarios Tenant members can manage scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage scenarios" ON public.scenarios USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: channel_settlements Tenant members can manage settlements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage settlements" ON public.channel_settlements USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: tax_filings Tenant members can manage tax filings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage tax filings" ON public.tax_filings USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: tax_obligations Tenant members can manage tax obligations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage tax obligations" ON public.tax_obligations USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: bank_transactions Tenant members can manage transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage transactions" ON public.bank_transactions USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: variance_analysis Tenant members can manage variance analysis; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage variance analysis" ON public.variance_analysis USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: vendor_credit_notes Tenant members can manage vendor credit notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage vendor credit notes" ON public.vendor_credit_notes USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: vendor_payments Tenant members can manage vendor payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage vendor payments" ON public.vendor_payments USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: vendors Tenant members can manage vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage vendors" ON public.vendors USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: working_capital_metrics Tenant members can manage working capital metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can manage working capital metrics" ON public.working_capital_metrics USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: alert_settings Tenant members can update settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can update settings" ON public.alert_settings FOR UPDATE USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: what_if_scenarios Tenant members can update their scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can update their scenarios" ON public.what_if_scenarios FOR UPDATE USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: api_keys Tenant members can view api keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can view api keys" ON public.api_keys FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: bank_connection_configs Tenant members can view bank connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can view bank connections" ON public.bank_connection_configs FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: etl_pipelines Tenant members can view etl pipelines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can view etl pipelines" ON public.etl_pipelines FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: connector_integrations Tenant members can view integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can view integrations" ON public.connector_integrations FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: sync_logs Tenant members can view sync logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can view sync logs" ON public.sync_logs FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: etl_transform_rules Tenant members can view transform rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can view transform rules" ON public.etl_transform_rules FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: tenants Tenant owners/admins can update tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant owners/admins can update tenant" ON public.tenants FOR UPDATE USING (public.is_tenant_admin(id));


--
-- Name: board_reports Users can create board reports for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create board reports for their tenant" ON public.board_reports FOR INSERT WITH CHECK ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid()))));


--
-- Name: board_reports Users can delete board reports for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete board reports for their tenant" ON public.board_reports FOR DELETE USING ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid()))));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: alerts Users can update alerts in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update alerts in their tenant" ON public.alerts FOR UPDATE USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: board_reports Users can update board reports for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update board reports for their tenant" ON public.board_reports FOR UPDATE USING ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid()))));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: gl_accounts Users can view GL accounts in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view GL accounts in their tenant" ON public.gl_accounts FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: gl_account_defaults Users can view GL defaults in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view GL defaults in their tenant" ON public.gl_account_defaults FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: pl_report_cache Users can view PL cache in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view PL cache in their tenant" ON public.pl_report_cache FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: scenario_monthly_actuals Users can view actuals in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view actuals in their tenant" ON public.scenario_monthly_actuals FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: alert_settings Users can view alert settings in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view alert settings in their tenant" ON public.alert_settings FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: alerts Users can view alerts in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view alerts in their tenant" ON public.alerts FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: bank_accounts Users can view bank accounts in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view bank accounts in their tenant" ON public.bank_accounts FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: bill_items Users can view bill items in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view bill items in their tenant" ON public.bill_items FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: bills Users can view bills in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view bills in their tenant" ON public.bills FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: board_reports Users can view board reports for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view board reports for their tenant" ON public.board_reports FOR SELECT USING ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid()))));


--
-- Name: budgets Users can view budgets in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view budgets in their tenant" ON public.budgets FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: cost_centers Users can view cost centers in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view cost centers in their tenant" ON public.cost_centers FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: credit_note_items Users can view credit note items in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view credit note items in their tenant" ON public.credit_note_items FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: credit_notes Users can view credit notes in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view credit notes in their tenant" ON public.credit_notes FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: currencies Users can view currencies in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view currencies in their tenant" ON public.currencies FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: customers Users can view customers in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view customers in their tenant" ON public.customers FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: debit_note_items Users can view debit note items in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view debit note items in their tenant" ON public.debit_note_items FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: debit_notes Users can view debit notes in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view debit notes in their tenant" ON public.debit_notes FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: depreciation_schedules Users can view depreciation in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view depreciation in their tenant" ON public.depreciation_schedules FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: exchange_rates Users can view exchange rates in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view exchange rates in their tenant" ON public.exchange_rates FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: expenses Users can view expenses in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view expenses in their tenant" ON public.expenses FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: fixed_assets Users can view fixed assets in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view fixed assets in their tenant" ON public.fixed_assets FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: cash_forecasts Users can view forecasts in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view forecasts in their tenant" ON public.cash_forecasts FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: strategic_initiatives Users can view initiatives in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view initiatives in their tenant" ON public.strategic_initiatives FOR SELECT USING (public.has_tenant_access(tenant_id));


--
-- Name: invoice_items Users can view invoice items in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view invoice items in their tenant" ON public.invoice_items FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: invoices Users can view invoices in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view invoices in their tenant" ON public.invoices FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: journal_entries Users can view journal entries in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view journal entries in their tenant" ON public.journal_entries FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: journal_entry_lines Users can view journal entry lines in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view journal entry lines in their tenant" ON public.journal_entry_lines FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: tenant_users Users can view members of their tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view members of their tenants" ON public.tenant_users FOR SELECT USING (public.has_tenant_access(tenant_id));


--
-- Name: whatif_metrics_cache Users can view metrics in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view metrics in their tenant" ON public.whatif_metrics_cache FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: orders Users can view orders in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view orders in their tenant" ON public.orders FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: tenant_users Users can view own membership; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own membership" ON public.tenant_users FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: payment_terms Users can view payment terms in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view payment terms in their tenant" ON public.payment_terms FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: payments Users can view payments in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view payments in their tenant" ON public.payments FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: financial_periods Users can view periods in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view periods in their tenant" ON public.financial_periods FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: scenario_monthly_plans Users can view plans in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view plans in their tenant" ON public.scenario_monthly_plans FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: products Users can view products in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view products in their tenant" ON public.products FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: invoice_promotions Users can view promotions in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view promotions in their tenant" ON public.invoice_promotions FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: recurring_templates Users can view recurring templates in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view recurring templates in their tenant" ON public.recurring_templates FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: monte_carlo_results Users can view results in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view results in their tenant" ON public.monte_carlo_results FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: revenue_entries Users can view revenue entries in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view revenue entries in their tenant" ON public.revenue_entries FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: revenues Users can view revenues in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view revenues in their tenant" ON public.revenues FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: order_auto_approval_rules Users can view rules in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view rules in their tenant" ON public.order_auto_approval_rules FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: scenarios Users can view scenarios in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view scenarios in their tenant" ON public.scenarios FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: what_if_scenarios Users can view scenarios in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view scenarios in their tenant" ON public.what_if_scenarios FOR SELECT USING ((((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)) OR public.is_super_admin()));


--
-- Name: tax_codes Users can view tax codes in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tax codes in their tenant" ON public.tax_codes FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: tax_filings Users can view tax filings in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tax filings in their tenant" ON public.tax_filings FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: tax_obligations Users can view tax obligations in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tax obligations in their tenant" ON public.tax_obligations FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: tenants Users can view tenants they belong to; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tenants they belong to" ON public.tenants FOR SELECT USING (public.has_tenant_access(id));


--
-- Name: dashboard_kpi_cache Users can view their tenant KPI cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their tenant KPI cache" ON public.dashboard_kpi_cache FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: pl_report_cache Users can view their tenant PL cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their tenant PL cache" ON public.pl_report_cache FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: channel_analytics_cache Users can view their tenant channel cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their tenant channel cache" ON public.channel_analytics_cache FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: bank_transactions Users can view transactions in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view transactions in their tenant" ON public.bank_transactions FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: ai_usage_logs Users can view usage logs in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view usage logs in their tenant" ON public.ai_usage_logs FOR SELECT USING ((((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)) OR public.is_super_admin()));


--
-- Name: vendor_credit_notes Users can view vendor credit notes in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view vendor credit notes in their tenant" ON public.vendor_credit_notes FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: vendor_payments Users can view vendor payments in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view vendor payments in their tenant" ON public.vendor_payments FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: vendors Users can view vendors in their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view vendors in their tenant" ON public.vendors FOR SELECT USING (((tenant_id = public.get_active_tenant_id()) AND public.has_tenant_access(tenant_id)));


--
-- Name: ai_usage_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: alert_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_connection_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_connection_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_covenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_covenants ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: bill_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

--
-- Name: bills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

--
-- Name: board_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.board_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: cash_forecasts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cash_forecasts ENABLE ROW LEVEL SECURITY;

--
-- Name: channel_analytics_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.channel_analytics_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: channel_fees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.channel_fees ENABLE ROW LEVEL SECURITY;

--
-- Name: channel_settlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.channel_settlements ENABLE ROW LEVEL SECURITY;

--
-- Name: connector_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.connector_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: cost_centers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

--
-- Name: covenant_measurements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.covenant_measurements ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_note_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_note_items ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: currencies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: dashboard_kpi_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dashboard_kpi_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: debit_note_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.debit_note_items ENABLE ROW LEVEL SECURITY;

--
-- Name: debit_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.debit_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: depreciation_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.depreciation_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: etl_pipelines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.etl_pipelines ENABLE ROW LEVEL SECURITY;

--
-- Name: etl_transform_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.etl_transform_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: external_inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.external_inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: external_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.external_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: external_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.external_products ENABLE ROW LEVEL SECURITY;

--
-- Name: financial_periods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;

--
-- Name: fixed_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: gl_account_defaults; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gl_account_defaults ENABLE ROW LEVEL SECURITY;

--
-- Name: gl_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gl_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: import_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_promotions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_promotions ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: journal_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: journal_entry_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: monte_carlo_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monte_carlo_results ENABLE ROW LEVEL SECURITY;

--
-- Name: order_auto_approval_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_auto_approval_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_terms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_terms ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: pl_report_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pl_report_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: revenue_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.revenue_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: revenues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;

--
-- Name: rolling_forecasts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rolling_forecasts ENABLE ROW LEVEL SECURITY;

--
-- Name: scenario_monthly_actuals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scenario_monthly_actuals ENABLE ROW LEVEL SECURITY;

--
-- Name: scenario_monthly_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scenario_monthly_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: scenarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

--
-- Name: strategic_initiatives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strategic_initiatives ENABLE ROW LEVEL SECURITY;

--
-- Name: sync_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: tax_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tax_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: tax_filings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tax_filings ENABLE ROW LEVEL SECURITY;

--
-- Name: tax_obligations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tax_obligations ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: variance_analysis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.variance_analysis ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_credit_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_credit_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: vendor_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: what_if_scenarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.what_if_scenarios ENABLE ROW LEVEL SECURITY;

--
-- Name: whatif_metrics_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatif_metrics_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: working_capital_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.working_capital_metrics ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;