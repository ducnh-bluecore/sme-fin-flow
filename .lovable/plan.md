
# Sửa lỗi: Không có action tiếp theo sau khi tạo công ty

## Vấn đề
Sau khi tạo tenant mới trong `CompanyProfilePage`, flow bị "kẹt" vì:
1. `createTenant` tạo tenant mới thành công
2. `switchTenant` set `active_tenant_id` nhưng **chỉ invalidate** `active-tenant` query
3. `goToNextStep('company')` navigate đến `/onboarding/industry`
4. Tại `IndustrySelectionPage`, `useOnboardingStatus` vẫn return `tenant: null` vì query chưa được refetch
5. Button "Tiếp tục" bị disabled do check `!onboardingData?.tenant?.id`

## Giải pháp

### 1. Cập nhật `CompanyProfilePage` - Chờ tenant data sẵn sàng

```typescript
// src/pages/onboarding/CompanyProfilePage.tsx

const handleContinue = async () => {
  if (!companyName.trim()) return;

  let tenantId: string;

  if (hasTenant && onboardingData?.tenant?.id) {
    // Update existing tenant
    tenantId = onboardingData.tenant.id;
    await updateTenant.mutateAsync({
      tenantId,
      data: { onboarding_status: 'in_progress' },
    });
  } else {
    // Create new tenant
    const newTenant = await createTenant.mutateAsync({ name: companyName });
    if (!newTenant) return;
    
    tenantId = newTenant.id;
    await switchTenant.mutateAsync(tenantId);
    
    // Force refetch onboarding status để có tenant data mới
    await queryClient.refetchQueries({ queryKey: ['onboarding-status'] });
  }

  goToNextStep('company');
};
```

### 2. Cập nhật `useSwitchTenant` - Invalidate onboarding-status

```typescript
// src/hooks/useTenant.ts - useSwitchTenant

onSuccess: async () => {
  await queryClient.invalidateQueries({ queryKey: ['active-tenant'] });
  await queryClient.refetchQueries({ queryKey: ['active-tenant'] });
  
  // Thêm: Invalidate onboarding-status để pages khác có tenant mới
  queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
  
  // ... rest
}
```

### 3. Cập nhật `useCreateTenant` - Invalidate onboarding-status

```typescript
// src/hooks/useTenant.ts - useCreateTenant

onSuccess: (tenant) => {
  queryClient.invalidateQueries({ queryKey: ['user-tenants'] });
  queryClient.invalidateQueries({ queryKey: ['onboarding-status'] }); // Thêm dòng này
  
  toast({
    title: 'Tạo công ty thành công',
    description: `${tenant.name} đã được tạo`,
  });
}
```

### 4. Thêm fallback loading state ở `IndustrySelectionPage`

```typescript
// src/pages/onboarding/IndustrySelectionPage.tsx

const { data: onboardingData, isLoading: isLoadingOnboarding } = useOnboardingStatus();

// Show loading nếu đang fetch tenant data
if (isLoadingOnboarding) {
  return (
    <OnboardingLayout stepId="industry" title="Đang tải...">
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    </OnboardingLayout>
  );
}
```

## Các file cần sửa
| File | Thay đổi |
|------|----------|
| `src/pages/onboarding/CompanyProfilePage.tsx` | Force refetch sau khi tạo tenant |
| `src/hooks/useTenant.ts` | Invalidate `onboarding-status` trong `useSwitchTenant` và `useCreateTenant` |
| `src/pages/onboarding/IndustrySelectionPage.tsx` | Thêm loading state |
| `src/pages/onboarding/ScaleRevenuePage.tsx` | Thêm loading state |
| `src/pages/onboarding/DataSourcesOverviewPage.tsx` | Thêm loading state |

## Kết quả
Flow sau khi sửa:
1. User nhập tên công ty → Click "Tiếp tục"
2. Tạo tenant → Switch tenant → **Refetch onboarding-status**
3. Navigate đến Industry page → `tenant.id` đã có → Button hoạt động bình thường
