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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from 'lucide-react';

interface AffectedProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertType: 'dos_critical' | 'dos_warning' | 'revenue' | string;
  totalCount: number;
}

type SortField = 'days_of_stock' | 'sales_velocity' | 'object_name' | 'trend_percent' | 'current_stock';
type SortOrder = 'asc' | 'desc';

export function AffectedProductsDialog({
  open,
  onOpenChange,
  alertType,
  totalCount,
}: AffectedProductsDialogProps) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('days_of_stock');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Determine status filter based on alert type
  const statusFilter = useMemo(() => {
    if (alertType.includes('dos_critical') || alertType === 'dos_critical') return 'critical';
    if (alertType.includes('dos_warning') || alertType === 'dos_warning') return 'warning';
    if (alertType.includes('revenue')) return 'critical';
    return 'critical';
  }, [alertType]);

  const metricField = alertType.includes('revenue') ? 'revenue_status' : 'dos_status';

  // Fetch affected products from pre-calculated metrics
  const { data: products, isLoading } = useQuery({
    queryKey: ['affected-products', tenantId, statusFilter, metricField],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('object_calculated_metrics', '*')
        .eq(metricField, statusFilter)
        .order('days_of_stock', { ascending: true })
        .limit(1000);

      if (error) {
        console.error('Error fetching affected products:', error);
        return [];
      }

      return (data || []) as unknown as any[];
    },
    enabled: open && !!tenantId && isReady,
  });

  // Get unique object types as categories
  const categories = useMemo(() => {
    if (!products) return [];
    const cats = new Set(products.map(p => p.object_type || 'other'));
    return Array.from(cats).sort();
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let filtered = products;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.object_name?.toLowerCase().includes(query) ||
        p.external_id?.toLowerCase().includes(query)
      );
    }

    // Category filter (using object_type)
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => (p.object_type || 'other') === categoryFilter);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'object_name') {
        aVal = aVal?.toLowerCase() || '';
        bVal = bVal?.toLowerCase() || '';
      }

      if (aVal === null || aVal === undefined) aVal = sortOrder === 'asc' ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortOrder === 'asc' ? Infinity : -Infinity;

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [products, searchQuery, categoryFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleExportCSV = () => {
    if (!filteredProducts.length) return;

    const headers = ['Mã SP', 'Tên sản phẩm', 'Loại', 'Tồn kho hiện tại', 'Ngày tồn kho', 'Velocity/ngày', 'Xu hướng %', 'Trạng thái'];
    const rows = filteredProducts.map(p => [
      p.external_id || '',
      p.object_name || '',
      p.object_type || 'product',
      Math.round(p.current_stock || 0),
      Math.round(p.days_of_stock || 0),
      (p.sales_velocity || 0).toFixed(2),
      (p.trend_percent || 0).toFixed(1),
      p.dos_status || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `affected-products-${statusFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTrendIcon = (percent: number | null) => {
    if (percent === null || percent === undefined) return <Minus className="h-4 w-4 text-slate-500" />;
    if (percent > 5) return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    if (percent < -5) return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-slate-500" />;
  };

  const getStatusBadge = (dos: number | null) => {
    if (dos === null || dos === undefined) return null;
    if (dos <= 3) {
      return <Badge className="bg-red-500/10 text-red-400 border-red-500/30">Nguy cấp</Badge>;
    }
    if (dos <= 7) {
      return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">Cảnh báo</Badge>;
    }
    return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Bình thường</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <Package className="h-5 w-5 text-amber-400" />
            Danh sách {totalCount} sản phẩm cần xử lý
            <Badge className={statusFilter === 'critical' 
              ? 'bg-red-500/10 text-red-400 border-red-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }>
              {statusFilter === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Tìm theo tên hoặc mã sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-slate-200"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-700 text-slate-200">
              <SelectValue placeholder="Loại" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">Tất cả loại</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-slate-700 text-slate-300"
            disabled={!filteredProducts.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Xuất CSV
          </Button>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="text-slate-400">
            Hiển thị <span className="text-slate-200 font-medium">{filteredProducts.length}</span> / {products?.length || 0} sản phẩm
          </span>
          {filteredProducts.length > 0 && (
            <span className="text-slate-400">
              • Trung bình <span className="text-amber-400 font-medium">
                {(filteredProducts.reduce((sum, p) => sum + (p.days_of_stock || 0), 0) / filteredProducts.length).toFixed(1)}
              </span> ngày tồn kho
            </span>
          )}
        </div>

        {/* Table */}
        <ScrollArea className="h-[400px] rounded-md border border-slate-800">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Package className="h-12 w-12 mb-4 text-slate-600" />
              <p>Không tìm thấy sản phẩm</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-slate-900/95 z-10">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 w-[100px]">Mã SP</TableHead>
                  <TableHead 
                    className="text-slate-400 cursor-pointer hover:text-slate-200"
                    onClick={() => handleSort('object_name')}
                  >
                    <div className="flex items-center gap-1">
                      Tên sản phẩm
                      {sortField === 'object_name' && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-slate-400">Danh mục</TableHead>
                  <TableHead 
                    className="text-slate-400 text-right cursor-pointer hover:text-slate-200"
                    onClick={() => handleSort('current_stock')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Tồn kho
                      {sortField === 'current_stock' && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-slate-400 text-right cursor-pointer hover:text-slate-200"
                    onClick={() => handleSort('days_of_stock')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Ngày tồn kho
                      {sortField === 'days_of_stock' && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-slate-400 text-right cursor-pointer hover:text-slate-200"
                    onClick={() => handleSort('sales_velocity')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Velocity/ngày
                      {sortField === 'sales_velocity' && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-slate-400 text-right cursor-pointer hover:text-slate-200"
                    onClick={() => handleSort('trend_percent')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Xu hướng
                      {sortField === 'trend_percent' && (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-slate-400 text-center">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-mono text-xs text-slate-400">
                      {product.external_id?.slice(0, 10) || '-'}
                    </TableCell>
                    <TableCell className="text-slate-200 max-w-[200px] truncate">
                      {product.object_name}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {product.object_type || 'product'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-slate-200 font-medium">
                        {Math.round(product.current_stock || 0).toLocaleString('vi-VN')}
                      </span>
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
                      {getStatusBadge(product.days_of_stock)}
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
