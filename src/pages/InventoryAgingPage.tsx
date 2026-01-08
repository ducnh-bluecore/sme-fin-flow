import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, TrendingDown, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useInventoryAging } from '@/hooks/useInventoryAging';
import { formatCurrency } from '@/lib/formatters';
import { LoadingState, EmptyState } from '@/components/shared';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

export default function InventoryAgingPage() {
  const { items, agingBuckets, summary, isLoading, error } = useInventoryAging();

  if (isLoading) return <LoadingState variant="page" />;

  const pieData = agingBuckets.map((bucket, index) => ({
    name: bucket.bucket,
    value: bucket.totalValue,
    color: COLORS[index],
  }));

  const barData = agingBuckets.map(bucket => ({
    name: bucket.bucket,
    quantity: bucket.totalQuantity,
    value: bucket.totalValue / 1000000,
  }));

  return (
    <>
      <Helmet>
        <title>Phân tích tuổi tồn kho | Bluecore Finance</title>
      </Helmet>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Phân tích tuổi tồn kho</h1>
            <p className="text-muted-foreground">Inventory Aging Analysis</p>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Tổng SKU</p>
                  <p className="text-2xl font-bold">{summary.totalItems.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Tổng giá trị</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Tuổi TB</p>
                  <p className="text-2xl font-bold">{Math.round(summary.avgAge)} ngày</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={summary.slowMovingPercentage > 20 ? 'border-red-500' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-8 h-8 ${summary.slowMovingPercentage > 20 ? 'text-red-500' : 'text-orange-500'}`} />
                <div>
                  <p className="text-sm text-muted-foreground">Tồn chậm (&gt;90 ngày)</p>
                  <p className="text-2xl font-bold">{summary.slowMovingPercentage.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(summary.slowMovingValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Chưa có dữ liệu tồn kho"
            description="Import dữ liệu tồn kho để xem phân tích tuổi hàng"
          />
        ) : (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Phân bổ giá trị theo tuổi</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Số lượng & Giá trị theo bucket</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barData}>
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis yAxisId="left" orientation="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="quantity" name="Số lượng" fill="#3b82f6" />
                      <Bar yAxisId="right" dataKey="value" name="Giá trị (triệu)" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Aging Buckets Detail */}
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết theo nhóm tuổi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agingBuckets.map((bucket, index) => (
                    <div key={bucket.bucket} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index] }} 
                          />
                          <span className="font-medium">{bucket.bucket}</span>
                          <Badge variant="outline">{bucket.items.length} SKU</Badge>
                        </div>
                        <div className="text-right">
                          <span className="font-bold">{formatCurrency(bucket.totalValue)}</span>
                          <span className="text-muted-foreground ml-2">
                            ({bucket.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <Progress value={bucket.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Slow Moving Items Table */}
            {summary.slowMovingPercentage > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Hàng tồn chậm (&gt;90 ngày)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Tên sản phẩm</TableHead>
                        <TableHead>Danh mục</TableHead>
                        <TableHead className="text-right">Số lượng</TableHead>
                        <TableHead className="text-right">Giá trị</TableHead>
                        <TableHead className="text-right">Tuổi (ngày)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agingBuckets
                        .filter(b => b.minDays >= 91)
                        .flatMap(b => b.items)
                        .slice(0, 20)
                        .map(item => {
                          const ageDays = Math.ceil(
                            (new Date().getTime() - new Date(item.received_date).getTime()) / 
                            (1000 * 60 * 60 * 24)
                          );
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono">{item.sku}</TableCell>
                              <TableCell>{item.product_name}</TableCell>
                              <TableCell>{item.category || '-'}</TableCell>
                              <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.total_value)}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={ageDays > 180 ? 'destructive' : 'secondary'}>
                                  {ageDays}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
