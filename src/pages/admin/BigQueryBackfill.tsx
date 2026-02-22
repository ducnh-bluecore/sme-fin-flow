/**
 * BigQuery Backfill Admin Page - Tab-based Job Management
 * 
 * @architecture Layer 10 Integration UI
 * Jobs split into Active / Completed / Failed tabs for easy monitoring.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Collapsible, CollapsibleContent, CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  Play, RefreshCw, Loader2, ChevronDown, ChevronRight, Tag,
} from 'lucide-react';
import { BackfillJobTable, getStatusBadge } from '@/components/admin/BackfillJobTable';

const MODEL_TYPES: BackfillModelType[] = [
  'customers', 'products', 'orders', 'order_items', 'refunds',
  'payments', 'fulfillments', 'inventory', 'campaigns', 'ad_spend',
];

const E2E_TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

export default function BigQueryBackfillPage() {
  const { startBackfill, continueBackfill, cancelBackfill, deleteBackfillJob, updateDiscounts, isReady, tenantId } = useBigQueryBackfill();
  const { data: jobs, isLoading, refetch } = useAllBackfillJobs();
  
  const [selectedModel, setSelectedModel] = useState<BackfillModelType>('customers');
  const [dateFrom, setDateFrom] = useState('2025-01-01');
  const [dateTo, setDateTo] = useState('');
  const [batchSize, setBatchSize] = useState('500');
  const [formOpen, setFormOpen] = useState(false);
  
  // Discount update state
  const [discountOffset, setDiscountOffset] = useState(0);
  const [discountTotal, setDiscountTotal] = useState(0);
  const [discountUpdated, setDiscountUpdated] = useState(0);
  const [discountRunning, setDiscountRunning] = useState(false);
  
  const effectiveTenantId = tenantId || E2E_TENANT_ID;
  const canStart = !!effectiveTenantId;

  // Filter jobs into categories
  const allJobs = jobs || [];
  const activeJobs = allJobs.filter(j => j.status === 'running' || j.status === 'pending');
  const completedJobs = allJobs.filter(j => j.status === 'completed');
  const failedJobs = allJobs.filter(j => j.status === 'failed' || j.status === 'cancelled');

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

  const handleCancel = (modelType: BackfillModelType) => cancelBackfill.mutate(modelType);
  const handleContinue = (modelType: BackfillModelType) => {
    continueBackfill.mutate({ modelType, options: { batch_size: 500 } });
  };
  const handleDelete = (jobId: string) => deleteBackfillJob.mutate(jobId);

  // Auto-continuing discount update with retry
  // Each edge function call now processes multiple internal batches (~45s worth)
  const runDiscountBatch = useCallback(async (offset: number, totalSoFar: number, retryCount = 0) => {
    setDiscountRunning(true);
    try {
      const result = await updateDiscounts.mutateAsync({ batch_size: 2000, offset });
      const newTotal = totalSoFar + (result.updated || 0);
      setDiscountUpdated(newTotal);
      setDiscountOffset(result.next_offset || offset);
      if (result.total_bq_rows) setDiscountTotal(result.total_bq_rows);
      
      console.log(`[discount] Invocation done: batches=${(result as any).batches_processed}, updated=${result.updated}, next_offset=${result.next_offset}, elapsed=${(result as any).elapsed_ms}ms`);
      
      if (!result.completed && result.next_offset) {
        // Short delay then next invocation (each invocation handles ~45s internally)
        setTimeout(() => runDiscountBatch(result.next_offset!, newTotal, 0), 2000);
      } else {
        setDiscountRunning(false);
        if (result.completed) {
          toast.success(`Hoàn tất! Đã cập nhật ${newTotal.toLocaleString()} orders.`);
        }
      }
    } catch (err) {
      if (retryCount < 5) {
        // More retries with longer backoff (3s, 6s, 12s, 24s, 48s)
        const delay = Math.pow(2, retryCount + 1) * 1500;
        console.warn(`[discount] Invocation offset=${offset} failed (retry ${retryCount + 1}/5), retrying in ${delay}ms...`, err);
        setTimeout(() => runDiscountBatch(offset, totalSoFar, retryCount + 1), delay);
      } else {
        console.error(`[discount] Invocation offset=${offset} failed after 5 retries`, err);
        setDiscountOffset(offset);
        setDiscountUpdated(totalSoFar);
        setDiscountRunning(false);
        toast.error(`Thất bại tại offset ${offset}. Bấm "Resume" để tiếp tục.`);
      }
    }
  }, [updateDiscounts]);

  const handleStartDiscountUpdate = () => {
    setDiscountOffset(0);
    setDiscountUpdated(0);
    setDiscountTotal(0);
    runDiscountBatch(0, 0);
  };

  // Resume from last known offset
  const handleResumeDiscountUpdate = () => {
    runDiscountBatch(discountOffset, discountUpdated);
  };

  // Default to active tab if there are active jobs, otherwise completed
  const defaultTab = activeJobs.length > 0 ? 'active' : 'completed';

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
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

      {/* Model Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {MODEL_TYPES.map((type) => {
          const typeJobs = allJobs.filter(j => j.model_type === type);
          const latestJob = typeJobs[0];
          return (
            <Card key={type} className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl mb-1">{MODEL_TYPE_ICONS[type]}</div>
                <div className="font-medium text-sm">{MODEL_TYPE_LABELS[type]}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {latestJob ? (
                    <>
                      {latestJob.processed_records.toLocaleString()} records
                      <div className="mt-1">{getStatusBadge(latestJob.status)}</div>
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

      {/* KiotViet Discount Update */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-500" />
            Cập nhật Discount KiotViet từ BigQuery
          </CardTitle>
          <CardDescription>
            Query trực tiếp <code>bdm_Tbl_KOV_Orderslineitem</code> GROUP BY OrderId → batch UPDATE discount_amount và net_revenue cho ~1M đơn KiotViet. Tự động chạy liên tục đến khi xong.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleStartDiscountUpdate} 
              disabled={discountRunning}
              variant="default"
            >
              {discountRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {discountRunning ? 'Đang chạy...' : 'Bắt đầu Update Discount'}
            </Button>

            {!discountRunning && (discountOffset > 0 || discountUpdated > 0) && (
              <Button onClick={handleResumeDiscountUpdate} variant="outline">
                <Play className="w-4 h-4 mr-2" />
                Resume từ offset {discountOffset.toLocaleString()}
              </Button>
            )}
            
            {(discountRunning || discountUpdated > 0) && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{discountUpdated.toLocaleString()}</span> orders updated
                {discountTotal > 0 && (
                  <span> / ~{discountTotal.toLocaleString()} total</span>
                )}
                {discountRunning && (
                  <span className="ml-2">(offset: {discountOffset.toLocaleString()})</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Collapsible Start New Backfill */}
      <Collapsible open={formOpen} onOpenChange={setFormOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Start New Backfill</CardTitle>
                  <CardDescription>Select a model and configure sync options</CardDescription>
                </div>
                {formOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Model Type</Label>
                  <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as BackfillModelType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date To (optional)</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Batch Size</Label>
                  <Input type="number" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} min={100} max={1000} />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={handleStartBackfill} disabled={!canStart || startBackfill.isPending}>
                  {startBackfill.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  Start Backfill
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tab-based Job Management */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue={defaultTab}>
              <TabsList>
                <TabsTrigger value="active" className="gap-2">
                  Đang chạy
                  {activeJobs.length > 0 && <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{activeJobs.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2">
                  Hoàn thành
                  {completedJobs.length > 0 && <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{completedJobs.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="failed" className="gap-2">
                  Lỗi
                  {failedJobs.length > 0 && <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">{failedJobs.length}</Badge>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <BackfillJobTable jobs={activeJobs} onCancel={handleCancel} onContinue={handleContinue} onDelete={handleDelete} isContinuePending={continueBackfill.isPending} isDeletePending={deleteBackfillJob.isPending} emptyMessage="Không có job nào đang chạy." />
              </TabsContent>
              <TabsContent value="completed">
                <BackfillJobTable jobs={completedJobs} onCancel={handleCancel} onContinue={handleContinue} onDelete={handleDelete} isContinuePending={continueBackfill.isPending} isDeletePending={deleteBackfillJob.isPending} emptyMessage="Chưa có job nào hoàn thành." />
              </TabsContent>
              <TabsContent value="failed">
                <BackfillJobTable jobs={failedJobs} onCancel={handleCancel} onContinue={handleContinue} onDelete={handleDelete} isContinuePending={continueBackfill.isPending} isDeletePending={deleteBackfillJob.isPending} emptyMessage="Không có job lỗi nào. 🎉" />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
