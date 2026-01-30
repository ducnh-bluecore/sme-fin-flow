/**
 * Data Requirements Map - Static configuration for module data requirements
 * 
 * Maps each module to its required data types, priority levels,
 * available connector sources, and import templates.
 * 
 * Smart Data Inference: Sources → Auto-inferred Data Types
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

export interface SubSource {
  id: string;
  label: string;
  connectorType: string;
  logo?: string;
}

export interface DataSourceOption {
  id: string;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  connectorTypes: string[]; // Maps to connector_type in connector_integrations
  providedDataTypes: string[]; // Data types this source typically provides
  subSources?: SubSource[]; // Specific platforms within this category
}

export interface DataTypeOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

// ============================================================
// DATA SOURCE OPTIONS with Sub-sources and Inferred Data Types
// ============================================================
export const dataSourceOptions: DataSourceOption[] = [
  {
    id: 'ecommerce',
    label: 'Sàn TMĐT',
    description: 'Shopee, Lazada, TikTok Shop, Sendo...',
    icon: 'ShoppingBag',
    connectorTypes: ['shopee', 'lazada', 'tiktok_shop', 'sendo', 'shopify'],
    providedDataTypes: ['orders', 'customers', 'products', 'channel_fees', 'settlements', 'order_items'],
    subSources: [
      { id: 'shopee', label: 'Shopee', connectorType: 'shopee' },
      { id: 'lazada', label: 'Lazada', connectorType: 'lazada' },
      { id: 'tiktok_shop', label: 'TikTok Shop', connectorType: 'tiktok_shop' },
      { id: 'sendo', label: 'Sendo', connectorType: 'sendo' },
    ],
  },
  {
    id: 'website',
    label: 'Website riêng',
    description: 'Haravan, Sapo, WooCommerce, Magento...',
    icon: 'Globe',
    connectorTypes: ['haravan', 'sapo', 'woocommerce', 'magento', 'wordpress'],
    providedDataTypes: ['orders', 'customers', 'products'],
    subSources: [
      { id: 'haravan', label: 'Haravan', connectorType: 'haravan' },
      { id: 'sapo', label: 'Sapo', connectorType: 'sapo' },
      { id: 'woocommerce', label: 'WooCommerce', connectorType: 'woocommerce' },
      { id: 'magento', label: 'Magento', connectorType: 'magento' },
    ],
  },
  {
    id: 'accounting',
    label: 'Phần mềm kế toán',
    description: 'MISA, Fast Accounting, Bravo, SAC...',
    icon: 'Calculator',
    connectorTypes: ['misa', 'fast_accounting', 'bravo', 'effect', 'sac'],
    providedDataTypes: ['invoices', 'bills', 'expenses', 'vendors', 'bank_transactions'],
    subSources: [
      { id: 'misa', label: 'MISA', connectorType: 'misa' },
      { id: 'fast_accounting', label: 'Fast Accounting', connectorType: 'fast_accounting' },
      { id: 'bravo', label: 'Bravo', connectorType: 'bravo' },
      { id: 'effect', label: 'Effect', connectorType: 'effect' },
      { id: 'sac', label: 'SAC', connectorType: 'sac' },
    ],
  },
  {
    id: 'erp',
    label: 'Hệ thống ERP',
    description: 'SAP, Oracle, Odoo, Microsoft Dynamics...',
    icon: 'Database',
    connectorTypes: ['sap', 'oracle', 'odoo', 'microsoft_dynamics', 'netsuite'],
    providedDataTypes: ['invoices', 'bills', 'expenses', 'vendors', 'inventory', 'bank_transactions', 'products'],
    subSources: [
      { id: 'sap', label: 'SAP', connectorType: 'sap' },
      { id: 'oracle', label: 'Oracle', connectorType: 'oracle' },
      { id: 'odoo', label: 'Odoo', connectorType: 'odoo' },
      { id: 'netsuite', label: 'NetSuite', connectorType: 'netsuite' },
    ],
  },
  {
    id: 'ads',
    label: 'Nền tảng quảng cáo',
    description: 'Facebook Ads, Google Ads, TikTok Ads...',
    icon: 'Megaphone',
    connectorTypes: ['meta_ads', 'google_ads', 'tiktok_ads', 'zalo_ads'],
    providedDataTypes: ['marketing_spend', 'campaigns'],
    subSources: [
      { id: 'meta_ads', label: 'Facebook / Meta Ads', connectorType: 'meta_ads' },
      { id: 'google_ads', label: 'Google Ads', connectorType: 'google_ads' },
      { id: 'tiktok_ads', label: 'TikTok Ads', connectorType: 'tiktok_ads' },
      { id: 'zalo_ads', label: 'Zalo Ads', connectorType: 'zalo_ads' },
    ],
  },
  {
    id: 'excel',
    label: 'Excel / Google Sheets',
    description: 'File báo cáo, sổ sách thủ công',
    icon: 'FileSpreadsheet',
    connectorTypes: [], // No connector, use template import
    providedDataTypes: [], // Cannot auto-infer - need to ask
  },
  {
    id: 'manual',
    label: 'Chưa có hệ thống',
    description: 'Nhập thủ công từng giao dịch',
    icon: 'Edit3',
    connectorTypes: [],
    providedDataTypes: [], // Cannot auto-infer
  },
];

// ============================================================
// DATA TYPE OPTIONS (for additional data selection with Excel/Manual)
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
];

// ============================================================
// SMART DATA INFERENCE FUNCTIONS
// ============================================================

export interface InferredDataGroup {
  source: string;
  sourceId: string;
  dataTypes: string[];
  connectorTypes: string[];
}

/**
 * Infer data types from selected sources
 * Returns grouped inferred data by source for display
 */
