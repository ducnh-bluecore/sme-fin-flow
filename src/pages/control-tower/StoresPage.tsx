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
  Loader2
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStores, useStoreStats, useCreateStore, useDeleteStore, StoreData, StoreInput } from '@/hooks/useStores';

const statusConfig = {
  active: { label: 'Hoạt động', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  maintenance: { label: 'Bảo trì', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  closed: { label: 'Đóng cửa', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
};

function StoreCard({ store }: { store: StoreData }) {
  const status = statusConfig[store.status];
  const StatusIcon = status.icon;
  const progress = store.target > 0 ? Math.min((store.revenue / store.target) * 100, 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-slate-900/50 border-slate-800/50 hover:border-slate-700/50 transition-all">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <Store className="h-5 w-5 text-amber-400" />
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
                  <DropdownMenuItem className="text-slate-300 focus:bg-slate-800">Xem chi tiết</DropdownMenuItem>
                  <DropdownMenuItem className="text-slate-300 focus:bg-slate-800">Chỉnh sửa</DropdownMenuItem>
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
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-slate-500">Nhân viên</span>
              </div>
              <span className="text-lg font-bold text-slate-100">{store.staff}</span>
            </div>
          </div>

          {/* Progress */}
          {store.status === 'active' && store.target > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-500">Tiến độ target</span>
                <span className={progress >= 90 ? 'text-emerald-400' : progress >= 60 ? 'text-amber-400' : 'text-red-400'}>
                  {progress.toFixed(0)}%
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

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

function AddStoreDialog({ onClose }: { onClose: () => void }) {
  const createStore = useCreateStore();
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
    createStore.mutate(formData, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Tên cửa hàng *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Quận 1 - Nguyễn Huệ"
          required
          className="bg-slate-800/50 border-slate-700"
        />
      </div>

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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Điện thoại</Label>
          <Input
            id="phone"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="028 1234 5678"
            className="bg-slate-800/50 border-slate-700"
          />
        </div>
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
      </div>

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
      </div>

      <div className="grid grid-cols-2 gap-4">
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

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" className="bg-amber-500 hover:bg-amber-600" disabled={createStore.isPending || !formData.name}>
          {createStore.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Thêm cửa hàng
        </Button>
      </div>
    </form>
  );
}

export default function StoresPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: stores, isLoading } = useStores();
  const { stats } = useStoreStats();

  const filteredStores = stores?.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.address && s.address.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  return (
    <>
      <Helmet>
        <title>Cửa hàng | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Store className="h-6 w-6 text-amber-400" />
              Quản lý cửa hàng
            </h1>
            <p className="text-slate-400 text-sm mt-1">Theo dõi hiệu suất và trạng thái các cửa hàng</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Thêm cửa hàng
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-slate-100">Thêm cửa hàng mới</DialogTitle>
              </DialogHeader>
              <AddStoreDialog onClose={() => setIsDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
            <div className="text-xs text-slate-400">Tổng cửa hàng</div>
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
                  placeholder="Tìm kiếm cửa hàng..."
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
                <StoreCard store={store} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Store className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">
              {searchQuery ? 'Không tìm thấy cửa hàng nào' : 'Chưa có cửa hàng nào'}
            </p>
            {!searchQuery && (
              <p className="text-sm text-slate-500">Nhấn "Thêm cửa hàng" để tạo cửa hàng đầu tiên</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
