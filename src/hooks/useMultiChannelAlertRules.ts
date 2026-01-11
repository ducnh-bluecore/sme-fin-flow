/**
 * Hook for seeding and managing multi-channel alert rules
 * Provides default alert rules for retail operations across multiple sales channels
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveTenantId } from './useActiveTenantId';
import type { SalesChannel, AlertGroup } from './useIntelligentAlertRules';

interface AlertRuleTemplate {
  rule_code: string;
  rule_name: string;
  description: string;
  rule_category: string;
  severity: 'critical' | 'warning' | 'info';
  threshold_config: Record<string, any>;
  calculation_formula: string;
  suggested_actions: string[];
  applicable_channels: SalesChannel[];
  alert_group: AlertGroup;
  priority_order: number;
}

// ========== DEFAULT ALERT RULES TEMPLATES ==========

export const defaultAlertRuleTemplates: AlertRuleTemplate[] = [
  // ========== FULFILLMENT & VẬN CHUYỂN ==========
  {
    rule_code: 'ORDER_DELIVERY_DELAYED',
    rule_name: 'Đơn giao chậm',
    description: 'Đơn hàng vượt SLA giao hàng của sàn TMĐT, có nguy cơ bị phạt hoặc ảnh hưởng rating shop',
    rule_category: 'fulfillment',
    severity: 'critical',
    threshold_config: { 
      metric: 'days_over_sla', 
      operator: 'greater_than', 
      critical: 2, 
      warning: 1, 
      unit: 'days',
      metric_label: 'Số ngày vượt SLA giao hàng',
      explanation: 'Số ngày đơn hàng giao trễ so với cam kết SLA của sàn'
    },
    calculation_formula: 'delivery_days - platform_sla_days',
    suggested_actions: ['Liên hệ ĐVVC kiểm tra trạng thái', 'Cân nhắc chuyển đơn vị khác', 'Giao trực tiếp nếu cần'],
    applicable_channels: ['shopee', 'lazada', 'tiktok'],
    alert_group: 'fulfillment',
    priority_order: 1,
  },
  {
    rule_code: 'ORDER_NOT_SHIPPED_24H',
    rule_name: 'Đơn chưa xuất kho',
    description: 'Đơn hàng đã xác nhận nhưng chưa giao cho đơn vị vận chuyển',
    rule_category: 'fulfillment',
    severity: 'critical',
    threshold_config: { 
      metric: 'hours_since_confirmed', 
      operator: 'greater_than', 
      critical: 24, 
      warning: 12, 
      unit: 'hours',
      metric_label: 'Số giờ từ khi xác nhận đơn',
      explanation: 'Thời gian chờ xuất kho kể từ lúc đơn được confirm'
    },
    calculation_formula: 'NOW() - order_confirmed_at',
    suggested_actions: ['Kiểm tra tồn kho và năng lực đóng gói', 'Ưu tiên xử lý ngay'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social'],
    alert_group: 'fulfillment',
    priority_order: 2,
  },
  {
    rule_code: 'RETURN_NOT_COLLECTED',
    rule_name: 'Hàng hoàn chưa lấy về',
    description: 'Đơn hoàn trả nhưng chưa được nhập kho lại',
    rule_category: 'fulfillment',
    severity: 'warning',
    threshold_config: { 
      metric: 'days_since_return', 
      operator: 'greater_than', 
      critical: 5, 
      warning: 3, 
      unit: 'days',
      metric_label: 'Số ngày kể từ khi tạo hoàn',
      explanation: 'Số ngày hàng hoàn chưa được thu hồi về kho'
    },
    calculation_formula: 'NOW() - return_created_at',
    suggested_actions: ['Liên hệ ĐVVC lấy hàng hoàn', 'Kiểm tra trạng thái trên sàn'],
    applicable_channels: ['shopee', 'lazada', 'tiktok'],
    alert_group: 'fulfillment',
    priority_order: 3,
  },
  {
    rule_code: 'ORDER_SURGE_ALERT',
    rule_name: 'Đơn tăng đột biến',
    description: 'Số đơn/giờ vượt năng lực xử lý kho',
    rule_category: 'fulfillment',
    severity: 'warning',
    threshold_config: { 
      metric: 'orders_per_hour_ratio', 
      operator: 'greater_than', 
      critical: 200, 
      warning: 150, 
      unit: 'percent',
      metric_label: '% so với năng lực xử lý',
      explanation: 'Tỷ lệ số đơn hiện tại so với công suất xử lý trung bình của kho'
    },
    calculation_formula: '(current_orders_per_hour / warehouse_capacity_per_hour) * 100',
    suggested_actions: ['Tăng cường nhân sự đóng gói', 'Thông báo team kho chuẩn bị OT', 'Tạm dừng promotion nếu cần'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'fulfillment',
    priority_order: 4,
  },
  {
    rule_code: 'SHIPPING_COST_SPIKE',
    rule_name: 'Chi phí ship tăng bất thường',
    description: 'Chi phí vận chuyển/đơn tăng so với tuần trước',
    rule_category: 'fulfillment',
    severity: 'warning',
    threshold_config: { 
      metric: 'shipping_cost_change', 
      operator: 'greater_than', 
      critical: 30, 
      warning: 20, 
      unit: 'percent',
      metric_label: '% thay đổi chi phí ship',
      explanation: 'Phần trăm tăng chi phí vận chuyển TB/đơn so với tuần trước'
    },
    calculation_formula: '((current_avg - prev_avg) / prev_avg) * 100',
    suggested_actions: ['Kiểm tra cơ cấu ĐVVC', 'Đàm phán lại giá với carrier'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social'],
    alert_group: 'fulfillment',
    priority_order: 5,
  },
  {
    rule_code: 'CARRIER_DELAY_PATTERN',
    rule_name: 'ĐVVC giao chậm liên tục',
    description: 'Một ĐVVC có tỷ lệ giao trễ cao trong tuần',
    rule_category: 'fulfillment',
    severity: 'warning',
    threshold_config: { 
      metric: 'carrier_delay_rate', 
      operator: 'greater_than', 
      critical: 25, 
      warning: 15, 
      unit: 'percent',
      metric_label: '% đơn giao trễ của ĐVVC',
      explanation: 'Tỷ lệ đơn bị ĐVVC giao trễ trong tổng số đơn của ĐVVC đó'
    },
    calculation_formula: '(delayed_orders / total_orders_by_carrier) * 100',
    suggested_actions: ['Giảm tỷ trọng đơn cho ĐVVC này', 'Liên hệ đàm phán SLA'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social'],
    alert_group: 'fulfillment',
    priority_order: 6,
  },
  {
    rule_code: 'COD_NOT_RECEIVED',
    rule_name: 'COD chưa đối soát',
    description: 'Tiền COD chưa nhận sau khi giao thành công',
    rule_category: 'fulfillment',
    severity: 'warning',
    threshold_config: { 
      metric: 'days_since_delivered', 
      operator: 'greater_than', 
      critical: 10, 
      warning: 7, 
      unit: 'days',
      metric_label: 'Số ngày từ khi giao thành công',
      explanation: 'Số ngày đã trôi qua kể từ khi đơn được giao mà chưa nhận tiền COD'
    },
    calculation_formula: 'NOW() - order_delivered_at',
    suggested_actions: ['Liên hệ sàn/ĐVVC kiểm tra', 'Tạo ticket hỗ trợ'],
    applicable_channels: ['shopee', 'lazada', 'tiktok'],
    alert_group: 'fulfillment',
    priority_order: 7,
  },
  {
    rule_code: 'FAILED_DELIVERY_HIGH',
    rule_name: 'Tỷ lệ giao thất bại cao',
    description: 'Tỷ lệ giao thất bại trong ngày cao bất thường',
    rule_category: 'fulfillment',
    severity: 'critical',
    threshold_config: { 
      metric: 'failed_delivery_rate', 
      operator: 'greater_than', 
      critical: 15, 
      warning: 10, 
      unit: 'percent',
      metric_label: '% đơn giao thất bại',
      explanation: 'Tỷ lệ đơn không giao được thành công trong tổng số đơn giao'
    },
    calculation_formula: '(failed_deliveries / total_deliveries) * 100',
    suggested_actions: ['Phân tích nguyên nhân', 'Cải thiện thông tin liên hệ KH', 'Đổi ĐVVC cho vùng có vấn đề'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social'],
    alert_group: 'fulfillment',
    priority_order: 8,
  },

  // ========== TỒN KHO & HÀNG HÓA ==========
  {
    rule_code: 'STOCKOUT_IMMINENT',
    rule_name: 'Sắp hết hàng',
    description: 'Tồn kho thấp hơn số ngày dự trữ an toàn',
    rule_category: 'inventory',
    severity: 'critical',
    threshold_config: { 
      metric: 'days_of_stock', 
      operator: 'less_than', 
      critical: 3, 
      warning: 7, 
      unit: 'days',
      metric_label: 'Số ngày tồn kho còn lại',
      explanation: 'Dựa trên tốc độ bán TB, tồn kho hiện tại đủ bán trong bao nhiêu ngày'
    },
    calculation_formula: 'current_stock / avg_daily_sales',
    suggested_actions: ['Đặt hàng NCC ngay', 'Tạm ẩn sản phẩm nếu không kịp nhập'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'inventory',
    priority_order: 10,
  },
  {
    rule_code: 'INVENTORY_SYNC_MISMATCH',
    rule_name: 'Tồn kho lệch giữa các kênh',
    description: 'Số liệu tồn kho khác nhau giữa sàn và hệ thống',
    rule_category: 'inventory',
    severity: 'critical',
    threshold_config: { 
      metric: 'inventory_difference', 
      operator: 'greater_than', 
      critical: 10, 
      warning: 5, 
      unit: 'items',
      metric_label: 'Số lượng chênh lệch',
      explanation: 'Số lượng sản phẩm chênh lệch giữa hệ thống nội bộ và sàn TMĐT'
    },
    calculation_formula: 'ABS(system_stock - platform_stock)',
    suggested_actions: ['Đồng bộ lại tồn kho ngay', 'Kiểm tra log sync'],
    applicable_channels: ['shopee', 'lazada', 'tiktok'],
    alert_group: 'inventory',
    priority_order: 11,
  },
  {
    rule_code: 'DEAD_STOCK_30_DAYS',
    rule_name: 'Hàng tồn không bán',
    description: 'SKU không có giao dịch trong thời gian dài',
    rule_category: 'inventory',
    severity: 'warning',
    threshold_config: { 
      metric: 'days_without_sale', 
      operator: 'greater_than', 
      critical: 60, 
      warning: 30, 
      unit: 'days',
      metric_label: 'Số ngày không bán được',
      explanation: 'Số ngày liên tiếp SKU này không có đơn hàng nào'
    },
    calculation_formula: 'NOW() - last_sale_date',
    suggested_actions: ['Chạy promotion thanh lý', 'Combo với SP bán chạy', 'Điều chuyển sang kênh khác'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'inventory',
    priority_order: 12,
  },
  {
    rule_code: 'OVERSTOCK_WARNING',
    rule_name: 'Tồn quá mức',
    description: 'Tồn kho vượt quá nhu cầu dự kiến',
    rule_category: 'inventory',
    severity: 'warning',
    threshold_config: { 
      metric: 'days_of_stock', 
      operator: 'greater_than', 
      critical: 120, 
      warning: 90, 
      unit: 'days',
      metric_label: 'Số ngày tồn kho',
      explanation: 'Tồn kho hiện tại đủ bán trong quá nhiều ngày, có nguy cơ ứ vốn'
    },
    calculation_formula: 'current_stock / avg_daily_sales',
    suggested_actions: ['Giảm đơn hàng NCC', 'Tăng promotion', 'Điều chuyển kênh'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'inventory',
    priority_order: 13,
  },
  {
    rule_code: 'EXPIRY_APPROACHING',
    rule_name: 'Hàng gần hết date',
    description: 'Sản phẩm sắp hết hạn sử dụng',
    rule_category: 'inventory',
    severity: 'warning',
    threshold_config: { 
      metric: 'days_to_expiry', 
      operator: 'less_than', 
      critical: 15, 
      warning: 30, 
      unit: 'days',
      metric_label: 'Số ngày còn lại đến HSD',
      explanation: 'Số ngày còn lại trước khi sản phẩm hết hạn sử dụng'
    },
    calculation_formula: 'expiry_date - NOW()',
    suggested_actions: ['Ưu tiên xuất trước (FEFO)', 'Chạy flash sale', 'Donate nếu còn ít'],
    applicable_channels: ['pos', 'website'],
    alert_group: 'inventory',
    priority_order: 14,
  },
  {
    rule_code: 'NEGATIVE_STOCK',
    rule_name: 'Tồn kho âm',
    description: 'Số lượng tồn âm (lỗi dữ liệu)',
    rule_category: 'inventory',
    severity: 'critical',
    threshold_config: { 
      metric: 'stock_quantity', 
      operator: 'less_than', 
      critical: 0, 
      warning: 0, 
      unit: 'items',
      metric_label: 'Số lượng tồn kho',
      explanation: 'Số lượng tồn kho bị âm, cho thấy có lỗi trong dữ liệu hoặc quy trình'
    },
    calculation_formula: 'current_stock',
    suggested_actions: ['Kiểm tra lịch sử giao dịch', 'Điều chỉnh tồn kho', 'Fix nguyên nhân gốc'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'inventory',
    priority_order: 15,
  },
  {
    rule_code: 'REORDER_POINT_HIT',
    rule_name: 'Đến điểm đặt hàng',
    description: 'Tồn kho chạm mức cần đặt NCC',
    rule_category: 'inventory',
    severity: 'info',
    threshold_config: { 
      metric: 'stock_vs_reorder_point', 
      operator: 'less_than_or_equal', 
      critical: -10, 
      warning: 0, 
      unit: 'items',
      metric_label: 'Chênh lệch với điểm đặt hàng',
      explanation: 'Tồn kho - Điểm đặt hàng. Nếu ≤ 0 nghĩa là cần đặt hàng NCC'
    },
    calculation_formula: 'current_stock - reorder_point',
    suggested_actions: ['Tạo PO cho NCC', 'Kiểm tra lead time'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'inventory',
    priority_order: 16,
  },
  {
    rule_code: 'SLOW_MOVING_TO_FAST',
    rule_name: 'Hàng chậm bán đột ngột tăng',
    description: 'SKU slow-moving có tốc độ bán tăng mạnh',
    rule_category: 'inventory',
    severity: 'info',
    threshold_config: { 
      metric: 'velocity_change', 
      operator: 'greater_than', 
      critical: 500, 
      warning: 300, 
      unit: 'percent',
      metric_label: '% thay đổi tốc độ bán',
      explanation: 'Phần trăm tăng tốc độ bán so với giai đoạn trước'
    },
    calculation_formula: '(current_velocity / previous_velocity) * 100',
    suggested_actions: ['Tăng tồn kho cho SP này', 'Phân tích nguyên nhân để nhân rộng'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'inventory',
    priority_order: 17,
  },

  // ========== DOANH THU & BIÊN LỢI NHUẬN ==========
  {
    rule_code: 'REVENUE_DROP_DAILY',
    rule_name: 'Doanh thu ngày giảm mạnh',
    description: 'Doanh thu giảm so với cùng ngày tuần trước',
    rule_category: 'revenue',
    severity: 'critical',
    threshold_config: { 
      metric: 'revenue_change', 
      operator: 'less_than', 
      critical: -50, 
      warning: -30, 
      unit: 'percent',
      metric_label: '% thay đổi doanh thu',
      explanation: 'Phần trăm thay đổi doanh thu hôm nay so với cùng ngày tuần trước'
    },
    calculation_formula: '((today - same_day_last_week) / same_day_last_week) * 100',
    suggested_actions: ['Phân tích traffic và conversion', 'Kiểm tra vấn đề kỹ thuật', 'Tăng promotion'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'revenue',
    priority_order: 20,
  },
  {
    rule_code: 'MARGIN_NEGATIVE',
    rule_name: 'Biên lợi nhuận âm',
    description: 'Sản phẩm hoặc đơn hàng có margin âm',
    rule_category: 'revenue',
    severity: 'critical',
    threshold_config: { 
      metric: 'gross_margin', 
      operator: 'less_than', 
      critical: -5, 
      warning: 0, 
      unit: 'percent',
      metric_label: '% biên lợi nhuận gộp',
      explanation: 'Biên lợi nhuận = (Giá bán - Giá vốn - Phí) / Giá bán × 100'
    },
    calculation_formula: '((selling_price - cost - fees) / selling_price) * 100',
    suggested_actions: ['Điều chỉnh giá bán', 'Giảm chi phí', 'Ngừng bán nếu không cải thiện'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'revenue',
    priority_order: 21,
  },
  {
    rule_code: 'DISCOUNT_ABUSE',
    rule_name: 'Lạm dụng khuyến mãi',
    description: 'Khách dùng quá nhiều mã giảm giá',
    rule_category: 'revenue',
    severity: 'warning',
    threshold_config: { 
      metric: 'voucher_usage_count', 
      operator: 'greater_than', 
      critical: 10, 
      warning: 5, 
      unit: 'times',
      metric_label: 'Số lần sử dụng voucher',
      explanation: 'Số lần một khách hàng đã sử dụng voucher trong kỳ'
    },
    calculation_formula: 'COUNT(voucher_used) GROUP BY customer',
    suggested_actions: ['Block tài khoản khả nghi', 'Điều chỉnh điều kiện voucher'],
    applicable_channels: ['website', 'social'],
    alert_group: 'revenue',
    priority_order: 22,
  },
  {
    rule_code: 'AOV_DROP',
    rule_name: 'Giá trị đơn TB giảm',
    description: 'AOV (Average Order Value) giảm trong tuần',
    rule_category: 'revenue',
    severity: 'warning',
    threshold_config: { 
      metric: 'aov_change', 
      operator: 'less_than', 
      critical: -25, 
      warning: -15, 
      unit: 'percent',
      metric_label: '% thay đổi AOV',
      explanation: 'Phần trăm thay đổi giá trị đơn hàng trung bình so với tuần trước'
    },
    calculation_formula: '((current_aov - prev_aov) / prev_aov) * 100',
    suggested_actions: ['Thiết kế bundle/combo', 'Tăng free shipping threshold', 'Upsell SP bổ sung'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'revenue',
    priority_order: 23,
  },
  {
    rule_code: 'PROMOTION_OVERSPEND',
    rule_name: 'Chi phí KM vượt ngân sách',
    description: 'Chi phí promotion vượt budget kế hoạch',
    rule_category: 'revenue',
    severity: 'warning',
    threshold_config: { 
      metric: 'promotion_budget_usage', 
      operator: 'greater_than', 
      critical: 130, 
      warning: 110, 
      unit: 'percent',
      metric_label: '% sử dụng ngân sách KM',
      explanation: 'Tỷ lệ chi phí khuyến mãi thực tế so với ngân sách đã lập'
    },
    calculation_formula: '(actual_cost / budget) * 100',
    suggested_actions: ['Tạm dừng/giảm khuyến mãi', 'Review hiệu quả campaign'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'revenue',
    priority_order: 24,
  },
  {
    rule_code: 'PLATFORM_FEE_INCREASE',
    rule_name: 'Phí sàn tăng',
    description: 'Phí commission sàn tăng bất thường',
    rule_category: 'revenue',
    severity: 'info',
    threshold_config: { 
      metric: 'platform_fee_change', 
      operator: 'greater_than', 
      critical: 20, 
      warning: 10, 
      unit: 'percent',
      metric_label: '% thay đổi phí sàn',
      explanation: 'Phần trăm tăng phí commission của sàn so với kỳ trước'
    },
    calculation_formula: '((current_fee - prev_fee) / prev_fee) * 100',
    suggested_actions: ['Cập nhật pricing strategy', 'Tính lại margin', 'Cân nhắc tăng giá'],
    applicable_channels: ['shopee', 'lazada', 'tiktok'],
    alert_group: 'revenue',
    priority_order: 25,
  },
  {
    rule_code: 'CHANNEL_REVENUE_IMBALANCE',
    rule_name: 'Doanh thu lệch kênh',
    description: 'Một kênh chiếm tỷ trọng quá cao trong tổng doanh thu',
    rule_category: 'revenue',
    severity: 'warning',
    threshold_config: { 
      metric: 'channel_revenue_share', 
      operator: 'greater_than', 
      critical: 80, 
      warning: 70, 
      unit: 'percent',
      metric_label: '% doanh thu của kênh',
      explanation: 'Tỷ trọng doanh thu của một kênh trong tổng doanh thu'
    },
    calculation_formula: '(channel_revenue / total_revenue) * 100',
    suggested_actions: ['Đầu tư phát triển kênh khác', 'Đa dạng hóa nguồn doanh thu'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'revenue',
    priority_order: 26,
  },
  {
    rule_code: 'CASH_FLOW_WARNING',
    rule_name: 'Dòng tiền căng',
    description: 'Tiền mặt thấp hơn chi phí dự kiến',
    rule_category: 'revenue',
    severity: 'critical',
    threshold_config: { 
      metric: 'cash_coverage_days', 
      operator: 'less_than', 
      critical: 3, 
      warning: 7, 
      unit: 'days',
      metric_label: 'Số ngày tiền mặt đủ cover',
      explanation: 'Tiền mặt hiện có đủ chi trả cho bao nhiêu ngày hoạt động'
    },
    calculation_formula: 'current_cash / avg_daily_expenses',
    suggested_actions: ['Thu hồi công nợ gấp', 'Đàm phán giãn thanh toán NCC', 'Vay ngắn hạn'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'revenue',
    priority_order: 27,
  },

  // ========== CHẤT LƯỢNG DỊCH VỤ ==========
  {
    rule_code: 'NEGATIVE_REVIEW_SPIKE',
    rule_name: 'Đánh giá xấu tăng',
    description: 'Đánh giá 1-2 sao tăng mạnh trong tuần',
    rule_category: 'service',
    severity: 'critical',
    threshold_config: { 
      metric: 'negative_review_change', 
      operator: 'greater_than', 
      critical: 100, 
      warning: 50, 
      unit: 'percent',
      metric_label: '% tăng đánh giá xấu',
      explanation: 'Phần trăm tăng số lượng đánh giá 1-2 sao so với tuần trước'
    },
    calculation_formula: '((this_week - last_week) / last_week) * 100',
    suggested_actions: ['Phân tích nội dung đánh giá', 'Liên hệ KH xin feedback', 'Cải thiện SP/DV'],
    applicable_channels: ['shopee', 'lazada', 'tiktok'],
    alert_group: 'service',
    priority_order: 30,
  },
  {
    rule_code: 'RESPONSE_TIME_SLOW',
    rule_name: 'Phản hồi chat chậm',
    description: 'Thời gian phản hồi TB quá lâu',
    rule_category: 'service',
    severity: 'warning',
    threshold_config: { 
      metric: 'avg_response_minutes', 
      operator: 'greater_than', 
      critical: 30, 
      warning: 15, 
      unit: 'minutes',
      metric_label: 'Phút phản hồi trung bình',
      explanation: 'Thời gian trung bình từ khi nhận tin nhắn đến khi trả lời'
    },
    calculation_formula: 'AVG(first_response_time - message_received_time)',
    suggested_actions: ['Tăng nhân sự CSKH', 'Sử dụng chatbot', 'Set up auto-reply'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'social'],
    alert_group: 'service',
    priority_order: 31,
  },
  {
    rule_code: 'COMPLAINT_PENDING',
    rule_name: 'Khiếu nại chưa xử lý',
    description: 'Ticket mở quá lâu chưa giải quyết',
    rule_category: 'service',
    severity: 'warning',
    threshold_config: { 
      metric: 'hours_since_opened', 
      operator: 'greater_than', 
      critical: 72, 
      warning: 48, 
      unit: 'hours',
      metric_label: 'Số giờ chưa xử lý',
      explanation: 'Số giờ ticket khiếu nại đã mở mà chưa được giải quyết'
    },
    calculation_formula: 'NOW() - ticket_created_at',
    suggested_actions: ['Ưu tiên xử lý ngay', 'Escalate lên cấp cao hơn'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'service',
    priority_order: 32,
  },
  {
    rule_code: 'REFUND_RATE_HIGH',
    rule_name: 'Tỷ lệ hoàn tiền cao',
    description: 'Tỷ lệ refund cao trong tuần',
    rule_category: 'service',
    severity: 'warning',
    threshold_config: { 
      metric: 'refund_rate', 
      operator: 'greater_than', 
      critical: 10, 
      warning: 5, 
      unit: 'percent',
      metric_label: '% đơn hoàn tiền',
      explanation: 'Tỷ lệ đơn hàng bị hoàn tiền trong tổng số đơn'
    },
    calculation_formula: '(refunded_orders / total_orders) * 100',
    suggested_actions: ['Phân tích nguyên nhân', 'Cải thiện mô tả SP', 'Tăng QC trước khi gửi'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'service',
    priority_order: 33,
  },
  {
    rule_code: 'PRODUCT_QUALITY_ISSUE',
    rule_name: 'Lỗi chất lượng sản phẩm',
    description: 'Nhiều khiếu nại cùng 1 SKU về chất lượng',
    rule_category: 'service',
    severity: 'critical',
    threshold_config: { 
      metric: 'quality_complaints_count', 
      operator: 'greater_than', 
      critical: 5, 
      warning: 3, 
      unit: 'complaints',
      metric_label: 'Số khiếu nại chất lượng',
      explanation: 'Số lượng khiếu nại về chất lượng cho cùng một SKU'
    },
    calculation_formula: 'COUNT(complaints) WHERE type = quality GROUP BY sku',
    suggested_actions: ['Tạm dừng bán SP', 'Kiểm tra lô hàng', 'Liên hệ NCC', 'Thu hồi nếu nghiêm trọng'],
    applicable_channels: ['shopee', 'lazada', 'tiktok', 'website', 'social', 'pos'],
    alert_group: 'service',
    priority_order: 34,
  },
  {
    rule_code: 'STORE_RATING_DROP',
    rule_name: 'Điểm shop giảm',
    description: 'Rating shop dưới ngưỡng yêu cầu sàn',
    rule_category: 'service',
    severity: 'critical',
    threshold_config: { 
      metric: 'store_rating', 
      operator: 'less_than', 
      critical: 4.0, 
      warning: 4.5, 
      unit: 'stars',
      metric_label: 'Điểm đánh giá shop',
      explanation: 'Điểm rating trung bình của shop trên sàn (thang 5 sao)'
    },
    calculation_formula: 'current_store_rating',
    suggested_actions: ['Cải thiện các chỉ số ảnh hưởng rating', 'Follow-up KH đánh giá tốt'],
    applicable_channels: ['shopee', 'lazada', 'tiktok'],
    alert_group: 'service',
    priority_order: 35,
  },
  {
    rule_code: 'PENALTY_WARNING',
    rule_name: 'Cảnh báo vi phạm sàn',
    description: 'Shop nhận cảnh cáo/phạt từ sàn',
    rule_category: 'service',
    severity: 'critical',
    threshold_config: { 
      metric: 'active_penalty_count', 
      operator: 'greater_than', 
      critical: 1, 
      warning: 0, 
      unit: 'violations',
      metric_label: 'Số vi phạm đang hoạt động',
      explanation: 'Số lượng cảnh cáo/vi phạm chưa được xóa bỏ'
    },
    calculation_formula: 'COUNT(penalties) WHERE status = active',
    suggested_actions: ['Đọc kỹ nội dung vi phạm', 'Khắc phục ngay', 'Gửi khiếu nại nếu bị oan'],
    applicable_channels: ['shopee', 'lazada', 'tiktok'],
    alert_group: 'service',
    priority_order: 36,
  },

  // ========== ĐẶC THÙ SÀN TMĐT ==========
  {
    rule_code: 'PLATFORM_API_SYNC_FAILED',
    rule_name: 'Lỗi đồng bộ sàn',
    description: 'API kết nối sàn bị lỗi quá lâu',
    rule_category: 'operations',
    severity: 'critical',
    threshold_config: { 
      metric: 'minutes_since_last_sync', 
      operator: 'greater_than', 
      critical: 60, 
      warning: 30, 
      unit: 'minutes',
      metric_label: 'Phút từ lần sync cuối',
      explanation: 'Số phút đã trôi qua kể từ lần đồng bộ thành công cuối cùng'
    },
    calculation_formula: 'NOW() - last_successful_sync',
    suggested_actions: ['Kiểm tra API credentials', 'Retry sync', 'Liên hệ support sàn'],
    applicable_channels: ['shopee', 'lazada', 'tiktok'],
    alert_group: 'operations',
    priority_order: 40,
  },
  {
    rule_code: 'FLASH_SALE_STOCK_LOW',
    rule_name: 'Hết hàng Flash Sale',
    description: 'Tồn kho Flash Sale còn ít',
    rule_category: 'operations',
    severity: 'warning',
    threshold_config: { 
      metric: 'flash_sale_stock_remaining', 
      operator: 'less_than', 
      critical: 5, 
      warning: 10, 
      unit: 'percent',
      metric_label: '% hàng Flash Sale còn lại',
      explanation: 'Phần trăm số lượng Flash Sale còn lại so với ban đầu'
    },
    calculation_formula: '(remaining / initial) * 100',
    suggested_actions: ['Bổ sung stock nếu còn thời gian', 'Chuẩn bị communication'],
    applicable_channels: ['shopee', 'lazada', 'tiktok'],
    alert_group: 'operations',
    priority_order: 41,
  },
  {
    rule_code: 'LISTING_DEACTIVATED',
    rule_name: 'Sản phẩm bị ẩn',
    description: 'SP bị sàn ẩn do vi phạm/hết hàng',
    rule_category: 'operations',
    severity: 'warning',
    threshold_config: { 
      metric: 'deactivated_listings_count', 
      operator: 'greater_than', 
      critical: 5, 
      warning: 1, 
      unit: 'products',
      metric_label: 'Số SP bị ẩn',
      explanation: 'Số lượng sản phẩm bị sàn tự động ẩn đi'
    },
    calculation_formula: 'COUNT(listings) WHERE status = deactivated',
    suggested_actions: ['Kiểm tra nguyên nhân', 'Cập nhật stock hoặc sửa vi phạm'],
    applicable_channels: ['shopee', 'lazada', 'tiktok'],
    alert_group: 'operations',
    priority_order: 42,
  },
  {
    rule_code: 'CAMPAIGN_ENDING_SOON',
    rule_name: 'Campaign sắp kết thúc',
    description: 'Chương trình KM còn ít thời gian',
    rule_category: 'operations',
    severity: 'info',
    threshold_config: { 
      metric: 'hours_to_campaign_end', 
      operator: 'less_than', 
      critical: 6, 
      warning: 24, 
      unit: 'hours',
      metric_label: 'Số giờ còn lại',
      explanation: 'Số giờ còn lại trước khi campaign kết thúc'
    },
    calculation_formula: 'campaign_end_time - NOW()',
    suggested_actions: ['Communication push cuối', 'Review kết quả để plan tiếp'],
    applicable_channels: ['shopee', 'lazada', 'tiktok'],
    alert_group: 'operations',
    priority_order: 43,
  },

  // ========== ĐẶC THÙ WEBSITE/APP ==========
  {
    rule_code: 'CART_ABANDON_HIGH',
    rule_name: 'Bỏ giỏ hàng cao',
    description: 'Tỷ lệ abandon cart cao',
    rule_category: 'operations',
    severity: 'warning',
    threshold_config: { 
      metric: 'cart_abandon_rate', 
      operator: 'greater_than', 
      critical: 85, 
      warning: 75, 
      unit: 'percent',
      metric_label: '% bỏ giỏ hàng',
      explanation: 'Tỷ lệ giỏ hàng được tạo nhưng không checkout'
    },
    calculation_formula: '(abandoned / total_carts) * 100',
    suggested_actions: ['Tối ưu checkout flow', 'Thêm trust signals', 'Set up abandon cart email'],
    applicable_channels: ['website'],
    alert_group: 'operations',
    priority_order: 44,
  },
  {
    rule_code: 'CHECKOUT_FAILURE',
    rule_name: 'Lỗi thanh toán',
    description: 'Tỷ lệ checkout thất bại cao',
    rule_category: 'operations',
    severity: 'critical',
    threshold_config: { 
      metric: 'checkout_failure_rate', 
      operator: 'greater_than', 
      critical: 10, 
      warning: 5, 
      unit: 'percent',
      metric_label: '% checkout thất bại',
      explanation: 'Tỷ lệ lỗi trong quá trình thanh toán'
    },
    calculation_formula: '(failed / total_checkouts) * 100',
    suggested_actions: ['Kiểm tra payment gateway', 'Test các phương thức', 'Liên hệ provider'],
    applicable_channels: ['website'],
    alert_group: 'operations',
    priority_order: 45,
  },
  {
    rule_code: 'TRAFFIC_SPIKE',
    rule_name: 'Traffic đột biến',
    description: 'Lượng truy cập tăng mạnh bất thường',
    rule_category: 'operations',
    severity: 'info',
    threshold_config: { 
      metric: 'traffic_change', 
      operator: 'greater_than', 
      critical: 300, 
      warning: 200, 
      unit: 'percent',
      metric_label: '% tăng traffic',
      explanation: 'Phần trăm tăng lượng truy cập so với trung bình'
    },
    calculation_formula: '(current_hour / avg_hourly) * 100',
    suggested_actions: ['Kiểm tra server capacity', 'Scale up nếu cần', 'Tận dụng cơ hội convert'],
    applicable_channels: ['website'],
    alert_group: 'operations',
    priority_order: 46,
  },
  {
    rule_code: 'PAGE_LOAD_SLOW',
    rule_name: 'Website chậm',
    description: 'Page load quá lâu',
    rule_category: 'operations',
    severity: 'warning',
    threshold_config: { 
      metric: 'page_load_time', 
      operator: 'greater_than', 
      critical: 5, 
      warning: 3, 
      unit: 'seconds',
      metric_label: 'Thời gian tải trang (giây)',
      explanation: 'Thời gian trung bình để tải xong trang'
    },
    calculation_formula: 'AVG(page_load_time)',
    suggested_actions: ['Optimize images', 'Enable caching', 'Check server performance'],
    applicable_channels: ['website'],
    alert_group: 'operations',
    priority_order: 47,
  },

  // ========== ĐẶC THÙ CỬA HÀNG VẬT LÝ ==========
  {
    rule_code: 'STORE_NO_SALES_2H',
    rule_name: 'Cửa hàng không có đơn',
    description: 'Không ghi nhận giao dịch trong thời gian dài',
    rule_category: 'operations',
    severity: 'warning',
    threshold_config: { 
      metric: 'hours_without_sale', 
      operator: 'greater_than', 
      critical: 4, 
      warning: 2, 
      unit: 'hours',
      metric_label: 'Số giờ không có đơn',
      explanation: 'Số giờ liên tiếp cửa hàng không ghi nhận giao dịch POS'
    },
    calculation_formula: 'NOW() - last_pos_transaction_time',
    suggested_actions: ['Kiểm tra POS có hoạt động', 'Liên hệ nhân viên cửa hàng'],
    applicable_channels: ['pos'],
    alert_group: 'operations',
    priority_order: 50,
  },
  {
    rule_code: 'POS_OFFLINE',
    rule_name: 'POS mất kết nối',
    description: 'Thiết bị POS offline quá lâu',
    rule_category: 'operations',
    severity: 'critical',
    threshold_config: { 
      metric: 'minutes_offline', 
      operator: 'greater_than', 
      critical: 30, 
      warning: 15, 
      unit: 'minutes',
      metric_label: 'Phút mất kết nối',
      explanation: 'Số phút thiết bị POS không gửi heartbeat'
    },
    calculation_formula: 'NOW() - last_heartbeat',
    suggested_actions: ['Kiểm tra mạng tại cửa hàng', 'Restart thiết bị', 'Chế độ offline nếu cần'],
    applicable_channels: ['pos'],
    alert_group: 'operations',
    priority_order: 51,
  },
  {
    rule_code: 'CASH_DISCREPANCY',
    rule_name: 'Chênh lệch tiền mặt',
    description: 'Tiền kiểm đếm khác hệ thống',
    rule_category: 'operations',
    severity: 'warning',
    threshold_config: { 
      metric: 'cash_difference_amount', 
      operator: 'greater_than', 
      critical: 500000, 
      warning: 100000, 
      unit: 'VND',
      metric_label: 'Số tiền chênh lệch',
      explanation: 'Giá trị tuyệt đối chênh lệch giữa tiền thực tế và hệ thống'
    },
    calculation_formula: 'ABS(counted_cash - system_cash)',
    suggested_actions: ['Kiểm tra lại giao dịch', 'Đối chiếu hóa đơn', 'Báo cáo nếu chênh lệch lớn'],
    applicable_channels: ['pos'],
    alert_group: 'operations',
    priority_order: 52,
  },
  {
    rule_code: 'STORE_INVENTORY_LOW',
    rule_name: 'Tồn tại điểm thấp',
    description: 'SKU top-seller còn ít tại cửa hàng',
    rule_category: 'inventory',
    severity: 'warning',
    threshold_config: { 
      metric: 'store_stock_count', 
      operator: 'less_than', 
      critical: 2, 
      warning: 5, 
      unit: 'items',
      metric_label: 'Số lượng còn tại cửa hàng',
      explanation: 'Số lượng sản phẩm top-seller còn lại tại điểm bán'
    },
    calculation_formula: 'store_stock WHERE is_top_seller = true',
    suggested_actions: ['Điều chuyển từ kho', 'Đặt hàng bổ sung'],
    applicable_channels: ['pos'],
    alert_group: 'inventory',
    priority_order: 53,
  },

  // ========== ĐẶC THÙ SOCIAL COMMERCE ==========
  {
    rule_code: 'MESSAGE_UNANSWERED',
    rule_name: 'Tin nhắn chưa trả lời',
    description: 'Tin nhắn chưa phản hồi quá lâu',
    rule_category: 'service',
    severity: 'warning',
    threshold_config: { 
      metric: 'minutes_unanswered', 
      operator: 'greater_than', 
      critical: 60, 
      warning: 30, 
      unit: 'minutes',
      metric_label: 'Phút chưa trả lời',
      explanation: 'Số phút tin nhắn khách hàng chưa được phản hồi'
    },
    calculation_formula: 'NOW() - message_received_at',
    suggested_actions: ['Phản hồi ngay', 'Set up auto-reply ngoài giờ'],
    applicable_channels: ['social'],
    alert_group: 'service',
    priority_order: 54,
  },
  {
    rule_code: 'LIVE_SALE_ORDER_SURGE',
    rule_name: 'Đơn live tăng vọt',
    description: 'Đơn từ livestream vượt capacity xử lý',
    rule_category: 'fulfillment',
    severity: 'warning',
    threshold_config: { 
      metric: 'live_orders_per_hour', 
      operator: 'greater_than', 
      critical: 200, 
      warning: 100, 
      unit: 'orders',
      metric_label: 'Số đơn live/giờ',
      explanation: 'Số lượng đơn hàng từ livestream trong 1 giờ'
    },
    calculation_formula: 'COUNT(orders) WHERE source = livestream AND created_at > NOW() - 1 hour',
    suggested_actions: ['Tăng nhân sự nhận đơn', 'Chuẩn bị inventory', 'Thông báo KH về thời gian xử lý'],
    applicable_channels: ['social'],
    alert_group: 'fulfillment',
    priority_order: 55,
  },
  {
    rule_code: 'SOCIAL_MENTION_NEGATIVE',
    rule_name: 'Mention tiêu cực',
    description: 'Phát hiện bài viết/comment tiêu cực',
    rule_category: 'service',
    severity: 'warning',
    threshold_config: { 
      metric: 'negative_mentions_count', 
      operator: 'greater_than', 
      critical: 5, 
      warning: 1, 
      unit: 'mentions',
      metric_label: 'Số mention tiêu cực',
      explanation: 'Số lượng bài viết/comment tiêu cực về thương hiệu'
    },
    calculation_formula: 'COUNT(mentions) WHERE sentiment = negative',
    suggested_actions: ['Phản hồi chuyên nghiệp', 'Xử lý vấn đề KH', 'Escalate nếu viral risk'],
    applicable_channels: ['social'],
    alert_group: 'service',
    priority_order: 56,
  },
];

// ========== HOOKS ==========

export function useSeedAlertRules() {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');

      const rulesToInsert = defaultAlertRuleTemplates.map(template => ({
        tenant_id: tenantId,
        rule_code: template.rule_code,
        rule_name: template.rule_name,
        description: template.description,
        rule_category: template.rule_category,
        severity: template.severity,
        threshold_type: 'fixed',
        threshold_config: template.threshold_config,
        calculation_formula: template.calculation_formula,
        suggested_actions: template.suggested_actions,
        applicable_channels: template.applicable_channels,
        alert_group: template.alert_group,
        priority_order: template.priority_order,
        is_enabled: true,
        priority: template.priority_order,
        cooldown_hours: 4,
      }));

      const { data, error } = await supabase
        .from('intelligent_alert_rules')
        .upsert(rulesToInsert, { 
          onConflict: 'tenant_id,rule_code',
          ignoreDuplicates: false 
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['intelligent-alert-rules'] });
      toast.success(`Đã tạo ${data?.length || 0} quy tắc cảnh báo`);
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

export function useAlertRuleStats() {
  const { data: tenantId } = useActiveTenantId();

  return {
    getStatsByChannel: (rules: any[], channel: SalesChannel) => {
      const filtered = rules.filter(r => 
        r.applicable_channels?.includes(channel) || r.applicable_channels?.length === 0
      );
      return {
        total: filtered.length,
        enabled: filtered.filter(r => r.is_enabled).length,
        critical: filtered.filter(r => r.severity === 'critical' && r.is_enabled).length,
        warning: filtered.filter(r => r.severity === 'warning' && r.is_enabled).length,
      };
    },
    getStatsByGroup: (rules: any[], group: AlertGroup) => {
      const filtered = rules.filter(r => r.alert_group === group);
      return {
        total: filtered.length,
        enabled: filtered.filter(r => r.is_enabled).length,
        critical: filtered.filter(r => r.severity === 'critical' && r.is_enabled).length,
        warning: filtered.filter(r => r.severity === 'warning' && r.is_enabled).length,
      };
    },
  };
}
