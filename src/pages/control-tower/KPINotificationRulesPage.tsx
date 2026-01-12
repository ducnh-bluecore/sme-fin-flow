import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Settings, Bell, Plus, Search, Filter, Trash2, Edit2,
  Mail, MessageSquare, Phone, AlertTriangle, AlertCircle, Info,
  Package, TrendingUp, Store, Wallet, Target, Users, Truck,
  ToggleRight, Save, Loader2, ChevronDown, ChevronRight, Zap, 
  Calculator, Clock, Lightbulb, Database, Activity, Check, UserPlus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  useNotificationCenter, 
  AlertCategory, 
  AlertSeverity, 
  AlertConfig,
  NotificationRecipient,
  categoryLabels,
  severityConfig,
  recipientRoleLabels,
} from '@/hooks/useNotificationCenter';
import {
  useIntelligentAlertRules,
  IntelligentAlertRule,
  ruleCategoryLabels,
  severityLabels,
} from '@/hooks/useIntelligentAlertRules';
import { useSeedAlertRules } from '@/hooks/useMultiChannelAlertRules';
import CreateRuleDialog from '@/components/alerts/CreateRuleDialog';
import EditRuleParamsDialog from '@/components/alerts/EditRuleParamsDialog';
import { RuleRecipientsDialog } from '@/components/alerts/RuleRecipientsDialog';
// Icons mapping
const categoryIcons: Record<AlertCategory, typeof Package> = {
  product: Package,
  business: TrendingUp,
  store: Store,
  cashflow: Wallet,
  kpi: Target,
  customer: Users,
  fulfillment: Truck,
  operations: Settings,
};

const severityIcons: Record<AlertSeverity, typeof AlertTriangle> = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
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
function formatThresholdConfig(config: IntelligentAlertRule['threshold_config']): React.ReactNode {
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

// Intelligent Rule Card Component (for pre-built rules)
function IntelligentRuleCard({ 
  rule, 
  onToggle,
  onEdit,
  onConfigureRecipients,
}: { 
  rule: IntelligentAlertRule; 
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (rule: IntelligentAlertRule) => void;
  onConfigureRecipients: (rule: IntelligentAlertRule) => void;
}) {
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
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(rule);
              }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
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
                    {formatThresholdConfig(rule.threshold_config)}
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
              
              {/* Action Buttons */}
              <div className="pt-2 border-t border-border/50 flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(rule);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Chỉnh tham số
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfigureRecipients(rule);
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Cấu hình người nhận
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Seed Rules Button Component
function SeedRulesButton({ compact = false }: { compact?: boolean }) {
  const seedMutation = useSeedAlertRules();
  
  if (compact) {
    return (
      <Button 
        variant="outline" 
        onClick={() => seedMutation.mutate()} 
        disabled={seedMutation.isPending}
      >
        {seedMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Đang tạo...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4 mr-2" />
            + 47 rules đa kênh
          </>
        )}
      </Button>
    );
  }
  
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Tạo 47 rules mẫu cho đa kênh bán lẻ (Shopee, Lazada, TikTok, Website, Cửa hàng, Social)
      </p>
      <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
        {seedMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Đang tạo...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Tạo 47 rules mẫu
          </>
        )}
      </Button>
    </div>
  );
}

