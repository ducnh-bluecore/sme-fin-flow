import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Database,
  Settings,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Table,
  Columns,
  Edit2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Json } from '@/integrations/supabase/types';

interface ChannelConfig {
  dataset: string;
  table: string;
  enabled: boolean;
  field_mappings: {
    order_id: string;
    order_date: string;
    status: string;
    total_amount: string;
    customer_name?: string;
    product_name?: string;
  };
}

interface BigQueryConfigData {
  id?: string;
  project_id: string;
  dataset_prefix: string;
  channels: Record<string, ChannelConfig>;
  cache_ttl_minutes: number;
  custom_mappings?: Record<string, any>;
  is_active: boolean;
}

const DEFAULT_CHANNELS: Record<string, ChannelConfig> = {
  shopee: {
    dataset: 'bluecoredcp_shopee',
    table: 'shopee_Orders',
    enabled: true,
    field_mappings: {
      order_id: 'order_sn',
      order_date: 'create_time',
      status: 'order_status',
      total_amount: 'total_amount',
      customer_name: 'buyer_username',
      product_name: 'product_name',
    },
  },
  lazada: {
    dataset: 'bluecoredcp_lazada',
    table: 'lazada_Orders',
    enabled: true,
    field_mappings: {
      order_id: 'orderNumber',
      order_date: 'created_at',
      status: 'statuses_0',
      total_amount: 'price',
      customer_name: 'customer_first_name',
      product_name: 'name',
    },
  },
  sapo: {
    dataset: 'bluecoredcp_sapo',
    table: 'sapo_Orders',
    enabled: true,
    field_mappings: {
      order_id: 'id',
      order_date: 'created_on',
      status: 'status',
      total_amount: 'total_price',
      customer_name: 'billing_address_name',
      product_name: 'product_name',
    },
  },
  tiki: {
    dataset: 'bluecoredcp_tiki',
    table: 'tiki_Orders',
    enabled: false,
    field_mappings: {
      order_id: 'code',
      order_date: 'created_at',
      status: 'status',
      total_amount: 'grand_total',
      customer_name: 'customer_full_name',
      product_name: 'product_name',
    },
  },
  tiktok: {
    dataset: 'bluecoredcp_tiktokshop',
    table: 'Orders',
    enabled: false,
    field_mappings: {
      order_id: 'order_id',
      order_date: 'create_time',
      status: 'order_status',
      total_amount: 'payment_info_total_amount',
      customer_name: 'recipient_address_name',
      product_name: 'sku_name',
    },
  },
  shopify: {
    dataset: 'bluecoredcp_shopify',
    table: 'shopify_Order',
    enabled: false,
    field_mappings: {
      order_id: 'id',
      order_date: 'created_at',
      status: 'financial_status',
      total_amount: 'total_price',
      customer_name: 'customer_first_name',
      product_name: 'name',
    },
  },
};

