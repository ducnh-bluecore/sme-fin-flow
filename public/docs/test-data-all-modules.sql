-- ============================================================
-- TEST DATA: All New Modules
-- Dữ liệu test cho 4 module mới
-- ============================================================

-- HƯỚNG DẪN:
-- 1. Thay 'YOUR_TENANT_ID' bằng tenant_id thực tế
-- 2. Chạy từng phần hoặc toàn bộ script

-- ============================================================
-- 1. INVENTORY ITEMS (Tuổi tồn kho)
-- ============================================================

INSERT INTO inventory_items (
  tenant_id, sku, product_name, category, quantity_on_hand, 
  unit_cost, last_received_date, last_sold_date, 
  warehouse_location, reorder_point, notes
) VALUES
-- Hàng bán chạy (0-30 ngày)
('YOUR_TENANT_ID', 'SKU-001', 'Áo thun nam basic trắng', 'Thời trang nam', 250, 75000, '2026-01-02', '2026-01-07', 'Kho A - Kệ 1', 100, 'Best seller'),
('YOUR_TENANT_ID', 'SKU-002', 'Áo thun nam basic đen', 'Thời trang nam', 180, 75000, '2025-12-28', '2026-01-06', 'Kho A - Kệ 1', 80, 'Best seller'),
('YOUR_TENANT_ID', 'SKU-003', 'Quần jean nam slim fit', 'Thời trang nam', 120, 195000, '2026-01-01', '2026-01-05', 'Kho A - Kệ 2', 50, 'Bán tốt'),
('YOUR_TENANT_ID', 'SKU-004', 'Áo sơ mi nữ công sở', 'Thời trang nữ', 95, 165000, '2025-12-25', '2026-01-04', 'Kho B - Kệ 1', 40, ''),

-- Hàng tồn trung bình (31-60 ngày)
('YOUR_TENANT_ID', 'SKU-010', 'Giày sneaker nam trắng', 'Giày dép', 65, 450000, '2025-11-20', '2025-12-15', 'Kho C - Kệ 1', 30, 'Cần đẩy hàng'),
('YOUR_TENANT_ID', 'SKU-011', 'Giày cao gót nữ', 'Giày dép', 42, 380000, '2025-11-15', '2025-12-10', 'Kho C - Kệ 2', 20, ''),
('YOUR_TENANT_ID', 'SKU-012', 'Túi xách da nữ', 'Phụ kiện', 28, 520000, '2025-11-10', '2025-12-05', 'Kho D - Kệ 1', 15, ''),

-- Hàng tồn lâu (61-90 ngày)
('YOUR_TENANT_ID', 'SKU-020', 'Áo khoác dạ nam', 'Thời trang nam', 35, 850000, '2025-10-15', '2025-11-20', 'Kho A - Kệ 5', 10, 'Hàng mùa đông'),
('YOUR_TENANT_ID', 'SKU-021', 'Áo len nữ cổ lọ', 'Thời trang nữ', 48, 320000, '2025-10-20', '2025-11-10', 'Kho B - Kệ 4', 20, 'Xem xét giảm giá'),
('YOUR_TENANT_ID', 'SKU-022', 'Boots da nam', 'Giày dép', 18, 780000, '2025-10-10', '2025-11-05', 'Kho C - Kệ 3', 10, ''),

-- Hàng tồn rất lâu (>90 ngày) - CẦN XỬ LÝ
('YOUR_TENANT_ID', 'SKU-030', 'Váy maxi hè', 'Thời trang nữ', 85, 280000, '2025-07-15', '2025-09-10', 'Kho B - Kệ 6', 30, 'Hàng lỗi mùa - cần sale'),
('YOUR_TENANT_ID', 'SKU-031', 'Dép sandal nam', 'Giày dép', 120, 150000, '2025-06-20', '2025-08-25', 'Kho C - Kệ 5', 40, 'Hàng hè - tồn kho nghiêm trọng'),
('YOUR_TENANT_ID', 'SKU-032', 'Mũ lưỡi trai', 'Phụ kiện', 200, 85000, '2025-05-10', '2025-07-20', 'Kho D - Kệ 3', 50, 'Cần thanh lý'),
('YOUR_TENANT_ID', 'SKU-033', 'Áo tắm nữ', 'Thời trang nữ', 95, 220000, '2025-04-01', '2025-06-15', 'Kho B - Kệ 8', 20, 'Dead stock - xem xét thanh lý');

-- ============================================================
-- 2. PROMOTIONS (Khuyến mãi)
-- ============================================================

