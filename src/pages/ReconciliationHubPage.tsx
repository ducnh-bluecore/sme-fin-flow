import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowRight, 
  RefreshCw, 
  Filter, 
  Loader2,
  ArrowRightLeft,
  Building2,
  Download,
  Link2,
  AlertTriangle,
  ShoppingBag,
  Truck,
  Wallet,
  Calculator,
  FileSpreadsheet,
  CheckCheck,
  Eye,
  EyeOff,
  Package,
  CircleDot,
} from 'lucide-react';
import { ReconciliationBoard } from '@/components/reconciliation/ReconciliationBoard';
import { OrderDetailDialog, OrderDetailData, DeliveryEvent } from '@/components/reconciliation/OrderDetailDialog';
import { KPICard } from '@/components/dashboard/KPICard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useCentralFinancialMetrics } from '@/hooks/useCentralFinancialMetrics';
import { useAutoMatch } from '@/hooks/useReconciliation';
import { useBankAccounts, useBankTransactions } from '@/hooks/useBankData';
import { 
  useEcommerceOrders, 
  useShippingOrders, 
  useMarkOrderReconciled,
  type EcommerceOrder,
  type ShippingOrder 
} from '@/hooks/useEcommerceReconciliation';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { useDateRange } from '@/contexts/DateRangeContext';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const reconciliationStatusConfig = {
  matched: { label: 'Khớp', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  discrepancy: { label: 'Chênh lệch', icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  unmatched: { label: 'Chưa khớp', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  pending: { label: 'Đang xử lý', icon: RefreshCw, color: 'text-muted-foreground', bg: 'bg-muted' },
  processed: { label: 'Đã xử lý', icon: CheckCheck, color: 'text-success', bg: 'bg-success/10' },
};

const orderStatusConfig = {
  delivered: { label: 'Đã giao', color: 'text-success', bg: 'bg-success/10' },
  shipping: { label: 'Đang giao', color: 'text-info', bg: 'bg-info/10' },
  returned: { label: 'Hoàn trả', color: 'text-destructive', bg: 'bg-destructive/10' },
  cancelled: { label: 'Đã hủy', color: 'text-muted-foreground', bg: 'bg-muted' },
  completed: { label: 'Hoàn thành', color: 'text-success', bg: 'bg-success/10' },
};

const reconcileStatusConfig = {
  pending: { label: 'Chưa đối soát', color: 'text-warning', bg: 'bg-warning/10' },
  reconciled: { label: 'Đã đối soát', color: 'text-success', bg: 'bg-success/10' },
};

// E-commerce platforms
const ecommercePlatforms = [
  { id: 'shopee', name: 'Shopee', logo: '🛒', color: 'bg-orange-500' },
  { id: 'tiktok', name: 'TikTok Shop', logo: '🎵', color: 'bg-black' },
  { id: 'lazada', name: 'Lazada', logo: '🛍️', color: 'bg-blue-600' },
  { id: 'tiki', name: 'Tiki', logo: '🔵', color: 'bg-blue-400' },
  { id: 'other', name: 'Khác', logo: '📦', color: 'bg-gray-500' },
];

const shippingCarriers = [
  { id: 'ghn', name: 'Giao Hàng Nhanh', logo: '🚚' },
  { id: 'ghtk', name: 'Giao Hàng Tiết Kiệm', logo: '📦' },
  { id: 'jt', name: 'J&T Express', logo: '🚛' },
  { id: 'viettel', name: 'Viettel Post', logo: '📮' },
  { id: 'vnpost', name: 'VNPost', logo: '✉️' },
  { id: 'ninja', name: 'Ninja Van', logo: '🥷' },
  { id: 'other', name: 'Khác', logo: '📦' },
];


export default function ReconciliationHubPage() {
  const [activeTab, setActiveTab] = useState('3way');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedCarrier, setSelectedCarrier] = useState<string>('all');
  const [reconcileFilter, setReconcileFilter] = useState<string>('all');
  const [showProcessed, setShowProcessed] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetailData | null>(null);
  
  // Fetch real data from database
  const { data: ecommerceOrders = [], isLoading: loadingEcommerce } = useEcommerceOrders();
  const { data: shippingOrders = [], isLoading: loadingShipping } = useShippingOrders();
  const markReconciled = useMarkOrderReconciled();
  
  const { dateRange } = useDateRange();
  const { data: metrics, isLoading: kpiLoading } = useCentralFinancialMetrics();
  const { invoices = [], transactions: bankTransactionsFromMatch = [], isMatching } = useAutoMatch();
  
  const { data: bankAccounts = [], isLoading: loadingAccounts } = useBankAccounts();
  const { data: transactions = [], isLoading: loadingTransactions } = useBankTransactions();

  const filteredTransactions = selectedBank === 'all'
    ? transactions
    : transactions.filter(t => t.bank_accounts?.bank_name === selectedBank);

  // Filter e-commerce orders
  const filteredEcommerceOrders = ecommerceOrders.filter(o => {
    if (!showProcessed && o.isProcessed) return false;
    if (selectedPlatform !== 'all' && o.platform !== selectedPlatform) return false;
    if (reconcileFilter !== 'all' && o.reconcileStatus !== reconcileFilter) return false;
    return true;
  });

  // Filter shipping orders
  const filteredShippingOrders = shippingOrders.filter(o => {
    if (!showProcessed && o.isProcessed) return false;
    if (selectedCarrier !== 'all' && o.carrier !== selectedCarrier) return false;
    if (reconcileFilter !== 'all' && o.reconcileStatus !== reconcileFilter) return false;
    return true;
  });

  // Calculate stats
  const totalTransactions = transactions.length;
  const matchedCount = transactions.filter(t => t.match_status === 'matched').length;
  const unmatchedCount = transactions.filter(t => t.match_status === 'unmatched').length;
  const discrepancyCount = transactions.filter(t => t.match_status === 'discrepancy').length;
  const matchRate = totalTransactions > 0 ? Math.round((matchedCount / totalTransactions) * 100) : 0;

  // E-commerce stats
  const ecommerceTotal = filteredEcommerceOrders.reduce((acc, o) => acc + o.walletAmount, 0);
  const ecommerceVariance = filteredEcommerceOrders.reduce((acc, o) => acc + o.variance, 0);
  const ecommercePendingCount = ecommerceOrders.filter(o => o.reconcileStatus === 'pending' && !o.isProcessed).length;
  const ecommerceReconciledCount = ecommerceOrders.filter(o => o.reconcileStatus === 'reconciled').length;

  // Shipping stats
  const shippingTotal = filteredShippingOrders.reduce((acc, o) => acc + o.netAmount, 0);
  const shippingPendingCount = shippingOrders.filter(o => o.reconcileStatus === 'pending' && !o.isProcessed).length;
  const shippingReconciledCount = shippingOrders.filter(o => o.reconcileStatus === 'reconciled').length;

  // 3-way matching stats
  const kpi = { matchedRate: 0, pendingInvoices: 0 };
  const matchedTransactionsFromMatch = bankTransactionsFromMatch.filter(tx => tx.match_status === 'matched').length;
  const autoMatchRate = bankTransactionsFromMatch.length > 0 
    ? Math.round((matchedTransactionsFromMatch / bankTransactionsFromMatch.length) * 100) 
    : 0;
  const unmatchedInvoices = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').length;

  const handleSync = () => {
    toast.info('Đang đồng bộ dữ liệu...');
  };

  const handleExport = (type: 'ecommerce' | 'shipping' | 'bank' | 'all') => {
    const typeLabels = {
      ecommerce: 'sàn TMĐT',
      shipping: 'đơn vị vận chuyển',
      bank: 'ngân hàng',
      all: 'tổng hợp'
    };
    toast.success(`Đang xuất báo cáo đối soát ${typeLabels[type]}...`);
  };

  const handleMarkProcessed = (type: 'ecommerce' | 'shipping', ids: string[]) => {
    if (ids.length === 0) {
      toast.error('Vui lòng chọn ít nhất một đơn hàng');
      return;
    }

    // Use mutation to update in database
    markReconciled.mutate({ orderIds: ids, type });
    setSelectedItems([]);
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (ids: string[]) => {
    const allSelected = ids.every(id => selectedItems.includes(id));
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedItems(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const getPlatformInfo = (platformId: string) => {
    return ecommercePlatforms.find(p => p.id === platformId) || { name: platformId, logo: '📦', color: 'bg-gray-500' };
  };

  const getCarrierInfo = (carrierId: string) => {
    return shippingCarriers.find(c => c.id === carrierId) || { name: carrierId, logo: '🚚' };
  };

  const handleViewEcommerceOrder = (order: EcommerceOrder) => {
    const platform = getPlatformInfo(order.platform);
    setSelectedOrderDetail({
      type: 'ecommerce',
      trackingCode: order.trackingCode,
      orderId: order.orderId,
      platformOrderId: order.platformOrderId,
      platform: order.platform,
      platformName: platform.name,
      platformLogo: platform.logo,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      orderDate: order.orderDate,
      deliveredDate: order.deliveredDate,
      items: order.items,
      totalAmount: order.estimatedAmount,
      walletAmount: order.walletAmount,
      estimatedAmount: order.estimatedAmount,
      orderStatus: order.orderStatus,
      reconcileStatus: order.reconcileStatus,
      deliveryEvents: order.deliveryEvents as DeliveryEvent[],
    });
    setOrderDetailOpen(true);
  };

  const handleViewShippingOrder = (order: ShippingOrder) => {
    const carrier = getCarrierInfo(order.carrier);
    setSelectedOrderDetail({
      type: 'shipping',
      trackingCode: order.trackingCode,
      orderId: order.orderId,
      carrier: order.carrier,
      carrierName: carrier.name,
      carrierLogo: carrier.logo,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      orderDate: order.orderDate,
      deliveredDate: order.deliveredDate,
      totalAmount: order.codAmount,
      codAmount: order.codAmount,
      shippingFee: order.shippingFee,
      netAmount: order.netAmount,
      orderStatus: order.orderStatus,
      reconcileStatus: order.reconcileStatus,
      deliveryEvents: order.deliveryEvents as DeliveryEvent[],
    });
    setOrderDetailOpen(true);
  };

  if (kpiLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Đối soát | Bluecore Finance</title>
        <meta name="description" content="Đối soát 3 chiều, ngân hàng, sàn TMĐT và đơn vị vận chuyển" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-info/10 flex items-center justify-center">
              <ArrowRightLeft className="w-6 h-6 text-info" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Đối soát</h1>
              <p className="text-muted-foreground">Reconciliation Hub</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <QuickDateSelector />
            <Button variant="outline" size="sm" onClick={handleSync}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Đồng bộ
            </Button>
            <Button size="sm" onClick={() => handleExport('all')}>
              <Download className="w-4 h-4 mr-2" />
              Xuất báo cáo
            </Button>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="3way" className="text-xs sm:text-sm">
              <ArrowRightLeft className="w-4 h-4 mr-1 hidden sm:inline" />
              3 chiều
            </TabsTrigger>
            <TabsTrigger value="bank" className="text-xs sm:text-sm">
              <Building2 className="w-4 h-4 mr-1 hidden sm:inline" />
              Ngân hàng
            </TabsTrigger>
            <TabsTrigger value="ecommerce" className="text-xs sm:text-sm">
              <ShoppingBag className="w-4 h-4 mr-1 hidden sm:inline" />
              Sàn TMĐT
            </TabsTrigger>
            <TabsTrigger value="shipping" className="text-xs sm:text-sm">
              <Truck className="w-4 h-4 mr-1 hidden sm:inline" />
              Vận chuyển
            </TabsTrigger>
          </TabsList>

          {/* 3-Way Matching Tab */}
          <TabsContent value="3way" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Tỷ lệ 3-way matched"
                value={invoices.length > 0 ? `${kpi.matchedRate}%` : '--'}
                trend={invoices.length > 0 ? { value: 3.5 } : undefined}
                icon={CheckCircle2}
                variant={invoices.length > 0 ? "success" : "default"}
              />
              <KPICard
                title="Hóa đơn chờ đối soát"
                value={unmatchedInvoices.toString()}
                subtitle={unmatchedInvoices > 0 ? "cần xử lý" : undefined}
                icon={Clock}
                variant={unmatchedInvoices > 0 ? "warning" : "default"}
              />
              <KPICard
                title="Tỷ lệ tự động khớp"
                value={bankTransactionsFromMatch.length > 0 ? `${autoMatchRate}%` : '--'}
                trend={bankTransactionsFromMatch.length > 0 ? { value: 2.1 } : undefined}
                icon={RefreshCw}
              />
              <KPICard
                title="Exception aging"
                value={unmatchedInvoices > 0 ? "4.2 ngày" : '--'}
                subtitle={unmatchedInvoices > 0 ? "trung bình" : undefined}
                icon={XCircle}
              />
            </div>

            {/* Match Flow Visualization */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="data-card"
            >
              <div className="flex items-center justify-center gap-4 py-4 overflow-x-auto">
                {[
                  { label: 'Hóa đơn', sublabel: 'Invoice', count: invoices.length },
                  { label: 'Thanh toán', sublabel: 'Payment', count: invoices.filter(i => i.paid_amount && i.paid_amount > 0).length },
                  { label: 'Ngân hàng', sublabel: 'Bank Txn', count: bankTransactionsFromMatch.length },
                  { label: 'Sổ cái', sublabel: 'GL Entry', count: invoices.length },
                ].map((step, index) => (
                  <div key={step.label} className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 mx-auto">
                        <span className="text-xl font-bold text-primary">{step.count}</span>
                      </div>
                      <p className="text-sm font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.sublabel}</p>
                    </div>
                    {index < 3 && (
                      <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Reconciliation Board */}
            <ReconciliationBoard />
          </TabsContent>

          {/* Bank Reconciliation Tab */}
          <TabsContent value="bank" className="space-y-6">
            {/* Bank Accounts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {loadingAccounts ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))
              ) : bankAccounts.length === 0 ? (
                <Card className="col-span-3 p-8 bg-card shadow-card text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Chưa có tài khoản ngân hàng nào được kết nối</p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Thêm tài khoản
                  </Button>
                </Card>
              ) : (
                bankAccounts.map((account, index) => (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-5 bg-card shadow-card">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          <span className="font-semibold">{account.bank_name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">***{account.account_number.slice(-4)}</Badge>
                      </div>
                      <p className="text-2xl font-bold text-foreground mb-2">
                        {formatCurrency(account.current_balance || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {account.last_sync_at 
                          ? `Cập nhật: ${formatDate(account.last_sync_at)}`
                          : 'Chưa đồng bộ'}
                      </p>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>

            {/* Reconciliation Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="data-card"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Tổng quan đối soát tháng này</h3>
                <Badge className="text-sm">{matchRate}% khớp</Badge>
              </div>
              <Progress value={matchRate} className="h-3 mb-4" />
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold">{totalTransactions}</p>
                  <p className="text-xs text-muted-foreground">Tổng giao dịch</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-success/10">
                  <p className="text-2xl font-bold text-success">{matchedCount}</p>
                  <p className="text-xs text-muted-foreground">Đã khớp</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-warning/10">
                  <p className="text-2xl font-bold text-warning">{discrepancyCount}</p>
                  <p className="text-xs text-muted-foreground">Chênh lệch</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-destructive/10">
                  <p className="text-2xl font-bold text-destructive">{unmatchedCount}</p>
                  <p className="text-xs text-muted-foreground">Chưa khớp</p>
                </div>
              </div>
            </motion.div>

            {/* Transactions Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="data-card"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h3 className="font-semibold text-lg">Chi tiết giao dịch</h3>
                <div className="flex gap-3">
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Ngân hàng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {bankAccounts.map(bank => (
                        <SelectItem key={bank.id} value={bank.bank_name}>{bank.bank_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => handleExport('bank')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Xuất Excel
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Không có giao dịch nào</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold">Ngày</th>
                        <th className="text-left py-3 px-4 font-semibold">Mô tả</th>
                        <th className="text-left py-3 px-4 font-semibold">Ngân hàng</th>
                        <th className="text-right py-3 px-4 font-semibold">Số tiền</th>
                        <th className="text-left py-3 px-4 font-semibold">Loại</th>
                        <th className="text-left py-3 px-4 font-semibold">Trạng thái</th>
                        <th className="text-right py-3 px-4 font-semibold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((txn) => {
                        const status = txn.match_status || 'unmatched';
                        const config = reconciliationStatusConfig[status as keyof typeof reconciliationStatusConfig] || reconciliationStatusConfig.unmatched;
                        const StatusIcon = config.icon;
                        
                        return (
                          <tr key={txn.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-3 px-4 text-sm">{formatDate(txn.transaction_date)}</td>
                            <td className="py-3 px-4">
                              <p className="font-medium">{txn.description || 'Không có mô tả'}</p>
                              {txn.reference && (
                                <p className="text-xs text-muted-foreground">Ref: {txn.reference}</p>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{txn.bank_accounts?.bank_name || 'N/A'}</Badge>
                            </td>
                            <td className={cn('py-3 px-4 text-right font-mono', 
                              txn.transaction_type === 'credit' ? 'text-success' : 'text-destructive')}>
                              {txn.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary" className="text-xs">
                                {txn.transaction_type === 'credit' ? 'Thu' : 'Chi'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.bg, config.color)}>
                                <StatusIcon className="w-3 h-3" />
                                {config.label}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {status !== 'matched' && (
                                <Button variant="outline" size="sm">
                                  <Link2 className="w-4 h-4 mr-1" />
                                  Khớp
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </TabsContent>

          {/* E-commerce Reconciliation Tab */}
          <TabsContent value="ecommerce" className="space-y-6">
            {/* Platform Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ecommercePlatforms.map((platform, index) => {
                const platformOrders = ecommerceOrders.filter(o => o.platform === platform.id);
                const pendingCount = platformOrders.filter(o => o.reconcileStatus === 'pending' && !o.isProcessed).length;
                const reconciledCount = platformOrders.filter(o => o.reconcileStatus === 'reconciled').length;
                const totalAmount = platformOrders.filter(o => !o.isProcessed).reduce((acc, o) => acc + o.walletAmount, 0);
                
                return (
                  <motion.div
                    key={platform.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={cn(
                      "p-5 bg-card shadow-card cursor-pointer transition-all",
                      selectedPlatform === platform.id && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedPlatform(selectedPlatform === platform.id ? 'all' : platform.id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{platform.logo}</span>
                          <span className="font-semibold">{platform.name}</span>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-foreground mb-2">
                        {formatCurrency(totalAmount)}
                      </p>
                      <div className="flex gap-3 text-xs">
                        <span className="text-warning">{pendingCount} chưa đối soát</span>
                        <span className="text-success">{reconciledCount} đã đối soát</span>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Tổng tiền về ví"
                value={formatCurrency(ecommerceTotal)}
                icon={Wallet}
                variant="default"
              />
              <KPICard
                title="Chênh lệch tạm tính"
                value={formatCurrency(Math.abs(ecommerceVariance))}
                subtitle={ecommerceVariance < 0 ? "thấp hơn dự kiến" : ecommerceVariance > 0 ? "cao hơn dự kiến" : ""}
                icon={Calculator}
                variant={ecommerceVariance !== 0 ? "warning" : "success"}
              />
              <KPICard
                title="Chưa đối soát"
                value={ecommercePendingCount.toString()}
                subtitle="đơn hàng"
                icon={Clock}
                variant="warning"
              />
              <KPICard
                title="Đã đối soát"
                value={ecommerceReconciledCount.toString()}
                subtitle="đơn hàng"
                icon={CheckCircle2}
                variant="success"
              />
            </div>

            {/* Orders Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="data-card"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h3 className="font-semibold text-lg">Chi tiết đối soát sàn TMĐT</h3>
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox 
                      checked={showProcessed} 
                      onCheckedChange={(checked) => setShowProcessed(checked as boolean)}
                    />
                    <span className="flex items-center gap-1">
                      {showProcessed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      Hiện đã xử lý
                    </span>
                  </label>
                  <Select value={reconcileFilter} onValueChange={setReconcileFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="pending">Chưa đối soát</SelectItem>
                      <SelectItem value="reconciled">Đã đối soát</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Sàn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả sàn</SelectItem>
                      {ecommercePlatforms.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.logo} {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => handleExport('ecommerce')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Xuất Excel
                  </Button>
                  {selectedItems.length > 0 && (
                    <Button 
                      size="sm" 
                      onClick={() => handleMarkProcessed('ecommerce', selectedItems)}
                    >
                      <CheckCheck className="w-4 h-4 mr-2" />
                      Đánh dấu đã xử lý ({selectedItems.length})
                    </Button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 w-10">
                        <Checkbox 
                          checked={filteredEcommerceOrders.length > 0 && 
                            filteredEcommerceOrders.filter(o => !o.isProcessed).every(o => selectedItems.includes(o.id))}
                          onCheckedChange={() => toggleSelectAll(
                            filteredEcommerceOrders.filter(o => !o.isProcessed).map(o => o.id)
                          )}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">Sàn</th>
                      <th className="text-left py-3 px-4 font-semibold">Mã vận chuyển</th>
                      <th className="text-left py-3 px-4 font-semibold">Mã đơn hàng</th>
                      <th className="text-left py-3 px-4 font-semibold">Ngày đặt</th>
                      <th className="text-left py-3 px-4 font-semibold">Khách hàng</th>
                      <th className="text-right py-3 px-4 font-semibold">Tiền về ví</th>
                      <th className="text-right py-3 px-4 font-semibold">Tiền tạm tính</th>
                      <th className="text-right py-3 px-4 font-semibold">Chênh lệch</th>
                      <th className="text-center py-3 px-4 font-semibold">Trạng thái đơn</th>
                      <th className="text-center py-3 px-4 font-semibold">Đối soát</th>
                      <th className="text-right py-3 px-4 font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEcommerceOrders.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-muted-foreground">
                          <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Không có đơn hàng nào</p>
                        </td>
                      </tr>
                    ) : (
                      filteredEcommerceOrders.map((order) => {
                        const platform = getPlatformInfo(order.platform);
                        const orderStatusCfg = orderStatusConfig[order.orderStatus as keyof typeof orderStatusConfig] || orderStatusConfig.delivered;
                        const reconcileCfg = reconcileStatusConfig[order.reconcileStatus as keyof typeof reconcileStatusConfig];
                        
                        return (
                          <tr key={order.id} className={cn(
                            "border-b border-border/50 hover:bg-muted/30",
                            order.isProcessed && "opacity-60"
                          )}>
                            <td className="py-3 px-4">
                              <Checkbox 
                                checked={selectedItems.includes(order.id)}
                                onCheckedChange={() => toggleSelectItem(order.id)}
                                disabled={order.isProcessed}
                              />
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{platform.logo}</span>
                                <span className="font-medium text-sm">{platform.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <code className="text-sm bg-muted px-2 py-1 rounded font-mono">{order.trackingCode}</code>
                            </td>
                            <td className="py-3 px-4">
                              <code className="text-sm bg-primary/10 text-primary px-2 py-1 rounded font-mono">{order.orderId}</code>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {formatDate(order.orderDate)}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {order.customerName}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-medium">
                              {formatCurrency(order.walletAmount)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                              {formatCurrency(order.estimatedAmount)}
                            </td>
                            <td className={cn('py-3 px-4 text-right font-mono font-medium',
                              order.variance < 0 ? 'text-destructive' : order.variance > 0 ? 'text-success' : 'text-muted-foreground')}>
                              {order.variance !== 0 ? (order.variance > 0 ? '+' : '') + formatCurrency(order.variance) : '-'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', orderStatusCfg.bg, orderStatusCfg.color)}>
                                <Package className="w-3 h-3" />
                                {orderStatusCfg.label}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', reconcileCfg.bg, reconcileCfg.color)}>
                                <CircleDot className="w-3 h-3" />
                                {reconcileCfg.label}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" size="sm" onClick={() => handleViewEcommerceOrder(order)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {!order.isProcessed && order.reconcileStatus === 'pending' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleMarkProcessed('ecommerce', [order.id])}
                                  >
                                    <CheckCheck className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </TabsContent>

          {/* Shipping Reconciliation Tab */}
          <TabsContent value="shipping" className="space-y-6">
            {/* Carrier Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {shippingCarriers.map((carrier, index) => {
                const carrierOrders = shippingOrders.filter(o => o.carrier === carrier.id);
                const pendingCount = carrierOrders.filter(o => o.reconcileStatus === 'pending' && !o.isProcessed).length;
                
                return (
                  <motion.div
                    key={carrier.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={cn(
                      "p-4 bg-card shadow-card cursor-pointer transition-all",
                      selectedCarrier === carrier.id && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedCarrier(selectedCarrier === carrier.id ? 'all' : carrier.id)}
                    >
                      <div className="text-center">
                        <span className="text-2xl">{carrier.logo}</span>
                        <p className="font-medium text-sm mt-1 truncate">{carrier.name}</p>
                        <p className="text-xs text-warning mt-1">
                          {pendingCount} chờ
                        </p>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Tổng COD thu hộ"
                value={formatCurrency(filteredShippingOrders.reduce((acc, o) => acc + o.codAmount, 0))}
                icon={Wallet}
              />
              <KPICard
                title="Phí vận chuyển"
                value={formatCurrency(filteredShippingOrders.reduce((acc, o) => acc + o.shippingFee, 0))}
                icon={Truck}
                variant="warning"
              />
              <KPICard
                title="Chưa đối soát"
                value={shippingPendingCount.toString()}
                subtitle="đơn hàng"
                icon={Clock}
                variant="warning"
              />
              <KPICard
                title="Đã đối soát"
                value={shippingReconciledCount.toString()}
                subtitle="đơn hàng"
                icon={CheckCircle2}
                variant="success"
              />
            </div>

            {/* Orders Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="data-card"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h3 className="font-semibold text-lg">Chi tiết đối soát vận chuyển</h3>
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox 
                      checked={showProcessed} 
                      onCheckedChange={(checked) => setShowProcessed(checked as boolean)}
                    />
                    <span className="flex items-center gap-1">
                      {showProcessed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      Hiện đã xử lý
                    </span>
                  </label>
                  <Select value={reconcileFilter} onValueChange={setReconcileFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="pending">Chưa đối soát</SelectItem>
                      <SelectItem value="reconciled">Đã đối soát</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Đơn vị" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {shippingCarriers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.logo} {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => handleExport('shipping')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Xuất Excel
                  </Button>
                  {selectedItems.length > 0 && (
                    <Button 
                      size="sm" 
                      onClick={() => handleMarkProcessed('shipping', selectedItems)}
                    >
                      <CheckCheck className="w-4 h-4 mr-2" />
                      Đánh dấu đã xử lý ({selectedItems.length})
                    </Button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 w-10">
                        <Checkbox 
                          checked={filteredShippingOrders.length > 0 && 
                            filteredShippingOrders.filter(o => !o.isProcessed).every(o => selectedItems.includes(o.id))}
                          onCheckedChange={() => toggleSelectAll(
                            filteredShippingOrders.filter(o => !o.isProcessed).map(o => o.id)
                          )}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">Đơn vị</th>
                      <th className="text-left py-3 px-4 font-semibold">Mã vận chuyển</th>
                      <th className="text-left py-3 px-4 font-semibold">Mã đơn hàng</th>
                      <th className="text-left py-3 px-4 font-semibold">Ngày đặt</th>
                      <th className="text-left py-3 px-4 font-semibold">Khách hàng</th>
                      <th className="text-right py-3 px-4 font-semibold">COD thu hộ</th>
                      <th className="text-right py-3 px-4 font-semibold">Phí ship</th>
                      <th className="text-right py-3 px-4 font-semibold">Thực nhận</th>
                      <th className="text-center py-3 px-4 font-semibold">Trạng thái đơn</th>
                      <th className="text-center py-3 px-4 font-semibold">Đối soát</th>
                      <th className="text-right py-3 px-4 font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShippingOrders.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-muted-foreground">
                          <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Không có đơn hàng nào</p>
                        </td>
                      </tr>
                    ) : (
                      filteredShippingOrders.map((order) => {
                        const carrier = getCarrierInfo(order.carrier);
                        const orderStatusCfg = orderStatusConfig[order.orderStatus as keyof typeof orderStatusConfig] || orderStatusConfig.delivered;
                        const reconcileCfg = reconcileStatusConfig[order.reconcileStatus as keyof typeof reconcileStatusConfig];
                        
                        return (
                          <tr key={order.id} className={cn(
                            "border-b border-border/50 hover:bg-muted/30",
                            order.isProcessed && "opacity-60"
                          )}>
                            <td className="py-3 px-4">
                              <Checkbox 
                                checked={selectedItems.includes(order.id)}
                                onCheckedChange={() => toggleSelectItem(order.id)}
                                disabled={order.isProcessed}
                              />
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{carrier.logo}</span>
                                <span className="font-medium text-sm">{carrier.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <code className="text-sm bg-muted px-2 py-1 rounded font-mono">{order.trackingCode}</code>
                            </td>
                            <td className="py-3 px-4">
                              <code className="text-sm bg-primary/10 text-primary px-2 py-1 rounded font-mono">{order.orderId}</code>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {formatDate(order.orderDate)}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {order.customerName}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              {formatCurrency(order.codAmount)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-destructive">
                              -{formatCurrency(order.shippingFee)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-medium text-success">
                              {formatCurrency(order.netAmount)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', orderStatusCfg.bg, orderStatusCfg.color)}>
                                <Package className="w-3 h-3" />
                                {orderStatusCfg.label}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', reconcileCfg.bg, reconcileCfg.color)}>
                                <CircleDot className="w-3 h-3" />
                                {reconcileCfg.label}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" size="sm" onClick={() => handleViewShippingOrder(order)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {!order.isProcessed && order.reconcileStatus === 'pending' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleMarkProcessed('shipping', [order.id])}
                                  >
                                    <CheckCheck className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Order Detail Dialog */}
        <OrderDetailDialog
          open={orderDetailOpen}
          onOpenChange={setOrderDetailOpen}
          order={selectedOrderDetail}
        />
      </div>
    </>
  );
}
