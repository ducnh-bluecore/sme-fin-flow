import { useState, useMemo } from 'react';
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
  Package,
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
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatVNDCompact, formatPercent } from '@/lib/formatters';
import { useCapexProjects } from '@/hooks/useCapexProjects';
import { useInvestments } from '@/hooks/useInvestments';
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

const categoryColors: Record<string, string> = {
  infrastructure: '#3b82f6',
  technology: '#10b981',
  equipment: '#f59e0b',
  other: '#8b5cf6',
};

const categoryLabels: Record<string, string> = {
  infrastructure: 'Cơ sở hạ tầng',
  technology: 'Công nghệ',
  equipment: 'Thiết bị',
  other: 'Khác',
};

const investmentTypeLabels: Record<string, string> = {
  deposit: 'Tiền gửi',
  bond: 'Trái phiếu',
  fund: 'Quỹ đầu tư',
  stock: 'Cổ phiếu',
  venture: 'Startup/VC',
  other: 'Khác',
};

export default function CapitalAllocationPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: capexProjects, isLoading: capexLoading } = useCapexProjects();
  const { data: investments, isLoading: investmentsLoading } = useInvestments();

  const isLoading = capexLoading || investmentsLoading;

  // Calculate totals from real data
  const { totalBudget, totalSpent, avgRoi, avgPayback } = useMemo(() => {
    if (!capexProjects || capexProjects.length === 0) {
      return { totalBudget: 0, totalSpent: 0, avgRoi: 0, avgPayback: 0 };
    }
    
    const budget = capexProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const spent = capexProjects.reduce((sum, p) => sum + (p.spent || 0), 0);
    
    const projectsWithRoi = capexProjects.filter(p => p.expected_roi != null);
    const roi = projectsWithRoi.length > 0 
      ? projectsWithRoi.reduce((sum, p) => sum + (p.expected_roi || 0), 0) / projectsWithRoi.length 
      : 0;
    
    const projectsWithPayback = capexProjects.filter(p => p.payback_months != null);
    const payback = projectsWithPayback.length > 0
      ? projectsWithPayback.reduce((sum, p) => sum + (p.payback_months || 0), 0) / projectsWithPayback.length
      : 0;

    return { totalBudget: budget, totalSpent: spent, avgRoi: roi, avgPayback: payback };
  }, [capexProjects]);

  const { totalInvestments, totalReturn, ytdReturn } = useMemo(() => {
    if (!investments || investments.length === 0) {
      return { totalInvestments: 0, totalReturn: 0, ytdReturn: 0 };
    }
    
    const total = investments.reduce((sum, i) => sum + (i.current_value || 0), 0);
    const principal = investments.reduce((sum, i) => sum + (i.principal_amount || 0), 0);
    const returnAmount = total - principal;
    const returnPct = principal > 0 ? (returnAmount / principal) * 100 : 0;

    return { totalInvestments: total, totalReturn: returnAmount, ytdReturn: returnPct };
  }, [investments]);

  // Allocation by category for pie chart
  const allocationByCategory = useMemo(() => {
    if (!capexProjects || capexProjects.length === 0) return [];
    
    const categoryTotals: Record<string, number> = {};
    capexProjects.forEach(p => {
      const cat = p.category || 'other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (p.budget || 0);
    });
    
    return Object.entries(categoryTotals).map(([name, value]) => ({
      name: categoryLabels[name] || name,
      value,
      color: categoryColors[name] || '#8b5cf6',
    }));
  }, [capexProjects]);

  // ROI comparison data
  const roiComparison = useMemo(() => {
    if (!capexProjects || capexProjects.length === 0) return [];
    
    return capexProjects.slice(0, 6).map(p => ({
      project: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
      planned: p.expected_roi || 0,
      actual: p.actual_roi || 0,
    }));
  }, [capexProjects]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Hoàn thành</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="h-3 w-3 mr-1" />Đang thực hiện</Badge>;
      case 'approved':
        return <Badge className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Đã duyệt</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertTriangle className="h-3 w-3 mr-1" />Chờ duyệt</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Đã hủy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const hasCapexData = capexProjects && capexProjects.length > 0;
  const hasInvestmentData = investments && investments.length > 0;

  return (
    <>
      <Helmet>
        <title>{t('capital.title')} | Bluecore FDP</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title={t('capital.title')}
          subtitle={t('capital.subtitle')}
          actions={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('capital.addCapex')}
            </Button>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                {t('capital.totalBudget')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {hasCapexData ? formatVNDCompact(totalBudget) : '—'}
                  </div>
                  {hasCapexData && totalBudget > 0 && (
                    <>
                      <Progress value={(totalSpent / totalBudget) * 100} className="mt-2 h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('capital.spent')}: {formatVNDCompact(totalSpent)} ({formatPercent((totalSpent / totalBudget) * 100)})
                      </p>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t('capital.portfolio')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {hasInvestmentData ? formatVNDCompact(totalInvestments) : '—'}
                  </div>
                  {hasInvestmentData && (
                    <div className={`flex items-center gap-1 text-sm mt-1 ${ytdReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {ytdReturn >= 0 ? <TrendingUp className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      {ytdReturn >= 0 ? '+' : ''}{formatPercent(ytdReturn)} YTD
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                {t('capital.avgRoi')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {hasCapexData && avgRoi > 0 ? formatPercent(avgRoi) : '—'}
                  </div>
                  {hasCapexData && avgRoi > 0 && (
                    <div className={`flex items-center gap-1 text-sm mt-1 ${avgRoi >= 20 ? 'text-green-500' : 'text-yellow-500'}`}>
                      {avgRoi >= 20 ? <ArrowUpRight className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      {avgRoi >= 20 ? t('capital.aboveTarget') : t('capital.belowTarget')}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('capital.avgPayback')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {hasCapexData && avgPayback > 0 ? `${Math.round(avgPayback)} ${t('capital.months')}` : '—'}
                  </div>
                  {hasCapexData && avgPayback > 0 && (
                    <div className={`flex items-center gap-1 text-sm mt-1 ${avgPayback <= 24 ? 'text-green-500' : 'text-yellow-500'}`}>
                      {avgPayback <= 24 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      {t('capital.target')}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">{t('capital.overview')}</TabsTrigger>
            <TabsTrigger value="capex">{t('capital.capexProjects')}</TabsTrigger>
            <TabsTrigger value="investments">{t('capital.investments')}</TabsTrigger>
            <TabsTrigger value="analysis">{t('capital.roiAnalysis')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Allocation by Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    {t('capital.byCategory')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : allocationByCategory.length > 0 ? (
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
                            label={({ name, percent }) => `${name}: ${formatPercent(percent * 100)}`}
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
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>{t('capital.noCapex')}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ROI Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    {t('capital.roiPlanVsActual')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : roiComparison.length > 0 ? (
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
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>{t('capital.noRoiData')}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="capex" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('capital.projectList')}</CardTitle>
                <CardDescription>{t('capital.projectListDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : hasCapexData ? (
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
                      {capexProjects?.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{categoryLabels[project.category] || project.category}</Badge>
                          </TableCell>
                          <TableCell>{formatVNDCompact(project.budget)}</TableCell>
                          <TableCell>{formatVNDCompact(project.spent)}</TableCell>
                          <TableCell>
                            <div className="w-full">
                              <Progress 
                                value={project.budget > 0 ? (project.spent / project.budget) * 100 : 0} 
                                className="h-2"
                              />
                              <span className="text-xs text-muted-foreground">
                                {project.budget > 0 ? formatPercent((project.spent / project.budget) * 100) : '0%'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-green-500">
                            {project.expected_roi != null ? `${project.expected_roi}%` : '—'}
                          </TableCell>
                          <TableCell>
                            {project.payback_months != null ? `${project.payback_months} tháng` : '—'}
                          </TableCell>
                          <TableCell>{getStatusBadge(project.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Chưa có dự án CAPEX</p>
                    <p className="text-sm">Nhấn "Thêm dự án CAPEX" để tạo dự án mới</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investments" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Danh mục đầu tư tài chính</CardTitle>
                  <CardDescription>Theo dõi hiệu suất các khoản đầu tư</CardDescription>
                </div>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm khoản đầu tư
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : hasInvestmentData ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Khoản đầu tư</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead>Vốn gốc</TableHead>
                          <TableHead>Giá trị hiện tại</TableHead>
                          <TableHead>Lợi nhuận</TableHead>
                          <TableHead>Hiệu suất</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {investments?.map((investment) => {
                          const profit = (investment.current_value || 0) - (investment.principal_amount || 0);
                          const returnPct = investment.principal_amount > 0 
                            ? (profit / investment.principal_amount) * 100 
                            : 0;
                          
                          return (
                            <TableRow key={investment.id}>
                              <TableCell className="font-medium">{investment.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {investmentTypeLabels[investment.investment_type] || investment.investment_type}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatVNDCompact(investment.principal_amount)}</TableCell>
                              <TableCell>{formatVNDCompact(investment.current_value)}</TableCell>
                              <TableCell className={profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                                {profit >= 0 ? '+' : ''}{formatVNDCompact(profit)}
                              </TableCell>
                              <TableCell>
                                <div className={`flex items-center gap-1 font-medium ${returnPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {returnPct >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                  {returnPct >= 0 ? '+' : ''}{formatPercent(returnPct)}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Tổng danh mục đầu tư</span>
                        <div className="text-right">
                          <div className="text-xl font-bold">{formatVNDCompact(totalInvestments)}</div>
                          <div className={`text-sm flex items-center gap-1 ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {totalReturn >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            Lợi nhuận: {totalReturn >= 0 ? '+' : ''}{formatVNDCompact(totalReturn)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Chưa có khoản đầu tư</p>
                    <p className="text-sm">Nhấn "Thêm khoản đầu tư" để tạo mới</p>
                  </div>
                )}
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
