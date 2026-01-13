import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Database, 
  ArrowRight,
  FileSpreadsheet,
  TrendingUp,
  Wallet,
  ShoppingCart,
  Megaphone,
  Loader2,
  ExternalLink,
  Info,
  Upload,
  ChevronDown,
  ChevronRight,
  Download,
  Table,
  Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMDPDataReadiness, DataSourceStatus } from '@/hooks/useMDPDataReadiness';
import { FileImportDialog } from '@/components/import/FileImportDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const categoryConfig = {
  orders: {
    icon: ShoppingCart,
    label: 'Orders & Revenue',
    labelVi: 'Đơn hàng & Doanh thu',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  marketing: {
    icon: Megaphone,
    label: 'Marketing Spend',
    labelVi: 'Chi phí Marketing',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  costs: {
    icon: FileSpreadsheet,
    label: 'Cost Structure',
    labelVi: 'Cơ cấu chi phí',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  cash: {
    icon: Wallet,
    label: 'Cash Flow',
    labelVi: 'Dòng tiền',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
};

const statusConfig = {
  ready: {
    icon: CheckCircle2,
    label: 'Ready',
    labelVi: 'Sẵn sàng',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  partial: {
    icon: AlertCircle,
    label: 'Partial',
    labelVi: 'Thiếu dữ liệu',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  missing: {
    icon: XCircle,
    label: 'Missing',
    labelVi: 'Chưa có',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  loading: {
    icon: Loader2,
    label: 'Loading',
    labelVi: 'Đang tải',
    color: 'text-muted-foreground',
    bg: 'bg-muted/10',
    border: 'border-muted/30',
  },
};

const importanceConfig = {
  critical: {
    label: 'Critical',
    labelVi: 'Bắt buộc',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  },
  important: {
    label: 'Important',
    labelVi: 'Quan trọng',
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  },
  optional: {
    label: 'Optional',
    labelVi: 'Tùy chọn',
    color: 'text-muted-foreground bg-muted',
  },
};

// Field descriptions for each table - aligned with actual database schema
const fieldDescriptions: Record<string, Record<string, { vi: string; en: string; type: string; example: string }>> = {
  external_orders: {
    channel: { vi: 'Kênh bán hàng (shopee, lazada, tiktok...)', en: 'Sales channel', type: 'text', example: 'shopee' },
    order_date: { vi: 'Ngày đặt hàng', en: 'Order date', type: 'timestamp', example: '2026-01-15T10:30:00Z' },
    status: { vi: 'Trạng thái đơn hàng (completed, cancelled, processing)', en: 'Order status', type: 'enum', example: 'completed' },
    total_amount: { vi: 'Tổng tiền đơn hàng', en: 'Total amount', type: 'numeric', example: '500000' },
    payment_status: { vi: 'Trạng thái thanh toán (paid, pending, refunded)', en: 'Payment status', type: 'text', example: 'paid' },
    cost_of_goods: { vi: 'Giá vốn hàng bán (COGS)', en: 'Cost of goods sold', type: 'numeric', example: '300000' },
    seller_income: { vi: 'Thu nhập thực nhận từ sàn sau phí', en: 'Net seller income after fees', type: 'numeric', example: '450000' },
  },
  external_order_items: {
    product_name: { vi: 'Tên sản phẩm', en: 'Product name', type: 'text', example: 'Áo thun nam basic' },
    quantity: { vi: 'Số lượng', en: 'Quantity', type: 'integer', example: '2' },
    unit_price: { vi: 'Đơn giá bán', en: 'Unit selling price', type: 'numeric', example: '250000' },
    unit_cogs: { vi: 'Giá vốn đơn vị', en: 'Unit cost of goods', type: 'numeric', example: '150000' },
  },
  promotion_campaigns: {
    campaign_name: { vi: 'Tên chiến dịch', en: 'Campaign name', type: 'text', example: 'Flash Sale 1.1' },
    channel: { vi: 'Kênh quảng cáo (facebook, google, tiktok)', en: 'Ad channel', type: 'text', example: 'facebook' },
    actual_cost: { vi: 'Chi phí thực tế đã chi', en: 'Actual spend', type: 'numeric', example: '5000000' },
    total_revenue: { vi: 'Doanh thu từ campaign', en: 'Campaign attributed revenue', type: 'numeric', example: '25000000' },
    start_date: { vi: 'Ngày bắt đầu campaign', en: 'Campaign start date', type: 'timestamp', example: '2026-01-01' },
    end_date: { vi: 'Ngày kết thúc campaign', en: 'Campaign end date', type: 'timestamp', example: '2026-01-07' },
  },
  marketing_expenses: {
    channel: { vi: 'Kênh quảng cáo (google_ads, facebook, shopee_ads)', en: 'Ad channel', type: 'text', example: 'google_ads' },
    expense_date: { vi: 'Ngày chi tiêu quảng cáo', en: 'Expense date', type: 'date', example: '2026-01-15' },
    amount: { vi: 'Số tiền chi cho quảng cáo', en: 'Ad spend amount', type: 'numeric', example: '1500000' },
  },
  channel_analytics: {
    channel: { vi: 'Kênh bán hàng', en: 'Sales channel', type: 'text', example: 'shopee' },
    analytics_date: { vi: 'Ngày thống kê', en: 'Analytics date', type: 'date', example: '2026-01-15' },
    sessions: { vi: 'Số phiên truy cập', en: 'Sessions/visits', type: 'integer', example: '5000' },
    marketing_cost: { vi: 'Chi phí marketing', en: 'Marketing cost', type: 'numeric', example: '2000000' },
    revenue: { vi: 'Doanh thu', en: 'Revenue', type: 'numeric', example: '15000000' },
  },
  channel_fees: {
    fee_type: { vi: 'Loại phí (commission, payment, shipping, service)', en: 'Fee type', type: 'text', example: 'commission' },
    amount: { vi: 'Số tiền phí', en: 'Fee amount', type: 'numeric', example: '50000' },
    fee_date: { vi: 'Ngày tính phí', en: 'Fee date', type: 'date', example: '2026-01-15' },
  },
  external_products: {
    name: { vi: 'Tên sản phẩm', en: 'Product name', type: 'text', example: 'Giày thể thao nam Nike' },
    selling_price: { vi: 'Giá bán lẻ', en: 'Retail selling price', type: 'numeric', example: '850000' },
    cost_price: { vi: 'Giá vốn (COGS)', en: 'Cost price (COGS)', type: 'numeric', example: '500000' },
  },
  channel_settlements: {
    period_start: { vi: 'Ngày bắt đầu kỳ thanh toán', en: 'Period start', type: 'date', example: '2026-01-01' },
    period_end: { vi: 'Ngày kết thúc kỳ thanh toán', en: 'Period end', type: 'date', example: '2026-01-15' },
    net_amount: { vi: 'Số tiền thực nhận', en: 'Net amount', type: 'number', example: '45000000' },
    gross_sales: { vi: 'Tổng doanh số', en: 'Gross sales', type: 'number', example: '50000000' },
  },
  expenses: {
    category: { vi: 'Danh mục chi phí (marketing, payroll, rent...)', en: 'Expense category', type: 'text', example: 'marketing' },
    amount: { vi: 'Số tiền', en: 'Amount', type: 'number', example: '10000000' },
    expense_date: { vi: 'Ngày chi', en: 'Expense date', type: 'date', example: '2026-01-15' },
  },
};

// Map table to import template
const tableToTemplate: Record<string, string> = {
  external_orders: 'orders',
  external_order_items: 'orders', // Will be imported with orders
  promotion_campaigns: 'promotions',
  marketing_expenses: 'expenses',
  channel_analytics: 'orders', // Custom template needed
  channel_fees: 'expenses',
  external_products: 'products',
  channel_settlements: 'bank_transactions',
  expenses: 'expenses',
};

function SourceCard({ 
  source, 
  language, 
  onImport,
  expanded,
  onToggle,
}: { 
  source: DataSourceStatus; 
  language: string;
  onImport: (table: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = statusConfig[source.status];
  const category = categoryConfig[source.category];
  const importance = importanceConfig[source.importance];
  const StatusIcon = status.icon;
  const fields = fieldDescriptions[source.table] || {};

  const handleCopyTemplate = () => {
    const headers = source.requiredFields.join('\t');
    const exampleRow = source.requiredFields.map(f => fields[f]?.example || '').join('\t');
    navigator.clipboard.writeText(`${headers}\n${exampleRow}`);
    toast.success(language === 'vi' ? 'Đã copy template' : 'Template copied');
  };

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-lg border transition-all',
          status.bg,
          status.border
        )}
      >
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={cn('p-2 rounded-lg', category.bg)}>
                  <category.icon className={cn('h-5 w-5', category.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground truncate">
                      {language === 'vi' ? source.name : source.nameEn}
                    </h4>
                    <Badge variant="outline" className={cn('text-xs shrink-0', importance.color)}>
                      {language === 'vi' ? importance.labelVi : importance.label}
                    </Badge>
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {language === 'vi' ? source.description : source.descriptionEn}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className={cn('flex items-center gap-1', status.color)}>
                  <StatusIcon className={cn('h-4 w-4', source.status === 'loading' && 'animate-spin')} />
                  <span className="text-xs font-medium">
                    {language === 'vi' ? status.labelVi : status.label}
                  </span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {source.recordCount.toLocaleString()} records
                </span>
              </div>
            </div>

            {source.status !== 'loading' && source.recordCount > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {language === 'vi' ? 'Độ hoàn thiện dữ liệu' : 'Data completeness'}
                  </span>
                  <span className="font-medium">{Math.round(source.completenessPercent)}%</span>
                </div>
                <Progress value={source.completenessPercent} className="h-1.5" />
              </div>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <Separator />
            
            {/* Required Fields Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium">
                  {language === 'vi' ? 'Các trường dữ liệu cần thiết' : 'Required Fields'}
                </h5>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleCopyTemplate(); }}>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        {language === 'vi' ? 'Copy mẫu' : 'Copy template'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {language === 'vi' ? 'Copy header và ví dụ vào clipboard' : 'Copy headers and example to clipboard'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              <div className="rounded-lg border overflow-hidden">
                <UITable>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[140px]">{language === 'vi' ? 'Tên trường' : 'Field Name'}</TableHead>
                      <TableHead>{language === 'vi' ? 'Mô tả' : 'Description'}</TableHead>
                      <TableHead className="w-[80px]">{language === 'vi' ? 'Kiểu' : 'Type'}</TableHead>
                      <TableHead className="w-[120px]">{language === 'vi' ? 'Ví dụ' : 'Example'}</TableHead>
                      <TableHead className="w-[80px] text-center">{language === 'vi' ? 'Trạng thái' : 'Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {source.requiredFields.map((field) => {
                      const isMissing = source.missingFields.includes(field);
                      const fieldInfo = fields[field];
                      
                      return (
                        <TableRow key={field} className={isMissing ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                          <TableCell className="font-mono text-xs">{field}</TableCell>
                          <TableCell className="text-sm">
                            {fieldInfo ? (language === 'vi' ? fieldInfo.vi : fieldInfo.en) : field}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {fieldInfo?.type || 'text'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {fieldInfo?.example || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {isMissing ? (
                              <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </UITable>
              </div>
            </div>

            {/* Missing Fields Alert */}
            {source.missingFields.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    {language === 'vi' 
                      ? `${source.missingFields.length} trường dữ liệu chưa có giá trị` 
                      : `${source.missingFields.length} fields are missing values`}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                    {source.missingFields.join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Import Button */}
            <div className="flex gap-2">
              <Button 
                onClick={(e) => { e.stopPropagation(); onImport(source.table); }}
                className="flex-1"
                variant={source.status === 'missing' ? 'default' : 'outline'}
              >
                <Upload className="h-4 w-4 mr-2" />
                {language === 'vi' ? 'Import dữ liệu' : 'Import Data'}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      window.open(`/docs/mdp-data-requirements.md#${source.table}`, '_blank'); 
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {language === 'vi' ? 'Xem tài liệu chi tiết' : 'View detailed documentation'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CollapsibleContent>
      </motion.div>
    </Collapsible>
  );
}

export default function DataReadinessPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { sources, summary, isLoading, refetch } = useMDPDataReadiness();
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedTableForImport, setSelectedTableForImport] = useState<string | null>(null);

  // Group sources by category
  const groupedSources = useMemo(() => {
    const groups: Record<string, DataSourceStatus[]> = {
      orders: [],
      marketing: [],
      costs: [],
      cash: [],
    };
    
    sources.forEach(source => {
      groups[source.category].push(source);
    });
    
    return groups;
  }, [sources]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return language === 'vi' ? 'Sẵn sàng hoạt động' : 'Ready to operate';
    if (score >= 50) return language === 'vi' ? 'Có thể hoạt động với estimates' : 'Can operate with estimates';
    return language === 'vi' ? 'Cần bổ sung dữ liệu' : 'Need more data';
  };

  const toggleSource = (sourceId: string) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId);
      } else {
        newSet.add(sourceId);
      }
      return newSet;
    });
  };

  const handleImport = (table: string) => {
    setSelectedTableForImport(table);
    setImportDialogOpen(true);
  };

  const handleImportComplete = () => {
    setImportDialogOpen(false);
    setSelectedTableForImport(null);
    refetch();
    toast.success(language === 'vi' ? 'Import thành công! Đang cập nhật dữ liệu...' : 'Import successful! Refreshing data...');
  };

  const expandAll = () => {
    setExpandedSources(new Set(sources.map(s => s.id)));
  };

  const collapseAll = () => {
    setExpandedSources(new Set());
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'vi' ? 'Kiểm tra dữ liệu MDP' : 'MDP Data Readiness'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'vi' 
                ? 'Đánh giá mức độ sẵn sàng của dữ liệu để vận hành MDP' 
                : 'Evaluate data readiness to operate MDP'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              {language === 'vi' ? 'Import dữ liệu' : 'Import Data'}
            </Button>
            <Button variant="outline" onClick={() => window.open('/docs/mdp-data-requirements.md', '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              {language === 'vi' ? 'Tài liệu' : 'Docs'}
            </Button>
          </div>
        </div>

        {/* Overall Score */}
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Score Circle */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted/20"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${summary.overallScore * 3.52} 352`}
                      strokeLinecap="round"
                      className={getScoreColor(summary.overallScore)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn('text-3xl font-bold', getScoreColor(summary.overallScore))}>
                      {summary.overallScore}%
                    </span>
                    <span className="text-xs text-muted-foreground">Score</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className={cn('text-lg font-semibold', getScoreColor(summary.overallScore))}>
                    {getScoreLabel(summary.overallScore)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {summary.readySources} ready
                    </Badge>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {summary.partialSources} partial
                    </Badge>
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                      <XCircle className="h-3 w-3 mr-1" />
                      {summary.missingSources} missing
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator orientation="vertical" className="hidden lg:block h-24" />
              <Separator className="lg:hidden" />

              {/* Critical Missing */}
              {summary.criticalMissing.length > 0 && (
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="font-semibold text-red-600">
                      {language === 'vi' ? 'Dữ liệu bắt buộc còn thiếu' : 'Critical data missing'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {summary.criticalMissing.map(name => (
                      <Badge key={name} variant="destructive">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        {summary.recommendations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {language === 'vi' ? 'Khuyến nghị' : 'Recommendations'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary.recommendations.map((rec, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    'p-4 rounded-lg border flex items-start gap-3',
                    rec.priority === 'high' ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' :
                    rec.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' :
                    'bg-muted/50 border-muted'
                  )}
                >
                  <div className={cn(
                    'p-1.5 rounded-full shrink-0',
                    rec.priority === 'high' ? 'bg-red-100 dark:bg-red-900/50' :
                    rec.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/50' :
                    'bg-muted'
                  )}>
                    <AlertCircle className={cn(
                      'h-4 w-4',
                      rec.priority === 'high' ? 'text-red-600' :
                      rec.priority === 'medium' ? 'text-amber-600' :
                      'text-muted-foreground'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {language === 'vi' ? rec.message : rec.messageEn}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <ArrowRight className="h-3 w-3 text-primary" />
                      <span className="text-sm text-primary">
                        {language === 'vi' ? rec.action : rec.actionEn}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(
                    'shrink-0',
                    rec.priority === 'high' ? 'text-red-600 border-red-300' :
                    rec.priority === 'medium' ? 'text-amber-600 border-amber-300' :
                    'text-muted-foreground'
                  )}>
                    {rec.priority.toUpperCase()}
                  </Badge>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Expand/Collapse Controls */}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            {language === 'vi' ? 'Mở rộng tất cả' : 'Expand all'}
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            {language === 'vi' ? 'Thu gọn tất cả' : 'Collapse all'}
          </Button>
        </div>

        {/* Data Sources by Category */}
        <div className="space-y-6">
          {Object.entries(groupedSources).map(([category, categorySource]) => {
            const config = categoryConfig[category as keyof typeof categoryConfig];
            const CategoryIcon = config.icon;
            
            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className={cn('p-2 rounded-lg', config.bg)}>
                      <CategoryIcon className={cn('h-5 w-5', config.color)} />
                    </div>
                    {language === 'vi' ? config.labelVi : config.label}
                    <Badge variant="outline" className="ml-auto">
                      {categorySource.filter(s => s.status === 'ready').length}/{categorySource.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {categorySource.map(source => (
                      <SourceCard 
                        key={source.id} 
                        source={source} 
                        language={language}
                        onImport={handleImport}
                        expanded={expandedSources.has(source.id)}
                        onToggle={() => toggleSource(source.id)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/data-hub')}>
            <Database className="h-4 w-4 mr-2" />
            {language === 'vi' ? 'Đi đến Data Hub' : 'Go to Data Hub'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/mdp/data-sources')}>
            {language === 'vi' ? 'Quản lý nguồn dữ liệu' : 'Manage Data Sources'}
          </Button>
        </div>
      </div>

      {/* Import Dialog */}
      <FileImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={handleImportComplete}
      />
    </TooltipProvider>
  );
}
