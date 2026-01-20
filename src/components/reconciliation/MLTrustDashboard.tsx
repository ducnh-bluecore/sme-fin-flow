import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  AlertTriangle, 
  Brain, 
  CheckCircle2, 
  RefreshCw, 
  Shield, 
  TrendingDown, 
  TrendingUp,
  Activity,
  AlertOctagon,
  Power,
  Eye,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useMLMonitoringSummary, 
  useDriftEvents,
  useRunDriftDetection,
  useAcknowledgeDrift,
  useResetMLStatus,
  getSeverityColor,
  getStatusColor,
  getDriftTypeLabel
} from "@/hooks/useMLMonitoring";
import { formatDistanceToNow } from "date-fns";

export function MLTrustDashboard() {
  const { data: summary, isLoading, error, refetch } = useMLMonitoringSummary();
  const { data: driftData } = useDriftEvents(20);
  const runDetection = useRunDriftDetection();
  const acknowledgeDrift = useAcknowledgeDrift();
  const resetStatus = useResetMLStatus();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            ML Trust Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Failed to load ML monitoring data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with Status */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>ML Trust & Safety Dashboard</CardTitle>
                    <CardDescription>Monitor ML health, detect drift, and control automation</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(summary?.mlStatus || 'DISABLED')}>
                    {summary?.mlStatus || 'DISABLED'}
                  </Badge>
                  <Badge variant="outline">{summary?.modelVersion}</Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => refetch()}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Kill Switch Banner */}
            {summary?.mlStatus === 'DISABLED' && summary?.lastFallbackReason && (
              <CardContent className="pt-0">
                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertOctagon className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="font-medium text-red-900 dark:text-red-100">
                        ML Kill Switch Activated
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Reason: {summary.lastFallbackReason}
                        {summary.lastFallbackAt && (
                          <span className="ml-2">
                            ({formatDistanceToNow(new Date(summary.lastFallbackAt), { addSuffix: true })})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetStatus.mutate('ACTIVE')}
                    disabled={resetStatus.isPending}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <Power className="h-4 w-4 mr-2" />
                    Reactivate ML
                  </Button>
                </div>
              </CardContent>
            )}

            {summary?.mlStatus === 'LIMITED' && (
              <CardContent className="pt-0">
                <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <p className="font-medium text-yellow-900 dark:text-yellow-100">
                        ML Running in Limited Mode
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        High severity drift detected. Auto-reconciliation requires manual confirmation.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetStatus.mutate('ACTIVE')}
                    disabled={resetStatus.isPending}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  >
                    Restore Full Access
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Accuracy (30d)"
            value={summary?.accuracy != null ? `${summary.accuracy}%` : 'N/A'}
            tooltip="Percentage of ML predictions that matched actual outcomes"
            status={
              summary?.accuracy != null
                ? summary.accuracy >= 90 ? 'success' : summary.accuracy >= 70 ? 'warning' : 'error'
                : undefined
            }
          />
          <MetricCard
            icon={<Activity className="h-4 w-4" />}
            label="Calibration Error"
            value={summary?.calibrationError != null ? summary.calibrationError.toFixed(3) : 'N/A'}
            tooltip="Expected Calibration Error (ECE). Lower is better. < 0.08 is good."
            status={
              summary?.calibrationError != null
                ? summary.calibrationError < 0.05 ? 'success' : summary.calibrationError < 0.08 ? 'warning' : 'error'
                : undefined
            }
          />
          <MetricCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="False Auto Rate"
            value={`${summary?.falseAutoRate || 0}%`}
            tooltip="Percentage of auto-confirmed reconciliations that were incorrect"
            status={
              (summary?.falseAutoRate || 0) < 1 ? 'success' : (summary?.falseAutoRate || 0) < 5 ? 'warning' : 'error'
            }
          />
          <MetricCard
            icon={<Shield className="h-4 w-4" />}
            label="Guardrail Block Rate"
            value={`${summary?.guardrailBlockRate || 0}%`}
            tooltip="Percentage of suggestions blocked by guardrails"
            status={
              (summary?.guardrailBlockRate || 0) < 20 ? 'success' : (summary?.guardrailBlockRate || 0) < 40 ? 'warning' : 'error'
            }
          />
        </div>

        {/* Drift Detection Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Drift Signals
                  {(summary?.activeDriftCount || 0) > 0 && (
                    <Badge variant="destructive">{summary?.activeDriftCount}</Badge>
                  )}
                </CardTitle>
                <CardDescription>Real-time detection of model performance degradation</CardDescription>
              </div>
              <Button
                onClick={() => runDetection.mutate()}
                disabled={runDetection.isPending}
                size="sm"
              >
                {runDetection.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Activity className="h-4 w-4 mr-2" />
                )}
                Run Detection
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(summary?.driftSignals?.length || 0) === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                No active drift signals
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  <AnimatePresence>
                    {summary?.driftSignals.map((signal, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={getSeverityColor(signal.severity)}>
                            {signal.severity.toUpperCase()}
                          </Badge>
                          <div>
                            <p className="font-medium">{getDriftTypeLabel(signal.type)}</p>
                            <p className="text-sm text-muted-foreground">
                              {signal.metric}: {signal.delta != null ? 
                                (signal.delta > 0 ? '+' : '') + signal.delta.toFixed(3) : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDistanceToNow(new Date(signal.detectedAt), { addSuffix: true })}
                          </span>
                          {signal.autoActionTaken && (
                            <Badge variant="outline" className="text-xs">
                              {signal.autoActionTaken}
                            </Badge>
                          )}
                          {!signal.acknowledged && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Ack
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Drift History */}
        <Card>
          <CardHeader>
            <CardTitle>Drift History</CardTitle>
            <CardDescription>Historical record of all detected drift events</CardDescription>
          </CardHeader>
          <CardContent>
            {!driftData?.events?.length ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No drift events recorded
              </div>
            ) : (
              <ScrollArea className="h-[250px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Type</th>
                      <th className="text-left py-2 px-2">Severity</th>
                      <th className="text-left py-2 px-2">Metric</th>
                      <th className="text-left py-2 px-2">Delta</th>
                      <th className="text-left py-2 px-2">Action</th>
                      <th className="text-left py-2 px-2">Time</th>
                      <th className="text-left py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {driftData.events.map((event) => (
                      <tr key={event.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2">{getDriftTypeLabel(event.drift_type)}</td>
                        <td className="py-2 px-2">
                          <Badge className={getSeverityColor(event.severity)} variant="outline">
                            {event.severity}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 font-mono text-xs">{event.metric}</td>
                        <td className="py-2 px-2">
                          {event.delta != null ? (
                            <span className={event.delta > 0 ? 'text-red-500' : 'text-green-500'}>
                              {event.delta > 0 ? '+' : ''}{event.delta.toFixed(3)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-2">
                          {event.auto_action_taken && (
                            <Badge variant="secondary" className="text-xs">
                              {event.auto_action_taken}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 px-2 text-muted-foreground">
                          {formatDistanceToNow(new Date(event.detected_at), { addSuffix: true })}
                        </td>
                        <td className="py-2 px-2">
                          {event.acknowledged_at ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => acknowledgeDrift.mutate(event.id)}
                              disabled={acknowledgeDrift.isPending}
                            >
                              Ack
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Safety Notice */}
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Audit-Grade Monitoring
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  All ML predictions, drift signals, and kill-switch events are immutably logged. 
                  Every decision is traceable with full feature attribution and model version tracking.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tooltip: string;
  status?: 'success' | 'warning' | 'error';
}

function MetricCard({ icon, label, value, tooltip, status }: MetricCardProps) {
  const statusColors = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
  };

  const statusIcons = {
    success: <TrendingUp className="h-4 w-4 text-green-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
    error: <TrendingDown className="h-4 w-4 text-red-500" />,
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="cursor-help hover:bg-muted/50 transition-colors">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                {icon}
                <span className="text-xs font-medium">{label}</span>
              </div>
              {status && statusIcons[status]}
            </div>
            <p className={`text-2xl font-bold ${status ? statusColors[status] : ''}`}>
              {value}
            </p>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default MLTrustDashboard;
