import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FilePlus, 
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Package,
  Database,
  ShoppingCart,
  Globe,
  Check,
  X,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Filter,
  CheckSquare,
  Download,
  Link2,
  FileSpreadsheet,
  Upload,
  Settings,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  useOrders, 
  useAutoApprovalRules, 
  useUpdateAutoApprovalRule, 
  useUpdateOrderStatus,
  useBatchUpdateOrderStatus,
  useAutoApproveBySource,
  useOrderStats,
  Order 
} from '@/hooks/useOrders';
import { useConnectorIntegrations } from '@/hooks/useConnectorIntegrations';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const sourceConfig = {
  erp: { label: 'ERP System', icon: Database, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ecommerce: { label: 'E-Commerce', icon: ShoppingCart, color: 'text-green-500', bg: 'bg-green-500/10' },
  pos: { label: 'POS', icon: Package, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  api: { label: 'API External', icon: Globe, color: 'text-orange-500', bg: 'bg-orange-500/10' },
};

const statusConfig = {
  pending: { label: 'Chờ duyệt', icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  review: { label: 'Cần xem xét', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  approved: { label: 'Đã duyệt', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  rejected: { label: 'Từ chối', icon: X, color: 'text-destructive', bg: 'bg-destructive/10' },
  invoiced: { label: 'Đã xuất HĐ', icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
  error: { label: 'Lỗi', icon: X, color: 'text-destructive', bg: 'bg-destructive/10' },
};

// Auto Approval Settings Dialog
function AutoApprovalSettingsDialog() {
  const { data: rules, isLoading: rulesLoading } = useAutoApprovalRules();
  const { integrations, isLoading: integrationsLoading } = useConnectorIntegrations();
  const updateRule = useUpdateAutoApprovalRule();
  const autoApprove = useAutoApproveBySource();

  const isLoading = rulesLoading || integrationsLoading;

  // Map connector types to source types
  const connectorToSourceMap: Record<string, string> = {
    shopee: 'ecommerce',
    lazada: 'ecommerce',
    tiktok: 'ecommerce',
    woocommerce: 'ecommerce',
    haravan: 'ecommerce',
    sapo: 'pos',
    kiotviet: 'pos',
    misa: 'erp',
    fast: 'erp',
  };

  // Get connected sources from integrations
  const connectedSources = new Set<string>();
  integrations?.forEach(integration => {
    if (integration.status === 'active' || integration.status === 'syncing') {
      const sourceType = connectorToSourceMap[integration.connector_type] || 'api';
      connectedSources.add(sourceType);
    }
  });

  // Filter rules to only show connected sources
  const filteredRules = rules?.filter(rule => connectedSources.has(rule.source)) || [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Cấu hình Auto-Approve
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cấu hình tự động duyệt</DialogTitle>
          <DialogDescription>
            Thiết lập quy tắc tự động phê duyệt đơn hàng từ các nguồn đã kết nối
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Chưa có nguồn nào được kết nối</p>
              <p className="text-xs mt-1">
                Kết nối các nguồn tại{' '}
                <Link to="/connectors" className="text-primary underline">Connectors</Link>
              </p>
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-2">
                Hiển thị {filteredRules.length} nguồn đã kết nối
              </div>
              {filteredRules.map((rule, index) => {
                const source = sourceConfig[rule.source as keyof typeof sourceConfig];
                // Find connected integrations for this source
                const relatedIntegrations = integrations?.filter(i => 
                  (connectorToSourceMap[i.connector_type] || 'api') === rule.source &&
                  (i.status === 'active' || i.status === 'syncing')
                ) || [];

                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {source && <source.icon className={cn("w-5 h-5", source.color)} />}
                      <div>
                        <p className="font-medium">{source?.label || rule.source}</p>
                        <p className="text-xs text-muted-foreground">
                          Max: {formatCurrency(rule.max_amount)} • {relatedIntegrations.length} kết nối
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={rule.is_enabled}
                        onCheckedChange={(checked) => 
                          updateRule.mutate({ source: rule.source, is_enabled: checked, max_amount: rule.max_amount })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => autoApprove.mutate({ source: rule.source, maxAmount: rule.max_amount })}
                        disabled={!rule.is_enabled}
                        title="Tự động duyệt"
                      >
                        <Zap className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InvoiceCreatePage() {
  const [selectedTab, setSelectedTab] = useState('import');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const { data: orders, isLoading, refetch } = useOrders();
  const { stats } = useOrderStats();
  const updateStatus = useUpdateOrderStatus();
  const batchUpdate = useBatchUpdateOrderStatus();

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (order.customer_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesSource = sourceFilter === 'all' || order.source === sourceFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesSource && matchesStatus;
  }) || [];

  const pendingOrders = filteredOrders.filter(o => o.status === 'pending' || o.status === 'review');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(pendingOrders.map(o => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };

  const handleBatchApprove = () => {
    if (selectedOrders.length > 0) {
      batchUpdate.mutate({ orderIds: selectedOrders, status: 'approved' });
      setSelectedOrders([]);
    }
  };

  return (
    <>
      <Helmet>
        <title>Import & View Hóa đơn | Bluecore Finance</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Import & View Hóa đơn
            </h1>
            <p className="text-muted-foreground">
              Nhập và xem hóa đơn từ các nguồn dữ liệu
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
            <AutoApprovalSettingsDialog />
          </div>
        </motion.div>

        {/* Data Source Notice */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Đơn hàng được đồng bộ từ các nguồn tích hợp</p>
                <p className="text-xs text-muted-foreground">
                  Kết nối thêm nguồn tại{' '}
                  <Link to="/connectors" className="text-primary underline">Connectors</Link>
                  {' '}hoặc import file tại{' '}
                  <Link to="/data-integration" className="text-primary underline">Data Integration Hub</Link>
                </p>
              </div>
              <Badge variant="outline" className="text-blue-500 border-blue-500/50">
                {stats?.total || 0} đơn hàng
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">Chờ duyệt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats?.review || 0}</div>
              <p className="text-xs text-muted-foreground">Cần xem xét</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-500">{stats?.approved || 0}</div>
              <p className="text-xs text-muted-foreground">Đã duyệt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{stats?.invoiced || 0}</div>
              <p className="text-xs text-muted-foreground">Đã xuất HĐ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{formatCurrency(stats?.totalAmount || 0)}</div>
              <p className="text-xs text-muted-foreground">Tổng giá trị</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="w-4 h-4" />
              Import & Duyệt
            </TabsTrigger>
            <TabsTrigger value="sources" className="gap-2">
              <Link2 className="w-4 h-4" />
              Nguồn kết nối
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Tìm theo mã đơn hoặc khách hàng..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Nguồn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả nguồn</SelectItem>
                  {Object.entries(sourceConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOrders.length > 0 && (
                <Button onClick={handleBatchApprove} disabled={batchUpdate.isPending}>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Duyệt {selectedOrders.length} đơn
                </Button>
              )}
            </div>

            {/* Orders Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={pendingOrders.length > 0 && selectedOrders.length === pendingOrders.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Mã đơn</TableHead>
                      <TableHead>Nguồn</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead className="text-right">Giá trị</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Đang tải...
                        </TableCell>
                      </TableRow>
                    ) : filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Không có đơn hàng nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.slice(0, 20).map((order) => {
                        const source = sourceConfig[order.source as keyof typeof sourceConfig];
                        const status = statusConfig[order.status as keyof typeof statusConfig];
                        const canSelect = order.status === 'pending' || order.status === 'review';
                        
                        return (
                          <TableRow key={order.id}>
                            <TableCell>
                              {canSelect && (
                                <Checkbox
                                  checked={selectedOrders.includes(order.id)}
                                  onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
                                />
                              )}
                            </TableCell>
                            <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                            <TableCell>
                              <div className={cn("flex items-center gap-2 px-2 py-1 rounded-md w-fit", source?.bg)}>
                                {source && <source.icon className={cn("w-4 h-4", source.color)} />}
                                <span className="text-xs">{source?.label || order.source}</span>
                              </div>
                            </TableCell>
                            <TableCell>{order.customer_name || '-'}</TableCell>
                            <TableCell>{formatDate(order.order_date)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(order.total_amount)}</TableCell>
                            <TableCell>
                              <Badge className={cn(status?.bg, status?.color, "border-0")}>
                                {status?.label || order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Xem chi tiết
                                  </DropdownMenuItem>
                                  {order.status === 'pending' && (
                                    <DropdownMenuItem 
                                      onClick={() => updateStatus.mutate({ orderId: order.id, status: 'approved' })}
                                    >
                                      <Check className="w-4 h-4 mr-2" />
                                      Duyệt
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === 'approved' && (
                                    <DropdownMenuItem
                                      onClick={() => updateStatus.mutate({ orderId: order.id, status: 'invoiced' })}
                                    >
                                      <FileText className="w-4 h-4 mr-2" />
                                      Xuất hóa đơn
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            {filteredOrders.length > 20 && (
              <p className="text-center text-sm text-muted-foreground">
                Hiển thị 20/{filteredOrders.length} đơn hàng
              </p>
            )}
          </TabsContent>

          <TabsContent value="sources">
            <Card>
              <CardHeader>
                <CardTitle>Nguồn đồng bộ đơn hàng</CardTitle>
                <CardDescription>
                  Quản lý kết nối tại <Link to="/connectors" className="text-primary underline">Connectors</Link>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(sourceConfig).map(([key, config]) => {
                    const orderCount = orders?.filter(o => o.source === key).length || 0;
                    const totalValue = orders?.filter(o => o.source === key).reduce((sum, o) => sum + o.total_amount, 0) || 0;
                    
                    return (
                      <Card key={key} className="border-2">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={cn("p-2 rounded-lg", config.bg)}>
                              <config.icon className={cn("w-5 h-5", config.color)} />
                            </div>
                            <div>
                              <h4 className="font-semibold">{config.label}</h4>
                              <Badge variant="outline" className="text-xs">Đã kết nối</Badge>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Đơn hàng</span>
                              <span className="font-medium">{orderCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Giá trị</span>
                              <span className="font-medium">{formatCurrency(totalValue)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Hướng dẫn import thủ công</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Truy cập <Link to="/data-integration" className="text-primary underline">Data Integration Hub</Link></li>
                    <li>Chọn tab "Import File" và upload file Excel/CSV</li>
                    <li>Map các cột dữ liệu với hệ thống</li>
                    <li>Xác nhận và import</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
