-- =============================================
-- 1. INVENTORY AGING TABLE
-- =============================================
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  product_name TEXT NOT NULL,
  category VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_value NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  received_date DATE NOT NULL,
  warehouse_location VARCHAR(100),
  supplier_id UUID REFERENCES public.vendors(id),
  last_sold_date DATE,
  reorder_point INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventory in their tenant"
  ON public.inventory_items FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert inventory in their tenant"
  ON public.inventory_items FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update inventory in their tenant"
  ON public.inventory_items FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete inventory in their tenant"
  ON public.inventory_items FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE INDEX idx_inventory_items_tenant ON public.inventory_items(tenant_id);
CREATE INDEX idx_inventory_items_sku ON public.inventory_items(sku);
CREATE INDEX idx_inventory_items_received_date ON public.inventory_items(received_date);

-- =============================================
-- 2. PROMOTIONS TABLE
-- =============================================
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  promotion_name TEXT NOT NULL,
  promotion_code VARCHAR(50),
  promotion_type VARCHAR(50) NOT NULL,
  channel VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget NUMERIC(15,2) DEFAULT 0,
  actual_spend NUMERIC(15,2) DEFAULT 0,
  target_revenue NUMERIC(15,2) DEFAULT 0,
  actual_revenue NUMERIC(15,2) DEFAULT 0,
  target_orders INTEGER DEFAULT 0,
  actual_orders INTEGER DEFAULT 0,
  discount_value NUMERIC(10,2),
  min_order_value NUMERIC(15,2),
  max_discount NUMERIC(15,2),
  status VARCHAR(50) DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view promotions in their tenant"
  ON public.promotions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert promotions in their tenant"
  ON public.promotions FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update promotions in their tenant"
  ON public.promotions FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete promotions in their tenant"
  ON public.promotions FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE INDEX idx_promotions_tenant ON public.promotions(tenant_id);
CREATE INDEX idx_promotions_dates ON public.promotions(start_date, end_date);

-- =============================================
-- 3. PROMOTION PERFORMANCE
-- =============================================
CREATE TABLE public.promotion_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  performance_date DATE NOT NULL,
  orders_count INTEGER DEFAULT 0,
  gross_revenue NUMERIC(15,2) DEFAULT 0,
  discount_given NUMERIC(15,2) DEFAULT 0,
  net_revenue NUMERIC(15,2) DEFAULT 0,
  cogs NUMERIC(15,2) DEFAULT 0,
  gross_profit NUMERIC(15,2) DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  repeat_customers INTEGER DEFAULT 0,
  avg_order_value NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promotion_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view promotion_performance in their tenant"
  ON public.promotion_performance FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage promotion_performance in their tenant"
  ON public.promotion_performance FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE INDEX idx_promotion_perf_tenant ON public.promotion_performance(tenant_id);
CREATE INDEX idx_promotion_perf_promotion ON public.promotion_performance(promotion_id);

-- =============================================
-- 4. SUPPLIER PAYMENT SCHEDULES
-- =============================================
CREATE TABLE public.supplier_payment_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES public.bills(id),
  original_amount NUMERIC(15,2) NOT NULL,
  due_date DATE NOT NULL,
  early_payment_date DATE,
  early_payment_discount_percent NUMERIC(5,2) DEFAULT 0,
  early_payment_discount_amount NUMERIC(15,2) GENERATED ALWAYS AS (original_amount * early_payment_discount_percent / 100) STORED,
  net_amount_if_early NUMERIC(15,2),
  recommended_action VARCHAR(50),
  cash_available_on_early_date NUMERIC(15,2),
  opportunity_cost NUMERIC(15,2),
  net_benefit NUMERIC(15,2),
  payment_status VARCHAR(50) DEFAULT 'pending',
  paid_date DATE,
  paid_amount NUMERIC(15,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view supplier_payment_schedules in their tenant"
  ON public.supplier_payment_schedules FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage supplier_payment_schedules in their tenant"
  ON public.supplier_payment_schedules FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE INDEX idx_supplier_payment_tenant ON public.supplier_payment_schedules(tenant_id);
CREATE INDEX idx_supplier_payment_due_date ON public.supplier_payment_schedules(due_date);

-- =============================================
-- 5. CASH FLOW DIRECT METHOD
-- =============================================
CREATE TABLE public.cash_flow_direct (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
  
  cash_from_customers NUMERIC(15,2) DEFAULT 0,
  cash_from_interest_received NUMERIC(15,2) DEFAULT 0,
  cash_from_other_operating NUMERIC(15,2) DEFAULT 0,
  
  cash_to_suppliers NUMERIC(15,2) DEFAULT 0,
  cash_to_employees NUMERIC(15,2) DEFAULT 0,
  cash_for_rent NUMERIC(15,2) DEFAULT 0,
  cash_for_utilities NUMERIC(15,2) DEFAULT 0,
  cash_for_taxes NUMERIC(15,2) DEFAULT 0,
  cash_for_interest_paid NUMERIC(15,2) DEFAULT 0,
  cash_for_other_operating NUMERIC(15,2) DEFAULT 0,
  
  net_cash_operating NUMERIC(15,2) GENERATED ALWAYS AS (
    cash_from_customers + cash_from_interest_received + cash_from_other_operating
    - cash_to_suppliers - cash_to_employees - cash_for_rent - cash_for_utilities 
    - cash_for_taxes - cash_for_interest_paid - cash_for_other_operating
  ) STORED,
  
  cash_from_asset_sales NUMERIC(15,2) DEFAULT 0,
  cash_for_asset_purchases NUMERIC(15,2) DEFAULT 0,
  cash_for_investments NUMERIC(15,2) DEFAULT 0,
  net_cash_investing NUMERIC(15,2) GENERATED ALWAYS AS (
    cash_from_asset_sales - cash_for_asset_purchases - cash_for_investments
  ) STORED,
  
  cash_from_loans NUMERIC(15,2) DEFAULT 0,
  cash_from_equity NUMERIC(15,2) DEFAULT 0,
  cash_for_loan_repayments NUMERIC(15,2) DEFAULT 0,
  cash_for_dividends NUMERIC(15,2) DEFAULT 0,
  net_cash_financing NUMERIC(15,2) GENERATED ALWAYS AS (
    cash_from_loans + cash_from_equity - cash_for_loan_repayments - cash_for_dividends
  ) STORED,
  
  opening_cash_balance NUMERIC(15,2) DEFAULT 0,
  closing_cash_balance NUMERIC(15,2) DEFAULT 0,
  
  notes TEXT,
  is_actual BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_flow_direct ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cash_flow_direct in their tenant"
  ON public.cash_flow_direct FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage cash_flow_direct in their tenant"
  ON public.cash_flow_direct FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE INDEX idx_cash_flow_direct_tenant ON public.cash_flow_direct(tenant_id);
CREATE INDEX idx_cash_flow_direct_period ON public.cash_flow_direct(period_start, period_end);

-- =============================================
-- 6. UPDATE TRIGGERS
-- =============================================
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_payment_schedules_updated_at
  BEFORE UPDATE ON public.supplier_payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_flow_direct_updated_at
  BEFORE UPDATE ON public.cash_flow_direct
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();