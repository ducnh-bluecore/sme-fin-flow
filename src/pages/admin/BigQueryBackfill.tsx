/**
 * BigQuery Backfill Admin Page
 * 
 * @architecture Layer 10 Integration UI
 * Provides admin interface for triggering and monitoring BigQuery backfill jobs.
 * Includes expandable rows showing source-level progress.
 */

import { useState } from 'react';
import { 
  useBigQueryBackfill, 
  useAllBackfillJobs, 
  BackfillModelType,
  MODEL_TYPE_LABELS,
  MODEL_TYPE_ICONS,
} from '@/hooks/useBigQueryBackfill';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Play, 
  Square, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SourceProgressTable } from '@/components/admin/SourceProgressTable';

const MODEL_TYPES: BackfillModelType[] = [
  'customers',
  'products',
  'orders',
  'order_items',
  'refunds',
  'payments',
  'fulfillments',
  'inventory',
  'campaigns',
  'ad_spend',
];

// Fixed tenant ID for E2E BigQuery Test tenant
const E2E_TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

export default function BigQueryBackfillPage() {
  const { startBackfill, continueBackfill, cancelBackfill, deleteBackfillJob, isReady, tenantId } = useBigQueryBackfill();
  const { data: jobs, isLoading, refetch } = useAllBackfillJobs();
  
  const [selectedModel, setSelectedModel] = useState<BackfillModelType>('customers');
  const [dateFrom, setDateFrom] = useState('2025-01-01');
  const [dateTo, setDateTo] = useState('');
  const [batchSize, setBatchSize] = useState('500');
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  
  // For Super Admin: use fixed tenant if no tenant context
  const effectiveTenantId = tenantId || E2E_TENANT_ID;
  const canStart = !!effectiveTenantId;

  const handleStartBackfill = () => {
    startBackfill.mutate({
      modelType: selectedModel,
      options: {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        batch_size: parseInt(batchSize, 10) || 500,
      },
    });
  };

  const handleCancelBackfill = (modelType: BackfillModelType) => {
    cancelBackfill.mutate(modelType);
  };

  const handleDeleteJob = (jobId: string) => {
    const ok = window.confirm('Xóa job này? (không thể hoàn tác)');
    if (!ok) return;
    deleteBackfillJob.mutate(jobId);
  };

  const toggleJobExpand = (jobId: string) => {
    setExpandedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
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
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BigQuery Backfill</h1>
          <p className="text-muted-foreground">
            Sync data from BigQuery to Master Model (L2)
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Start Backfill Card */}
      <Card>
        <CardHeader>
          <CardTitle>Start New Backfill</CardTitle>
          <CardDescription>
            Select a model type and configure options to start syncing data from BigQuery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Model Type</Label>
              <Select 
                value={selectedModel} 
                onValueChange={(v) => setSelectedModel(v as BackfillModelType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {MODEL_TYPE_ICONS[type]} {MODEL_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Date To (optional)</Label>
              <Input 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Batch Size</Label>
              <Input 
                type="number" 
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                min={100}
                max={1000}
              />
            </div>
          </div>
          
          <div className="mt-4">
            <Button 
              onClick={handleStartBackfill}
              disabled={!canStart || startBackfill.isPending}
            >
              {startBackfill.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Start Backfill
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Backfill Jobs</CardTitle>
          <CardDescription>
            Recent backfill job history and status. Click a row to see source-level details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs && jobs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Records</TableHead>
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
                  const duration = job.started_at && job.completed_at
                    ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
                    : null;
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
                            {job.status === 'running' && (
                              <Progress value={progress} className="h-2" />
                            )}
                            {job.status === 'completed' && (
                              <Progress value={100} className="h-2" />
                            )}
                          </TableCell>
                          <TableCell>
                            {job.processed_records.toLocaleString()}
                            {job.total_records > 0 && (
                              <span className="text-muted-foreground">
                                {' / '}{job.total_records.toLocaleString()}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {job.started_at 
                              ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true })
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {duration !== null ? `${duration}s` : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {job.status === 'running' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleCancelBackfill(job.model_type as BackfillModelType)}
                                >
                                  <Square className="w-4 h-4" />
                                </Button>
                              )}

                              {(job.status === 'failed' || job.status === 'running' || job.status === 'pending') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => continueBackfill.mutate({ 
                                    modelType: job.model_type as BackfillModelType,
                                    options: { batch_size: 500 },
                                  })}
                                  disabled={continueBackfill.isPending}
                                  title="Continue backfill"
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                              )}

                              {job.status !== 'running' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteJob(job.id)}
                                  disabled={deleteBackfillJob.isPending}
                                  title="Xóa job"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}

                              {job.error_message && (
                                <span className="text-destructive text-xs" title={job.error_message}>
                                  ⚠️
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/20">
                            <TableCell colSpan={8} className="p-0">
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No backfill jobs found. Start a new backfill to sync data from BigQuery.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {MODEL_TYPES.slice(0, 5).map((type) => {
          const typeJobs = jobs?.filter(j => j.model_type === type) || [];
          const latestJob = typeJobs[0];
          
          return (
            <Card key={type} className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-4">
                <div className="text-2xl mb-1">{MODEL_TYPE_ICONS[type]}</div>
                <div className="font-medium">{MODEL_TYPE_LABELS[type]}</div>
                <div className="text-sm text-muted-foreground">
                  {latestJob ? (
                    <>
                      {latestJob.processed_records.toLocaleString()} records
                      <br />
                      {getStatusBadge(latestJob.status)}
                    </>
                  ) : (
                    'Not synced'
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
