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
  Trash2,
  Edit,
  Save,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBigQueryDataModels, useUpsertDataModel, useSyncWatermarks } from '@/hooks/useBigQueryRealtime';
import { cn } from '@/lib/utils';

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
}

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
  const { data: models, isLoading } = useBigQueryDataModels();
  const { data: watermarks } = useSyncWatermarks();
  const upsertModel = useUpsertDataModel();
  
  const [editingModel, setEditingModel] = useState<DataModelConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Merge default models with saved configs
  const displayModels = DEFAULT_MODELS.map(defaultModel => {
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
      <div className="flex items-center justify-between">
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

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingModel?.model_name ? 'Chỉnh sửa Data Model' : 'Thêm Data Model'}
            </DialogTitle>
            <DialogDescription>
              Cấu hình kết nối và mapping từ BigQuery
            </DialogDescription>
          </DialogHeader>

          {editingModel && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên Model</Label>
                  <Input
                    value={editingModel.model_name}
                    onChange={(e) => setEditingModel({
                      ...editingModel,
                      model_name: e.target.value,
                    })}
                    placeholder="orders"
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
                <Input
                  value={editingModel.description || ''}
                  onChange={(e) => setEditingModel({
                    ...editingModel,
                    description: e.target.value,
                  })}
                  placeholder="Dữ liệu đơn hàng từ các kênh"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>BigQuery Dataset</Label>
                  <Input
                    value={editingModel.bigquery_dataset}
                    onChange={(e) => setEditingModel({
                      ...editingModel,
                      bigquery_dataset: e.target.value,
                    })}
                    placeholder="my_dataset"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>BigQuery Table</Label>
                  <Input
                    value={editingModel.bigquery_table}
                    onChange={(e) => setEditingModel({
                      ...editingModel,
                      bigquery_table: e.target.value,
                    })}
                    placeholder="my_table"
                    className="font-mono text-sm"
                  />
                </div>
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
                    placeholder="order_id"
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
                    placeholder="created_at"
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Table (Supabase)</Label>
                  <Input
                    value={editingModel.target_table || ''}
                    onChange={(e) => setEditingModel({
                      ...editingModel,
                      target_table: e.target.value,
                    })}
                    placeholder="external_orders"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tần suất sync (giờ)</Label>
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
                      <SelectItem value="6">Mỗi 6 giờ</SelectItem>
                      <SelectItem value="12">Mỗi 12 giờ</SelectItem>
                      <SelectItem value="24">Mỗi ngày</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveModel} disabled={upsertModel.isPending}>
              {upsertModel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
