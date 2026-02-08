/**
 * BigQuery Backfill Admin Page - Tab-based Job Management
 * 
 * @architecture Layer 10 Integration UI
 * Jobs split into Active / Completed / Failed tabs for easy monitoring.
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Collapsible, CollapsibleContent, CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  Play, RefreshCw, Loader2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { BackfillJobTable, getStatusBadge } from '@/components/admin/BackfillJobTable';

const MODEL_TYPES: BackfillModelType[] = [
  'customers', 'products', 'orders', 'order_items', 'refunds',
  'payments', 'fulfillments', 'inventory', 'campaigns', 'ad_spend',
];

const E2E_TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

export default function BigQueryBackfillPage() {
  const { startBackfill, continueBackfill, cancelBackfill, deleteBackfillJob, isReady, tenantId } = useBigQueryBackfill();
  const { data: jobs, isLoading, refetch } = useAllBackfillJobs();
  
  const [selectedModel, setSelectedModel] = useState<BackfillModelType>('customers');
  const [dateFrom, setDateFrom] = useState('2025-01-01');
  const [dateTo, setDateTo] = useState('');
  const [batchSize, setBatchSize] = useState('500');
  const [formOpen, setFormOpen] = useState(false);
  
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

      {/* Model Overview Cards - ALL 10 models */}
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

      {/* Collapsible Start New Backfill */}
      <Collapsible open={formOpen} onOpenChange={setFormOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Start New Backfill</CardTitle>
                  <CardDescription>
                    Select a model and configure sync options
                  </CardDescription>
                </div>
                {formOpen ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
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
                  {startBackfill.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
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
                  {activeJobs.length > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                      {activeJobs.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2">
                  Hoàn thành
                  {completedJobs.length > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                      {completedJobs.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="failed" className="gap-2">
                  Lỗi
                  {failedJobs.length > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                      {failedJobs.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <BackfillJobTable
                  jobs={activeJobs}
                  onCancel={handleCancel}
                  onContinue={handleContinue}
                  onDelete={handleDelete}
                  isContinuePending={continueBackfill.isPending}
                  isDeletePending={deleteBackfillJob.isPending}
                  emptyMessage="Không có job nào đang chạy."
                />
              </TabsContent>

              <TabsContent value="completed">
                <BackfillJobTable
                  jobs={completedJobs}
                  onCancel={handleCancel}
                  onContinue={handleContinue}
                  onDelete={handleDelete}
                  isContinuePending={continueBackfill.isPending}
                  isDeletePending={deleteBackfillJob.isPending}
                  emptyMessage="Chưa có job nào hoàn thành."
                />
              </TabsContent>

              <TabsContent value="failed">
                <BackfillJobTable
                  jobs={failedJobs}
                  onCancel={handleCancel}
                  onContinue={handleContinue}
                  onDelete={handleDelete}
                  isContinuePending={continueBackfill.isPending}
                  isDeletePending={deleteBackfillJob.isPending}
                  emptyMessage="Không có job lỗi nào. 🎉"
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
