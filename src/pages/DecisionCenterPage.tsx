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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DecisionCardComponent } from '@/components/decision/DecisionCard';
import { BluecoreScoresPanel } from '@/components/decision/BluecoreScoresPanel';
import { 
  useDecisionCards, 
  useDecisionCardStats,
  CardStatus,
  Priority,
} from '@/hooks/useDecisionCards';
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

  const { data: cards, isLoading, refetch } = useDecisionCards({
    status: statusFilter,
    priority: priorityFilter === 'ALL' ? undefined : [priorityFilter],
  });
  const { data: stats } = useDecisionCardStats();

  // Selected card for detail view
  const selectedCard = useMemo(() => 
    cards?.find(c => c.id === selectedCardId),
    [cards, selectedCardId]
  );

  // Group cards by priority
  const groupedCards = useMemo(() => {
    if (!cards) return { P1: [], P2: [], P3: [] };
    
    return {
      P1: cards.filter(c => c.priority === 'P1'),
      P2: cards.filter(c => c.priority === 'P2'),
      P3: cards.filter(c => c.priority === 'P3'),
    };
  }, [cards]);

  // Limit display (CEO rule: max 3 P1, 5 total visible)
  const visibleCards = useMemo(() => {
    const result: typeof cards = [];
    const p1Cards = groupedCards.P1.slice(0, 3);
    const remaining = 7 - p1Cards.length;
    const p2Cards = groupedCards.P2.slice(0, Math.min(remaining, 4));
    const p3Remaining = 7 - p1Cards.length - p2Cards.length;
    const p3Cards = groupedCards.P3.slice(0, p3Remaining);
    
    return [...p1Cards, ...p2Cards, ...p3Cards];
  }, [groupedCards]);

  return (
    <div className="space-y-6">
      <PageHeader title="Decision Center" />
      <p className="text-muted-foreground -mt-4">
        Hệ điều hành quyết định - Hôm nay cần quyết định gì?
      </p>

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
                <p className="text-2xl font-bold text-red-400">{stats?.p1Count || 0}</p>
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
                <p className="text-2xl font-bold text-yellow-400">{stats?.p2Count || 0}</p>
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
                <p className="text-2xl font-bold">{stats?.p3Count || 0}</p>
                <p className="text-xs text-muted-foreground">P3 Theo dõi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(stats?.overdueCount && stats.overdueCount > 0 && "border-red-500/50")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className={cn(
                  "text-2xl font-bold",
                  stats?.overdueCount && stats.overdueCount > 0 && "text-red-400"
                )}>
                  {stats?.overdueCount || 0}
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
                  (stats?.totalImpact || 0) > 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatCurrency(stats?.totalImpact || 0)}đ
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
              <Badge variant="outline">{visibleCards.length} / {cards?.length || 0}</Badge>
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

              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
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
              {/* P1 Cards - Always first */}
              {groupedCards.P1.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    Khẩn cấp - Xử lý ngay
                  </div>
                  {groupedCards.P1.slice(0, 3).map((card) => (
                    <DecisionCardComponent
                      key={card.id}
                      card={card}
                      compact
                      onViewDetail={() => setSelectedCardId(card.id)}
                    />
                  ))}
                </div>
              )}

              {/* P2 Cards */}
              {groupedCards.P2.length > 0 && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-yellow-400">
                    <Clock className="h-4 w-4" />
                    Quan trọng - Trong 24-72h
                  </div>
                  {groupedCards.P2.slice(0, 4).map((card) => (
                    <DecisionCardComponent
                      key={card.id}
                      card={card}
                      compact
                      onViewDetail={() => setSelectedCardId(card.id)}
                    />
                  ))}
                </div>
              )}

              {/* P3 Cards */}
              {groupedCards.P3.length > 0 && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
                    <Target className="h-4 w-4" />
                    Theo dõi - Trong tuần
                  </div>
                  {groupedCards.P3.slice(0, 3).map((card) => (
                    <DecisionCardComponent
                      key={card.id}
                      card={card}
                      compact
                      onViewDetail={() => setSelectedCardId(card.id)}
                    />
                  ))}
                </div>
              )}

              {/* Show more indicator */}
              {(cards?.length || 0) > 7 && (
                <div className="text-center pt-4">
                  <Button variant="ghost" size="sm">
                    Xem thêm {(cards?.length || 0) - 7} quyết định
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

      {/* Tabs for different views */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Lịch sử quyết định</TabsTrigger>
          <TabsTrigger value="dismissed">Đã bỏ qua</TabsTrigger>
          <TabsTrigger value="expired">Đã hết hạn</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
              <p>Quyết định đã xử lý sẽ hiển thị tại đây</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dismissed">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>Các quyết định đã bỏ qua</p>
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

      {/* Detail Sheet */}
      <Sheet open={!!selectedCardId} onOpenChange={(open) => !open && setSelectedCardId(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Chi tiết quyết định</SheetTitle>
          </SheetHeader>
          {selectedCard && (
            <div className="mt-6">
              <DecisionCardComponent card={selectedCard} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
