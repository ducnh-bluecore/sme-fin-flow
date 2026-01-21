import { useState } from 'react';
import { 
  Clock, 
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { DecisionCard as DecisionCardType } from '@/hooks/useDecisionCards';
import { differenceInHours, format } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * DECISION DOCUMENT
 * 
 * Design Principles:
 * - Heavier than alerts - feels like signing a document
 * - No animations, no gamification
 * - Decisions are irreversible
 * - Dismissal is a logged decision
 * - Snooze requires justification
 * 
 * Visual Weight:
 * - Thick borders, solid backgrounds
 * - Document-like typography
 * - Formal language
 * - Signature-style action buttons
 */

// Format currency
const formatCurrency = (amount: number): string => {
  if (Math.abs(amount) >= 1e9) return `${(amount / 1e9).toFixed(1)} tỷ`;
  if (Math.abs(amount) >= 1e6) return `${(amount / 1e6).toFixed(0)} triệu`;
  return amount.toLocaleString('vi-VN');
};

interface DecisionDocumentProps {
  card: DecisionCardType;
  onDecide: (actionType: string, comment?: string) => void;
  onDismiss: (reason: string, comment: string) => void;
  onSnooze: (hours: number, reason: string) => void;
  isProcessing?: boolean;
}

export function DecisionDocument({ 
  card, 
  onDecide, 
  onDismiss, 
  onSnooze,
  isProcessing = false 
}: DecisionDocumentProps) {
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const [showSnoozeDialog, setShowSnoozeDialog] = useState(false);
  const [dismissReason, setDismissReason] = useState('');
  const [snoozeReason, setSnoozeReason] = useState('');
  const [snoozeHours, setSnoozeHours] = useState(24);

  // Calculate time pressure
  const hoursUntilDeadline = Math.max(0, differenceInHours(new Date(card.deadline_at), new Date()));
  const isOverdue = hoursUntilDeadline === 0 && new Date(card.deadline_at) < new Date();
  const isCritical = hoursUntilDeadline < 4 || isOverdue;
  
  // Calculate daily loss if impact is negative
  const dailyLoss = card.impact_amount < 0 
    ? Math.abs(card.impact_amount) / Math.max(card.impact_window_days || 7, 1)
    : 0;

  // Get the recommended action
  const recommendedAction = card.actions?.find(a => a.is_recommended);
  const actionLabel = recommendedAction?.label || 'Xử lý';
  const actionType = recommendedAction?.action_type || 'INVESTIGATE';

  // Owner role display
  const ownerRoleLabel = {
    CEO: 'CEO',
    CFO: 'Giám đốc Tài chính',
    CMO: 'Giám đốc Marketing', 
    COO: 'Giám đốc Vận hành',
  }[card.owner_role] || card.owner_role;

  const handleDecide = () => {
    onDecide(actionType);
  };

  const handleDismiss = () => {
    if (!dismissReason.trim()) return;
    onDismiss('OTHER', dismissReason);
    setShowDismissDialog(false);
    setDismissReason('');
  };

  const handleSnooze = () => {
    if (!snoozeReason.trim()) return;
    onSnooze(snoozeHours, snoozeReason);
    setShowSnoozeDialog(false);
    setSnoozeReason('');
  };

  return (
    <>
      <div className={cn(
        "bg-slate-900 border-2 rounded-none",
        isCritical ? "border-red-600" : "border-slate-600",
        "shadow-lg"
      )}>
        
        {/* === DOCUMENT HEADER === */}
        <div className={cn(
          "px-6 py-4 border-b-2",
          isCritical ? "bg-red-950/50 border-red-600" : "bg-slate-800 border-slate-600"
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
                DECISION #{card.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-xs text-slate-500">
                Created: {format(new Date(card.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
              </p>
            </div>
            <div className={cn(
              "px-3 py-1.5 text-xs font-bold uppercase tracking-wide",
              card.priority === 'P1' ? "bg-red-600 text-white" :
              card.priority === 'P2' ? "bg-amber-600 text-black" :
              "bg-slate-600 text-white"
            )}>
              {card.priority === 'P1' ? 'URGENT' : card.priority === 'P2' ? 'IMPORTANT' : 'MONITOR'}
            </div>
          </div>
        </div>

        {/* === SECTION 1: CONTEXT (What went wrong) === */}
        <div className="px-6 py-5 border-b border-slate-700">
          <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-3">
            1. Situation
          </h2>
          <h1 className="text-xl font-semibold text-slate-100 mb-3 leading-tight">
            {card.question || card.title}
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            {card.entity_label}
          </p>
          
          {/* Key facts if available */}
          {card.facts && card.facts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-4">
                {card.facts.filter(f => f.is_primary).slice(0, 4).map((fact, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-slate-500">{fact.label}:</span>
                    <span className="text-slate-200 font-medium">{fact.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* === SECTION 2: IMPACT IF IGNORED === */}
        <div className="px-6 py-5 border-b border-slate-700">
          <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-3">
            2. Impact if no action
          </h2>
          
          <div className="flex items-baseline gap-2 mb-3">
            <span className={cn(
              "text-3xl font-bold tabular-nums",
              card.impact_amount < 0 ? "text-red-400" : "text-emerald-400"
            )}>
              ₫{formatCurrency(Math.abs(card.impact_amount))}
            </span>
            <span className="text-slate-500 text-sm">
              {card.impact_currency} within {card.impact_window_days || 7} days
            </span>
          </div>
          
          {dailyLoss > 0 && (
            <p className="text-sm text-red-400/80">
              Estimated loss: ₫{formatCurrency(dailyLoss)} per day without resolution
            </p>
          )}
          
          {card.impact_description && (
            <p className="text-sm text-slate-400 mt-2">
              {card.impact_description}
            </p>
          )}
        </div>

        {/* === SECTION 3: RECOMMENDED ACTION === */}
        <div className="px-6 py-5 border-b border-slate-700">
          <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-3">
            3. Recommended action
          </h2>
          
          <div className={cn(
            "p-4 border-l-4",
            actionType === 'STOP' || actionType === 'PAUSE' ? "border-red-500 bg-red-950/30" :
            actionType === 'SCALE' || actionType === 'SCALE_WITH_CONDITION' ? "border-emerald-500 bg-emerald-950/30" :
            "border-amber-500 bg-amber-950/30"
          )}>
            <p className="text-base font-semibold text-slate-100">
              {actionLabel}
            </p>
            {recommendedAction?.expected_outcome && (
              <p className="text-sm text-slate-400 mt-2">
                Expected outcome: {recommendedAction.expected_outcome}
              </p>
            )}
            {recommendedAction?.risk_note && (
              <p className="text-sm text-amber-400/80 mt-2 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {recommendedAction.risk_note}
              </p>
            )}
          </div>
        </div>

        {/* === SECTION 4: OWNERSHIP & DEADLINE === */}
        <div className="px-6 py-5 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Owner */}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Decision owner</p>
                  <p className="text-sm font-medium text-slate-200">{ownerRoleLabel}</p>
                </div>
              </div>
              
              {/* Deadline */}
              <div className="flex items-center gap-2">
                <Clock className={cn("h-4 w-4", isCritical ? "text-red-400" : "text-slate-500")} />
                <div>
                  <p className="text-xs text-slate-500">Decision deadline</p>
                  <p className={cn(
                    "text-sm font-medium",
                    isCritical ? "text-red-400" : "text-slate-200"
                  )}>
                    {isOverdue 
                      ? 'OVERDUE' 
                      : hoursUntilDeadline < 24 
                        ? `${hoursUntilDeadline} hours remaining`
                        : format(new Date(card.deadline_at), 'dd/MM/yyyy HH:mm', { locale: vi })
                    }
                  </p>
                </div>
              </div>
            </div>
            
            {/* Irreversible notice */}
            <div className="text-right">
              <p className="text-xs text-slate-500">
                This decision is irreversible
              </p>
            </div>
          </div>
        </div>

        {/* === ACTION BUTTONS === */}
        <div className="px-6 py-5 bg-slate-900">
          <div className="flex items-center justify-between">
            {/* Secondary actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSnoozeDialog(true)}
                disabled={isProcessing}
                className="border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <Pause className="h-4 w-4 mr-2" />
                Snooze
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDismissDialog(true)}
                disabled={isProcessing}
                className="border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Dismiss
              </Button>
            </div>
            
            {/* Primary action - heavier visual weight */}
            <Button
              size="lg"
              onClick={handleDecide}
              disabled={isProcessing}
              className={cn(
                "min-w-[160px] font-semibold text-base",
                actionType === 'STOP' || actionType === 'PAUSE' 
                  ? "bg-red-600 hover:bg-red-700 text-white" 
                  : actionType === 'SCALE' || actionType === 'SCALE_WITH_CONDITION'
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-amber-600 hover:bg-amber-700 text-black"
              )}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {actionLabel}
            </Button>
          </div>
        </div>
      </div>

      {/* === DISMISS DIALOG === */}
      <Dialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Record dismissal reason</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-slate-400 mb-4">
              Dismissing this decision will be logged permanently and cannot be undone.
            </p>
            
            <Label className="text-slate-300 text-sm">Dismissal reason *</Label>
            <Textarea
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              placeholder="Explain why this decision does not require action..."
              className="mt-2 bg-slate-800 border-slate-700 text-slate-200 min-h-[100px]"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDismissDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDismiss}
              disabled={!dismissReason.trim()}
            >
              Confirm dismissal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === SNOOZE DIALOG === */}
      <Dialog open={showSnoozeDialog} onOpenChange={setShowSnoozeDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Snooze decision</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-400">
              Every hour of delay may increase financial exposure. Please provide a valid justification.
            </p>
            
            <div>
              <Label className="text-slate-300 text-sm">Snooze duration</Label>
              <div className="flex gap-2 mt-2">
                {[4, 8, 24, 48].map((hours) => (
                  <Button
                    key={hours}
                    variant={snoozeHours === hours ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSnoozeHours(hours)}
                    className={snoozeHours === hours ? "" : "border-slate-700"}
                  >
                    {hours}h
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <Label className="text-slate-300 text-sm">Snooze reason *</Label>
              <Textarea
                value={snoozeReason}
                onChange={(e) => setSnoozeReason(e.target.value)}
                placeholder="Why is additional time needed? What information is pending?..."
                className="mt-2 bg-slate-800 border-slate-700 text-slate-200 min-h-[100px]"
              />
            </div>
            
            {dailyLoss > 0 && (
              <div className="p-3 bg-red-950/50 border border-red-900/50 rounded">
                <p className="text-sm text-red-400">
                  Snoozing for {snoozeHours}h may incur additional ~₫{formatCurrency(dailyLoss * (snoozeHours / 24))} in losses
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSnoozeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSnooze}
              disabled={!snoozeReason.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-black"
            >
              Confirm snooze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
