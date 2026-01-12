import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingDown,
  Package,
  Store,
  DollarSign,
  Users,
  Filter,
  Search,
  Loader2,
  RefreshCw,
  ExternalLink,
  List,
  CheckSquare,
  Zap,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotificationCenter, AlertInstance, categoryLabels } from '@/hooks/useNotificationCenter';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AffectedProductsDialog } from '@/components/alerts/AffectedProductsDialog';
import { AlertDetailsDialog } from '@/components/alerts/AlertDetailsDialog';
import { CreateTaskFromAlertDialog } from '@/components/alerts/CreateTaskFromAlertDialog';
import { AlertAIRecommendationDialog } from '@/components/alerts/AlertAIRecommendationDialog';

const typeConfig = {
  critical: { 
    icon: XCircle, 
    color: 'text-red-400', 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/30',
    label: 'Nghiêm trọng'
  },
  warning: { 
    icon: AlertTriangle, 
    color: 'text-amber-400', 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/30',
    label: 'Cảnh báo'
  },
  info: { 
    icon: Bell, 
    color: 'text-blue-400', 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/30',
    label: 'Thông tin'
  },
};

const categoryIcons: Record<string, React.ElementType> = {
  inventory: Package,
  sales: TrendingDown,
  operations: Store,
  finance: DollarSign,
  hr: Users,
  revenue: DollarSign,
  ar: DollarSign,
  cash_flow: DollarSign,
  product: Package,
  business: DollarSign,
  store: Store,
  cashflow: DollarSign,
  kpi: TrendingDown,
  customer: Users,
  fulfillment: Package,
  other: Bell,
};

