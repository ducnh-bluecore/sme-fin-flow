import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useDecisionCard, useDecideCard, useDismissCard } from '@/hooks/useDecisionCards';
import { ConfidenceBadge } from '@/components/decision-os/ConfidenceBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ArrowLeft, ChevronDown, Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatVND(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (absValue >= 1e9) return `${sign}${(absValue / 1e9).toFixed(1)}B VND`;
  if (absValue >= 1e6) return `${sign}${(absValue / 1e6).toFixed(0)}M VND`;
  if (absValue >= 1e3) return `${sign}${(absValue / 1e3).toFixed(0)}K VND`;
  return `${sign}${absValue.toFixed(0)} VND`;
}

const stateConfig = {
  OPEN: { label: 'Proposed', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  IN_PROGRESS: { label: 'Accepted', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  DECIDED: { label: 'Executed', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  DISMISSED: { label: 'Rejected', className: 'bg-slate-100 text-slate-800 border-slate-200' },
  EXPIRED: { label: 'Expired', className: 'bg-red-100 text-red-800 border-red-200' },
};

export default function DecisionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: card, isLoading } = useDecisionCard(id || null);
  const decideCard = useDecideCard();
  const dismissCard = useDismissCard();

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isActioning, setIsActioning] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">Decision not found</h3>
        <Button variant="outline" onClick={() => navigate('/decision-os/board')}>
          Back to Decision Board
        </Button>
      </div>
    );
  }

  const statusCfg = stateConfig[card.status] || stateConfig.OPEN;
  const recommendedAction = card.actions?.find(a => a.is_recommended);
  const canTakeAction = card.status === 'OPEN' || card.status === 'IN_PROGRESS';

  const handleAccept = async () => {
    if (!recommendedAction) return;
    setIsActioning(true);
    try {
      await decideCard.mutateAsync({
        cardId: card.id,
        actionType: recommendedAction.action_type as any,
        actionLabel: recommendedAction.label,
        comment: 'Accepted via Decision OS',
        cardSnapshot: card as any,
        selectedAction: {
          type: recommendedAction.action_type,
          label: recommendedAction.label,
        },
      });
      navigate('/decision-os/board');
    } finally {
      setIsActioning(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setIsActioning(true);
    try {
      await dismissCard.mutateAsync({
        cardId: card.id,
        reason: 'OTHER',
        comment: rejectReason,
        cardSnapshot: card as any,
      });
      setShowRejectDialog(false);
      navigate('/decision-os/board');
    } finally {
      setIsActioning(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{card.title} | BlueCore Decision OS</title>
      </Helmet>

      <div className="space-y-6">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/decision-os/board')}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Board
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={cn("text-xs", statusCfg.className)}>
                {statusCfg.label}
              </Badge>
              <ConfidenceBadge level={card.confidence} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {card.title}
            </h1>
          </div>
        </div>

        {/* Section 1: Decision Statement */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Decision Statement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base text-foreground leading-relaxed">
              {card.question}
            </p>
          </CardContent>
        </Card>

        {/* Section 2: Impact Explanation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Impact Explanation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Financial Impact</p>
                <p className={cn(
                  "text-xl font-bold",
                  card.impact_amount < 0 ? "text-destructive" : "text-emerald-600"
                )}>
                  {formatVND(card.impact_amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  over {card.impact_window_days} days
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Risk Assessment</p>
                <p className="text-sm font-medium text-foreground">
                  {card.impact_description || 'Cash compression if delayed'}
                </p>
              </div>
            </div>

            {/* Source Modules */}
            {card.source_modules && card.source_modules.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">Cross-module signal</p>
                <div className="flex gap-2">
                  {card.source_modules.map(module => (
                    <Badge key={module} variant="outline" className="text-xs">
                      {module}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Evidence & Verification (Collapsible) */}
        <Collapsible open={evidenceOpen} onOpenChange={setEvidenceOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Evidence & Verification
                  </CardTitle>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    evidenceOpen && "rotate-180"
                  )} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-4 italic">
                  Shown for verification, not analysis.
                </p>

                {/* Facts */}
                {card.facts && card.facts.length > 0 ? (
                  <div className="space-y-3">
                    {card.facts.map(fact => (
                      <div key={fact.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                        <span className="text-sm text-muted-foreground">{fact.label}</span>
                        <span className="text-sm font-medium text-foreground">
                          {fact.value}
                          {fact.unit && <span className="text-muted-foreground ml-1">{fact.unit}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No supporting facts available
                  </p>
                )}

                {/* Metadata */}
                {card.analysis_metadata && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Analysis Metadata</p>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      {card.analysis_metadata.data_rows && (
                        <div>
                          <span className="text-muted-foreground">Data rows: </span>
                          <span className="font-medium">{card.analysis_metadata.data_rows}</span>
                        </div>
                      )}
                      {card.analysis_metadata.analyzed_at && (
                        <div>
                          <span className="text-muted-foreground">Analyzed: </span>
                          <span className="font-medium">
                            {new Date(card.analysis_metadata.analyzed_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 4: Actions */}
        {canTakeAction && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Decision Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {recommendedAction && (
                  <Button 
                    onClick={handleAccept} 
                    disabled={isActioning}
                    className="flex-1"
                  >
                    {isActioning ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Accept: {recommendedAction.label}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isActioning}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Decision</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this decision. This will be recorded for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectReason.trim() || isActioning}
            >
              {isActioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Reject Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
