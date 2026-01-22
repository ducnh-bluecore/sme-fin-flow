-- ============================================
-- CDP CORE TABLES (Facts Layer)
-- ============================================

-- 1. cdp_customers (canonical customer)
CREATE TABLE public.cdp_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  canonical_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  first_order_at timestamptz NULL,
  last_order_at timestamptz NULL,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX idx_cdp_customers_tenant ON public.cdp_customers(tenant_id, id);
CREATE INDEX idx_cdp_customers_first_order ON public.cdp_customers(tenant_id, first_order_at);
CREATE INDEX idx_cdp_customers_last_order ON public.cdp_customers(tenant_id, last_order_at);
CREATE UNIQUE INDEX idx_cdp_customers_canonical ON public.cdp_customers(tenant_id, canonical_key);

ALTER TABLE public.cdp_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cdp_customers in their tenant"
ON public.cdp_customers FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert cdp_customers in their tenant"
ON public.cdp_customers FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update cdp_customers in their tenant"
ON public.cdp_customers FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- 2. cdp_customer_identities
CREATE TABLE public.cdp_customer_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES cdp_customers(id) ON DELETE CASCADE,
  id_type text NOT NULL CHECK (id_type IN ('phone', 'email', 'external_customer_id', 'device_id', 'loyalty_id')),
  id_value text NOT NULL,
  source_system text NOT NULL,
  confidence numeric(5,2) NOT NULL DEFAULT 1.0,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_cdp_identities_unique ON public.cdp_customer_identities(tenant_id, id_type, id_value, source_system);
CREATE INDEX idx_cdp_identities_customer ON public.cdp_customer_identities(tenant_id, customer_id);

ALTER TABLE public.cdp_customer_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cdp_customer_identities in their tenant"
ON public.cdp_customer_identities FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- 3. cdp_orders
CREATE TABLE public.cdp_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_key text NOT NULL,
  customer_id uuid NULL REFERENCES cdp_customers(id) ON DELETE SET NULL,
  order_at timestamptz NOT NULL,
  channel text NULL,
  payment_method text NULL,
  currency text NOT NULL DEFAULT 'VND',
  gross_revenue numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  net_revenue numeric NOT NULL DEFAULT 0,
  cogs numeric NOT NULL DEFAULT 0,
  gross_margin numeric NOT NULL DEFAULT 0,
  is_discounted boolean NOT NULL DEFAULT false,
  is_bundle boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_cdp_orders_key ON public.cdp_orders(tenant_id, order_key);
CREATE INDEX idx_cdp_orders_date ON public.cdp_orders(tenant_id, order_at);
CREATE INDEX idx_cdp_orders_customer ON public.cdp_orders(tenant_id, customer_id, order_at);

ALTER TABLE public.cdp_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cdp_orders in their tenant"
ON public.cdp_orders FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- 4. cdp_order_items
CREATE TABLE public.cdp_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES cdp_orders(id) ON DELETE CASCADE,
  product_id text NULL,
  category text NULL,
  qty integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  line_revenue numeric NOT NULL DEFAULT 0,
  line_cogs numeric NOT NULL DEFAULT 0,
  line_margin numeric NOT NULL DEFAULT 0
);

CREATE INDEX idx_cdp_order_items_order ON public.cdp_order_items(tenant_id, order_id);
CREATE INDEX idx_cdp_order_items_category ON public.cdp_order_items(tenant_id, category);

ALTER TABLE public.cdp_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cdp_order_items in their tenant"
ON public.cdp_order_items FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- 5. cdp_refunds
CREATE TABLE public.cdp_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  refund_key text NOT NULL,
  order_id uuid NULL REFERENCES cdp_orders(id) ON DELETE SET NULL,
  customer_id uuid NULL REFERENCES cdp_customers(id) ON DELETE SET NULL,
  refund_at timestamptz NOT NULL,
  refund_amount numeric NOT NULL DEFAULT 0,
  reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_cdp_refunds_key ON public.cdp_refunds(tenant_id, refund_key);
CREATE INDEX idx_cdp_refunds_date ON public.cdp_refunds(tenant_id, refund_at);
CREATE INDEX idx_cdp_refunds_customer ON public.cdp_refunds(tenant_id, customer_id, refund_at);

ALTER TABLE public.cdp_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cdp_refunds in their tenant"
ON public.cdp_refunds FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));