function AlertCard({ alert, onAcknowledge, onResolve, onViewDetails, onCreateTask, onAIRecommend }: { 
  alert: AlertInstance; 
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onViewDetails?: (alert: AlertInstance) => void;
  onCreateTask?: (alert: AlertInstance) => void;
  onAIRecommend?: (alert: AlertInstance) => void;
}) {
  const severity = alert.severity as keyof typeof typeConfig;
  const typeConf = typeConfig[severity] || typeConfig.warning;
  const TypeIcon = typeConf.icon;
  const CatIcon = categoryIcons[alert.category] || Bell;

  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: vi });
    } catch {
      return alert.created_at;
    }
  }, [alert.created_at]);

  // Check if this is a summary alert - only if explicitly marked or has total_affected
  const isSummaryAlert = alert.alert_type?.includes('summary') || 
    (alert.metadata as any)?.is_summary === true ||
    alert.object_type === 'summary' ||
    (alert as any).calculation_details?.is_summary === true ||
    ((alert as any).calculation_details?.total_affected && (alert as any).calculation_details.total_affected > 1);

  // Only show affected count if explicitly set in calculation_details.total_affected
  // DO NOT use current_value as it could be a KPI metric (revenue amount, percentage, etc.)
  const affectedCount = (alert as any).calculation_details?.total_affected 
    ? Math.round((alert as any).calculation_details.total_affected)
    : null;

  // Determine object type label based on alert category and type
  const getObjectTypeLabel = () => {
    const category = alert.category?.toLowerCase() || '';
    const alertType = alert.alert_type?.toLowerCase() || '';
    const title = alert.title?.toLowerCase() || '';
    
    // Customer-related
    if (category === 'customer' || alertType.includes('customer') || alertType.includes('churn') || alertType.includes('vip')) {
      return 'khách hàng';
    }
    // Store/Business/KPI-related
    if (category === 'store' || category === 'business' || category === 'kpi' || category === 'revenue' || category === 'sales' ||
        alertType.includes('store') || alertType.includes('staff') || alertType.includes('revenue') || 
        alertType.includes('kpi') || alertType.includes('sales') || alertType.includes('target') ||
        title.includes('doanh số') || title.includes('doanh thu') || title.includes('mục tiêu') || title.includes('cửa hàng')) {
      return 'cửa hàng';
    }
    // Fulfillment/Order-related
    if (category === 'fulfillment' || alertType.includes('fulfillment') || alertType.includes('order') || alertType.includes('delivery')) {
      return 'đơn hàng';
    }
    // Inventory/Product-related
    if (category === 'inventory' || category === 'product' || alertType.includes('stock') || alertType.includes('inventory')) {
      return 'sản phẩm';
    }
    // Finance-related
    if (category === 'finance' || category === 'ar' || category === 'cash_flow' || category === 'cashflow') {
      return 'giao dịch';
    }
    return 'mục';
  };
  const objectTypeLabel = getObjectTypeLabel();

  // Determine the right icon for affected items
  const getAffectedIcon = () => {
    const label = objectTypeLabel;
    if (label === 'cửa hàng') return Store;
    if (label === 'khách hàng') return Users;
    if (label === 'đơn hàng') return Package;
    if (label === 'giao dịch') return DollarSign;
    return Package;
  };
  const AffectedIcon = getAffectedIcon();

  // Impact amount formatting
  const impactAmount = (alert as any).impact_amount || 0;
  const impactDescription = (alert as any).impact_description || '';
  const deadlineAt = (alert as any).deadline_at;
  
  const formatImpact = (amount: number) => {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toLocaleString('vi-VN');
  };

  const deadlineText = useMemo(() => {
    if (!deadlineAt) return null;
    try {
      return formatDistanceToNow(new Date(deadlineAt), { addSuffix: false, locale: vi });
    } catch {
      return null;
    }
  }, [deadlineAt]);

  // Generate detailed action recommendations based on alert type
  const getDetailedRecommendations = useMemo(() => {
    const suggestedAction = alert.suggested_action;
    const alertType = alert.alert_type;
    const currentValue = alert.current_value || 0;
    const thresholdValue = alert.threshold_value || 0;
    
    // Parse specific data from alert
    const metadata = (alert as any).metadata || {};
    const calcDetails = (alert as any).calculation_details || {};
    
    type RecommendationType = {
      primary: { label: string; action: string; impact: string; urgency: 'high' | 'medium' | 'low' };
      alternatives: Array<{ label: string; action: string; tradeoff: string }>;
      metrics: Array<{ label: string; value: string | number }>;
    };
    
    let recommendations: RecommendationType = {
      primary: { label: '', action: '', impact: '', urgency: 'medium' },
      alternatives: [],
      metrics: []
    };

    // DOS/Inventory alerts
    if (alertType?.includes('dos') || alertType?.includes('inventory')) {
      const velocity = calcDetails.sales_velocity || calcDetails.velocity || 0;
      const daysOfStock = calcDetails.days_of_stock ?? currentValue ?? 0;
      const reorderPoint = calcDetails.reorder_point || 7;
      const suggestedQty = Math.ceil(velocity * 14); // 2 weeks stock
      
      recommendations = {
        primary: {
          label: '🚀 Đặt hàng ngay',
          action: `Đặt ${suggestedQty.toLocaleString('vi-VN')} đơn vị (đủ 14 ngày bán)`,
          impact: `Tránh mất ₫${formatImpact(velocity * 200000 * 7)} doanh thu/tuần`,
          urgency: daysOfStock <= 3 ? 'high' : daysOfStock <= 7 ? 'medium' : 'low'
        },
        alternatives: [
          {
            label: '⏱️ Đặt hàng khẩn',
            action: `Đặt ${Math.ceil(velocity * 7).toLocaleString('vi-VN')} đơn vị (đủ 7 ngày)`,
            tradeoff: 'Chi phí vận chuyển cao hơn, nhưng giảm stockout'
          },
          {
            label: '🔄 Điều chuyển nội bộ',
            action: 'Chuyển từ kho khác có tồn dư',
            tradeoff: 'Nhanh hơn đặt hàng, nhưng cần kiểm tra tồn kho các chi nhánh'
          },
          {
            label: '📉 Giảm promotion',
            action: 'Tạm ngưng khuyến mãi cho sản phẩm này',
            tradeoff: 'Giảm doanh số, nhưng kéo dài thời gian tồn kho'
          }
        ],
        metrics: [
          { label: 'Ngày tồn kho', value: `${daysOfStock} ngày` },
          { label: 'Tốc độ bán', value: `${velocity.toFixed(1)}/ngày` },
          { label: 'Điểm đặt lại', value: `${reorderPoint} ngày` }
        ]
      };
    }
    // Revenue/Sales target alerts
    else if (alertType?.includes('revenue') || alertType?.includes('sales') || alertType?.includes('target')) {
      const gap = thresholdValue - currentValue;
      const achievePercent = thresholdValue > 0 ? (currentValue / thresholdValue * 100).toFixed(0) : 0;
      const daysLeft = calcDetails.days_remaining || 15;
      const dailyNeeded = gap / (daysLeft || 1);
      
      recommendations = {
        primary: {
          label: '📈 Tăng doanh số',
          action: `Cần thêm ₫${formatImpact(dailyNeeded)}/ngày để đạt target`,
          impact: `Còn thiếu ₫${formatImpact(gap)} (đạt ${achievePercent}%)`,
          urgency: Number(achievePercent) < 50 ? 'high' : Number(achievePercent) < 80 ? 'medium' : 'low'
        },
        alternatives: [
          {
            label: '🎯 Flash sale tập trung',
            action: 'Tung flash sale 24h cho top 10 sản phẩm bán chạy',
            tradeoff: 'Tăng doanh số nhanh, margin giảm 10-15%'
          },
          {
            label: '📣 Push marketing',
            action: 'Tăng ngân sách quảng cáo 50% trong 7 ngày tới',
            tradeoff: 'Chi phí marketing tăng, ROI cần theo dõi'
          },
          {
            label: '🤝 Outreach khách VIP',
            action: 'Gọi điện/Zalo trực tiếp cho top 50 khách hàng',
            tradeoff: 'Tốn nhân lực, nhưng tỷ lệ chuyển đổi cao'
          }
        ],
        metrics: [
          { label: 'Target', value: `₫${formatImpact(thresholdValue)}` },
          { label: 'Thực tế', value: `₫${formatImpact(currentValue)}` },
          { label: 'Còn thiếu', value: `₫${formatImpact(gap)}` }
        ]
      };
    }
    // Expiry alerts  
    else if (alertType?.includes('expir') || alertType?.includes('het_han')) {
      const expiryDays = calcDetails.days_until_expiry || 7;
      const quantity = calcDetails.quantity || 100;
      
      recommendations = {
        primary: {
          label: '🏷️ Khuyến mãi thanh lý',
          action: `Giảm giá 30-50% cho ${quantity} sản phẩm sắp hết hạn`,
          impact: `Thu hồi vốn thay vì huỷ bỏ hoàn toàn`,
          urgency: expiryDays <= 7 ? 'high' : expiryDays <= 14 ? 'medium' : 'low'
        },
        alternatives: [
          {
            label: '🎁 Quà tặng kèm',
            action: 'Tặng kèm khi mua sản phẩm khác',
            tradeoff: 'Không thu hồi vốn, nhưng tăng giá trị đơn hàng'
          },
          {
            label: '🤝 Bán cho đối tác',
            action: 'Liên hệ đối tác B2B với giá sỉ',
            tradeoff: 'Margin thấp, nhưng thanh lý nhanh số lượng lớn'
          },
          {
            label: '🚫 Huỷ và ghi nhận',
            action: 'Huỷ hàng và ghi nhận chi phí hao hụt',
            tradeoff: 'Mất vốn, nhưng giữ uy tín chất lượng'
          }
        ],
        metrics: [
          { label: 'Còn lại', value: `${expiryDays} ngày` },
          { label: 'Số lượng', value: quantity },
          { label: 'Giá trị', value: `₫${formatImpact(impactAmount)}` }
        ]
      };
    }
    // Cross-domain / Business alerts
    else {
      recommendations = {
        primary: {
          label: '📊 Phân tích chi tiết',
          action: suggestedAction || 'Xem xét dữ liệu và đánh giá tình hình',
          impact: impactDescription || 'Cần đánh giá thêm',
          urgency: severity === 'critical' ? 'high' : 'medium'
        },
        alternatives: [
          {
            label: '👥 Họp team',
            action: 'Tổ chức họp nhanh với các bên liên quan',
            tradeoff: 'Tốn thời gian, nhưng có góc nhìn đa chiều'
          },
          {
            label: '📈 Theo dõi thêm',
            action: 'Đặt reminder theo dõi trong 3 ngày tới',
            tradeoff: 'Chậm hành động, nhưng có thêm dữ liệu'
          }
        ],
        metrics: [
          { label: 'Mức độ', value: severity === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo' },
          { label: 'Impact', value: `₫${formatImpact(impactAmount)}` }
        ]
      };
    }
    
    return recommendations;
  }, [alert, severity, impactAmount, formatImpact]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border ${typeConf.bg} ${typeConf.border} transition-all hover:border-opacity-60`}
    >
      <div className="flex items-start gap-4">
        {/* Impact Amount Badge - Left side */}
        {impactAmount > 0 && (
          <div className="flex flex-col items-center justify-center min-w-[70px] p-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">₫</span>
            <span className={`text-lg font-bold ${severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>
              {formatImpact(impactAmount)}
            </span>
            <span className="text-[10px] text-slate-500">VND</span>
          </div>
        )}
        
        <div className={`p-2 rounded-lg ${typeConf.bg} ${!impactAmount ? '' : 'hidden sm:flex'}`}>
          <TypeIcon className={`h-5 w-5 ${typeConf.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className={`text-xs ${typeConf.bg} ${typeConf.color} border ${typeConf.border}`}>
                  {typeConf.label}
                </Badge>
                {deadlineText && (
                  <Badge className="text-xs bg-slate-700/50 text-slate-300 border-slate-600/30 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {deadlineText}
                  </Badge>
                )}
                <Badge className="text-xs bg-slate-700/50 text-slate-400 border-slate-600/30 flex items-center gap-1">
                  <CatIcon className="h-3 w-3" />
                  {categoryLabels[alert.category as keyof typeof categoryLabels] || alert.category}
                </Badge>
                {isSummaryAlert && (
                  <Badge className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30 flex items-center gap-1">
                    <List className="h-3 w-3" />
                    Tổng hợp
                  </Badge>
                )}
                {(alert as any).metadata?.cross_domain && (
                  <Badge className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                    Cross-domain
                  </Badge>
                )}
              </div>
              <h3 className="text-sm font-medium text-slate-100">{alert.title}</h3>
              {alert.message && (
                <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap line-clamp-3">{alert.message}</p>
              )}
              {/* Impact description */}
              {impactDescription && (
                <p className={`text-xs mt-1 font-medium ${severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>
                  💰 {impactDescription}
                </p>
              )}
              
              {/* Detailed Recommendations Section */}
              {getDetailedRecommendations.primary.label && (
                <div className="mt-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  {/* Primary Recommendation */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-xs font-medium ${
                        getDetailedRecommendations.primary.urgency === 'high' 
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : getDetailedRecommendations.primary.urgency === 'medium'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {getDetailedRecommendations.primary.urgency === 'high' ? '🔴 Khẩn cấp' : 
                         getDetailedRecommendations.primary.urgency === 'medium' ? '🟡 Quan trọng' : '🟢 Bình thường'}
                      </Badge>
                      <span className="text-xs text-slate-400">Phương án đề xuất:</span>
                    </div>
                    <div className="pl-2 border-l-2 border-emerald-500/50">
                      <p className="text-sm font-medium text-emerald-400">{getDetailedRecommendations.primary.label}</p>
                      <p className="text-xs text-slate-300 mt-0.5">{getDetailedRecommendations.primary.action}</p>
                      <p className="text-xs text-slate-500 mt-0.5">📊 {getDetailedRecommendations.primary.impact}</p>
                    </div>
                  </div>
                  
                  {/* Metrics Row */}
                  {getDetailedRecommendations.metrics.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-3 py-2 px-2 bg-slate-900/50 rounded">
                      {getDetailedRecommendations.metrics.map((metric, idx) => (
                        <div key={idx} className="text-xs">
                          <span className="text-slate-500">{metric.label}: </span>
                          <span className="text-slate-200 font-medium">{metric.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Alternative Options */}
                  {getDetailedRecommendations.alternatives.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-2">Các phương án khác:</p>
                      <div className="space-y-2">
                        {getDetailedRecommendations.alternatives.map((alt, idx) => (
                          <div key={idx} className="pl-2 border-l border-slate-600/50 hover:border-slate-500 transition-colors">
                            <p className="text-xs font-medium text-slate-300">{alt.label}</p>
                            <p className="text-xs text-slate-400">{alt.action}</p>
                            <p className="text-xs text-slate-600 italic">⚖️ {alt.tradeoff}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {alert.status === 'active' && (
                <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs">
                  Đang xảy ra
                </Badge>
              )}
              {alert.status === 'acknowledged' && (
                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs">
                  Đã nhận
                </Badge>
              )}
              {alert.status === 'resolved' && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs">
                  Đã xử lý
                </Badge>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-wrap items-center gap-4 mt-3">
            {affectedCount && (
              <div className="flex items-center gap-1 text-xs">
                <AffectedIcon className="h-3 w-3 text-amber-400" />
                <span className="text-amber-400 font-medium">{affectedCount} {objectTypeLabel}</span>
              </div>
            )}
            {!isSummaryAlert && alert.object_name && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Store className="h-3 w-3" />
                {alert.object_name}
              </div>
            )}
            {alert.current_value !== null && !isSummaryAlert && (
              <div className="text-xs">
                <span className="text-slate-500">Giá trị: </span>
                <span className={typeConf.color}>
                  {typeof alert.current_value === 'number' 
                    ? alert.current_value.toLocaleString('vi-VN') 
                    : alert.current_value}
                </span>
              </div>
            )}
            {alert.threshold_value !== null && !isSummaryAlert && (
              <div className="text-xs text-slate-500">
                Ngưỡng: {alert.threshold_value.toLocaleString('vi-VN')}
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </div>
          </div>

          {/* Actions */}
          {alert.status === 'active' && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {isSummaryAlert && onViewDetails ? (
                <>
                  <Button 
                    size="sm" 
                    className="h-7 bg-amber-500 hover:bg-amber-600 text-white text-xs"
                    onClick={() => onViewDetails(alert)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Xem {affectedCount} {objectTypeLabel}
                  </Button>
                  <Button 
                    size="sm" 
                    className="h-7 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                    onClick={() => onResolve(alert.id)}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Xử lý ngay
                  </Button>
                </>
              ) : (
                <Button 
                  size="sm" 
                  className="h-7 bg-amber-500 hover:bg-amber-600 text-white text-xs"
                  onClick={() => onResolve(alert.id)}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Xử lý ngay
                </Button>
              )}
              {onCreateTask && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-7 border-blue-500/50 text-blue-400 hover:bg-blue-500/10 text-xs"
                  onClick={() => onCreateTask(alert)}
                >
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Tạo task
                </Button>
              )}
              {onAIRecommend && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-7 border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-xs"
                  onClick={() => onAIRecommend(alert)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Đề xuất AI
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 border-slate-700 text-slate-300 text-xs"
                onClick={() => onAcknowledge(alert.id)}
              >
                Đánh dấu đã nhận
              </Button>
            </div>
          )}
          {alert.status === 'acknowledged' && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {isSummaryAlert && onViewDetails ? (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-7 border-slate-700 text-slate-300 text-xs"
                  onClick={() => onViewDetails(alert)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Xem danh sách
                </Button>
              ) : null}
              {onCreateTask && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-7 border-blue-500/50 text-blue-400 hover:bg-blue-500/10 text-xs"
                  onClick={() => onCreateTask(alert)}
                >
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Tạo task
                </Button>
              )}
              {onAIRecommend && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-7 border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-xs"
                  onClick={() => onAIRecommend(alert)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Đề xuất AI
                </Button>
              )}
              <Button 
                size="sm" 
                className="h-7 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                onClick={() => onResolve(alert.id)}
              >
                Đánh dấu đã xử lý
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function AlertsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<AlertInstance | null>(null);
  const [showProductsDialog, setShowProductsDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskAlert, setTaskAlert] = useState<AlertInstance | null>(null);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiAlert, setAIAlert] = useState<AlertInstance | null>(null);
  
  const { 
    instances, 
    stats, 
    isLoading, 
    acknowledgeAlert,
    resolveAlert,
    refetchInstances 
  } = useNotificationCenter();

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert.mutateAsync(id);
  };

  const handleResolve = async (id: string) => {
    await resolveAlert.mutateAsync({ id });
  };

  const handleViewDetails = (alert: AlertInstance) => {
    setSelectedAlert(alert);
    setShowProductsDialog(true);
  };

  const handleCreateTask = (alert: AlertInstance) => {
    setTaskAlert(alert);
    setShowTaskDialog(true);
  };

  const handleAIRecommend = (alert: AlertInstance) => {
    setAIAlert(alert);
    setShowAIDialog(true);
  };

  const filteredAlerts = useMemo(() => {
    if (!searchQuery) return instances;
    const query = searchQuery.toLowerCase();
    return instances.filter(a => 
      a.title.toLowerCase().includes(query) ||
      a.message?.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query)
    );
  }, [instances, searchQuery]);

  const activeAlerts = filteredAlerts.filter(a => a.status === 'active');
  const acknowledgedAlerts = filteredAlerts.filter(a => a.status === 'acknowledged');
  const resolvedAlerts = filteredAlerts.filter(a => a.status === 'resolved');

  const criticalCount = stats.bySeverity.critical || 0;
  const warningCount = stats.bySeverity.warning || 0;
  const infoCount = stats.bySeverity.info || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Cảnh báo | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
              Trung tâm cảnh báo
            </h1>
            <p className="text-slate-400 text-sm mt-1">Theo dõi và xử lý các cảnh báo vận hành</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchInstances()}
              className="border-slate-700 text-slate-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            {criticalCount > 0 && (
              <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse">
                {criticalCount} nghiêm trọng
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {warningCount} cảnh báo
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
                <div className="text-xs text-slate-400">Nghiêm trọng</div>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">{warningCount}</div>
                <div className="text-xs text-slate-400">Cảnh báo</div>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">{stats.active + stats.acknowledged}</div>
                <div className="text-xs text-slate-400">Chưa xử lý</div>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-400">{stats.resolved}</div>
                <div className="text-xs text-slate-400">Đã xử lý</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="bg-slate-900/50 border-slate-800/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Tìm kiếm cảnh báo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700/50 text-slate-200"
                />
              </div>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
                <Filter className="h-4 w-4 mr-2" />
                Lọc
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-slate-900/50 border border-slate-800/50">
            <TabsTrigger value="active" className="data-[state=active]:bg-slate-800">
              Đang xảy ra ({activeAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="acknowledged" className="data-[state=active]:bg-slate-800">
              Đã nhận ({acknowledgedAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="data-[state=active]:bg-slate-800">
              Đã xử lý ({resolvedAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-slate-800">
              Tất cả ({filteredAlerts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-3">
            {activeAlerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                <p className="text-slate-400">Không có cảnh báo đang xảy ra</p>
              </div>
            ) : (
              activeAlerts.map(alert => (
                <AlertCard 
                  key={alert.id} 
                  alert={alert} 
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                  onViewDetails={handleViewDetails}
                  onCreateTask={handleCreateTask}
                  onAIRecommend={handleAIRecommend}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="acknowledged" className="mt-4 space-y-3">
            {acknowledgedAlerts.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Không có cảnh báo đã nhận</p>
              </div>
            ) : (
              acknowledgedAlerts.map(alert => (
                <AlertCard 
                  key={alert.id} 
                  alert={alert}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                  onViewDetails={handleViewDetails}
                  onCreateTask={handleCreateTask}
                  onAIRecommend={handleAIRecommend}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="resolved" className="mt-4 space-y-3">
            {resolvedAlerts.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Không có cảnh báo đã xử lý</p>
              </div>
            ) : (
              resolvedAlerts.map(alert => (
                <AlertCard 
                  key={alert.id} 
                  alert={alert}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                  onViewDetails={handleViewDetails}
                  onCreateTask={handleCreateTask}
                  onAIRecommend={handleAIRecommend}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4 space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Không có cảnh báo nào</p>
              </div>
            ) : (
              filteredAlerts.map(alert => (
                <AlertCard 
                  key={alert.id} 
                  alert={alert}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                  onViewDetails={handleViewDetails}
                  onCreateTask={handleCreateTask}
                  onAIRecommend={handleAIRecommend}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Details Dialog - Generic for all alert types */}
      <AlertDetailsDialog
        open={showProductsDialog}
        onOpenChange={setShowProductsDialog}
        alert={selectedAlert}
      />

      {/* Create Task Dialog */}
      <CreateTaskFromAlertDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        alert={taskAlert}
      />

      {/* AI Recommendation Dialog */}
      <AlertAIRecommendationDialog
        open={showAIDialog}
        onOpenChange={setShowAIDialog}
        alert={aiAlert}
      />
    </>
  );
}
