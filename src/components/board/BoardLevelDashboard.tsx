/**
 * Board-Level Dashboard – Risk & Control View
 * 
 * Executive-grade dashboard for Board, CEO, CFO, Audit Committee.
 * Answers 5 key questions in < 5 minutes:
 * 1. Is the number trustworthy?
 * 2. Where is the risk?
 * 3. Is automation under control?
 * 4. Are controls working?
 * 5. What changed since last meeting?
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  DollarSign,
  AlertTriangle,
  Settings,
  Bot,
  FileCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  ChevronRight,
  Activity,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  useBoardSummary, 
  getMLStatusColor, 
  getMLStatusLabel,
  getDeltaIndicator,
  getDriftSeverityColor,
} from '@/hooks/useBoardSummary';
import { formatVNDCompact, formatDateTime, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// ========== SECTION COMPONENTS ==========

function FinancialTruthSection({ data }: { data: NonNullable<ReturnType<typeof useBoardSummary>['data']>['financialTruth'] }) {
  const isSettled = data.cashToday.truthLevel === 'settled';
  
  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Financial Truth & Confidence</CardTitle>
            <CardDescription>Can we trust the cash number?</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cash Today */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-4 rounded-xl bg-background border cursor-help">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Cash Today</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs',
                        isSettled 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                      )}
                    >
                      {isSettled ? '🟢 Settled' : '🟡 Provisional'}
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold">{formatVNDCompact(data.cashToday.value)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Authority: {data.cashToday.authority}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Derived from bank balances, reconciled invoices, and documented assumptions.</p>
                {isSettled && <p className="text-xs mt-1 text-emerald-400">✓ Bank-verified</p>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Cash Next 7 Days */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-4 rounded-xl bg-background border cursor-help">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Cash Next 7 Days</span>
                    <Badge variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/30 text-xs">
                      📊 Forecast
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold">{formatVNDCompact(data.cashNext7d.value)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={data.cashNext7d.confidence} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground">{data.cashNext7d.confidence}%</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>7-day projection using formula: Cash Today + (15% AR) + (80% Weekly Sales) - (20% AP)</p>
                <p className="text-xs mt-1 text-violet-400">Rule-based estimate</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskExposureSection({ data }: { data: NonNullable<ReturnType<typeof useBoardSummary>['data']>['risk'] }) {
  const hasHighRisk = data.totalArOverdue > 0 || data.openExceptions > 0;
  
  return (
    <Card className={cn(hasHighRisk && 'border-destructive/30')}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-lg', hasHighRisk ? 'bg-destructive/10' : 'bg-muted')}>
            <AlertTriangle className={cn('h-5 w-5', hasHighRisk ? 'text-destructive' : 'text-muted-foreground')} />
          </div>
          <div>
            <CardTitle className="text-lg">Risk Exposure</CardTitle>
            <CardDescription>Where is money at risk?</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">AR Overdue</p>
            <p className="text-xl font-bold text-destructive">{formatVNDCompact(data.totalArOverdue)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Open Exceptions</p>
            <p className="text-xl font-bold">{data.openExceptions}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Largest Single Risk</p>
            <p className="text-xl font-bold truncate">
              {data.largestRisk ? formatVNDCompact(data.largestRisk.amount) : '—'}
            </p>
            {data.largestRisk && (
              <p className="text-xs text-muted-foreground truncate">{data.largestRisk.description}</p>
            )}
          </div>
        </div>

        {/* Aging Breakdown */}
        <div className="space-y-2">
          <p className="text-sm font-medium">AR Aging Breakdown</p>
          <div className="flex gap-2">
            <div className="flex-1 p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-600 dark:text-emerald-400">0-7 days</p>
              <p className="font-semibold">{formatVNDCompact(data.aging.days_0_7)}</p>
            </div>
            <div className="flex-1 p-2 rounded bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-600 dark:text-amber-400">8-30 days</p>
              <p className="font-semibold">{formatVNDCompact(data.aging.days_8_30)}</p>
            </div>
            <div className="flex-1 p-2 rounded bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-600 dark:text-red-400">&gt;30 days</p>
              <p className="font-semibold">{formatVNDCompact(data.aging.days_30_plus)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ControlEffectivenessSection({ data }: { data: NonNullable<ReturnType<typeof useBoardSummary>['data']>['controls'] }) {
  const isFalseAutoHigh = data.falseAutoRate > 1;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Settings className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Control Effectiveness</CardTitle>
            <CardDescription>Are controls working?</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-muted/50 cursor-help">
                  <p className="text-xs text-muted-foreground mb-1">Auto-Confirmed</p>
                  <p className="text-xl font-bold text-emerald-500">{data.autoRate}%</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Reconciliations auto-confirmed by system</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-muted/50 cursor-help">
                  <p className="text-xs text-muted-foreground mb-1">Manual</p>
                  <p className="text-xl font-bold">{data.manualRate}%</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Reconciliations manually confirmed</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-muted/50 cursor-help">
                  <p className="text-xs text-muted-foreground mb-1">Guardrail Blocks</p>
                  <p className="text-xl font-bold text-amber-500">{data.guardrailBlockRate}%</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Blocked by safety guardrails</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn('p-3 rounded-lg cursor-help', isFalseAutoHigh ? 'bg-red-500/10' : 'bg-muted/50')}>
                  <p className="text-xs text-muted-foreground mb-1">False Auto Rate</p>
                  <p className={cn('text-xl font-bold', isFalseAutoHigh && 'text-destructive')}>
                    {data.falseAutoRate}%
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isFalseAutoHigh 
                  ? '⚠️ Above 1% threshold - review automation rules'
                  : 'Auto-confirmations later found incorrect'
                }
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">Total reconciliations (period)</span>
          <span className="font-semibold">{data.totalReconciliations}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function MLOversightSection({ data }: { data: NonNullable<ReturnType<typeof useBoardSummary>['data']>['ml'] }) {
  const hasActiveDrift = data.driftSignals.length > 0;
  const isDisabled = data.status === 'DISABLED';
  
  return (
    <Card className={cn(isDisabled && 'border-destructive/30')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-lg', isDisabled ? 'bg-destructive/10' : 'bg-violet-500/10')}>
              <Bot className={cn('h-5 w-5', isDisabled ? 'text-destructive' : 'text-violet-500')} />
            </div>
            <div>
              <CardTitle className="text-lg">Automation & ML Oversight</CardTitle>
              <CardDescription>Is automation safe?</CardDescription>
            </div>
          </div>
          <Badge className={cn('ml-2', getMLStatusColor(data.status))}>
            {getMLStatusLabel(data.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDisabled && data.lastFallbackReason && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Kill Switch Activated</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{data.lastFallbackReason}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Accuracy (30d)</p>
            <p className="text-xl font-bold">
              {data.accuracy !== null ? `${data.accuracy.toFixed(1)}%` : '—'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Calibration Error</p>
            <p className="text-xl font-bold">
              {data.calibrationError !== null ? data.calibrationError.toFixed(3) : '—'}
            </p>
          </div>
        </div>

        {hasActiveDrift && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              Active Drift Signals
            </p>
            <div className="flex flex-wrap gap-2">
              {data.driftSignals.map((signal, i) => (
                <Badge key={i} variant="outline" className={getDriftSeverityColor(signal.severity)}>
                  {signal.type}: {signal.metric}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic">
          ML assists confidence estimation only. Guardrails and human approval remain mandatory.
        </p>
      </CardContent>
    </Card>
  );
}

function GovernanceSection({ data }: { data: NonNullable<ReturnType<typeof useBoardSummary>['data']>['governance'] }) {
  const checklist = data.auditReadyChecklist;
  const allPassed = checklist.appendOnlyLedger && checklist.approvalWorkflows && checklist.auditorAccess && checklist.mlKillSwitch;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <FileCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Governance & Audit Readiness</CardTitle>
            <CardDescription>Are we audit-ready?</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Audit Events</p>
            <p className="text-xl font-bold">{data.totalAuditEvents}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Open Approvals</p>
            <p className={cn('text-xl font-bold', data.openApprovals > 0 && 'text-amber-500')}>
              {data.openApprovals}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Policy Coverage</p>
            <p className="text-xl font-bold">{data.policyCoverage}%</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Last Audit</p>
            <p className="text-sm font-medium">
              {data.lastAuditEvent ? formatDateTime(data.lastAuditEvent) : '—'}
            </p>
          </div>
        </div>

        <Separator />

        {/* Audit Checklist */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Audit Ready Checklist
            {allPassed && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 text-xs">All Passed</Badge>}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <ChecklistItem label="Append-only Ledger" passed={checklist.appendOnlyLedger} />
            <ChecklistItem label="Approval Workflows" passed={checklist.approvalWorkflows} />
            <ChecklistItem label="Auditor Access" passed={checklist.auditorAccess} />
            <ChecklistItem label="ML Kill-Switch" passed={checklist.mlKillSwitch} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded text-sm',
      passed ? 'bg-emerald-500/10' : 'bg-red-500/10'
    )}>
      {passed 
        ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
        : <XCircle className="h-4 w-4 text-red-500 shrink-0" />
      }
      <span className={passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
        {label}
      </span>
    </div>
  );
}

function DeltaSection({ data, period }: { 
  data: NonNullable<ReturnType<typeof useBoardSummary>['data']>['delta'];
  period: NonNullable<ReturnType<typeof useBoardSummary>['data']>['period'];
}) {
  const cashDelta = getDeltaIndicator(data.cashChange.value);
  const riskDelta = getDeltaIndicator(-data.riskChange.value); // Negative is good for risk
  
  const DeltaIcon = ({ type }: { type: 'up' | 'down' | 'neutral' }) => {
    if (type === 'up') return <TrendingUp className="h-4 w-4" />;
    if (type === 'down') return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Change Since Last Period</CardTitle>
            <CardDescription>What changed since last meeting?</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg bg-background border">
            <p className="text-xs text-muted-foreground mb-1">Δ Cash</p>
            <div className={cn('flex items-center gap-1', cashDelta.color)}>
              <DeltaIcon type={cashDelta.icon} />
              <span className="text-lg font-bold">{formatVNDCompact(Math.abs(data.cashChange.value))}</span>
            </div>
            <p className="text-xs text-muted-foreground">{data.cashChange.percent > 0 ? '+' : ''}{data.cashChange.percent}%</p>
          </div>

          <div className="p-3 rounded-lg bg-background border">
            <p className="text-xs text-muted-foreground mb-1">Δ Risk</p>
            <div className={cn('flex items-center gap-1', riskDelta.color)}>
              <DeltaIcon type={riskDelta.icon} />
              <span className="text-lg font-bold">{formatVNDCompact(Math.abs(data.riskChange.value))}</span>
            </div>
            <p className="text-xs text-muted-foreground">{data.riskChange.percent > 0 ? '+' : ''}{data.riskChange.percent}%</p>
          </div>

          <div className="p-3 rounded-lg bg-background border">
            <p className="text-xs text-muted-foreground mb-1">New Exceptions</p>
            <p className={cn('text-lg font-bold', data.newExceptions > 0 && 'text-amber-500')}>
              {data.newExceptions}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-background border">
            <p className="text-xs text-muted-foreground mb-1">Policy Changes</p>
            <p className="text-lg font-bold">{data.policyChanges}</p>
          </div>

          <div className="p-3 rounded-lg bg-background border">
            <p className="text-xs text-muted-foreground mb-1">ML Status</p>
            <p className="text-lg font-bold">
              {data.mlStatusChanged ? (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500">Changed</Badge>
              ) : (
                <span className="text-muted-foreground">Unchanged</span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ========== MAIN COMPONENT ==========

export function BoardLevelDashboard() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const { data, isLoading, refetch, isFetching } = useBoardSummary(period);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-48" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No board summary data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Board-Level Dashboard
          </h1>
          <p className="text-muted-foreground">Risk & Control View • Executive Summary</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export board pack as PDF</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Read-only indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
        <Lock className="h-3 w-3" />
        <span>Read-only view for Board, CEO, CFO, and Audit Committee</span>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* 1. Financial Truth - TOP CARD */}
        <FinancialTruthSection data={data.financialTruth} />

        {/* 2 & 3. Risk + Controls */}
        <div className="grid md:grid-cols-2 gap-6">
          <RiskExposureSection data={data.risk} />
          <ControlEffectivenessSection data={data.controls} />
        </div>

        {/* 4 & 5. ML + Governance */}
        <div className="grid md:grid-cols-2 gap-6">
          <MLOversightSection data={data.ml} />
          <GovernanceSection data={data.governance} />
        </div>

        {/* 6. Delta - BOARD FAVORITE */}
        <DeltaSection data={data.delta} period={data.period} />
      </motion.div>
    </div>
  );
}