INSERT INTO promotions (
  tenant_id, name, description, promotion_type, discount_type,
  discount_value, start_date, end_date, budget, 
  target_revenue, status, channels, notes
) VALUES
-- Đã hoàn thành
('YOUR_TENANT_ID', 'Flash Sale 11.11', 'Ngày hội siêu sale Singles Day', 'flash_sale', 'percentage', 
  35, '2025-11-11', '2025-11-11', 80000000, 
  350000000, 'completed', 'shopee,lazada,tiktok', 'Thành công vượt KPI'),
  
('YOUR_TENANT_ID', 'Sale 12.12', 'Đại tiệc cuối năm', 'flash_sale', 'percentage',
  30, '2025-12-12', '2025-12-12', 100000000,
  420000000, 'completed', 'shopee,lazada,tiktok,website', 'Đạt 95% target'),

('YOUR_TENANT_ID', 'Black Friday 2025', 'Siêu sale Black Friday', 'seasonal', 'percentage',
  40, '2025-11-29', '2025-12-01', 60000000,
  280000000, 'completed', 'all', 'ROI tốt nhất năm'),

-- Đang chạy
('YOUR_TENANT_ID', 'Tết 2026', 'Ưu đãi Tết Nguyên Đán', 'seasonal', 'percentage',
  25, '2026-01-01', '2026-02-15', 150000000,
  600000000, 'active', 'all', 'Chiến dịch chính đầu năm'),

('YOUR_TENANT_ID', 'Clearance Sale', 'Xả hàng tồn kho', 'clearance', 'percentage',
  50, '2026-01-05', '2026-01-31', 30000000,
  120000000, 'active', 'website,shopee', 'Giải phóng hàng tồn'),

-- Lên kế hoạch
('YOUR_TENANT_ID', 'Valentine 2026', 'Khuyến mãi ngày Lễ tình nhân', 'seasonal', 'fixed_amount',
  100000, '2026-02-10', '2026-02-14', 40000000,
  180000000, 'draft', 'all', 'Đang lên kế hoạch');

-- ============================================================
-- 3. PROMOTION PERFORMANCE (Hiệu suất khuyến mãi)
-- ============================================================

INSERT INTO promotion_performance (
  tenant_id, promotion_id, measured_date, 
  orders_count, revenue, discount_given, 
  cogs, marketing_cost, new_customers, returning_customers
) VALUES
-- Performance cho Flash Sale 11.11
('YOUR_TENANT_ID', (SELECT id FROM promotions WHERE name = 'Flash Sale 11.11' AND tenant_id = 'YOUR_TENANT_ID'), '2025-11-11',
  1250, 380000000, 133000000, 190000000, 25000000, 320, 930),

-- Performance cho Sale 12.12
('YOUR_TENANT_ID', (SELECT id FROM promotions WHERE name = 'Sale 12.12' AND tenant_id = 'YOUR_TENANT_ID'), '2025-12-12',
  1480, 405000000, 121500000, 202500000, 35000000, 380, 1100),

-- Performance cho Black Friday
('YOUR_TENANT_ID', (SELECT id FROM promotions WHERE name = 'Black Friday 2025' AND tenant_id = 'YOUR_TENANT_ID'), '2025-11-29',
  520, 145000000, 58000000, 72500000, 15000000, 150, 370),
('YOUR_TENANT_ID', (SELECT id FROM promotions WHERE name = 'Black Friday 2025' AND tenant_id = 'YOUR_TENANT_ID'), '2025-11-30',
  680, 185000000, 74000000, 92500000, 18000000, 180, 500),
('YOUR_TENANT_ID', (SELECT id FROM promotions WHERE name = 'Black Friday 2025' AND tenant_id = 'YOUR_TENANT_ID'), '2025-12-01',
  450, 125000000, 50000000, 62500000, 12000000, 120, 330),

-- Performance cho Tết 2026 (đang chạy)
('YOUR_TENANT_ID', (SELECT id FROM promotions WHERE name = 'Tết 2026' AND tenant_id = 'YOUR_TENANT_ID'), '2026-01-01',
  280, 85000000, 21250000, 42500000, 8000000, 95, 185),
('YOUR_TENANT_ID', (SELECT id FROM promotions WHERE name = 'Tết 2026' AND tenant_id = 'YOUR_TENANT_ID'), '2026-01-02',
  310, 92000000, 23000000, 46000000, 8500000, 102, 208),
('YOUR_TENANT_ID', (SELECT id FROM promotions WHERE name = 'Tết 2026' AND tenant_id = 'YOUR_TENANT_ID'), '2026-01-03',
  295, 88000000, 22000000, 44000000, 8200000, 88, 207),
