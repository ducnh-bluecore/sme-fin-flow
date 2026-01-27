
# Kế hoạch: Fix & Nâng cấp trang Phân tích Tuổi tồn kho (v2)

## 1. Phân tích hiện trạng

### Dữ liệu bảng Products (E2E Tenant)
| Category | Số lượng SP | Ví dụ |
|----------|-------------|-------|
| Áo | 30 | Áo Thun Basic, Áo Polo Premium |
| Quần | 25 | Quần Jean, Quần Kaki |
| Váy | 20 | Váy Đầm, Váy Công sở |
| Phụ kiện | 15 | Túi xách, Thắt lưng |
| Giày dép | 10 | Giày sneaker, Sandal |
| **Tổng** | **100** | |

### Vấn đề
- `inventory_items` table: **0 records** cho E2E tenant
- **THIẾU LIÊN KẾT**: Không có `product_id` FK để connect inventory với products

---

## 2. Giải pháp đề xuất

### Bước 1: Thêm cột `product_id` vào `inventory_items`

Tạo FK liên kết inventory với bảng products (SSOT):

```text
inventory_items (updated)
├── id
├── tenant_id
├── product_id UUID REFERENCES products(id)  ← MỚI
├── sku (lấy từ products.sku)
├── product_name (lấy từ products.name)
├── category (lấy từ products.category)
├── quantity
├── unit_cost (lấy từ products.cost_price)
├── total_value (calculated)
├── received_date
├── warehouse_location
├── ...
```

### Bước 2: Seed Inventory từ bảng Products thực tế

Tạo inventory items cho **tất cả 100 sản phẩm** trong bảng `products`:

```text
Phân bổ tuổi tồn kho (realistic e-commerce):
├── 40 items: 0-30 ngày   (hàng mới nhập, bán chạy)
├── 25 items: 31-60 ngày  (hàng trung bình)
├── 15 items: 61-90 ngày  (hàng chậm)
├── 12 items: 91-180 ngày (hàng tồn lâu)
└── 8 items:  >180 ngày   (hàng chết - cần thanh lý)
```

### Bước 3: Fix Import Handler

Cập nhật `useDataImport.ts` để link với products:

```text
Import Flow:
1. User upload file với SKU
2. System lookup products.id từ SKU
3. Insert inventory_items với product_id FK
4. Auto-fill name, category, cost từ products table
```

### Bước 4: Thêm Value-Add Insights

Nâng cấp UI với các insights theo FDP Manifesto:

```text
Decision Cards:
├── Cảnh báo thanh lý: SKU >180 ngày + tổng value bị khóa
├── ABC Analysis: Phân loại A/B/C theo Pareto 80/20
├── DIO Metrics: Days Inventory Outstanding theo category
└── Control Tower Alert: Push notification khi slow-moving > 25%
```

---

## 3. Chi tiết kỹ thuật

### Migration SQL

```sql
-- 1. Thêm cột product_id vào inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);

-- 2. Seed inventory từ bảng products thực tế
INSERT INTO inventory_items (
  tenant_id, product_id, sku, product_name, category, 
  quantity, unit_cost, received_date, warehouse_location, status
)
SELECT 
  p.tenant_id,
  p.id as product_id,
  p.sku,
  p.name as product_name,
  p.category,
  (20 + (ROW_NUMBER() OVER (ORDER BY p.id) % 150))::int as quantity,
  p.cost_price as unit_cost,
  -- Phân bổ tuổi tồn kho theo thứ tự sản phẩm
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) <= 40 
      THEN CURRENT_DATE - (RANDOM() * 25)::int
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) <= 65 
      THEN CURRENT_DATE - 30 - (RANDOM() * 30)::int
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) <= 80 
      THEN CURRENT_DATE - 60 - (RANDOM() * 30)::int
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) <= 92 
      THEN CURRENT_DATE - 90 - (RANDOM() * 90)::int
    ELSE CURRENT_DATE - 180 - (RANDOM() * 120)::int
  END as received_date,
  'WH-' || (1 + (ROW_NUMBER() OVER (ORDER BY p.id) % 3)) as warehouse_location,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY p.id) <= 80 THEN 'active'
    ELSE 'slow_moving' 
  END as status
FROM products p
WHERE p.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
```

### Hook Update (useDataImport.ts)

```typescript
const importInventoryItems = useMutation({
  mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };
    
    for (const row of rows) {
      // Lookup product by SKU
      const { data: product } = await supabase
        .from('products')
        .select('id, name, category, cost_price')
        .eq('tenant_id', tenantId)
        .eq('sku', row.sku)
        .maybeSingle();
      
      const { error } = await supabase.from('inventory_items').insert({
        tenant_id: tenantId,
        product_id: product?.id || null,  // Link với products
        sku: row.sku,
        product_name: product?.name || row.product_name,
        category: product?.category || row.category,
        quantity: parseInt(row.quantity_on_hand || row.quantity || '0'),
        unit_cost: product?.cost_price || parseFloat(row.unit_cost || '0'),
        received_date: row.last_received_date || row.received_date,
        warehouse_location: row.warehouse_location,
        status: 'active',
      });
      
      if (error) result.failed++;
      else result.success++;
    }
    return result;
  }
});
```

---

## 4. Tệp tin cần thay đổi

| File | Thay đổi | Mục đích |
|------|----------|----------|
| **Database Migration** | Thêm `product_id` FK + Seed từ products | Link inventory với SSOT products |
| `src/hooks/useDataImport.ts` | Thêm `importInventoryItems` với product lookup | Enable file import |
| `src/components/import/FileImportDialog.tsx` | Thêm case `inventory_items` | Connect UI to handler |
| `src/pages/InventoryAgingPage.tsx` | Thêm Import button + Decision cards | UX improvement |

---

## 5. Kết quả mong đợi

### Sau khi implement:

| KPI | Trước | Sau |
|-----|-------|-----|
| Tổng SKU | 0 | 100 (từ products) |
| Tổng giá trị | 0₫ | ~8-10 tỷ VND |
| Tuổi TB | 0 ngày | ~55 ngày |
| Tồn chậm >90 ngày | 0% | ~20% (~1.5 tỷ) |

### Data Integrity:
- Mỗi inventory item được link với `product_id` FK
- SKU, name, category lấy từ products table (SSOT)
- Cost price đồng bộ với products.cost_price

---

## 6. Tuân thủ SSOT Architecture

```text
Layer 0: products (master data)
            ↓
Layer 1: inventory_items (product_id FK) ← Seed từ products
            ↓
Layer 3: Views (v_inventory_aging nếu cần)
            ↓
Layer 4: Hooks (useInventoryAging)
            ↓
Layer 5: Pages (InventoryAgingPage)
```

- Products là nguồn sự thật cho SKU, name, category, cost
- Inventory items chỉ lưu quantity, received_date, location
- Import tự động lookup product_id từ SKU
