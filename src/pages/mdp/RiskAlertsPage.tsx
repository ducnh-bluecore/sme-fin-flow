import { useState, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
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

export default function RiskAlertsPage() {
  const { riskAlerts, isLoading, error } = useMDPData();
  
  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('severity');
  
  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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
      <PageHeader 
        title="Marketing Risk Alerts"
        subtitle="CMO Mode: Phát hiện và xử lý rủi ro marketing - Feed trực tiếp Control Tower"
      />

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
                
                return (
                  <motion.div
                    key={`${alert.campaign_name}-${index}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "p-4 rounded-lg border transition-all",
                      alert.severity === 'critical' 
                        ? "bg-red-500/10 border-red-500/30 hover:border-red-500/50" 
                        : "bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50",
                      isSelected && "ring-2 ring-primary"
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
