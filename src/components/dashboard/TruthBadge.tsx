/**
 * Truth Badge Component
 * 
 * Displays truth level for SSOT metrics:
 * - SETTLED: Bank/Manual/Accounting authority (green)
 * - PROVISIONAL: Rule-based forecast (amber)
 * 
 * With explain button that opens details modal.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CheckCircle2, 
  Clock, 
  Info, 
  Building2,
  Calculator,
  FileText,
  Wallet,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSnapshotExplanation, type DecisionSnapshot } from '@/hooks/useDecisionSnapshots';
import { formatVND, formatVNDCompact } from '@/lib/formatters';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface TruthBadgeProps {
  truthLevel: 'settled' | 'provisional';
  authority: string;
  confidence?: number;
  snapshotId?: string | null;
  showExplain?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function TruthBadge({
  truthLevel,
  authority,
  confidence = 100,
  snapshotId,
  showExplain = true,
  size = 'sm',
  className,
}: TruthBadgeProps) {
  const [isExplainOpen, setIsExplainOpen] = useState(false);

  const isSettled = truthLevel === 'settled';
  
  const badgeConfig = isSettled
    ? {
        icon: <CheckCircle2 className={cn('h-3 w-3', size === 'md' && 'h-4 w-4')} />,
        label: `SETTLED`,
        sublabel: `(${authority})`,
        className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20',
      }
    : {
        icon: <Clock className={cn('h-3 w-3', size === 'md' && 'h-4 w-4')} />,
        label: `PROVISIONAL`,
        sublabel: confidence < 100 ? `(${confidence}%)` : `(${authority})`,
        className: 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20',
      };

  return (
    <>
      <div className={cn('inline-flex items-center gap-1', className)}>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] px-1.5 py-0 h-5 font-medium cursor-default',
            size === 'md' && 'text-xs px-2 h-6',
            badgeConfig.className
          )}
        >
          <span className="flex items-center gap-1">
            {badgeConfig.icon}
            {badgeConfig.label}
            <span className="opacity-70">{badgeConfig.sublabel}</span>
          </span>
        </Badge>
        
        {showExplain && snapshotId && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded-full hover:bg-muted"
            onClick={() => setIsExplainOpen(true)}
          >
            <Info className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </div>

      {snapshotId && (
        <ExplainDialog
          snapshotId={snapshotId}
          open={isExplainOpen}
          onOpenChange={setIsExplainOpen}
        />
      )}
    </>
  );
}

interface ExplainDialogProps {
  snapshotId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ExplainDialog({ snapshotId, open, onOpenChange }: ExplainDialogProps) {
  const { data: explanation, isLoading } = useSnapshotExplanation(open ? snapshotId : null);

  const metricLabels: Record<string, string> = {
    cash_today: 'Cash hôm nay',
    cash_flow_today: 'Dòng tiền hôm nay',
    cash_next_7d: 'Dự báo cash 7 ngày',
  };

  const authorityIcons: Record<string, React.ReactNode> = {
    BANK: <Building2 className="h-4 w-4" />,
    MANUAL: <FileText className="h-4 w-4" />,
    RULE: <Calculator className="h-4 w-4" />,
    ACCOUNTING: <Wallet className="h-4 w-4" />,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Giải thích số liệu
          </DialogTitle>
          <DialogDescription>
            Chi tiết nguồn gốc và cách tính của metric này
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : explanation ? (
          <div className="space-y-4">
            {/* Metric Info */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Metric</span>
                <Badge variant="outline">
                  {metricLabels[explanation.formatted.metricCode] || explanation.formatted.metricCode}
                </Badge>
              </div>
              <div className="text-2xl font-bold">
                {formatVND(explanation.formatted.value)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <TruthBadge
                  truthLevel={explanation.formatted.truthLevel as 'settled' | 'provisional'}
                  authority={explanation.formatted.authority}
                  confidence={explanation.formatted.confidence}
                  showExplain={false}
                  size="md"
                />
              </div>
            </div>

            {/* Authority & Source */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  {authorityIcons[explanation.formatted.authority] || <AlertCircle className="h-4 w-4" />}
                  <span className="text-xs text-muted-foreground">Nguồn xác thực</span>
                </div>
                <p className="font-medium">{explanation.formatted.authority}</p>
              </div>
              <div className="p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs text-muted-foreground">Thời điểm</span>
                </div>
                <p className="font-medium text-sm">
                  {format(new Date(explanation.formatted.asOf), 'HH:mm dd/MM', { locale: vi })}
                </p>
              </div>
            </div>

            {/* Formula */}
            {explanation.formatted.formula && (
              <div className="p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Công thức</span>
                </div>
                <code className="text-xs bg-muted px-2 py-1 rounded block">
                  {explanation.formatted.formula}
                </code>
              </div>
            )}

            {/* Assumptions (for provisional) */}
            {explanation.formatted.assumptions && (explanation.formatted.assumptions as unknown[]).length > 0 && (
              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-500">Giả định (Assumptions)</span>
                </div>
                <ul className="space-y-1.5">
                  {(explanation.formatted.assumptions as Array<{ factor: string; value: number; description: string }>).map((assumption, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-amber-500">•</span>
                      <span>
                        <strong>{assumption.factor}:</strong> {assumption.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Evidence (for settled) */}
            {explanation.formatted.evidence && (explanation.formatted.evidence as unknown[]).length > 0 && (
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-500">Evidence</span>
                </div>
                <ul className="space-y-1.5">
                  {(explanation.formatted.evidence as Array<{ type: string; name?: string; balance?: number; id: string }>).map((ev, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-emerald-500">•</span>
                      <span>
                        {ev.type === 'bank_account' ? (
                          <>
                            {ev.name}: {formatVNDCompact(ev.balance || 0)}
                          </>
                        ) : (
                          JSON.stringify(ev)
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Data Sources */}
            {explanation.formatted.sources && explanation.formatted.sources.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Nguồn dữ liệu:</span>
                {explanation.formatted.sources.map((source, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {source}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Không tìm thấy thông tin giải thích
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default TruthBadge;
