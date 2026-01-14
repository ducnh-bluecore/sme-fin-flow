import { useState, useMemo, useCallback, useEffect } from 'react';
import { useMDPData, MarketingRiskAlert } from '@/hooks/useMDPData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Flame, 
  TrendingDown, 
  Zap, 
  Target,
  Search,
  Filter,
  ArrowUpDown,
  ArrowRight,
  Info,
  CheckCheck,
  X,
  Keyboard,
  History,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  Brain,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Shared config for alert types
const RISK_TYPE_CONFIG: Record<MarketingRiskAlert['type'], { 
  label: string; 
  icon: React.ElementType; 
  color: string;
  priority: number;
}> = {
  negative_margin: { label: 'Margin âm', icon: XCircle, color: 'text-red-400', priority: 1 },
  burning_cash: { label: 'Đốt tiền', icon: Flame, color: 'text-orange-400', priority: 2 },
  cac_exceeds_ltv: { label: 'CAC > LTV', icon: TrendingDown, color: 'text-yellow-400', priority: 3 },
  cash_runway_impact: { label: 'Ảnh hưởng cash', icon: Zap, color: 'text-blue-400', priority: 4 },
  fake_growth: { label: 'Tăng trưởng giả', icon: Target, color: 'text-purple-400', priority: 5 },
};

// Utility function
const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
};

type SortOption = 'impact_desc' | 'impact_asc' | 'severity' | 'type';

// Mock history data - in production, this would come from the database
const mockHistoryData = [
  { date: '2024-01-14', count: 3, resolved: 2, impact: 15000000 },
  { date: '2024-01-13', count: 5, resolved: 4, impact: 28000000 },
  { date: '2024-01-12', count: 2, resolved: 2, impact: 8000000 },
  { date: '2024-01-11', count: 4, resolved: 3, impact: 22000000 },
  { date: '2024-01-10', count: 6, resolved: 5, impact: 35000000 },
  { date: '2024-01-09', count: 3, resolved: 3, impact: 12000000 },
  { date: '2024-01-08', count: 4, resolved: 4, impact: 18000000 },
];

