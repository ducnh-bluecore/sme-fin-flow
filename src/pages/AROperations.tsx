import { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Users, TrendingDown, Clock, DollarSign, Mail, Phone, FileText, Loader2, Plus } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { ARAgingChart } from '@/components/dashboard/ARAgingChart';
import { ARByPlatformChart } from '@/components/dashboard/ARByPlatformChart';
import { OverdueInvoicesTable } from '@/components/dashboard/OverdueInvoicesTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatVND, formatVNDCompact } from '@/lib/formatters';
import { useCentralFinancialMetrics } from '@/hooks/useCentralFinancialMetrics';
import { useCustomersData } from '@/hooks/useKPIData';
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
  
  // Date range filter
  const [dateRange, setDateRange] = useState('this_year');
  
  const { data: metrics, isLoading: kpiLoading } = useCentralFinancialMetrics();
  const { data: customers = [], isLoading: customersLoading } = useCustomersData();
  
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

  const sortedCustomers = [...customers].sort((a, b) => b.totalAR - a.totalAR);

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
        <title>AR Operations | Bluecore Finance</title>
        <meta name="description" content="Quản lý công nợ phải thu - AR Operations Dashboard" />
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
              AR Operations
            </h1>
            <p className="text-muted-foreground">Quản lý Công nợ Phải thu</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <QuickDateSelector value={dateRange} onChange={setDateRange} />
            <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm khách hàng
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Thêm khách hàng mới</DialogTitle>
                  <DialogDescription>
                    Nhập thông tin khách hàng để bắt đầu quản lý công nợ
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customer-name">Tên khách hàng *</Label>
                    <Input
                      id="customer-name"
                      placeholder="VD: Công ty TNHH ABC"
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="customer-email">Email</Label>
                      <Input
                        id="customer-email"
                        type="email"
                        placeholder="contact@company.com"
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="customer-phone">Điện thoại</Label>
                      <Input
                        id="customer-phone"
                        placeholder="0901234567"
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="customer-address">Địa chỉ</Label>
                    <Input
                      id="customer-address"
                      placeholder="123 Nguyễn Huệ, Q.1, TP.HCM"
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="customer-tax">Mã số thuế</Label>
                      <Input
                        id="customer-tax"
                        placeholder="0123456789"
                        value={customerForm.tax_code}
                        onChange={(e) => setCustomerForm({ ...customerForm, tax_code: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="customer-credit">Hạn mức tín dụng</Label>
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
                      <Label htmlFor="customer-terms">Điều khoản thanh toán</Label>
                      <Select
                        value={customerForm.payment_terms}
                        onValueChange={(value) => setCustomerForm({ ...customerForm, payment_terms: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Thanh toán ngay</SelectItem>
                          <SelectItem value="15">15 ngày</SelectItem>
                          <SelectItem value="30">30 ngày</SelectItem>
                          <SelectItem value="45">45 ngày</SelectItem>
                          <SelectItem value="60">60 ngày</SelectItem>
                          <SelectItem value="90">90 ngày</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="customer-status">Trạng thái</Label>
                      <Select
                        value={customerForm.status}
                        onValueChange={(value) => setCustomerForm({ ...customerForm, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Hoạt động</SelectItem>
                          <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddCustomer(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleAddCustomer} disabled={addCustomer.isPending}>
                    {addCustomer.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Thêm khách hàng
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Xuất báo cáo
            </Button>
            <Button variant="secondary" size="sm">
              <Mail className="w-4 h-4 mr-2" />
              Gửi nhắc nợ hàng loạt
            </Button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Tổng AR"
            value={kpi.totalAR > 0 ? formatVNDCompact(kpi.totalAR) : '--'}
            trend={kpi.totalAR > 0 ? { value: 3.2 } : undefined}
            icon={DollarSign}
          />
          <KPICard
            title="AR Quá hạn"
            value={kpi.totalAR > 0 ? formatVNDCompact(kpi.overdueAR) : '--'}
            subtitle={kpi.totalAR > 0 ? `${((kpi.overdueAR / kpi.totalAR) * 100).toFixed(1)}% tổng AR` : undefined}
            icon={TrendingDown}
            variant={kpi.overdueAR > 0 ? "danger" : "default"}
          />
          <KPICard
            title="DSO"
            value={kpi.totalAR > 0 ? `${kpi.dso} ngày` : '--'}
            trend={kpi.totalAR > 0 ? { value: kpi.dso - 45, label: 'vs target 45 ngày' } : undefined}
            icon={Clock}
            variant={kpi.dso > 45 ? "warning" : "default"}
          />
          <KPICard
            title="Hóa đơn chờ đối soát"
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
                <h3 className="font-semibold text-foreground">Top khách hàng theo AR</h3>
                <p className="text-sm text-muted-foreground">Customer AR Analysis</p>
              </div>
              <Badge variant="secondary">Top {Math.min(6, sortedCustomers.length)}</Badge>
            </div>

            <ScrollArea className="h-64">
              {customersLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : sortedCustomers.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Không có dữ liệu khách hàng
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Khách hàng</TableHead>
                      <TableHead className="text-xs text-right">Tổng AR</TableHead>
                      <TableHead className="text-xs text-right">Quá hạn</TableHead>
                      <TableHead className="text-xs text-center">DSO TB</TableHead>
                      <TableHead className="text-xs text-right">Hành động</TableHead>
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
                            {customer.avgPaymentDays} ngày
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

        {/* DSO Trend (Placeholder) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="data-card"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Xu hướng DSO</h3>
              <p className="text-sm text-muted-foreground">DSO Trend - 12 tháng gần nhất</p>
            </div>
          </div>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Biểu đồ DSO Trend sẽ được hiển thị ở đây</p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
