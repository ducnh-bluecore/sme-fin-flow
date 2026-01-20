import { useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  GripVertical, 
  ArrowRight,
  CheckCheck,
  Clock,
  XCircle,
  Search,
  Sparkles,
  Loader2,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatVND, formatDate } from '@/lib/formatters';
import { useAutoMatchSSOT, type InvoiceSettledStatus, type BankTxnMatchState } from '@/hooks/useReconciliationSSOT';
import { AutoMatchDialog } from './AutoMatchDialog';

const matchStatusConfig = {
  matched: { label: 'Khớp hoàn toàn', icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/10' },
  partial: { label: 'Khớp một phần', icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10' },
  unmatched: { label: 'Chưa khớp', icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  pending: { label: 'Chờ xử lý', icon: Circle, color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

interface ReconciliationItemProps {
  invoice: any;
  matchedTransactions: any[];
  settledStatus?: InvoiceSettledStatus;
  onMatch?: (invoiceId: string, transactionId: string) => void;
}

function ReconciliationItem({ invoice, matchedTransactions, settledStatus }: ReconciliationItemProps) {
  // Use SSOT settled status if available, otherwise fallback to invoice fields
  const paidAmount = settledStatus?.settled_paid_amount ?? (invoice.paid_amount || 0);
  const remaining = settledStatus?.remaining_amount ?? (invoice.total_amount - paidAmount);
  const matchPercent = invoice.total_amount > 0 ? (paidAmount / invoice.total_amount) * 100 : 0;
  
  // Derive match status from SSOT view
  const matchStatus = settledStatus 
    ? (settledStatus.settled_status === 'paid' ? 'matched' : 
       settledStatus.settled_status === 'partially_paid' ? 'partial' : 'unmatched')
    : (paidAmount >= invoice.total_amount ? 'matched' : 
       paidAmount > 0 ? 'partial' : 
       invoice.status === 'draft' ? 'pending' : 'unmatched');
  const config = matchStatusConfig[matchStatus];
  const StatusIcon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border border-border rounded-xl bg-card hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.bgColor)}>
          <StatusIcon className={cn('w-5 h-5', config.color)} />
        </div>

        {/* Invoice Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{invoice.invoice_number}</span>
            <Badge variant="outline" className="text-[10px]">
              {config.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{invoice.customers?.name || 'N/A'}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Ngày: {formatDate(invoice.issue_date)}</span>
            <span>Hạn: {formatDate(invoice.due_date)}</span>
          </div>
        </div>

        {/* Amount Info */}
        <div className="text-right">
          <p className="text-lg font-bold vnd-value">{formatVND(invoice.total_amount)}</p>
          {paidAmount > 0 && (
            <p className="text-xs text-muted-foreground">
              Đã thu: {formatVND(paidAmount)}
            </p>
          )}
          {remaining > 0 && matchStatus !== 'matched' && (
            <p className="text-xs text-destructive">
              Còn lại: {formatVND(remaining)}
            </p>
          )}
        </div>
      </div>

      {/* Match Progress */}
      {matchStatus !== 'matched' && matchStatus !== 'pending' && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Tiến độ đối soát</span>
            <span className="font-medium">{matchPercent.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${matchPercent}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={cn('h-full rounded-full', 
                matchPercent === 100 ? 'bg-success' : 
                matchPercent > 50 ? 'bg-warning' : 'bg-destructive'
              )}
            />
          </div>
        </div>
      )}

      {/* Matched Transactions */}
      {matchedTransactions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Giao dịch đã khớp</p>
          <div className="space-y-2">
            {matchedTransactions.map((txn) => (
              <div key={txn.id} className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-2">
                <Badge variant="outline" className="text-[10px]">
                  {txn.bank_accounts?.bank_name || 'Bank'}
                </Badge>
                <span className="flex-1 truncate text-muted-foreground">{txn.reference}</span>
                <span className="font-medium">{formatVND(Math.abs(txn.amount))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-Way Match Status */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <div className={cn('w-4 h-4 rounded-full flex items-center justify-center',
              paidAmount > 0 ? 'bg-success' : 'bg-muted'
            )}>
              {paidAmount > 0 ? (
                <CheckCheck className="w-2.5 h-2.5 text-success-foreground" />
              ) : (
                <Circle className="w-2.5 h-2.5 text-muted-foreground" />
              )}
            </div>
            <span className="text-muted-foreground">Invoice ↔ Payment</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn('w-4 h-4 rounded-full flex items-center justify-center',
              matchedTransactions.length > 0 ? 'bg-success' : 'bg-muted'
            )}>
              {matchedTransactions.length > 0 ? (
                <CheckCheck className="w-2.5 h-2.5 text-success-foreground" />
              ) : (
                <Circle className="w-2.5 h-2.5 text-muted-foreground" />
              )}
            </div>
            <span className="text-muted-foreground">Invoice ↔ Bank</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn('w-4 h-4 rounded-full flex items-center justify-center',
              invoice.status !== 'draft' ? 'bg-success' : 'bg-muted'
            )}>
              {invoice.status !== 'draft' ? (
                <CheckCheck className="w-2.5 h-2.5 text-success-foreground" />
              ) : (
                <Circle className="w-2.5 h-2.5 text-muted-foreground" />
              )}
            </div>
            <span className="text-muted-foreground">Invoice ↔ GL</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Unmatched Transaction Card
interface UnmatchedTransactionProps {
  transaction: any;
}

function UnmatchedTransactionCard({ transaction }: UnmatchedTransactionProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02 }}
      className="p-3 border border-border rounded-lg bg-card cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all"
    >
      <div className="flex items-center gap-3">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px]">
              {transaction.bank_accounts?.bank_name || 'Bank'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(transaction.transaction_date)}
            </span>
          </div>
          <p className="text-sm truncate">{transaction.description || transaction.reference}</p>
        </div>
        <span className="font-semibold text-sm">{formatVND(Math.abs(transaction.amount))}</span>
      </div>
    </motion.div>
  );
}

export function ReconciliationBoard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAutoMatchDialog, setShowAutoMatchDialog] = useState(false);

  // Use SSOT hook instead of legacy hook
  const { 
    isMatching, 
    matchResults, 
    runAutoMatch, 
    applyMatch, 
    getStats,
    invoices,
    transactions,
    // SSOT data
    invoiceStatus,
    bankTxnState,
  } = useAutoMatchSSOT();

  const stats = getStats();

  // Create lookup maps from SSOT views
  const invoiceStatusMap = new Map(
    (invoiceStatus || []).map(s => [s.invoice_id, s])
  );
  const bankTxnStateMap = new Map(
    (bankTxnState || []).map(s => [s.bank_transaction_id, s])
  );

  const filteredInvoices = (invoices || []).filter((inv) => {
    // Use SSOT status for filtering
    const ssotStatus = invoiceStatusMap.get(inv.id);
    const matchStatus = ssotStatus 
      ? (ssotStatus.settled_status === 'paid' ? 'matched' : 
         ssotStatus.settled_status === 'partially_paid' ? 'partial' : 'unmatched')
      : 'unmatched';

    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || matchStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Use SSOT view for unmatched transactions
  const unmatchedTransactions = (transactions || []).filter((t) => {
    const txnState = bankTxnStateMap.get(t.id);
    return txnState ? txnState.match_state === 'unmatched' : t.match_status === 'unmatched';
  });

  const getMatchedTransactions = (invoiceId: string) => 
    (transactions || []).filter((t) => t.matched_invoice_id === invoiceId);

  const handleAutoMatch = async () => {
    await runAutoMatch(false);
    setShowAutoMatchDialog(true);
  };

  const handleApplyAll = async () => {
    const highConfidenceMatches = matchResults.filter(m => m.confidence >= 80);
    for (const match of highConfidenceMatches) {
      await applyMatch(match);
    }
    setShowAutoMatchDialog(false);
  };

  const isLoading = !invoices || !transactions;

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm hóa đơn, khách hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button 
              onClick={handleAutoMatch}
              disabled={isMatching || isLoading}
              className="gap-2"
            >
              {isMatching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Auto-match
            </Button>
          </div>

          <div className="flex gap-1">
            {['all', 'unmatched', 'partial', 'matched'].map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="text-xs"
              >
                {status === 'all' ? 'Tất cả' : 
                 status === 'unmatched' ? 'Chưa khớp' :
                 status === 'partial' ? 'Một phần' : 'Đã khớp'}
              </Button>
            ))}
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-xl" />
                ))
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Không có hóa đơn nào</p>
                </div>
              ) : (
                filteredInvoices.map((invoice) => (
                  <ReconciliationItem
                    key={invoice.id}
                    invoice={invoice}
                    matchedTransactions={getMatchedTransactions(invoice.id)}
                    settledStatus={invoiceStatusMap.get(invoice.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Unmatched Transactions */}
        <div className="space-y-4">
          <div className="data-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Giao dịch chờ khớp</h3>
                <p className="text-xs text-muted-foreground">Kéo thả để khớp hóa đơn</p>
              </div>
              <Badge variant="secondary">{unmatchedTransactions.length}</Badge>
            </div>

            <ScrollArea className="h-[500px]">
              <div className="space-y-2 pr-2">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))
                ) : unmatchedTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-success" />
                    <p className="text-sm">Tất cả giao dịch đã được khớp!</p>
                  </div>
                ) : (
                  unmatchedTransactions.map((transaction) => (
                    <UnmatchedTransactionCard key={transaction.id} transaction={transaction} />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Quick Stats */}
          <div className="data-card">
            <h4 className="font-semibold text-sm mb-3">Thống kê đối soát</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tỷ lệ tự động khớp</span>
                <span className="font-semibold text-success">{stats.autoMatchRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hóa đơn đã khớp</span>
                <span className="font-semibold">{stats.matchedInvoices}/{stats.totalInvoices}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Giao dịch chờ xử lý</span>
                <span className="font-semibold text-warning">{stats.unmatchedTransactions}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AutoMatchDialog
        open={showAutoMatchDialog}
        onOpenChange={setShowAutoMatchDialog}
        matchResults={matchResults}
        invoices={invoices || []}
        transactions={transactions || []}
        onApplyMatch={applyMatch}
        onApplyAll={handleApplyAll}
        isMatching={isMatching}
      />
    </TooltipProvider>
  );
}
