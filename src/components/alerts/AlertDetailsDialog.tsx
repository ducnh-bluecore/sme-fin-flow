import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  Search,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  Download,
  Loader2,
  ArrowUpDown,
  Users,
  Store,
  ShoppingCart,
  Clock,
} from 'lucide-react';
import { AlertInstance } from '@/hooks/useNotificationCenter';

interface AlertDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: AlertInstance | null;
}

export function AlertDetailsDialog({
  open,
  onOpenChange,
  alert,
}: AlertDetailsDialogProps) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('days_of_stock');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Determine data type based on alert category
  const dataType = useMemo(() => {
    if (!alert) return 'product';
    const category = alert.category?.toLowerCase() || '';
    const alertType = alert.alert_type?.toLowerCase() || '';
    
    if (category === 'customer' || alertType.includes('customer') || alertType.includes('churn')) {
      return 'customer';
    }
    if (category === 'store' || alertType.includes('store') || alertType.includes('staff')) {
      return 'store';
    }
    if (category === 'fulfillment' || alertType.includes('fulfillment') || alertType.includes('order')) {
      return 'order';
    }
    return 'product';
  }, [alert]);

  // Get status filter for products
  const statusFilter = useMemo(() => {
    if (!alert) return 'critical';
    if (alert.severity === 'critical') return 'critical';
    return 'warning';
  }, [alert]);

  const metricField = alert?.alert_type?.includes('revenue') ? 'revenue_status' : 'dos_status';

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['alert-details-products', tenantId, statusFilter, metricField],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('object_calculated_metrics', '*')
        .eq(metricField, statusFilter)
        .order('days_of_stock', { ascending: true })
        .limit(500);

      if (error) {
        console.error('Error fetching products:', error);
        return [];
      }
      return data || [];
    },
    enabled: open && !!tenantId && isReady && dataType === 'product',
  });

  // Fetch alert objects (for customers, stores, etc.)
  const { data: alertObjects, isLoading: objectsLoading } = useQuery({
    queryKey: ['alert-details-objects', tenantId, alert?.category, alert?.alert_type],
    queryFn: async () => {
      if (!tenantId || !alert) return [];
      
      // Get related alert instances or objects
      const { data, error } = await buildSelectQuery('alert_objects', '*')
        .eq('object_type', dataType)
        .order('updated_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching alert objects:', error);
        return [];
      }
      return data || [];
    },
    enabled: open && !!tenantId && isReady && dataType !== 'product',
  });

  const isLoading = dataType === 'product' ? productsLoading : objectsLoading;
  const items: any[] = (dataType === 'product' ? products : alertObjects) || [];

  // Filter items
  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    let filtered = items;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) =>
        item.object_name?.toLowerCase().includes(query) ||
        item.external_id?.toLowerCase().includes(query) ||
        item.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [items, searchQuery]);

  const handleExportCSV = () => {
    if (!filteredItems.length) return;

    let headers: string[];
    let rows: any[][];

    if (dataType === 'product') {
      headers = ['Mã', 'Tên', 'Tồn kho', 'Ngày tồn', 'Velocity', 'Xu hướng %'];
      rows = filteredItems.map((p: any) => [
        p.external_id || '',
        p.object_name || '',
        Math.round(p.current_stock || 0),
        Math.round(p.days_of_stock || 0),
        (p.sales_velocity || 0).toFixed(2),
        (p.trend_percent || 0).toFixed(1),
      ]);
    } else {
      headers = ['Mã', 'Tên', 'Loại', 'Trạng thái', 'Cập nhật'];
      rows = filteredItems.map((item: any) => [
        item.external_id || '',
        item.object_name || '',
        item.object_type || '',
        item.alert_status || '',
        item.updated_at || '',
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alert-details-${dataType}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTrendIcon = (percent: number | null) => {
    if (percent === null || percent === undefined) return <Minus className="h-4 w-4 text-slate-500" />;
    if (percent > 5) return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    if (percent < -5) return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-slate-500" />;
  };

  const getDataTypeIcon = () => {
    switch (dataType) {
      case 'customer': return Users;
      case 'store': return Store;
      case 'order': return ShoppingCart;
      default: return Package;
    }
  };

  const getDataTypeLabel = () => {
    switch (dataType) {
      case 'customer': return 'khách hàng';
      case 'store': return 'cửa hàng';
      case 'order': return 'đơn hàng';
      default: return 'sản phẩm';
    }
  };

  const DataTypeIcon = getDataTypeIcon();
  const affectedCount = (alert as any)?.calculation_details?.total_affected || alert?.current_value || filteredItems?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <DataTypeIcon className="h-5 w-5 text-amber-400" />
            Chi tiết cảnh báo: {affectedCount} {getDataTypeLabel()}
            <Badge className={alert?.severity === 'critical' 
              ? 'bg-red-500/10 text-red-400 border-red-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }>
              {alert?.severity === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Alert context */}
        {alert && (
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 mb-4">
            <h3 className="text-sm font-medium text-slate-100">{alert.title}</h3>
            {alert.message && (
              <p className="text-xs text-slate-400 mt-1">{alert.message}</p>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder={`Tìm ${getDataTypeLabel()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-slate-200"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-slate-700 text-slate-300"
            disabled={!filteredItems.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Xuất CSV
          </Button>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="text-slate-400">
            Hiển thị <span className="text-slate-200 font-medium">{filteredItems.length}</span> / {items?.length || 0} {getDataTypeLabel()}
          </span>
        </div>

        {/* Table */}
        <ScrollArea className="h-[400px] rounded-md border border-slate-800">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <DataTypeIcon className="h-12 w-12 mb-4 text-slate-600" />
              <p>Không tìm thấy dữ liệu</p>
            </div>
          ) : dataType === 'product' ? (
            <Table>
              <TableHeader className="sticky top-0 bg-slate-900/95 z-10">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 w-[100px]">Mã SP</TableHead>
                  <TableHead className="text-slate-400">Tên sản phẩm</TableHead>
                  <TableHead className="text-slate-400 text-right">Tồn kho</TableHead>
                  <TableHead className="text-slate-400 text-right">Ngày tồn</TableHead>
                  <TableHead className="text-slate-400 text-right">Velocity</TableHead>
                  <TableHead className="text-slate-400 text-right">Xu hướng</TableHead>
                  <TableHead className="text-slate-400 text-center">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((product: any) => (
                  <TableRow key={product.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-mono text-xs text-slate-400">
                      {product.external_id?.slice(0, 10) || '-'}
                    </TableCell>
                    <TableCell className="text-slate-200 max-w-[200px] truncate">
                      {product.object_name}
                    </TableCell>
                    <TableCell className="text-right text-slate-200 font-medium">
                      {Math.round(product.current_stock || 0).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={
                        (product.days_of_stock || 0) <= 3 
                          ? 'text-red-400 font-bold'
                          : (product.days_of_stock || 0) <= 7
                            ? 'text-amber-400 font-medium'
                            : 'text-slate-300'
                      }>
                        {Math.round(product.days_of_stock || 0)} ngày
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {(product.sales_velocity || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {getTrendIcon(product.trend_percent)}
                        <span className={
                          (product.trend_percent || 0) > 5
                            ? 'text-emerald-400'
                            : (product.trend_percent || 0) < -5
                              ? 'text-red-400'
                              : 'text-slate-400'
                        }>
                          {(product.trend_percent || 0).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={
                        (product.days_of_stock || 0) <= 3 
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }>
                        {(product.days_of_stock || 0) <= 3 ? 'Nguy cấp' : 'Cảnh báo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-slate-900/95 z-10">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 w-[100px]">Mã</TableHead>
                  <TableHead className="text-slate-400">Tên</TableHead>
                  <TableHead className="text-slate-400">Loại</TableHead>
                  <TableHead className="text-slate-400">Thông tin</TableHead>
                  <TableHead className="text-slate-400 text-center">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: any) => (
                  <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-mono text-xs text-slate-400">
                      {item.external_id?.slice(0, 10) || '-'}
                    </TableCell>
                    <TableCell className="text-slate-200 max-w-[200px] truncate">
                      {item.object_name}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {item.object_type || item.object_category || '-'}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {item.phone || item.address || item.manager_name || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={
                        item.alert_status === 'critical'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }>
                        {item.alert_status || 'Active'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-slate-300"
          >
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