export default function KPINotificationRulesPage() {
  const [activeTab, setActiveTab] = useState('intelligent');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('enabled'); // 'all' | 'enabled' | 'disabled'
  const [editingRecipient, setEditingRecipient] = useState<Partial<NotificationRecipient> & { name?: string; role?: string } | null>(null);
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const [createRuleDialogOpen, setCreateRuleDialogOpen] = useState(false);
  const [editRuleDialogOpen, setEditRuleDialogOpen] = useState(false);
  const [ruleRecipientsDialogOpen, setRuleRecipientsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<IntelligentAlertRule | null>(null);
  const [recipientsRule, setRecipientsRule] = useState<IntelligentAlertRule | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['fulfillment', 'inventory', 'revenue', 'service']);
  const [localConfigs, setLocalConfigs] = useState<AlertConfig[]>([]);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Use unified hook for basic configs
  const {
    configs,
    recipients,
    stats,
    isConfigsLoading,
    isRecipientsLoading,
    saveConfig,
    saveRecipient,
    deleteRecipient,
    recipientRoleLabels: roleLabels,
  } = useNotificationCenter();

  // Use intelligent alert rules hook
  const {
    rules: intelligentRules,
    rulesByCategory,
    isLoading: isRulesLoading,
    stats: rulesStats,
    toggleRule,
    updateRule,
    createRule,
    bulkToggleRules,
  } = useIntelligentAlertRules();

  // (newRule state removed - now handled by CreateRuleDialog)

  // Sync local configs with server data
  useEffect(() => {
    if (configs.length > 0 && !hasLocalChanges) {
      setLocalConfigs(configs);
    }
  }, [configs, hasLocalChanges]);

  // Use local configs if available, otherwise server data
  const displayConfigs = localConfigs.length > 0 ? localConfigs : configs;

  // Filter configs
  const filteredConfigs = displayConfigs.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === 'all' || c.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  // Group by category
  const groupedConfigs = filteredConfigs.reduce((acc, config) => {
    const category = config.category as AlertCategory;
    if (!acc[category]) acc[category] = [];
    acc[category].push(config);
    return acc;
  }, {} as Record<AlertCategory, AlertConfig[]>);

  const handleConfigChange = (category: AlertCategory, alertType: string, field: string, value: any) => {
    setLocalConfigs(prev => {
      const existing = prev.length > 0 ? prev : displayConfigs;
      return existing.map(c => 
        c.category === category && c.alert_type === alertType ? { ...c, [field]: value } : c
      );
    });
    setHasLocalChanges(true);
  };

  const handleSaveConfigs = async () => {
    try {
      // Save all changed configs
      const promises = localConfigs.map(config => 
        saveConfig.mutateAsync({
          ...config,
          category: config.category as AlertCategory,
        })
      );
      await Promise.all(promises);
      setHasLocalChanges(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const formatThreshold = (config: AlertConfig) => {
    if (!config.threshold_value) return '-';
    if (config.threshold_unit === 'amount') {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(config.threshold_value);
    }
    if (config.threshold_unit === 'percentage') return `${config.threshold_value}%`;
    if (config.threshold_unit === 'days') return `${config.threshold_value} ngày`;
    if (config.threshold_unit === 'hours') return `${config.threshold_value} giờ`;
    if (config.threshold_unit === 'count') return `${config.threshold_value}`;
    return String(config.threshold_value);
  };

  const handleSaveRecipient = async () => {
    if (!editingRecipient?.name || !editingRecipient?.role) {
      return;
    }
    try {
      await saveRecipient.mutateAsync({
        ...editingRecipient,
        name: editingRecipient.name,
        role: editingRecipient.role,
      });
      setRecipientDialogOpen(false);
      setEditingRecipient(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeleteRecipient = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa người nhận này?')) {
      await deleteRecipient.mutateAsync(id);
    }
  };

  const openNewRecipient = () => {
    setEditingRecipient({ name: '', email: '', phone: '', slack_user_id: '', role: 'general', is_active: true });
    setRecipientDialogOpen(true);
  };

  // Computed stats - combine both sources
  const enabledCount = displayConfigs.filter(c => c.enabled).length;
  const criticalCount = displayConfigs.filter(c => c.enabled && c.severity === 'critical').length;
  const warningCount = displayConfigs.filter(c => c.enabled && c.severity === 'warning').length;

  // Filter intelligent rules
  const filteredIntelligentRules = intelligentRules.filter(r => {
    const matchSearch = r.rule_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       r.rule_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === 'all' || r.rule_category === categoryFilter;
    const matchStatus = statusFilter === 'all' || 
                       (statusFilter === 'enabled' && r.is_enabled) ||
                       (statusFilter === 'disabled' && !r.is_enabled);
    return matchSearch && matchCategory && matchStatus;
  });

  // Group filtered intelligent rules by category
  const groupedIntelligentRules = filteredIntelligentRules.reduce((acc, rule) => {
    const category = rule.rule_category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(rule);
    return acc;
  }, {} as Record<string, IntelligentAlertRule[]>);

  const handleToggleIntelligentRule = (id: string, enabled: boolean) => {
    toggleRule.mutate({ id, is_enabled: enabled });
  };

  return (
    <>
      <Helmet>
        <title>Quản lý Rules KPI & Thông báo | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Quản lý Rules KPI & Thông báo
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Cấu hình tập trung các quy tắc thông minh với công thức tính toán và mô tả chi tiết
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary/30 text-primary">
              {rulesStats.enabled}/{rulesStats.total} intelligent rules
            </Badge>
            {hasLocalChanges && (
              <Badge variant="secondary">Có thay đổi chưa lưu</Badge>
            )}
            {activeTab === 'rules' && (
              <Button onClick={handleSaveConfigs} disabled={saveConfig.isPending || !hasLocalChanges}>
                {saveConfig.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Lưu thay đổi
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rulesStats.total}</p>
                  <p className="text-xs text-muted-foreground">Intelligent Rules</p>
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
                  <p className="text-2xl font-bold">{rulesStats.enabled}</p>
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
                  <p className="text-2xl font-bold">{rulesStats.critical}</p>
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
                  <p className="text-2xl font-bold">{rulesStats.warning}</p>
                  <p className="text-xs text-muted-foreground">Rules cảnh báo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="intelligent" className="gap-2">
              <Zap className="h-4 w-4" />
              Intelligent Rules ({intelligentRules.length})
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Target className="h-4 w-4" />
              Basic Rules ({displayConfigs.length})
            </TabsTrigger>
            <TabsTrigger value="recipients" className="gap-2">
              <Users className="h-4 w-4" />
              Người nhận ({recipients?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Intelligent Rules Tab */}
          <TabsContent value="intelligent" className="mt-4 space-y-4">
            {/* Filters */}
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
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <ToggleRight className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Đang bật</SelectItem>
                      <SelectItem value="disabled">Đã tắt</SelectItem>
                      <SelectItem value="all">Tất cả</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[200px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Lọc theo danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả danh mục</SelectItem>
                      {Object.entries(ruleCategoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeedRulesButton compact />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => bulkToggleRules.mutate({ is_enabled: true })}
                      disabled={bulkToggleRules.isPending || rulesStats.enabled === rulesStats.total}
                    >
                      {bulkToggleRules.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ToggleRight className="h-4 w-4 mr-2" />
                      )}
                      Bật tất cả
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => bulkToggleRules.mutate({ is_enabled: false })}
                      disabled={bulkToggleRules.isPending || rulesStats.enabled === 0}
                    >
                      Tắt tất cả
                    </Button>
                    <Button onClick={() => setCreateRuleDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tạo rule
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Intelligent Rules List */}
            {isRulesLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Đang tải...</p>
                </CardContent>
              </Card>
            ) : filteredIntelligentRules.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Không tìm thấy rule nào</p>
                  {intelligentRules.length === 0 && (
                    <SeedRulesButton />
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedIntelligentRules).map(([category, categoryRules]) => {
                  const Icon = categoryIcons[category as AlertCategory] || Settings;
                  const isExpanded = expandedCategories.includes(category);
                  const enabledInCategory = categoryRules.filter(r => r.is_enabled).length;

                  return (
                    <Card key={category}>
                      <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Icon className="h-5 w-5 text-primary" />
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
                              <IntelligentRuleCard 
                                key={rule.id} 
                                rule={rule} 
                                onToggle={handleToggleIntelligentRule}
                                onEdit={(r) => {
                                  setEditingRule(r);
                                  setEditRuleDialogOpen(true);
                                }}
                                onConfigureRecipients={(r) => {
                                  setRecipientsRule(r);
                                  setRuleRecipientsDialogOpen(true);
                                }}
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
          </TabsContent>

          {/* Basic Rules Tab */}
          <TabsContent value="rules" className="mt-4 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm rule..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Lọc theo danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả danh mục</SelectItem>
                      {(Object.keys(categoryLabels) as AlertCategory[]).map(cat => (
                        <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Rules List */}
            {isConfigsLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Đang tải...</p>
                </CardContent>
              </Card>
            ) : displayConfigs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Chưa có rules nào được cấu hình</p>
                  <p className="text-sm text-muted-foreground">
                    Rules sẽ được tạo tự động khi bạn thiết lập các cảnh báo
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {(Object.keys(groupedConfigs) as AlertCategory[]).map(category => {
                  const Icon = categoryIcons[category];
                  const categoryConfigs = groupedConfigs[category];
                  const isExpanded = expandedCategories.includes(category);
                  const enabledInCategory = categoryConfigs.filter(c => c.enabled).length;

                  return (
                    <Card key={category}>
                      <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <CardTitle className="text-base">{categoryLabels[category]}</CardTitle>
                                  <CardDescription>
                                    {enabledInCategory}/{categoryConfigs.length} rules đang bật
                                  </CardDescription>
                                </div>
                              </div>
                              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              {categoryConfigs.map(config => {
                                const SeverityIcon = severityIcons[config.severity as AlertSeverity];
                                const sevConfig = severityConfig[config.severity as AlertSeverity];
                                
                                return (
                                  <motion.div
                                    key={config.alert_type}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`p-4 rounded-lg border transition-all ${
                                      config.enabled ? 'bg-card border-border' : 'bg-muted/30 border-muted'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex items-start gap-3 flex-1">
                                        <div className={`w-8 h-8 rounded-lg ${sevConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                                          <SeverityIcon className={`w-4 h-4 ${sevConfig.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className={`font-medium ${!config.enabled && 'text-muted-foreground'}`}>
                                              {config.title}
                                            </h4>
                                            <Badge variant="outline" className={`text-xs ${sevConfig.color}`}>
                                              {sevConfig.label}
                                            </Badge>
                                            {config.threshold_value && (
                                              <Badge variant="secondary" className="text-xs">
                                                {formatThreshold(config)}
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                                          
                                          {config.enabled && (
                                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                              <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {roleLabels[config.recipient_role] || config.recipient_role}
                                              </span>
                                              {config.notify_email && (
                                                <span className="flex items-center gap-1">
                                                  <Mail className="w-3 h-3" /> Email
                                                </span>
                                              )}
                                              {config.notify_slack && (
                                                <span className="flex items-center gap-1">
                                                  <MessageSquare className="w-3 h-3" /> Slack
                                                </span>
                                              )}
                                              {config.notify_push && (
                                                <span className="flex items-center gap-1">
                                                  <Bell className="w-3 h-3" /> Push
                                                </span>
                                              )}
                                              {config.notify_sms && (
                                                <span className="flex items-center gap-1">
                                                  <Phone className="w-3 h-3" /> SMS
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <Switch
                                        checked={config.enabled}
                                        onCheckedChange={(v) => handleConfigChange(category, config.alert_type, 'enabled', v)}
                                      />
                                    </div>

                                    {config.enabled && (
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
                                        <div className="space-y-2">
                                          <Label className="text-xs">Mức độ</Label>
                                          <Select 
                                            value={config.severity} 
                                            onValueChange={(v) => handleConfigChange(category, config.alert_type, 'severity', v)}
                                          >
                                            <SelectTrigger className="h-8">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="critical">🔴 Nguy cấp</SelectItem>
                                              <SelectItem value="warning">🟡 Cảnh báo</SelectItem>
                                              <SelectItem value="info">🔵 Thông thường</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-xs">Người nhận</Label>
                                          <Select 
                                            value={config.recipient_role} 
                                            onValueChange={(v) => handleConfigChange(category, config.alert_type, 'recipient_role', v)}
                                          >
                                            <SelectTrigger className="h-8">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {Object.entries(roleLabels).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>{label}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        {config.threshold_value !== null && (
                                          <div className="space-y-2">
                                            <Label className="text-xs">Ngưỡng: {formatThreshold(config)}</Label>
                                            <Slider
                                              value={[config.threshold_value || 0]}
                                              onValueChange={([v]) => handleConfigChange(category, config.alert_type, 'threshold_value', v)}
                                              max={config.threshold_unit === 'amount' ? 500000000 : config.threshold_unit === 'percentage' ? 100 : 90}
                                              min={config.threshold_unit === 'amount' ? 1000000 : 1}
                                              step={config.threshold_unit === 'amount' ? 10000000 : 1}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </motion.div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Recipients Tab */}
          <TabsContent value="recipients" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Danh sách người nhận thông báo</CardTitle>
                    <CardDescription>Quản lý người nhận thông báo theo vai trò</CardDescription>
                  </div>
                  <Button onClick={openNewRecipient}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm người nhận
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isRecipientsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : recipients && recipients.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Điện thoại</TableHead>
                        <TableHead>Vai trò</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients.map((recipient) => (
                        <TableRow key={recipient.id}>
                          <TableCell className="font-medium">{recipient.name}</TableCell>
                          <TableCell>{recipient.email || '-'}</TableCell>
                          <TableCell>{recipient.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {roleLabels[recipient.role] || recipient.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {recipient.is_active ? (
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Hoạt động</Badge>
                            ) : (
                              <Badge variant="secondary">Tạm dừng</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingRecipient({
                                    id: recipient.id,
                                    name: recipient.name,
                                    email: recipient.email,
                                    phone: recipient.phone,
                                    slack_user_id: recipient.slack_user_id,
                                    role: recipient.role,
                                    is_active: recipient.is_active
                                  });
                                  setRecipientDialogOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteRecipient(recipient.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">Chưa có người nhận nào</p>
                    <Button onClick={openNewRecipient}>
                      <Plus className="h-4 w-4 mr-2" />
                      Thêm người nhận đầu tiên
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Recipient Dialog */}
      <Dialog open={recipientDialogOpen} onOpenChange={setRecipientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecipient?.id ? 'Sửa người nhận' : 'Thêm người nhận mới'}</DialogTitle>
            <DialogDescription>Cấu hình thông tin người nhận thông báo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên *</Label>
              <Input
                value={editingRecipient?.name || ''}
                onChange={(e) => setEditingRecipient(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editingRecipient?.email || ''}
                onChange={(e) => setEditingRecipient(prev => prev ? { ...prev, email: e.target.value } : null)}
                placeholder="email@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Số điện thoại</Label>
              <Input
                value={editingRecipient?.phone || ''}
                onChange={(e) => setEditingRecipient(prev => prev ? { ...prev, phone: e.target.value } : null)}
                placeholder="0901234567"
              />
            </div>
            <div className="space-y-2">
              <Label>Slack User ID</Label>
              <Input
                value={editingRecipient?.slack_user_id || ''}
                onChange={(e) => setEditingRecipient(prev => prev ? { ...prev, slack_user_id: e.target.value } : null)}
                placeholder="U1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>Vai trò *</Label>
              <Select 
                value={editingRecipient?.role || 'general'} 
                onValueChange={(v) => setEditingRecipient(prev => prev ? { ...prev, role: v } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Trạng thái hoạt động</Label>
              <Switch
                checked={editingRecipient?.is_active ?? true}
                onCheckedChange={(v) => setEditingRecipient(prev => prev ? { ...prev, is_active: v } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecipientDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveRecipient} disabled={saveRecipient.isPending}>
              {saveRecipient.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Rule Dialog */}
      <CreateRuleDialog 
        open={createRuleDialogOpen} 
        onOpenChange={setCreateRuleDialogOpen} 
      />

      {/* Edit Rule Params Dialog */}
      <EditRuleParamsDialog
        open={editRuleDialogOpen}
        onOpenChange={setEditRuleDialogOpen}
        rule={editingRule}
        onSave={(updates) => {
          updateRule.mutate(updates, {
            onSuccess: () => {
              setEditRuleDialogOpen(false);
              setEditingRule(null);
            }
          });
        }}
        isPending={updateRule.isPending}
      />

      {/* Rule Recipients Dialog */}
      {recipientsRule && (
        <RuleRecipientsDialog
          open={ruleRecipientsDialogOpen}
          onOpenChange={(open) => {
            setRuleRecipientsDialogOpen(open);
            if (!open) setRecipientsRule(null);
          }}
          ruleId={recipientsRule.id}
          ruleName={recipientsRule.rule_name}
        />
      )}
    </>
  );
}
