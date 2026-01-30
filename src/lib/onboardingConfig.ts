/**
 * Onboarding Configuration
 * Defines steps, roles, industries, and validation for the onboarding flow
 */

export type OnboardingStatus = 'pending' | 'platform_done' | 'completed' | 'skipped';
export type TenantOnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export type UserRole = 'ceo' | 'cfo' | 'cmo' | 'coo' | 'marketer' | 'accountant' | 'admin';
export type CompanyScale = 'startup' | 'sme' | 'enterprise';
export type Industry = 'retail' | 'd2c' | 'b2b' | 'fnb' | 'services' | 'manufacturing';

export interface RoleConfig {
  id: UserRole;
  label: string;
  description: string;
  icon: string;
  primaryModules: string[];
  color: string;
}

export interface IndustryConfig {
  id: Industry;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export interface ScaleConfig {
  id: CompanyScale;
  label: string;
  description: string;
  revenueRange: string;
  employeeRange: string;
}

export interface RevenueRangeConfig {
  id: string;
  label: string;
  minValue: number;
  maxValue: number | null;
}

// Platform Layer - Role configurations
export const ROLES: RoleConfig[] = [
  {
    id: 'ceo',
    label: 'CEO / Founder',
    description: 'Tổng quan doanh nghiệp, ra quyết định chiến lược',
    icon: 'Crown',
    primaryModules: ['fdp', 'control_tower'],
    color: 'amber',
  },
  {
    id: 'cfo',
    label: 'CFO / Giám đốc Tài chính',
    description: 'Quản lý tài chính, dòng tiền, báo cáo',
    icon: 'Calculator',
    primaryModules: ['fdp'],
    color: 'emerald',
  },
  {
    id: 'cmo',
    label: 'CMO / Giám đốc Marketing',
    description: 'Chiến lược marketing, hiệu quả quảng cáo',
    icon: 'Megaphone',
    primaryModules: ['mdp', 'cdp'],
    color: 'violet',
  },
  {
    id: 'coo',
    label: 'COO / Giám đốc Vận hành',
    description: 'Vận hành, logistics, quy trình nội bộ',
    icon: 'Settings2',
    primaryModules: ['control_tower', 'fdp'],
    color: 'blue',
  },
  {
    id: 'marketer',
    label: 'Marketing / Growth',
    description: 'Chạy ads, tối ưu chiến dịch, phân tích data',
    icon: 'TrendingUp',
    primaryModules: ['mdp'],
    color: 'pink',
  },
  {
    id: 'accountant',
    label: 'Kế toán / Finance',
    description: 'Ghi nhận giao dịch, đối soát, báo cáo tài chính',
    icon: 'FileSpreadsheet',
    primaryModules: ['fdp'],
    color: 'cyan',
  },
];

// Tenant Layer - Industry configurations
export const INDUSTRIES: IndustryConfig[] = [
  {
    id: 'retail',
    label: 'Bán lẻ (Retail)',
    description: 'Cửa hàng, siêu thị, chuỗi bán lẻ',
    icon: 'Store',
    color: 'blue',
  },
  {
    id: 'd2c',
    label: 'D2C / E-commerce',
    description: 'Bán hàng online, sàn TMĐT, social commerce',
    icon: 'ShoppingBag',
    color: 'violet',
  },
  {
    id: 'b2b',
    label: 'B2B / Wholesale',
    description: 'Bán buôn, phân phối, đại lý',
    icon: 'Building2',
    color: 'emerald',
  },
  {
    id: 'fnb',
    label: 'F&B / Nhà hàng',
    description: 'Nhà hàng, quán cafe, dịch vụ ăn uống',
    icon: 'UtensilsCrossed',
    color: 'amber',
  },
  {
    id: 'services',
    label: 'Dịch vụ',
    description: 'Tư vấn, agency, dịch vụ chuyên môn',
    icon: 'Briefcase',
    color: 'cyan',
  },
  {
    id: 'manufacturing',
    label: 'Sản xuất',
    description: 'Nhà máy, xưởng sản xuất, gia công',
    icon: 'Factory',
    color: 'orange',
  },
];

// Tenant Layer - Company scale configurations
export const COMPANY_SCALES: ScaleConfig[] = [
  {
    id: 'startup',
    label: 'Startup / Khởi nghiệp',
    description: 'Đang xây dựng, tìm kiếm product-market fit',
    revenueRange: '< 1 tỷ/tháng',
    employeeRange: '1-10 người',
  },
  {
    id: 'sme',
    label: 'SME / Doanh nghiệp nhỏ',
    description: 'Có doanh thu ổn định, đang scale',
    revenueRange: '1-10 tỷ/tháng',
    employeeRange: '10-50 người',
  },
  {
    id: 'enterprise',
    label: 'Enterprise / Doanh nghiệp lớn',
    description: 'Quy mô lớn, nhiều phòng ban, chi nhánh',
    revenueRange: '> 10 tỷ/tháng',
    employeeRange: '50+ người',
  },
];

// Revenue range options
export const REVENUE_RANGES: RevenueRangeConfig[] = [
  { id: 'under_500m', label: 'Dưới 500 triệu/tháng', minValue: 0, maxValue: 500000000 },
  { id: '500m_1b', label: '500 triệu - 1 tỷ/tháng', minValue: 500000000, maxValue: 1000000000 },
  { id: '1b_5b', label: '1 - 5 tỷ/tháng', minValue: 1000000000, maxValue: 5000000000 },
  { id: '5b_10b', label: '5 - 10 tỷ/tháng', minValue: 5000000000, maxValue: 10000000000 },
  { id: '10b_50b', label: '10 - 50 tỷ/tháng', minValue: 10000000000, maxValue: 50000000000 },
  { id: 'over_50b', label: 'Trên 50 tỷ/tháng', minValue: 50000000000, maxValue: null },
];

// Onboarding step definitions
export interface OnboardingStep {
  id: string;
  path: string;
  title: string;
  layer: 'platform' | 'tenant' | 'module';
  order: number;
  required: boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  // Platform Layer
  { id: 'welcome', path: '/onboarding/welcome', title: 'Chào mừng', layer: 'platform', order: 1, required: true },
  { id: 'role', path: '/onboarding/role', title: 'Vai trò của bạn', layer: 'platform', order: 2, required: true },
  { id: 'preview', path: '/onboarding/preview', title: 'Xem trước Dashboard', layer: 'platform', order: 3, required: false },
  
