import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Package, 
  Users, 
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Store,
  Truck,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  color: string;
}

function KPICard({ title, value, change, changeLabel, icon: Icon, color }: KPICardProps) {
  const isPositive = change >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-slate-900/50 border-slate-800/50 hover:border-slate-700/50 transition-all">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-slate-400">{title}</p>
              <p className="text-2xl font-bold text-slate-100">{value}</p>
              <div className="flex items-center gap-1.5">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
                <span className={isPositive ? 'text-emerald-400 text-sm' : 'text-red-400 text-sm'}>
                  {isPositive ? '+' : ''}{change}%
                </span>
                <span className="text-slate-500 text-sm">{changeLabel}</span>
              </div>
            </div>
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="h-6 w-6" style={{ color }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface AlertItemProps {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  time: string;
}

function AlertItem({ severity, title, description, time }: AlertItemProps) {
  const colors = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'text-red-400' },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-400' },
    info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-400' }
  };

  return (
    <div className={`p-3 rounded-lg border ${colors[severity].bg} ${colors[severity].border}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`h-5 w-5 mt-0.5 ${colors[severity].icon}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          <p className="text-xs text-slate-500 mt-1">{time}</p>
        </div>
      </div>
    </div>
  );
}

interface TaskItemProps {
  title: string;
  assignee: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
}

function TaskItem({ title, assignee, status, priority, dueDate }: TaskItemProps) {
  const statusConfig = {
    pending: { label: 'Chờ xử lý', color: 'bg-slate-500' },
    'in-progress': { label: 'Đang làm', color: 'bg-amber-500' },
    completed: { label: 'Hoàn thành', color: 'bg-emerald-500' }
  };

  const priorityConfig = {
    high: { label: 'Cao', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
    medium: { label: 'Trung bình', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    low: { label: 'Thấp', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' }
  };

  return (
    <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{title}</p>
          <p className="text-xs text-slate-500 mt-1">Giao cho: {assignee}</p>
        </div>
        <Badge className={`text-xs ${priorityConfig[priority].color} border`}>
          {priorityConfig[priority].label}
        </Badge>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${statusConfig[status].color}`} />
          <span className="text-xs text-slate-400">{statusConfig[status].label}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          {dueDate}
        </div>
      </div>
    </div>
  );
}

export default function ControlTowerDashboard() {
  const { t } = useLanguage();

  const kpis: KPICardProps[] = [
    { title: 'Doanh thu hôm nay', value: '₫125.8M', change: 12.5, changeLabel: 'vs hôm qua', icon: DollarSign, color: '#10B981' },
    { title: 'Đơn hàng mới', value: '847', change: 8.2, changeLabel: 'vs hôm qua', icon: ShoppingCart, color: '#3B82F6' },
    { title: 'Tồn kho cảnh báo', value: '23 SKU', change: -15, changeLabel: 'vs tuần trước', icon: Package, color: '#F59E0B' },
    { title: 'Cửa hàng hoạt động', value: '45/48', change: 0, changeLabel: '3 đang bảo trì', icon: Store, color: '#8B5CF6' },
  ];

  const alerts: AlertItemProps[] = [
    { severity: 'critical', title: 'Hết hàng: iPhone 15 Pro Max', description: 'Cửa hàng Quận 1 - Tồn kho = 0', time: '5 phút trước' },
    { severity: 'warning', title: 'Đơn hàng chậm giao', description: '15 đơn hàng quá hạn giao 24h', time: '15 phút trước' },
    { severity: 'warning', title: 'Doanh thu thấp bất thường', description: 'Cửa hàng Quận 7 - Giảm 40% so với trung bình', time: '1 giờ trước' },
    { severity: 'info', title: 'Cập nhật giá thành công', description: '120 sản phẩm đã được cập nhật giá mới', time: '2 giờ trước' },
  ];

  const tasks: TaskItemProps[] = [
    { title: 'Kiểm kê tồn kho cuối tháng', assignee: 'Nguyễn Văn A', status: 'in-progress', priority: 'high', dueDate: 'Hôm nay' },
    { title: 'Đối soát công nợ NCC', assignee: 'Trần Thị B', status: 'pending', priority: 'high', dueDate: 'Ngày mai' },
    { title: 'Báo cáo doanh số tuần', assignee: 'Lê Văn C', status: 'completed', priority: 'medium', dueDate: 'Hoàn thành' },
    { title: 'Setup cửa hàng mới Q9', assignee: 'Phạm Thị D', status: 'in-progress', priority: 'medium', dueDate: '3 ngày' },
  ];

  const storePerformance = [
    { name: 'Quận 1 - Nguyễn Huệ', revenue: 45.2, target: 50, progress: 90 },
    { name: 'Quận 3 - Võ Văn Tần', revenue: 38.5, target: 40, progress: 96 },
    { name: 'Quận 7 - Phú Mỹ Hưng', revenue: 28.3, target: 45, progress: 63 },
    { name: 'Thủ Đức - Vincom', revenue: 52.1, target: 55, progress: 95 },
  ];

  return (
    <>
      <Helmet>
        <title>Control Tower | Operation System</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Control Tower Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Tổng quan vận hành thời gian thực</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="h-2 w-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
              Live Data
            </Badge>
            <span className="text-xs text-slate-500">Cập nhật: vừa xong</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <KPICard {...kpi} />
            </motion.div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts Panel */}
          <Card className="bg-slate-900/50 border-slate-800/50 lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  Cảnh báo
                </CardTitle>
                <Badge className="bg-red-500/10 text-red-400 border border-red-500/30">
                  4 mới
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.map((alert, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <AlertItem {...alert} />
                </motion.div>
              ))}
              <Button variant="ghost" className="w-full text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                Xem tất cả cảnh báo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Tasks Panel */}
          <Card className="bg-slate-900/50 border-slate-800/50 lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-400" />
                  Công việc
                </CardTitle>
                <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  12 việc
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.map((task, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <TaskItem {...task} />
                </motion.div>
              ))}
              <Button variant="ghost" className="w-full text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                Xem tất cả công việc
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Store Performance */}
          <Card className="bg-slate-900/50 border-slate-800/50 lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
                  Hiệu suất cửa hàng
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {storePerformance.map((store, index) => (
                <motion.div
                  key={store.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300 truncate flex-1">{store.name}</span>
                    <span className="text-sm font-medium text-slate-100">₫{store.revenue}M</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={store.progress} 
                      className="h-2 flex-1"
                    />
                    <span className={`text-xs font-medium ${store.progress >= 90 ? 'text-emerald-400' : store.progress >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                      {store.progress}%
                    </span>
                  </div>
                </motion.div>
              ))}
              <Button variant="ghost" className="w-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                Xem chi tiết
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Truck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">156</p>
                <p className="text-xs text-slate-400">Đơn đang giao</p>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Package className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">2,847</p>
                <p className="text-xs text-slate-400">SKU tồn kho</p>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">89</p>
                <p className="text-xs text-slate-400">Nhân viên online</p>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <CheckCircle2 className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">94%</p>
                <p className="text-xs text-slate-400">Tỷ lệ hoàn thành</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
