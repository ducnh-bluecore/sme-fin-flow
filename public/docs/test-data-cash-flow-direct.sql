-- ============================================================
-- TEST DATA: Cash Flow Direct (Báo cáo Lưu chuyển tiền tệ trực tiếp)
-- Dữ liệu mẫu cho 12 tháng (T1/2025 - T12/2025)
-- ============================================================

-- HƯỚNG DẪN SỬ DỤNG:
-- 1. Thay thế 'YOUR_TENANT_ID' bằng tenant_id thực tế của bạn
-- 2. Chạy script này trong SQL Editor của Supabase
-- 3. Hoặc export ra CSV và import qua giao diện

-- Xóa dữ liệu test cũ (nếu có)
-- DELETE FROM cash_flow_direct WHERE tenant_id = 'YOUR_TENANT_ID';

INSERT INTO cash_flow_direct (
  tenant_id,
  period_start,
  period_end,
  period_type,
  is_actual,
  -- Operating Inflows
  cash_from_customers,
  cash_from_interest_received,
  cash_from_other_operating,
  -- Operating Outflows
  cash_to_suppliers,
  cash_to_employees,
  cash_for_rent,
  cash_for_utilities,
  cash_for_taxes,
  cash_for_interest_paid,
  cash_for_other_operating,
  -- Investing
  cash_from_asset_sales,
  cash_for_asset_purchases,
  cash_for_investments,
  -- Financing
  cash_from_loans,
  cash_from_equity,
  cash_for_loan_repayments,
  cash_for_dividends,
  -- Balances
  opening_cash_balance,
  notes
) VALUES
-- Tháng 1/2025
('YOUR_TENANT_ID', '2025-01-01', '2025-01-31', 'monthly', true,
  720000000, 3500000, 8000000,    -- Thu: Khách hàng, lãi, khác
  280000000, 165000000, 42000000, 11000000, 28000000, 7500000, 12000000, -- Chi: NCC, lương, thuê, điện, thuế, lãi vay, khác
  0, 35000000, 0,                  -- Đầu tư: bán TS, mua TS, đầu tư
  200000000, 0, 20000000, 0,       -- Tài chính: vay, góp vốn, trả nợ, cổ tức
  450000000, 'Khởi đầu năm - vay vốn mở rộng'),

-- Tháng 2/2025 (Tết - doanh thu giảm)
('YOUR_TENANT_ID', '2025-02-01', '2025-02-28', 'monthly', true,
  480000000, 3200000, 5000000,
  220000000, 185000000, 42000000, 9000000, 15000000, 8000000, 25000000, -- Thưởng Tết tăng lương
  0, 0, 0,
  0, 0, 20000000, 0,
  581000000, 'Tháng Tết - doanh thu giảm, chi thưởng tăng'),

-- Tháng 3/2025
('YOUR_TENANT_ID', '2025-03-01', '2025-03-31', 'monthly', true,
  650000000, 3800000, 7000000,
  260000000, 168000000, 42000000, 10500000, 25000000, 7800000, 13000000,
  0, 25000000, 0,
  0, 0, 20000000, 0,
  544200000, 'Phục hồi sau Tết'),

-- Tháng 4/2025
('YOUR_TENANT_ID', '2025-04-01', '2025-04-30', 'monthly', true,
  780000000, 4000000, 9000000,
  310000000, 170000000, 42000000, 11200000, 32000000, 7600000, 14000000,
  15000000, 40000000, 0,
  0, 0, 20000000, 0,
  634500000, 'Tăng trưởng ổn định'),

-- Tháng 5/2025
('YOUR_TENANT_ID', '2025-05-01', '2025-05-31', 'monthly', true,
  820000000, 4200000, 10000000,
  330000000, 172000000, 42000000, 12000000, 35000000, 7400000, 15000000,
  0, 60000000, 50000000,
  0, 0, 20000000, 0,
  725300000, 'Đầu tư mở rộng kho'),

-- Tháng 6/2025
('YOUR_TENANT_ID', '2025-06-01', '2025-06-30', 'monthly', true,
  880000000, 4500000, 11000000,
  350000000, 175000000, 42000000, 13500000, 38000000, 7200000, 16000000,
  0, 45000000, 0,
  100000000, 0, 20000000, 50000000,
  763100000, 'Vay thêm vốn, chia cổ tức Q2'),

-- Tháng 7/2025
('YOUR_TENANT_ID', '2025-07-01', '2025-07-31', 'monthly', true,
  920000000, 4800000, 12000000,
  380000000, 178000000, 42000000, 14000000, 40000000, 8000000, 17000000,
  0, 30000000, 0,
  0, 0, 25000000, 0,
  965900000, 'Mùa cao điểm bắt đầu'),

-- Tháng 8/2025
('YOUR_TENANT_ID', '2025-08-01', '2025-08-31', 'monthly', true,
  980000000, 5000000, 13000000,
  420000000, 180000000, 42000000, 14500000, 42000000, 8200000, 18000000,
  25000000, 55000000, 0,
  0, 0, 25000000, 0,
  1154200000, 'Đầu tư thiết bị mới'),

-- Tháng 9/2025
('YOUR_TENANT_ID', '2025-09-01', '2025-09-30', 'monthly', true,
  1050000000, 5200000, 14000000,
  450000000, 182000000, 42000000, 13000000, 45000000, 8500000, 19000000,
  0, 40000000, 0,
  0, 0, 25000000, 0,
  1398900000, 'Chuẩn bị mùa cuối năm'),

-- Tháng 10/2025
('YOUR_TENANT_ID', '2025-10-01', '2025-10-31', 'monthly', true,
  1150000000, 5500000, 15000000,
  520000000, 185000000, 42000000, 13500000, 48000000, 8800000, 20000000,
  0, 80000000, 0,
  150000000, 0, 25000000, 0,
  1677100000, 'Vay vốn chuẩn bị hàng cuối năm'),

-- Tháng 11/2025 (Singles Day 11.11)
('YOUR_TENANT_ID', '2025-11-01', '2025-11-30', 'monthly', true,
  1350000000, 5800000, 18000000,
  620000000, 190000000, 42000000, 14000000, 52000000, 9200000, 25000000,
  0, 50000000, 0,
  0, 0, 30000000, 0,
  2018700000, 'Singles Day - doanh thu đột biến'),

-- Tháng 12/2025 (12.12 + cuối năm)
('YOUR_TENANT_ID', '2025-12-01', '2025-12-31', 'monthly', true,
  1420000000, 6000000, 20000000,
  650000000, 195000000, 42000000, 15000000, 55000000, 9500000, 28000000,
  30000000, 100000000, 0,
  0, 0, 30000000, 100000000,
  2264000000, 'Cuối năm - chia cổ tức năm');

-- ============================================================
-- SUMMARY: Kết quả mong đợi sau khi import
-- ============================================================
-- - Tổng thu (Operating Inflows): ~10.7 tỷ
-- - Tổng chi (Operating Outflows): ~6.5 tỷ
-- - Net Cash từ HĐKD: ~4.2 tỷ
-- - Net Cash từ Đầu tư: ~-460 triệu (đầu tư mở rộng)
-- - Net Cash từ Tài chính: ~+35 triệu (vay - trả nợ - cổ tức)
-- - Cash Runway: 4-6 tháng (tùy burn rate)
-- ============================================================
