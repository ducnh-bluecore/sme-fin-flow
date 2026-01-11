import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Bell, Search, Filter, AlertTriangle, AlertCircle, Info,
  Package, TrendingUp, Store, Wallet, Target, Users, Truck,
  ToggleRight, ChevronDown, ChevronRight, Zap, Calculator, Clock,
  FileText, Lightbulb, Database, Activity, Check, X, Plus,
  ShoppingBag, Globe, MessageSquare, Smartphone
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useIntelligentAlertRules, 
  IntelligentAlertRule,
  ruleCategoryLabels,
  severityLabels,
  salesChannelLabels,
  alertGroupLabels,
  type SalesChannel,
  type AlertGroup,
} from '@/hooks/useIntelligentAlertRules';
import { useSeedAlertRules, useAlertRuleStats } from '@/hooks/useMultiChannelAlertRules';
import { Loader2 } from 'lucide-react';

// Icons mapping
const categoryIcons: Record<string, typeof Package> = {
  product: Package,
  business: TrendingUp,
  store: Store,
  cashflow: Wallet,
  kpi: Target,
  customer: Users,
  fulfillment: Truck,
  operations: Settings,
  inventory: Package,
  revenue: Wallet,
  service: Users,
};

// Channel icons
const channelIcons: Record<SalesChannel, typeof ShoppingBag> = {
  shopee: ShoppingBag,
  lazada: ShoppingBag,
  tiktok: Smartphone,
  website: Globe,
  social: MessageSquare,
  pos: Store,
};

// Category colors
const categoryColors: Record<string, string> = {
  product: 'bg-green-500/10 text-green-600',
  business: 'bg-blue-500/10 text-blue-600',
  store: 'bg-purple-500/10 text-purple-600',
  cashflow: 'bg-emerald-500/10 text-emerald-600',
  kpi: 'bg-orange-500/10 text-orange-600',
  customer: 'bg-pink-500/10 text-pink-600',
  fulfillment: 'bg-cyan-500/10 text-cyan-600',
  operations: 'bg-slate-500/10 text-slate-600',
  inventory: 'bg-amber-500/10 text-amber-600',
  revenue: 'bg-emerald-500/10 text-emerald-600',
  service: 'bg-indigo-500/10 text-indigo-600',
};

// Format calculation formula for display
function formatFormula(formula: IntelligentAlertRule['calculation_formula']): string {
  if (typeof formula === 'string') {
    return formula;
  }
  if (formula && typeof formula === 'object') {
    return formula.formula || JSON.stringify(formula, null, 2);
  }
  return '-';
}

