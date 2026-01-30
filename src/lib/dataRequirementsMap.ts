/**
 * Data Requirements Map - Static configuration for module data requirements
 * 
 * Maps each module to its required data types, priority levels,
 * available connector sources, and import templates.
 */

export type DataPriority = 'critical' | 'important' | 'optional';
export type ModuleKey = 'fdp' | 'mdp' | 'cdp' | 'control_tower';

export interface DataRequirement {
  id: string;
  dataType: string;
  displayName: string;
  description: string;
  tableName: string;
  priority: DataPriority;
  connectorSources: string[]; // Connector types that can provide this data
  templateId?: string; // Template for Excel import
  usedFor: string[]; // Features that need this data
}

export interface DataSourceOption {
  id: string;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  connectorTypes: string[]; // Maps to connector_type in connector_integrations
}

export interface DataTypeOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export interface DataFormatOption {
  id: string;
  label: string;
  description: string;
}

// ============================================================
// DATA SOURCE OPTIONS (Step 1 of survey)
// ============================================================
export const dataSourceOptions: DataSourceOption[] = [
  {
    id: 'ecommerce',
    label: 'Sàn TMĐT',
    description: 'Shopee, Lazada, TikTok Shop, Sendo...',
    icon: 'ShoppingBag',
    connectorTypes: ['shopee', 'lazada', 'tiktok_shop', 'sendo', 'shopify'],
  },
  {
    id: 'website',
    label: 'Website riêng',
    description: 'Haravan, Sapo, WooCommerce, Magento...',
    icon: 'Globe',
    connectorTypes: ['haravan', 'sapo', 'woocommerce', 'magento', 'wordpress'],
  },
  {
    id: 'accounting',
    label: 'Phần mềm kế toán',
    description: 'MISA, Fast Accounting, Bravo, SAC...',
    icon: 'Calculator',
    connectorTypes: ['misa', 'fast_accounting', 'bravo', 'effect', 'sac'],
  },
  {
    id: 'erp',
    label: 'Hệ thống ERP',
    description: 'SAP, Oracle, Odoo, Microsoft Dynamics...',
    icon: 'Database',
    connectorTypes: ['sap', 'oracle', 'odoo', 'microsoft_dynamics', 'netsuite'],
  },
  {
    id: 'ads',
    label: 'Nền tảng quảng cáo',
    description: 'Facebook Ads, Google Ads, TikTok Ads...',
    icon: 'Megaphone',
    connectorTypes: ['meta_ads', 'google_ads', 'tiktok_ads', 'zalo_ads'],
  },
  {
    id: 'excel',
    label: 'Excel / Google Sheets',
    description: 'File báo cáo, sổ sách thủ công',
    icon: 'FileSpreadsheet',
    connectorTypes: [], // No connector, use template import
  },
  {
    id: 'manual',
    label: 'Chưa có hệ thống',
    description: 'Nhập thủ công từng giao dịch',
    icon: 'Edit3',
    connectorTypes: [],
  },
];

// ============================================================
// DATA TYPE OPTIONS (Step 2 of survey)
// ============================================================
export const dataTypeOptions: DataTypeOption[] = [
  {
    id: 'orders',
    label: 'Đơn hàng',
    description: 'Danh sách đơn hàng bán ra',
    icon: 'ShoppingCart',
  },
  {
    id: 'customers',
    label: 'Khách hàng',
    description: 'Thông tin khách hàng, liên hệ',
    icon: 'Users',
  },
  {
    id: 'invoices',
    label: 'Hóa đơn bán hàng',
    description: 'Hóa đơn AR (Accounts Receivable)',
    icon: 'FileText',
  },
  {
    id: 'bills',
    label: 'Hóa đơn mua hàng',
    description: 'Hóa đơn AP (Accounts Payable), công nợ',
    icon: 'Receipt',
  },
  {
    id: 'expenses',
    label: 'Chi phí vận hành',
    description: 'Chi phí thuê, lương, vận chuyển...',
    icon: 'Wallet',
  },
  {
    id: 'bank_transactions',
    label: 'Giao dịch ngân hàng',
    description: 'Sao kê ngân hàng, thu chi',
    icon: 'Building',
  },
  {
    id: 'marketing_spend',
    label: 'Chi phí marketing',
    description: 'Chi tiêu quảng cáo, chiến dịch',
    icon: 'Megaphone',
  },
  {
    id: 'inventory',
    label: 'Tồn kho',
    description: 'Số lượng tồn, giá vốn',
    icon: 'Package',
  },
  {
    id: 'products',
    label: 'Sản phẩm',
    description: 'Danh mục sản phẩm, SKU',
    icon: 'Box',
  },
  {
    id: 'none',
    label: 'Chưa có dữ liệu',
    description: 'Cần tạo mới từ đầu',
    icon: 'Plus',
  },
];

