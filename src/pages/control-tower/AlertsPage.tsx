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
  Zap,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotificationCenter, AlertInstance, categoryLabels } from '@/hooks/useNotificationCenter';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertDetailsDialog } from '@/components/alerts/AlertDetailsDialog';
import { AssignOwnerDropdown } from '@/components/alerts/AssignOwnerDropdown';
import { useAuth } from '@/hooks/useAuth';

// Sort alerts: critical first, then warning, then info
const severityOrder = { critical: 0, warning: 1, info: 2 };
const sortBySeverity = (alerts: AlertInstance[]) => {
  return [...alerts].sort((a, b) => {
    const orderA = severityOrder[a.severity as keyof typeof severityOrder] ?? 3;
    const orderB = severityOrder[b.severity as keyof typeof severityOrder] ?? 3;
    if (orderA !== orderB) return orderA - orderB;
    // Same severity: sort by created_at desc
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

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

function AlertCard({ alert, onAcknowledge, onResolve, onViewDetails, onAssign, isAssigning }: { 
  alert: AlertInstance; 
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onViewDetails?: (alert: AlertInstance) => void;
  onAssign?: (alertId: string, ownerId: string | null) => void;
  isAssigning?: boolean;
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

          {/* Actions - Simplified per Control Tower Manifesto */}
          {alert.status === 'active' && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Primary: Owner Assignment (Manifesto #5) */}
              {onAssign && (
                <AssignOwnerDropdown
                  alertId={alert.id}
                  currentOwnerId={(alert as any).assigned_to}
                  onAssign={onAssign}
                  isLoading={isAssigning}
                />
              )}
              
              {/* Secondary: Quick actions */}
              {(alert as any).assigned_to ? (
                // If owner assigned, show resolve button prominently
                <Button 
                  size="sm" 
                  className="h-7 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                  onClick={() => onResolve(alert.id)}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Xử lý xong
                </Button>
              ) : (
                // No owner yet - gentle nudge to assign first
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-7 border-slate-700 text-slate-400 text-xs"
                  onClick={() => onAcknowledge(alert.id)}
                >
                  Tạm bỏ qua
                </Button>
              )}
              
              {/* View details for summary alerts */}
              {isSummaryAlert && onViewDetails && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-7 text-slate-400 hover:text-slate-300 text-xs"
                  onClick={() => onViewDetails(alert)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Chi tiết
                </Button>
              )}
            </div>
          )}
          {alert.status === 'acknowledged' && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Owner still needed for acknowledged alerts */}
              {onAssign && (
                <AssignOwnerDropdown
                  alertId={alert.id}
                  currentOwnerId={(alert as any).assigned_to}
                  onAssign={onAssign}
                  isLoading={isAssigning}
                />
              )}
              
              <Button 
                size="sm" 
                className="h-7 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                onClick={() => onResolve(alert.id)}
              >
                <Zap className="h-3 w-3 mr-1" />
                Xử lý xong
              </Button>
              
              {isSummaryAlert && onViewDetails && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-7 text-slate-400 hover:text-slate-300 text-xs"
                  onClick={() => onViewDetails(alert)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Chi tiết
                </Button>
              )}
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
  const { user } = useAuth();
  
  const { 
    instances, 
    stats, 
    isLoading, 
    acknowledgeAlert,
    resolveAlert,
    assignAlert,
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

  // Control Tower Manifesto #5: Owner assignment
  const handleAssign = (alertId: string, ownerId: string | null) => {
    assignAlert.mutate({ id: alertId, assignedTo: ownerId });
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

  // My tasks: alerts assigned to current user
  const myAlerts = useMemo(() => {
    if (!user?.id) return [];
    return sortBySeverity(
      filteredAlerts.filter(a => 
        (a as any).assigned_to === user.id && 
        a.status !== 'resolved'
      )
    );
  }, [filteredAlerts, user?.id]);

  // Sorted alert lists
  const activeAlerts = sortBySeverity(filteredAlerts.filter(a => a.status === 'active'));
  const acknowledgedAlerts = sortBySeverity(filteredAlerts.filter(a => a.status === 'acknowledged'));
  const resolvedAlerts = sortBySeverity(filteredAlerts.filter(a => a.status === 'resolved'));

  const criticalCount = stats.bySeverity.critical || 0;
  const warningCount = stats.bySeverity.warning || 0;
  const myAlertsCount = myAlerts.length;

  // Calculate total impact from active alerts
  const totalImpact = useMemo(() => {
    return activeAlerts.reduce((sum, alert: any) => sum + (alert.impact_amount || 0), 0);
  }, [activeAlerts]);

  const formatImpact = (amount: number) => {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toLocaleString('vi-VN');
  };

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
        <title>Alert Center | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
              Alert Center
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {stats.active > 0 ? `${stats.active} cảnh báo cần xử lý` : 'Không có cảnh báo nào'}
            </p>
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
          </div>
        </div>

        {/* Impact Summary Bar - Manifesto: Show the cost of inaction */}
        {stats.active > 0 && totalImpact > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-xl border-2 ${
              criticalCount > 0 
                ? 'bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-500/30' 
                : 'bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/30'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-6">
                {/* Total Impact */}
                <div className="text-center">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <DollarSign className="h-3 w-3" />
                    Tổng Impact
                  </div>
                  <p className={`text-3xl font-bold ${criticalCount > 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    ₫{formatImpact(totalImpact)}
                  </p>
                </div>

                <div className="h-12 w-px bg-slate-700" />

                {/* Alert Counts */}
                <div className="flex gap-4">
                  {criticalCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
                      <p className="text-xs text-slate-400">Critical</p>
                    </div>
                  )}
                  {warningCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-400">{warningCount}</p>
                      <p className="text-xs text-slate-400">Warning</p>
                    </div>
                  )}
                  {myAlertsCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{myAlertsCount}</p>
                      <p className="text-xs text-slate-400">Việc của tôi</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* No Alerts State */}
        {stats.active === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-slate-900/30 rounded-xl border border-slate-800/50"
          >
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-emerald-400" />
            <h2 className="text-xl font-semibold text-slate-100 mb-2">Hệ thống hoạt động bình thường</h2>
            <p className="text-slate-400 mb-4">Không có cảnh báo nào cần xử lý</p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                {stats.resolved} đã xử lý
              </div>
            </div>
          </motion.div>
        )}
        {/* Stats - Prioritized for action */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* My Tasks - Most important for user */}
          <Card className={`p-4 cursor-pointer transition-all ${myAlertsCount > 0 ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20' : 'bg-slate-900/50 border-slate-800/50'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${myAlertsCount > 0 ? 'bg-primary/20' : 'bg-slate-800/50'}`}>
                <UserCheck className={`h-5 w-5 ${myAlertsCount > 0 ? 'text-primary' : 'text-slate-500'}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${myAlertsCount > 0 ? 'text-primary' : 'text-slate-500'}`}>{myAlertsCount}</div>
                <div className="text-xs text-slate-400">Việc của tôi</div>
              </div>
            </div>
          </Card>
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

        {/* Tabs - "Việc của tôi" first */}
        <Tabs defaultValue={myAlertsCount > 0 ? "my-tasks" : "active"} className="w-full">
          <TabsList className="bg-slate-900/50 border border-slate-800/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger 
              value="my-tasks" 
              className={`data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${myAlertsCount > 0 ? 'animate-pulse' : ''}`}
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Việc của tôi ({myAlertsCount})
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-slate-800">
              Đang xảy ra ({activeAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="acknowledged" className="data-[state=active]:bg-slate-800">
              Đã nhận ({acknowledgedAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="data-[state=active]:bg-slate-800">
              Đã xử lý ({resolvedAlerts.length})
            </TabsTrigger>
          </TabsList>

          {/* My Tasks Tab */}
          <TabsContent value="my-tasks" className="mt-4 space-y-3">
            {myAlerts.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Chưa có việc được giao cho bạn</p>
                <p className="text-xs text-slate-500 mt-1">Các cảnh báo được giao sẽ hiện tại đây</p>
              </div>
            ) : (
              <>
                <div className="text-sm text-slate-400 mb-2">
                  {myAlerts.filter(a => a.severity === 'critical').length > 0 && (
                    <span className="text-red-400 font-medium">
                      ⚠️ {myAlerts.filter(a => a.severity === 'critical').length} việc nghiêm trọng cần xử lý ngay
                    </span>
                  )}
                </div>
                {myAlerts.map(alert => (
                  <AlertCard 
                    key={alert.id} 
                    alert={alert} 
                    onAcknowledge={handleAcknowledge}
                    onResolve={handleResolve}
                    onViewDetails={handleViewDetails}
                    onAssign={handleAssign}
                    isAssigning={assignAlert.isPending}
                  />
                ))}
              </>
            )}
          </TabsContent>

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
                  onAssign={handleAssign}
                  isAssigning={assignAlert.isPending}
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
                  onAssign={handleAssign}
                  isAssigning={assignAlert.isPending}
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
              resolvedAlerts.slice(0, 20).map(alert => (
                <AlertCard 
                  key={alert.id} 
                  alert={alert}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                  onViewDetails={handleViewDetails}
                  onAssign={handleAssign}
                  isAssigning={assignAlert.isPending}
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

    </>
  );
}
