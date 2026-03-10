import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plug, RefreshCw, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface TenantConnectorsTabProps {
  tenantId: string;
}

const CONNECTOR_ICONS: Record<string, string> = {
  bigquery: '🗄️',
  kiotviet: '🏪',
  shopee: '🛍️',
  lazada: '🛒',
  tiktok: '🎵',
  google_sheets: '📊',
  manual: '✏️',
};

const STATUS_CONFIG: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  active: { variant: 'default', label: 'Active' },
  inactive: { variant: 'secondary', label: 'Inactive' },
  error: { variant: 'destructive', label: 'Error' },
  syncing: { variant: 'outline', label: 'Syncing' },
};

export function TenantConnectorsTab({ tenantId }: TenantConnectorsTabProps) {
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['tenant-connectors', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connector_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const { data, error } = await supabase.functions.invoke('sync-connector', {
        body: { integration_id: integrationId, sync_type: 'full' },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success('Đã bắt đầu đồng bộ');
      queryClient.invalidateQueries({ queryKey: ['tenant-connectors', tenantId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('connector_integrations')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Đã xóa connector');
      queryClient.invalidateQueries({ queryKey: ['tenant-connectors', tenantId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plug className="w-5 h-5" />
          Connector Integrations
        </CardTitle>
        <CardDescription>
          Quản lý các kết nối dữ liệu của tenant này
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!integrations?.length ? (
          <p className="text-center py-8 text-muted-foreground text-sm">
            Chưa có connector nào được cấu hình
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Connector</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.map((item) => {
                const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.inactive;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <span className="mr-1">{CONNECTOR_ICONS[item.connector_type] || '🔗'}</span>
                      {item.connector_type}
                    </TableCell>
                    <TableCell className="text-sm">{item.connector_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.shop_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.last_sync_at
                        ? format(new Date(item.last_sync_at), 'dd/MM HH:mm', { locale: vi })
                        : 'Chưa sync'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => syncMutation.mutate(item.id)}
                          disabled={syncMutation.isPending}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteMutation.mutate(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