// ============================================================
// DATA FORMAT OPTIONS (Step 3 of survey)
// ============================================================
export const dataFormatOptions: DataFormatOption[] = [
  {
    id: 'api',
    label: 'Export từ phần mềm (kết nối API)',
    description: 'Dữ liệu có thể đồng bộ tự động qua API',
  },
  {
    id: 'excel',
    label: 'File Excel / CSV',
    description: 'Import thủ công từ file',
  },
  {
    id: 'manual',
    label: 'Nhập thủ công',
    description: 'Tự nhập từng giao dịch vào hệ thống',
  },
  {
    id: 'mixed',
    label: 'Hỗn hợp nhiều nguồn',
    description: 'Kết hợp API, file và nhập tay',
  },
];

// ============================================================
// MODULE DATA REQUIREMENTS
// ============================================================

export const fdpRequirements: DataRequirement[] = [
  {
    id: 'fdp_invoices',
    dataType: 'invoices',
    displayName: 'Hóa đơn bán hàng (AR)',
    description: 'Công nợ phải thu từ khách hàng',
    tableName: 'invoices',
    priority: 'critical',
    connectorSources: ['misa', 'fast_accounting', 'bravo', 'effect', 'sac'],
    templateId: 'invoices',
    usedFor: ['AR Aging', 'Cash Position', 'DSO Calculation'],
  },
  {
    id: 'fdp_bills',
    dataType: 'bills',
    displayName: 'Hóa đơn mua hàng (AP)',
    description: 'Công nợ phải trả nhà cung cấp',
    tableName: 'bills',
    priority: 'critical',
    connectorSources: ['misa', 'fast_accounting', 'bravo', 'effect'],
    templateId: 'bills',
    usedFor: ['AP Aging', 'Cash Forecast', 'DPO Calculation'],
  },
  {
    id: 'fdp_bank',
    dataType: 'bank_transactions',
    displayName: 'Giao dịch ngân hàng',
    description: 'Sao kê thu chi, số dư thực',
    tableName: 'bank_transactions',
    priority: 'critical',
    connectorSources: ['bigquery', 'manual'],
    templateId: 'bank_transactions',
    usedFor: ['Cash Position', 'Bank Reconciliation', 'Cash Flow'],
  },
  {
    id: 'fdp_customers',
    dataType: 'customers',
    displayName: 'Khách hàng',
    description: 'Danh sách khách hàng, thông tin liên hệ',
    tableName: 'customers',
    priority: 'important',
    connectorSources: ['shopee', 'lazada', 'tiktok_shop', 'haravan', 'sapo'],
    templateId: 'customers',
    usedFor: ['AR Aging by Customer', 'Credit Risk'],
  },
  {
    id: 'fdp_vendors',
    dataType: 'vendors',
    displayName: 'Nhà cung cấp',
    description: 'Danh sách NCC, điều khoản thanh toán',
    tableName: 'vendors',
    priority: 'important',
    connectorSources: ['misa', 'fast_accounting'],
    templateId: 'vendors',
    usedFor: ['AP Aging by Vendor', 'Payment Planning'],
  },
  {
    id: 'fdp_expenses',
    dataType: 'expenses',
    displayName: 'Chi phí vận hành',
    description: 'Chi phí cố định và biến đổi',
    tableName: 'expenses',
    priority: 'important',
    connectorSources: ['misa', 'fast_accounting'],
    templateId: 'expenses',
    usedFor: ['Operating Burn Rate', 'Cash Forecast'],
  },
  {
    id: 'fdp_forecast',
    dataType: 'cash_forecasts',
    displayName: 'Dự báo tiền mặt',
    description: 'Kế hoạch thu chi tương lai',
    tableName: 'cash_forecasts',
    priority: 'optional',
    connectorSources: [],
    templateId: 'cash_forecasts',
    usedFor: ['Cash Runway', 'Scenario Planning'],
  },
];