  // Tenant Layer
  { id: 'company', path: '/onboarding/company', title: 'Thông tin công ty', layer: 'tenant', order: 4, required: true },
  { id: 'industry', path: '/onboarding/industry', title: 'Ngành nghề', layer: 'tenant', order: 5, required: true },
  { id: 'scale', path: '/onboarding/scale', title: 'Quy mô', layer: 'tenant', order: 6, required: true },
  { id: 'sources', path: '/onboarding/sources', title: 'Nguồn dữ liệu', layer: 'tenant', order: 7, required: false },
];

// Helper functions
export function getRoleById(roleId: UserRole): RoleConfig | undefined {
  return ROLES.find(r => r.id === roleId);
}

export function getIndustryById(industryId: Industry): IndustryConfig | undefined {
  return INDUSTRIES.find(i => i.id === industryId);
}

export function getScaleById(scaleId: CompanyScale): ScaleConfig | undefined {
  return COMPANY_SCALES.find(s => s.id === scaleId);
}

export function getNextStep(currentStepId: string): OnboardingStep | null {
  const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === currentStepId);
  if (currentIndex === -1 || currentIndex >= ONBOARDING_STEPS.length - 1) return null;
  return ONBOARDING_STEPS[currentIndex + 1];
}

export function getPreviousStep(currentStepId: string): OnboardingStep | null {
  const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === currentStepId);
  if (currentIndex <= 0) return null;
  return ONBOARDING_STEPS[currentIndex - 1];
}

export function getStepProgress(currentStepId: string): number {
  const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === currentStepId);
  if (currentIndex === -1) return 0;
  return Math.round(((currentIndex + 1) / ONBOARDING_STEPS.length) * 100);
}
