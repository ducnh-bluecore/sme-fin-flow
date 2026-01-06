import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { 
  FileSearch, 
  Download, 
  Send, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Mail,
  Phone,
  MoreHorizontal,
  Eye,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useInvoiceTracking, useCollectionStats } from '@/hooks/useInvoiceData';
import { Link } from 'react-router-dom';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { useDateRange } from '@/contexts/DateRangeContext';
import { InvoiceOrderDetailDialog } from '@/components/invoice/InvoiceOrderDetailDialog';

const statusConfig = {
  draft: { label: 'Nháp', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
  sent_cqt: { label: 'Đã gửi CQT', icon: Send, color: 'text-warning', bg: 'bg-warning/10' },
  signed: { label: 'Đã ký', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
};

const platformConfig = {
  shopee: { label: 'Shopee', color: 'text-orange-600', bg: 'bg-orange-100' },
  lazada: { label: 'Lazada', color: 'text-blue-600', bg: 'bg-blue-100' },
  tiktok: { label: 'TikTok Shop', color: 'text-pink-600', bg: 'bg-pink-100' },
  tiki: { label: 'Tiki', color: 'text-cyan-600', bg: 'bg-cyan-100' },
  sendo: { label: 'Sendo', color: 'text-red-600', bg: 'bg-red-100' },
  other: { label: 'Khác', color: 'text-gray-600', bg: 'bg-gray-100' },
};

// Generate stable order codes based on invoice id
const generateOrderCode = (invoiceId: string, invoiceNumber: string) => {
  // Use invoice id hash to get consistent platform prefix
  const hash = invoiceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const platforms = ['SHP', 'LZD', 'TIK', 'TIK', 'SND'];
  const platformPrefix = platforms[hash % platforms.length];
  return `${platformPrefix}${invoiceNumber.replace(/[^0-9]/g, '').slice(0, 8)}`;
};

const getPlatformFromInvoice = (invoiceId: string) => {
  // Use invoice id hash to get consistent platform
  const hash = invoiceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const platforms = ['shopee', 'lazada', 'tiktok', 'tiki', 'sendo'];
  return platforms[hash % platforms.length];
};

export default function InvoiceTrackingPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Use global date range context
  const { dateRange } = useDateRange();
  const { invoices, isLoading } = useInvoiceTracking(dateRange);
  const { stats } = useCollectionStats(dateRange);

  // Get unique platforms for filter dropdown
  const platforms = ['shopee', 'lazada', 'tiktok', 'tiki', 'sendo'];
  
  const filteredInvoices = invoices?.filter(inv => {
    const platform = getPlatformFromInvoice(inv.id);
    const orderCode = generateOrderCode(inv.id, inv.invoice_number);
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchesPlatform = customerFilter === 'all' || platform === customerFilter;
    const matchesSearch = searchQuery === '' || 
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orderCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPlatform && matchesSearch;
  }) || [];

  const handleViewDetail = (invoice: any) => {
    setSelectedInvoice(invoice);
    setDetailDialogOpen(true);
  };

  const collectionRate = stats.total > 0 ? (stats.collected / stats.total) * 100 : 0;

  return (
    <>
      <Helmet>
        <title>Theo dõi & Thu hồi | Bluecore Finance</title>
        <meta name="description" content="Theo dõi và thu hồi công nợ" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center">
              <FileSearch className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Theo dõi & Thu hồi</h1>
              <p className="text-muted-foreground">Invoice Tracking & Collection</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <QuickDateSelector />
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Xuất báo cáo
            </Button>
            <Button size="sm">
              <Send className="w-4 h-4 mr-2" />
              Gửi nhắc nợ hàng loạt
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : (
            [
              { label: 'Tổng công nợ', value: stats.total, color: 'text-foreground' },
              { label: 'Đã thu', value: stats.collected, color: 'text-success' },
              { label: 'Chờ thu', value: stats.pending, color: 'text-warning' },
              { label: 'Quá hạn', value: stats.overdue, color: 'text-destructive' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4 bg-card shadow-card">
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className={cn('text-xl font-bold', stat.color)}>
                    {formatCurrency(stat.value)}
                  </p>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Collection Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="data-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Tiến độ thu hồi tháng này</h3>
            <Badge variant="outline">{collectionRate.toFixed(1)}%</Badge>
          </div>
          <Progress value={collectionRate} className="h-3" />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>Đã thu: {formatCurrency(stats.collected)}</span>
            <span>Mục tiêu: {formatCurrency(stats.total)}</span>
          </div>
        </motion.div>

        {/* Invoice List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="data-card"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="font-semibold text-lg">Danh sách hóa đơn</h3>
            <div className="flex flex-wrap gap-3">
              <Input 
                placeholder="Tìm kiếm mã HĐ, khách hàng..." 
                className="w-64" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Nền tảng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả nền tảng</SelectItem>
                  {platforms.map(platform => (
                    <SelectItem key={platform} value={platform}>
                      {platformConfig[platform as keyof typeof platformConfig]?.label || platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="draft">Nháp</SelectItem>
                  <SelectItem value="sent_cqt">Đã gửi CQT</SelectItem>
                  <SelectItem value="signed">Đã ký</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Không có hóa đơn nào</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Mã HĐ</th>
                    <th className="text-left py-3 px-4 font-semibold">Mã đơn hàng</th>
                    <th className="text-left py-3 px-4 font-semibold">Nền tảng</th>
                    <th className="text-left py-3 px-4 font-semibold">Ngày tạo đơn</th>
                    <th className="text-right py-3 px-4 font-semibold">Số tiền</th>
                    <th className="text-left py-3 px-4 font-semibold">Trạng thái</th>
                    <th className="text-right py-3 px-4 font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const status = invoice.status || 'draft';
                    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
                    const StatusIcon = config.icon;
                    const platform = getPlatformFromInvoice(invoice.id);
                    const platformCfg = platformConfig[platform as keyof typeof platformConfig] || platformConfig.other;
                    const orderCode = generateOrderCode(invoice.id, invoice.invoice_number);
                    
                    return (
                      <tr key={invoice.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <Link to={`/invoices/${invoice.id}`} className="font-mono text-sm font-medium hover:text-primary">
                            {invoice.invoice_number}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm">{orderCode}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', platformCfg.bg, platformCfg.color)}>
                            {platformCfg.label}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm">{formatDate(invoice.issue_date)}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {formatCurrency(invoice.total_amount)}
                        </td>
                        <td className="py-3 px-4">
                          <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.bg, config.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleViewDetail(invoice)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {status === 'draft' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Gửi CQT">
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        {/* Order Detail Dialog */}
        <InvoiceOrderDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          invoice={selectedInvoice}
          orderCode={selectedInvoice ? generateOrderCode(selectedInvoice.id, selectedInvoice.invoice_number) : ''}
          platform={selectedInvoice ? getPlatformFromInvoice(selectedInvoice.id) : 'other'}
          platformLabel={selectedInvoice ? (platformConfig[getPlatformFromInvoice(selectedInvoice.id) as keyof typeof platformConfig]?.label || 'Khác') : 'Khác'}
        />
      </div>
    </>
  );
}
