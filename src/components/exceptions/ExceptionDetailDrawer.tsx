import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  AlertTriangle, 
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  Calendar,
  DollarSign,
  FileText,
  Banknote,
  ExternalLink,
  AlarmClock,
  MessageSquare,
  UserPlus
} from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  useExceptionDetail, 
  useTriageException,
  useSnoozeException,
  useResolveException 
} from '@/hooks/useExceptions';
import { SuggestedReconciliationPanel } from './SuggestedReconciliationPanel';
import { formatCurrency } from '@/lib/format';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const severityConfig = {
  critical: { 
    label: 'Critical', 
    icon: AlertCircle, 
    className: 'bg-destructive text-destructive-foreground'
  },
  high: { 
    label: 'High', 
    icon: AlertTriangle, 
    className: 'bg-orange-500 text-white'
  },
  medium: { 
    label: 'Medium', 
    icon: Clock, 
    className: 'bg-yellow-500 text-white'
  },
  low: { 
    label: 'Low', 
    icon: CheckCircle2, 
    className: 'bg-muted text-muted-foreground'
  },
};

interface ExceptionDetailDrawerProps {
  exceptionId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ExceptionDetailDrawer({ 
  exceptionId, 
  open, 
  onClose 
}: ExceptionDetailDrawerProps) {
  const navigate = useNavigate();
  const { data: detail, isLoading } = useExceptionDetail(exceptionId);
  const triageMutation = useTriageException();
  const snoozeMutation = useSnoozeException();
  const resolveMutation = useResolveException();

  const [showTriageDialog, setShowTriageDialog] = useState(false);
  const [showSnoozeDialog, setShowSnoozeDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [triageNotes, setTriageNotes] = useState('');
  const [snoozeDays, setSnoozeDays] = useState(7);
  const [resolveReason, setResolveReason] = useState('');

  const handleTriage = async () => {
    if (!exceptionId) return;
    try {
      await triageMutation.mutateAsync({
        exceptionId,
        triageNotes,
      });
      toast.success('Exception triaged');
      setShowTriageDialog(false);
      setTriageNotes('');
    } catch (error) {
      toast.error('Failed to triage exception');
    }
  };

  const handleSnooze = async () => {
    if (!exceptionId) return;
    try {
      const snoozedUntil = addDays(new Date(), snoozeDays).toISOString();
      await snoozeMutation.mutateAsync({
        exceptionId,
        snoozedUntil,
      });
      toast.success(`Snoozed for ${snoozeDays} days`);
      setShowSnoozeDialog(false);
      setSnoozeDays(7);
    } catch (error) {
      toast.error('Failed to snooze exception');
    }
  };

  const handleResolve = async () => {
    if (!exceptionId) return;
    try {
      await resolveMutation.mutateAsync({
        exceptionId,
        resolvedReason: resolveReason,
      });
      toast.success('Exception resolved');
      setShowResolveDialog(false);
      setResolveReason('');
      onClose();
    } catch (error) {
      toast.error('Failed to resolve exception');
    }
  };

  const handleGoToReconciliation = () => {
    navigate('/reconciliation');
    onClose();
  };

  if (!open) return null;

  const severity = detail ? severityConfig[detail.severity as keyof typeof severityConfig] : null;

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4 pt-8">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : detail ? (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    {severity && (
                      <Badge className={severity.className}>
                        {severity.label}
                      </Badge>
                    )}
                    <SheetTitle className="text-xl">
                      {detail.title}
                    </SheetTitle>
                    <SheetDescription>
                      {detail.description}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <Separator className="my-4" />

              {/* Impact Summary */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-4 mb-6"
              >
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <DollarSign className="h-4 w-4" />
                    Impact
                  </div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(detail.impact.amount)}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Clock className="h-4 w-4" />
                    Aging
                  </div>
                  <div className={`text-2xl font-bold ${detail.aging_days > 7 ? 'text-destructive' : ''}`}>
                    {detail.aging_days} days
                  </div>
                </div>
              </motion.div>

              {/* Evidence */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4 mb-6"
              >
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Evidence
                </h4>
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  {Object.entries(detail.evidence).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Payload Details */}
              {Object.keys(detail.payload).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-4 mb-6"
                >
                  <h4 className="font-medium flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Details
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    {Object.entries(detail.payload).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono">
                          {typeof value === 'number' 
                            ? formatCurrency(value)
                            : String(value)
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Suggested Reconciliation */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <SuggestedReconciliationPanel
                  exceptionId={exceptionId}
                  exceptionStatus={detail.status}
                  onReconciled={onClose}
                />
              </motion.div>

              {/* Suggested Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-4 mb-6"
              >
                <h4 className="font-medium">Manual Actions</h4>
                <ul className="space-y-2">
                  {detail.suggested_actions.map((action, idx) => (
                    <li 
                      key={idx}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="text-primary">•</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Triage Notes (if any) */}
              {detail.triage_notes && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-2 mb-6"
                >
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notes
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-3 text-sm">
                    {detail.triage_notes}
                  </div>
                </motion.div>
              )}

              <Separator className="my-4" />

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <Button 
                  className="w-full" 
                  onClick={handleGoToReconciliation}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Go to Reconciliation
                </Button>

                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowTriageDialog(true)}
                    disabled={detail.status === 'resolved'}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Triage
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowSnoozeDialog(true)}
                    disabled={detail.status === 'resolved'}
                  >
                    <AlarmClock className="h-4 w-4 mr-1" />
                    Snooze
                  </Button>
                  <Button 
                    variant="outline"
                    className="text-green-600 hover:text-green-700"
                    onClick={() => setShowResolveDialog(true)}
                    disabled={detail.status === 'resolved'}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Resolve
                  </Button>
                </div>

                {/* Timestamps */}
                <div className="pt-4 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Detected: {format(new Date(detail.detected_at), 'PPp')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Last seen: {format(new Date(detail.last_seen_at), 'PPp')}
                  </div>
                  {detail.snoozed_until && (
                    <div className="flex items-center gap-2">
                      <AlarmClock className="h-3 w-3" />
                      Snoozed until: {format(new Date(detail.snoozed_until), 'PPp')}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Exception not found
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Triage Dialog */}
      <Dialog open={showTriageDialog} onOpenChange={setShowTriageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Triage Exception</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add triage notes..."
                value={triageNotes}
                onChange={(e) => setTriageNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTriageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTriage} disabled={triageMutation.isPending}>
              {triageMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snooze Dialog */}
      <Dialog open={showSnoozeDialog} onOpenChange={setShowSnoozeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Snooze Exception</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Snooze for (days)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={snoozeDays}
                onChange={(e) => setSnoozeDays(parseInt(e.target.value) || 7)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Will be snoozed until {format(addDays(new Date(), snoozeDays), 'PPP')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSnoozeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSnooze} disabled={snoozeMutation.isPending}>
              {snoozeMutation.isPending ? 'Snoozing...' : 'Snooze'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Exception</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Resolution reason</Label>
              <Textarea
                placeholder="Describe how this was resolved..."
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolve} 
              disabled={resolveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {resolveMutation.isPending ? 'Resolving...' : 'Resolve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
