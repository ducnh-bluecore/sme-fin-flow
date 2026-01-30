/**
 * useExtendedAlertConfigs - Extended alert configurations
 * 
 * @architecture Schema-per-Tenant
 * @domain Control Tower/Alerts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';
import { toast } from 'sonner';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertCategory = 'product' | 'business' | 'store' | 'cashflow' | 'kpi' | 'customer' | 'fulfillment' | 'operations';

export interface ExtendedAlertConfig {
  id: string;
  tenant_id: string;
  category: AlertCategory;
  alert_type: string;
  severity: AlertSeverity;
  enabled: boolean;
  threshold_value: number | null;
  threshold_unit: string | null;
  threshold_operator: string | null;
  title: string;
  description: string | null;
  recipient_role: string;
  notify_email: boolean;
  notify_slack: boolean;
  notify_push: boolean;
  notify_sms: boolean;
  notify_immediately: boolean;
  notify_in_daily_digest: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExtendedAlertConfigInput {
  category: AlertCategory;
  alert_type: string;
  severity: AlertSeverity;
  enabled: boolean;
  threshold_value?: number | null;
  threshold_unit?: string | null;
  threshold_operator?: string | null;
  title: string;
  description?: string | null;
  recipient_role: string;
  notify_email: boolean;
  notify_slack: boolean;
  notify_push: boolean;
  notify_sms: boolean;
  notify_immediately: boolean;
  notify_in_daily_digest: boolean;
}

// Default alert configurations for each category
export const defaultExtendedAlerts: ExtendedAlertConfigInput[] = [
  // Product alerts
  { category: 'product', alert_type: 'inventory_low', severity: 'warning', enabled: true, threshold_value: 10, threshold_unit: 'count', threshold_operator: 'less_than', title: 'Tồn kho thấp', description: 'Cảnh báo khi sản phẩm sắp hết hàng', recipient_role: 'warehouse_manager', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'product', alert_type: 'inventory_expired', severity: 'critical', enabled: true, threshold_value: 30, threshold_unit: 'days', threshold_operator: 'less_than', title: 'Sản phẩm sắp hết hạn', description: 'Cảnh báo sản phẩm sắp hết hạn sử dụng', recipient_role: 'warehouse_manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'product', alert_type: 'product_return_high', severity: 'warning', enabled: true, threshold_value: 5, threshold_unit: 'percentage', threshold_operator: 'greater_than', title: 'Tỷ lệ trả hàng cao', description: 'Cảnh báo khi tỷ lệ trả hàng vượt ngưỡng', recipient_role: 'operations', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'product', alert_type: 'product_slow_moving', severity: 'info', enabled: true, threshold_value: 30, threshold_unit: 'days', threshold_operator: 'greater_than', title: 'Hàng tồn lâu', description: 'Sản phẩm không bán trong thời gian dài', recipient_role: 'sales', notify_email: true, notify_slack: false, notify_push: false, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },

  // Business alerts
  { category: 'business', alert_type: 'sales_target_miss', severity: 'warning', enabled: true, threshold_value: 80, threshold_unit: 'percentage', threshold_operator: 'less_than', title: 'Chưa đạt doanh số mục tiêu', description: 'Cảnh báo khi doanh số dưới mục tiêu', recipient_role: 'manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'business', alert_type: 'sales_drop', severity: 'critical', enabled: true, threshold_value: 20, threshold_unit: 'percentage', threshold_operator: 'greater_than', title: 'Doanh số giảm mạnh', description: 'Doanh số giảm đột ngột so với kỳ trước', recipient_role: 'manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: true, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'business', alert_type: 'margin_low', severity: 'warning', enabled: true, threshold_value: 15, threshold_unit: 'percentage', threshold_operator: 'less_than', title: 'Biên lợi nhuận thấp', description: 'Cảnh báo khi margin dưới ngưỡng', recipient_role: 'finance', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'business', alert_type: 'promotion_ineffective', severity: 'info', enabled: true, threshold_value: 50, threshold_unit: 'percentage', threshold_operator: 'less_than', title: 'Khuyến mãi không hiệu quả', description: 'ROI khuyến mãi dưới mức kỳ vọng', recipient_role: 'sales', notify_email: true, notify_slack: false, notify_push: false, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },

  // Store/Branch alerts
  { category: 'store', alert_type: 'store_performance_low', severity: 'warning', enabled: true, threshold_value: 70, threshold_unit: 'percentage', threshold_operator: 'less_than', title: 'Chi nhánh hiệu suất thấp', description: 'Chi nhánh không đạt KPI', recipient_role: 'store_manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'store', alert_type: 'store_no_sales', severity: 'critical', enabled: true, threshold_value: 4, threshold_unit: 'hours', threshold_operator: 'greater_than', title: 'Chi nhánh không có đơn hàng', description: 'Không có giao dịch trong thời gian dài', recipient_role: 'store_manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: true, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'store', alert_type: 'store_high_expense', severity: 'warning', enabled: true, threshold_value: 120, threshold_unit: 'percentage', threshold_operator: 'greater_than', title: 'Chi phí vận hành cao', description: 'Chi phí chi nhánh vượt ngân sách', recipient_role: 'finance', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'store', alert_type: 'store_staff_shortage', severity: 'info', enabled: true, threshold_value: 2, threshold_unit: 'count', threshold_operator: 'less_than', title: 'Thiếu nhân viên', description: 'Số nhân viên dưới mức tối thiểu', recipient_role: 'store_manager', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },

  // Cashflow alerts
  { category: 'cashflow', alert_type: 'cash_critical', severity: 'critical', enabled: true, threshold_value: 100000000, threshold_unit: 'amount', threshold_operator: 'less_than', title: 'Tiền mặt nguy cấp', description: 'Số dư tiền mặt dưới mức tối thiểu', recipient_role: 'finance', notify_email: true, notify_slack: true, notify_push: true, notify_sms: true, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'cashflow', alert_type: 'ar_overdue', severity: 'warning', enabled: true, threshold_value: 30, threshold_unit: 'days', threshold_operator: 'greater_than', title: 'Công nợ quá hạn', description: 'Hóa đơn quá hạn thanh toán', recipient_role: 'finance', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'cashflow', alert_type: 'payment_due', severity: 'info', enabled: true, threshold_value: 3, threshold_unit: 'days', threshold_operator: 'less_than', title: 'Khoản phải trả sắp đến hạn', description: 'Nhắc nhở thanh toán cho nhà cung cấp', recipient_role: 'finance', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'cashflow', alert_type: 'reconciliation_pending', severity: 'warning', enabled: true, threshold_value: 7, threshold_unit: 'days', threshold_operator: 'greater_than', title: 'Đối soát chờ xử lý', description: 'Giao dịch chưa được đối soát', recipient_role: 'finance', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },

  // KPI alerts
  { category: 'kpi', alert_type: 'kpi_warning', severity: 'warning', enabled: true, threshold_value: 85, threshold_unit: 'percentage', threshold_operator: 'less_than', title: 'KPI cảnh báo', description: 'Chỉ số KPI dưới mức mục tiêu', recipient_role: 'manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'kpi', alert_type: 'kpi_critical', severity: 'critical', enabled: true, threshold_value: 70, threshold_unit: 'percentage', threshold_operator: 'less_than', title: 'KPI nguy cấp', description: 'Chỉ số KPI giảm nghiêm trọng', recipient_role: 'manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: true, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'kpi', alert_type: 'kpi_achieved', severity: 'info', enabled: false, threshold_value: 100, threshold_unit: 'percentage', threshold_operator: 'greater_than', title: 'Đạt KPI', description: 'Thông báo khi đạt hoặc vượt KPI', recipient_role: 'general', notify_email: true, notify_slack: false, notify_push: false, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'kpi', alert_type: 'conversion_drop', severity: 'warning', enabled: true, threshold_value: 10, threshold_unit: 'percentage', threshold_operator: 'greater_than', title: 'Tỷ lệ chuyển đổi giảm', description: 'Conversion rate giảm so với kỳ trước', recipient_role: 'sales', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },

  // Customer alerts
  { category: 'customer', alert_type: 'negative_review', severity: 'critical', enabled: true, threshold_value: 3, threshold_unit: 'count', threshold_operator: 'less_than', title: 'Đánh giá tiêu cực', description: 'Khách hàng đánh giá dưới 3 sao', recipient_role: 'operations', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'customer', alert_type: 'complaint', severity: 'warning', enabled: true, threshold_value: null, threshold_unit: null, threshold_operator: null, title: 'Khiếu nại khách hàng', description: 'Có khiếu nại mới cần xử lý', recipient_role: 'operations', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'customer', alert_type: 'vip_order', severity: 'info', enabled: true, threshold_value: 10000000, threshold_unit: 'amount', threshold_operator: 'greater_than', title: 'Đơn hàng VIP', description: 'Đơn hàng lớn từ khách VIP', recipient_role: 'sales', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: false },
  { category: 'customer', alert_type: 'churn_risk', severity: 'warning', enabled: true, threshold_value: 60, threshold_unit: 'days', threshold_operator: 'greater_than', title: 'Rủi ro mất khách', description: 'Khách hàng không mua hàng lâu', recipient_role: 'sales', notify_email: true, notify_slack: false, notify_push: false, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },

  // Fulfillment alerts
  { category: 'fulfillment', alert_type: 'order_delayed', severity: 'critical', enabled: true, threshold_value: 24, threshold_unit: 'hours', threshold_operator: 'greater_than', title: 'Đơn hàng chậm xử lý', description: 'Đơn hàng chưa xử lý quá thời hạn', recipient_role: 'warehouse_manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: true, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'fulfillment', alert_type: 'delivery_failed', severity: 'critical', enabled: true, threshold_value: null, threshold_unit: null, threshold_operator: null, title: 'Giao hàng thất bại', description: 'Đơn hàng giao không thành công', recipient_role: 'operations', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'fulfillment', alert_type: 'shipping_cost_high', severity: 'warning', enabled: true, threshold_value: 10, threshold_unit: 'percentage', threshold_operator: 'greater_than', title: 'Chi phí vận chuyển cao', description: 'Phí ship vượt tỷ lệ cho phép', recipient_role: 'finance', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'fulfillment', alert_type: 'picking_error', severity: 'info', enabled: true, threshold_value: 2, threshold_unit: 'percentage', threshold_operator: 'greater_than', title: 'Lỗi soạn hàng', description: 'Tỷ lệ soạn sai hàng cao', recipient_role: 'warehouse_manager', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },

  // Operations alerts
  { category: 'operations', alert_type: 'system_error', severity: 'critical', enabled: true, threshold_value: null, threshold_unit: null, threshold_operator: null, title: 'Lỗi hệ thống', description: 'Phát hiện lỗi kỹ thuật nghiêm trọng', recipient_role: 'general', notify_email: true, notify_slack: true, notify_push: true, notify_sms: true, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'operations', alert_type: 'data_quality', severity: 'warning', enabled: true, threshold_value: null, threshold_unit: null, threshold_operator: null, title: 'Chất lượng dữ liệu', description: 'Dữ liệu bất thường cần kiểm tra', recipient_role: 'operations', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'operations', alert_type: 'sync_failed', severity: 'warning', enabled: true, threshold_value: null, threshold_unit: null, threshold_operator: null, title: 'Đồng bộ thất bại', description: 'Kết nối kênh bán bị gián đoạn', recipient_role: 'operations', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'operations', alert_type: 'scheduled_task_failed', severity: 'warning', enabled: true, threshold_value: null, threshold_unit: null, threshold_operator: null, title: 'Tác vụ định kỳ thất bại', description: 'Báo cáo hoặc tác vụ tự động lỗi', recipient_role: 'operations', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
];

export const categoryLabels: Record<AlertCategory, string> = {
  product: 'Sản phẩm',
  business: 'Kinh doanh',
  store: 'Chi nhánh',
  cashflow: 'Dòng tiền',
  kpi: 'KPI',
  customer: 'Khách hàng',
  fulfillment: 'Fulfillment',
  operations: 'Operations',
};

export const severityLabels: Record<AlertSeverity, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Nguy cấp', color: 'text-destructive', bgColor: 'bg-destructive/10' },
  warning: { label: 'Cảnh báo', color: 'text-warning', bgColor: 'bg-warning/10' },
  info: { label: 'Thông thường', color: 'text-info', bgColor: 'bg-info/10' },
};

export const recipientRoleLabels: Record<string, string> = {
  general: 'Tất cả',
  manager: 'Quản lý',
  store_manager: 'Quản lý cửa hàng',
  warehouse_manager: 'Quản lý kho',
  finance: 'Tài chính',
  operations: 'Vận hành',
  sales: 'Kinh doanh',
};

export function useExtendedAlertConfigs() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['extended-alert-configs', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('extended_alert_configs')
        .select('*')
        .order('category', { ascending: true })
        .order('alert_type', { ascending: true });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ExtendedAlertConfig[];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useSaveExtendedAlertConfig() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (config: ExtendedAlertConfigInput & { id?: string }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const dataToSave = {
        tenant_id: tenantId,
        category: config.category,
        alert_type: config.alert_type,
        severity: config.severity,
        enabled: config.enabled,
        threshold_value: config.threshold_value,
        threshold_unit: config.threshold_unit,
        threshold_operator: config.threshold_operator,
        title: config.title,
        description: config.description,
        recipient_role: config.recipient_role,
        notify_email: config.notify_email,
        notify_slack: config.notify_slack,
        notify_push: config.notify_push,
        notify_sms: config.notify_sms,
        notify_immediately: config.notify_immediately,
        notify_in_daily_digest: config.notify_in_daily_digest,
      };

      const { data, error } = await client
        .from('extended_alert_configs')
        .upsert(dataToSave, { onConflict: 'tenant_id,category,alert_type' })
        .select()
        .single();

      if (error) throw error;

      // Trigger alert detection immediately after config change
      if (config.enabled && config.notify_immediately) {
        try {
          // Run detect-alerts to create alert_instances based on new config
          await client.functions.invoke('detect-alerts', {
            body: { tenant_id: tenantId, use_precalculated: true },
          });

          // Run process-alert-notifications to create actual notifications
          await client.functions.invoke('process-alert-notifications', {
            body: { tenant_id: tenantId },
          });

          console.log('Alert detection and notification processing triggered');
        } catch (triggerError) {
          console.warn('Failed to trigger alert processing:', triggerError);
          // Don't fail the save operation if triggering fails
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extended-alert-configs'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['alert-instances'] });
      toast.success('Đã lưu cấu hình cảnh báo');
    },
    onError: (error) => {
      console.error('Error saving alert config:', error);
      toast.error('Lỗi khi lưu cấu hình: ' + error.message);
    },
  });
}

export function useInitializeDefaultAlerts() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      const dataToInsert = defaultExtendedAlerts.map(alert => ({
        tenant_id: tenantId,
        ...alert,
      }));

      const { error } = await client
        .from('extended_alert_configs')
        .upsert(dataToInsert, { onConflict: 'tenant_id,category,alert_type' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extended-alert-configs'] });
      toast.success('Đã khởi tạo cấu hình mặc định');
    },
    onError: (error) => {
      console.error('Error initializing alerts:', error);
      toast.error('Lỗi khi khởi tạo: ' + error.message);
    },
  });
}

export function useBulkUpdateAlertConfigs() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (configs: ExtendedAlertConfigInput[]) => {
      if (!tenantId) throw new Error('No tenant selected');

      const dataToSave = configs.map(config => ({
        tenant_id: tenantId,
        ...config,
      }));

      const { error } = await client
        .from('extended_alert_configs')
        .upsert(dataToSave, { onConflict: 'tenant_id,category,alert_type' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extended-alert-configs'] });
      toast.success('Đã lưu tất cả cấu hình');
    },
    onError: (error) => {
      console.error('Error bulk updating alerts:', error);
      toast.error('Lỗi khi lưu: ' + error.message);
    },
  });
}
