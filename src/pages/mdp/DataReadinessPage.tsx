import { useMemo } from 'react';
import { motion } from 'framer-motion';
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
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMDPDataReadiness, DataSourceStatus } from '@/hooks/useMDPDataReadiness';
import { cn } from '@/lib/utils';

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

function SourceCard({ source, language }: { source: DataSourceStatus; language: string }) {
  const status = statusConfig[source.status];
  const category = categoryConfig[source.category];
  const importance = importanceConfig[source.importance];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        'p-4 rounded-lg border transition-all',
        status.bg,
        status.border
      )}
    >
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
          
          {source.missingFields.length > 0 && (
            <div className="flex items-start gap-1.5 mt-2">
              <Info className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {language === 'vi' ? 'Thiếu: ' : 'Missing: '}
                {source.missingFields.join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function DataReadinessPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { sources, summary, isLoading } = useMDPDataReadiness();

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
          <Button variant="outline" onClick={() => window.open('/docs/mdp-data-requirements.md', '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {language === 'vi' ? 'Xem tài liệu' : 'View Documentation'}
          </Button>
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
                      <SourceCard key={source.id} source={source} language={language} />
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
    </TooltipProvider>
  );
}
