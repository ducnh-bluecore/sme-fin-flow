import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Plus, 
  Settings, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Link2,
  Loader2,
  Save,
  Sparkles,
  Wand2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Trash2,
  Code,
  Layers,
  Zap,
  Copy,
  Info,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useBigQueryDataModels, useUpsertDataModel, useSyncWatermarks } from '@/hooks/useBigQueryRealtime';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Updated interface for grouped suggestions (multiple sources per model)
interface SourceTable {
  dataset: string;
  table: string;
  channel: string;
  row_count: number;
  schema_fields: Array<{ name: string; type: string; mode: string }>;
  primary_key_field: string | null;
  timestamp_field: string | null;
  match_score: number;
  match_reason: string;
}

interface AISuggestion {
  model_name: string;
  model_label: string;
  description: string;
  target_table: string;
  sources: SourceTable[];
  total_rows: number;
  confidence: number;
  channels: string[];
  recommended_sync_query: string;
}

// Source configuration for multi-source models
interface SourceConfig {
  id: string;
  dataset: string;
  table: string;
  channel?: string;
  filter_condition?: string;
}

interface DataModelConfig {
  model_name: string;
  model_label: string;
  description?: string;
  bigquery_dataset: string;
  bigquery_table: string;
  primary_key_field: string;
  timestamp_field?: string;
  target_table?: string;
  is_enabled: boolean;
  sync_frequency_hours: number;
  // Extended config
  sources?: SourceConfig[];
  custom_query?: string;
  field_mapping?: Record<string, string>;
  sync_mode?: 'full' | 'incremental';
  batch_size?: number;
}

// Available target tables in the system
const TARGET_TABLES = [
  { value: 'external_orders', label: 'Đơn hàng (external_orders)' },
  { value: 'external_order_items', label: 'Chi tiết đơn (external_order_items)' },
  { value: 'external_products', label: 'Sản phẩm (external_products)' },
  { value: 'customers', label: 'Khách hàng (customers)' },
  { value: 'channel_settlements', label: 'Thanh toán (channel_settlements)' },
  { value: 'channel_fees', label: 'Phí kênh (channel_fees)' },
  { value: 'inventory_items', label: 'Tồn kho (inventory_items)' },
  { value: 'promotions', label: 'Khuyến mãi (promotions)' },
  { value: 'invoices', label: 'Hóa đơn (invoices)' },
  { value: 'bills', label: 'Chi phí (bills)' },
  { value: 'bank_transactions', label: 'Giao dịch NH (bank_transactions)' },
];

const DEFAULT_MODELS: DataModelConfig[] = [
  {
    model_name: 'orders',
    model_label: 'Đơn hàng',
    description: 'Dữ liệu đơn hàng từ các kênh e-commerce',
    bigquery_dataset: 'menstaysimplicity_shopee',
    bigquery_table: 'shopee_Orders',
    primary_key_field: 'order_sn',
    timestamp_field: 'create_time',
    target_table: 'external_orders',
    is_enabled: true,
    sync_frequency_hours: 1,
  },
  {
    model_name: 'settlements',
    model_label: 'Thanh toán',
    description: 'Dữ liệu thanh toán và đối soát',
    bigquery_dataset: 'menstaysimplicity_shopee',
    bigquery_table: 'shopee_Settlements',
    primary_key_field: 'settlement_id',
    timestamp_field: 'settlement_date',
    target_table: 'channel_settlements',
    is_enabled: false,
    sync_frequency_hours: 24,
  },
  {
    model_name: 'cash_flow',
    model_label: 'Dòng tiền',
    description: 'Dữ liệu dòng tiền và thanh toán',
    bigquery_dataset: 'finance',
    bigquery_table: 'cash_flow',
    primary_key_field: 'transaction_id',
    timestamp_field: 'transaction_date',
    target_table: 'bank_transactions',
    is_enabled: false,
    sync_frequency_hours: 6,
  },
  {
    model_name: 'customers',
    model_label: 'Khách hàng',
    description: 'Dữ liệu khách hàng từ CDP',
    bigquery_dataset: 'customer_data',
    bigquery_table: 'customers',
    primary_key_field: 'customer_id',
    timestamp_field: 'updated_at',
    target_table: 'customers',
    is_enabled: false,
    sync_frequency_hours: 24,
  },
  {
    model_name: 'marketing',
    model_label: 'Marketing',
    description: 'Dữ liệu chi phí marketing từ các nền tảng',
    bigquery_dataset: 'marketing_data',
    bigquery_table: 'ad_spend',
    primary_key_field: 'campaign_id',
    timestamp_field: 'date',
    target_table: 'marketing_expenses',
    is_enabled: false,
    sync_frequency_hours: 24,
  },
];

