import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Database, Save, TestTube, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TenantBigQueryTabProps {
  tenantId: string;
}

export function TenantBigQueryTab({ tenantId }: TenantBigQueryTabProps) {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    project_id: '',
    dataset_prefix: '',
    channels: '{}',
    is_active: true,
    cache_ttl_minutes: 60,
  });
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['bigquery-config', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bigquery_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setFormState({
          project_id: data.project_id || '',
          dataset_prefix: data.dataset_prefix || '',
          channels: JSON.stringify(data.channels || {}, null, 2),
          is_active: data.is_active ?? true,
          cache_ttl_minutes: data.cache_ttl_minutes ?? 60,
        });
      }
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let channels = {};
      try {
        channels = JSON.parse(formState.channels);
      } catch { /* keep empty */ }

      const payload = {
        tenant_id: tenantId,
        project_id: formState.project_id,
        dataset_prefix: formState.dataset_prefix,
        channels,
        is_active: formState.is_active,
        cache_ttl_minutes: formState.cache_ttl_minutes,
      };

      if (config) {
        const { error } = await supabase
          .from('bigquery_configs')
          .update(payload)
          .eq('tenant_id', tenantId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bigquery_configs')
          .insert(payload);
        if (error) throw error;
      }

      // If service account JSON provided, store via edge function
      if (serviceAccountJson.trim()) {
        const { error } = await supabase.functions.invoke('store-bq-credentials', {
          body: { tenant_id: tenantId, service_account_json: serviceAccountJson },
        });
        if (error) throw new Error(error.message || 'Failed to store credentials');
      }
    },
    onSuccess: () => {
      toast.success('Đã lưu cấu hình BigQuery');
      queryClient.invalidateQueries({ queryKey: ['bigquery-config', tenantId] });
      setIsEditing(false);
      setServiceAccountJson('');
    },
    onError: (err: Error) => {
      toast.error('Lỗi lưu cấu hình: ' + err.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-bigquery-connection', {
        body: { tenant_id: tenantId },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        toast.success('Kết nối BigQuery thành công!');
      } else {
        toast.error('Kết nối thất bại: ' + (data?.error || 'Unknown'));
      }
    },
    onError: (err: Error) => {
      toast.error('Test connection failed: ' + err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="w-5 h-5" />
              BigQuery Configuration
            </CardTitle>
            <div className="flex items-center gap-2">
              {config ? (
                <Badge variant={config.is_active ? 'default' : 'secondary'} className="gap-1">
                  {config.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {config.is_active ? 'Active' : 'Inactive'}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-600/30">
                  <AlertTriangle className="w-3 h-3" />
                  Chưa cấu hình
                </Badge>
              )}
            </div>
          </div>
          <CardDescription>
            Cấu hình kết nối BigQuery riêng cho tenant này
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project ID */}
          <div className="space-y-2">
            <Label>GCP Project ID</Label>
            <Input
              value={formState.project_id}
              onChange={(e) => setFormState(s => ({ ...s, project_id: e.target.value }))}
              placeholder="my-gcp-project"
              disabled={!isEditing && !!config}
            />
          </div>

          {/* Dataset Prefix */}
          <div className="space-y-2">
            <Label>Dataset Prefix</Label>
            <Input
              value={formState.dataset_prefix}
              onChange={(e) => setFormState(s => ({ ...s, dataset_prefix: e.target.value }))}
              placeholder="bluecore_"
              disabled={!isEditing && !!config}
            />
          </div>

          {/* Channels JSON */}
          <div className="space-y-2">
            <Label>Channels Config (JSON)</Label>
            <Textarea
              value={formState.channels}
              onChange={(e) => setFormState(s => ({ ...s, channels: e.target.value }))}
              placeholder='{"shopee": "dataset_shopee", "lazada": "dataset_lazada"}'
              className="font-mono text-xs min-h-[80px]"
              disabled={!isEditing && !!config}
            />
          </div>

          {/* Service Account JSON */}
          <div className="space-y-2">
            <Label>Service Account Key (JSON)</Label>
            <Textarea
              value={serviceAccountJson}
              onChange={(e) => setServiceAccountJson(e.target.value)}
              placeholder="Dán nội dung file service-account.json vào đây..."
              className="font-mono text-xs min-h-[120px]"
              disabled={!isEditing && !!config}
            />
            <p className="text-xs text-muted-foreground">
              Chỉ cần nhập khi tạo mới hoặc thay đổi. Credentials được mã hóa và lưu an toàn.
            </p>
          </div>

          <Separator />

          {/* Active toggle + Cache TTL */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Kích hoạt</Label>
              <p className="text-xs text-muted-foreground">Bật/tắt đồng bộ BigQuery</p>
            </div>
            <Switch
              checked={formState.is_active}
              onCheckedChange={(v) => setFormState(s => ({ ...s, is_active: v }))}
              disabled={!isEditing && !!config}
            />
          </div>

          <div className="space-y-2">
            <Label>Cache TTL (phút)</Label>
            <Input
              type="number"
              value={formState.cache_ttl_minutes}
              onChange={(e) => setFormState(s => ({ ...s, cache_ttl_minutes: Number(e.target.value) }))}
              disabled={!isEditing && !!config}
            />
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {config && !isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Chỉnh sửa
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                  className="gap-2"
                >
                  {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                  Test Connection
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !formState.project_id}
                  className="gap-2"
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lưu cấu hình
                </Button>
                {config && (
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>
                    Hủy
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
