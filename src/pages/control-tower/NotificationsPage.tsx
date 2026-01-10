import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Filter, 
  Search,
  AlertTriangle,
  Info,
  CheckCircle,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Trash2,
  Settings,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { ExtendedAlertConfigDialog } from '@/components/alerts/ExtendedAlertConfigDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useNotificationCenter, AlertInstance, categoryLabels } from '@/hooks/useNotificationCenter';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  alert: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  critical: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  order: { icon: ShoppingCart, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  inventory: { icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  team: { icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  finance: { icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
};

function NotificationItem({ notification, selected, onSelect }: { 
  notification: AlertInstance; 
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const configKey = notification.severity || notification.category || 'info';
  const config = typeConfig[configKey] || typeConfig.info;
  const Icon = config.icon;
  const isRead = notification.status === 'resolved' || notification.status === 'acknowledged';

  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: vi });
    } catch {
      return notification.created_at;
    }
  }, [notification.created_at]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border transition-all cursor-pointer ${
        isRead 
          ? 'bg-slate-900/30 border-slate-800/50' 
          : `${config.bg} ${config.border}`
      } hover:border-slate-600/50`}
    >
      <div className="flex items-start gap-3">
        <Checkbox 
          checked={selected}
          onCheckedChange={() => onSelect(notification.id)}
          className="mt-1"
        />
        <div className={`p-2 rounded-lg ${config.bg}`}>
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-medium ${isRead ? 'text-slate-300' : 'text-slate-100'}`}>
                  {notification.title}
                </h3>
                {!isRead && (
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                )}
              </div>
              {notification.message && (
                <p className="text-sm text-slate-400 mt-1">{notification.message}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-slate-500">{timeAgo}</span>
            <Badge className="text-xs bg-slate-700/50 text-slate-400 border-slate-600/30">
              {categoryLabels[notification.category as keyof typeof categoryLabels] || notification.category}
            </Badge>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function NotificationsPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  
  const { 
    instances, 
    stats,
    isLoading, 
    acknowledgeAlert,
    resolveAlert,
    bulkUpdateAlerts,
    refetchInstances 
  } = useNotificationCenter();

  const unreadCount = stats.active || 0;

  const handleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === instances.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(instances.map(n => n.id));
    }
  };

  const handleMarkAsRead = async () => {
    if (selectedIds.length === 0) return;
    await bulkUpdateAlerts.mutateAsync({
      ids: selectedIds,
      updates: {
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString()
      }
    });
    setSelectedIds([]);
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    await bulkUpdateAlerts.mutateAsync({
      ids: selectedIds,
      updates: {
        status: 'resolved',
        resolved_at: new Date().toISOString()
      }
    });
    setSelectedIds([]);
  };

  const filteredNotifications = useMemo(() => {
    if (!searchQuery) return instances;
    const query = searchQuery.toLowerCase();
    return instances.filter(n =>
      n.title.toLowerCase().includes(query) ||
      n.message?.toLowerCase().includes(query)
    );
  }, [instances, searchQuery]);

  const unreadNotifications = filteredNotifications.filter(n => n.status === 'active');
  const alertNotifications = filteredNotifications.filter(n => 
    n.severity === 'critical' || n.severity === 'warning'
  );

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
        <title>Thông báo | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Bell className="h-6 w-6 text-amber-400" />
              Thông báo
            </h1>
            <p className="text-slate-400 text-sm mt-1">Quản lý tất cả thông báo và cảnh báo</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchInstances()}
              className="border-slate-700 text-slate-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            {unreadCount > 0 && (
              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 h-8 px-3">
                {unreadCount} chưa đọc
              </Badge>
            )}
            <Button 
              onClick={() => setConfigDialogOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900"
            >
              <Settings className="h-4 w-4 mr-2" />
              Cấu hình thông báo
            </Button>
          </div>
        </div>

        {/* Config Dialog */}
        <ExtendedAlertConfigDialog 
          open={configDialogOpen} 
          onOpenChange={setConfigDialogOpen} 
        />

        {/* Search & Actions */}
        <Card className="bg-slate-900/50 border-slate-800/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Tìm kiếm thông báo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700/50 text-slate-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
                  <Filter className="h-4 w-4 mr-2" />
                  Lọc
                </Button>
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-800/50">
                <span className="text-sm text-slate-400">Đã chọn {selectedIds.length}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleMarkAsRead}
                  disabled={bulkUpdateAlerts.isPending}
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Đánh dấu đã đọc
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDelete}
                  disabled={bulkUpdateAlerts.isPending}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-slate-900/50 border border-slate-800/50">
            <TabsTrigger value="all" className="data-[state=active]:bg-slate-800">
              Tất cả ({filteredNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="data-[state=active]:bg-slate-800">
              Chưa đọc ({unreadNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-slate-800">
              Cảnh báo ({alertNotifications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <Card className="bg-slate-900/50 border-slate-800/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={selectedIds.length === instances.length && instances.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-slate-400">Chọn tất cả</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification}
                    selected={selectedIds.includes(notification.id)}
                    onSelect={handleSelect}
                  />
                ))}
                {filteredNotifications.length === 0 && (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Không có thông báo nào</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unread" className="mt-4">
            <Card className="bg-slate-900/50 border-slate-800/50">
              <CardContent className="p-4 space-y-3">
                {unreadNotifications.map((notification) => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification}
                    selected={selectedIds.includes(notification.id)}
                    onSelect={handleSelect}
                  />
                ))}
                {unreadNotifications.length === 0 && (
                  <div className="text-center py-12">
                    <Check className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                    <p className="text-slate-400">Tất cả thông báo đã được đọc</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <Card className="bg-slate-900/50 border-slate-800/50">
              <CardContent className="p-4 space-y-3">
                {alertNotifications.map((notification) => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification}
                    selected={selectedIds.includes(notification.id)}
                    onSelect={handleSelect}
                  />
                ))}
                {alertNotifications.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                    <p className="text-slate-400">Không có cảnh báo nào</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