export const mdpRequirements: DataRequirement[] = [
  {
    id: 'mdp_orders',
    dataType: 'orders',
    displayName: 'Đơn hàng',
    description: 'Đơn hàng từ các kênh bán',
    tableName: 'cdp_orders',
    priority: 'critical',
    connectorSources: ['shopee', 'lazada', 'tiktok_shop', 'haravan', 'sapo'],
    templateId: 'orders',
    usedFor: ['Channel Revenue', 'Order Metrics', 'Conversion'],
  },
  {
    id: 'mdp_marketing',
    dataType: 'marketing_spend',
    displayName: 'Chi phí Marketing',
    description: 'Chi tiêu quảng cáo theo kênh',
    tableName: 'marketing_expenses',
    priority: 'critical',
    connectorSources: ['meta_ads', 'google_ads', 'tiktok_ads'],
    templateId: 'expenses',
    usedFor: ['ROAS', 'CAC', 'Profit Attribution'],
  },
  {
    id: 'mdp_campaigns',
    dataType: 'campaigns',
    displayName: 'Chiến dịch khuyến mãi',
    description: 'Promotion, voucher, flash sale',
    tableName: 'promotion_campaigns',
    priority: 'important',
    connectorSources: ['meta_ads', 'tiktok_ads'],
    templateId: 'promotions',
    usedFor: ['Campaign ROI', 'Discount Impact'],
  },
  {
    id: 'mdp_products',
    dataType: 'products',
    displayName: 'Sản phẩm',
    description: 'Danh mục sản phẩm theo kênh',
    tableName: 'external_products',
    priority: 'important',
    connectorSources: ['shopee', 'lazada', 'tiktok_shop', 'haravan'],
    templateId: 'products',
    usedFor: ['Product Performance', 'SKU Analysis'],
  },
  {
    id: 'mdp_channel_fees',
    dataType: 'channel_fees',
    displayName: 'Phí sàn',
    description: 'Commission, phí vận chuyển, phí thanh toán',
    tableName: 'channel_fees',
    priority: 'important',
    connectorSources: ['shopee', 'lazada', 'tiktok_shop'],
    usedFor: ['Net Revenue', 'Contribution Margin'],
  },
  {
    id: 'mdp_settlements',
    dataType: 'settlements',
    displayName: 'Đối soát thanh toán',
    description: 'Tiền về từ sàn TMĐT',
    tableName: 'channel_settlements',
    priority: 'optional',
    connectorSources: ['shopee', 'lazada', 'tiktok_shop'],
    templateId: 'bank_transactions',
    usedFor: ['Settlement Tracking', 'Cash from Sales'],
  },
];

