import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  TrendingUp, 
  Building2, 
  Calculator,
  PieChart,
  BarChart3,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatVNDCompact } from '@/lib/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// Sample CAPEX data
const capexProjects = [
  {
    id: 1,
    name: 'Mở rộng kho Bình Dương',
    category: 'Infrastructure',
    budget: 5000000000,
    spent: 1200000000,
    status: 'in-progress',
    roi: 25,
    paybackMonths: 24,
    startDate: '2025-11-01',
    endDate: '2026-06-30',
  },
  {
    id: 2,
    name: 'Nâng cấp hệ thống ERP',
    category: 'Technology',
    budget: 2000000000,
    spent: 2000000000,
    status: 'completed',
    roi: 35,
    paybackMonths: 18,
    startDate: '2025-06-01',
    endDate: '2025-12-31',
  },
  {
    id: 3,
    name: 'Máy móc sản xuất mới',
    category: 'Equipment',
    budget: 3500000000,
    spent: 0,
    status: 'pending',
    roi: 20,
    paybackMonths: 30,
    startDate: '2026-02-01',
    endDate: '2026-08-31',
  },
  {
    id: 4,
    name: 'Showroom Hà Nội',
    category: 'Infrastructure',
    budget: 1500000000,
    spent: 800000000,
    status: 'in-progress',
    roi: 18,
    paybackMonths: 36,
    startDate: '2025-10-01',
    endDate: '2026-03-31',
  },
];

// Investment portfolio data
const investmentPortfolio = [
  { name: 'Tiền gửi ngân hàng', value: 5000000000, return: 6.5, type: 'deposit' },
  { name: 'Trái phiếu doanh nghiệp', value: 2000000000, return: 9.2, type: 'bond' },
  { name: 'Quỹ đầu tư', value: 1500000000, return: 12.5, type: 'fund' },
  { name: 'Đầu tư startup', value: 500000000, return: -5, type: 'venture' },
];

// Allocation by category
const allocationByCategory = [
  { name: 'Infrastructure', value: 6500000000, color: '#3b82f6' },
  { name: 'Technology', value: 2000000000, color: '#10b981' },
  { name: 'Equipment', value: 3500000000, color: '#f59e0b' },
  { name: 'Working Capital', value: 3000000000, color: '#8b5cf6' },
];

// ROI comparison data
const roiComparison = [
  { project: 'Kho BD', planned: 25, actual: 28 },
  { project: 'ERP', planned: 35, actual: 32 },
  { project: 'Máy móc', planned: 20, actual: 0 },
  { project: 'Showroom', planned: 18, actual: 15 },
];

