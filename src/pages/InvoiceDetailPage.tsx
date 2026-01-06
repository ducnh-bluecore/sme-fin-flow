import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  ArrowLeft,
  Download,
  Printer,
  Send,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Mail,
  Phone,
  Building2,
  User,
  MapPin,
  Calendar,
  CreditCard,
  Receipt,
  FileCheck,
  MessageSquare,
  History,
  MoreHorizontal,
  Copy,
  Banknote,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter, 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useInvoiceDetail } from '@/hooks/useInvoiceData';
import { toast } from '@/hooks/use-toast';

const statusConfig = {
  draft: { label: 'Nháp', icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted' },
  sent: { label: 'Đã gửi', icon: Send, color: 'text-info', bg: 'bg-info/10' },
  issued: { label: 'Chờ thanh toán', icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  paid: { label: 'Đã thanh toán', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  partial: { label: 'Thanh toán một phần', icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  pending: { label: 'Chờ thanh toán', icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  overdue: { label: 'Quá hạn', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  cancelled: { label: 'Đã hủy', icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
};

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  
  const { data: invoice, isLoading, error } = useInvoiceDetail(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertTriangle className="w-16 h-16 text-destructive" />
        <h2 className="text-xl font-semibold">Không tìm thấy hóa đơn</h2>
        <p className="text-muted-foreground">Hóa đơn không tồn tại hoặc đã bị xóa</p>
        <Button onClick={() => navigate('/invoice/tracking')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  const status = invoice.status || 'draft';
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  const StatusIcon = config.icon;
  
  // Calculate totals from items
  const subtotal = invoice.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || invoice.subtotal || 0;
  const vatAmount = invoice.items?.reduce((sum, item) => {
    const vatRate = item.vat_rate || 10;
    return sum + (item.amount * vatRate / 100);
  }, 0) || invoice.vat_amount || 0;
  
  // Calculate promotion discounts
  const promotionDiscount = invoice.promotions?.reduce((sum, promo) => {
    if (promo.discount_amount) return sum + promo.discount_amount;
    if (promo.discount_percent) return sum + (subtotal * promo.discount_percent / 100);
    return sum;
  }, 0) || invoice.discount_amount || 0;
  
  const totalAmount = invoice.total_amount || (subtotal + vatAmount - promotionDiscount);
  const paidAmount = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || invoice.paid_amount || 0;
  const remainingAmount = totalAmount - paidAmount;
  const paymentProgress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  
  const daysOverdue = useMemo(() => {
    if (status !== 'overdue') return 0;
    try {
      const dueDate = new Date(invoice.due_date);
      if (isNaN(dueDate.getTime())) return 0;
      return Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }, [status, invoice.due_date]);

  const handleCopy = () => {
    navigator.clipboard.writeText(invoice.invoice_number);
    toast({
      title: "Đã sao chép",
      description: `Mã hóa đơn ${invoice.invoice_number} đã được sao chép`,
    });
  };

  return (
    <>
      <Helmet>
        <title>Chi tiết hóa đơn {invoice.invoice_number} | Bluecore Finance</title>
        <meta name="description" content={`Chi tiết hóa đơn ${invoice.invoice_number}`} />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Link to="/invoice/tracking">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">{invoice.invoice_number}</h1>
                  <div className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium', config.bg, config.color)}>
                    <StatusIcon className="w-4 h-4" />
                    {config.label}
                  </div>
                  {daysOverdue > 0 && (
                    <Badge variant="destructive">Quá hạn {daysOverdue} ngày</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{invoice.customers?.name || 'Khách hàng không xác định'}</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              Sao chép
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              In
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Tải PDF
            </Button>
            <Button variant="outline" size="sm">
              <Send className="w-4 h-4 mr-2" />
              Gửi lại
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Chỉnh sửa
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Ghi nhận thanh toán
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hủy hóa đơn
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {status !== 'paid' && status !== 'cancelled' && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Banknote className="w-4 h-4 mr-2" />
                    Ghi nhận thanh toán
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ghi nhận thanh toán</DialogTitle>
                    <DialogDescription>
                      Ghi nhận khoản thanh toán cho hóa đơn {invoice.invoice_number}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Số tiền còn lại:</span>
                      <span className="font-semibold text-destructive">{formatCurrency(remainingAmount)}</span>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Hủy</Button>
                    <Button>Xác nhận</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Tổng giá trị', value: totalAmount, color: 'text-foreground', icon: Receipt },
            { label: 'Đã thanh toán', value: paidAmount, color: 'text-success', icon: CheckCircle2 },
            { label: 'Còn lại', value: remainingAmount, color: 'text-destructive', icon: AlertTriangle },
            { label: 'Tiến độ', value: `${paymentProgress.toFixed(0)}%`, isPercent: true, icon: Clock },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-card shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                      <p className={cn('text-xl font-bold', stat.color)}>
                        {stat.isPercent ? stat.value : formatCurrency(stat.value as number)}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <stat.icon className={cn('w-5 h-5', stat.color)} />
                    </div>
                  </div>
                  {stat.label === 'Tiến độ' && (
                    <Progress value={paymentProgress} className="h-2 mt-3" />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Invoice Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Chi tiết</TabsTrigger>
                <TabsTrigger value="payments">Thanh toán</TabsTrigger>
                <TabsTrigger value="activity">Lịch sử</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-6 mt-6">
                {/* Customer Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      Thông tin khách hàng
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold text-foreground">{invoice.customers?.name || 'N/A'}</p>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      {invoice.customers?.tax_code && (
                        <div className="flex items-start gap-2">
                          <FileCheck className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <span>MST: {invoice.customers.tax_code}</span>
                        </div>
                      )}
                      {invoice.customers?.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <span>{invoice.customers.address}</span>
                        </div>
                      )}
                      {invoice.customers?.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{invoice.customers.email}</span>
                        </div>
                      )}
                      {invoice.customers?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{invoice.customers.phone}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Line Items */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Chi tiết sản phẩm/dịch vụ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {invoice.items && invoice.items.length > 0 ? (
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Mô tả</TableHead>
                              <TableHead className="text-center w-20">SL</TableHead>
                              <TableHead className="text-right w-32">Đơn giá</TableHead>
                              <TableHead className="text-center w-16">VAT</TableHead>
                              <TableHead className="text-right w-36">Thành tiền</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoice.items.map((item, index) => {
                              const vatRate = item.vat_rate || 10;
                              const vatAmount = item.amount * vatRate / 100;
                              const finalAmount = item.amount + vatAmount;
                              
                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{index + 1}</TableCell>
                                  <TableCell>{item.description}</TableCell>
                                  <TableCell className="text-center">{item.quantity}</TableCell>
                                  <TableCell className="text-right font-mono">{formatCurrency(item.unit_price)}</TableCell>
                                  <TableCell className="text-center">{vatRate}%</TableCell>
                                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(finalAmount)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                          <TableFooter>
                            <TableRow>
                              <TableCell colSpan={5} className="text-right font-medium">Tạm tính:</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(subtotal)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell colSpan={5} className="text-right font-medium">Thuế VAT:</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(vatAmount)}</TableCell>
                            </TableRow>
                            {promotionDiscount > 0 && (
                              <TableRow className="bg-success/5">
                                <TableCell colSpan={5} className="text-right font-medium text-success">Khuyến mãi:</TableCell>
                                <TableCell className="text-right font-mono text-success">-{formatCurrency(promotionDiscount)}</TableCell>
                              </TableRow>
                            )}
                            <TableRow className="bg-primary/5">
                              <TableCell colSpan={5} className="text-right font-bold text-lg">TỔNG CỘNG:</TableCell>
                              <TableCell className="text-right font-mono font-bold text-lg text-primary">{formatCurrency(totalAmount)}</TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Chưa có chi tiết sản phẩm</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Dates & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        Thông tin ngày tháng
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ngày phát hành:</span>
                        <span className="font-medium">{formatDate(invoice.issue_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hạn thanh toán:</span>
                        <span className={cn("font-medium", daysOverdue > 0 && "text-destructive")}>{formatDate(invoice.due_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ngày tạo:</span>
                        <span className="font-medium">{formatDate(invoice.created_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                  {invoice.notes && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Ghi chú</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="payments" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Lịch sử thanh toán</span>
                      {status !== 'paid' && status !== 'cancelled' && (
                        <Button size="sm">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Ghi nhận thanh toán
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {invoice.payments && invoice.payments.length > 0 ? (
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Ngày</TableHead>
                              <TableHead>Phương thức</TableHead>
                              <TableHead>Mã tham chiếu</TableHead>
                              <TableHead className="text-right">Số tiền</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoice.payments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>{formatDate(payment.payment_date)}</TableCell>
                                <TableCell>{payment.payment_method || 'Chuyển khoản'}</TableCell>
                                <TableCell className="font-mono text-sm">{payment.reference_code || '-'}</TableCell>
                                <TableCell className="text-right font-mono font-semibold text-success">
                                  {formatCurrency(payment.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Chưa có thanh toán nào</p>
                      </div>
                    )}
                    
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tổng đã thanh toán:</span>
                        <span className="font-bold text-success">{formatCurrency(paidAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-muted-foreground">Còn lại:</span>
                        <span className="font-bold text-destructive">{formatCurrency(remainingAmount)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="activity" className="mt-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="w-4 h-4 text-primary" />
                      Lịch sử hoạt động
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Chức năng đang được phát triển</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Right Column - Quick Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Payment Progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tiến độ thanh toán</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Đã thanh toán</span>
                      <span className="font-semibold">{paymentProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={paymentProgress} className="h-3" />
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tổng hóa đơn:</span>
                      <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Đã thanh toán:</span>
                      <span className="font-semibold text-success">{formatCurrency(paidAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Còn lại:</span>
                      <span className="font-semibold text-destructive">{formatCurrency(remainingAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Thao tác nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {invoice.customers?.email && (
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="w-4 h-4 mr-2" />
                    Gửi email nhắc nợ
                  </Button>
                )}
                {invoice.customers?.phone && (
                  <Button variant="outline" className="w-full justify-start">
                    <Phone className="w-4 h-4 mr-2" />
                    Gọi điện: {invoice.customers.phone}
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Thêm ghi chú
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
}
