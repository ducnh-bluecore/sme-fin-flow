import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface ResearchCustomer {
  id: string;
  anonymousId: string;
  behaviorStatus: 'active' | 'dormant' | 'at_risk' | 'new';
  totalSpend: number;
  orderCount: number;
  lastPurchase: Date;
  repurchaseCycle: number;
  aov: number;
  trend: 'up' | 'down' | 'stable';
  returnRate: number;
  marginContribution: number;
}

interface CustomerResearchTableProps {
  customers: ResearchCustomer[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const behaviorLabels: Record<string, { label: string; className: string }> = {
  active: { label: 'Hoạt động', className: 'bg-success/10 text-success border-success/20' },
  dormant: { label: 'Ngủ đông', className: 'bg-muted text-muted-foreground border-border' },
  at_risk: { label: 'Có rủi ro', className: 'bg-warning/10 text-warning border-warning/20' },
  new: { label: 'Mới', className: 'bg-primary/10 text-primary border-primary/20' },
};

function formatCurrency(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString('vi-VN');
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-success" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function CustomerEvidenceDialog({ 
  customer, 
  open, 
  onOpenChange 
}: { 
  customer: ResearchCustomer | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Bằng chứng khách hàng</DialogTitle>
            <Badge variant="outline" className="text-xs font-normal">
              Chỉ đọc
            </Badge>
          </div>
          <DialogDescription>
            Dữ liệu phân tích cho mã khách: {customer.anonymousId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Tổng chi tiêu</p>
              <p className="text-xl font-semibold">{formatCurrency(customer.totalSpend)}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Số đơn hàng</p>
              <p className="text-xl font-semibold">{customer.orderCount}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">AOV</p>
              <p className="text-xl font-semibold">{formatCurrency(customer.aov)}</p>
            </div>
          </div>

          <Separator />

          {/* Behavior Profile */}
          <div>
            <h4 className="text-sm font-medium mb-3">Hồ sơ hành vi</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Trạng thái</span>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", behaviorLabels[customer.behaviorStatus].className)}
                >
                  {behaviorLabels[customer.behaviorStatus].label}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Lần mua gần nhất</span>
                <span className="text-sm font-medium">{formatDate(customer.lastPurchase)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Chu kỳ mua lại</span>
                <span className="text-sm font-medium">{Math.round(customer.repurchaseCycle)} ngày</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Xu hướng giá trị</span>
                <div className="flex items-center gap-2">
                  <TrendIndicator trend={customer.trend} />
                  <span className="text-sm font-medium">
                    {customer.trend === 'up' ? 'Tăng' : customer.trend === 'down' ? 'Giảm' : 'Ổn định'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Risk Indicators */}
          <div>
            <h4 className="text-sm font-medium mb-3">Chỉ số rủi ro</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tỷ lệ hoàn trả</span>
                <span className={cn(
                  "text-sm font-medium",
                  customer.returnRate > 15 && "text-destructive"
                )}>
                  {customer.returnRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Đóng góp biên lợi nhuận</span>
                <span className={cn(
                  "text-sm font-medium",
                  customer.marginContribution > 0 ? "text-success" : "text-destructive"
                )}>
                  {formatCurrency(customer.marginContribution)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Dữ liệu nghiên cứu • Không hiển thị thông tin liên hệ • Không hành động
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerResearchTable({
  customers,
  totalCount,
  page,
  pageSize,
  onPageChange,
  searchTerm,
  onSearchChange,
}: CustomerResearchTableProps) {
  const navigate = useNavigate();
  const [selectedCustomer, setSelectedCustomer] = useState<ResearchCustomer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  const handleViewEvidence = (customer: ResearchCustomer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleOpenAuditView = (customer: ResearchCustomer) => {
    navigate(`/cdp/audit/${customer.id}`);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Danh sách khách hàng</CardTitle>
            <Input
              placeholder="Tìm theo mã khách..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="max-w-xs h-8"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[140px]">
                  <div className="flex items-center gap-1">
                    Mã khách
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">Trạng thái</TableHead>
                <TableHead className="text-right">Tổng chi tiêu</TableHead>
                <TableHead className="text-center">Số đơn</TableHead>
                <TableHead className="text-right">Lần mua gần nhất</TableHead>
                <TableHead className="text-center">Chu kỳ mua</TableHead>
                <TableHead className="text-center">Xu hướng</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow 
                  key={customer.id} 
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => handleViewEvidence(customer)}
                >
                  <TableCell className="font-mono text-sm">
                    {customer.anonymousId}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs font-normal",
                        behaviorLabels[customer.behaviorStatus].className
                      )}
                    >
                      {behaviorLabels[customer.behaviorStatus].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(customer.totalSpend)}
                  </TableCell>
                  <TableCell className="text-center">
                    {customer.orderCount}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDate(customer.lastPurchase)}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {Math.round(customer.repurchaseCycle)}d
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <TrendIndicator trend={customer.trend} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewEvidence(customer);
                        }}
                        title="Xem bằng chứng nhanh"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAuditView(customer);
                        }}
                        title="Mở hồ sơ kiểm chứng"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Hiển thị {startIndex}-{endIndex} trong tổng {totalCount.toLocaleString()} khách
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CustomerEvidenceDialog
        customer={selectedCustomer}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
