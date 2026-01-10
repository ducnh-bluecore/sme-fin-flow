// Alert System Types

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertCategory = 'product' | 'business' | 'store' | 'cashflow' | 'kpi' | 'customer' | 'fulfillment' | 'operations';
export type AlertObjectType = 'product' | 'order' | 'customer' | 'store' | 'inventory' | 'cashflow' | 'kpi' | 'channel';
export type AlertObjectStatus = 'normal' | 'warning' | 'critical' | 'acknowledged';
export type AlertInstanceStatus = 'active' | 'acknowledged' | 'resolved' | 'snoozed';
export type DataSourceType = 'connector' | 'bigquery' | 'manual' | 'api' | 'webhook';
export type SyncStatus = 'pending' | 'syncing' | 'success' | 'error';

// Category labels in Vietnamese
export const alertCategoryLabels: Record<AlertCategory, string> = {
  product: 'Sản phẩm',
  business: 'Kinh doanh',
  store: 'Chi nhánh',
  cashflow: 'Dòng tiền',
  kpi: 'KPI',
  customer: 'Khách hàng',
  fulfillment: 'Fulfillment',
  operations: 'Vận hành',
};

export const alertSeverityConfig: Record<AlertSeverity, { label: string; color: string; bgColor: string; icon: string }> = {
  critical: { label: 'Nguy cấp', color: 'text-destructive', bgColor: 'bg-destructive/10', icon: '🚨' },
  warning: { label: 'Cảnh báo', color: 'text-warning', bgColor: 'bg-warning/10', icon: '⚠️' },
  info: { label: 'Thông tin', color: 'text-info', bgColor: 'bg-info/10', icon: 'ℹ️' },
};

export const alertObjectTypeLabels: Record<AlertObjectType, string> = {
  product: 'Sản phẩm',
  order: 'Đơn hàng',
  customer: 'Khách hàng',
  store: 'Cửa hàng',
  inventory: 'Tồn kho',
  cashflow: 'Dòng tiền',
  kpi: 'Chỉ số KPI',
  channel: 'Kênh bán',
};

export const alertStatusLabels: Record<AlertInstanceStatus, string> = {
  active: 'Đang hoạt động',
  acknowledged: 'Đã xác nhận',
  resolved: 'Đã xử lý',
  snoozed: 'Tạm ẩn',
};

export const dataSourceTypeLabels: Record<DataSourceType, { label: string; description: string }> = {
  connector: { label: 'Kết nối tích hợp', description: 'Shopee, Lazada, TikTok Shop, Sapo...' },
  bigquery: { label: 'BigQuery', description: 'Google BigQuery Data Warehouse' },
  manual: { label: 'Nhập thủ công', description: 'Nhập dữ liệu trực tiếp' },
  api: { label: 'API', description: 'Kết nối qua REST API' },
  webhook: { label: 'Webhook', description: 'Nhận dữ liệu qua webhook' },
};

export const syncStatusConfig: Record<SyncStatus, { label: string; color: string }> = {
  pending: { label: 'Chờ đồng bộ', color: 'text-muted-foreground' },
  syncing: { label: 'Đang đồng bộ', color: 'text-blue-500' },
  success: { label: 'Thành công', color: 'text-green-500' },
  error: { label: 'Lỗi', color: 'text-destructive' },
};

// Threshold operators
export const thresholdOperators = [
  { value: 'less_than', label: 'Nhỏ hơn (<)' },
  { value: 'less_than_or_equal', label: 'Nhỏ hơn hoặc bằng (≤)' },
  { value: 'greater_than', label: 'Lớn hơn (>)' },
  { value: 'greater_than_or_equal', label: 'Lớn hơn hoặc bằng (≥)' },
  { value: 'equals', label: 'Bằng (=)' },
  { value: 'not_equals', label: 'Khác (≠)' },
  { value: 'change_increase', label: 'Tăng (%)' },
  { value: 'change_decrease', label: 'Giảm (%)' },
];

// Metric units
export const metricUnits = [
  { value: 'count', label: 'Số lượng' },
  { value: 'amount', label: 'Số tiền (VND)' },
  { value: 'percentage', label: 'Phần trăm (%)' },
  { value: 'days', label: 'Ngày' },
  { value: 'hours', label: 'Giờ' },
  { value: 'minutes', label: 'Phút' },
];

// Recipient roles
export const recipientRoles = [
  { value: 'general', label: 'Tất cả' },
  { value: 'manager', label: 'Quản lý' },
  { value: 'store_manager', label: 'Quản lý cửa hàng' },
  { value: 'warehouse_manager', label: 'Quản lý kho' },
  { value: 'finance', label: 'Kế toán / Tài chính' },
  { value: 'operations', label: 'Vận hành' },
  { value: 'sales', label: 'Kinh doanh' },
  { value: 'customer_service', label: 'CSKH' },
];
