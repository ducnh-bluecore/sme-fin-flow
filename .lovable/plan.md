
# Plan: Nâng cấp Trang Quản lý Tenant (Super Admin)

## Mục tiêu

Nâng cấp hệ thống quản lý Tenant hiện tại để tích hợp đầy đủ với kiến trúc Schema-per-Tenant mới, cung cấp công cụ quản trị toàn diện cho Super Admin.

---

## Phân tích hiện trạng

### Đã có:
- **AdminTenantsPage**: Danh sách tenant, tạo/sửa/xóa, impersonation
- **AdminUsersPage**: Quản lý Platform Admin (user_roles)
- **TenantMembersPage**: Quản lý thành viên của từng tenant
- **Edge Functions**: `create-tenant-with-owner`, `provision-tenant-schema`
- **Database**: RPC `is_tenant_schema_provisioned`, `provision_tenant_schema`

### Thiếu:
- Hiển thị trạng thái Schema (Provisioned/Pending)
- Nút Provision Schema từ UI
- Xem chi tiết tenant với thống kê sử dụng
- Quản lý thành viên tenant từ Admin Panel
- Data migration status tracking
- Audit log cho admin actions

---

## Kế hoạch triển khai

### Phase 1: Hiển thị Schema Status trên bảng Tenant

**File: `src/pages/admin/AdminTenantsPage.tsx`**

Thêm cột "Schema Status" với badge:
- `Provisioned` (xanh lá)
- `Pending` (vàng)
- `Error` (đỏ)

Query bổ sung gọi RPC `is_tenant_schema_provisioned` cho mỗi tenant.

### Phase 2: Trang Chi tiết Tenant (New)

**File: `src/pages/admin/AdminTenantDetailPage.tsx`**

Trang chi tiết với các tab:
1. **Overview**: Thông tin cơ bản, plan, trạng thái
2. **Members**: Danh sách thành viên với role
3. **Schema**: Trạng thái schema, nút Provision, stats
4. **Usage**: Thống kê sử dụng (số records, storage)
5. **Audit Log**: Lịch sử thay đổi

### Phase 3: Provision Schema từ UI

**Workflow:**
```text
+------------------+      +----------------------+      +------------------+
| Admin clicks     | ---> | Call Edge Function   | ---> | provision_       |
| "Provision"      |      | provision-tenant-    |      | tenant_schema    |
|                  |      | schema               |      | RPC              |
+------------------+      +----------------------+      +------------------+
```

- Nút "Provision Schema" trên tenant chưa có schema
- Progress indicator trong khi provision
- Toast notification khi hoàn thành

### Phase 4: Quản lý Members từ Admin

**File: `src/pages/admin/AdminTenantMembersPage.tsx`**

Cho phép Super Admin:
- Xem tất cả members của một tenant
- Thêm member mới (by email)
- Thay đổi role (owner/admin/member/viewer)
- Xóa member khỏi tenant

### Phase 5: Hook và Components hỗ trợ

**New Files:**
- `src/hooks/useAdminTenants.ts`: Queries/mutations cho admin
- `src/hooks/useTenantSchemaStatus.ts`: Check schema status
- `src/components/admin/TenantSchemaStatus.tsx`: Badge component
- `src/components/admin/ProvisionSchemaButton.tsx`: Action button

---

## Chi tiết kỹ thuật

### Database Queries cần thiết

```sql
-- Check schema status cho nhiều tenant
SELECT t.id, t.slug,
       is_tenant_schema_provisioned(t.id) as is_provisioned
FROM tenants t
WHERE t.id = ANY($1);

-- Get tenant stats (nếu đã provision)
SELECT * FROM get_tenant_schema_stats(p_tenant_id);
```

### New Hook: useTenantSchemaStatus

```typescript
export function useTenantSchemaStatus(tenantId: string) {
  return useQuery({
    queryKey: ['tenant-schema-status', tenantId],
    queryFn: async () => {
      const { data } = await supabase.rpc('is_tenant_schema_provisioned', {
        p_tenant_id: tenantId
      });
      return data;
    },
    enabled: !!tenantId,
  });
}
```

### Provision Schema Mutation

```typescript
const provisionMutation = useMutation({
  mutationFn: async ({ tenantId, slug }) => {
    const response = await supabase.functions.invoke('provision-tenant-schema', {
      body: { tenantId, slug }
    });
    if (response.error) throw response.error;
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['admin-tenants']);
    toast.success('Schema đã được tạo thành công');
  }
});
```

---

## Cấu trúc Files

```text
src/
├── pages/admin/
│   ├── AdminTenantsPage.tsx        # Cập nhật: thêm cột schema
│   ├── AdminTenantDetailPage.tsx   # Mới: chi tiết tenant
│   └── AdminTenantMembersPage.tsx  # Mới: quản lý members
├── hooks/
│   ├── useAdminTenants.ts          # Mới: admin queries
│   └── useTenantSchemaStatus.ts    # Mới: schema status
├── components/admin/
│   ├── TenantSchemaStatus.tsx      # Mới: badge component
│   ├── ProvisionSchemaButton.tsx   # Mới: action button
│   └── TenantStatsCard.tsx         # Mới: usage stats
└── App.tsx                          # Thêm routes mới
```

---

## Routes mới

| Path | Component | Mô tả |
|------|-----------|-------|
| `/admin/tenants` | AdminTenantsPage | Danh sách (đã có) |
| `/admin/tenants/:tenantId` | AdminTenantDetailPage | Chi tiết tenant |
| `/admin/tenants/:tenantId/members` | AdminTenantMembersPage | Members của tenant |

---

## Translations cần thêm

```typescript
// Vietnamese
'admin.tenants.schemaStatus': 'Trạng thái Schema',
'admin.tenants.provisioned': 'Đã khởi tạo',
'admin.tenants.pending': 'Chưa khởi tạo',
'admin.tenants.provision': 'Khởi tạo Schema',
'admin.tenants.provisioning': 'Đang khởi tạo...',
'admin.tenants.viewDetails': 'Xem chi tiết',
'admin.tenants.tabOverview': 'Tổng quan',
'admin.tenants.tabMembers': 'Thành viên',
'admin.tenants.tabSchema': 'Schema',
'admin.tenants.tabUsage': 'Sử dụng',

// English
'admin.tenants.schemaStatus': 'Schema Status',
'admin.tenants.provisioned': 'Provisioned',
'admin.tenants.pending': 'Pending',
'admin.tenants.provision': 'Provision Schema',
...
```

---

## Ưu tiên triển khai

1. **Phase 1** - Hiển thị Schema Status (quan trọng nhất)
2. **Phase 3** - Provision từ UI
3. **Phase 2** - Trang chi tiết
4. **Phase 4** - Quản lý members từ admin
5. **Phase 5** - Stats và audit log

---

## Lợi ích

- Super Admin có thể theo dõi tiến độ migration
- Provision schema cho tenant mới ngay từ UI
- Quản lý tập trung tất cả tenants và members
- Debug dễ dàng khi có vấn đề với tenant cụ thể
- Audit trail cho các thay đổi quan trọng