export function BigQuerySchemaManager() {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();
  const [editingChannel, setEditingChannel] = useState<string | null>(null);
  const [localConfig, setLocalConfig] = useState<BigQueryConfigData>({
    project_id: '',
    dataset_prefix: 'bluecoredcp',
    channels: DEFAULT_CHANNELS,
    cache_ttl_minutes: 15,
    is_active: true,
  });

  // Fetch existing config
  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['bigquery-config', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');
      const { data, error } = await supabase
        .from('bigquery_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Update local state when config loads
  useEffect(() => {
    if (existingConfig) {
      const channelsData = existingConfig.channels as unknown as Record<string, ChannelConfig>;
      setLocalConfig({
        id: existingConfig.id,
        project_id: existingConfig.project_id,
        dataset_prefix: existingConfig.dataset_prefix,
        channels: channelsData || DEFAULT_CHANNELS,
        cache_ttl_minutes: existingConfig.cache_ttl_minutes || 15,
        custom_mappings: existingConfig.custom_mappings as unknown as Record<string, any> || {},
        is_active: existingConfig.is_active ?? true,
      });
    }
  }, [existingConfig]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (config: BigQueryConfigData) => {
      if (!tenantId) throw new Error('No tenant');

      const payload = {
        tenant_id: tenantId,
        project_id: config.project_id,
        dataset_prefix: config.dataset_prefix,
        channels: config.channels as unknown as Json,
        cache_ttl_minutes: config.cache_ttl_minutes,
        custom_mappings: config.custom_mappings as unknown as Json || null,
        is_active: config.is_active,
      };

      if (config.id) {
        const { data, error } = await supabase
          .from('bigquery_configs')
          .update(payload)
          .eq('id', config.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('bigquery_configs')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bigquery-config', tenantId] });
      toast.success('Đã lưu cấu hình schema');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(localConfig);
  };

  const updateChannel = (channelKey: string, updates: Partial<ChannelConfig>) => {
    setLocalConfig((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channelKey]: {
          ...prev.channels[channelKey],
          ...updates,
        },
      },
    }));
  };

  const updateFieldMapping = (channelKey: string, field: string, value: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channelKey]: {
          ...prev.channels[channelKey],
          field_mappings: {
            ...prev.channels[channelKey].field_mappings,
            [field]: value,
          },
        },
      },
    }));
  };

  const addChannel = () => {
    const newKey = `channel_${Object.keys(localConfig.channels).length + 1}`;
    setLocalConfig((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [newKey]: {
          dataset: '',
          table: 'Orders',
          enabled: false,
          field_mappings: {
            order_id: 'order_id',
            order_date: 'created_at',
            status: 'status',
            total_amount: 'total_amount',
          },
        },
      },
    }));
    setEditingChannel(newKey);
  };

  const removeChannel = (channelKey: string) => {
    setLocalConfig((prev) => {
      const { [channelKey]: _, ...rest } = prev.channels;
      return { ...prev, channels: rest };
    });
  };

  const getChannelIcon = (key: string) => {
    const icons: Record<string, string> = {
      shopee: '🛒',
      lazada: '🛍️',
      tiktok: '🎵',
      tiki: '📦',
    };
    return icons[key] || '📊';
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Schema Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Cấu hình mapping schema BigQuery cho từng channel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <Label htmlFor="active-toggle" className="text-sm">Kích hoạt</Label>
            <Switch
              id="active-toggle"
              checked={localConfig.is_active}
              onCheckedChange={(checked) =>
                setLocalConfig((prev) => ({ ...prev, is_active: checked }))
              }
            />
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Lưu cấu hình
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="project-id">Project ID</Label>
            <Input
              id="project-id"
              placeholder="your-gcp-project"
              value={localConfig.project_id}
              onChange={(e) =>
                setLocalConfig((prev) => ({ ...prev, project_id: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataset-prefix">Dataset Prefix</Label>
            <Input
              id="dataset-prefix"
              placeholder="bluecoredcp"
              value={localConfig.dataset_prefix}
              onChange={(e) =>
                setLocalConfig((prev) => ({ ...prev, dataset_prefix: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cache-ttl">Cache TTL (phút)</Label>
            <Input
              id="cache-ttl"
              type="number"
              min={1}
              max={1440}
              value={localConfig.cache_ttl_minutes}
              onChange={(e) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  cache_ttl_minutes: parseInt(e.target.value) || 15,
                }))
              }
            />
          </div>
        </div>

        <Separator />

        {/* Channel Configurations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Channel Configurations</h4>
            <Button variant="outline" size="sm" onClick={addChannel}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm channel
            </Button>
          </div>

          <Accordion type="multiple" className="space-y-2">
            {Object.entries(localConfig.channels).map(([key, channel]) => (
              <AccordionItem
                key={key}
                value={key}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xl">{getChannelIcon(key)}</span>
                    <span className="font-medium capitalize">{key}</span>
                    <Badge
                      variant={channel.enabled ? 'default' : 'secondary'}
                      className="ml-2"
                    >
                      {channel.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <span className="text-sm text-muted-foreground ml-auto mr-4">
                      {channel.dataset}.{channel.table}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-2">
                  <div className="space-y-4">
                    {/* Dataset & Table */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Dataset</Label>
                        <Input
                          value={channel.dataset}
                          onChange={(e) =>
                            updateChannel(key, { dataset: e.target.value })
                          }
                          placeholder="dataset_name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Table</Label>
                        <Input
                          value={channel.table}
                          onChange={(e) =>
                            updateChannel(key, { table: e.target.value })
                          }
                          placeholder="Orders"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Switch
                            checked={channel.enabled}
                            onCheckedChange={(checked) =>
                              updateChannel(key, { enabled: checked })
                            }
                          />
                          <Label className="text-sm">Enabled</Label>
                        </div>
                        {!['shopee', 'lazada', 'tiktok', 'tiki'].includes(key) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeChannel(key)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Field Mappings */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Columns className="w-4 h-4" />
                        Field Mappings
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Order ID
                          </Label>
                          <Input
                            value={channel.field_mappings.order_id}
                            onChange={(e) =>
                              updateFieldMapping(key, 'order_id', e.target.value)
                            }
                            placeholder="order_id"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Order Date
                          </Label>
                          <Input
                            value={channel.field_mappings.order_date}
                            onChange={(e) =>
                              updateFieldMapping(key, 'order_date', e.target.value)
                            }
                            placeholder="created_at"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Status
                          </Label>
                          <Input
                            value={channel.field_mappings.status}
                            onChange={(e) =>
                              updateFieldMapping(key, 'status', e.target.value)
                            }
                            placeholder="status"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Total Amount
                          </Label>
                          <Input
                            value={channel.field_mappings.total_amount}
                            onChange={(e) =>
                              updateFieldMapping(key, 'total_amount', e.target.value)
                            }
                            placeholder="total_amount"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Customer Name
                          </Label>
                          <Input
                            value={channel.field_mappings.customer_name || ''}
                            onChange={(e) =>
                              updateFieldMapping(key, 'customer_name', e.target.value)
                            }
                            placeholder="customer_name"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Product Name
                          </Label>
                          <Input
                            value={channel.field_mappings.product_name || ''}
                            onChange={(e) =>
                              updateFieldMapping(key, 'product_name', e.target.value)
                            }
                            placeholder="product_name"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Status */}
        {existingConfig && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Cấu hình đã được lưu lúc{' '}
            {new Date(existingConfig.updated_at).toLocaleString('vi-VN')}
          </div>
        )}
      </div>
    </Card>
  );
}
