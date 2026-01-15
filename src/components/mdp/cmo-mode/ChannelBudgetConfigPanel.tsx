import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Settings2,
  Plus,
  Save,
  Target,
  DollarSign,
  TrendingUp,
  Percent,
  ShoppingCart,
  Store,
  Video,
  Facebook,
  Search,
  Globe,
  Building2,
  Edit2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChannelBudgets, ChannelBudgetInput } from '@/hooks/useChannelBudgets';

interface ChannelConfig {
  channel: string;
  displayName: string;
  icon: React.ReactNode;
  budget_amount: number;
  revenue_target: number;
  target_roas: number;
  max_cpa: number;
  min_contribution_margin: number;
  target_ctr: number;
  target_cvr: number;
  is_active: boolean;
  isNew?: boolean;
}

const CHANNEL_META: Record<string, { displayName: string; icon: React.ReactNode }> = {
  shopee: { displayName: 'Shopee', icon: <ShoppingCart className="h-4 w-4 text-orange-500" /> },
  lazada: { displayName: 'Lazada', icon: <Store className="h-4 w-4 text-blue-500" /> },
  tiktok: { displayName: 'TikTok Shop', icon: <Video className="h-4 w-4 text-pink-500" /> },
  facebook: { displayName: 'Facebook Ads', icon: <Facebook className="h-4 w-4 text-blue-600" /> },
  google: { displayName: 'Google Ads', icon: <Search className="h-4 w-4 text-green-500" /> },
  website: { displayName: 'Website', icon: <Globe className="h-4 w-4 text-purple-500" /> },
  offline: { displayName: 'Offline/Retail', icon: <Building2 className="h-4 w-4 text-gray-500" /> },
};

const formatCurrency = (value: number) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toFixed(0);
};

