import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X, HelpCircle, Download, ChevronRight, ChevronDown, Search, Edit2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportRebalanceToExcel } from '@/lib/inventory-export';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';

interface Props {
  suggestions: RebalanceSuggestion[];
  onApprove: (ids: string[], editedQty?: Record<string, number>) => void;
  onReject: (ids: string[]) => void;
  transferType?: 'push' | 'lateral' | 'all';
}

const priorityColors: Record<string, string> = {
  P1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  P2: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  P3: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  executed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

function HeaderWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-1">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function RebalanceBoardTable({ suggestions, onApprove, onReject, transferType = 'all' }: Props) {
  const [editedQty, setEditedQty] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let result = transferType === 'all' ? suggestions : suggestions.filter(s => s.transfer_type === transferType);
    if (filterPriority !== 'all') result = result.filter(s => s.priority === filterPriority);
    if (filterStatus !== 'all') result = result.filter(s => s.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        (s.fc_name || s.fc_id).toLowerCase().includes(q) ||
        s.from_location_name.toLowerCase().includes(q) ||
        s.to_location_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [suggestions, transferType, filterPriority, filterStatus, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, RebalanceSuggestion[]>();
    for (const s of filtered) {
      const key = s.from_location_name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [filtered]);

  const pendingFiltered = filtered.filter(s => s.status === 'pending');
  const editedCount = Object.keys(editedQty).filter(id => {
    const s = suggestions.find(x => x.id === id);
    return s && editedQty[id] !== s.qty;
  }).length;

  const getDisplayQty = (s: RebalanceSuggestion) => editedQty[s.id] ?? s.qty;
  const isEdited = (s: RebalanceSuggestion) => s.id in editedQty && editedQty[s.id] !== s.qty;
  const getDelta = (s: RebalanceSuggestion) => isEdited(s) ? editedQty[s.id] - s.qty : 0;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    setSelectedIds(prev =>
      prev.size === pendingFiltered.length ? new Set() : new Set(pendingFiltered.map(s => s.id))
    );
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleBatchApprove = () => {
    const ids = Array.from(selectedIds);
    const edited: Record<string, number> = {};
    ids.forEach(id => { if (id in editedQty) edited[id] = editedQty[id]; });
    onApprove(ids, Object.keys(edited).length > 0 ? edited : undefined);
    setSelectedIds(new Set());
  };

  const handleBatchReject = () => {
    onReject(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleSingleApprove = (id: string) => {
    const edited: Record<string, number> = {};
    if (id in editedQty) edited[id] = editedQty[id];
    onApprove([id], Object.keys(edited).length > 0 ? edited : undefined);
  };

  const handleExport = () => exportRebalanceToExcel(filtered, editedQty);

  const selectedSuggestions = filtered.filter(s => selectedIds.has(s.id));
  const selectedQty = selectedSuggestions.reduce((sum, s) => sum + (editedQty[s.id] ?? s.qty), 0);
  const selectedRevenue = selectedSuggestions.reduce((sum, s) => sum + s.potential_revenue_gain, 0);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Chưa có đề xuất nào</p>
        <p className="text-sm mt-1">Nhấn "Chạy quét" để hệ thống phân tích và đề xuất cân bằng hàng</p>
      </div>
    );
  }

  const showTypeCol = transferType === 'all';
  const showCostCols = transferType === 'lateral' || transferType === 'all';

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {/* TOOLBAR */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={pendingFiltered.length > 0 && selectedIds.size === pendingFiltered.length}
              onCheckedChange={selectAllPending}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `Đã chọn ${selectedIds.size}/${pendingFiltered.length}` : `${pendingFiltered.length} pending`}
            </span>
          </div>
          <div className="h-5 w-px bg-border" />
          {selectedIds.size > 0 && (
            <>
              <Button size="sm" variant="default" className="gap-1.5 h-8" onClick={handleBatchApprove}>
                <Check className="h-3.5 w-3.5" /> Duyệt {selectedIds.size}
              </Button>
              <Button size="sm" variant="destructive" className="gap-1.5 h-8" onClick={handleBatchReject}>
                <X className="h-3.5 w-3.5" /> Từ chối {selectedIds.size}
              </Button>
              <div className="h-5 w-px bg-border" />
            </>
          )}
          {editedCount > 0 && (
            <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300">
              <Edit2 className="h-3 w-3" /> {editedCount} đã chỉnh
            </Badge>
          )}
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue placeholder="Ưu tiên" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="P1">P1</SelectItem>
              <SelectItem value="P2">P2</SelectItem>
              <SelectItem value="P3">P3</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Tìm SP hoặc kho..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-8 pl-8 text-xs" />
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 ml-auto" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Excel
          </Button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="w-16"><HeaderWithTooltip label="Ưu tiên" tooltip="P1: Sắp hết hàng. P2: Cover thấp. P3: Tối ưu." /></TableHead>
                {showTypeCol && <TableHead className="w-20"><HeaderWithTooltip label="Loại" tooltip="Push: Từ kho tổng. Lateral: Giữa các kho." /></TableHead>}
                <TableHead><HeaderWithTooltip label="Sản phẩm" tooltip="Tên sản phẩm (Family Code)" /></TableHead>
                <TableHead><HeaderWithTooltip label="Đến" tooltip="Kho/store đích" /></TableHead>
                <TableHead className="text-right"><HeaderWithTooltip label="SL" tooltip="Số lượng đề xuất chuyển" /></TableHead>
                <TableHead><HeaderWithTooltip label="Cover" tooltip="Cover trước → sau (tuần)" /></TableHead>
                {showCostCols && (
                  <>
                    <TableHead className="text-right"><HeaderWithTooltip label="VC" tooltip="Chi phí vận chuyển" /></TableHead>
                    <TableHead className="text-right"><HeaderWithTooltip label="Net" tooltip="Lợi ích ròng" /></TableHead>
                  </>
                )}
                <TableHead className="text-right"><HeaderWithTooltip label="Revenue" tooltip="Doanh thu tiềm năng" /></TableHead>
                <TableHead><HeaderWithTooltip label="TT" tooltip="Trạng thái" /></TableHead>
                <TableHead className="w-20">...</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(grouped.entries()).map(([groupName, items]) => {
                const isCollapsed = collapsedGroups.has(groupName);
                const groupQty = items.reduce((s, x) => s + (editedQty[x.id] ?? x.qty), 0);
                const groupRevenue = items.reduce((s, x) => s + x.potential_revenue_gain, 0);
                const groupPending = items.filter(x => x.status === 'pending');
                const totalCols = 6 + (showTypeCol ? 1 : 0) + (showCostCols ? 2 : 0) + 3;

                return (
                  <React.Fragment key={groupName}>
                    <TableRow className="bg-muted/40 hover:bg-muted/60 cursor-pointer" onClick={() => toggleGroup(groupName)}>
                      <TableCell colSpan={totalCols - 3} className="font-semibold text-sm py-2">
                        <div className="flex items-center gap-2">
                          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          <span>📦 {groupName}</span>
                          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                          {groupPending.length > 0 && <Badge variant="outline" className="text-xs">{groupPending.length} pending</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm py-2 text-emerald-600">+{(groupRevenue / 1_000_000).toFixed(1)}M</TableCell>
                      <TableCell className="py-2" />
                      <TableCell className="text-right font-mono font-semibold text-sm py-2">{groupQty} units</TableCell>
                    </TableRow>
                    {!isCollapsed && items.map(s => {
                      const delta = getDelta(s);
                      return (
                        <TableRow key={s.id} className={isEdited(s) ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                          <TableCell>
                            {s.status === 'pending' && <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} />}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${priorityColors[s.priority] || ''}`}>{s.priority}</span>
                          </TableCell>
                          {showTypeCol && (
                            <TableCell><Badge variant="outline" className="text-xs">{s.transfer_type === 'push' ? 'Push' : 'Lateral'}</Badge></TableCell>
                          )}
                          <TableCell className="font-medium text-sm max-w-[160px] truncate" title={s.fc_name || s.fc_id}>{s.fc_name || s.fc_id}</TableCell>
                          <TableCell>
                            <div className="text-sm">{s.to_location_name}</div>
                            <div className="text-xs text-muted-foreground">{s.to_location_type}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            {s.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1">
                                <Input type="number" value={getDisplayQty(s)} onChange={e => setEditedQty(prev => ({ ...prev, [s.id]: Number(e.target.value) || 0 }))} className="h-7 w-16 text-right font-mono font-bold text-sm" min={0} />
                                {delta !== 0 && <span className={`text-xs font-mono ${delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{delta > 0 ? `+${delta}` : delta}</span>}
                              </div>
                            ) : <span className="font-mono font-bold">{s.qty}</span>}
                          </TableCell>
                          <TableCell><span className="text-xs">{s.to_weeks_cover?.toFixed(1)}w → {s.balanced_weeks_cover?.toFixed(1)}w</span></TableCell>
                          {showCostCols && (
                            <>
                              <TableCell className="text-right text-xs">{s.logistics_cost_estimate ? `${(s.logistics_cost_estimate / 1_000_000).toFixed(1)}M` : '-'}</TableCell>
                              <TableCell className="text-right text-xs font-medium text-emerald-600">{s.net_benefit ? `+${(s.net_benefit / 1_000_000).toFixed(1)}M` : '-'}</TableCell>
                            </>
                          )}
                          <TableCell className="text-right text-sm">+{(s.potential_revenue_gain / 1_000_000).toFixed(1)}M</TableCell>
                          <TableCell><span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${statusColors[s.status] || ''}`}>{s.status}</span></TableCell>
                          <TableCell>
                            {s.status === 'pending' && (
                              <div className="flex gap-0.5">
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => handleSingleApprove(s.id)}><Check className="h-3.5 w-3.5" /></Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => onReject([s.id])}><X className="h-3.5 w-3.5" /></Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* STICKY SUMMARY BAR */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 p-3 bg-background/95 backdrop-blur border rounded-lg shadow-sm">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {filtered.filter(s => s.status === 'pending').length} pending • {filtered.filter(s => s.status === 'approved').length} approved • {filtered.filter(s => s.status === 'rejected').length} rejected
            </span>
            {selectedIds.size > 0 && (
              <>
                <div className="h-4 w-px bg-border" />
                <span className="font-medium">
                  Đã chọn: <span className="font-mono">{selectedQty}</span> units • <span className="text-emerald-600 font-mono">+{(selectedRevenue / 1_000_000).toFixed(1)}M</span>
                </span>
              </>
            )}
          </div>
          {selectedIds.size > 0 && (
            <Button size="sm" className="gap-1.5" onClick={handleBatchApprove}>
              <Check className="h-3.5 w-3.5" /> Duyệt {selectedIds.size} đề xuất
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
