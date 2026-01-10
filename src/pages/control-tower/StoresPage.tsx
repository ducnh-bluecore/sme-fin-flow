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
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface StoreData {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: 'active' | 'maintenance' | 'closed';
  manager: string;
  revenue: number;
  target: number;
  orders: number;
  growth: number;
  staff: number;
  openHours: string;
}

const mockStores: StoreData[] = [
  { 
    id: '1', 
    name: 'Quận 1 - Nguyễn Huệ', 
    address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
    phone: '028 1234 5678',
    status: 'active',
    manager: 'Nguyễn Văn A',
    revenue: 452,
    target: 500,
    orders: 1250,
    growth: 12.5,
    staff: 8,
    openHours: '8:00 - 22:00'
  },
  { 
    id: '2', 
    name: 'Quận 3 - Võ Văn Tần', 
    address: '456 Võ Văn Tần, Quận 3, TP.HCM',
    phone: '028 2345 6789',
    status: 'active',
    manager: 'Trần Thị B',
    revenue: 385,
    target: 400,
    orders: 980,
    growth: 8.2,
    staff: 6,
    openHours: '8:00 - 21:00'
  },
  { 
    id: '3', 
    name: 'Quận 7 - Phú Mỹ Hưng', 
    address: '789 Nguyễn Lương Bằng, Quận 7, TP.HCM',
    phone: '028 3456 7890',
    status: 'maintenance',
    manager: 'Lê Văn C',
    revenue: 283,
    target: 450,
    orders: 720,
    growth: -5.3,
    staff: 7,
    openHours: '9:00 - 22:00'
  },
  { 
    id: '4', 
    name: 'Thủ Đức - Vincom', 
    address: 'Vincom Thủ Đức, TP.HCM',
    phone: '028 4567 8901',
    status: 'active',
    manager: 'Phạm Thị D',
    revenue: 521,
    target: 550,
    orders: 1420,
    growth: 15.8,
    staff: 10,
    openHours: '9:00 - 22:00'
  },
  { 
    id: '5', 
    name: 'Bình Thạnh - Hàng Xanh', 
    address: '12 Điện Biên Phủ, Bình Thạnh, TP.HCM',
    phone: '028 5678 9012',
    status: 'active',
    manager: 'Hoàng Văn E',
    revenue: 312,
    target: 350,
    orders: 850,
    growth: 3.2,
    staff: 5,
    openHours: '8:00 - 21:00'
  },
  { 
    id: '6', 
    name: 'Gò Vấp - Quang Trung', 
    address: '234 Quang Trung, Gò Vấp, TP.HCM',
    phone: '028 6789 0123',
    status: 'closed',
    manager: 'Mai Thị F',
    revenue: 0,
    target: 300,
    orders: 0,
    growth: 0,
    staff: 0,
    openHours: 'Đang đóng cửa'
  },
];

const statusConfig = {
  active: { label: 'Hoạt động', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  maintenance: { label: 'Bảo trì', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  closed: { label: 'Đóng cửa', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
};

function StoreCard({ store }: { store: StoreData }) {
  const status = statusConfig[store.status];
  const StatusIcon = status.icon;
  const progress = Math.min((store.revenue / store.target) * 100, 100);

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
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[200px]">{store.address}</span>
                </div>
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
                <span className="text-lg font-bold text-slate-100">₫{store.revenue}M</span>
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
          {store.status === 'active' && (
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
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {store.phone}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {store.openHours}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function StoresPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stores] = useState(mockStores);

  const filteredStores = stores.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = stores.filter(s => s.status === 'active').length;
  const totalRevenue = stores.reduce((sum, s) => sum + s.revenue, 0);
  const totalOrders = stores.reduce((sum, s) => sum + s.orders, 0);

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
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Thêm cửa hàng
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="text-2xl font-bold text-slate-100">{stores.length}</div>
            <div className="text-xs text-slate-400">Tổng cửa hàng</div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
            <div className="text-xs text-slate-400">Đang hoạt động</div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="text-2xl font-bold text-amber-400">₫{totalRevenue}M</div>
            <div className="text-xs text-slate-400">Tổng doanh thu</div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="text-2xl font-bold text-blue-400">{totalOrders.toLocaleString()}</div>
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

        {filteredStores.length === 0 && (
          <div className="text-center py-12">
            <Store className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Không tìm thấy cửa hàng nào</p>
          </div>
        )}
      </div>
    </>
  );
}
