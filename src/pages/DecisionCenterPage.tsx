import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared';
import { 
  Target, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  TrendingUp,
  Filter,
  LayoutGrid,
  List,
  Zap,
  RefreshCw,
  Eye,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DecisionCardComponent } from '@/components/decision/DecisionCard';
import { BluecoreScoresPanel } from '@/components/decision/BluecoreScoresPanel';
import { InlineAIChat } from '@/components/decision/InlineAIChat';
import { ThresholdConfigDialog } from '@/components/decision/ThresholdConfigDialog';
import { DecisionFollowupPanel } from '@/components/decision/DecisionFollowupPanel';
import { OutcomeHistoryPanel } from '@/components/decision/OutcomeHistoryPanel';
import { 
  useDecisionCards, 
  useDecisionCard,
  useDecisionCardStats,
  CardStatus,
  Priority,
  DecisionCard,
} from '@/hooks/useDecisionCards';
import { useAutoDecisionCards } from '@/hooks/useAutoDecisionCards';
import { useAutoDecisionCardStates } from '@/hooks/useAutoDecisionCardStates';
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

export default function DecisionCenterPage() {
  const [statusFilter, setStatusFilter] = useState<CardStatus[]>(['OPEN', 'IN_PROGRESS']);
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showThresholdConfig, setShowThresholdConfig] = useState(false);
  
  // Persisted states for auto-generated cards (survive refresh)
  const { data: autoCardStates } = useAutoDecisionCardStates();

  // Local fallback for instant UI feedback (also survives only until refresh)
  const [localDecidedCardsData, setLocalDecidedCardsData] = useState<DecisionCard[]>([]);
  const [localDismissedCardsData, setLocalDismissedCardsData] = useState<DecisionCard[]>([]);

  // IDs for filtering
  const localDecidedCardIds = useMemo(() => new Set(localDecidedCardsData.map(c => c.id)), [localDecidedCardsData]);
  const localDismissedCardIds = useMemo(() => new Set(localDismissedCardsData.map(c => c.id)), [localDismissedCardsData]);

  const persistedDecidedIds = useMemo(
    () => new Set((autoCardStates || []).filter(s => s.status === 'DECIDED').map(s => s.auto_card_id)),
    [autoCardStates]
  );
  const persistedDismissedIds = useMemo(
    () => new Set((autoCardStates || []).filter(s => s.status === 'DISMISSED').map(s => s.auto_card_id)),
    [autoCardStates]
  );
  const persistedSnoozedIds = useMemo(
    () => new Set((autoCardStates || []).filter(s => s.status === 'SNOOZED' && s.snoozed_until && new Date(s.snoozed_until) > new Date()).map(s => s.auto_card_id)),
    [autoCardStates]
  );

  // Fetch from DB - Open cards
  const { data: dbCards, isLoading: dbLoading, refetch } = useDecisionCards({
    status: statusFilter,
    priority: priorityFilter === 'ALL' ? undefined : [priorityFilter],
  });
  const { data: stats } = useDecisionCardStats();

  // Fetch decided cards for history
  const { data: decidedCards } = useDecisionCards({
    status: ['DECIDED'],
  });

  // Fetch dismissed cards
  const { data: dismissedCards } = useDecisionCards({
    status: ['DISMISSED'],
  });

  // Fetch auto-generated cards from FDP analysis (realtime SSOT)
  const { data: autoCards, autoCardsLookup } = useAutoDecisionCards();

  /**
   * SSOT STRATEGY: Tách biệt vai trò
   * 
   * 1. Auto Cards = Phát hiện mới (OPEN) - source of truth cho metrics
   * 2. DB Cards OPEN/IN_PROGRESS = Đã acknowledge, facts từ Auto Cards nếu có
   * 3. DB Cards DECIDED/DISMISSED = Lịch sử, giữ facts gốc
   * 
   * Rule: Không bao giờ có 2 cards cho cùng entity với số liệu khác nhau
   */
  const allCards = useMemo(() => {
    const dbOpenCards = (dbCards || []).filter(c => 
      c.status === 'OPEN' || c.status === 'IN_PROGRESS'
    );
    
    // Set of entity_ids that already have DB cards
    const dbEntityIds = new Set(dbOpenCards.map(c => c.entity_id));
    
    // Enrich DB cards with realtime facts from Auto Cards (SSOT)
    const enrichedDbCards = dbOpenCards.map(dbCard => {
      const autoCard = autoCardsLookup?.get(dbCard.entity_id || '');
      if (autoCard && autoCard.facts) {
        // Use realtime facts from Auto Card, keep DB card metadata
        return {
          ...dbCard,
          facts: autoCard.facts, // SSOT: Facts luôn từ realtime
          impact_amount: autoCard.impact_amount, // SSOT: Impact từ realtime
          impact_description: autoCard.impact_description,
        };
      }
      return dbCard;
    });
    
    // Auto Cards chỉ hiện khi KHÔNG có DB Card cho entity đó
    // AND không bị decided/dismissed locally
    const filteredAutoCards = (autoCards || []).filter(
      ac => !dbEntityIds.has(ac.entity_id) && 
            !localDecidedCardIds.has(ac.id) && 
            !localDismissedCardIds.has(ac.id) &&
            !persistedDecidedIds.has(ac.id) &&
            !persistedDismissedIds.has(ac.id) &&
            !persistedSnoozedIds.has(ac.id)
    );
    
    // Cast auto cards to DecisionCard type for compatibility
    const combinedCards = [
      ...enrichedDbCards,
      ...filteredAutoCards.map(ac => ({
        ...ac,
        tenant_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as DecisionCard))
    ];

    // Apply priority filter
    if (priorityFilter !== 'ALL') {
      return combinedCards.filter(c => c.priority === priorityFilter);
    }
    return combinedCards;
  }, [dbCards, autoCards, autoCardsLookup, priorityFilter, localDecidedCardIds, localDismissedCardIds, persistedDecidedIds, persistedDismissedIds, persistedSnoozedIds]);

  // Handlers for local card decisions - find the card data and store it
  const handleCardDecided = (cardId: string) => {
    // Find the card in allCards or autoCards
    const cardData = allCards?.find(c => c.id === cardId) || 
                     autoCards?.find(c => c.id === cardId);
    if (cardData) {
      const fullCard: DecisionCard = {
        ...cardData,
        tenant_id: 'tenant_id' in cardData ? cardData.tenant_id : '',
        created_at: 'created_at' in cardData ? cardData.created_at : new Date().toISOString(),
        status: 'DECIDED',
        updated_at: new Date().toISOString(),
      };
      setLocalDecidedCardsData(prev => [...prev, fullCard]);
    }
    setSelectedCardId(null); // Close detail sheet
  };

  const handleCardDismissed = (cardId: string) => {
    const cardData = allCards?.find(c => c.id === cardId) || 
                     autoCards?.find(c => c.id === cardId);
    if (cardData) {
      const fullCard: DecisionCard = {
        ...cardData,
        tenant_id: 'tenant_id' in cardData ? cardData.tenant_id : '',
        created_at: 'created_at' in cardData ? cardData.created_at : new Date().toISOString(),
        status: 'DISMISSED',
        updated_at: new Date().toISOString(),
      };
      setLocalDismissedCardsData(prev => [...prev, fullCard]);
    }
    setSelectedCardId(null); // Close detail sheet
  };

  // Find selected card from multiple sources
  const selectedCardLocal = useMemo(() => {
    if (!selectedCardId) return null;
    
    // 1. Check active cards
    const fromActive = allCards?.find(c => c.id === selectedCardId);
    if (fromActive) return fromActive;
    
    // 2. Check local decided/dismissed
    const fromLocalDecided = localDecidedCardsData.find(c => c.id === selectedCardId);
    if (fromLocalDecided) return fromLocalDecided;
    const fromLocalDismissed = localDismissedCardsData.find(c => c.id === selectedCardId);
    if (fromLocalDismissed) return fromLocalDismissed;
    
    // 3. Check persisted auto card states (card_snapshot)
    const persistedState = (autoCardStates || []).find(s => s.auto_card_id === selectedCardId);
    if (persistedState?.card_snapshot) {
      return {
        ...(persistedState.card_snapshot as DecisionCard),
        id: persistedState.auto_card_id,
        status: persistedState.status as 'DECIDED' | 'DISMISSED',
        updated_at: persistedState.decided_at || persistedState.updated_at,
      } as DecisionCard;
    }
    
    return null;
  }, [allCards, selectedCardId, localDecidedCardsData, localDismissedCardsData, autoCardStates]);

  // Selected card for detail view (prefer DB for full details; fallback to local for auto cards)
  const { data: selectedCardFromDb } = useDecisionCard(
    selectedCardId && !selectedCardId.startsWith('auto-') ? selectedCardId : null
  );
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

  // Limit display (CEO rule: max 3 P1, 7 total visible - unless showAll)
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

  // Calculate combined stats
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


  const isLoading = dbLoading;

  return (
    <div className="space-y-6">
      {/* Hero Header - CEO 0-5s: "Tôi đang ở đâu?" */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Trung tâm Quyết định</h1>
              {/* CEO Hook: Urgency subline - Ép hành động ngay từ giây đầu */}
              {combinedStats.p1Count + combinedStats.p2Count > 0 ? (
                <p className="text-red-400 font-medium mt-1 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Hôm nay có {combinedStats.p1Count + combinedStats.p2Count} quyết định có thể gây thiệt hại nếu bỏ qua.
                </p>
              ) : (
                <p className="text-green-400 font-medium mt-1">
                  ✓ Không có vấn đề khẩn cấp cần xử lý.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowThresholdConfig(true)}
              variant="outline"
              size="icon"
              title="Cấu hình ngưỡng khẩn cấp"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button 
              onClick={async () => {
                setIsRefreshing(true);
                await refetch();
                setIsRefreshing(false);
              }}
              className="gap-2"
              variant="outline"
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
        </div>
      </div>

      {/* Threshold Config Dialog */}
      <ThresholdConfigDialog 
        open={showThresholdConfig} 
        onOpenChange={setShowThresholdConfig} 
      />

      {/* Bluecore Scores - Top level health indicators */}
      <BluecoreScoresPanel layout="compact" showTitle />

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

      {/* Main Tabs: Cần xử lý / Theo dõi / Lịch sử */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="gap-1.5">
            <Zap className="h-4 w-4" />
            Cần xử lý
            {allCards.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {allCards.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="followup" className="gap-1.5">
            <Eye className="h-4 w-4" />
            Theo dõi
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Lịch sử
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Quyết định cần xử lý */}
        <TabsContent value="pending">
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select 
                    value={priorityFilter} 
                    onValueChange={(v) => setPriorityFilter(v as Priority | 'ALL')}
                  >
                    <SelectTrigger className="w-[130px] h-8">
                      <Filter className="h-3.5 w-3.5 mr-1.5" />
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tất cả</SelectItem>
                      <SelectItem value="P1">P1 - Khẩn cấp</SelectItem>
                      <SelectItem value="P2">P2 - Quan trọng</SelectItem>
                      <SelectItem value="P3">P3 - Theo dõi</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex border rounded-lg h-8">
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-full px-2"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-full px-2"
                      onClick={() => setViewMode('grid')}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : visibleCards.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-green-400 mb-3" />
                  <h3 className="font-semibold mb-1">Không có quyết định cần xử lý</h3>
                  <p className="text-sm text-muted-foreground">
                    Tất cả các vấn đề đã được giải quyết.
                  </p>
                </div>
              ) : viewMode === 'list' ? (
                <div className="space-y-4">
                  {/* P1 Cards - Khẩn cấp */}
                  {groupedCards.P1.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        Khẩn cấp ({groupedCards.P1.length})
                      </div>
                      <div className="space-y-1">
                        {(showAll ? groupedCards.P1 : groupedCards.P1.slice(0, 3)).map((card) => (
                          <DecisionCardComponent
                            key={card.id}
                            card={card}
                            compact
                            onViewDetail={() => setSelectedCardId(card.id)}
                            onDecided={handleCardDecided}
                            onDismissed={handleCardDismissed}
                          />
                        ))}
                        {!showAll && groupedCards.P1.length > 3 && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => setShowAll(true)}
                          >
                            Xem thêm {groupedCards.P1.length - 3} quyết định khẩn cấp
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* P2 Cards - Quan trọng */}
                  {groupedCards.P2.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-yellow-400 mb-2">
                        <Clock className="h-4 w-4" />
                        Quan trọng ({groupedCards.P2.length})
                      </div>
                      <div className="space-y-1">
                        {(showAll ? groupedCards.P2 : groupedCards.P2.slice(0, 4)).map((card) => (
                          <DecisionCardComponent
                            key={card.id}
                            card={card}
                            compact
                            onViewDetail={() => setSelectedCardId(card.id)}
                            onDecided={handleCardDecided}
                            onDismissed={handleCardDismissed}
                          />
                        ))}
                        {!showAll && groupedCards.P2.length > 4 && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => setShowAll(true)}
                          >
                            Xem thêm {groupedCards.P2.length - 4} quyết định
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* P3 Cards - Theo dõi */}
                  {groupedCards.P3.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 mb-2">
                        <Target className="h-4 w-4" />
                        Theo dõi ({groupedCards.P3.length})
                      </div>
                      <div className="space-y-1">
                        {(showAll ? groupedCards.P3 : groupedCards.P3.slice(0, 2)).map((card) => (
                          <DecisionCardComponent
                            key={card.id}
                            card={card}
                            compact
                            onViewDetail={() => setSelectedCardId(card.id)}
                            onDecided={handleCardDecided}
                            onDismissed={handleCardDismissed}
                          />
                        ))}
                        {!showAll && groupedCards.P3.length > 2 && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => setShowAll(true)}
                          >
                            Xem thêm {groupedCards.P3.length - 2} quyết định
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {showAll && (allCards?.length || 0) > 7 && (
                    <div className="text-center">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-xs"
                        onClick={() => setShowAll(false)}
                      >
                        Thu gọn
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {visibleCards.map((card) => (
                    <DecisionCardComponent
                      key={card.id}
                      card={card}
                      onViewDetail={() => setSelectedCardId(card.id)}
                      onDecided={handleCardDecided}
                      onDismissed={handleCardDismissed}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Theo dõi quyết định */}
        <TabsContent value="followup">
          <DecisionFollowupPanel />
        </TabsContent>

        {/* Tab 3: Lịch sử quyết định */}
        <TabsContent value="history">
          <Tabs defaultValue="decided" className="space-y-3">
            <TabsList>
              <TabsTrigger value="decided" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Đã xử lý
              </TabsTrigger>
              <TabsTrigger value="outcomes" className="gap-1">
                <Target className="h-3.5 w-3.5" />
                Kết quả đo lường
              </TabsTrigger>
              <TabsTrigger value="dismissed">Đã bỏ qua</TabsTrigger>
            </TabsList>

            <TabsContent value="decided">
              <Card>
                <CardContent className="py-4">
                  {(() => {
                    const persistedDecidedCards: DecisionCard[] = (autoCardStates || [])
                      .filter(s => s.status === 'DECIDED' && s.card_snapshot)
                      .map(s => ({
                        ...(s.card_snapshot as DecisionCard),
                        id: s.auto_card_id,
                        status: 'DECIDED' as const,
                        updated_at: s.decided_at || s.updated_at,
                      }));

                    const allDecidedCards = [
                      ...persistedDecidedCards,
                      ...localDecidedCardsData.filter(c => !persistedDecidedIds.has(c.id)),
                      ...(decidedCards || []),
                    ];

                    return allDecidedCards.length > 0 ? (
                      <div className="space-y-2">
                        {allDecidedCards.map((card) => (
                          <div 
                            key={card.id} 
                            className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => setSelectedCardId(card.id)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{card.title}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{card.entity_label}</span>
                                  <span>•</span>
                                  <span>{formatCurrency(Math.abs(card.impact_amount))}đ</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="text-xs">{card.priority}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(card.updated_at).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
                        <p>Chưa có quyết định nào được xử lý</p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="outcomes">
              <Card>
                <CardContent className="py-4">
                  <OutcomeHistoryPanel />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dismissed">
              <Card>
                <CardContent className="py-4">
                  {(() => {
                    const persistedDismissedCards: DecisionCard[] = (autoCardStates || [])
                      .filter(s => s.status === 'DISMISSED' && s.card_snapshot)
                      .map(s => ({
                        ...(s.card_snapshot as DecisionCard),
                        id: s.auto_card_id,
                        status: 'DISMISSED' as const,
                        updated_at: s.decided_at || s.updated_at,
                      }));

                    const allDismissedCards = [
                      ...persistedDismissedCards,
                      ...localDismissedCardsData.filter(c => !persistedDismissedIds.has(c.id)),
                      ...(dismissedCards || []),
                    ];

                    return allDismissedCards.length > 0 ? (
                      <div className="space-y-2">
                        {allDismissedCards.map((card) => (
                          <div 
                            key={card.id} 
                            className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => setSelectedCardId(card.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{card.title}</p>
                                <p className="text-xs text-muted-foreground">{card.entity_label}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{card.priority}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(card.updated_at).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        <p>Chưa có quyết định nào bị bỏ qua</p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Detail Sheet with Inline AI - Vertical Layout: Detail on top, AI below */}
      <Sheet open={!!selectedCardId} onOpenChange={(open) => !open && setSelectedCardId(null)}>
        <SheetContent className="sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Chi tiết quyết định</SheetTitle>
          </SheetHeader>

          {!selectedCard ? (
            <div className="mt-6 py-10 text-center text-muted-foreground">
              <p>Không tìm thấy chi tiết quyết định (có thể card chưa được lưu vào hệ thống).</p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-6">
              {/* Top: Decision Card */}
              <div>
                <DecisionCardComponent 
                  card={selectedCard} 
                  onDecided={handleCardDecided}
                  onDismissed={handleCardDismissed}
                />
              </div>

              {/* Bottom: AI Chat inline */}
              <div className="border rounded-lg p-4 flex flex-col min-h-[350px]">
                <InlineAIChat card={selectedCard} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
