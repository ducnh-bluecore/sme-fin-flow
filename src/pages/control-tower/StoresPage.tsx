import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Store, 
  MapPin, 
  Phone, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Users,
  DollarSign,
  Search,
  Filter,
  Plus,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Target,
  Edit2,
  Settings2,
  ShoppingBag,
  Globe,
  ShoppingCart
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStores, useStoreStats, useCreateStore, useUpdateStore, useDeleteStore, StoreData, StoreInput } from '@/hooks/useStores';

const statusConfig = {
  active: { label: 'Hoạt động', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  maintenance: { label: 'Bảo trì', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  closed: { label: 'Đóng cửa', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
};

const channelTypeConfig = {
  store: { label: 'Cửa hàng', icon: Store, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  shopee: { label: 'Shopee', icon: ShoppingBag, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  lazada: { label: 'Lazada', icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  tiktok: { label: 'TikTok Shop', icon: ShoppingBag, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  website: { label: 'Website', icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

function ChannelCard({ store, onEditKPI }: { store: StoreData; onEditKPI: (store: StoreData) => void }) {
  const status = statusConfig[store.status];
  const StatusIcon = status.icon;
  const progress = store.target > 0 ? Math.min((store.revenue / store.target) * 100, 100) : 0;
  const hasTarget = store.target > 0;
  
  // Use channelType from store data
  const channelConfig = channelTypeConfig[store.channelType] || channelTypeConfig.store;
  const ChannelIcon = channelConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-slate-900/50 border-slate-800/50 hover:border-slate-700/50 transition-all">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${channelConfig.bg}`}>
                <ChannelIcon className={`h-5 w-5 ${channelConfig.color}`} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">{store.name}</h3>
                {store.address && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[200px]">{store.address}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${status.bg} ${status.color} border ${status.border} text-xs flex items-center gap-1`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
                  <DropdownMenuItem className="text-slate-300 focus:bg-slate-800">
                    <Edit2 className="h-3.5 w-3.5 mr-2" />
                    Xem chi tiết
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-amber-400 focus:bg-slate-800"
                    onClick={() => onEditKPI(store)}
                  >
                    <Target className="h-3.5 w-3.5 mr-2" />
                    Cài đặt KPI/Target
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  <DropdownMenuItem className="text-slate-300 focus:bg-slate-800">Báo cáo</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-slate-800/30">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-slate-500">Doanh thu</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-100">
                  ₫{store.revenue >= 1000000 ? `${(store.revenue / 1000000).toFixed(0)}M` : store.revenue.toLocaleString()}
                </span>
                {store.growth !== 0 && (
                  <span className={`text-xs flex items-center ${store.growth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {store.growth > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                    {store.growth > 0 ? '+' : ''}{store.growth}%
                  </span>
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/30">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-slate-500">Target</span>
              </div>
              {hasTarget ? (
                <span className="text-lg font-bold text-slate-100">
                  ₫{store.target >= 1000000 ? `${(store.target / 1000000).toFixed(0)}M` : store.target.toLocaleString()}
                </span>
              ) : (
                <button 
                  onClick={() => onEditKPI(store)}
                  className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <Settings2 className="h-3 w-3" />
                  Cài đặt
                </button>
              )}
            </div>
          </div>

          {/* Progress */}
          {store.status === 'active' && hasTarget && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-500">Tiến độ đạt target</span>
                <span className={progress >= 90 ? 'text-emerald-400' : progress >= 60 ? 'text-amber-400' : 'text-red-400'}>
                  {progress.toFixed(0)}%
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>₫{(store.revenue / 1000000).toFixed(1)}M</span>
                <span>₫{(store.target / 1000000).toFixed(1)}M</span>
              </div>
            </div>
          )}

          {/* Staff & Hours */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-slate-800/30">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-slate-500">Nhân viên</span>
              </div>
              <span className="text-lg font-bold text-slate-100">{store.staff}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/30">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-slate-500">Đơn hàng</span>
              </div>
              <span className="text-lg font-bold text-slate-100">{store.orders.toLocaleString()}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              {store.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {store.phone}
                </span>
              )}
              {store.openHours && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {store.openHours}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AddChannelDialog({ onClose }: { onClose: () => void }) {
  const createStore = useCreateStore();
  const [channelType, setChannelType] = useState<'store' | 'shopee' | 'lazada' | 'tiktok' | 'website'>('store');
  const [formData, setFormData] = useState<StoreInput>({
    name: '',
    address: '',
    phone: '',
    manager: '',
    openHours: '',
    status: 'active',
    revenue: 0,
    target: 0,
    orders: 0,
    staff: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add channel type to the form data
    const dataWithType = {
      ...formData,
      channelType, // This will be stored in metadata
    };
    createStore.mutate(dataWithType as StoreInput, {
      onSuccess: () => onClose(),
    });
  };

  const isOnlineChannel = channelType !== 'store';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Channel Type Selection */}
      <div className="space-y-2">
        <Label>Loại kênh bán *</Label>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(channelTypeConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setChannelType(key as typeof channelType)}
                className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                  channelType === key
                    ? `${config.bg} border-slate-600 ring-1 ring-slate-500`
                    : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`h-5 w-5 ${config.color}`} />
                <span className="text-xs text-slate-300">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{isOnlineChannel ? 'Tên kênh / Shop *' : 'Tên cửa hàng *'}</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={isOnlineChannel ? 'VD: Shop ABC Official' : 'Quận 1 - Nguyễn Huệ'}
          required
          className="bg-slate-800/50 border-slate-700"
        />
      </div>

      {!isOnlineChannel && (
        <div className="space-y-2">
          <Label htmlFor="address">Địa chỉ</Label>
          <Input
            id="address"
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM"
            className="bg-slate-800/50 border-slate-700"
          />
        </div>
      )}

      {isOnlineChannel && (
        <div className="space-y-2">
          <Label htmlFor="shopUrl">Link Shop / URL</Label>
          <Input
            id="shopUrl"
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder={`https://${channelType === 'website' ? 'yourwebsite.com' : `${channelType}.vn/shop/yourshop`}`}
            className="bg-slate-800/50 border-slate-700"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">{isOnlineChannel ? 'Hotline / SĐT' : 'Điện thoại'}</Label>
          <Input
            id="phone"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="028 1234 5678"
            className="bg-slate-800/50 border-slate-700"
          />
        </div>
        {!isOnlineChannel ? (
          <div className="space-y-2">
            <Label htmlFor="openHours">Giờ mở cửa</Label>
            <Input
              id="openHours"
              value={formData.openHours || ''}
              onChange={(e) => setFormData({ ...formData, openHours: e.target.value })}
              placeholder="8:00 - 22:00"
              className="bg-slate-800/50 border-slate-700"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="manager">Người phụ trách</Label>
            <Input
              id="manager"
              value={formData.manager || ''}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              placeholder="Nguyễn Văn A"
              className="bg-slate-800/50 border-slate-700"
            />
          </div>
        )}
      </div>

      {!isOnlineChannel && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="manager">Quản lý</Label>
            <Input
              id="manager"
              value={formData.manager || ''}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              placeholder="Nguyễn Văn A"
              className="bg-slate-800/50 border-slate-700"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff">Số nhân viên</Label>
            <Input
              id="staff"
              type="number"
              value={formData.staff || ''}
              onChange={(e) => setFormData({ ...formData, staff: Number(e.target.value) })}
              placeholder="8"
              className="bg-slate-800/50 border-slate-700"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Trạng thái</Label>
          <Select 
            value={formData.status} 
            onValueChange={(value: 'active' | 'maintenance' | 'closed') => 
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="maintenance">Bảo trì</SelectItem>
              <SelectItem value="closed">Đóng cửa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="target">Target (VNĐ)</Label>
          <Input
            id="target"
            type="number"
            value={formData.target || ''}
            onChange={(e) => setFormData({ ...formData, target: Number(e.target.value) })}
            placeholder="500000000"
            className="bg-slate-800/50 border-slate-700"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" className="bg-amber-500 hover:bg-amber-600" disabled={createStore.isPending || !formData.name}>
          {createStore.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isOnlineChannel ? 'Thêm kênh' : 'Thêm cửa hàng'}
        </Button>
      </div>
    </form>
  );
}

export default function StoresPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [kpiFormData, setKpiFormData] = useState({
    target: 0,
    staff: 0,
  });
  
  const { data: stores, isLoading } = useStores();
  const { stats } = useStoreStats();
  const updateStore = useUpdateStore();

  const filteredStores = stores?.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.address && s.address.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const handleEditKPI = (store: StoreData) => {
    setSelectedStore(store);
    setKpiFormData({
      target: store.target,
      staff: store.staff,
    });
    setKpiDialogOpen(true);
  };

  const handleSaveKPI = () => {
    if (!selectedStore) return;
    
    updateStore.mutate({
      id: selectedStore.id,
      name: selectedStore.name,
      address: selectedStore.address,
      phone: selectedStore.phone,
      manager: selectedStore.manager,
      openHours: selectedStore.openHours,
      status: selectedStore.status,
      revenue: selectedStore.revenue,
      target: kpiFormData.target,
      orders: selectedStore.orders,
      growth: selectedStore.growth,
      staff: kpiFormData.staff,
    }, {
      onSuccess: () => {
        setKpiDialogOpen(false);
        setSelectedStore(null);
      }
    });
  };

  return (
    <>
      <Helmet>
        <title>Kênh bán | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-amber-400" />
              Quản lý kênh bán
            </h1>
            <p className="text-slate-400 text-sm mt-1">Theo dõi hiệu suất cửa hàng và các kênh bán online (Shopee, Lazada, TikTok, Website)</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Thêm kênh bán
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-slate-100">Thêm kênh bán mới</DialogTitle>
              </DialogHeader>
              <AddChannelDialog onClose={() => setIsDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
            <div className="text-xs text-slate-400">Tổng kênh bán</div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="text-2xl font-bold text-emerald-400">{stats.active}</div>
            <div className="text-xs text-slate-400">Đang hoạt động</div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="text-2xl font-bold text-amber-400">
              ₫{stats.totalRevenue >= 1000000 ? `${(stats.totalRevenue / 1000000).toFixed(0)}M` : stats.totalRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Tổng doanh thu</div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.totalOrders.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Tổng đơn hàng</div>
          </Card>
        </div>

        {/* Search & Filter */}
        <Card className="bg-slate-900/50 border-slate-800/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Tìm kiếm kênh bán..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700/50 text-slate-200"
                />
              </div>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
                <Filter className="h-4 w-4 mr-2" />
                Lọc
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Store Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filteredStores.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredStores.map((store, index) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ChannelCard store={store} onEditKPI={handleEditKPI} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">
              {searchQuery ? 'Không tìm thấy kênh bán nào' : 'Chưa có kênh bán nào'}
            </p>
            {!searchQuery && (
              <p className="text-sm text-slate-500">Nhấn "Thêm kênh bán" để tạo kênh đầu tiên (cửa hàng, Shopee, Lazada...)</p>
            )}
          </div>
        )}
      </div>

      {/* KPI Settings Dialog */}
      <Dialog open={kpiDialogOpen} onOpenChange={setKpiDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100 flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-400" />
              Cài đặt KPI / Target
            </DialogTitle>
          </DialogHeader>
          
          {selectedStore && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <Store className="h-4 w-4 text-amber-400" />
                  <span className="font-medium text-slate-200">{selectedStore.name}</span>
                </div>
                <p className="text-xs text-slate-500">{selectedStore.address || 'Chưa có địa chỉ'}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kpi-target" className="text-slate-300 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    Target doanh thu (VNĐ/tháng)
                  </Label>
                  <Input
                    id="kpi-target"
                    type="number"
                    value={kpiFormData.target || ''}
                    onChange={(e) => setKpiFormData({ ...kpiFormData, target: Number(e.target.value) })}
                    placeholder="500000000"
                    className="bg-slate-800/50 border-slate-700 text-slate-200"
                  />
                  <p className="text-xs text-slate-500">
                    VD: 500.000.000 = 500M/tháng
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kpi-staff" className="text-slate-300 flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-400" />
                    Số nhân viên
                  </Label>
                  <Input
                    id="kpi-staff"
                    type="number"
                    value={kpiFormData.staff || ''}
                    onChange={(e) => setKpiFormData({ ...kpiFormData, staff: Number(e.target.value) })}
                    placeholder="8"
                    className="bg-slate-800/50 border-slate-700 text-slate-200"
                  />
                </div>

                {selectedStore.revenue > 0 && kpiFormData.target > 0 && (
                  <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-400">Tiến độ hiện tại</span>
                      <span className={`text-sm font-medium ${
                        (selectedStore.revenue / kpiFormData.target * 100) >= 90 ? 'text-emerald-400' : 
                        (selectedStore.revenue / kpiFormData.target * 100) >= 60 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {Math.min((selectedStore.revenue / kpiFormData.target * 100), 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={Math.min((selectedStore.revenue / kpiFormData.target * 100), 100)} className="h-2" />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>₫{(selectedStore.revenue / 1000000).toFixed(1)}M</span>
                      <span>₫{(kpiFormData.target / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setKpiDialogOpen(false)}
              className="border-slate-700 text-slate-300"
            >
              Hủy
            </Button>
            <Button 
              onClick={handleSaveKPI}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={updateStore.isPending}
            >
              {updateStore.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Lưu KPI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
