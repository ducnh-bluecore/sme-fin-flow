import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, ShoppingCart, Users, Store, Boxes, 
  TrendingUp, BarChart3, ShoppingBag,
  Search, Filter, Eye, EyeOff, AlertTriangle, CheckCircle,
  Loader2, MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  useAlertObjects, useAlertObjectStats, useUpdateAlertObject, 
  useBulkUpdateAlertObjects, AlertObjectType, AlertObjectStatus 
} from '@/hooks/useAlertObjects';
import { alertObjectTypeLabels, alertSeverityConfig } from '@/types/alerts';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const objectTypeIcons: Record<AlertObjectType, React.ReactNode> = {
  product: <Package className="w-4 h-4" />,
  order: <ShoppingCart className="w-4 h-4" />,
  customer: <Users className="w-4 h-4" />,
  store: <Store className="w-4 h-4" />,
  inventory: <Boxes className="w-4 h-4" />,
  cashflow: <TrendingUp className="w-4 h-4" />,
  kpi: <BarChart3 className="w-4 h-4" />,
  channel: <ShoppingBag className="w-4 h-4" />,
};

const statusColors: Record<AlertObjectStatus, string> = {
  normal: 'bg-green-500/10 text-green-600 border-green-200',
  warning: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  acknowledged: 'bg-blue-500/10 text-blue-600 border-blue-200',
};

export function AlertObjectsPanel() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AlertObjectType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertObjectStatus | 'all'>('all');
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);

  const { data: objects, isLoading } = useAlertObjects({
    object_type: typeFilter !== 'all' ? typeFilter : undefined,
    alert_status: statusFilter !== 'all' ? statusFilter : undefined,
    search: search || undefined,
  });
  const { data: stats } = useAlertObjectStats();
  const updateObject = useUpdateAlertObject();
  const bulkUpdate = useBulkUpdateAlertObjects();

  const handleBulkMonitor = (monitored: boolean) => {
    if (selectedObjects.length === 0) return;
    bulkUpdate.mutate({ ids: selectedObjects, updates: { is_monitored: monitored } });
    setSelectedObjects([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedObjects(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedObjects.length === objects?.length) {
      setSelectedObjects([]);
    } else {
      setSelectedObjects(objects?.map(o => o.id) || []);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Đối tượng giám sát
            </CardTitle>
            <CardDescription>
              Quản lý các đối tượng được theo dõi để phát hiện cảnh báo
            </CardDescription>
          </div>
          {stats && (
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-muted-foreground">Tổng</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{stats.monitored}</div>
                <div className="text-muted-foreground">Đang giám sát</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{stats.byStatus.critical}</div>
                <div className="text-muted-foreground">Nguy cấp</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">{stats.byStatus.warning}</div>
                <div className="text-muted-foreground">Cảnh báo</div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm đối tượng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AlertObjectType | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Loại đối tượng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {Object.entries(alertObjectTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    {objectTypeIcons[key as AlertObjectType]}
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AlertObjectStatus | 'all')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="normal">Bình thường</SelectItem>
              <SelectItem value="warning">Cảnh báo</SelectItem>
              <SelectItem value="critical">Nguy cấp</SelectItem>
              <SelectItem value="acknowledged">Đã xác nhận</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions */}
        {selectedObjects.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
            <span className="text-sm font-medium">
              Đã chọn {selectedObjects.length} đối tượng
            </span>
            <Button variant="outline" size="sm" onClick={() => handleBulkMonitor(true)}>
              <Eye className="w-4 h-4 mr-1" />
              Bật giám sát
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkMonitor(false)}>
              <EyeOff className="w-4 h-4 mr-1" />
              Tắt giám sát
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedObjects([])}>
              Bỏ chọn
            </Button>
          </div>
        )}

        {/* Objects list */}
        <ScrollArea className="h-[500px]">
          {objects?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có đối tượng giám sát</p>
              <p className="text-sm">Đồng bộ từ nguồn dữ liệu để thêm đối tượng</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-center gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                <input
                  type="checkbox"
                  checked={selectedObjects.length === objects?.length && objects?.length > 0}
                  onChange={selectAll}
                  className="rounded"
                />
                <div className="flex-1">Đối tượng</div>
                <div className="w-24 text-center">Trạng thái</div>
                <div className="w-32">Metrics</div>
                <div className="w-24 text-center">Giám sát</div>
                <div className="w-20"></div>
              </div>

              {objects?.map((obj) => (
                <motion.div
                  key={obj.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex items-center gap-4 px-4 py-3 rounded-lg border transition-colors ${
                    selectedObjects.includes(obj.id) ? 'bg-primary/5 border-primary/20' : 'bg-card hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedObjects.includes(obj.id)}
                    onChange={() => toggleSelect(obj.id)}
                    className="rounded"
                  />

                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      {objectTypeIcons[obj.object_type]}
                    </div>
                    <div>
                      <div className="font-medium">{obj.object_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{alertObjectTypeLabels[obj.object_type]}</span>
                        {obj.external_id && (
                          <span className="text-xs bg-muted px-1 rounded">#{obj.external_id.slice(0, 8)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-24 text-center">
                    <Badge variant="outline" className={statusColors[obj.alert_status]}>
                      {obj.alert_status === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {obj.alert_status === 'normal' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {obj.alert_status === 'normal' ? 'Bình thường' :
                       obj.alert_status === 'warning' ? 'Cảnh báo' :
                       obj.alert_status === 'critical' ? 'Nguy cấp' : 'Đã xác nhận'}
                    </Badge>
                  </div>

                  <div className="w-32 text-sm">
                    {Object.entries(obj.current_metrics || {}).slice(0, 2).map(([key, value]) => (
                      <div key={key} className="text-xs text-muted-foreground">
                        {key}: {String(value)}
                      </div>
                    ))}
                  </div>

                  <div className="w-24 text-center">
                    <Switch
                      checked={obj.is_monitored}
                      onCheckedChange={(checked) => updateObject.mutate({ id: obj.id, is_monitored: checked })}
                    />
                  </div>

                  <div className="w-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
                        <DropdownMenuItem>Cấu hình ngưỡng</DropdownMenuItem>
                        <DropdownMenuItem>Xem lịch sử</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
