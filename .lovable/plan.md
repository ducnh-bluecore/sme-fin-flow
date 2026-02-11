

## Vấn đề: Không mở được FDP/MDP/CDP

### Nguyên nhân gốc

Bảng `platform_modules` và `tenant_modules` trong database **hoàn toàn trống**. Hệ thống module access hoạt động như sau:

1. `useModuleAccess` query bảng `tenant_modules` JOIN `platform_modules` để tìm module nào đã bật cho tenant
2. Vì bảng rỗng, chỉ có module `data_warehouse` (hardcoded) được trả về
3. Khi bấm vào FDP/MDP/CDP, `hasModule('fdp')` trả về `false` --> không navigate

### Giải pháp

Thêm dữ liệu vào 2 bảng:

**Bước 1: Tạo các module trong `platform_modules`**

Insert 4 module: `fdp`, `mdp`, `cdp`, `control_tower` (và `data_warehouse` nếu chưa có)

**Bước 2: Kích hoạt module cho tenant E2E Test**

Insert records vào `tenant_modules` liên kết tenant `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` với tất cả module, `is_enabled = true`

### Technical Details

**SQL Migration cần chạy:**

```text
-- 1. Insert platform_modules
INSERT INTO platform_modules (code, name, is_core, description)
VALUES
  ('data_warehouse', 'Data Warehouse', true, 'Core data infrastructure'),
  ('fdp', 'Finance Data Platform', false, 'Financial analytics & reporting'),
  ('mdp', 'Marketing Data Platform', false, 'Marketing performance & ROI'),
  ('cdp', 'Customer Data Platform', false, 'Customer analytics & segmentation'),
  ('control_tower', 'Control Tower', false, 'Alert & decision management')
ON CONFLICT (code) DO NOTHING;

-- 2. Insert tenant_modules cho E2E tenant
INSERT INTO tenant_modules (tenant_id, module_id, is_enabled)
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  pm.id,
  true
FROM platform_modules pm
ON CONFLICT DO NOTHING;
```

**Files thay đổi:** Không cần sửa code -- chỉ cần insert dữ liệu vào database.

Sau khi chạy migration, reload trang Portal sẽ thấy FDP/MDP/CDP active và có thể bấm vào navigate bình thường.

