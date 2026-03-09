import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  RefreshCw, Play, Loader2, CheckCircle2, XCircle, Clock, 
  Trash2, StopCircle, Database, ArrowDownToLine 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MODEL_TYPE_LABELS, MODEL_TYPE_ICONS, type BackfillModelType } from '@/hooks/useBigQueryBackfill';

interface TenantDataSyncTabProps {
  tenantId: string;
}

const STATUS_BADGES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  completed: { variant: 'default', icon: CheckCircle2 },
  running: { variant: 'outline', icon: Loader2 },
  pending: { variant: 'secondary', icon: Clock },
  failed: { variant: 'destructive', icon: XCircle },
  cancelled: { variant: 'secondary', icon: StopCircle },
};

export function TenantDataSyncTab({ tenantId }: TenantDataSyncTabProps) {
  const queryClient = useQueryClient();
  const [lookbackDays, setLookbackDays] = useState(2);
  const [selectedModel, setSelectedModel] = useState<BackfillModelType>('orders');

  // Daily sync runs
  const { data: syncRuns, isLoading: syncLoading } = useQuery({
    queryKey: ['tenant-sync-runs', tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('daily_sync_runs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('started_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 15000,
  });

  // Backfill jobs
  const { data: backfillJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['tenant-backfill-jobs', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bigquery_backfill_jobs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  // Trigger daily sync
  const triggerSync = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('daily-bigquery-sync', {
        body: { triggered_by: 'admin', lookback_days: lookbackDays, tenant_id: tenantId },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success('Daily sync triggered');
      queryClient.invalidateQueries({ queryKey: ['tenant-sync-runs', tenantId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Start backfill
  const startBackfill = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('backfill-bigquery', {
        body: { action: 'start', tenant_id: tenantId, model_type: selectedModel },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success(`Backfill ${selectedModel} started`);
      queryClient.invalidateQueries({ queryKey: ['tenant-backfill-jobs', tenantId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Cancel backfill
  const cancelBackfill = useMutation({
    mutationFn: async (modelType: string) => {
      const { data, error } = await supabase.functions.invoke('backfill-bigquery', {
        body: { action: 'cancel', tenant_id: tenantId, model_type: modelType },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.info('Backfill cancelled');
      queryClient.invalidateQueries({ queryKey: ['tenant-backfill-jobs', tenantId] });
    },
  });

  // Delete job
  const deleteJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('bigquery_backfill_jobs')
        .delete()
        .eq('id', jobId)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Đã xóa job');
      queryClient.invalidateQueries({ queryKey: ['tenant-backfill-jobs', tenantId] });
    },
  });

  const renderStatusBadge = (status: string) => {
    const config = STATUS_BADGES[status] || STATUS_BADGES.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`w-3 h-3 ${status === 'running' ? 'animate-spin' : ''}`} />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Daily Sync */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="w-5 h-5" />
              Daily Sync
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Lookback:</Label>
              <Input
                type="number"
                value={lookbackDays}
                onChange={(e) => setLookbackDays(Number(e.target.value))}
                className="w-16 h-8"
                min={1}
                max={30}
              />
              <span className="text-xs text-muted-foreground">ngày</span>
              <Button
                size="sm"
                onClick={() => triggerSync.mutate()}
                disabled={triggerSync.isPending}
                className="gap-1"
              >
                {triggerSync.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Trigger Sync
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {syncLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !syncRuns?.length ? (
            <p className="text-center py-6 text-muted-foreground text-sm">Chưa có lịch sử sync</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Models</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Triggered by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncRuns.map((run: any) => (
                  <TableRow key={run.id}>
                    <TableCell className="text-xs">
                      {format(new Date(run.started_at), 'dd/MM HH:mm', { locale: vi })}
                    </TableCell>
                    <TableCell>{renderStatusBadge(run.status)}</TableCell>
                    <TableCell className="text-xs">
                      {run.succeeded_count}/{run.total_models}
                      {run.failed_count > 0 && (
                        <span className="text-destructive ml-1">({run.failed_count} lỗi)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{run.total_records_processed?.toLocaleString()}</TableCell>
                    <TableCell className="text-xs">
                      {run.total_duration_ms ? `${(run.total_duration_ms / 1000).toFixed(1)}s` : '-'}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{run.triggered_by}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Backfill */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownToLine className="w-5 h-5" />
              Backfill Jobs
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as BackfillModelType)}>
                <SelectTrigger className="w-40 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MODEL_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {MODEL_TYPE_ICONS[key as BackfillModelType]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => startBackfill.mutate()}
                disabled={startBackfill.isPending}
                className="gap-1"
              >
                {startBackfill.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                Start Backfill
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !backfillJobs?.length ? (
            <p className="text-center py-6 text-muted-foreground text-sm">Chưa có backfill jobs</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backfillJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium text-sm">
                      {MODEL_TYPE_ICONS[job.model_type as BackfillModelType] || '📄'} {MODEL_TYPE_LABELS[job.model_type as BackfillModelType] || job.model_type}
                    </TableCell>
                    <TableCell>{renderStatusBadge(job.status)}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {job.processed_records?.toLocaleString()}/{job.total_records?.toLocaleString()}
                      {job.failed_records > 0 && (
                        <span className="text-destructive ml-1">({job.failed_records} err)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(job.created_at), 'dd/MM HH:mm', { locale: vi })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(job.status === 'running' || job.status === 'pending') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => cancelBackfill.mutate(job.model_type)}
                          >
                            <StopCircle className="w-3.5 h-3.5 text-amber-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteJob.mutate(job.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