export function inferDataTypesFromSources(
  selectedSourceIds: string[],
  selectedSubSources: string[]
): InferredDataGroup[] {
  const result: InferredDataGroup[] = [];
  
  selectedSourceIds.forEach(sourceId => {
    const source = dataSourceOptions.find(s => s.id === sourceId);
    if (source && source.providedDataTypes.length > 0) {
      // Get connector types from selected sub-sources or all if none selected
      const relevantSubSources = source.subSources?.filter(
        sub => selectedSubSources.includes(sub.id)
      ) || source.subSources || [];
      
      const connectorTypes = relevantSubSources.length > 0
        ? relevantSubSources.map(sub => sub.connectorType)
        : source.connectorTypes;
      
      const subSourceLabels = relevantSubSources.map(sub => sub.label);
      const sourceLabel = subSourceLabels.length > 0
        ? subSourceLabels.join(', ')
        : source.label;
      
      result.push({
        source: sourceLabel,
        sourceId: source.id,
        dataTypes: source.providedDataTypes,
        connectorTypes,
      });
    }
  });
  
  return result;
}

/**
 * Get all unique inferred data types from selected sources
 */
export function getAllInferredDataTypes(
  selectedSourceIds: string[],
  selectedSubSources: string[]
): string[] {
  const groups = inferDataTypesFromSources(selectedSourceIds, selectedSubSources);
  const allTypes = new Set<string>();
  
  groups.forEach(group => {
    group.dataTypes.forEach(type => allTypes.add(type));
  });
  
  return Array.from(allTypes);
}

/**
 * Get connector types from selected sub-sources
 */
export function getConnectorTypesFromSubSources(
  selectedSourceIds: string[],
  selectedSubSources: string[]
): string[] {
  const connectorTypes = new Set<string>();
  
  selectedSourceIds.forEach(sourceId => {
    const source = dataSourceOptions.find(s => s.id === sourceId);
    if (source?.subSources) {
      source.subSources.forEach(sub => {
        if (selectedSubSources.includes(sub.id)) {
          connectorTypes.add(sub.connectorType);
        }
      });
    } else if (source) {
      source.connectorTypes.forEach(ct => connectorTypes.add(ct));
    }
  });
  
  return Array.from(connectorTypes);
}

/**
 * Check if user selected Excel or Manual source (need additional data type question)
 */
export function needsAdditionalDataTypeQuestion(selectedSourceIds: string[]): boolean {
  return selectedSourceIds.includes('excel') || selectedSourceIds.includes('manual');
}

/**
 * Get data type display name
 */
export function getDataTypeDisplayName(dataTypeId: string): string {
  const option = dataTypeOptions.find(o => o.id === dataTypeId);
  return option?.label || dataTypeId;
}

// ============================================================
// MODULE DATA REQUIREMENTS
// ============================================================

export const fdpRequirements: DataRequirement[] = [
  {
    id: 'fdp_invoices',
    dataType: 'invoices',
    displayName: 'Doanh thu bán hàng (AR)',
    description: 'Đơn hàng/hóa đơn = Tiền khách phải trả (D2C: Order = Invoice)',
    tableName: 'invoices',
    priority: 'critical',
    connectorSources: [
      // === SÀN TMĐT - Order = Invoice (D2C/Retail) ===
      'shopee', 'lazada', 'tiktok_shop', 'sendo', 'shopify',
      // === WEBSITE RIÊNG - Order = Invoice ===
      'haravan', 'sapo', 'woocommerce', 'magento',
      // === PHẦN MỀM KẾ TOÁN - Invoice truyền thống (B2B) ===
      'misa', 'fast_accounting', 'bravo', 'effect', 'sac',
      // === ERP ===
      'sap', 'oracle', 'odoo', 'netsuite',
    ],
    templateId: 'invoices',
    usedFor: ['AR Aging', 'Cash Position', 'DSO Calculation', 'Revenue Tracking'],
  },
  {
    id: 'fdp_bills',
    dataType: 'bills',
    displayName: 'Phí sàn TMĐT (AP)',
    description: 'Commission, phí vận chuyển, phí thanh toán từ sàn',
    tableName: 'bills',
    priority: 'critical',
    connectorSources: [
      // === SÀN TMĐT - Phí sàn = Bill (D2C/Retail) ===
      'shopee', 'lazada', 'tiktok_shop', 'sendo',
      // === PHẦN MỀM KẾ TOÁN - Bill truyền thống (B2B) ===
      'misa', 'fast_accounting', 'bravo', 'effect', 'sac',
      // === ERP ===
      'sap', 'oracle', 'odoo', 'netsuite',
    ],
    templateId: 'bills',
    usedFor: ['AP Aging', 'Cash Forecast', 'DPO Calculation', 'Variable Cost'],
  },
  {
    id: 'fdp_settlements',
    dataType: 'settlements',
    displayName: 'Tiền về từ kênh bán',
    description: 'Cash thực sự về tài khoản (T+14 từ sàn)',
    tableName: 'channel_settlements',
    priority: 'critical',
    connectorSources: ['shopee', 'lazada', 'tiktok_shop', 'haravan', 'sapo'],
    templateId: 'bank_transactions',
    usedFor: ['Cash Position', 'Platform Hold', 'Settlement Reconciliation'],
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
    connectorSources: ['misa', 'fast_accounting', 'sap', 'oracle', 'odoo'],
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
    connectorSources: ['misa', 'fast_accounting', 'sap', 'oracle'],
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