export default function CapitalAllocationPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');

  const totalBudget = capexProjects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = capexProjects.reduce((sum, p) => sum + p.spent, 0);
  const totalInvestments = investmentPortfolio.reduce((sum, i) => sum + i.value, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Hoàn thành</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="h-3 w-3 mr-1" />Đang thực hiện</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertTriangle className="h-3 w-3 mr-1" />Chờ duyệt</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Helmet>
        <title>Capital Allocation | Bluecore FDP</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title={t('nav.capitalAllocation')}
          subtitle="Quản lý phân bổ vốn, CAPEX và danh mục đầu tư"
          actions={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Thêm dự án CAPEX
            </Button>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Tổng ngân sách CAPEX
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatVNDCompact(totalBudget)}</div>
              <Progress value={(totalSpent / totalBudget) * 100} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Đã chi: {formatVNDCompact(totalSpent)} ({((totalSpent / totalBudget) * 100).toFixed(0)}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Danh mục đầu tư
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatVNDCompact(totalInvestments)}</div>
              <div className="flex items-center gap-1 text-sm text-green-500 mt-1">
                <TrendingUp className="h-4 w-4" />
                +8.2% YTD
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                ROI trung bình
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24.5%</div>
              <div className="flex items-center gap-1 text-sm text-green-500 mt-1">
                <ArrowUpRight className="h-4 w-4" />
                Trên target 20%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Payback trung bình
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">27 tháng</div>
              <div className="flex items-center gap-1 text-sm text-yellow-500 mt-1">
                <AlertTriangle className="h-4 w-4" />
                Target: 24 tháng
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="capex">CAPEX Projects</TabsTrigger>
            <TabsTrigger value="investments">Danh mục đầu tư</TabsTrigger>
            <TabsTrigger value="analysis">Phân tích ROI</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Allocation by Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    Phân bổ theo danh mục
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={allocationByCategory}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {allocationByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatVNDCompact(value as number)} />
                        <Legend />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* ROI Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    ROI: Kế hoạch vs Thực tế
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={roiComparison}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="project" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="planned" name="Kế hoạch" fill="hsl(var(--primary))" />
                        <Bar dataKey="actual" name="Thực tế" fill="hsl(var(--chart-2))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="capex" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách dự án CAPEX</CardTitle>
                <CardDescription>Theo dõi tiến độ và ngân sách các dự án đầu tư</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dự án</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Ngân sách</TableHead>
                      <TableHead>Đã chi</TableHead>
                      <TableHead>Tiến độ</TableHead>
                      <TableHead>ROI</TableHead>
                      <TableHead>Payback</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capexProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{project.category}</Badge>
                        </TableCell>
                        <TableCell>{formatVNDCompact(project.budget)}</TableCell>
                        <TableCell>{formatVNDCompact(project.spent)}</TableCell>
                        <TableCell>
                          <div className="w-full">
                            <Progress 
                              value={(project.spent / project.budget) * 100} 
                              className="h-2"
                            />
                            <span className="text-xs text-muted-foreground">
                              {((project.spent / project.budget) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-green-500">{project.roi}%</TableCell>
                        <TableCell>{project.paybackMonths} tháng</TableCell>
                        <TableCell>{getStatusBadge(project.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investments" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Danh mục đầu tư tài chính</CardTitle>
                <CardDescription>Theo dõi hiệu suất các khoản đầu tư</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Khoản đầu tư</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Giá trị</TableHead>
                      <TableHead>Lợi nhuận</TableHead>
                      <TableHead>Hiệu suất</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investmentPortfolio.map((investment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{investment.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{investment.type}</Badge>
                        </TableCell>
                        <TableCell>{formatVNDCompact(investment.value)}</TableCell>
                        <TableCell>
                          {formatVNDCompact(investment.value * (investment.return / 100))}
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 font-medium ${investment.return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {investment.return >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            {investment.return >= 0 ? '+' : ''}{investment.return}%
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Tổng danh mục đầu tư</span>
                    <div className="text-right">
                      <div className="text-xl font-bold">{formatVNDCompact(totalInvestments)}</div>
                      <div className="text-sm text-green-500 flex items-center gap-1">
                        <ArrowUpRight className="h-4 w-4" />
                        Lợi nhuận: +{formatVNDCompact(totalInvestments * 0.082)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    NPV Calculator
                  </CardTitle>
                  <CardDescription>Tính toán Net Present Value cho dự án</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border bg-muted/50">
                      <p className="text-sm text-muted-foreground">Tính năng đang phát triển...</p>
                      <p className="text-sm mt-2">Sẽ bao gồm:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                        <li>Nhập cash flows dự kiến</li>
                        <li>Tính NPV, IRR tự động</li>
                        <li>So sánh nhiều scenario</li>
                        <li>Sensitivity analysis</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    WACC & Cost of Capital
                  </CardTitle>
                  <CardDescription>Chi phí vốn bình quân gia quyền</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                      <span>Cost of Debt</span>
                      <span className="font-bold">8.5%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                      <span>Cost of Equity</span>
                      <span className="font-bold">15.2%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <span className="font-medium">WACC</span>
                      <span className="font-bold text-primary text-xl">11.8%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dự án cần ROI {'>'} 11.8% để tạo giá trị
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
