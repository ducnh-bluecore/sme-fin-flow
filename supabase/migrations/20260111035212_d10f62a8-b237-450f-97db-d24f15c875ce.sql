
-- =====================================================
-- MIGRATION: HỢP NHẤT VÀ DỌN DẸP DỮ LIỆU
-- =====================================================

-- 1. TẠO BẢNG ADJUSTMENT_NOTES (gộp credit_notes, debit_notes, vendor_credit_notes)
-- =====================================================
CREATE TABLE public.adjustment_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Loại chứng từ
  note_type TEXT NOT NULL CHECK (note_type IN ('credit_note', 'debit_note', 'vendor_credit_note', 'vendor_debit_note')),
  direction TEXT NOT NULL CHECK (direction IN ('customer', 'vendor')), -- Hướng: khách hàng hay nhà cung cấp
  
  -- Thông tin chứng từ
  note_number TEXT NOT NULL,
  reference_number TEXT,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  
  -- Đối tác
  party_id UUID, -- Có thể là customer_id hoặc vendor_id
  party_name TEXT,
  party_email TEXT,
  party_address TEXT,
  party_tax_code TEXT,
  
  -- Liên kết chứng từ gốc
  original_invoice_id UUID REFERENCES public.invoices(id),
  original_bill_id UUID REFERENCES public.bills(id),
  original_order_id UUID,
  
  -- Số tiền
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  applied_amount NUMERIC(15,2) DEFAULT 0,
  remaining_amount NUMERIC(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'VND',
  exchange_rate NUMERIC(15,6) DEFAULT 1,
  
  -- Lý do và ghi chú
  reason TEXT,
  description TEXT,
  notes TEXT,
  terms TEXT,
  
  -- Trạng thái
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'applied', 'cancelled', 'voided')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  
  -- Kế toán
  gl_account_id UUID REFERENCES public.gl_accounts(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index cho adjustment_notes
CREATE INDEX idx_adjustment_notes_tenant ON public.adjustment_notes(tenant_id);
CREATE INDEX idx_adjustment_notes_type ON public.adjustment_notes(note_type);
CREATE INDEX idx_adjustment_notes_direction ON public.adjustment_notes(direction);
CREATE INDEX idx_adjustment_notes_party ON public.adjustment_notes(party_id);
CREATE INDEX idx_adjustment_notes_status ON public.adjustment_notes(status);
CREATE INDEX idx_adjustment_notes_date ON public.adjustment_notes(note_date);
CREATE UNIQUE INDEX idx_adjustment_notes_number ON public.adjustment_notes(tenant_id, note_number);

-- RLS cho adjustment_notes
ALTER TABLE public.adjustment_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view adjustment notes of their tenant"
  ON public.adjustment_notes FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can create adjustment notes for their tenant"
  ON public.adjustment_notes FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can update adjustment notes of their tenant"
  ON public.adjustment_notes FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can delete adjustment notes of their tenant"
  ON public.adjustment_notes FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

-- 2. TẠO BẢNG ADJUSTMENT_NOTE_ITEMS
-- =====================================================
CREATE TABLE public.adjustment_note_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  adjustment_note_id UUID NOT NULL REFERENCES public.adjustment_notes(id) ON DELETE CASCADE,
  
  -- Sản phẩm
  product_id UUID,
  external_product_id UUID REFERENCES public.external_products(id),
  sku TEXT,
  description TEXT NOT NULL,
  
  -- Số lượng và giá
  quantity NUMERIC(15,3) DEFAULT 1,
  unit TEXT,
  unit_price NUMERIC(15,2) DEFAULT 0,
  amount NUMERIC(15,2) DEFAULT 0,
  
  -- Thuế
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  
  -- Kế toán
  gl_account_id UUID REFERENCES public.gl_accounts(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_adjustment_note_items_note ON public.adjustment_note_items(adjustment_note_id);
CREATE INDEX idx_adjustment_note_items_tenant ON public.adjustment_note_items(tenant_id);

-- RLS
ALTER TABLE public.adjustment_note_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage adjustment note items of their tenant"
  ON public.adjustment_note_items FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

-- 3. CẬP NHẬT PRODUCT_MASTER - Thêm liên kết với external_products
-- =====================================================
-- Đảm bảo product_master có đủ cột để làm master data
ALTER TABLE public.product_master 
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_stock INTEGER,
  ADD COLUMN IF NOT EXISTS reorder_point INTEGER,
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS supplier_id UUID,
  ADD COLUMN IF NOT EXISTS gl_revenue_account_id UUID,
  ADD COLUMN IF NOT EXISTS gl_cogs_account_id UUID,
  ADD COLUMN IF NOT EXISTS gl_inventory_account_id UUID;

-- Tạo trigger để tự động cập nhật product_master từ external_products
CREATE OR REPLACE FUNCTION sync_product_master_from_external()
RETURNS TRIGGER AS $$
BEGIN
  -- Nếu external_product chưa có internal_product_id, tạo mới trong product_master
  IF NEW.internal_product_id IS NULL THEN
    INSERT INTO public.product_master (
      tenant_id, sku, barcode, product_name, category, brand,
      cost_price, selling_price, current_stock, is_active
    ) VALUES (
      NEW.tenant_id, 
      COALESCE(NEW.external_sku, NEW.external_product_id),
      NEW.barcode,
      NEW.name,
      NEW.category,
      NEW.brand,
      NEW.cost_price,
      NEW.selling_price,
      NEW.stock_quantity,
      NEW.status = 'active'
    )
    ON CONFLICT (tenant_id, sku) 
    DO UPDATE SET
      product_name = EXCLUDED.product_name,
      cost_price = EXCLUDED.cost_price,
      selling_price = EXCLUDED.selling_price,
      current_stock = product_master.current_stock + EXCLUDED.current_stock,
      updated_at = now()
    RETURNING id INTO NEW.internal_product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger khi insert/update external_products
DROP TRIGGER IF EXISTS trg_sync_product_master ON public.external_products;
CREATE TRIGGER trg_sync_product_master
  BEFORE INSERT ON public.external_products
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_master_from_external();

-- 4. XÓA CÁC BẢNG TRỐNG KHÔNG SỬ DỤNG
-- =====================================================
-- Xóa bảng items trước (foreign key)
DROP TABLE IF EXISTS public.credit_note_items CASCADE;
DROP TABLE IF EXISTS public.debit_note_items CASCADE;
DROP TABLE IF EXISTS public.vendor_credit_note_items CASCADE;

-- Xóa bảng chính
DROP TABLE IF EXISTS public.credit_notes CASCADE;
DROP TABLE IF EXISTS public.debit_notes CASCADE;
DROP TABLE IF EXISTS public.vendor_credit_notes CASCADE;

-- Xóa bảng products (không dùng, dùng product_master thay thế)
DROP TABLE IF EXISTS public.products CASCADE;

-- 5. TẠO VIEW ĐỂ TƯƠNG THÍCH NGƯỢC
-- =====================================================
CREATE OR REPLACE VIEW public.credit_notes_view AS
SELECT * FROM public.adjustment_notes WHERE note_type = 'credit_note';

CREATE OR REPLACE VIEW public.debit_notes_view AS
SELECT * FROM public.adjustment_notes WHERE note_type = 'debit_note';

CREATE OR REPLACE VIEW public.vendor_credit_notes_view AS
SELECT * FROM public.adjustment_notes WHERE note_type = 'vendor_credit_note';

-- 6. TRIGGER CẬP NHẬT UPDATED_AT
-- =====================================================
CREATE TRIGGER update_adjustment_notes_updated_at
  BEFORE UPDATE ON public.adjustment_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
