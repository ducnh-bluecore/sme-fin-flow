/**
 * BackfillJobTable - Reusable table for filtered backfill jobs
 */

import { useState } from 'react';
import { BackfillModelType, MODEL_TYPE_LABELS, MODEL_TYPE_ICONS } from '@/hooks/useBigQueryBackfill';
import type { BackfillJob } from '@/hooks/useBigQueryBackfill';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Play,
  Square,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { SourceProgressTable } from '@/components/admin/SourceProgressTable';
import { formatNumber } from '@/lib/formatters';

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatStartTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${min}`;
}

interface BackfillJobTableProps {
  jobs: BackfillJob[];
  onCancel: (modelType: BackfillModelType) => void;
  onContinue: (modelType: BackfillModelType) => void;
  onDelete: (jobId: string) => void;
  isContinuePending?: boolean;
  isDeletePending?: boolean;
  emptyMessage?: string;
}

export function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
    case 'running':
      return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running</Badge>;
    case 'failed':
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
    case 'cancelled':
      return <Badge variant="outline"><Square className="w-3 h-3 mr-1" /> Cancelled</Badge>;
    case 'pending':
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function BackfillJobTable({
  jobs,
  onCancel,
  onContinue,
  onDelete,
  isContinuePending,
  isDeletePending,
  emptyMessage = 'Không có job nào.',
}: BackfillJobTableProps) {
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  const toggleJobExpand = (jobId: string) => {
    setExpandedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10"></TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>BQ Processed</TableHead>
          <TableHead>Actual DB</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => {
          const progress = job.total_records > 0
            ? (job.processed_records / job.total_records) * 100
            : 0;
          const isRunning = job.status === 'running' || job.status === 'pending';
          const duration = job.started_at
            ? isRunning
              ? Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)
              : job.completed_at
                ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
                : null
            : null;
          const actualInserted = (job.metadata as any)?.inserted;
          const isExpanded = expandedJobs.has(job.id);

          return (
            <Collapsible key={job.id} asChild open={isExpanded}>
              <>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleJobExpand(job.id)}
                >
                  <TableCell>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{MODEL_TYPE_ICONS[job.model_type as BackfillModelType]}</span>
                      <span className="font-medium">{MODEL_TYPE_LABELS[job.model_type as BackfillModelType]}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell className="w-32">
                    {(job.status === 'running' || job.status === 'pending') && (
                      <Progress value={progress} className="h-2" />
                    )}
                    {job.status === 'completed' && (
                      <Progress value={100} className="h-2" />
                    )}
                  </TableCell>
                  <TableCell>
                    {formatNumber(job.processed_records)}
                    {job.total_records > 0 && (
                      <span className="text-muted-foreground">
                        {' / '}{formatNumber(job.total_records)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {actualInserted != null ? (
                      <span className={actualInserted < job.processed_records ? 'text-muted-foreground' : ''}>
                        {formatNumber(actualInserted)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatStartTime(job.started_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDuration(duration)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {job.status === 'running' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCancel(job.model_type as BackfillModelType)}
                          title="Cancel"
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                      )}

                      {(job.status === 'failed' || job.status === 'running' || job.status === 'pending') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onContinue(job.model_type as BackfillModelType)}
                          disabled={isContinuePending}
                          title="Continue backfill"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const ok = window.confirm('Xóa job này? (không thể hoàn tác)');
                          if (ok) onDelete(job.id);
                        }}
                        disabled={isDeletePending}
                        title="Xóa job"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>

                      {job.error_message && (
                        <span className="text-destructive text-xs max-w-[200px] truncate" title={job.error_message}>
                          ⚠️ {job.error_message.slice(0, 60)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                <CollapsibleContent asChild>
                  <TableRow className="bg-muted/20">
                    <TableCell colSpan={9} className="p-0">
                      <div className="p-4">
                        <h4 className="text-sm font-medium mb-2">Source Progress</h4>
                        <SourceProgressTable jobId={job.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                </CollapsibleContent>
              </>
            </Collapsible>
          );
        })}
      </TableBody>
    </Table>
  );
}