export const cdpRequirements: DataRequirement[] = [
  {
    id: 'cdp_orders',
    dataType: 'orders',
    displayName: 'Đơn hàng',
    description: 'Lịch sử mua hàng của khách',
    tableName: 'cdp_orders',
    priority: 'critical',
    connectorSources: ['shopee', 'lazada', 'tiktok_shop', 'haravan', 'sapo'],
    templateId: 'orders',
    usedFor: ['RFM Analysis', 'Customer Value', 'Purchase Patterns'],
  },
  {
    id: 'cdp_customers',
    dataType: 'customers',
    displayName: 'Khách hàng',
    description: 'Profile khách hàng, thông tin liên hệ',
    tableName: 'customers',
    priority: 'critical',
    connectorSources: ['shopee', 'lazada', 'tiktok_shop', 'haravan', 'sapo'],
    templateId: 'customers',
    usedFor: ['Customer 360', 'Segmentation', 'LTV'],
  },
  {
    id: 'cdp_order_items',
    dataType: 'order_items',
    displayName: 'Chi tiết đơn hàng',
    description: 'SKU, số lượng, giá từng item',
    tableName: 'external_order_items',
    priority: 'important',
    connectorSources: ['shopee', 'lazada', 'tiktok_shop'],
    usedFor: ['Product Affinity', 'Basket Analysis'],
  },
  {
    id: 'cdp_products',
    dataType: 'products',
    displayName: 'Sản phẩm',
    description: 'Danh mục sản phẩm',
    tableName: 'external_products',
    priority: 'important',
    connectorSources: ['shopee', 'lazada', 'tiktok_shop', 'haravan'],
    templateId: 'products',
    usedFor: ['Product Recommendations', 'Category Analysis'],
  },
  {
    id: 'cdp_events',
    dataType: 'customer_events',
    displayName: 'Sự kiện khách hàng',
    description: 'Hành vi: view, add-to-cart, purchase',
    tableName: 'customer_events',
    priority: 'optional',
    connectorSources: ['google_analytics', 'facebook_pixel'],
    usedFor: ['Behavior Tracking', 'Funnel Analysis'],
  },
];

export const controlTowerRequirements: DataRequirement[] = [
  // Control Tower aggregates from other modules - needs same data
  ...fdpRequirements.filter(r => r.priority === 'critical'),
  ...mdpRequirements.filter(r => r.priority === 'critical'),
];

// ============================================================
// MODULE REQUIREMENTS MAP
// ============================================================
export const moduleRequirementsMap: Record<ModuleKey, DataRequirement[]> = {
  fdp: fdpRequirements,
  mdp: mdpRequirements,
  cdp: cdpRequirements,
  control_tower: controlTowerRequirements,
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get requirements for a specific module
 */
export function getModuleRequirements(moduleKey: ModuleKey): DataRequirement[] {
  return moduleRequirementsMap[moduleKey] || [];
}

/**
 * Get all unique connector types that can provide data for a module
 */
export function getModuleConnectorTypes(moduleKey: ModuleKey): string[] {
  const requirements = getModuleRequirements(moduleKey);
  const connectorTypes = new Set<string>();
  
  requirements.forEach(req => {
    req.connectorSources.forEach(source => connectorTypes.add(source));
  });
  
  return Array.from(connectorTypes);
}

/**
 * Get all template IDs needed for a module
 */
export function getModuleTemplateIds(moduleKey: ModuleKey): string[] {
  const requirements = getModuleRequirements(moduleKey);
  const templates = new Set<string>();
  
  requirements.forEach(req => {
    if (req.templateId) {
      templates.add(req.templateId);
    }
  });
  
  return Array.from(templates);
}

/**
 * Find which data sources can provide a specific data type
 */
export function getSourcesForDataType(dataType: string): DataSourceOption[] {
  return dataSourceOptions.filter(source => {
    // Check if any requirement with this dataType has connector sources matching this source
    const allRequirements = [
      ...fdpRequirements,
      ...mdpRequirements,
      ...cdpRequirements,
    ];
    
    return allRequirements.some(req => 
      req.dataType === dataType && 
      req.connectorSources.some(c => source.connectorTypes.includes(c))
    );
  });
}

/**
 * Module display info
 */
export const moduleDisplayInfo: Record<ModuleKey, { name: string; description: string; icon: string }> = {
  fdp: {
    name: 'Financial Data Platform',
    description: 'Quản lý dòng tiền, công nợ, dự báo',
    icon: 'DollarSign',
  },
  mdp: {
    name: 'Marketing Data Platform',
    description: 'Đo lường hiệu quả marketing, ROAS, CAC',
    icon: 'TrendingUp',
  },
  cdp: {
    name: 'Customer Data Platform',
    description: 'Phân tích khách hàng, RFM, LTV',
    icon: 'Users',
  },
  control_tower: {
    name: 'Control Tower',
    description: 'Giám sát toàn bộ, cảnh báo thời gian thực',
    icon: 'LayoutDashboard',
  },
};
