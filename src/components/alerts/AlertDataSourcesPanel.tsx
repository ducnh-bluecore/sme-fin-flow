import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, Cloud, Upload, Globe, Webhook, 
  Plus, RefreshCw, Settings, Trash2, CheckCircle, 
  XCircle, Clock, Loader2, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAlertDataSources, useCreateAlertDataSource, useUpdateAlertDataSource, useDeleteAlertDataSource, useSyncAlertDataSource, AlertDataSourceInput } from '@/hooks/useAlertDataSources';
import { useConnectorIntegrations } from '@/hooks/useConnectorIntegrations';
import { dataSourceTypeLabels, syncStatusConfig, DataSourceType } from '@/types/alerts';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const sourceTypeIcons: Record<DataSourceType, React.ReactNode> = {
  connector: <Cloud className="w-5 h-5" />,
  bigquery: <Database className="w-5 h-5" />,
  manual: <Upload className="w-5 h-5" />,
  api: <Globe className="w-5 h-5" />,
  webhook: <Webhook className="w-5 h-5" />,
};

export function AlertDataSourcesPanel() {
  const { data: dataSources, isLoading } = useAlertDataSources();
  const { integrations: connectors } = useConnectorIntegrations();
  const createSource = useCreateAlertDataSource();
  const updateSource = useUpdateAlertDataSource();
  const deleteSource = useDeleteAlertDataSource();
  const syncSource = useSyncAlertDataSource();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSource, setNewSource] = useState<AlertDataSourceInput>({
    source_type: 'connector',
    source_name: '',
    sync_frequency_minutes: 60,
    is_active: true,
  });

  const handleAddSource = async () => {
    await createSource.mutateAsync(newSource);
    setIsAddDialogOpen(false);
    setNewSource({
      source_type: 'connector',
      source_name: '',
      sync_frequency_minutes: 60,
      is_active: true,
    });
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'syncing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Nguồn dữ liệu cảnh báo
            </CardTitle>
            <CardDescription>
              Cấu hình các nguồn dữ liệu để đồng bộ đối tượng giám sát
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Thêm nguồn
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Thêm nguồn dữ liệu</DialogTitle>
                <DialogDescription>
                  Kết nối nguồn dữ liệu mới để đồng bộ đối tượng giám sát
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Loại nguồn dữ liệu</Label>
                  <Select 
                    value={newSource.source_type} 
                    onValueChange={(v) => setNewSource({ ...newSource, source_type: v as DataSourceType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(dataSourceTypeLabels).map(([key, { label, description }]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            {sourceTypeIcons[key as DataSourceType]}
                            <div>
                              <div>{label}</div>
                              <div className="text-xs text-muted-foreground">{description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tên nguồn dữ liệu</Label>
                  <Input 
                    value={newSource.source_name}
                    onChange={(e) => setNewSource({ ...newSource, source_name: e.target.value })}
                    placeholder="VD: Shopee - Shop chính"
                  />
                </div>

                {newSource.source_type === 'connector' && (
                  <div className="space-y-2">
                    <Label>Kết nối tích hợp</Label>
                    <Select 
                      value={newSource.connector_integration_id || ''}
                      onValueChange={(v) => setNewSource({ ...newSource, connector_integration_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn kết nối" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectors?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.connector_name} - {c.shop_name || c.id.slice(0, 8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tần suất đồng bộ</Label>
                  <Select 
                    value={String(newSource.sync_frequency_minutes)}
                    onValueChange={(v) => setNewSource({ ...newSource, sync_frequency_minutes: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">Mỗi 15 phút</SelectItem>
                      <SelectItem value="30">Mỗi 30 phút</SelectItem>
                      <SelectItem value="60">Mỗi 1 giờ</SelectItem>
                      <SelectItem value="360">Mỗi 6 giờ</SelectItem>
                      <SelectItem value="720">Mỗi 12 giờ</SelectItem>
                      <SelectItem value="1440">Mỗi ngày</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Hủy
                </Button>
                <Button 
                  onClick={handleAddSource} 
                  disabled={!newSource.source_name || createSource.isPending}
                >
                  {createSource.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Thêm nguồn
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {dataSources?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Chưa có nguồn dữ liệu nào</p>
            <p className="text-sm">Thêm nguồn để bắt đầu đồng bộ đối tượng giám sát</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {dataSources?.map((source) => (
                <motion.div
                  key={source.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {sourceTypeIcons[source.source_type as DataSourceType]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{source.source_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {dataSourceTypeLabels[source.source_type as DataSourceType]?.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {getSyncStatusIcon(source.sync_status)}
                          <span className={syncStatusConfig[source.sync_status as keyof typeof syncStatusConfig]?.color}>
                            {syncStatusConfig[source.sync_status as keyof typeof syncStatusConfig]?.label}
                          </span>
                        </span>
                        {source.last_sync_at && (
                          <span>
                            Đồng bộ: {formatDistanceToNow(new Date(source.last_sync_at), { addSuffix: true, locale: vi })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={source.is_active}
                      onCheckedChange={(checked) => updateSource.mutate({ id: source.id, is_active: checked })}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => syncSource.mutate(source.id)}
                      disabled={syncSource.isPending}
                    >
                      <RefreshCw className={`w-4 h-4 ${syncSource.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteSource.mutate(source.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