export function ChannelBudgetConfigPanel() {
  const {
    budgets,
    isLoading,
    bulkUpsertBudgets,
    isUpdating,
    defaultChannels,
    currentYear,
    currentMonth,
  } = useChannelBudgets();

  const [configs, setConfigs] = useState<ChannelConfig[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChannelConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize configs from budgets or defaults
  useEffect(() => {
    if (isLoading) return;

    const existingMap = new Map(budgets.map(b => [b.channel.toLowerCase(), b]));
    
    const allConfigs: ChannelConfig[] = defaultChannels.map(channel => {
      const existing = existingMap.get(channel);
      const meta = CHANNEL_META[channel] || { displayName: channel, icon: <Store className="h-4 w-4" /> };
      
      if (existing) {
        return {
          channel: existing.channel,
          displayName: meta.displayName,
          icon: meta.icon,
          budget_amount: existing.budget_amount || 0,
          revenue_target: existing.revenue_target || 0,
          target_roas: existing.target_roas || 3,
          max_cpa: existing.max_cpa || 100000,
          min_contribution_margin: existing.min_contribution_margin || 15,
          target_ctr: existing.target_ctr || 1.5,
          target_cvr: existing.target_cvr || 2,
          is_active: existing.is_active ?? true,
        };
      }

      return {
        channel,
        displayName: meta.displayName,
        icon: meta.icon,
        budget_amount: 0,
        revenue_target: 0,
        target_roas: 3,
        max_cpa: 100000,
        min_contribution_margin: 15,
        target_ctr: 1.5,
        target_cvr: 2,
        is_active: false,
        isNew: true,
      };
    });

    setConfigs(allConfigs);
  }, [budgets, isLoading, defaultChannels]);

  const handleEditChannel = (config: ChannelConfig) => {
    setEditingChannel({ ...config });
    setIsEditDialogOpen(true);
  };

  const handleSaveChannel = () => {
    if (!editingChannel) return;

    setConfigs(prev =>
      prev.map(c =>
        c.channel === editingChannel.channel
          ? { ...editingChannel, isNew: false }
          : c
      )
    );
    setHasChanges(true);
    setIsEditDialogOpen(false);
    setEditingChannel(null);
  };

  const handleToggleActive = (channel: string, active: boolean) => {
    setConfigs(prev =>
      prev.map(c =>
        c.channel === channel ? { ...c, is_active: active, isNew: false } : c
      )
    );
    setHasChanges(true);
  };

  const handleSaveAll = () => {
    const inputs: ChannelBudgetInput[] = configs
      .filter(c => c.is_active || !c.isNew)
      .map(c => ({
        channel: c.channel,
        year: currentYear,
        month: currentMonth,
        budget_amount: c.budget_amount,
        revenue_target: c.revenue_target,
        target_roas: c.target_roas,
        max_cpa: c.max_cpa,
        min_contribution_margin: c.min_contribution_margin,
        target_ctr: c.target_ctr,
        target_cvr: c.target_cvr,
        is_active: c.is_active,
      }));

    bulkUpsertBudgets(inputs);
    setHasChanges(false);
  };

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeCount = configs.filter(c => c.is_active).length;
  const totalBudget = configs.filter(c => c.is_active).reduce((sum, c) => sum + c.budget_amount, 0);
  const totalRevenue = configs.filter(c => c.is_active).reduce((sum, c) => sum + c.revenue_target, 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Cấu hình KPI & Budget theo kênh</CardTitle>
              <p className="text-sm text-muted-foreground">
                {monthNames[currentMonth - 1]} {currentYear}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Target className="h-3 w-3" />
              {activeCount} kênh active
            </Badge>
            {hasChanges && (
              <Button onClick={handleSaveAll} disabled={isUpdating} size="sm">
                <Save className="h-4 w-4 mr-1" />
                {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-lg bg-muted/30">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Tổng Budget</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totalBudget)}đ</p>
            </div>
            <div className="text-center border-x border-border">
              <p className="text-xs text-muted-foreground mb-1">Mục tiêu Doanh thu</p>
              <p className="text-xl font-bold text-green-500">{formatCurrency(totalRevenue)}đ</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Expected ROAS</p>
              <p className="text-xl font-bold text-blue-500">
                {totalBudget > 0 ? (totalRevenue / totalBudget).toFixed(2) : '0.00'}x
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px]">Active</TableHead>
                  <TableHead>Kênh</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Revenue Target</TableHead>
                  <TableHead className="text-right">Target ROAS</TableHead>
                  <TableHead className="text-right">Max CPA</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map(config => (
                  <TableRow
                    key={config.channel}
                    className={cn(
                      'transition-colors',
                      !config.is_active && 'opacity-50'
                    )}
                  >
                    <TableCell>
                      <Switch
                        checked={config.is_active}
                        onCheckedChange={(checked) => handleToggleActive(config.channel, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {config.icon}
                        <span className="font-medium">{config.displayName}</span>
                        {config.isNew && (
                          <Badge variant="outline" className="text-[10px] px-1">Chưa setup</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {config.budget_amount > 0 ? `${formatCurrency(config.budget_amount)}đ` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {config.revenue_target > 0 ? `${formatCurrency(config.revenue_target)}đ` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono">
                        {config.target_roas}x
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(config.max_cpa)}đ
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditChannel(config)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingChannel?.icon}
              Cấu hình {editingChannel?.displayName}
            </DialogTitle>
            <DialogDescription>
              Thiết lập KPI và ngân sách cho kênh này trong {monthNames[currentMonth - 1]} {currentYear}
            </DialogDescription>
          </DialogHeader>

          {editingChannel && (
            <div className="space-y-6 py-4">
              {/* Budget & Revenue */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Budget tháng
                  </Label>
                  <Input
                    type="number"
                    value={editingChannel.budget_amount}
                    onChange={(e) =>
                      setEditingChannel({
                        ...editingChannel,
                        budget_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="150000000"
                  />
                  <p className="text-xs text-muted-foreground">
                    = {formatCurrency(editingChannel.budget_amount)}đ
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Revenue Target
                  </Label>
                  <Input
                    type="number"
                    value={editingChannel.revenue_target}
                    onChange={(e) =>
                      setEditingChannel({
                        ...editingChannel,
                        revenue_target: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="500000000"
                  />
                  <p className="text-xs text-muted-foreground">
                    = {formatCurrency(editingChannel.revenue_target)}đ
                  </p>
                </div>
              </div>

              {/* KPI Targets */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Target ROAS
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingChannel.target_roas}
                    onChange={(e) =>
                      setEditingChannel({
                        ...editingChannel,
                        target_roas: parseFloat(e.target.value) || 3,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Max CPA
                  </Label>
                  <Input
                    type="number"
                    value={editingChannel.max_cpa}
                    onChange={(e) =>
                      setEditingChannel({
                        ...editingChannel,
                        max_cpa: parseFloat(e.target.value) || 100000,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Min CM%
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    value={editingChannel.min_contribution_margin}
                    onChange={(e) =>
                      setEditingChannel({
                        ...editingChannel,
                        min_contribution_margin: parseFloat(e.target.value) || 15,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target CTR%</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingChannel.target_ctr}
                    onChange={(e) =>
                      setEditingChannel({
                        ...editingChannel,
                        target_ctr: parseFloat(e.target.value) || 1.5,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target CVR%</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingChannel.target_cvr}
                    onChange={(e) =>
                      setEditingChannel({
                        ...editingChannel,
                        target_cvr: parseFloat(e.target.value) || 2,
                      })
                    }
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">Kích hoạt kênh này</p>
                  <p className="text-sm text-muted-foreground">
                    Kênh sẽ được theo dõi KPI và báo cáo
                  </p>
                </div>
                <Switch
                  checked={editingChannel.is_active}
                  onCheckedChange={(checked) =>
                    setEditingChannel({ ...editingChannel, is_active: checked })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveChannel}>
              <Save className="h-4 w-4 mr-1" />
              Lưu cấu hình
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
