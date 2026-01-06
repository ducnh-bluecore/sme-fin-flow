import { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { formatVND, getDaysOverdue } from '@/lib/formatters';
import { useOverdueInvoices } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Phone } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface OverdueInvoicesTableProps {
  limit?: number;
}

const PLATFORMS = ['Shopee', 'Lazada', 'TikTok Shop', 'Tiki', 'Sendo'];

function OverdueInvoicesTableComponent({ limit }: OverdueInvoicesTableProps) {
  const { data: invoices, isLoading } = useOverdueInvoices(limit);
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  const overdueInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices
      .filter((inv) => inv.status === 'overdue' || getDaysOverdue(inv.due_date) > 0)
      .sort((a, b) => getDaysOverdue(b.due_date) - getDaysOverdue(a.due_date));
  }, [invoices]);

  // Add platform and order date to each invoice
  const enrichedInvoices = useMemo(() => {
    return overdueInvoices.map((invoice, index) => {
      const platform = PLATFORMS[index % PLATFORMS.length];
      const orderCode = `ORD-${invoice.invoice_number?.replace('INV-', '') || (index + 1).toString().padStart(6, '0')}`;
      // Generate order date (before due date)
      const orderDate = subDays(new Date(invoice.due_date), Math.floor(Math.random() * 10) + 7);
      
      return {
        ...invoice,
        platform,
        orderCode,
        orderDate,
      };
    });
  }, [overdueInvoices]);

  // Filter by platform
  const filteredInvoices = useMemo(() => {
    if (platformFilter === 'all') return enrichedInvoices;
    return enrichedInvoices.filter((inv) => inv.platform === platformFilter);
  }, [enrichedInvoices, platformFilter]);

  if (isLoading) {
    return (
      <div className="data-card">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="data-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Hóa đơn quá hạn</h3>
          <p className="text-sm text-muted-foreground">Overdue Invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Nền tảng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            Xem tất cả
          </Button>
        </div>
      </div>

      <ScrollArea className="h-64">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Hóa đơn</TableHead>
              <TableHead className="text-xs">Mã đơn hàng</TableHead>
              <TableHead className="text-xs">Ngày tạo đơn</TableHead>
              <TableHead className="text-xs">Nền tảng</TableHead>
              <TableHead className="text-xs text-right">Giá trị</TableHead>
              <TableHead className="text-xs text-center">Quá hạn</TableHead>
              <TableHead className="text-xs text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map((invoice, index) => {
              const daysOverdue = getDaysOverdue(invoice.due_date);
              const remaining = invoice.total_amount - (invoice.paid_amount || 0);
              
              return (
                <motion.tr
                  key={invoice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-muted/30"
                >
                  <TableCell className="py-3">
                    <span className="font-medium text-sm">{invoice.invoice_number}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{invoice.orderCode}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(invoice.orderDate, 'dd/MM/yyyy')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {invoice.platform}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <span className="text-sm font-medium vnd-value">
                        {formatVND(remaining)}
                      </span>
                      {(invoice.paid_amount || 0) > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          còn lại
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={daysOverdue > 60 ? 'destructive' : daysOverdue > 30 ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {daysOverdue} ngày
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
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </motion.div>
  );
}

export const OverdueInvoicesTable = memo(OverdueInvoicesTableComponent);
