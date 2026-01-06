import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { 
  Package, 
  FileText, 
  User, 
  Calendar, 
  DollarSign,
  Clock,
  Building2,
  Phone,
  Mail,
  MapPin,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoiceOrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    total_amount: number;
    subtotal: number;
    vat_amount: number;
    discount_amount: number;
    status: string;
    customers?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
  } | null;
  orderCode: string;
  platform: string;
  platformLabel: string;
}

const statusConfig = {
  draft: { label: 'Nháp', color: 'text-muted-foreground', bg: 'bg-muted' },
  sent_cqt: { label: 'Đã gửi CQT', color: 'text-warning', bg: 'bg-warning/10' },
  signed: { label: 'Đã ký', color: 'text-success', bg: 'bg-success/10' },
};

export function InvoiceOrderDetailDialog({ 
  open, 
  onOpenChange, 
  invoice,
  orderCode,
  platform,
  platformLabel
}: InvoiceOrderDetailDialogProps) {
  if (!invoice) return null;

  const status = invoice.status || 'draft';
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

  // Mock CQT submission time based on status
  const cqtSubmissionTime = status === 'sent_cqt' || status === 'signed' 
    ? new Date(new Date(invoice.issue_date).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Mock order creation time (usually before invoice)
  const orderCreationTime = new Date(new Date(invoice.issue_date).getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Chi tiết đơn hàng
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order & Invoice Codes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Mã đơn hàng</span>
              </div>
              <p className="font-mono font-semibold text-lg">{orderCode}</p>
              <Badge className={cn('mt-2', 
                platform === 'shopee' ? 'bg-orange-100 text-orange-600' :
                platform === 'lazada' ? 'bg-blue-100 text-blue-600' :
                platform === 'tiktok' ? 'bg-pink-100 text-pink-600' :
                platform === 'tiki' ? 'bg-cyan-100 text-cyan-600' :
                'bg-gray-100 text-gray-600'
              )}>
                {platformLabel}
              </Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Mã hóa đơn</span>
              </div>
              <p className="font-mono font-semibold text-lg">{invoice.invoice_number}</p>
              <div className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-2', config.bg, config.color)}>
                {config.label}
              </div>
            </div>
          </div>

          <Separator />

          {/* Customer Details */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Thông tin khách hàng
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Tên khách hàng</p>
                  <p className="font-medium">{invoice.customers?.name || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{invoice.customers?.email || 'customer@example.com'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Số điện thoại</p>
                  <p className="font-medium">{invoice.customers?.phone || '0901 234 567'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Địa chỉ</p>
                  <p className="font-medium">{invoice.customers?.address || '123 Nguyễn Huệ, Q.1, TP.HCM'}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Value */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Giá trị đơn hàng
            </h4>
            <div className="p-4 rounded-lg bg-muted/30 border space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Giá trị hàng hóa</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Thuế VAT (10%)</span>
                <span className="font-medium">{formatCurrency(invoice.vat_amount)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Giảm giá</span>
                  <span className="font-medium text-destructive">-{formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold">Tổng cộng</span>
                <span className="font-bold text-lg text-primary">{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Thời gian
            </h4>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Ngày tạo đơn hàng</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(orderCreationTime)} - {new Date(orderCreationTime).toLocaleTimeString('vi-VN')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 border">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="font-medium">Ngày lập hóa đơn</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(invoice.issue_date)} - {new Date(invoice.issue_date).toLocaleTimeString('vi-VN')}
                  </p>
                </div>
              </div>

              {cqtSubmissionTime ? (
                <div className="flex items-start gap-4 p-3 rounded-lg bg-success/5 border border-success/20">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <Send className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-success">Thời gian gửi CQT</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(cqtSubmissionTime)} - {new Date(cqtSubmissionTime).toLocaleTimeString('vi-VN')}
                    </p>
                    <p className="text-xs text-success mt-1">Đã gửi thành công đến Cơ quan Thuế</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 border border-dashed">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Send className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Chưa gửi CQT</p>
                    <p className="text-sm text-muted-foreground">
                      Hóa đơn chưa được gửi đến Cơ quan Thuế
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
