import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Banknote, TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCashFlowAnalysis } from '@/hooks/useCashFlowDirect';
import { formatCurrency } from '@/lib/formatters';
import { LoadingState, EmptyState } from '@/components/shared';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, CartesianGrid, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function CashFlowDirectPage() {
  const { cashFlows, summary, periodData, isLoading } = useCashFlowAnalysis();

  if (isLoading) return <LoadingState variant="page" />;

  const waterfallData = periodData.slice(0, 12).reverse().map(p => ({
    period: format(new Date(p.periodStart), 'MM/yyyy'),
    operating: p.operating / 1000000,
    investing: p.investing / 1000000,
    financing: p.financing / 1000000,
    net: p.netChange / 1000000,
    balance: p.closingBalance / 1000000,
  }));

  return (
    <>
      <Helmet>
        <title>Dòng tiền trực tiếp | Bluecore Finance</title>
      </Helmet>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Banknote className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dòng tiền trực tiếp</h1>
            <p className="text-muted-foreground">Direct Cash Flow Statement</p>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ArrowUpRight className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Tổng thu</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalInflows)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ArrowDownRight className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Tổng chi</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalOutflows)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={summary.netChange >= 0 ? 'border-green-500' : 'border-red-500'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {summary.netChange >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-500" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-500" />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Thay đổi ròng</p>
                  <p className={`text-2xl font-bold ${summary.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.netChange)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Cash Runway</p>
                  <p className="text-2xl font-bold">{summary.runway.toFixed(1)} tháng</p>
                  <p className="text-xs text-muted-foreground">
                    Burn: {formatCurrency(summary.burnRate)}/tháng
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow by Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className={summary.operatingCashFlow >= 0 ? 'border-green-500' : 'border-red-500'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hoạt động kinh doanh</p>
                  <p className={`text-xl font-bold ${summary.operatingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.operatingCashFlow)}
                  </p>
                </div>
                <Badge variant={summary.operatingCashFlow >= 0 ? 'default' : 'destructive'}>
                  Operating
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className={summary.investingCashFlow >= 0 ? 'border-green-500' : 'border-yellow-500'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hoạt động đầu tư</p>
                  <p className={`text-xl font-bold ${summary.investingCashFlow >= 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {formatCurrency(summary.investingCashFlow)}
                  </p>
                </div>
                <Badge variant="secondary">Investing</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className={summary.financingCashFlow >= 0 ? 'border-blue-500' : 'border-orange-500'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hoạt động tài chính</p>
                  <p className={`text-xl font-bold ${summary.financingCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(summary.financingCashFlow)}
                  </p>
                </div>
                <Badge variant="outline">Financing</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {cashFlows.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="Chưa có dữ liệu dòng tiền"
            description="Thêm báo cáo dòng tiền để phân tích"
          />
        ) : (
          <Tabs defaultValue="chart" className="space-y-4">
            <TabsList>
              <TabsTrigger value="chart">Biểu đồ</TabsTrigger>
              <TabsTrigger value="detail">Chi tiết</TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="space-y-6">
              {/* Cash Flow Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Xu hướng dòng tiền theo kỳ</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={waterfallData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={(v) => `${v}M`} />
                      <Tooltip 
                        formatter={(value: number) => `${value.toFixed(1)} triệu`}
                        labelFormatter={(label) => `Kỳ: ${label}`}
                      />
                      <Legend />
                      <ReferenceLine y={0} stroke="#666" />
                      <Bar dataKey="operating" name="Kinh doanh" fill="#22c55e" stackId="a" />
                      <Bar dataKey="investing" name="Đầu tư" fill="#eab308" stackId="a" />
                      <Bar dataKey="financing" name="Tài chính" fill="#3b82f6" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Closing Balance Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Số dư tiền cuối kỳ</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={waterfallData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={(v) => `${v}M`} />
                      <Tooltip 
                        formatter={(value: number) => `${value.toFixed(1)} triệu`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="balance" 
                        name="Số dư cuối kỳ" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detail">
              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết dòng tiền theo kỳ</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kỳ</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead className="text-right">Thu từ KH</TableHead>
                        <TableHead className="text-right">Chi NCC</TableHead>
                        <TableHead className="text-right">Chi lương</TableHead>
                        <TableHead className="text-right">CF kinh doanh</TableHead>
                        <TableHead className="text-right">CF đầu tư</TableHead>
                        <TableHead className="text-right">CF tài chính</TableHead>
                        <TableHead className="text-right">Số dư cuối</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashFlows.slice(0, 12).map(cf => (
                        <TableRow key={cf.id}>
                          <TableCell>
                            {format(new Date(cf.period_start), 'MM/yyyy', { locale: vi })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={cf.is_actual ? 'default' : 'outline'}>
                              {cf.is_actual ? 'Thực tế' : 'Dự báo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(cf.cash_from_customers)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(cf.cash_to_suppliers)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(cf.cash_to_employees)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${cf.net_cash_operating >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(cf.net_cash_operating)}
                          </TableCell>
                          <TableCell className={`text-right ${cf.net_cash_investing >= 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {formatCurrency(cf.net_cash_investing)}
                          </TableCell>
                          <TableCell className={`text-right ${cf.net_cash_financing >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {formatCurrency(cf.net_cash_financing)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(cf.closing_cash_balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}
