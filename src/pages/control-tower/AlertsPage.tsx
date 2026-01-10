import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingDown,
  Package,
  Store,
  DollarSign,
  Users,
  Filter,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'inventory' | 'sales' | 'operations' | 'finance' | 'hr';
  title: string;
  description: string;
  location?: string;
  value?: string;
  threshold?: string;
  time: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'critical',
    category: 'inventory',
    title: 'Hết hàng: iPhone 15 Pro Max 256GB',
    description: 'SKU đã hết tại cửa hàng, cần nhập hàng khẩn cấp',
    location: 'Cửa hàng Quận 1',
    value: '0 units',
    threshold: 'Min: 10 units',
    time: '5 phút trước',
    status: 'active'
  },
  {
    id: '2',
    type: 'critical',
    category: 'sales',
    title: 'Đơn hàng chậm giao quá 24h',
    description: '15 đơn hàng đã quá thời hạn giao hàng cam kết',
    value: '15 đơn',
    time: '15 phút trước',
    status: 'active'
  },
  {
    id: '3',
    type: 'warning',
    category: 'sales',
    title: 'Doanh thu giảm bất thường',
    description: 'Doanh thu giảm 40% so với trung bình tuần',
    location: 'Cửa hàng Quận 7',
    value: '₫12.5M',
    threshold: 'TB: ₫21M',
    time: '1 giờ trước',
    status: 'acknowledged'
  },
  {
    id: '4',
    type: 'warning',
    category: 'inventory',
    title: 'Tồn kho thấp: Samsung Galaxy S24',
    description: 'Tồn kho đang ở mức cảnh báo, cần bổ sung',
    location: 'Kho trung tâm',
    value: '25 units',
    threshold: 'Min: 50 units',
    time: '2 giờ trước',
    status: 'active'
  },
  {
    id: '5',
    type: 'warning',
    category: 'finance',
    title: 'Công nợ quá hạn',
    description: 'Có 3 khoản công nợ khách hàng quá hạn 30 ngày',
    value: '₫450M',
    time: '3 giờ trước',
    status: 'active'
  },
  {
    id: '6',
    type: 'info',
    category: 'operations',
    title: 'Bảo trì cửa hàng hoàn tất',
    description: 'Cửa hàng đã hoàn tất bảo trì và hoạt động trở lại',
    location: 'Cửa hàng Thủ Đức',
    time: '5 giờ trước',
    status: 'resolved'
  },
];

const typeConfig = {
  critical: { 
    icon: XCircle, 
    color: 'text-red-400', 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/30',
    label: 'Nghiêm trọng'
  },
  warning: { 
    icon: AlertTriangle, 
    color: 'text-amber-400', 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/30',
    label: 'Cảnh báo'
  },
  info: { 
    icon: Bell, 
    color: 'text-blue-400', 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/30',
    label: 'Thông tin'
  },
};

const categoryConfig = {
  inventory: { icon: Package, label: 'Tồn kho', color: 'text-amber-400' },
  sales: { icon: TrendingDown, label: 'Bán hàng', color: 'text-purple-400' },
  operations: { icon: Store, label: 'Vận hành', color: 'text-blue-400' },
  finance: { icon: DollarSign, label: 'Tài chính', color: 'text-green-400' },
  hr: { icon: Users, label: 'Nhân sự', color: 'text-cyan-400' },
};

function AlertCard({ alert }: { alert: Alert }) {
  const typeConf = typeConfig[alert.type];
  const catConf = categoryConfig[alert.category];
  const TypeIcon = typeConf.icon;
  const CatIcon = catConf.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border ${typeConf.bg} ${typeConf.border} transition-all hover:border-opacity-60`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${typeConf.bg}`}>
          <TypeIcon className={`h-5 w-5 ${typeConf.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`text-xs ${typeConf.bg} ${typeConf.color} border ${typeConf.border}`}>
                  {typeConf.label}
                </Badge>
                <Badge className="text-xs bg-slate-700/50 text-slate-400 border-slate-600/30 flex items-center gap-1">
                  <CatIcon className="h-3 w-3" />
                  {catConf.label}
                </Badge>
              </div>
              <h3 className="text-sm font-medium text-slate-100">{alert.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{alert.description}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {alert.status === 'active' && (
                <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs">
                  Đang xảy ra
                </Badge>
              )}
              {alert.status === 'acknowledged' && (
                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs">
                  Đã nhận
                </Badge>
              )}
              {alert.status === 'resolved' && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs">
                  Đã xử lý
                </Badge>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-wrap items-center gap-4 mt-3">
            {alert.location && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Store className="h-3 w-3" />
                {alert.location}
              </div>
            )}
            {alert.value && (
              <div className="text-xs">
                <span className="text-slate-500">Hiện tại: </span>
                <span className={typeConf.color}>{alert.value}</span>
              </div>
            )}
            {alert.threshold && (
              <div className="text-xs text-slate-500">{alert.threshold}</div>
            )}
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {alert.time}
            </div>
          </div>

          {/* Actions */}
          {alert.status === 'active' && (
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" className="h-7 bg-amber-500 hover:bg-amber-600 text-white text-xs">
                Xử lý ngay
              </Button>
              <Button size="sm" variant="outline" className="h-7 border-slate-700 text-slate-300 text-xs">
                Đánh dấu đã nhận
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function AlertsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [alerts] = useState(mockAlerts);

  const criticalCount = alerts.filter(a => a.type === 'critical' && a.status === 'active').length;
  const warningCount = alerts.filter(a => a.type === 'warning' && a.status === 'active').length;
  const activeCount = alerts.filter(a => a.status === 'active').length;

  return (
    <>
      <Helmet>
        <title>Cảnh báo | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
              Trung tâm cảnh báo
            </h1>
            <p className="text-slate-400 text-sm mt-1">Theo dõi và xử lý các cảnh báo vận hành</p>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse">
                {criticalCount} nghiêm trọng
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {warningCount} cảnh báo
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
                <div className="text-xs text-slate-400">Nghiêm trọng</div>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">{warningCount}</div>
                <div className="text-xs text-slate-400">Cảnh báo</div>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">{activeCount}</div>
                <div className="text-xs text-slate-400">Chưa xử lý</div>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-400">
                  {alerts.filter(a => a.status === 'resolved').length}
                </div>
                <div className="text-xs text-slate-400">Đã xử lý</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="bg-slate-900/50 border-slate-800/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Tìm kiếm cảnh báo..."
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

        {/* Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-slate-900/50 border border-slate-800/50">
            <TabsTrigger value="active" className="data-[state=active]:bg-slate-800">
              Đang xảy ra ({activeCount})
            </TabsTrigger>
            <TabsTrigger value="acknowledged" className="data-[state=active]:bg-slate-800">
              Đã nhận
            </TabsTrigger>
            <TabsTrigger value="resolved" className="data-[state=active]:bg-slate-800">
              Đã xử lý
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-slate-800">
              Tất cả
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-3">
            {alerts.filter(a => a.status === 'active').map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </TabsContent>

          <TabsContent value="acknowledged" className="mt-4 space-y-3">
            {alerts.filter(a => a.status === 'acknowledged').map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </TabsContent>

          <TabsContent value="resolved" className="mt-4 space-y-3">
            {alerts.filter(a => a.status === 'resolved').map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </TabsContent>

          <TabsContent value="all" className="mt-4 space-y-3">
            {alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
