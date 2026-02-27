import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, CheckCircle2, XCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useAdsConnections, useSaveAdsConnection, useSyncCampaigns } from '@/hooks/useAdsCommandCenter';
import { toast } from 'sonner';

const PLATFORMS = [
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    color: 'bg-pink-500/10 text-pink-600',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password' },
      { key: 'app_id', label: 'App ID', type: 'text' },
      { key: 'app_secret', label: 'App Secret', type: 'password' },
    ],
    accountLabel: 'Advertiser ID',
  },
  {
    id: 'meta',
    name: 'Meta / Facebook Ads',
    color: 'bg-blue-500/10 text-blue-600',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password' },
    ],
    accountLabel: 'Ad Account ID (without act_)',
  },
  {
    id: 'google',
    name: 'Google Ads',
    color: 'bg-green-500/10 text-green-600',
    fields: [
      { key: 'access_token', label: 'OAuth Access Token', type: 'password' },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password' },
      { key: 'developer_token', label: 'Developer Token', type: 'password' },
    ],
    accountLabel: 'Customer ID',
  },
  {
    id: 'shopee',
    name: 'Shopee Ads',
    color: 'bg-orange-500/10 text-orange-600',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password' },
      { key: 'partner_id', label: 'Partner ID', type: 'text' },
      { key: 'shop_id', label: 'Shop ID', type: 'text' },
    ],
    accountLabel: 'Shop ID',
  },
];

export default function AdsConnectionsPage() {
  const { data: connections = [], isLoading } = useAdsConnections();
  const saveConnection = useSaveAdsConnection();
  const syncCampaigns = useSyncCampaigns();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kết Nối Ads</h1>
          <p className="text-muted-foreground">Quản lý API credentials cho các nền tảng quảng cáo</p>
        </div>
        <Button
          variant="outline"
          onClick={() => syncCampaigns.mutate(undefined)}
          disabled={syncCampaigns.isPending}
        >
          {syncCampaigns.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Sync tất cả
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {PLATFORMS.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              connection={connections.find((c: any) => c.platform === platform.id)}
              onSave={saveConnection.mutate}
              onSync={() => syncCampaigns.mutate(platform.id)}
              isSaving={saveConnection.isPending}
              isSyncing={syncCampaigns.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlatformCard({
  platform,
  connection,
  onSave,
  onSync,
  isSaving,
  isSyncing,
}: {
  platform: typeof PLATFORMS[0];
  connection: any;
  onSave: (data: any) => void;
  onSync: () => void;
  isSaving: boolean;
  isSyncing: boolean;
}) {
  const [isEditing, setIsEditing] = useState(!connection);
  const [accountId, setAccountId] = useState(connection?.account_id || '');
  const [accountName, setAccountName] = useState(connection?.account_name || '');
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const isConnected = !!connection?.has_credentials;

  const handleSave = () => {
    if (!accountId) {
      toast.error('Vui lòng nhập Account ID');
      return;
    }
    const hasNewCreds = Object.values(credentials).some(v => v.length > 0);
    if (!connection && !hasNewCreds) {
      toast.error('Vui lòng nhập API credentials');
      return;
    }

    onSave({
      id: connection?.id,
      platform: platform.id,
      account_id: accountId,
      account_name: accountName,
      credentials: hasNewCreds ? credentials : undefined,
    });
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${platform.color}`}>
            {isConnected ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </div>
          <div>
            <CardTitle className="text-base">{platform.name}</CardTitle>
            {connection?.last_synced_at && (
              <p className="text-xs text-muted-foreground">
                Sync lần cuối: {new Date(connection.last_synced_at).toLocaleString('vi-VN')}
              </p>
            )}
          </div>
        </div>
        <Badge variant={isConnected ? 'default' : 'secondary'}>
          {isConnected ? (
            <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</>
          ) : (
            <><XCircle className="h-3 w-3 mr-1" /> Disconnected</>
          )}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="space-y-2">
              <Label>{platform.accountLabel}</Label>
              <Input
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder={`Nhập ${platform.accountLabel}`}
              />
            </div>
            <div className="space-y-2">
              <Label>Tên tài khoản</Label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Tên hiển thị (tùy chọn)"
              />
            </div>
            {platform.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  type={field.type}
                  value={credentials[field.key] || ''}
                  onChange={(e) => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={connection ? '••• (giữ nguyên nếu bỏ trống)' : `Nhập ${field.label}`}
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Lưu
              </Button>
              {connection && (
                <Button variant="outline" onClick={() => setIsEditing(false)}>Hủy</Button>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Account ID</span>
              <span className="font-mono">{connection?.account_id}</span>
            </div>
            {connection?.account_name && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tên</span>
                <span>{connection.account_name}</span>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(true)} className="flex-1">
                Chỉnh sửa
              </Button>
              <Button variant="outline" onClick={onSync} disabled={isSyncing}>
                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
