import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Plus,
  Settings,
  AlertTriangle,
  Zap,
  Cloud,
  Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataSource {
  id: string;
  name: string;
  type: 'ads' | 'analytics' | 'ecommerce' | 'crm' | 'email';
  status: 'connected' | 'error' | 'syncing' | 'disconnected';
  lastSync: string;
  nextSync: string;
  recordsTotal: number;
  recordsNew: number;
  syncProgress?: number;
  errorMessage?: string;
}

const dataSources: DataSource[] = [
  {
    id: '1',
    name: 'Facebook Ads',
    type: 'ads',
    status: 'connected',
    lastSync: '5 phút trước',
    nextSync: '25 phút',
    recordsTotal: 1250000,
    recordsNew: 4520,
  },
  {
    id: '2',
    name: 'Google Ads',
    type: 'ads',
    status: 'syncing',
    lastSync: '10 phút trước',
    nextSync: 'Đang sync...',
    recordsTotal: 980000,
    recordsNew: 3200,
    syncProgress: 67,
  },
  {
    id: '3',
    name: 'TikTok Ads',
    type: 'ads',
    status: 'connected',
    lastSync: '15 phút trước',
    nextSync: '15 phút',
    recordsTotal: 650000,
    recordsNew: 2100,
  },
  {
    id: '4',
    name: 'Google Analytics 4',
    type: 'analytics',
    status: 'connected',
    lastSync: '2 phút trước',
    nextSync: '28 phút',
    recordsTotal: 5200000,
    recordsNew: 45000,
  },
  {
    id: '5',
    name: 'Shopee Seller Center',
    type: 'ecommerce',
    status: 'error',
    lastSync: '2 giờ trước',
    nextSync: 'Lỗi kết nối',
    recordsTotal: 320000,
    recordsNew: 0,
    errorMessage: 'API token expired. Please re-authenticate.',
  },
  {
    id: '6',
    name: 'Lazada Seller Center',
    type: 'ecommerce',
    status: 'connected',
    lastSync: '8 phút trước',
    nextSync: '22 phút',
    recordsTotal: 280000,
    recordsNew: 1850,
  },
  {
    id: '7',
    name: 'Mailchimp',
    type: 'email',
    status: 'connected',
    lastSync: '1 giờ trước',
    nextSync: '23 giờ',
    recordsTotal: 150000,
    recordsNew: 520,
  },
  {
    id: '8',
    name: 'HubSpot CRM',
    type: 'crm',
    status: 'disconnected',
    lastSync: 'Chưa kết nối',
    nextSync: '-',
    recordsTotal: 0,
    recordsNew: 0,
  },
];

const getStatusConfig = (status: DataSource['status']) => {
  const configs = {
    connected: { label: 'Đã kết nối', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
    error: { label: 'Lỗi', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
    syncing: { label: 'Đang sync', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: RefreshCw },
    disconnected: { label: 'Chưa kết nối', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: Link2 },
  };
  return configs[status];
};

const getTypeConfig = (type: DataSource['type']) => {
  const configs = {
    ads: { label: 'Advertising', color: 'text-violet-400' },
    analytics: { label: 'Analytics', color: 'text-blue-400' },
    ecommerce: { label: 'E-commerce', color: 'text-emerald-400' },
    crm: { label: 'CRM', color: 'text-yellow-400' },
    email: { label: 'Email', color: 'text-pink-400' },
  };
  return configs[type];
};

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

export default function DataSourcesPage() {
  const connectedCount = dataSources.filter(ds => ds.status === 'connected' || ds.status === 'syncing').length;
  const errorCount = dataSources.filter(ds => ds.status === 'error').length;
  const totalRecords = dataSources.reduce((acc, ds) => acc + ds.recordsTotal, 0);
  const newRecords = dataSources.reduce((acc, ds) => acc + ds.recordsNew, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Database className="h-7 w-7 text-violet-400" />
            Data Sources
          </h1>
          <p className="text-slate-400 mt-1">Quản lý kết nối và đồng bộ dữ liệu marketing</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync tất cả
          </Button>
          <Button className="bg-violet-600 hover:bg-violet-700 gap-2">
            <Plus className="h-4 w-4" />
            Thêm nguồn dữ liệu
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đã kết nối</p>
                <p className="text-2xl font-bold">{connectedCount}/{dataSources.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lỗi kết nối</p>
                <p className="text-2xl font-bold text-red-400">{errorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Database className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng records</p>
                <p className="text-2xl font-bold">{formatNumber(totalRecords)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Zap className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Records mới (24h)</p>
                <p className="text-2xl font-bold text-violet-400">+{formatNumber(newRecords)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Sources List */}
      <div className="space-y-4">
        {dataSources.map((source) => {
          const statusConfig = getStatusConfig(source.status);
          const typeConfig = getTypeConfig(source.type);
          const StatusIcon = statusConfig.icon;

          return (
            <Card key={source.id} className={cn(
              "border-border bg-card shadow-sm",
              source.status === 'error' && "border-red-500/30"
            )}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Source Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        "p-2 rounded-lg",
                        source.status === 'error' ? "bg-red-500/20" : "bg-violet-500/20"
                      )}>
                        <Cloud className={cn(
                          "h-5 w-5",
                          source.status === 'error' ? "text-red-400" : "text-violet-400"
                        )} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{source.name}</h3>
                        <span className={cn("text-xs", typeConfig.color)}>{typeConfig.label}</span>
                      </div>
                      <Badge variant="outline" className={statusConfig.color}>
                        <StatusIcon className={cn(
                          "h-3 w-3 mr-1",
                          source.status === 'syncing' && "animate-spin"
                        )} />
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {source.status === 'syncing' && source.syncProgress && (
                      <div className="mt-2 space-y-1">
                        <Progress value={source.syncProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground">{source.syncProgress}% hoàn thành</p>
                      </div>
                    )}

                    {source.status === 'error' && source.errorMessage && (
                      <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/30">
                        <p className="text-sm text-red-400">{source.errorMessage}</p>
                      </div>
                    )}
                  </div>

                  {/* Sync Info */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Last Sync</p>
                      <p className="text-sm font-medium">{source.lastSync}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Next Sync</p>
                      <p className="text-sm font-medium">{source.nextSync}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Total Records</p>
                      <p className="text-sm font-medium">{formatNumber(source.recordsTotal)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">New (24h)</p>
                      <p className="text-sm font-medium text-emerald-400">
                        {source.recordsNew > 0 ? `+${formatNumber(source.recordsNew)}` : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {source.status === 'disconnected' ? (
                      <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                        Kết nối
                      </Button>
                    ) : source.status === 'error' ? (
                      <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                        Sửa lỗi
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" className="gap-1">
                          <RefreshCw className="h-3 w-3" />
                          Sync
                        </Button>
                        <Button size="icon" variant="ghost">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Available Integrations */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Tích hợp có sẵn</CardTitle>
          <CardDescription>Kết nối thêm nguồn dữ liệu để có cái nhìn toàn diện</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              'Zalo Ads', 'Cốc Cốc Ads', 'LinkedIn Ads', 'Twitter Ads',
              'Pinterest Ads', 'Criteo', 'Tiki Seller', 'Sendo Seller',
              'Klaviyo', 'Brevo', 'Salesforce', 'Zoho CRM'
            ].map((name, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2"
              >
                <Cloud className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs">{name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