export function DataModelManager() {
  const { data: models, isLoading, refetch } = useBigQueryDataModels();
  const { data: watermarks } = useSyncWatermarks();
  const upsertModel = useUpsertDataModel();
  const tenantId = useActiveTenantId();
  
  const [editingModel, setEditingModel] = useState<DataModelConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // AI Suggestions state
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  // Merge default models with saved configs, plus include any models from DB not in defaults
  const displayModels = (() => {
    // Start with default models merged with any saved overrides
    const mergedDefaults = DEFAULT_MODELS.map(defaultModel => {
      const savedModel = models?.find(m => m.model_name === defaultModel.model_name);
      if (savedModel) {
        return {
          ...defaultModel,
          ...savedModel,
          is_enabled: savedModel.is_enabled ?? defaultModel.is_enabled,
        };
      }
      return defaultModel;
    });
    
    // Add any saved models that are NOT in the default list (e.g., AI suggestions)
    const defaultModelNames = DEFAULT_MODELS.map(m => m.model_name);
    const additionalModels = (models || [])
      .filter(m => !defaultModelNames.includes(m.model_name))
      .map(m => ({
        model_name: m.model_name,
        model_label: m.model_label,
        description: m.description || '',
        bigquery_dataset: m.bigquery_dataset,
        bigquery_table: m.bigquery_table,
        primary_key_field: m.primary_key_field,
        timestamp_field: m.timestamp_field || '',
        target_table: m.target_table || '',
        is_enabled: m.is_enabled ?? false,
        sync_frequency_hours: m.sync_frequency_hours || 24,
      }));
    
    return [...mergedDefaults, ...additionalModels];
  })();

  // Fetch AI suggestions
  const handleFetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    setShowSuggestions(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('suggest-data-models', {
        body: {}
      });
      
      if (error) throw error;
      
      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions);
        toast.success(`Đã phân tích ${data.total_analyzed} bảng từ BigQuery`);
      } else {
        throw new Error(data.error || 'Failed to get suggestions');
      }
    } catch (error: any) {
      console.error('Error fetching suggestions:', error);
      toast.error('Lỗi: ' + (error.message || 'Không thể lấy đề xuất'));
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Add suggestion as data model (using first source as primary)
  const handleAddSuggestion = async (suggestion: AISuggestion) => {
    if (!tenantId) return;
    
    try {
      const primarySource = suggestion.sources[0];
      if (!primarySource) {
        throw new Error('No source tables found');
      }
      
      await upsertModel.mutateAsync({
        model_name: suggestion.model_name,
        model_label: suggestion.model_label,
        description: suggestion.description,
        bigquery_dataset: primarySource.dataset,
        bigquery_table: primarySource.table,
        primary_key_field: primarySource.primary_key_field || 'id',
        timestamp_field: primarySource.timestamp_field || undefined,
        target_table: suggestion.target_table || undefined,
        is_enabled: false,
        sync_frequency_hours: 24,
      });
      
      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.model_name !== suggestion.model_name));
      toast.success(`Đã thêm "${suggestion.model_label}" với ${suggestion.sources.length} nguồn`);
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-500';
    if (confidence >= 40) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 70) return { variant: 'default' as const, label: 'Cao' };
    if (confidence >= 40) return { variant: 'secondary' as const, label: 'Trung bình' };
    return { variant: 'outline' as const, label: 'Thấp' };
  };

  const handleEditModel = (model: DataModelConfig) => {
    setEditingModel({ ...model });
    setIsDialogOpen(true);
  };

  const handleSaveModel = async () => {
    if (!editingModel) return;
    
    await upsertModel.mutateAsync(editingModel);
    setIsDialogOpen(false);
    setEditingModel(null);
  };

  const handleToggleEnabled = async (model: DataModelConfig, enabled: boolean) => {
    await upsertModel.mutateAsync({
      ...model,
      is_enabled: enabled,
    });
  };

  const getWatermark = (modelName: string) => {
    return watermarks?.find(w => w.data_model === modelName);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Data Model Connectors</h3>
            <p className="text-sm text-muted-foreground">
              Kết nối và đồng bộ các data models từ BigQuery
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleFetchSuggestions}
            disabled={isLoadingSuggestions}
            className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30 hover:border-violet-500/50"
          >
            {isLoadingSuggestions ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
            )}
            AI Đề xuất
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            setEditingModel({
              model_name: '',
              model_label: '',
              description: '',
              bigquery_dataset: '',
              bigquery_table: '',
              primary_key_field: '',
              timestamp_field: '',
              target_table: '',
              is_enabled: false,
              sync_frequency_hours: 24,
            });
            setIsDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm Model
          </Button>
        </div>
      </div>

      {/* AI Suggestions Panel */}
      {showSuggestions && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden"
        >
          <Card className="p-4 border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-violet-500" />
                <h4 className="font-semibold">AI Đề xuất Data Models</h4>
                {suggestions.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {suggestions.length} đề xuất
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowSuggestions(false)}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>

            {isLoadingSuggestions ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Đang phân tích schema BigQuery...
                </p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Database className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Không tìm thấy bảng phù hợp</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {suggestions.map((suggestion) => {
                    const badge = getConfidenceBadge(suggestion.confidence);
                    const isExpanded = expandedSuggestion === suggestion.model_name;
                    const primarySource = suggestion.sources[0];
                    
                    return (
                      <Collapsible
                        key={suggestion.model_name}
                        open={isExpanded}
                        onOpenChange={() => setExpandedSuggestion(
                          isExpanded ? null : suggestion.model_name
                        )}
                      >
                        <Card className="p-3 bg-background/50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">
                                  {suggestion.model_label}
                                </span>
                                <Badge variant={badge.variant} className="text-xs">
                                  {suggestion.confidence}% {badge.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {suggestion.sources.length} nguồn
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {suggestion.channels.map(ch => (
                                  <Badge key={ch} variant="secondary" className="text-xs capitalize">
                                    {ch}
                                  </Badge>
                                ))}
                                <span className="text-xs text-muted-foreground">
                                  • {suggestion.total_rows.toLocaleString()} records
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              <Button
                                size="sm"
                                onClick={() => handleAddSuggestion(suggestion)}
                                disabled={upsertModel.isPending}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Thêm
                              </Button>
                            </div>
                          </div>

                          <CollapsibleContent>
                            <div className="mt-3 pt-3 border-t space-y-4">
                              {/* Target table */}
                              <div className="flex items-center gap-2">
                                <ArrowRight className="w-4 h-4 text-primary" />
                                <span className="text-sm">Target:</span>
                                <Badge variant="default" className="font-mono">
                                  {suggestion.target_table}
                                </Badge>
                              </div>

                              {/* Source tables */}
                              <div>
                                <p className="text-xs font-medium mb-2">
                                  Các bảng nguồn ({suggestion.sources.length}):
                                </p>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {suggestion.sources.map((source, idx) => (
                                    <div 
                                      key={`${source.dataset}.${source.table}`}
                                      className="p-2 rounded bg-muted/50 text-xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono font-medium">
                                          {source.dataset}.{source.table}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="capitalize">
                                            {source.channel}
                                          </Badge>
                                          <span className="text-muted-foreground">
                                            {source.row_count.toLocaleString()} rows
                                          </span>
                                        </div>
                                      </div>
                                      <p className="text-muted-foreground mt-1">
                                        {source.match_reason}
                                      </p>
                                      <div className="flex gap-4 mt-1 text-muted-foreground">
                                        <span>PK: <code>{source.primary_key_field || 'N/A'}</code></span>
                                        <span>Time: <code>{source.timestamp_field || 'N/A'}</code></span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Recommended query preview */}
                              {suggestion.recommended_sync_query && (
                                <div>
                                  <p className="text-xs font-medium mb-1">Query đề xuất:</p>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-24">
                                    {suggestion.recommended_sync_query}
                                  </pre>
                                </div>
                              )}

                              {/* First source schema preview */}
                              {primarySource?.schema_fields && (
                                <div>
                                  <p className="text-xs font-medium mb-1">
                                    Schema mẫu ({primarySource.schema_fields.length} fields):
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {primarySource.schema_fields.slice(0, 8).map((field) => (
                                      <Badge 
                                        key={field.name} 
                                        variant="outline" 
                                        className="text-xs font-mono"
                                      >
                                        {field.name}
                                        <span className="ml-1 text-muted-foreground">
                                          ({field.type})
                                        </span>
                                      </Badge>
                                    ))}
                                    {primarySource.schema_fields.length > 8 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{primarySource.schema_fields.length - 8} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </Card>
        </motion.div>
      )}

      {/* Model Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-2" />
              <div className="h-3 bg-muted rounded w-full mb-4" />
              <div className="h-8 bg-muted rounded w-full" />
            </Card>
          ))
        ) : (
          displayModels.map((model) => {
            const watermark = getWatermark(model.model_name);
            
            return (
              <motion.div
                key={model.model_name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={cn(
                  'p-4 transition-all',
                  model.is_enabled ? 'border-primary/50' : 'opacity-75'
                )}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{model.model_label}</h4>
                        <Badge variant={model.is_enabled ? 'default' : 'secondary'} className="text-xs">
                          {model.is_enabled ? 'Đang bật' : 'Tắt'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {model.description}
                      </p>
                    </div>
                    <Switch
                      checked={model.is_enabled}
                      onCheckedChange={(checked) => handleToggleEnabled(model, checked)}
                    />
                  </div>

                  <div className="space-y-2 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-3 h-3" />
                      <span className="font-mono">{model.bigquery_dataset}.{model.bigquery_table}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link2 className="w-3 h-3" />
                      <span>Target: <span className="font-mono">{model.target_table || 'Chưa cấu hình'}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3 h-3" />
                      <span>Sync: mỗi {model.sync_frequency_hours}h</span>
                    </div>
                  </div>

                  {/* Sync Status */}
                  {watermark && (
                    <div className="mb-4 p-2 rounded-md bg-muted/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Lần sync cuối:</span>
                        <span>
                          {watermark.last_sync_at 
                            ? new Date(watermark.last_sync_at).toLocaleString('vi-VN')
                            : 'Chưa sync'
                          }
                        </span>
                      </div>
                      {watermark.total_records_synced > 0 && (
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-muted-foreground">Records:</span>
                          <span>{watermark.total_records_synced.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        {watermark.sync_status === 'completed' && (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        )}
                        {watermark.sync_status === 'failed' && (
                          <XCircle className="w-3 h-3 text-destructive" />
                        )}
                        {watermark.sync_status === 'syncing' && (
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        )}
                        <span className="text-xs capitalize">{watermark.sync_status}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditModel(model)}
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Cấu hình
                    </Button>
                    {model.is_enabled && (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        disabled={watermark?.sync_status === 'syncing'}
                      >
                        <RefreshCw className={cn(
                          'w-3 h-3 mr-1',
                          watermark?.sync_status === 'syncing' && 'animate-spin'
                        )} />
                        Sync
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Enhanced Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              {editingModel?.model_name ? 'Chỉnh sửa Data Model' : 'Thêm Data Model'}
            </DialogTitle>
            <DialogDescription>
              Cấu hình kết nối và mapping dữ liệu từ BigQuery
            </DialogDescription>
          </DialogHeader>

          {editingModel && (
            <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic" className="flex items-center gap-1">
                  <Settings className="w-3 h-3" />
                  Cơ bản
                </TabsTrigger>
                <TabsTrigger value="sources" className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Nguồn dữ liệu
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center gap-1">
                  <Code className="w-3 h-3" />
                  Nâng cao
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                {/* Basic Tab */}
                <TabsContent value="basic" className="space-y-4 mt-0 pr-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Tên Model
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3 h-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>ID duy nhất, dùng snake_case</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        value={editingModel.model_name}
                        onChange={(e) => setEditingModel({
                          ...editingModel,
                          model_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                        })}
                        placeholder="orders"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nhãn hiển thị</Label>
                      <Input
                        value={editingModel.model_label}
                        onChange={(e) => setEditingModel({
                          ...editingModel,
                          model_label: e.target.value,
                        })}
                        placeholder="Đơn hàng"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Textarea
                      value={editingModel.description || ''}
                      onChange={(e) => setEditingModel({
                        ...editingModel,
                        description: e.target.value,
                      })}
                      placeholder="Dữ liệu đơn hàng từ các kênh e-commerce (Shopee, Lazada, TikTok...)"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Target Table (Bảng đích)</Label>
                    <Select
                      value={editingModel.target_table || ''}
                      onValueChange={(v) => setEditingModel({
                        ...editingModel,
                        target_table: v,
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn bảng đích..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_TABLES.map(t => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Primary Key Field</Label>
                      <Input
                        value={editingModel.primary_key_field}
                        onChange={(e) => setEditingModel({
                          ...editingModel,
                          primary_key_field: e.target.value,
                        })}
                        placeholder="order_id hoặc order_sn"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Timestamp Field</Label>
                      <Input
                        value={editingModel.timestamp_field || ''}
                        onChange={(e) => setEditingModel({
                          ...editingModel,
                          timestamp_field: e.target.value,
                        })}
                        placeholder="created_at hoặc create_time"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tần suất sync</Label>
                      <Select
                        value={String(editingModel.sync_frequency_hours)}
                        onValueChange={(v) => setEditingModel({
                          ...editingModel,
                          sync_frequency_hours: parseInt(v),
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Mỗi giờ</SelectItem>
                          <SelectItem value="3">Mỗi 3 giờ</SelectItem>
                          <SelectItem value="6">Mỗi 6 giờ</SelectItem>
                          <SelectItem value="12">Mỗi 12 giờ</SelectItem>
                          <SelectItem value="24">Mỗi ngày</SelectItem>
                          <SelectItem value="168">Mỗi tuần</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sync Mode</Label>
                      <Select
                        value={editingModel.sync_mode || 'incremental'}
                        onValueChange={(v) => setEditingModel({
                          ...editingModel,
                          sync_mode: v as 'full' | 'incremental',
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="incremental">
                            <div className="flex items-center gap-2">
                              <Zap className="w-3 h-3" />
                              Incremental (nhanh)
                            </div>
                          </SelectItem>
                          <SelectItem value="full">
                            <div className="flex items-center gap-2">
                              <RefreshCw className="w-3 h-3" />
                              Full sync (toàn bộ)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <Label>Kích hoạt</Label>
                      <p className="text-xs text-muted-foreground">
                        Bật/tắt đồng bộ dữ liệu cho model này
                      </p>
                    </div>
                    <Switch
                      checked={editingModel.is_enabled}
                      onCheckedChange={(checked) => setEditingModel({
                        ...editingModel,
                        is_enabled: checked,
                      })}
                    />
                  </div>
                </TabsContent>

                {/* Sources Tab */}
                <TabsContent value="sources" className="space-y-4 mt-0 pr-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Nguồn dữ liệu BigQuery</Label>
                      <p className="text-xs text-muted-foreground">
                        Có thể thêm nhiều bảng từ nhiều nguồn khác nhau
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newSource: SourceConfig = {
                          id: crypto.randomUUID(),
                          dataset: '',
                          table: '',
                          channel: '',
                        };
                        setEditingModel({
                          ...editingModel,
                          sources: [...(editingModel.sources || []), newSource],
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Thêm nguồn
                    </Button>
                  </div>

                  {/* Primary source (required) */}
                  <Card className="p-4 border-primary/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="default">Nguồn chính</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Dataset</Label>
                        <Input
                          value={editingModel.bigquery_dataset}
                          onChange={(e) => setEditingModel({
                            ...editingModel,
                            bigquery_dataset: e.target.value,
                          })}
                          placeholder="menstaysimplicity_shopee"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Table</Label>
                        <Input
                          value={editingModel.bigquery_table}
                          onChange={(e) => setEditingModel({
                            ...editingModel,
                            bigquery_table: e.target.value,
                          })}
                          placeholder="shopee_Orders"
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Additional sources */}
                  {(editingModel.sources || []).map((source, index) => (
                    <Card key={source.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="secondary">Nguồn #{index + 2}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingModel({
                              ...editingModel,
                              sources: editingModel.sources?.filter(s => s.id !== source.id),
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Dataset</Label>
                          <Input
                            value={source.dataset}
                            onChange={(e) => {
                              const updated = editingModel.sources?.map(s =>
                                s.id === source.id ? { ...s, dataset: e.target.value } : s
                              );
                              setEditingModel({ ...editingModel, sources: updated });
                            }}
                            placeholder="dataset_name"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Table</Label>
                          <Input
                            value={source.table}
                            onChange={(e) => {
                              const updated = editingModel.sources?.map(s =>
                                s.id === source.id ? { ...s, table: e.target.value } : s
                              );
                              setEditingModel({ ...editingModel, sources: updated });
                            }}
                            placeholder="table_name"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Channel</Label>
                          <Input
                            value={source.channel || ''}
                            onChange={(e) => {
                              const updated = editingModel.sources?.map(s =>
                                s.id === source.id ? { ...s, channel: e.target.value } : s
                              );
                              setEditingModel({ ...editingModel, sources: updated });
                            }}
                            placeholder="lazada"
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-2 space-y-1">
                        <Label className="text-xs">Filter Condition (optional)</Label>
                        <Input
                          value={source.filter_condition || ''}
                          onChange={(e) => {
                            const updated = editingModel.sources?.map(s =>
                              s.id === source.id ? { ...s, filter_condition: e.target.value } : s
                            );
                            setEditingModel({ ...editingModel, sources: updated });
                          }}
                          placeholder="WHERE status = 'completed'"
                          className="font-mono text-sm"
                        />
                      </div>
                    </Card>
                  ))}

                  {(editingModel.sources || []).length === 0 && (
                    <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Thêm nguồn dữ liệu bổ sung</p>
                      <p className="text-xs">Ví dụ: lazada_Orders, tiktok_Orders...</p>
                    </div>
                  )}
                </TabsContent>

                {/* Advanced Tab */}
                <TabsContent value="advanced" className="space-y-4 mt-0 pr-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Custom Query (SQL)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Viết query tùy chỉnh để lấy dữ liệu. Nếu để trống, hệ thống sẽ tự tạo query từ các nguồn đã cấu hình.
                    </p>
                    <Textarea
                      value={editingModel.custom_query || ''}
                      onChange={(e) => setEditingModel({
                        ...editingModel,
                        custom_query: e.target.value,
                      })}
                      placeholder={`SELECT * FROM \`project.dataset.table\`
UNION ALL
SELECT * FROM \`project.dataset.table2\`
WHERE create_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)`}
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Batch Size</Label>
                    <p className="text-xs text-muted-foreground">
                      Số records xử lý mỗi batch khi sync
                    </p>
                    <Select
                      value={String(editingModel.batch_size || 1000)}
                      onValueChange={(v) => setEditingModel({
                        ...editingModel,
                        batch_size: parseInt(v),
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100 records</SelectItem>
                        <SelectItem value="500">500 records</SelectItem>
                        <SelectItem value="1000">1,000 records</SelectItem>
                        <SelectItem value="5000">5,000 records</SelectItem>
                        <SelectItem value="10000">10,000 records</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Field Mapping (JSON)</Label>
                    <p className="text-xs text-muted-foreground">
                      Mapping giữa field BigQuery và field target table
                    </p>
                    <Textarea
                      value={editingModel.field_mapping ? JSON.stringify(editingModel.field_mapping, null, 2) : ''}
                      onChange={(e) => {
                        try {
                          const mapping = e.target.value ? JSON.parse(e.target.value) : undefined;
                          setEditingModel({
                            ...editingModel,
                            field_mapping: mapping,
                          });
                        } catch {
                          // Invalid JSON, just update the raw value
                        }
                      }}
                      placeholder={`{
  "order_sn": "external_order_id",
  "create_time": "order_date",
  "buyer_user_name": "customer_name"
}`}
                      rows={5}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Generate Query Preview */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm">Query Preview</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const query = generateQueryPreview(editingModel);
                          navigator.clipboard.writeText(query);
                          toast.success('Đã copy query');
                        }}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <pre className="text-xs font-mono bg-background p-2 rounded overflow-x-auto">
                      {generateQueryPreview(editingModel)}
                    </pre>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveModel} disabled={upsertModel.isPending}>
              {upsertModel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Lưu cấu hình
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to generate query preview
function generateQueryPreview(model: DataModelConfig): string {
  if (model.custom_query) {
    return model.custom_query;
  }

  const queries: string[] = [];
  
  // Primary source
  if (model.bigquery_dataset && model.bigquery_table) {
    queries.push(`SELECT * FROM \`${model.bigquery_dataset}.${model.bigquery_table}\``);
  }
  
  // Additional sources
  if (model.sources) {
    for (const source of model.sources) {
      if (source.dataset && source.table) {
        let query = `SELECT * FROM \`${source.dataset}.${source.table}\``;
        if (source.filter_condition) {
          query += ` ${source.filter_condition}`;
        }
        queries.push(query);
      }
    }
  }
  
  if (queries.length === 0) {
    return '-- Chưa cấu hình nguồn dữ liệu';
  }
  
  return queries.join('\nUNION ALL\n');
}
