
# Xóa Menu "Phân bổ vốn"

## Vấn đề
Menu "Phân bổ vốn" (`/capital-allocation`) redirect sang `/executive-summary`, gây confuse cho user.

## Thay đổi

**File:** `src/components/layout/Sidebar.tsx` (line 74)

```diff
  {
    labelKey: 'nav.strategyDecision',
    icon: Target,
    children: [
      { labelKey: 'nav.executiveSummary', href: '/executive-summary' },
-     { labelKey: 'nav.capitalAllocation', href: '/capital-allocation' },
      { labelKey: 'nav.riskDashboard', href: '/risk-dashboard' },
      { labelKey: 'nav.decisionSupport', href: '/decision-support' },
    ],
  },
```

## Kết quả
Menu "Chiến lược & Quyết định" sẽ còn 3 items:
1. Executive Summary
2. Risk Dashboard
3. Hỗ trợ quyết định

## Giữ lại
- Route redirect trong `App.tsx` - để handle old bookmarks/links
- Translation keys - có thể dùng sau nếu khôi phục trang
