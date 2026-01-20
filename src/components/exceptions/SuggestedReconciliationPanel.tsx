import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X,
  Loader2,
  AlertTriangle,
  FileText,
  Banknote,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  useSuggestions, 
  useConfirmSuggestion,
  useRejectSuggestion,
  useCalibrationData,
  getConfidenceColor,
  getConfidenceLabel,
  getCalibratedConfidence,
  type ReconciliationSuggestion
} from '@/hooks/useSuggestions';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

interface SuggestedReconciliationPanelProps {
  exceptionId: string | null;
  exceptionStatus: string;
  onReconciled?: () => void;
}

export function SuggestedReconciliationPanel({
  exceptionId,
  exceptionStatus,
  onReconciled,
}: SuggestedReconciliationPanelProps) {
  const { data: suggestions, isLoading, error } = useSuggestions(exceptionId);
  const { data: calibrationData } = useCalibrationData();
  const confirmMutation = useConfirmSuggestion();
  const rejectMutation = useRejectSuggestion();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ReconciliationSuggestion | null>(null);

  const getCalibrated = (originalConfidence: number) => {
    return getCalibratedConfidence(
      originalConfidence,
      calibrationData?.empirical_success_rate || null,
      calibrationData?.sample_size || 0
    );
  };

  const handleConfirmClick = (suggestion: ReconciliationSuggestion) => {
    setSelectedSuggestion(suggestion);
    setConfirmDialogOpen(true);
  };

  const handleReject = async (suggestion: ReconciliationSuggestion) => {
    try {
      await rejectMutation.mutateAsync(suggestion.id);
      toast.success('Suggestion rejected');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject suggestion');
    }
  };

  const handleConfirm = async () => {
    if (!selectedSuggestion) return;

    try {
      await confirmMutation.mutateAsync(selectedSuggestion.id);
      toast.success('Reconciliation created successfully');
      setConfirmDialogOpen(false);
      onReconciled?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm suggestion');
    }
  };

  if (exceptionStatus === 'resolved') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="font-medium">Suggested Reconciliations</span>
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 rounded-lg p-4 flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm">Failed to load suggestions</span>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lightbulb className="h-4 w-4" />
          <span className="text-sm">No matching suggestions found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="font-medium">Suggested Reconciliations</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{suggestions.length} found</Badge>
          {calibrationData && calibrationData.sample_size > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs cursor-help gap-1">
                  <Info className="h-3 w-3" />
                  {Math.round(calibrationData.empirical_success_rate)}% accuracy
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">
                  Based on {calibrationData.sample_size} similar cases, suggestions were correct {Math.round(calibrationData.empirical_success_rate)}% of the time.
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {suggestions.map((suggestion, index) => {
            const calibratedConfidence = getCalibrated(suggestion.confidence);
            const showCalibrated = calibratedConfidence !== suggestion.confidence;
            
            return (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Collapsible
                  open={expandedId === suggestion.id}
                  onOpenChange={(open) => setExpandedId(open ? suggestion.id : null)}
                >
                  <div className={`border rounded-lg overflow-hidden ${
                    calibratedConfidence >= 70 ? 'border-green-500/30 bg-green-500/5' :
                    calibratedConfidence >= 50 ? 'border-yellow-500/30 bg-yellow-500/5' :
                    'border-orange-500/30 bg-orange-500/5'
                  }`}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className={`${getConfidenceColor(calibratedConfidence)} cursor-help`}>
                                {Math.round(calibratedConfidence)}%
                                {showCalibrated && (
                                  <span className="ml-1 text-[10px] opacity-70">
                                    (was {suggestion.confidence}%)
                                  </span>
                                )}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p>Original Score: {suggestion.confidence}%</p>
                                {showCalibrated && (
                                  <p>Calibrated: {Math.round(calibratedConfidence)}%</p>
                                )}
                                <p className="text-muted-foreground">
                                  {getConfidenceLabel(calibratedConfidence)} confidence
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          <div className="text-left">
                            <div className="font-medium text-sm">
                              {suggestion.rationale.invoice_number || 'Invoice'} 
                              {suggestion.rationale.customer_name && (
                                <span className="text-muted-foreground font-normal">
                                  {' '}• {suggestion.rationale.customer_name}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(suggestion.suggested_amount, suggestion.currency)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {expandedId === suggestion.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0 border-t border-border/50">
                        {/* Rationale */}
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Match Rationale</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {suggestion.rationale.amountMatch && (
                              <div className="flex items-center gap-1">
                                <Check className="h-3 w-3 text-green-500" />
                                <span>Amount: {suggestion.rationale.amountMatch}</span>
                              </div>
                            )}
                            {suggestion.rationale.descriptionMatch && (
                              <div className="flex items-center gap-1">
                                <Check className="h-3 w-3 text-green-500" />
                                <span>Desc: {suggestion.rationale.descriptionMatch.replace('_', ' ')}</span>
                              </div>
                            )}
                            {suggestion.rationale.dateProximityDays !== undefined && (
                              <div className="flex items-center gap-1">
                                {suggestion.rationale.dateProximityDays <= 7 ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <X className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span>Date: {suggestion.rationale.dateProximityDays} days apart</span>
                              </div>
                            )}
                          </div>

                          {/* Amounts */}
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-muted/30 rounded p-2">
                            <div>
                              <div className="text-muted-foreground flex items-center gap-1">
                                <Banknote className="h-3 w-3" />
                                Bank Amount
                              </div>
                              <div className="font-medium">
                                {formatCurrency(
                                  suggestion.rationale.bank_amount || 
                                  suggestion.rationale.remaining_bank_amount || 0,
                                  suggestion.currency
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                Outstanding
                              </div>
                              <div className="font-medium">
                                {formatCurrency(
                                  suggestion.rationale.invoice_outstanding || 0,
                                  suggestion.currency
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Warning for low confidence */}
                          {calibratedConfidence < 50 && (
                            <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-100 rounded p-2 mt-2">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Low confidence - please verify before confirming</span>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleConfirmClick(suggestion)}
                              disabled={confirmMutation.isPending || rejectMutation.isPending}
                            >
                              {confirmMutation.isPending && selectedSuggestion?.id === suggestion.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4 mr-1" />
                              )}
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(suggestion)}
                              disabled={confirmMutation.isPending || rejectMutation.isPending}
                            >
                              {rejectMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <X className="h-4 w-4 mr-1" />
                              )}
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Reconciliation</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  This will create a reconciliation link between the bank transaction and invoice, 
                  marking this exception as resolved.
                </p>
                {selectedSuggestion && (
                  <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                    <div className="flex justify-between mb-1">
                      <span>Invoice:</span>
                      <span className="font-medium">{selectedSuggestion.rationale.invoice_number}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>Amount:</span>
                      <span className="font-medium">
                        {formatCurrency(selectedSuggestion.suggested_amount, selectedSuggestion.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence:</span>
                      <Badge className={getConfidenceColor(getCalibrated(selectedSuggestion.confidence))}>
                        {Math.round(getCalibrated(selectedSuggestion.confidence))}% ({getConfidenceLabel(getCalibrated(selectedSuggestion.confidence))})
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Reconciliation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