// AI Insights based on patterns
const generateAIInsights = (alerts: MarketingRiskAlert[]) => {
  const insights: { type: 'warning' | 'info' | 'success'; title: string; description: string }[] = [];
  
  const typeCount = alerts.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const channelCount = alerts.reduce((acc, a) => {
    acc[a.channel] = (acc[a.channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Pattern: Multiple negative margin alerts
  if ((typeCount['negative_margin'] || 0) >= 2) {
    insights.push({
      type: 'warning',
      title: 'Pattern: Margin âm lặp lại',
      description: `${typeCount['negative_margin']} campaigns có margin âm. Nên review chiến lược pricing hoặc giảm chi phí marketing.`
    });
  }

  // Pattern: Channel concentration
  const maxChannel = Object.entries(channelCount).sort((a, b) => b[1] - a[1])[0];
  if (maxChannel && maxChannel[1] >= 3) {
    insights.push({
      type: 'info',
      title: `Tập trung rủi ro: ${maxChannel[0]}`,
      description: `${maxChannel[1]}/${alerts.length} alerts đến từ ${maxChannel[0]}. Xem xét đa dạng hóa kênh hoặc tối ưu ${maxChannel[0]}.`
    });
  }

  // Pattern: High CAC
  if ((typeCount['cac_exceeds_ltv'] || 0) >= 2) {
    insights.push({
      type: 'warning',
      title: 'CAC vượt LTV nhiều campaign',
      description: 'Cần review targeting audience và tối ưu funnel để giảm chi phí acquire khách hàng.'
    });
  }

  // Success pattern
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  if (alerts.length > 0 && criticalCount === 0) {
    insights.push({
      type: 'success',
      title: 'Không có critical alerts',
      description: 'Tất cả rủi ro ở mức warning. Tình hình đang được kiểm soát tốt.'
    });
  }

  // No alerts
  if (alerts.length === 0) {
    insights.push({
      type: 'success',
      title: 'Marketing health tốt',
      description: 'Không phát hiện rủi ro. Các campaigns đang hoạt động hiệu quả.'
    });
  }

  return insights;
};

export default function RiskAlertsPage() {
  const { riskAlerts, isLoading, error } = useMDPData();
  
  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('severity');
  
  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // UI state
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'history' | 'insights'>('alerts');

  // Filtered and sorted alerts
  const processedAlerts = useMemo(() => {
    let result = [...riskAlerts];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(alert => 
        alert.campaign_name.toLowerCase().includes(query) ||
        alert.channel.toLowerCase().includes(query) ||
        alert.message.toLowerCase().includes(query)
      );
    }

    // Severity filter
    if (severityFilter !== 'all') {
      result = result.filter(alert => alert.severity === severityFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(alert => alert.type === typeFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'impact_desc':
          return b.impact_amount - a.impact_amount;
        case 'impact_asc':
          return a.impact_amount - b.impact_amount;
        case 'severity':
          return (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1);
        case 'type':
          return RISK_TYPE_CONFIG[a.type].priority - RISK_TYPE_CONFIG[b.type].priority;
        default:
          return 0;
      }
    });

    return result;
  }, [riskAlerts, searchQuery, severityFilter, typeFilter, sortBy]);

  // Stats
  const stats = useMemo(() => ({
    total: riskAlerts.length,
    critical: riskAlerts.filter(a => a.severity === 'critical').length,
    warning: riskAlerts.filter(a => a.severity === 'warning').length,
    totalImpact: riskAlerts.reduce((sum, a) => sum + a.impact_amount, 0),
    byType: Object.keys(RISK_TYPE_CONFIG).reduce((acc, type) => {
      acc[type] = riskAlerts.filter(a => a.type === type).length;
      return acc;
    }, {} as Record<string, number>),
  }), [riskAlerts]);

  // AI Insights
  const aiInsights = useMemo(() => generateAIInsights(riskAlerts), [riskAlerts]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'j':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, processedAlerts.length - 1));
          break;
        case 'k':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'x':
          e.preventDefault();
          if (focusedIndex >= 0) {
            handleToggleSelect(focusedIndex);
          }
          break;
        case 's':
          if (focusedIndex >= 0 && selectedIds.size === 0) {
            e.preventDefault();
            const alert = processedAlerts[focusedIndex];
            toast.success(`Đã dừng campaign: ${alert.campaign_name}`);
          }
          break;
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSelectAll();
          }
          break;
        case 'escape':
          setSelectedIds(new Set());
          setFocusedIndex(-1);
          break;
        case '?':
          e.preventDefault();
          setShowKeyboardHelp(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, processedAlerts, selectedIds.size]);

  // Handlers
  const handleToggleSelect = useCallback((index: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === processedAlerts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedAlerts.map((_, i) => i)));
    }
  }, [selectedIds.size, processedAlerts.length]);

  const handleBulkAction = useCallback((action: 'stop' | 'reduce' | 'dismiss') => {
    const count = selectedIds.size;
    const actionLabels = { stop: 'Dừng', reduce: 'Giảm budget', dismiss: 'Bỏ qua' };
    toast.success(`Đã ${actionLabels[action].toLowerCase()} ${count} campaigns`);
    setSelectedIds(new Set());
  }, [selectedIds.size]);

  const handleSingleAction = useCallback((alert: MarketingRiskAlert) => {
    toast.success(`Đã ghi nhận quyết định cho ${alert.campaign_name}`);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSeverityFilter('all');
    setTypeFilter('all');
    setSortBy('severity');
  }, []);

  const hasActiveFilters = searchQuery || severityFilter !== 'all' || typeFilter !== 'all';

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
          <AlertDescription>
            Không thể tải dữ liệu risk alerts. Vui lòng thử lại sau.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-14" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Marketing Risk Alerts"
          subtitle="CMO Mode: Phát hiện và xử lý rủi ro marketing - Feed trực tiếp Control Tower"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowKeyboardHelp(prev => !prev)}
          className="gap-2"
        >
          <Keyboard className="h-4 w-4" />
          <span className="hidden md:inline">Phím tắt</span>
        </Button>
      </div>

      {/* Keyboard Shortcuts Help */}
      <AnimatePresence>
        {showKeyboardHelp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Keyboard className="h-5 w-5 text-primary" />
                    <span className="font-medium">Keyboard Shortcuts</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowKeyboardHelp(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">J</kbd>
                    <span className="text-muted-foreground">Di chuyển xuống</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">K</kbd>
                    <span className="text-muted-foreground">Di chuyển lên</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">X</kbd>
                    <span className="text-muted-foreground">Chọn/Bỏ chọn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">S</kbd>
                    <span className="text-muted-foreground">Dừng campaign</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">⌘+A</kbd>
                    <span className="text-muted-foreground">Chọn tất cả</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Esc</kbd>
                    <span className="text-muted-foreground">Bỏ chọn tất cả</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">?</kbd>
                    <span className="text-muted-foreground">Hiện/Ẩn help</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cn(
          "border transition-colors",
          stats.total === 0 
            ? "border-green-500/30 bg-green-500/5" 
            : stats.critical > 0 
            ? "border-red-500/30 bg-red-500/5"
            : "border-yellow-500/30 bg-yellow-500/5"
        )}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Trạng thái</p>
            <p className={cn(
              "text-lg font-bold",
              stats.total === 0 ? "text-green-400" : 
              stats.critical > 0 ? "text-red-400" : "text-yellow-400"
            )}>
              {stats.total === 0 ? 'An toàn' : 
               stats.critical > 0 ? 'Nguy hiểm' : 'Cần chú ý'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Tổng thiệt hại tiềm năng</p>
            <p className="text-lg font-bold text-red-400">
              -{formatCurrency(stats.totalImpact)}đ
            </p>
          </CardContent>
        </Card>

        <Card className={stats.critical > 0 ? "border-red-500/30" : ""}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Critical</p>
            <p className="text-lg font-bold text-red-400">{stats.critical}</p>
          </CardContent>
        </Card>

        <Card className={stats.warning > 0 ? "border-yellow-500/30" : ""}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Warning</p>
            <p className="text-lg font-bold text-yellow-400">{stats.warning}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Alerts / History / AI Insights */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alerts
            {stats.total > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {stats.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Insights
            {aiInsights.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {aiInsights.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4 mt-4">
          {/* Risk Type Breakdown - Compact */}
          {stats.total > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(RISK_TYPE_CONFIG).map(([type, config]) => {
                const count = stats.byType[type] || 0;
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all",
                      typeFilter === type 
                        ? "bg-primary/20 border-primary" 
                        : count > 0 
                        ? "bg-muted/30 hover:bg-muted/50" 
                        : "bg-muted/10 opacity-50 cursor-not-allowed"
                    )}
                    disabled={count === 0}
                  >
                    <Icon className={cn("h-4 w-4", count > 0 ? config.color : "text-muted-foreground")} />
                    <span>{config.label}</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}

          {/* Toolbar: Search, Filter, Sort, Bulk Actions */}
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm campaign, channel..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Severity Filter */}
                <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[160px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sắp xếp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="severity">Severity cao trước</SelectItem>
                    <SelectItem value="impact_desc">Thiệt hại cao trước</SelectItem>
                    <SelectItem value="impact_asc">Thiệt hại thấp trước</SelectItem>
                    <SelectItem value="type">Theo loại</SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Bulk Actions */}
              {selectedIds.size > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t flex items-center gap-3"
                >
                  <span className="text-sm text-muted-foreground">
                    Đã chọn {selectedIds.size} alert
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleBulkAction('stop')}
                    >
                      Dừng tất cả
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('reduce')}
                    >
                      Giảm budget
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleBulkAction('dismiss')}
                    >
                      Bỏ qua
                    </Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Alert List */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-purple-400" />
                  <CardTitle className="text-lg">Risk Alerts</CardTitle>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium mb-1">Feed to Control Tower</p>
                      <p className="text-xs text-muted-foreground">
                        Alerts này đi thẳng vào Control Tower. CFO & CEO nhìn thấy. CMO chịu trách nhiệm.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                <div className="flex items-center gap-2">
                  {processedAlerts.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-8 text-xs"
                    >
                      <CheckCheck className="h-4 w-4 mr-1" />
                      {selectedIds.size === processedAlerts.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                    </Button>
                  )}
                  <Badge variant="outline">
                    {processedAlerts.length}/{stats.total} risks
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <AnimatePresence mode="popLayout">
                {processedAlerts.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    {stats.total === 0 ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                          <CheckCircle2 className="h-6 w-6 text-green-400" />
                        </div>
                        <p className="text-sm font-medium text-green-400">Không có rủi ro marketing</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tất cả campaigns đang có margin & cash flow tốt
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                          <Search className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">Không tìm thấy</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                        </p>
                        <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                          Xóa bộ lọc
                        </Button>
                      </>
                    )}
                  </motion.div>
                ) : (
                  processedAlerts.map((alert, index) => {
                    const config = RISK_TYPE_CONFIG[alert.type];
                    const Icon = config.icon;
                    const isSelected = selectedIds.has(index);
                    const isFocused = focusedIndex === index;
                    
                    return (
                      <motion.div
                        key={`${alert.campaign_name}-${index}`}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setFocusedIndex(index)}
                        className={cn(
                          "p-4 rounded-lg border transition-all cursor-pointer",
                          alert.severity === 'critical' 
                            ? "bg-red-500/10 border-red-500/30 hover:border-red-500/50" 
                            : "bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50",
                          isSelected && "ring-2 ring-primary",
                          isFocused && "ring-2 ring-blue-400"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelect(index)}
                            className="mt-1"
                          />

                          {/* Icon */}
                          <div className={cn("mt-0.5", config.color)}>
                            <Icon className="h-5 w-5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge className={cn(
                                "text-xs",
                                alert.severity === 'critical' 
                                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              )}>
                                {config.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {alert.channel}
                              </Badge>
                              {alert.severity === 'critical' && (
                                <Badge className="bg-red-500 text-white text-xs animate-pulse">
                                  CRITICAL
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm font-medium">{alert.campaign_name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                            
                            {/* Recommended Action */}
                            <div className="mt-2 p-2 rounded bg-primary/10 border border-primary/20">
                              <p className="text-xs text-primary font-medium flex items-center gap-1">
                                <ArrowRight className="h-3 w-3" />
                                {alert.recommended_action}
                              </p>
                            </div>
                          </div>

                          {/* Impact & Action */}
                          <div className="text-right shrink-0">
                            <p className={cn(
                              "text-lg font-bold",
                              alert.severity === 'critical' ? "text-red-400" : "text-yellow-400"
                            )}>
                              -{formatCurrency(alert.impact_amount)}đ
                            </p>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant={alert.severity === 'critical' ? 'destructive' : 'outline'}
                                  className="h-8 px-3 mt-2 text-xs gap-1"
                                >
                                  Quyết định <ArrowRight className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleSingleAction(alert)}>
                                  <XCircle className="h-4 w-4 mr-2 text-red-400" />
                                  Dừng campaign
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSingleAction(alert)}>
                                  <TrendingDown className="h-4 w-4 mr-2 text-yellow-400" />
                                  Giảm budget 50%
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSingleAction(alert)}>
                                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                                  Chấp nhận rủi ro
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-lg">Alert Timeline</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                Lịch sử alerts 7 ngày gần nhất
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockHistoryData.map((day, idx) => (
                <div 
                  key={day.date}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-24">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Alerts</p>
                      <p className="text-lg font-bold">{day.count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Đã xử lý</p>
                      <p className={cn(
                        "text-lg font-bold",
                        day.resolved === day.count ? "text-green-400" : "text-yellow-400"
                      )}>
                        {day.resolved}/{day.count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Thiệt hại</p>
                      <p className="text-lg font-bold text-red-400">
                        -{formatCurrency(day.impact)}đ
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-400 rounded-full transition-all"
                      style={{ width: `${(day.resolved / day.count) * 100}%` }}
                    />
                  </div>
                </div>
              ))}

              {/* Trend summary */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="font-medium text-sm">Xu hướng</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Trung bình {Math.round(mockHistoryData.reduce((s, d) => s + d.count, 0) / mockHistoryData.length)} alerts/ngày. 
                  Tỷ lệ xử lý: {Math.round(mockHistoryData.reduce((s, d) => s + d.resolved, 0) / mockHistoryData.reduce((s, d) => s + d.count, 0) * 100)}%.
                  Tổng thiệt hại 7 ngày: -{formatCurrency(mockHistoryData.reduce((s, d) => s + d.impact, 0))}đ.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                <CardTitle className="text-lg">AI Pattern Analysis</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                Phân tích tự động dựa trên patterns từ dữ liệu risk alerts
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiInsights.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Chưa có đủ dữ liệu để phân tích patterns
                  </p>
                </div>
              ) : (
                aiInsights.map((insight, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn(
                      "p-4 rounded-lg border",
                      insight.type === 'warning' && "bg-yellow-500/10 border-yellow-500/30",
                      insight.type === 'info' && "bg-blue-500/10 border-blue-500/30",
                      insight.type === 'success' && "bg-green-500/10 border-green-500/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5",
                        insight.type === 'warning' && "text-yellow-400",
                        insight.type === 'info' && "text-blue-400",
                        insight.type === 'success' && "text-green-400"
                      )}>
                        <Lightbulb className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{insight.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}

              {/* AI Recommendations */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  <span className="font-medium text-sm">AI Recommendations</span>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {stats.critical > 0 && (
                    <p>• <span className="text-red-400 font-medium">Ưu tiên xử lý {stats.critical} critical alerts</span> trong 24h tới</p>
                  )}
                  {stats.byType['negative_margin'] > 0 && (
                    <p>• Review pricing strategy cho các campaigns có margin âm</p>
                  )}
                  {stats.byType['burning_cash'] > 0 && (
                    <p>• Thiết lập spending caps cho campaigns đang đốt tiền</p>
                  )}
                  {stats.total > 5 && (
                    <p>• Số lượng alerts cao - xem xét tạm pause một số campaigns để giảm risk exposure</p>
                  )}
                  {stats.total === 0 && (
                    <p>• Tình hình tốt! Có thể xem xét scale các campaigns hiệu quả nhất</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Control Tower Integration Notice */}
      {stats.total > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Auto-feed to Control Tower</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total} marketing risks đã được gửi. CEO/CFO có thể xem trong Control Tower.
                  CMO chịu trách nhiệm xử lý trong deadline quy định.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
