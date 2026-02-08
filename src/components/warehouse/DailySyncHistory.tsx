/**
 * DailySyncHistory - Shows daily sync run history with summary & details
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Zap,
  Calendar,
  Database,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useDailySyncRuns, useTriggerDailySync, type DailySyncRun } from '@/hooks/useDailySyncRuns';
import { toast } from 'sonner';

const MODEL_ICONS: Record<string, string> = {
  products: '📦',
  customers: '👥',
  orders: '🛒',
  order_items: '📋',
  payments: '💳',
  fulfillments: '🚚',
  refunds: '↩️',
  ad_spend: '💰',
  campaigns: '📢',
  update_cogs: '⚙️',
};

export function DailySyncHistory() {
  const { data: runs, isLoading, refetch } = useDailySyncRuns();
  const triggerSync = useTriggerDailySync();
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const handleTriggerSync = () => {
    toast.info('Đang khởi chạy Daily Sync...');
    triggerSync.mutate(undefined, {
      onSuccess: () => toast.success('Daily Sync đã bắt đầu!'),
      onError: (err) => toast.error('Lỗi: ' + err.message),
    });
  };

  // Summary stats from recent runs
  const latestRun = runs?.[0];
  const last7Runs = runs?.slice(0, 7) || [];
  const avgDuration = last7Runs.length > 0
    ? Math.round(last7Runs.reduce((s, r) => s + (r.total_duration_ms || 0), 0) / last7Runs.length)
    : 0;
  const totalProcessedRecent = last7Runs.reduce((s, r) => s + (r.total_records_processed || 0), 0);
  const successRate = last7Runs.length > 0
    ? Math.round((last7Runs.filter(r => r.status === 'completed').length / last7Runs.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Clock className="w-5 h-5 text-primary" />}
          label="Lần chạy gần nhất"
          value={latestRun?.started_at
            ? formatDistanceToNow(new Date(latestRun.started_at), { addSuffix: true, locale: vi })
            : 'Chưa có'}
          sub={latestRun ? getStatusLabel(latestRun.status) : undefined}
          statusColor={latestRun ? getStatusColor(latestRun.status) : undefined}
        />
        <SummaryCard
          icon={<Timer className="w-5 h-5 text-accent-foreground" />}
          label="Thời gian TB"
          value={avgDuration > 0 ? formatDuration(avgDuration) : '—'}
          sub="7 lần gần nhất"
        />
        <SummaryCard
          icon={<Database className="w-5 h-5 text-primary" />}
          label="Records xử lý"
          value={totalProcessedRecent.toLocaleString()}
          sub="7 lần gần nhất"
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          label="Tỷ lệ thành công"
          value={`${successRate}%`}
          sub={`${last7Runs.filter(r => r.status === 'completed').length}/${last7Runs.length} lần`}
        />
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Daily Incremental Sync</h3>
                <p className="text-sm text-muted-foreground">
                  Tự động chạy lúc 8:00 AM hàng ngày • Lookback 2 ngày
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleTriggerSync}
                disabled={triggerSync.isPending}
              >
                {triggerSync.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-1" />
                )}
                Chạy ngay
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Run History Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Lịch sử chạy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !runs || runs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Chưa có lịch sử chạy nào</p>
              <p className="text-sm">Bấm "Chạy ngay" để bắt đầu sync</p>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <RunRow
                  key={run.id}
                  run={run}
                  isExpanded={expandedRun === run.id}
                  onToggle={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============= Sub Components =============

function SummaryCard({
  icon,
  label,
  value,
  sub,
  statusColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  statusColor?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between mb-2">
          {icon}
          {statusColor && (
            <span className={`w-2 h-2 rounded-full ${statusColor}`} />
          )}
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function RunRow({
  run,
  isExpanded,
  onToggle,
}: {
  run: DailySyncRun;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const successRate = run.total_models > 0
    ? (run.succeeded_count / (run.succeeded_count + run.failed_count)) * 100
    : 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        {/* Status icon */}
        <div className="flex-shrink-0">
        {run.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-primary" />}
          {run.status === 'partial' && <AlertTriangle className="w-5 h-5 text-accent-foreground" />}
          {run.status === 'failed' && <XCircle className="w-5 h-5 text-destructive" />}
          {run.status === 'running' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
        </div>

        {/* Time */}
        <div className="min-w-[140px]">
          <p className="text-sm font-medium">
            {format(new Date(run.started_at), 'dd/MM/yyyy HH:mm')}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(run.started_at), { addSuffix: true, locale: vi })}
          </p>
        </div>

        {/* Type badge */}
        <Badge variant={run.triggered_by === 'cron' ? 'secondary' : 'outline'} className="text-xs">
          {run.triggered_by === 'cron' ? '⏰ Auto' : '👆 Manual'}
        </Badge>

        {/* Progress bar mini */}
        <div className="flex-1 max-w-[120px]">
          <Progress value={successRate} className="h-1.5" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-muted-foreground">
                  {run.total_records_processed.toLocaleString()} rec
                </span>
              </TooltipTrigger>
              <TooltipContent>Records xử lý</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <span className="text-muted-foreground">
            {run.total_duration_ms ? formatDuration(run.total_duration_ms) : '—'}
          </span>

          <span className="text-xs">
            <span className="text-primary">{run.succeeded_count}✓</span>
            {run.failed_count > 0 && (
              <span className="text-destructive ml-1">{run.failed_count}✗</span>
            )}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Separator />
            <div className="p-4 bg-muted/20">
              {/* Run info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date From:</span>
                  <span className="ml-1 font-medium">{run.date_from || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Run Type:</span>
                  <span className="ml-1 font-medium">{run.run_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tổng thời gian:</span>
                  <span className="ml-1 font-medium">{run.total_duration_ms ? formatDuration(run.total_duration_ms) : '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tổng records:</span>
                  <span className="ml-1 font-medium">{run.total_records_processed.toLocaleString()}</span>
                </div>
              </div>

              {run.error_summary && (
                <div className="mb-4 p-2 rounded bg-destructive/10 text-destructive text-sm">
                  ⚠️ {run.error_summary}
                </div>
              )}

              {/* Model results table */}
              {run.results && Object.keys(run.results).length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Records</TableHead>
                      <TableHead className="text-right">Thời gian</TableHead>
                      <TableHead>Lỗi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(run.results).map(([model, result]) => (
                      <TableRow key={model}>
                        <TableCell className="font-medium">
                          <span className="mr-1">{MODEL_ICONS[model] || '📊'}</span>
                          {model}
                        </TableCell>
                        <TableCell>
                          {result.success ? (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> OK
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="w-3 h-3 mr-1" /> Fail
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {(result.processed || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatDuration(result.duration_ms)}
                        </TableCell>
                        <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                          {result.error || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============= Helpers =============

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainSec = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainSec}s`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  return `${hours}h ${remainMin}m`;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed': return '✅ Thành công';
    case 'partial': return '⚠️ Một phần';
    case 'failed': return '❌ Thất bại';
    case 'running': return '🔄 Đang chạy';
    default: return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-green-500';
    case 'partial': return 'bg-yellow-500';
    case 'failed': return 'bg-destructive';
    case 'running': return 'bg-primary animate-pulse';
    default: return 'bg-muted';
  }
}