// Format threshold config for display
function formatThreshold(config: IntelligentAlertRule['threshold_config']): React.ReactNode {
  if (!config || Object.keys(config).length === 0) return null;
  
  const entries = Object.entries(config);
  return (
    <div className="space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
          <span className="font-medium">
            {typeof value === 'number' ? value.toLocaleString('vi-VN') : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Single Rule Card Component
function RuleCard({ rule, onToggle }: { rule: IntelligentAlertRule; onToggle: (id: string, enabled: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const sevConfig = severityLabels[rule.severity] || severityLabels.info;
  
  const formulaObj = typeof rule.calculation_formula === 'object' ? rule.calculation_formula : null;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg overflow-hidden transition-all ${
        rule.is_enabled ? 'bg-card border-border' : 'bg-muted/30 border-muted'
      }`}
    >
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-10 h-10 rounded-lg ${sevConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
              <Zap className={`w-5 h-5 ${sevConfig.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`font-medium ${!rule.is_enabled && 'text-muted-foreground'}`}>
                  {rule.rule_name}
                </h4>
                <Badge variant="outline" className={`text-xs ${sevConfig.color}`}>
                  {sevConfig.label}
                </Badge>
                <Badge variant="secondary" className="text-xs font-mono">
                  {rule.rule_code}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {rule.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Switch
              checked={rule.is_enabled}
              onCheckedChange={(checked) => {
                onToggle(rule.id, checked);
              }}
              onClick={(e) => e.stopPropagation()}
            />
            {expanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
      
      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Separator />
            <div className="p-4 space-y-4 bg-muted/20">
              {/* Formula Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calculator className="h-4 w-4 text-primary" />
                  Công thức tính toán
                </div>
                <div className="bg-card p-3 rounded-lg border">
                  <code className="text-xs font-mono text-primary whitespace-pre-wrap">
                    {formatFormula(rule.calculation_formula)}
                  </code>
                  {formulaObj && formulaObj.type && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Loại:</span> {formulaObj.type}
                      {formulaObj.period_type && (
                        <span className="ml-3"><span className="font-medium">Chu kỳ:</span> {formulaObj.period_type}</span>
                      )}
                    </div>
                  )}
                  {formulaObj?.data_sources && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {formulaObj.data_sources.map((source: string) => (
                        <Badge key={source} variant="outline" className="text-xs">
                          <Database className="h-3 w-3 mr-1" />
                          {source}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Thresholds */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Target className="h-4 w-4 text-primary" />
                    Ngưỡng cảnh báo
                  </div>
                  <div className="bg-card p-3 rounded-lg border">
                    {formatThreshold(rule.threshold_config)}
                  </div>
                </div>

                {/* Suggested Actions */}
                {rule.suggested_actions && rule.suggested_actions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Hành động đề xuất
                    </div>
                    <div className="bg-card p-3 rounded-lg border">
                      <ul className="space-y-1">
                        {rule.suggested_actions.map((action, idx) => (
                          <li key={idx} className="text-xs flex items-start gap-2">
                            <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Cooldown: {rule.cooldown_hours}h
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Priority: {rule.priority}
                </div>
                {rule.object_type && (
                  <div className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    Object: {rule.object_type}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function IntelligentRulesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'category' | 'channel' | 'group'>('category');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['fulfillment', 'inventory', 'revenue']);

  const { rules, rulesByCategory, rulesByGroup, filterByChannel, isLoading, stats, toggleRule, refetch } = useIntelligentAlertRules();
  const seedRules = useSeedAlertRules();
  const { getStatsByChannel, getStatsByGroup } = useAlertRuleStats();

  // Filter rules
  const filteredRules = rules.filter(r => {
    const matchSearch = r.rule_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       r.rule_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === 'all' || r.rule_category === categoryFilter;
    const matchChannel = channelFilter === 'all' || 
                        r.applicable_channels?.includes(channelFilter as SalesChannel) ||
                        (r.applicable_channels?.length === 0);
    return matchSearch && matchCategory && matchChannel;
  });

  // Group filtered rules by category
  const groupedRules = filteredRules.reduce((acc, rule) => {
    const category = rule.rule_category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(rule);
    return acc;
  }, {} as Record<string, IntelligentAlertRule[]>);

  // Group by alert_group
  const groupedByAlertGroup = filteredRules.reduce((acc, rule) => {
    const group = rule.alert_group || 'general';
    if (!acc[group]) acc[group] = [];
    acc[group].push(rule);
    return acc;
  }, {} as Record<string, IntelligentAlertRule[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleToggleRule = (id: string, enabled: boolean) => {
    toggleRule.mutate({ id, is_enabled: enabled });
  };

  const handleSeedRules = () => {
    seedRules.mutate();
  };

  return (
    <>
      <Helmet>
        <title>Intelligent Alert Rules | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Intelligent Alert Rules
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Các quy tắc cảnh báo thông minh với công thức tính toán động và mô tả chi tiết
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary/30 text-primary">
              {stats.enabled}/{stats.total} rules đang bật
            </Badge>
            {rules.length === 0 && (
              <Button onClick={handleSeedRules} disabled={seedRules.isPending}>
                {seedRules.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Tạo 47 rules mẫu
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Tổng số rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <ToggleRight className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.enabled}</p>
                  <p className="text-xs text-muted-foreground">Đang hoạt động</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                  <p className="text-xs text-muted-foreground">Rules nguy cấp</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.warning}</p>
                  <p className="text-xs text-muted-foreground">Rules cảnh báo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm rule theo tên, mô tả hoặc code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="w-[180px]">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Kênh bán" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả kênh</SelectItem>
                  {Object.entries(salesChannelLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả danh mục</SelectItem>
                  {Object.entries(ruleCategoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Rules List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Đang tải...</p>
            </CardContent>
          </Card>
        ) : filteredRules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Không tìm thấy rule nào</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedRules).map(([category, categoryRules]) => {
              const Icon = categoryIcons[category] || Settings;
              const isExpanded = expandedCategories.includes(category);
              const enabledInCategory = categoryRules.filter(r => r.is_enabled).length;

              return (
                <Card key={category}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${categoryColors[category] || 'bg-primary/10 text-primary'} flex items-center justify-center`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {ruleCategoryLabels[category] || category}
                              </CardTitle>
                              <CardDescription>
                                {enabledInCategory}/{categoryRules.length} rules đang bật
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{categoryRules.length} rules</Badge>
                            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-3">
                        {categoryRules.map(rule => (
                          <RuleCard 
                            key={rule.id} 
                            rule={rule} 
                            onToggle={handleToggleRule}
                          />
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
