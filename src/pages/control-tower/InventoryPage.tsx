import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown,
  Search,
  Filter,
  Download,
  Box,
  Truck,
  BarChart3,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useInventoryData, useInventoryStats } from '@/hooks/useInventoryData';

const statusConfig = {
  normal: { label: 'Bình thường', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  low: { label: 'Sắp hết', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  out: { label: 'Hết hàng', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  overstock: { label: 'Thừa hàng', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
};

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading } = useInventoryData();
  const stats = useInventoryStats();

  const items = data?.items || [];
  const categoryData = data?.categories || [];
  const warehouseData = data?.warehouses || [];

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Tồn kho | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Package className="h-6 w-6 text-amber-400" />
              Quản lý tồn kho
            </h1>
            <p className="text-slate-400 text-sm mt-1">Theo dõi và quản lý hàng hóa tại các kho</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-slate-700 text-slate-300">
              <Download className="h-4 w-4 mr-2" />
              Xuất báo cáo
            </Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white">
              <Truck className="h-4 w-4 mr-2" />
              Nhập hàng
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Box className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                {stats.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-slate-100">{stats.totalSKUs}</div>
                )}
                <div className="text-xs text-slate-400">Tổng SKU</div>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                {stats.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-red-400">{stats.outOfStock}</div>
                )}
                <div className="text-xs text-slate-400">Hết hàng</div>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingDown className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                {stats.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-amber-400">{stats.lowStock}</div>
                )}
                <div className="text-xs text-slate-400">Sắp hết</div>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <BarChart3 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                {stats.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-emerald-400">
                    ₫{(stats.totalValue / 1e9).toFixed(1)}B
                  </div>
                )}
                <div className="text-xs text-slate-400">Giá trị tồn</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardHeader>
              <CardTitle className="text-slate-100">Phân bổ theo danh mục</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : categoryData.length > 0 ? (
                <>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1E293B', 
                            border: '1px solid #334155',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {categoryData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-slate-400">{item.name}</span>
                        <span className="text-sm text-slate-300 ml-auto">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-400">
                  Chưa có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warehouse Capacity */}
          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardHeader>
              <CardTitle className="text-slate-100">Dung lượng kho</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : warehouseData.length > 0 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={warehouseData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#64748B" fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={12} width={60} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1E293B', 
                          border: '1px solid #334155',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="stock" fill="#10B981" radius={[0, 4, 4, 0]} name="Tồn kho" />
                      <Bar dataKey="capacity" fill="#334155" radius={[0, 4, 4, 0]} name="Sức chứa" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-400">
                  Chưa có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Search & Table */}
        <Card className="bg-slate-900/50 border-slate-800/50">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Tìm kiếm sản phẩm..."
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
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">SKU</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Sản phẩm</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Danh mục</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">Số lượng</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-slate-400">Trạng thái</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Kho</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">Giá trị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const status = statusConfig[item.status];
                      const stockPercent = (item.quantity / item.maxStock) * 100;
                      return (
                        <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="py-3 px-4 text-sm text-slate-400 font-mono">{item.sku}</td>
                          <td className="py-3 px-4 text-sm text-slate-200">{item.name}</td>
                          <td className="py-3 px-4 text-sm text-slate-400">{item.category}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-sm text-slate-200">{item.quantity}</span>
                              <Progress value={stockPercent} className="w-16 h-1" />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={`${status.bg} ${status.color} border ${status.border} text-xs`}>
                              {status.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-400">{item.location}</td>
                          <td className="py-3 px-4 text-sm text-slate-300 text-right">
                            {item.value > 0 ? `₫${(item.value / 1e6).toFixed(0)}M` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có dữ liệu tồn kho</p>
                <p className="text-sm mt-1">Thêm sản phẩm vào hệ thống để theo dõi tồn kho</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
