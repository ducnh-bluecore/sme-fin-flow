import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  TrendingUp,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
  Target,
  GitBranch,
  FlaskConical,
  Radio,
  Megaphone,
  ArrowRight,
  Download,
  Bell,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DecisionCardComponent } from '@/components/decision/DecisionCard';
import { BluecoreScoresPanel } from '@/components/decision/BluecoreScoresPanel';
import { InlineAIChat } from '@/components/decision/InlineAIChat';
import { 
  useDecisionCards, 
  useDecisionCard,
  CardStatus,
  Priority,
  DecisionCard,
} from '@/hooks/useDecisionCards';
import { useAutoDecisionCards } from '@/hooks/useAutoDecisionCards';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Scenario imports
import ScenarioPage from './ScenarioPage';
import { WhatIfSimulationPanel } from '@/components/whatif/WhatIfSimulationPanel';
import { useWhatIfScenarios, type WhatIfScenario } from '@/hooks/useWhatIfScenarios';
import { useCreateScenario } from '@/hooks/useScenarioData';
import { useCentralFinancialMetrics } from '@/hooks/useCentralFinancialMetrics';
import { useAuth } from '@/hooks/useAuth';

// Format currency
function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(0)}K`;
  }
  return value.toFixed(0);
}

export default function CommandCenterPage() {
  const { t } = useLanguage();
  const [mainTab, setMainTab] = useState<'decisions' | 'scenarios'>('decisions');
  const [scenarioSubTab, setScenarioSubTab] = useState<'scenario' | 'whatif'>('scenario');

  // Decision states
  const [statusFilter, setStatusFilter] = useState<CardStatus[]>(['OPEN', 'IN_PROGRESS']);
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Scenario states
  const { user } = useAuth();
  const { data: metrics } = useCentralFinancialMetrics();
  const { data: whatIfScenarios } = useWhatIfScenarios();
  const createScenario = useCreateScenario();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Decision data
  const { data: dbCards, isLoading: dbLoading, refetch } = useDecisionCards({
    status: statusFilter,
    priority: priorityFilter === 'ALL' ? undefined : [priorityFilter],
  });
  const { data: decidedCards } = useDecisionCards({ status: ['DECIDED'] });
  const { data: dismissedCards } = useDecisionCards({ status: ['DISMISSED'] });
  const { data: autoCards } = useAutoDecisionCards();

  // Combine DB cards + Auto cards
  const allCards = useMemo(() => {
    const dbCardIds = new Set((dbCards || []).map(c => c.entity_id));
    const filteredAutoCards = (autoCards || []).filter(
      ac => !dbCardIds.has(ac.entity_id)
    );
    
    const combinedCards = [
      ...(dbCards || []),
      ...filteredAutoCards.map(ac => ({
        ...ac,
        tenant_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as DecisionCard))
    ];

    if (priorityFilter !== 'ALL') {
      return combinedCards.filter(c => c.priority === priorityFilter);
    }
    return combinedCards;
  }, [dbCards, autoCards, priorityFilter]);

  const selectedCardLocal = useMemo(
    () => allCards?.find(c => c.id === selectedCardId) || null,
    [allCards, selectedCardId]
  );

  const { data: selectedCardFromDb } = useDecisionCard(selectedCardId);
  const selectedCard = selectedCardFromDb || selectedCardLocal;

  // Group cards by priority
  const groupedCards = useMemo(() => {
    if (!allCards) return { P1: [], P2: [], P3: [] };
    return {
      P1: allCards.filter(c => c.priority === 'P1'),
      P2: allCards.filter(c => c.priority === 'P2'),
      P3: allCards.filter(c => c.priority === 'P3'),
    };
  }, [allCards]);

  // Limit display (CEO rule: max 3 P1, 7 total visible)
  const visibleCards = useMemo(() => {
    if (showAll) {
      return [...groupedCards.P1, ...groupedCards.P2, ...groupedCards.P3];
    }
    const p1Cards = groupedCards.P1.slice(0, 3);
    const remaining = 7 - p1Cards.length;
    const p2Cards = groupedCards.P2.slice(0, Math.min(remaining, 4));
    const p3Remaining = 7 - p1Cards.length - p2Cards.length;
    const p3Cards = groupedCards.P3.slice(0, p3Remaining);
    return [...p1Cards, ...p2Cards, ...p3Cards];
  }, [groupedCards, showAll]);

  // Stats
  const combinedStats = useMemo(() => {
    const p1Count = groupedCards.P1.length;
    const p2Count = groupedCards.P2.length;
    const p3Count = groupedCards.P3.length;
    const overdueCount = allCards.filter(c => 
      c.status === 'OPEN' && new Date(c.deadline_at) < new Date()
    ).length;
    const totalImpact = allCards
      .filter(c => c.status === 'OPEN')
      .reduce((sum, c) => sum + (c.impact_amount || 0), 0);
    return { p1Count, p2Count, p3Count, overdueCount, totalImpact };
  }, [allCards, groupedCards]);

  // Scenario helpers
  const currentBaseRevenue = useMemo(() => {
    return metrics?.totalRevenue ? metrics.totalRevenue / (metrics.daysInPeriod / 30) : 0;
  }, [metrics]);

  const handleImportWhatIfScenario = async (whatIfScenario: WhatIfScenario) => {
    await createScenario.mutateAsync({
      name: `[What-If] ${whatIfScenario.name}`,
      description: whatIfScenario.description || `Import từ What-If: ${whatIfScenario.name}`,
      base_revenue: currentBaseRevenue,
      base_costs: currentBaseRevenue * 0.7,
      revenue_change: whatIfScenario.params?.revenueChange ?? 0,
      cost_change: whatIfScenario.params?.cogsChange ?? 0,
      calculated_ebitda: whatIfScenario.results?.ebitda ?? null,
      created_by: user?.id || null,
      is_primary: null,
    });
    setIsImportDialogOpen(false);
  };

  const isLoading = dbLoading;

  return (
    <>
      <Helmet>
        <title>Command Center | Bluecore Finance</title>
        <meta name="description" content="Trung tâm điều hành - Quyết định, Kịch bản, Hành động" />
      </Helmet>

      <div className="space-y-6">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6"
        >
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Radio className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
                <p className="text-muted-foreground mt-1">
                  Trung tâm điều hành — Quyết định & Kịch bản tài chính
                </p>
              </div>
            </div>

            {/* Quick Links to other hubs */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link to="/control-tower">
                <Button variant="outline" size="sm" className="gap-2">
                  <Bell className="h-4 w-4" />
                  Control Tower
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
              <Link to="/mdp">
                <Button variant="outline" size="sm" className="gap-2">
                  <Megaphone className="h-4 w-4" />
                  MDP
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Bluecore Scores - Shared across tabs */}
        <BluecoreScoresPanel layout="compact" showTitle />

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'decisions' | 'scenarios')}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="decisions" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Quyết định
                {combinedStats.p1Count > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                    {combinedStats.p1Count}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="scenarios" className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Kịch bản
              </TabsTrigger>
            </TabsList>

            {/* Context actions based on tab */}
            {mainTab === 'decisions' && (
              <Button 
                onClick={async () => {
                  setIsRefreshing(true);
                  await refetch();
                  setIsRefreshing(false);
                }}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                Làm mới
              </Button>
            )}
            {mainTab === 'scenarios' && (whatIfScenarios?.length || 0) > 0 && (
              <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
                <Download className="mr-2 h-4 w-4" />
                Import What-If
                <Badge variant="secondary" className="ml-2">
                  {whatIfScenarios?.length || 0}
                </Badge>
              </Button>
            )}
          </div>

          {/* ===== DECISIONS TAB ===== */}
          <TabsContent value="decisions" className="mt-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-400">{combinedStats.p1Count}</p>
                      <p className="text-xs text-muted-foreground">P1 Khẩn cấp</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <Clock className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-400">{combinedStats.p2Count}</p>
                      <p className="text-xs text-muted-foreground">P2 Quan trọng</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Target className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{combinedStats.p3Count}</p>
                      <p className="text-xs text-muted-foreground">P3 Theo dõi</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={cn(combinedStats.overdueCount > 0 && "border-red-500/50")}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className={cn(
                        "text-2xl font-bold",
                        combinedStats.overdueCount > 0 && "text-red-400"
                      )}>
                        {combinedStats.overdueCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Quá hạn</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className={cn(
                        "text-2xl font-bold",
                        combinedStats.totalImpact > 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {formatCurrency(combinedStats.totalImpact)}đ
                      </p>
                      <p className="text-xs text-muted-foreground">Tổng impact</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Decision Cards Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <CardTitle>Quyết định cần xử lý</CardTitle>
                    <Badge variant="outline">{visibleCards.length} / {allCards?.length || 0}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select 
                      value={priorityFilter} 
                      onValueChange={(v) => setPriorityFilter(v as Priority | 'ALL')}
                    >
                      <SelectTrigger className="w-[140px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tất cả</SelectItem>
                        <SelectItem value="P1">P1 - Khẩn cấp</SelectItem>
                        <SelectItem value="P2">P2 - Quan trọng</SelectItem>
                        <SelectItem value="P3">P3 - Theo dõi</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex border rounded-lg">
                      <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : visibleCards.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Không có quyết định cần xử lý</h3>
                    <p className="text-muted-foreground">
                      Tất cả các vấn đề đã được giải quyết hoặc chưa có cảnh báo mới.
                    </p>
                  </div>
                ) : viewMode === 'list' ? (
                  <div className="space-y-3">
                    {groupedCards.P1.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-400">
                          <AlertTriangle className="h-4 w-4" />
                          Khẩn cấp - Xử lý ngay
                        </div>
                        {(showAll ? groupedCards.P1 : groupedCards.P1.slice(0, 3)).map((card) => (
                          <DecisionCardComponent
                            key={card.id}
                            card={card}
                            compact
                            onViewDetail={() => setSelectedCardId(card.id)}
                          />
                        ))}
                      </div>
                    )}

                    {groupedCards.P2.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-yellow-400">
                          <Clock className="h-4 w-4" />
                          Quan trọng - Trong 24-72h
                        </div>
                        {(showAll ? groupedCards.P2 : groupedCards.P2.slice(0, 4)).map((card) => (
                          <DecisionCardComponent
                            key={card.id}
                            card={card}
                            compact
                            onViewDetail={() => setSelectedCardId(card.id)}
                          />
                        ))}
                      </div>
                    )}

                    {groupedCards.P3.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
                          <Target className="h-4 w-4" />
                          Theo dõi - Trong tuần
                        </div>
                        {(showAll ? groupedCards.P3 : groupedCards.P3.slice(0, 3)).map((card) => (
                          <DecisionCardComponent
                            key={card.id}
                            card={card}
                            compact
                            onViewDetail={() => setSelectedCardId(card.id)}
                          />
                        ))}
                      </div>
                    )}

                    {!showAll && (allCards?.length || 0) > visibleCards.length && (
                      <div className="text-center pt-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowAll(true)}
                        >
                          Xem thêm {(allCards?.length || 0) - visibleCards.length} quyết định
                        </Button>
                      </div>
                    )}
                    {showAll && (allCards?.length || 0) > 7 && (
                      <div className="text-center pt-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowAll(false)}
                        >
                          Thu gọn
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visibleCards.map((card) => (
                      <DecisionCardComponent
                        key={card.id}
                        card={card}
                        onViewDetail={() => setSelectedCardId(card.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* History Tabs */}
            <Tabs defaultValue="history" className="space-y-4">
              <TabsList>
                <TabsTrigger value="history">Lịch sử quyết định</TabsTrigger>
                <TabsTrigger value="dismissed">Đã bỏ qua</TabsTrigger>
                <TabsTrigger value="expired">Đã hết hạn</TabsTrigger>
              </TabsList>

              <TabsContent value="history">
                <Card>
                  <CardContent className="py-4">
                    {decidedCards && decidedCards.length > 0 ? (
                      <div className="space-y-3">
                        {decidedCards.map((card) => (
                          <div 
                            key={card.id} 
                            className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => setSelectedCardId(card.id)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                <div className="space-y-1.5 flex-1">
                                  <p className="font-medium text-sm">{card.title}</p>
                                  <p className="text-sm text-muted-foreground">{card.question}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                      ✓ {card.actions?.find(a => a.is_recommended)?.label || 'Đã quyết định'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {card.entity_label}
                                    </span>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs text-muted-foreground">
                                      Impact: {formatCurrency(Math.abs(card.impact_amount))}đ
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <Badge variant="outline">{card.priority}</Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(card.updated_at).toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
                        <p>Chưa có quyết định nào được xử lý</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dismissed">
                <Card>
                  <CardContent className="py-4">
                    {dismissedCards && dismissedCards.length > 0 ? (
                      <div className="space-y-3">
                        {dismissedCards.map((card) => (
                          <div 
                            key={card.id} 
                            className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => setSelectedCardId(card.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Clock className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{card.title}</p>
                                <p className="text-xs text-muted-foreground">{card.entity_label}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">{card.priority}</Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(card.updated_at).toLocaleDateString('vi-VN')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        <p>Chưa có quyết định nào bị bỏ qua</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="expired">
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                    <p>Các quyết định đã hết hạn chưa xử lý</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ===== SCENARIOS TAB ===== */}
          <TabsContent value="scenarios" className="mt-6 space-y-6">
            {/* Scenario Sub-tabs */}
            <Tabs value={scenarioSubTab} onValueChange={(v) => setScenarioSubTab(v as 'scenario' | 'whatif')}>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="scenario" className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Kịch bản tài chính
                </TabsTrigger>
                <TabsTrigger value="whatif" className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4" />
                  What-If Simulation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scenario" className="mt-6">
                <div className="scenario-page-embedded [&_.scenario-header]:hidden">
                  <ScenarioPage />
                </div>
              </TabsContent>

              <TabsContent value="whatif" className="mt-6">
                <WhatIfSimulationPanel />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Detail Sheet with Inline AI */}
        <Sheet open={!!selectedCardId} onOpenChange={(open) => !open && setSelectedCardId(null)}>
          <SheetContent className="sm:max-w-3xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Chi tiết quyết định</SheetTitle>
            </SheetHeader>

            {!selectedCard ? (
              <div className="mt-6 py-10 text-center text-muted-foreground">
                <p>Không tìm thấy chi tiết quyết định</p>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-6">
                <div>
                  <DecisionCardComponent card={selectedCard} />
                </div>
                <div className="border rounded-lg p-4 flex flex-col min-h-[350px]">
                  <InlineAIChat card={selectedCard} />
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Import What-If Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Import kịch bản What-If</DialogTitle>
              <DialogDescription>
                Chọn kịch bản What-If để tạo thành Kịch bản tài chính
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {(whatIfScenarios || []).map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{s.name}</div>
                    {s.description && (
                      <div className="text-sm text-muted-foreground line-clamp-2">{s.description}</div>
                    )}
                  </div>
                  <Button
                    onClick={() => handleImportWhatIfScenario(s)}
                    disabled={createScenario.isPending}
                  >
                    Import
                  </Button>
                </div>
              ))}

              {(whatIfScenarios || []).length === 0 && (
                <div className="text-sm text-muted-foreground">Chưa có kịch bản What-If nào</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