('YOUR_TENANT_ID', (SELECT id FROM promotions WHERE name = 'Tết 2026' AND tenant_id = 'YOUR_TENANT_ID'), '2026-01-04',
  340, 105000000, 26250000, 52500000, 9000000, 115, 225),
('YOUR_TENANT_ID', (SELECT id FROM promotions WHERE name = 'Tết 2026' AND tenant_id = 'YOUR_TENANT_ID'), '2026-01-05',
  380, 118000000, 29500000, 59000000, 9500000, 128, 252);

-- ============================================================
-- 4. SUPPLIER PAYMENT SCHEDULES (Lịch thanh toán NCC)
-- ============================================================

INSERT INTO supplier_payment_schedules (
  tenant_id, vendor_id, vendor_name, bill_id, bill_number,
  bill_date, due_date, total_amount, paid_amount,
  payment_status, payment_priority, bank_account, notes
) VALUES
-- Ưu tiên cao - sắp đến hạn
('YOUR_TENANT_ID', NULL, 'Công ty TNHH Vải Việt', NULL, 'BILL-VV-2025-089',
  '2025-12-15', '2026-01-15', 125000000, 0,
  'pending', 'high', 'VCB-1234567890', 'NCC chiến lược - thanh toán đúng hạn'),

('YOUR_TENANT_ID', NULL, 'Xưởng may ABC', NULL, 'BILL-ABC-2025-156',
  '2025-12-20', '2026-01-20', 85000000, 0,
  'pending', 'high', 'TCB-0987654321', 'Đơn hàng lớn Q1'),

('YOUR_TENANT_ID', NULL, 'NCC Phụ kiện Thời trang', NULL, 'BILL-PKTT-2025-078',
  '2025-12-25', '2026-01-10', 42000000, 0,
  'overdue', 'critical', 'BIDV-1122334455', 'QUÁ HẠN - cần thanh toán ngay'),

-- Ưu tiên trung bình
('YOUR_TENANT_ID', NULL, 'Công ty Bao bì Xanh', NULL, 'BILL-BBX-2025-234',
  '2025-12-10', '2026-02-10', 28000000, 8000000,
  'partial', 'medium', 'VCB-5544332211', 'Đã thanh toán 30%'),

('YOUR_TENANT_ID', NULL, 'Vận chuyển Nhanh', NULL, 'BILL-VCN-2025-445',
  '2025-12-28', '2026-02-28', 35000000, 0,
  'pending', 'medium', 'MB-6677889900', 'Chi phí logistics T12'),

('YOUR_TENANT_ID', NULL, 'Marketing Agency Pro', NULL, 'BILL-MAP-2025-089',
  '2026-01-05', '2026-02-05', 65000000, 32500000,
  'partial', 'medium', 'VPB-1357924680', 'Chiến dịch Tết - thanh toán 50%'),

-- Ưu tiên thấp
('YOUR_TENANT_ID', NULL, 'Văn phòng phẩm Minh Tâm', NULL, 'BILL-VPMT-2025-067',
  '2025-11-30', '2026-01-30', 8500000, 0,
  'pending', 'low', 'ACB-2468013579', 'Chi phí văn phòng'),

('YOUR_TENANT_ID', NULL, 'Điện lực EVN', NULL, 'BILL-EVN-2025-012',
  '2026-01-05', '2026-01-20', 18500000, 0,
  'pending', 'low', 'Thanh toán online', 'Tiền điện tháng 12'),

-- Đã thanh toán
('YOUR_TENANT_ID', NULL, 'Công ty TNHH Vải Việt', NULL, 'BILL-VV-2025-075',
  '2025-11-15', '2025-12-15', 98000000, 98000000,
  'paid', 'medium', 'VCB-1234567890', 'Đã thanh toán đủ'),

('YOUR_TENANT_ID', NULL, 'Xưởng may ABC', NULL, 'BILL-ABC-2025-142',
  '2025-11-20', '2025-12-20', 72000000, 72000000,
  'paid', 'high', 'TCB-0987654321', 'Đã thanh toán đủ');

-- ============================================================
-- SUMMARY
-- ============================================================
-- Inventory: 14 SKU với các mức tuổi tồn khác nhau
-- Promotions: 6 chương trình (3 completed, 2 active, 1 draft)
-- Promotion Performance: 10 records tracking
-- Supplier Payments: 10 hóa đơn với các trạng thái khác nhau
-- 
-- Kết quả mong đợi:
-- - Inventory Aging: ~40% hàng tồn >60 ngày cần xử lý
-- - Promotion ROI: Flash Sale có ROI cao nhất
-- - Supplier Payments: 1 hóa đơn overdue, tổng công nợ ~407 triệu
-- ============================================================
