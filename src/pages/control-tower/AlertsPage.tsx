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
  Zap
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
import { CreateTaskFromAlertDialog } from '@/components/alerts/CreateTaskFromAlertDialog';

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

function AlertCard({ alert, onAcknowledge, onResolve, onViewDetails, onCreateTask }: { 
  alert: AlertInstance; 
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onViewDetails?: (alert: AlertInstance) => void;
  onCreateTask?: (alert: AlertInstance) => void;
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

  // Check if this is a summary alert
  const isSummaryAlert = alert.alert_type?.includes('summary') || 
    (alert.metadata as any)?.is_summary === true ||
    alert.object_type === 'summary';

  const affectedCount = isSummaryAlert 
    ? ((alert as any).calculation_details?.total_affected || alert.current_value || 0)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border ${typeConf.bg} ${typeConf.border} transition-all hover:border-opacity-60`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${typeConf.bg}`}>
          <TypeIcon className={`h-5 w-5 ${typeConf.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`text-xs ${typeConf.bg} ${typeConf.color} border ${typeConf.border}`}>
                  {typeConf.label}
                </Badge>
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
              </div>
              <h3 className="text-sm font-medium text-slate-100">{alert.title}</h3>
              {alert.message && (
                <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{alert.message}</p>
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
                <Package className="h-3 w-3 text-amber-400" />
                <span className="text-amber-400 font-medium">{affectedCount} items</span>
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
                    Xem {affectedCount} sản phẩm
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
                <div className="text-2xl font-bold text-blue-400">{stats.active}</div>
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
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Products Dialog */}
      {selectedAlert && (
        <AffectedProductsDialog
          open={showProductsDialog}
          onOpenChange={setShowProductsDialog}
          alertType={selectedAlert.alert_type}
          totalCount={(selectedAlert as any).calculation_details?.total_affected || selectedAlert.current_value || 0}
        />
      )}

      {/* Create Task Dialog */}
      <CreateTaskFromAlertDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        alert={taskAlert}
      />
    </>
  );
}
