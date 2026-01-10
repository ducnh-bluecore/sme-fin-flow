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
import { useLanguage } from '@/contexts/LanguageContext';

export default function SupplierPaymentsPage() {
  const { payments, pendingPayments, dueThisWeek, dueThisMonth, summary, isLoading } = usePaymentOptimization();
  const markAsPaid = useMarkAsPaid();
  const { t } = useLanguage();

  const getPaymentStatusBadge = (status: string, dueDate: string) => {
    if (status !== 'pending') {
      switch (status) {
        case 'paid_early': return <Badge className="bg-green-500">{t('supplier.paidEarly')}</Badge>;
        case 'paid_on_time': return <Badge className="bg-blue-500">{t('supplier.paidOnTime')}</Badge>;
        case 'paid_late': return <Badge className="bg-orange-500">{t('supplier.paidLate')}</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
      }
    }
    
    const due = new Date(dueDate);
    const today = new Date();
    const daysUntilDue = differenceInDays(due, today);
    
    if (isPast(due)) return <Badge variant="destructive">{t('supplier.overdueDays')} {Math.abs(daysUntilDue)} {t('inventory.days')}</Badge>;
    if (daysUntilDue <= 7) return <Badge className="bg-orange-500">{t('supplier.daysLeft')} {daysUntilDue} {t('inventory.days')}</Badge>;
    if (daysUntilDue <= 30) return <Badge className="bg-yellow-500">{t('supplier.daysLeft')} {daysUntilDue} {t('inventory.days')}</Badge>;
    return <Badge variant="outline">{t('supplier.daysLeft')} {daysUntilDue} {t('inventory.days')}</Badge>;
  };

  const getRecommendationBadge = (action: string | null) => {
    switch (action) {
      case 'pay_early': return <Badge className="bg-green-500">{t('supplier.payEarly')}</Badge>;
      case 'pay_on_due': return <Badge variant="secondary">{t('supplier.payOnDue')}</Badge>;
      case 'negotiate': return <Badge className="bg-purple-500">{t('supplier.negotiate')}</Badge>;
      default: return null;
    }
  };

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
        <title>{t('supplier.title')} | Bluecore Finance</title>
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
            <h1 className="text-2xl md:text-3xl font-bold">{t('supplier.title')}</h1>
            <p className="text-muted-foreground">{t('supplier.subtitle')}</p>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('supplier.totalPayables')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('supplier.overdue')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('supplier.dueThisWeek')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('supplier.potentialSavings')}</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.potentialSavings)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('supplier.avgDiscount')} {summary.averageDiscountRate.toFixed(2)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={t('supplier.noData')}
            description={t('supplier.noDataDesc')}
          />
        ) : (
          <>
            {/* Early Payment Recommendations */}
            {summary.recommendedEarlyPayments.length > 0 && (
              <Card className="border-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <Percent className="w-5 h-5" />
                    {t('supplier.earlyPaymentRec')} ({summary.recommendedEarlyPayments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('supplier.vendorName')}</TableHead>
                        <TableHead className="text-right">{t('supplier.amount')}</TableHead>
                        <TableHead>{t('supplier.earlyDueDate')}</TableHead>
                        <TableHead className="text-right">{t('supplier.discount')}</TableHead>
                        <TableHead className="text-right">{t('supplier.savings')}</TableHead>
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
                              {t('supplier.pay')}
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
                    {t('supplier.overduePayments')} ({summary.overduePayments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('supplier.vendorName')}</TableHead>
                        <TableHead className="text-right">{t('supplier.amount')}</TableHead>
                        <TableHead>{t('supplier.dueDate')}</TableHead>
                        <TableHead>{t('promo.status')}</TableHead>
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
                              {t('supplier.payNow')}
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
                <CardTitle>{t('supplier.allPending')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('supplier.vendorName')}</TableHead>
                      <TableHead className="text-right">{t('supplier.amount')}</TableHead>
                      <TableHead>{t('supplier.dueDate')}</TableHead>
                      <TableHead>{t('promo.status')}</TableHead>
                      <TableHead>{t('supplier.recommendation')}</TableHead>
                      <TableHead className="text-right">{t('supplier.earlyDiscount')}</TableHead>
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
                            {t('supplier.pay')}
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
