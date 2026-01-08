import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { CreditCard, AlertCircle, Clock, Percent, CheckCircle, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePaymentOptimization, useMarkAsPaid } from '@/hooks/useSupplierPayments';
import { formatCurrency } from '@/lib/formatters';
import { LoadingState, EmptyState } from '@/components/shared';
import { format, differenceInDays, isPast } from 'date-fns';
import { vi } from 'date-fns/locale';

const getPaymentStatusBadge = (status: string, dueDate: string) => {
  if (status !== 'pending') {
    switch (status) {
      case 'paid_early': return <Badge className="bg-green-500">Thanh toán sớm</Badge>;
      case 'paid_on_time': return <Badge className="bg-blue-500">Đúng hạn</Badge>;
      case 'paid_late': return <Badge className="bg-orange-500">Trễ hạn</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  }
  
  const due = new Date(dueDate);
  const today = new Date();
  const daysUntilDue = differenceInDays(due, today);
  
  if (isPast(due)) return <Badge variant="destructive">Quá hạn {Math.abs(daysUntilDue)} ngày</Badge>;
  if (daysUntilDue <= 7) return <Badge className="bg-orange-500">Còn {daysUntilDue} ngày</Badge>;
  if (daysUntilDue <= 30) return <Badge className="bg-yellow-500">Còn {daysUntilDue} ngày</Badge>;
  return <Badge variant="outline">Còn {daysUntilDue} ngày</Badge>;
};

const getRecommendationBadge = (action: string | null) => {
  switch (action) {
    case 'pay_early': return <Badge className="bg-green-500">Nên thanh toán sớm</Badge>;
    case 'pay_on_due': return <Badge variant="secondary">Thanh toán đúng hạn</Badge>;
    case 'negotiate': return <Badge className="bg-purple-500">Đàm phán</Badge>;
    default: return null;
  }
};

export default function SupplierPaymentsPage() {
  const { payments, pendingPayments, dueThisWeek, dueThisMonth, summary, isLoading } = usePaymentOptimization();
  const markAsPaid = useMarkAsPaid();

  if (isLoading) return <LoadingState variant="page" />;

  const handleMarkAsPaid = (id: string, amount: number, dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    let status: 'paid_early' | 'paid_on_time' | 'paid_late' = 'paid_on_time';
    
    if (today < due) status = 'paid_early';
    else if (today > due) status = 'paid_late';

    markAsPaid.mutate({
      id,
      paid_amount: amount,
      paid_date: format(today, 'yyyy-MM-dd'),
      payment_status: status,
    });
  };

  return (
    <>
      <Helmet>
        <title>Tối ưu thanh toán NCC | Bluecore Finance</title>
      </Helmet>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Tối ưu thanh toán NCC</h1>
            <p className="text-muted-foreground">Supplier Payment Optimization</p>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Tổng phải trả</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.totalPayables)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={summary.overduePayments.length > 0 ? 'border-red-500' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className={`w-8 h-8 ${summary.overduePayments.length > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm text-muted-foreground">Quá hạn</p>
                  <p className="text-2xl font-bold">{summary.overduePayments.length}</p>
                  <p className="text-xs text-red-500">
                    {formatCurrency(summary.overduePayments.reduce((s, p) => s + p.original_amount, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Đến hạn tuần này</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.totalDueThisWeek)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Tiết kiệm tiềm năng</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.potentialSavings)}</p>
                  <p className="text-xs text-muted-foreground">
                    TB: {summary.averageDiscountRate.toFixed(2)}% chiết khấu
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Chưa có lịch thanh toán"
            description="Thêm lịch thanh toán nhà cung cấp để tối ưu dòng tiền"
          />
        ) : (
          <>
            {/* Early Payment Recommendations */}
            {summary.recommendedEarlyPayments.length > 0 && (
              <Card className="border-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <Percent className="w-5 h-5" />
                    Đề xuất thanh toán sớm ({summary.recommendedEarlyPayments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nhà cung cấp</TableHead>
                        <TableHead className="text-right">Số tiền</TableHead>
                        <TableHead>Hạn thanh toán sớm</TableHead>
                        <TableHead className="text-right">Chiết khấu</TableHead>
                        <TableHead className="text-right">Tiết kiệm</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.recommendedEarlyPayments.slice(0, 5).map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.vendor?.name || 'N/A'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(payment.original_amount)}</TableCell>
                          <TableCell>
                            {payment.early_payment_date 
                              ? format(new Date(payment.early_payment_date), 'dd/MM/yyyy', { locale: vi })
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {payment.early_payment_discount_percent}%
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {formatCurrency(payment.early_payment_discount_amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsPaid(
                                payment.id, 
                                payment.original_amount - payment.early_payment_discount_amount,
                                payment.early_payment_date || payment.due_date
                              )}
                              disabled={markAsPaid.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Thanh toán
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Overdue Payments Alert */}
            {summary.overduePayments.length > 0 && (
              <Card className="border-red-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    Thanh toán quá hạn ({summary.overduePayments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nhà cung cấp</TableHead>
                        <TableHead className="text-right">Số tiền</TableHead>
                        <TableHead>Ngày đến hạn</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.overduePayments.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.vendor?.name || 'N/A'}</TableCell>
                          <TableCell className="text-right font-bold text-red-600">
                            {formatCurrency(payment.original_amount)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: vi })}
                          </TableCell>
                          <TableCell>{getPaymentStatusBadge(payment.payment_status, payment.due_date)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleMarkAsPaid(payment.id, payment.original_amount, payment.due_date)}
                              disabled={markAsPaid.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Thanh toán ngay
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* All Pending Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Tất cả thanh toán chờ xử lý</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nhà cung cấp</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead>Ngày đến hạn</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Đề xuất</TableHead>
                      <TableHead className="text-right">Chiết khấu sớm</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.vendor?.name || 'N/A'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payment.original_amount)}</TableCell>
                        <TableCell>
                          {format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: vi })}
                        </TableCell>
                        <TableCell>{getPaymentStatusBadge(payment.payment_status, payment.due_date)}</TableCell>
                        <TableCell>{getRecommendationBadge(payment.recommended_action)}</TableCell>
                        <TableCell className="text-right">
                          {payment.early_payment_discount_percent > 0 && (
                            <span className="text-green-600">{payment.early_payment_discount_percent}%</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsPaid(payment.id, payment.original_amount, payment.due_date)}
                            disabled={markAsPaid.isPending}
                          >
                            Thanh toán
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
