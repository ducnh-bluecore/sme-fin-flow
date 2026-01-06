import { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatVND, formatDate } from '@/lib/formatters';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MatchResult {
  invoiceId: string;
  transactionId: string;
  confidence: number;
  matchType: 'exact' | 'partial' | 'suggested';
  reason: string;
}

interface AutoMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchResults: MatchResult[];
  invoices: any[];
  transactions: any[];
  onApplyMatch: (match: MatchResult) => void;
  onApplyAll: () => void;
  isMatching: boolean;
}

export const AutoMatchDialog = forwardRef<HTMLDivElement, AutoMatchDialogProps>(
  function AutoMatchDialog({
    open,
    onOpenChange,
    matchResults,
    invoices,
    transactions,
    onApplyMatch,
    onApplyAll,
    isMatching
  }, ref) {
  const getInvoice = (id: string) => invoices?.find(i => i.id === id);
  const getTransaction = (id: string) => transactions?.find(t => t.id === id);

  const highConfidenceCount = matchResults.filter(m => m.confidence >= 80).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Kết quả đối soát tự động
          </DialogTitle>
          <DialogDescription>
            Hệ thống đã phân tích và tìm thấy {matchResults.length} giao dịch có thể khớp với hóa đơn
          </DialogDescription>
        </DialogHeader>

        {isMatching ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Đang phân tích và tìm kiếm...</p>
          </div>
        ) : matchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="w-12 h-12 text-success mb-4" />
            <p className="font-medium">Không tìm thấy giao dịch cần đối soát</p>
            <p className="text-sm text-muted-foreground">Tất cả giao dịch đã được khớp hoặc không có giao dịch phù hợp</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg mb-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Độ tin cậy cao (≥80%)</p>
                <p className="text-2xl font-bold text-success">{highConfidenceCount}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Cần xem xét</p>
                <p className="text-2xl font-bold text-warning">{matchResults.length - highConfidenceCount}</p>
              </div>
              <Button 
                onClick={onApplyAll}
                disabled={highConfidenceCount === 0}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Khớp tất cả ({highConfidenceCount})
              </Button>
            </div>

            {/* Match List */}
            <ScrollArea className="h-[400px] pr-4">
              <AnimatePresence>
                <div className="space-y-3">
                  {matchResults.map((match, index) => {
                    const invoice = getInvoice(match.invoiceId);
                    const transaction = getTransaction(match.transactionId);

                    if (!invoice || !transaction) return null;

                    return (
                      <motion.div
                        key={match.transactionId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 border border-border rounded-lg bg-card"
                      >
                        <div className="flex items-start gap-4">
                          {/* Confidence */}
                          <div className="text-center">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                              match.confidence >= 80 ? 'bg-success/10' : 
                              match.confidence >= 60 ? 'bg-warning/10' : 'bg-muted'
                            }`}>
                              <span className={`text-lg font-bold ${
                                match.confidence >= 80 ? 'text-success' : 
                                match.confidence >= 60 ? 'text-warning' : 'text-muted-foreground'
                              }`}>
                                {match.confidence}%
                              </span>
                            </div>
                            <Badge 
                              variant={match.matchType === 'exact' ? 'default' : 'secondary'}
                              className="mt-2 text-[10px]"
                            >
                              {match.matchType === 'exact' ? 'Khớp chính xác' : 
                               match.matchType === 'partial' ? 'Khớp một phần' : 'Gợi ý'}
                            </Badge>
                          </div>

                          {/* Transaction */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px]">
                                {transaction.bank_accounts?.bank_name || 'Bank'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(transaction.transaction_date)}
                              </span>
                            </div>
                            <p className="text-sm font-medium truncate">
                              {transaction.description || transaction.reference}
                            </p>
                            <p className="text-lg font-bold text-primary">
                              {formatVND(Math.abs(transaction.amount))}
                            </p>
                          </div>

                          <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-4" />

                          {/* Invoice */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{invoice.invoice_number}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {invoice.customers?.name}
                            </p>
                            <p className="text-sm mt-1">
                              Còn lại: {formatVND(invoice.total_amount - (invoice.paid_amount || 0))}
                            </p>
                          </div>

                          {/* Action */}
                          <Button
                            size="sm"
                            variant={match.confidence >= 80 ? 'default' : 'outline'}
                            onClick={() => onApplyMatch(match)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Khớp
                          </Button>
                        </div>

                        {/* Reason */}
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Lý do:</span> {match.reason}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
});
