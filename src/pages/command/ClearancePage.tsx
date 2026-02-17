import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tags, AlertTriangle, Store, Search, ChevronDown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useClearanceCandidates,
  useClearanceByChannel,
  PREMIUM_MAX_DISCOUNT,
  type ClearanceCandidate,
} from '@/hooks/inventory/useClearanceIntelligence';
import { formatCurrency, formatNumber } from '@/lib/format';
import ProductDetailPanel from '@/components/command/Clearance/ProductDetailPanel';
import CollectionGroupHeader, { type CollectionGroup } from '@/components/command/Clearance/CollectionGroupHeader';
import CandidateTableRows from '@/components/command/Clearance/CandidateTableRows';
import MarkdownHistoryTab from '@/components/command/Clearance/MarkdownHistoryTab';

// ─── Tab 1: Clearance Candidates ───
function ClearanceCandidatesTab() {
  const { data: candidates, isLoading } = useClearanceCandidates();
  const [search, setSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<ClearanceCandidate | null>(null);
  const [groupByCollection, setGroupByCollection] = useState(true);

  const filtered = useMemo(() => {
    if (!candidates) return [];
    if (!search) return candidates;
    const q = search.toLowerCase();
    return candidates.filter(c => c.product_name.toLowerCase().includes(q) || c.fc_code.toLowerCase().includes(q));
  }, [candidates, search]);

  const collectionGroups = useMemo(() => {
    if (!groupByCollection) return [];
    const groupMap = new Map<string, CollectionGroup>();
    const ungrouped: ClearanceCandidate[] = [];
    filtered.forEach(c => {
      if (c.collection_name) {
        const existing = groupMap.get(c.collection_name);
        if (existing) { existing.candidates.push(c); existing.totalValue += c.inventory_value; }
        else { groupMap.set(c.collection_name, { name: c.collection_name, season: c.season, candidates: [c], totalValue: c.inventory_value }); }
      } else { ungrouped.push(c); }
    });
    const groups = Array.from(groupMap.values()).sort((a, b) => b.totalValue - a.totalValue);
    if (ungrouped.length > 0) groups.push({ name: 'Chưa phân BST', season: null, candidates: ungrouped, totalValue: ungrouped.reduce((s, c) => s + c.inventory_value, 0) });
    return groups;
  }, [filtered, groupByCollection]);

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  if (selectedCandidate) return <ProductDetailPanel candidate={selectedCandidate} onBack={() => setSelectedCandidate(null)} />;

  const tableHeader = (
    <TableHeader><TableRow className="bg-muted/50">
      <TableHead>Sản phẩm</TableHead><TableHead className="text-right">Tồn kho</TableHead><TableHead className="text-right">Giá trị tồn</TableHead>
      <TableHead className="text-center">Tốc độ bán</TableHead><TableHead className="text-center">Health</TableHead><TableHead className="text-center">MD Risk</TableHead><TableHead>Trạng thái</TableHead>
    </TableRow></TableHeader>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm sản phẩm..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="secondary">{filtered.length} sản phẩm</Badge>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">Nhóm theo BST</span>
          <Switch checked={groupByCollection} onCheckedChange={setGroupByCollection} />
        </div>
      </div>

      {groupByCollection && collectionGroups.length > 0 ? (
        <div className="space-y-3">
          {collectionGroups.map(group => (
            <Collapsible key={group.name} defaultOpen>
              <div className="rounded-lg border overflow-hidden">
                <CollapsibleTrigger className="w-full px-4 py-2 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center gap-2">
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform [[data-state=closed]>&]:rotate-[-90deg]" />
                  <CollectionGroupHeader group={group} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>{tableHeader}<TableBody><CandidateTableRows items={group.candidates} onSelect={setSelectedCandidate} /></TableBody></Table>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>{tableHeader}<TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Không có sản phẩm nào cần clearance</TableCell></TableRow>
            ) : (
              <CandidateTableRows items={filtered} onSelect={setSelectedCandidate} />
            )}
          </TableBody></Table>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Channel Analysis ───
// ─── Tab 3: Channel Analysis ───
function ChannelAnalysisTab() {
  const { data: channels, isLoading } = useClearanceByChannel();
  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {(channels || []).map(ch => (
        <Card key={ch.channel}>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4 text-muted-foreground" />{ch.channel}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Avg Discount</span><Badge variant={ch.avgDiscountPct > 40 ? 'destructive' : 'secondary'}>{ch.avgDiscountPct}%</Badge></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tổng units</span><span className="font-mono font-medium">{formatNumber(ch.totalUnits)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Doanh thu</span><span className="font-mono font-medium">{formatCurrency(ch.totalRevenue)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tổng discount</span><span className="font-mono font-medium text-destructive">{formatCurrency(ch.totalDiscount)}</span></div>
          </CardContent>
        </Card>
      ))}
      {(!channels || channels.length === 0) && <div className="col-span-full text-center text-muted-foreground py-8">Chưa có dữ liệu clearance</div>}
    </div>
  );
}

// ─── Main Page ───
export default function ClearancePage() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Tags className="h-6 w-6 text-orange-500" />Thanh Lý Thông Minh</h1>
        <p className="text-muted-foreground mt-1">Phân tích hàng cần clearance, lịch sử markdown và hiệu quả theo kênh</p>
      </div>
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-700 dark:text-amber-400"><strong>Guardrail:</strong> Nhóm Premium / Signature / Thêu không được off quá {PREMIUM_MAX_DISCOUNT}%.</AlertDescription>
      </Alert>
      <Tabs defaultValue="candidates" className="w-full">
        <TabsList>
          <TabsTrigger value="candidates">Cần Clearance</TabsTrigger>
          <TabsTrigger value="history">Lịch Sử Markdown</TabsTrigger>
          <TabsTrigger value="channels">Phân Tích Kênh</TabsTrigger>
        </TabsList>
        <TabsContent value="candidates"><ClearanceCandidatesTab /></TabsContent>
        <TabsContent value="history"><MarkdownHistoryTab /></TabsContent>
        <TabsContent value="channels"><ChannelAnalysisTab /></TabsContent>
      </Tabs>
    </motion.div>
  );
}
