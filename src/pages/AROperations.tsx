import { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Users, TrendingDown, Clock, DollarSign, Mail, Phone, FileText, Loader2, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { KPICard } from '@/components/dashboard/KPICard';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { ARAgingChart } from '@/components/dashboard/ARAgingChart';
import { ARByPlatformChart } from '@/components/dashboard/ARByPlatformChart';
import { OverdueInvoicesTable } from '@/components/dashboard/OverdueInvoicesTable';
import { DSOTrendChart } from '@/components/dashboard/DSOTrendChart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatVND, formatVNDCompact } from '@/lib/formatters';
import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { useTopCustomersAR } from '@/hooks/useTopCustomersAR';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AROperations() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  // Date range filter
  const [dateRange, setDateRange] = useState('this_year');
  
  const { data: snapshot, isLoading: kpiLoading } = useFinanceTruthSnapshot();
  const { data: customers = [], isLoading: customersLoading } = useTopCustomersAR(10);
  
  // Map snapshot to metrics for AR display
  const metrics = snapshot ? {
    totalAR: snapshot.totalAR,
    overdueAR: snapshot.overdueAR,
    dso: snapshot.dso,
  } : undefined;
  
  // Add customer form state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_code: '',
    credit_limit: '',
    payment_terms: '30',
    status: 'active'
  });

  // Add customer mutation
  const addCustomer = useMutation({
    mutationFn: async (data: typeof customerForm) => {
      const { error } = await supabase.from('customers').insert({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        tax_code: data.tax_code || null,
        credit_limit: data.credit_limit ? parseFloat(data.credit_limit) : null,
        payment_terms: parseInt(data.payment_terms) || 30,
        status: data.status
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-data'] });
      toast.success('Đã thêm khách hàng mới');
      setShowAddCustomer(false);
      setCustomerForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        tax_code: '',
        credit_limit: '',
        payment_terms: '30',
        status: 'active'
      });
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    }
  });

  const handleAddCustomer = () => {
    if (!customerForm.name.trim()) {
      toast.error('Vui lòng nhập tên khách hàng');
      return;
    }
    addCustomer.mutate(customerForm);
  };

  // Customers already sorted by revenue/AR from hook
  const sortedCustomers = customers;

  if (kpiLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpi = {
    totalAR: metrics?.totalAR || 0,
    overdueAR: metrics?.overdueAR || 0,
    dso: metrics?.dso || 0,
    pendingInvoices: 0 // Giữ lại để tương thích
  };

  return (
    <>
      <Helmet>
        <title>{t('ar.title')} | Bluecore Finance</title>
        <meta name="description" content={t('ar.subtitle')} />
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
              {t('ar.title')}
            </h1>
            <p className="text-muted-foreground">{t('ar.subtitle')}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <QuickDateSelector value={dateRange} onChange={setDateRange} />
            <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('ar.addCustomer')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{t('ar.addCustomerTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('ar.addCustomerDesc')}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customer-name">{t('ar.customerName')} *</Label>
                    <Input
                      id="customer-name"
                      placeholder={t('ar.customerNamePlaceholder')}
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="customer-email">{t('ar.email')}</Label>
                      <Input
                        id="customer-email"
                        type="email"
                        placeholder="contact@company.com"
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="customer-phone">{t('ar.phone')}</Label>
                      <Input
                        id="customer-phone"
                        placeholder="0901234567"
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="customer-address">{t('ar.address')}</Label>
                    <Input
                      id="customer-address"
                      placeholder="123 Nguyễn Huệ, Q.1, TP.HCM"
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="customer-tax">{t('ar.taxCode')}</Label>
                      <Input
                        id="customer-tax"
                        placeholder="0123456789"
                        value={customerForm.tax_code}
                        onChange={(e) => setCustomerForm({ ...customerForm, tax_code: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="customer-credit">{t('ar.creditLimit')}</Label>
                      <Input
                        id="customer-credit"
                        type="number"
                        placeholder="100,000,000"
                        value={customerForm.credit_limit}
                        onChange={(e) => setCustomerForm({ ...customerForm, credit_limit: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="customer-terms">{t('ar.paymentTerms')}</Label>
                      <Select
                        value={customerForm.payment_terms}
                        onValueChange={(value) => setCustomerForm({ ...customerForm, payment_terms: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">{t('ar.payNow')}</SelectItem>
                          <SelectItem value="15">15 {t('ar.daysN')}</SelectItem>
                          <SelectItem value="30">30 {t('ar.daysN')}</SelectItem>
                          <SelectItem value="45">45 {t('ar.daysN')}</SelectItem>
                          <SelectItem value="60">60 {t('ar.daysN')}</SelectItem>
                          <SelectItem value="90">90 {t('ar.daysN')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="customer-status">{t('common.status')}</Label>
                      <Select
                        value={customerForm.status}
                        onValueChange={(value) => setCustomerForm({ ...customerForm, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{t('ar.statusActive')}</SelectItem>
                          <SelectItem value="inactive">{t('ar.statusInactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddCustomer(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleAddCustomer} disabled={addCustomer.isPending}>
                    {addCustomer.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {t('ar.addCustomer')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              {t('ar.exportReport')}
            </Button>
            <Button variant="secondary" size="sm">
              <Mail className="w-4 h-4 mr-2" />
              {t('ar.bulkReminder')}
            </Button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title={t('ar.totalAR')}
            value={kpi.totalAR > 0 ? formatVNDCompact(kpi.totalAR) : '--'}
            trend={kpi.totalAR > 0 ? { value: 3.2 } : undefined}
            icon={DollarSign}
          />
          <KPICard
            title={t('ar.overdueAR')}
            value={kpi.totalAR > 0 ? formatVNDCompact(kpi.overdueAR) : '--'}
            subtitle={kpi.totalAR > 0 ? `${snapshot?.overdueARPercent?.toFixed(1) ?? ((kpi.overdueAR / kpi.totalAR) * 100).toFixed(1)}% ${t('ar.ofTotalAR')}` : undefined}
            icon={TrendingDown}
            variant={kpi.overdueAR > 0 ? "danger" : "default"}
          />
          <KPICard
            title={t('ar.dso')}
            value={kpi.totalAR > 0 ? `${kpi.dso} ${t('ar.daysN')}` : '--'}
            trend={kpi.totalAR > 0 ? { value: kpi.dso - (snapshot?.dsoTarget ?? 45), label: `${t('ar.vsTarget')} ${snapshot?.dsoTarget ?? 45} ${t('ar.daysN')}` } : undefined}
            icon={Clock}
            variant={kpi.dso > 45 ? "warning" : "default"}
          />
          <KPICard
            title={t('ar.pendingInvoices')}
            value={kpi.pendingInvoices.toString()}
            icon={FileText}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AR Aging Chart */}
          <ARAgingChart />

          {/* AR by Platform Chart */}
          <ARByPlatformChart />
        </div>

        {/* Top Customers Section */}
        <div className="grid grid-cols-1 gap-6">

          {/* Top Customers by AR */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="data-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">{t('ar.topCustomers')}</h3>
                <p className="text-sm text-muted-foreground">{t('ar.topCustomersDesc')}</p>
              </div>
              <Badge variant="secondary">{t('ar.top')} {Math.min(6, sortedCustomers.length)}</Badge>
            </div>

            <ScrollArea className="h-64">
              {customersLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : sortedCustomers.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {t('ar.noCustomerData')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t('ar.customer')}</TableHead>
                      <TableHead className="text-xs text-right">{t('ar.totalARAmount')}</TableHead>
                      <TableHead className="text-xs text-right">{t('ar.overdueAmount')}</TableHead>
                      <TableHead className="text-xs text-center">{t('ar.avgDSO')}</TableHead>
                      <TableHead className="text-xs text-right">{t('ar.action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCustomers.slice(0, 6).map((customer, index) => (
                      <motion.tr
                        key={customer.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-muted/30"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <span className="font-medium text-sm">{customer.name}</span>
                              <p className="text-xs text-muted-foreground">{customer.email || 'N/A'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{formatVND(customer.totalAR)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.overdueAR > 0 ? (
                            <span className="text-destructive font-medium">
                              {formatVND(customer.overdueAR)}
                            </span>
                          ) : (
                            <span className="text-success">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={customer.avgPaymentDays > 45 ? 'destructive' : customer.avgPaymentDays > 30 ? 'default' : 'secondary'}
                          >
                            {customer.avgPaymentDays} {t('ar.daysN')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Mail className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Phone className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </motion.div>
        </div>

        {/* Overdue Invoices */}
        <OverdueInvoicesTable />

        {/* DSO Trend Chart */}
        <DSOTrendChart />
      </div>
    </>
  );
}
