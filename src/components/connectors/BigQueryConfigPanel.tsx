import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  ExternalLink,
  Table,
  FolderOpen,
  Save,
  TestTube,
  Hash,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DatasetInfo {
  datasetId: string;
  tables: string[];
}

interface BigQueryConfig {
  projectId: string;
  serviceAccountKey: string;
  selectedDatasets: string[];
  selectedTables: Record<string, string[]>;
}

export function BigQueryConfigPanel() {
  const [config, setConfig] = useState<BigQueryConfig>({
    projectId: '',
    serviceAccountKey: '',
    selectedDatasets: [],
    selectedTables: {},
  });
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCounting, setIsCounting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ total_synced: number; channels: Record<string, { synced: number; errors: number }> } | null>(null);
  const [countResult, setCountResult] = useState<{ total_count: number; channels: Record<string, { count: number; error?: string }> } | null>(null);

  // Load saved config on mount
  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const savedConfig = localStorage.getItem('bigquery_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        if (parsed.projectId) {
          setConnectionStatus('connected');
        }
      }
    } catch (error) {
      console.error('Error loading saved config:', error);
    }
  };

  const handleTestConnection = async () => {
    if (!config.projectId.trim()) {
      toast.error('Vui lòng nhập Project ID');
      return;
    }

    setIsTesting(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('bigquery-list', {
        body: { 
          project_id: config.projectId,
          action: 'list_datasets'
        },
      });

      if (error) throw error;

      // Response structure: { success: true, data: { datasets: [...] } }
      const responseData = data?.data || data;
      const datasets = responseData?.datasets || [];

      if (datasets.length > 0) {
        // Fetch tables for each dataset
        const datasetsWithTables: DatasetInfo[] = [];
        
        for (const dataset of datasets) {
          const datasetId = dataset.datasetReference?.datasetId || dataset.datasetId;
          try {
            const { data: tablesResponse } = await supabase.functions.invoke('bigquery-list', {
              body: { 
                project_id: config.projectId,
                dataset_id: datasetId,
                action: 'list_tables'
              },
            });
            
            const tablesData = tablesResponse?.data || tablesResponse;
            const tables = tablesData?.tables || [];
            
            datasetsWithTables.push({
              datasetId: datasetId,
              tables: tables.map((t: any) => t.tableReference?.tableId || t.tableId)
            });
          } catch {
            datasetsWithTables.push({
              datasetId: datasetId,
              tables: []
            });
          }
        }

        setDatasets(datasetsWithTables);
        setConnectionStatus('connected');
        toast.success(`Kết nối thành công! Tìm thấy ${datasetsWithTables.length} dataset`);
      } else {
        setConnectionStatus('error');
        setErrorMessage('Không tìm thấy dataset nào');
      }
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      setErrorMessage(error.message || 'Không thể kết nối đến BigQuery');
      toast.error('Kết nối thất bại');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('bigquery_config', JSON.stringify(config));
      
      // Also create/update connector_integration in database
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('active_tenant_id')
          .eq('id', userData.user.id)
          .single();

        if (profile?.active_tenant_id) {
          // Check if integration already exists
          const { data: existing } = await supabase
            .from('connector_integrations')
            .select('id')
            .eq('tenant_id', profile.active_tenant_id)
            .eq('connector_type', 'bigquery' as any)
            .single();

          if (existing) {
            // Update existing
            await supabase
              .from('connector_integrations')
              .update({
                settings: { project_id: config.projectId },
                status: connectionStatus === 'connected' ? 'active' : 'inactive',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
          } else {
            // Create new integration
            await supabase
              .from('connector_integrations')
              .insert({
                tenant_id: profile.active_tenant_id,
                connector_type: 'bigquery' as any,
                connector_name: 'Google BigQuery',
                status: connectionStatus === 'connected' ? 'active' : 'inactive',
                settings: { project_id: config.projectId },
                created_by: userData.user.id,
              });
          }
        }
      }
      
      toast.success('Đã lưu cấu hình');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Lỗi khi lưu cấu hình');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncData = async () => {
    if (!config.projectId.trim() || !config.serviceAccountKey.trim()) {
      toast.error('Vui lòng cấu hình BigQuery trước');
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      // Get current user's tenant
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Bạn cần đăng nhập để sync dữ liệu');
      }

      // Get active tenant
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.active_tenant_id) {
        throw new Error('Không tìm thấy tenant');
      }

      // Find or create BigQuery integration
      let { data: integration } = await supabase
        .from('connector_integrations')
        .select('id')
        .eq('tenant_id', profile.active_tenant_id)
        .eq('connector_type', 'bigquery' as any)
        .single();

      if (!integration) {
        // Create new integration
        const { data: newIntegration, error: createError } = await supabase
          .from('connector_integrations')
          .insert({
            tenant_id: profile.active_tenant_id,
            connector_type: 'bigquery' as any,
            connector_name: 'Google BigQuery',
            status: 'inactive',
            settings: { project_id: config.projectId },
            created_by: userData.user.id,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        integration = newIntegration;
      }

      // Call sync function
      const { data, error } = await supabase.functions.invoke('sync-bigquery', {
        body: {
          integration_id: integration.id,
          tenant_id: profile.active_tenant_id,
          channels: ['shopee', 'lazada', 'tiktok', 'tiki'],
          days_back: 30,
          service_account_key: config.serviceAccountKey,
          project_id: config.projectId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setSyncResult(data.data);
        toast.success(`Đã sync ${data.data.total_synced} đơn hàng từ BigQuery`);
      } else {
        throw new Error(data?.error || 'Sync thất bại');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Lỗi khi sync dữ liệu');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCountRecords = async () => {
    if (!config.projectId.trim() || !config.serviceAccountKey.trim()) {
      toast.error('Vui lòng cấu hình BigQuery trước');
      return;
    }

    setIsCounting(true);
    setCountResult(null);

    try {
      // Get current user's tenant
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Bạn cần đăng nhập');
      }

      // Get active tenant
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.active_tenant_id) {
        throw new Error('Không tìm thấy tenant');
      }

      // Call count function
      const { data, error } = await supabase.functions.invoke('sync-bigquery', {
        body: {
          tenant_id: profile.active_tenant_id,
          channels: ['shopee', 'lazada', 'tiktok', 'tiki'],
          service_account_key: config.serviceAccountKey,
          project_id: config.projectId,
          action: 'count',
        },
      });

      if (error) throw error;

      if (data?.success) {
        setCountResult(data.data);
        toast.success(`Tổng cộng ${data.data.total_count.toLocaleString()} records có thể sync`);
      } else {
        throw new Error(data?.error || 'Count thất bại');
      }
    } catch (error: any) {
      console.error('Count error:', error);
      toast.error(error.message || 'Lỗi khi đếm records');
    } finally {
      setIsCounting(false);
    }
  };

  const toggleDataset = (datasetId: string) => {
    setExpandedDatasets(prev => {
      const next = new Set(prev);
      if (next.has(datasetId)) {
        next.delete(datasetId);
      } else {
        next.add(datasetId);
      }
      return next;
    });
  };

  const toggleDatasetSelection = (datasetId: string, checked: boolean) => {
    setConfig(prev => {
      const newSelectedDatasets = checked
        ? [...prev.selectedDatasets, datasetId]
        : prev.selectedDatasets.filter(id => id !== datasetId);
      
      const dataset = datasets.find(d => d.datasetId === datasetId);
      const newSelectedTables = { ...prev.selectedTables };
      
      if (checked && dataset) {
        newSelectedTables[datasetId] = [...dataset.tables];
      } else {
        delete newSelectedTables[datasetId];
      }
      
      return {
        ...prev,
        selectedDatasets: newSelectedDatasets,
        selectedTables: newSelectedTables,
      };
    });
  };

  const toggleTableSelection = (datasetId: string, tableId: string, checked: boolean) => {
    setConfig(prev => {
      const currentTables = prev.selectedTables[datasetId] || [];
      const newTables = checked
        ? [...currentTables, tableId]
        : currentTables.filter(t => t !== tableId);
      
      const newSelectedTables = {
        ...prev.selectedTables,
        [datasetId]: newTables,
      };

      // Update dataset selection based on table selection
      const dataset = datasets.find(d => d.datasetId === datasetId);
      let newSelectedDatasets = [...prev.selectedDatasets];
      
      if (newTables.length > 0 && !newSelectedDatasets.includes(datasetId)) {
        newSelectedDatasets.push(datasetId);
      } else if (newTables.length === 0) {
        newSelectedDatasets = newSelectedDatasets.filter(id => id !== datasetId);
        delete newSelectedTables[datasetId];
      }

      return {
        ...prev,
        selectedDatasets: newSelectedDatasets,
        selectedTables: newSelectedTables,
      };
    });
  };

  const getSelectedCount = () => {
    let tableCount = 0;
    Object.values(config.selectedTables).forEach(tables => {
      tableCount += tables.length;
    });
    return {
      datasets: config.selectedDatasets.length,
      tables: tableCount,
    };
  };

  const selectedCount = getSelectedCount();

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Database className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">BigQuery Configuration</h3>
          <p className="text-sm text-muted-foreground">Cấu hình kết nối Google BigQuery</p>
        </div>
        <Badge 
          variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'error' ? 'destructive' : 'secondary'}
          className="gap-1"
        >
          {connectionStatus === 'connected' && <CheckCircle2 className="w-3 h-3" />}
          {connectionStatus === 'error' && <AlertCircle className="w-3 h-3" />}
          {connectionStatus === 'connected' ? 'Đã kết nối' : connectionStatus === 'error' ? 'Lỗi' : 'Chưa kết nối'}
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Service Account Key Input */}
        <div className="space-y-2">
          <Label htmlFor="service-account-key">Service Account Key (JSON)</Label>
          <Textarea
            id="service-account-key"
            placeholder='{"type": "service_account", "project_id": "...", "private_key_id": "...", ...}'
            value={config.serviceAccountKey}
            onChange={(e) => {
              const value = e.target.value;
              setConfig(prev => {
                // Auto-extract project_id from JSON if valid
                let projectId = prev.projectId;
                try {
                  if (value.trim()) {
                    const parsed = JSON.parse(value);
                    if (parsed.project_id) {
                      projectId = parsed.project_id;
                    }
                  }
                } catch {
                  // Invalid JSON, ignore
                }
                return { ...prev, serviceAccountKey: value, projectId };
              });
            }}
            className="font-mono text-xs min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground">
            Dán nội dung file JSON Service Account từ Google Cloud Console
          </p>
        </div>

        {/* Project ID Input */}
        <div className="space-y-2">
          <Label htmlFor="project-id">Google Cloud Project ID</Label>
          <div className="flex gap-2">
            <Input
              id="project-id"
              placeholder="your-project-id"
              value={config.projectId}
              onChange={(e) => setConfig(prev => ({ ...prev, projectId: e.target.value }))}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={isTesting || !config.projectId.trim() || !config.serviceAccountKey.trim()}
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tự động điền từ Service Account JSON hoặc nhập thủ công
          </p>
        </div>

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            {errorMessage}
          </motion.div>
        )}

        {/* Datasets and Tables Selection */}
        {datasets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Chọn Datasets & Tables</h4>
                <p className="text-sm text-muted-foreground">
                  Chọn các dataset và bảng bạn muốn sync
                </p>
              </div>
              {selectedCount.datasets > 0 && (
                <Badge variant="secondary">
                  {selectedCount.datasets} dataset, {selectedCount.tables} bảng
                </Badge>
              )}
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {datasets.map((dataset) => {
                const isExpanded = expandedDatasets.has(dataset.datasetId);
                const isSelected = config.selectedDatasets.includes(dataset.datasetId);
                const selectedTableCount = config.selectedTables[dataset.datasetId]?.length || 0;

                return (
                  <Collapsible 
                    key={dataset.datasetId} 
                    open={isExpanded}
                    onOpenChange={() => toggleDataset(dataset.datasetId)}
                  >
                    <div className={cn(
                      "border rounded-lg transition-colors",
                      isSelected ? "border-primary bg-primary/5" : "border-border"
                    )}>
                      <div className="flex items-center gap-3 p-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => toggleDatasetSelection(dataset.datasetId, checked as boolean)}
                        />
                        <CollapsibleTrigger className="flex items-center gap-2 flex-1 hover:text-primary transition-colors">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <FolderOpen className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{dataset.datasetId}</span>
                        </CollapsibleTrigger>
                        <Badge variant="outline" className="text-xs">
                          {dataset.tables.length} bảng
                        </Badge>
                        {selectedTableCount > 0 && selectedTableCount < dataset.tables.length && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedTableCount} đã chọn
                          </Badge>
                        )}
                      </div>

                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-1 border-t border-border/50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            {dataset.tables.map((table) => {
                              const isTableSelected = config.selectedTables[dataset.datasetId]?.includes(table);
                              return (
                                <label
                                  key={table}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                                    isTableSelected ? "bg-primary/10" : "hover:bg-muted"
                                  )}
                                >
                                  <Checkbox
                                    checked={isTableSelected}
                                    onCheckedChange={(checked) => toggleTableSelection(dataset.datasetId, table, checked as boolean)}
                                  />
                                  <Table className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-sm truncate">{table}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>

            <Separator />

            {/* Count Result */}
            {countResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    Tổng cộng: {countResult.total_count.toLocaleString()} records có thể sync
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {Object.entries(countResult.channels || {}).map(([channel, data]) => (
                    <div key={channel} className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs capitalize">{channel}</Badge>
                      <span className="text-muted-foreground">
                        {data.count.toLocaleString()}
                        {data.error && <span className="text-red-500 ml-1" title={data.error}>⚠</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Sync Result */}
            {syncResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-300">
                    Sync thành công: {syncResult.total_synced} đơn hàng
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {Object.entries(syncResult.channels || {}).map(([channel, stats]) => (
                    <div key={channel} className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs capitalize">{channel}</Badge>
                      <span className="text-muted-foreground">
                        {stats.synced} ✓ {stats.errors > 0 && <span className="text-red-500">({stats.errors} lỗi)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Save & Sync Buttons */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground flex-1">
                  Nhấn "Đếm records" để xem số lượng trước khi sync.
                </p>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Button onClick={handleSaveConfig} disabled={isSaving} variant="outline" size="sm">
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Lưu cấu hình
                  </Button>
                  <Button 
                    onClick={handleCountRecords} 
                    disabled={isCounting || connectionStatus !== 'connected'}
                    variant="outline"
                    size="sm"
                  >
                    {isCounting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Hash className="w-4 h-4 mr-2" />
                    )}
                    Đếm records
                  </Button>
                  <Button 
                    onClick={handleSyncData} 
                    disabled={isSyncing || connectionStatus !== 'connected'}
                    size="sm"
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sync Data
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Help Section */}
        <div className="p-4 rounded-lg bg-muted/50">
          <h4 className="font-medium text-sm mb-2">Hướng dẫn kết nối</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Đảm bảo Service Account có quyền BigQuery Data Viewer</li>
            <li>Nhập Project ID từ Google Cloud Console</li>
            <li>Nhấn "Test Connection" để kiểm tra kết nối</li>
            <li>Chọn các dataset và bảng cần sync</li>
            <li>Lưu cấu hình và bắt đầu sync dữ liệu</li>
          </ol>
          <Button variant="link" className="px-0 h-auto mt-2" asChild>
            <a href="https://cloud.google.com/bigquery/docs" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />
              Xem tài liệu BigQuery
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );
}
