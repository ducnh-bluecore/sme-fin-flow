
-- Disable trigger temporarily for bulk insert
SET session_replication_role = replica;

-- STEP 1: Seed external_order_items from existing orders
INSERT INTO external_order_items (
  tenant_id, external_order_id, sku, product_name, category, quantity, 
  unit_price, total_amount, total_cogs, gross_profit, created_at
)
SELECT 
  eo.tenant_id,
  eo.id,
  'SKU-' || LPAD((ROW_NUMBER() OVER (ORDER BY eo.id) % 50 + 1)::TEXT, 3, '0'),
  CASE (ROW_NUMBER() OVER (ORDER BY eo.id) % 50)
    WHEN 0 THEN 'Áo thun nam basic'
    WHEN 1 THEN 'Quần jeans nữ slim'
    WHEN 2 THEN 'Váy đầm công sở'
    WHEN 3 THEN 'Áo khoác gió unisex'
    WHEN 4 THEN 'Giày sneaker trắng'
    WHEN 5 THEN 'Túi xách da PU'
    WHEN 6 THEN 'Mũ lưỡi trai'
    WHEN 7 THEN 'Kính mát thời trang'
    WHEN 8 THEN 'Đồng hồ thông minh'
    WHEN 9 THEN 'Tai nghe bluetooth'
    WHEN 10 THEN 'Ốp lưng điện thoại'
    WHEN 11 THEN 'Sạc dự phòng 10000mAh'
    WHEN 12 THEN 'Cáp sạc type-C'
    WHEN 13 THEN 'Loa bluetooth mini'
    WHEN 14 THEN 'Bàn phím cơ gaming'
    WHEN 15 THEN 'Chuột không dây'
    WHEN 16 THEN 'Webcam HD 1080p'
    WHEN 17 THEN 'Đèn LED bàn học'
    WHEN 18 THEN 'Ghế văn phòng ergonomic'
    WHEN 19 THEN 'Bình giữ nhiệt 500ml'
    WHEN 20 THEN 'Áo polo nam cao cấp'
    WHEN 21 THEN 'Quần short thể thao'
    WHEN 22 THEN 'Áo hoodie oversize'
    WHEN 23 THEN 'Giày sandal nữ'
    WHEN 24 THEN 'Balo laptop 15.6 inch'
    WHEN 25 THEN 'Ví da nam'
    WHEN 26 THEN 'Thắt lưng da bò'
    WHEN 27 THEN 'Vòng tay bạc'
    WHEN 28 THEN 'Dây chuyền titan'
    WHEN 29 THEN 'Nhẫn couple'
    WHEN 30 THEN 'Serum dưỡng da'
    WHEN 31 THEN 'Kem chống nắng SPF50'
    WHEN 32 THEN 'Sữa rửa mặt'
    WHEN 33 THEN 'Toner cân bằng'
    WHEN 34 THEN 'Mặt nạ dưỡng ẩm'
    WHEN 35 THEN 'Son môi lì'
    WHEN 36 THEN 'Phấn phủ kiềm dầu'
    WHEN 37 THEN 'Mascara không trôi'
    WHEN 38 THEN 'Bút kẻ mắt'
    WHEN 39 THEN 'Nước hoa mini'
    WHEN 40 THEN 'Dầu gội thảo dược'
    WHEN 41 THEN 'Dầu xả phục hồi'
    WHEN 42 THEN 'Sữa tắm dưỡng ẩm'
    WHEN 43 THEN 'Kem dưỡng body'
    WHEN 44 THEN 'Bàn chải điện'
    WHEN 45 THEN 'Máy massage mặt'
    WHEN 46 THEN 'Máy uốn tóc'
    WHEN 47 THEN 'Máy sấy tóc ion'
    WHEN 48 THEN 'Gương trang điểm LED'
    ELSE 'Phụ kiện thời trang'
  END,
  CASE (ROW_NUMBER() OVER (ORDER BY eo.id) % 8)
    WHEN 0 THEN 'fashion'
    WHEN 1 THEN 'electronics'
    WHEN 2 THEN 'beauty'
    WHEN 3 THEN 'accessories'
    WHEN 4 THEN 'home'
    WHEN 5 THEN 'sports'
    WHEN 6 THEN 'lifestyle'
    ELSE 'others'
  END,
  GREATEST(COALESCE(eo.total_quantity, 1), 1)::INT,
  ROUND((eo.total_amount / GREATEST(COALESCE(eo.total_quantity, 1), 1))::NUMERIC, 0),
  eo.total_amount,
  ROUND((eo.total_amount * 0.6)::NUMERIC, 0),
  ROUND((eo.total_amount * 0.4)::NUMERIC, 0),
  eo.created_at
FROM external_orders eo
WHERE eo.tenant_id = '11111111-1111-1111-1111-111111111111'
  AND eo.status NOT IN ('cancelled', 'returned');

-- STEP 2: Update external_orders with shop_id and buyer_id
UPDATE external_orders 
SET 
  shop_id = 'STORE-' || LPAD(((EXTRACT(EPOCH FROM order_date)::BIGINT % 10) + 1)::TEXT, 2, '0'),
  buyer_id = 'CUST-' || LPAD((ABS(HASHTEXT(id::TEXT)) % 200 + 1)::TEXT, 4, '0')
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- Re-enable triggers
SET session_replication_role = DEFAULT;
