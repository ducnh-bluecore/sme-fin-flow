/**
 * Default Alert Configurations
 * 
 * 32 pre-configured alert rules for new tenants
 * Used by create-tenant-self and create-tenant-with-owner
 */

export interface DefaultAlertConfig {
  category: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
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
}

export const defaultAlertConfigs: DefaultAlertConfig[] = [
  // Product alerts (4)
  { category: 'product', alert_type: 'inventory_low', severity: 'warning', enabled: true, threshold_value: 10, threshold_unit: 'count', threshold_operator: 'less_than', title: 'Tồn kho thấp', description: 'Cảnh báo khi sản phẩm sắp hết hàng', recipient_role: 'warehouse_manager', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'product', alert_type: 'inventory_expired', severity: 'critical', enabled: true, threshold_value: 30, threshold_unit: 'days', threshold_operator: 'less_than', title: 'Sản phẩm sắp hết hạn', description: 'Cảnh báo sản phẩm sắp hết hạn sử dụng', recipient_role: 'warehouse_manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'product', alert_type: 'product_return_high', severity: 'warning', enabled: true, threshold_value: 5, threshold_unit: 'percentage', threshold_operator: 'greater_than', title: 'Tỷ lệ trả hàng cao', description: 'Cảnh báo khi tỷ lệ trả hàng vượt ngưỡng', recipient_role: 'operations', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'product', alert_type: 'product_slow_moving', severity: 'info', enabled: true, threshold_value: 30, threshold_unit: 'days', threshold_operator: 'greater_than', title: 'Hàng tồn lâu', description: 'Sản phẩm không bán trong thời gian dài', recipient_role: 'sales', notify_email: true, notify_slack: false, notify_push: false, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },

  // Business alerts (4)
  { category: 'business', alert_type: 'sales_target_miss', severity: 'warning', enabled: true, threshold_value: 80, threshold_unit: 'percentage', threshold_operator: 'less_than', title: 'Chưa đạt doanh số mục tiêu', description: 'Cảnh báo khi doanh số dưới mục tiêu', recipient_role: 'manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'business', alert_type: 'sales_drop', severity: 'critical', enabled: true, threshold_value: 20, threshold_unit: 'percentage', threshold_operator: 'greater_than', title: 'Doanh số giảm mạnh', description: 'Doanh số giảm đột ngột so với kỳ trước', recipient_role: 'manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: true, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'business', alert_type: 'margin_low', severity: 'warning', enabled: true, threshold_value: 15, threshold_unit: 'percentage', threshold_operator: 'less_than', title: 'Biên lợi nhuận thấp', description: 'Cảnh báo khi margin dưới ngưỡng', recipient_role: 'finance', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'business', alert_type: 'promotion_ineffective', severity: 'info', enabled: true, threshold_value: 50, threshold_unit: 'percentage', threshold_operator: 'less_than', title: 'Khuyến mãi không hiệu quả', description: 'ROI khuyến mãi dưới mức kỳ vọng', recipient_role: 'sales', notify_email: true, notify_slack: false, notify_push: false, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },

  // Store alerts (4)
  { category: 'store', alert_type: 'store_performance_low', severity: 'warning', enabled: true, threshold_value: 70, threshold_unit: 'percentage', threshold_operator: 'less_than', title: 'Chi nhánh hiệu suất thấp', description: 'Chi nhánh không đạt KPI', recipient_role: 'store_manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'store', alert_type: 'store_no_sales', severity: 'critical', enabled: true, threshold_value: 4, threshold_unit: 'hours', threshold_operator: 'greater_than', title: 'Chi nhánh không có đơn hàng', description: 'Không có giao dịch trong thời gian dài', recipient_role: 'store_manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: true, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'store', alert_type: 'store_high_expense', severity: 'warning', enabled: true, threshold_value: 120, threshold_unit: 'percentage', threshold_operator: 'greater_than', title: 'Chi phí vận hành cao', description: 'Chi phí chi nhánh vượt ngân sách', recipient_role: 'finance', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'store', alert_type: 'store_staff_shortage', severity: 'info', enabled: true, threshold_value: 2, threshold_unit: 'count', threshold_operator: 'less_than', title: 'Thiếu nhân viên', description: 'Số nhân viên dưới mức tối thiểu', recipient_role: 'store_manager', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },

  // Cashflow alerts (4)
  { category: 'cashflow', alert_type: 'cash_critical', severity: 'critical', enabled: true, threshold_value: 100000000, threshold_unit: 'amount', threshold_operator: 'less_than', title: 'Tiền mặt nguy cấp', description: 'Số dư tiền mặt dưới mức tối thiểu', recipient_role: 'finance', notify_email: true, notify_slack: true, notify_push: true, notify_sms: true, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'cashflow', alert_type: 'ar_overdue', severity: 'warning', enabled: true, threshold_value: 30, threshold_unit: 'days', threshold_operator: 'greater_than', title: 'Công nợ quá hạn', description: 'Hóa đơn quá hạn thanh toán', recipient_role: 'finance', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'cashflow', alert_type: 'payment_due', severity: 'info', enabled: true, threshold_value: 3, threshold_unit: 'days', threshold_operator: 'less_than', title: 'Khoản phải trả sắp đến hạn', description: 'Nhắc nhở thanh toán cho nhà cung cấp', recipient_role: 'finance', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'cashflow', alert_type: 'reconciliation_pending', severity: 'warning', enabled: true, threshold_value: 7, threshold_unit: 'days', threshold_operator: 'greater_than', title: 'Đối soát chờ xử lý', description: 'Giao dịch chưa được đối soát', recipient_role: 'finance', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },

  // KPI alerts (4)
  { category: 'kpi', alert_type: 'kpi_warning', severity: 'warning', enabled: true, threshold_value: 85, threshold_unit: 'percentage', threshold_operator: 'less_than', title: 'KPI cảnh báo', description: 'Chỉ số KPI dưới mức mục tiêu', recipient_role: 'manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'kpi', alert_type: 'kpi_critical', severity: 'critical', enabled: true, threshold_value: 70, threshold_unit: 'percentage', threshold_operator: 'less_than', title: 'KPI nguy cấp', description: 'Chỉ số KPI giảm nghiêm trọng', recipient_role: 'manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: true, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'kpi', alert_type: 'kpi_achieved', severity: 'info', enabled: false, threshold_value: 100, threshold_unit: 'percentage', threshold_operator: 'greater_than', title: 'Đạt KPI', description: 'Thông báo khi đạt hoặc vượt KPI', recipient_role: 'general', notify_email: true, notify_slack: false, notify_push: false, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'kpi', alert_type: 'conversion_drop', severity: 'warning', enabled: true, threshold_value: 10, threshold_unit: 'percentage', threshold_operator: 'greater_than', title: 'Tỷ lệ chuyển đổi giảm', description: 'Conversion rate giảm so với kỳ trước', recipient_role: 'sales', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },

  // Customer alerts (4)
  { category: 'customer', alert_type: 'negative_review', severity: 'critical', enabled: true, threshold_value: 3, threshold_unit: 'count', threshold_operator: 'less_than', title: 'Đánh giá tiêu cực', description: 'Khách hàng đánh giá dưới 3 sao', recipient_role: 'operations', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'customer', alert_type: 'complaint', severity: 'warning', enabled: true, threshold_value: null, threshold_unit: null, threshold_operator: null, title: 'Khiếu nại khách hàng', description: 'Có khiếu nại mới cần xử lý', recipient_role: 'operations', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'customer', alert_type: 'vip_order', severity: 'info', enabled: true, threshold_value: 10000000, threshold_unit: 'amount', threshold_operator: 'greater_than', title: 'Đơn hàng VIP', description: 'Đơn hàng lớn từ khách VIP', recipient_role: 'sales', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: false },
  { category: 'customer', alert_type: 'churn_risk', severity: 'warning', enabled: true, threshold_value: 60, threshold_unit: 'days', threshold_operator: 'greater_than', title: 'Rủi ro mất khách', description: 'Khách hàng không mua hàng lâu', recipient_role: 'sales', notify_email: true, notify_slack: false, notify_push: false, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },

  // Fulfillment alerts (4)
  { category: 'fulfillment', alert_type: 'order_delayed', severity: 'critical', enabled: true, threshold_value: 24, threshold_unit: 'hours', threshold_operator: 'greater_than', title: 'Đơn hàng chậm xử lý', description: 'Đơn hàng chưa xử lý quá thời hạn', recipient_role: 'warehouse_manager', notify_email: true, notify_slack: true, notify_push: true, notify_sms: true, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'fulfillment', alert_type: 'delivery_failed', severity: 'critical', enabled: true, threshold_value: null, threshold_unit: null, threshold_operator: null, title: 'Giao hàng thất bại', description: 'Đơn hàng giao không thành công', recipient_role: 'operations', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'fulfillment', alert_type: 'shipping_cost_high', severity: 'warning', enabled: true, threshold_value: 10, threshold_unit: 'percentage', threshold_operator: 'greater_than', title: 'Chi phí vận chuyển cao', description: 'Phí ship vượt tỷ lệ cho phép', recipient_role: 'finance', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'fulfillment', alert_type: 'picking_error', severity: 'info', enabled: true, threshold_value: 2, threshold_unit: 'percentage', threshold_operator: 'greater_than', title: 'Lỗi soạn hàng', description: 'Tỷ lệ soạn sai hàng cao', recipient_role: 'warehouse_manager', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },

  // Operations alerts (4)
  { category: 'operations', alert_type: 'system_error', severity: 'critical', enabled: true, threshold_value: null, threshold_unit: null, threshold_operator: null, title: 'Lỗi hệ thống', description: 'Phát hiện lỗi kỹ thuật nghiêm trọng', recipient_role: 'general', notify_email: true, notify_slack: true, notify_push: true, notify_sms: true, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'operations', alert_type: 'data_quality', severity: 'warning', enabled: true, threshold_value: null, threshold_unit: null, threshold_operator: null, title: 'Chất lượng dữ liệu', description: 'Dữ liệu bất thường cần kiểm tra', recipient_role: 'operations', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: false, notify_in_daily_digest: true },
  { category: 'operations', alert_type: 'sync_failed', severity: 'warning', enabled: true, threshold_value: null, threshold_unit: null, threshold_operator: null, title: 'Đồng bộ thất bại', description: 'Kết nối kênh bán bị gián đoạn', recipient_role: 'operations', notify_email: true, notify_slack: true, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
  { category: 'operations', alert_type: 'scheduled_task_failed', severity: 'warning', enabled: true, threshold_value: null, threshold_unit: null, threshold_operator: null, title: 'Tác vụ định kỳ thất bại', description: 'Báo cáo hoặc tác vụ tự động lỗi', recipient_role: 'operations', notify_email: true, notify_slack: false, notify_push: true, notify_sms: false, notify_immediately: true, notify_in_daily_digest: true },
];

/**
 * Seed default alert configs for a tenant
 * @param serviceClient - Supabase client with service role
 * @param tenantId - The tenant ID to seed configs for
 * @returns Result of the insert operation
 */
export async function seedDefaultAlertConfigs(
  serviceClient: any,
  tenantId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const configsToInsert = defaultAlertConfigs.map(config => ({
      tenant_id: tenantId,
      ...config,
    }));

    const { data, error } = await serviceClient
      .from('extended_alert_configs')
      .insert(configsToInsert)
      .select('id');

    if (error) {
      // If conflict (configs already exist), that's okay
      if (error.code === '23505') {
        console.log(`[seedDefaultAlertConfigs] Configs already exist for tenant ${tenantId}`);
        return { success: true, count: 0 };
      }
      throw error;
    }

    return { success: true, count: data?.length || 0 };
  } catch (err) {
    console.error('[seedDefaultAlertConfigs] Error:', err);
    return { 
      success: false, 
      count: 0, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}
