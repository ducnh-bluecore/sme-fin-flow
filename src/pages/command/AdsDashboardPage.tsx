import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, CheckCircle2, XCircle, Play, RefreshCw } from 'lucide-react';
import {
  useAdsRecommendations,
  useApproveRecommendation,
  useRejectRecommendation,
  useRunOptimizer,
  useSyncCampaigns,
} from '@/hooks/useAdsCommandCenter';
import { usePlatformAdsData } from '@/hooks/usePlatformAdsData';

const TYPE_LABELS: Record<string, string> = {
  pause: 'Tạm dừng',
  resume: 'Bật lại',
  increase_budget: 'Tăng budget',
  decrease_budget: 'Giảm budget',
  kill: 'Dừng hẳn',
  scale: 'Scale up',
};

const STATUS_BADGES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  pending: { variant: 'outline', label: 'Chờ duyệt' },
  approved: { variant: 'default', label: 'Đã duyệt' },
  rejected: { variant: 'secondary', label: 'Từ chối' },
  executing: { variant: 'default', label: 'Đang thực thi' },
  executed: { variant: 'default', label: 'Hoàn thành' },
  failed: { variant: 'destructive', label: 'Thất bại' },
  expired: { variant: 'secondary', label: 'Hết hạn' },
};

export default function AdsDashboardPage() {
  const { data: recommendations = [], isLoading: recsLoading } = useAdsRecommendations();
  const { data: platformData = [], isLoading: platformLoading } = usePlatformAdsData();
  const approveRec = useApproveRecommendation();
  const rejectRec = useRejectRecommendation();
  const runOptimizer = useRunOptimizer();
  const syncCampaigns = useSyncCampaigns();

  const pendingCount = recommendations.filter((r: any) => r.status === 'pending').length;
  const totalSpendToday = platformData.reduce((s, p) => s + (p.spend_today || 0), 0);
  const avgRoas = platformData.length > 0
    ? platformData.reduce((s, p) => s + (p.roas || 0), 0) / platformData.length
    : 0;
  const activeCampaigns = platformData.filter(p => p.is_active).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ads Command Center</h1>
          <p className="text-muted-foreground">Quản lý và tối ưu quảng cáo tự động</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => syncCampaigns.mutate(undefined)} disabled={syncCampaigns.isPending}>
            {syncCampaigns.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync
          </Button>
          <Button onClick={() => runOptimizer.mutate()} disabled={runOptimizer.isPending}>
            {runOptimizer.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Phân tích
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Spend hôm nay"
          value={`${(totalSpendToday / 1_000_000).toFixed(1)}M`}
          icon={DollarSign}
          color="text-red-500"
        />
        <KPICard
          title="ROAS trung bình"
          value={avgRoas.toFixed(2)}
          icon={TrendingUp}
          color="text-green-500"
        />
        <KPICard
          title="Nền tảng active"
          value={String(activeCampaigns)}
          icon={Target}
          color="text-blue-500"
        />
        <KPICard
          title="Chờ duyệt"
          value={String(pendingCount)}
          icon={AlertTriangle}
          color={pendingCount > 0 ? 'text-orange-500' : 'text-muted-foreground'}
        />
      </div>

      {/* Recommendations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Đề xuất tối ưu</CardTitle>
        </CardHeader>
        <CardContent>
          {recsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : recommendations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Chưa có đề xuất. Nhấn "Phân tích" để chạy optimizer engine.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nền tảng</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Lý do</TableHead>
                  <TableHead className="text-right">Impact</TableHead>
                  <TableHead className="text-center">Tin cậy</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendations.map((rec: any) => {
                  const statusInfo = STATUS_BADGES[rec.status] || { variant: 'secondary' as const, label: rec.status };
                  return (
                    <TableRow key={rec.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{rec.platform}</Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{rec.campaign_name || rec.campaign_id}</TableCell>
                      <TableCell>
                        <Badge variant={rec.recommendation_type === 'pause' || rec.recommendation_type === 'kill' ? 'destructive' : 'default'}>
                          {TYPE_LABELS[rec.recommendation_type] || rec.recommendation_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">{rec.reason}</TableCell>
                      <TableCell className="text-right font-mono">
                        {rec.impact_estimate ? `${(rec.impact_estimate / 1_000_000).toFixed(1)}M` : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-mono ${rec.confidence >= 70 ? 'text-green-600' : rec.confidence >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {rec.confidence}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {rec.status === 'pending' && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => approveRec.mutate(rec.id)}
                              disabled={approveRec.isPending}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectRec.mutate(rec.id)}
                              disabled={rejectRec.isPending}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Platform Health */}
      {!platformLoading && platformData.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Sức khỏe nền tảng</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {platformData.map((p) => (
              <Card key={p.platform} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{p.platform}</span>
                  <Badge variant={p.is_active ? 'default' : 'secondary'}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">ROAS</span>
                    <p className="font-mono font-semibold">{p.roas?.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CPA</span>
                    <p className="font-mono font-semibold">{(p.cpa / 1000).toFixed(0)}K</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Spend</span>
                    <p className="font-mono font-semibold">{(p.spend_today / 1_000_000).toFixed(1)}M</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CTR</span>
                    <p className="font-mono font-semibold">{p.ctr?.toFixed(2)}%</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-muted ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}
