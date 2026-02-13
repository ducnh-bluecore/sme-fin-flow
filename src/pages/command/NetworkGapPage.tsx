import { useState, Fragment } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, TrendingDown, Factory, ShieldCheck, ShieldAlert, ShieldX, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { formatVNDCompact } from '@/lib/formatters';

export default function NetworkGapPage() {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: fcList } = useQuery({
    queryKey: ['command-fc-names-gap', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('inv_family_codes' as any)
        .select('id,fc_name,fc_code')
        .eq('is_active', true)
        .limit(5000);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  const fcMap = new Map<string, string>();
  for (const fc of fcList || []) {
    fcMap.set(fc.id, fc.fc_name || fc.fc_code || fc.id);
  }

  const { data: gapRows, isLoading } = useQuery({
    queryKey: ['command-network-gap-detail', tenantId],
    queryFn: async () => {
      const { data, error } = await buildQuery('kpi_network_gap' as any)
        .order('revenue_at_risk', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && isReady,
  });

  // Lọc bỏ dữ liệu lỗi: chỉ giữ rows thực sự thiếu hàng hoặc có doanh thu rủi ro
  const validRows = (gapRows || []).filter((r: any) => (r.true_shortage_units || 0) > 0 || (r.revenue_at_risk || 0) > 0);
  
  const totalShortage = validRows.reduce((s: number, r: any) => s + (r.true_shortage_units || 0), 0);
  const totalRevenueAtRisk = validRows.reduce((s: number, r: any) => s + (r.revenue_at_risk || 0), 0);
  const totalNetGap = validRows.reduce((s: number, r: any) => s + (r.net_gap_units || 0), 0);
  const totalReallocatable = (gapRows || []).reduce((s: number, r: any) => s + (r.reallocatable_units || 0), 0);
  const stylesAffected = validRows.length;
  const stylesNeedProduction = validRows.filter((r: any) => (r.true_shortage_units || 0) > 0).length;

  // Khả năng giải quyết bằng điều chuyển
  const transferCoverage = totalShortage > 0
    ? Math.min(100, Math.round((totalReallocatable / (totalShortage + totalReallocatable)) * 100))
    : 100;

  // Logic quyết định
  const decisionLevel: 'safe' | 'monitor' | 'action' = 
    totalShortage === 0 || transferCoverage >= 95 ? 'safe' :
    totalShortage < 50 ? 'monitor' : 'action';

  // Tìm kiếm
  let filtered = validRows;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((r: any) => {
      const name = fcMap.get(r.style_id) || r.style_id || '';
      return name.toLowerCase().includes(q);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phân Tích Nguồn Cung"
        subtitle="Phát hiện rủi ro thiếu hàng trước khi mất doanh thu"
        icon={<Package className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/command/production')}>
            Kế hoạch Sản xuất <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        }
      />

      {/* Banner Quyết định */}
      {!isLoading && (
        <DecisionBanner
          level={decisionLevel}
          totalShortage={totalShortage}
          totalRevenueAtRisk={totalRevenueAtRisk}
          stylesNeedProduction={stylesNeedProduction}
          transferCoverage={transferCoverage}
        />
      )}

      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Cần Sản Xuất Thêm</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{totalNetGap.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">đơn vị</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Doanh Thu Rủi Ro</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{formatVNDCompact(totalRevenueAtRisk)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Điều Chuyển Được</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{totalReallocatable.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">đơn vị có thể chuyển kho</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Mẫu Bị Ảnh Hưởng</p>
            <p className="text-2xl font-bold mt-1">{stylesAffected}</p>
            <p className="text-xs text-muted-foreground">có thiếu hàng thực tế</p>
          </CardContent>
        </Card>
      </div>

      {/* Thanh Khả Năng Điều Chuyển */}
      {totalShortage > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Khả Năng Giải Quyết Bằng Điều Chuyển</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Thiếu hụt có thể xử lý không cần sản xuất</span>
                <span className="font-medium">{transferCoverage}%</span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${transferCoverage}%` }} />
                <div className="bg-red-500 h-full transition-all" style={{ width: `${100 - transferCoverage}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Điều chuyển đủ</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Cần sản xuất</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Radar Sản Xuất */}
      {stylesNeedProduction > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Factory className="h-4 w-4 text-orange-600" /> Radar Sản Xuất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Mẫu cần sản xuất</p>
                <p className="text-xl font-bold mt-0.5">{stylesNeedProduction}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Số lượng cần</p>
                <p className="text-xl font-bold mt-0.5">{totalShortage.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Doanh thu bị đe dọa</p>
                <p className="text-xl font-bold mt-0.5 text-red-600">{formatVNDCompact(totalRevenueAtRisk)}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/command/production')}>
              Xem Kế Hoạch Sản Xuất <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bảng Chi Tiết */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Phân Tích Chi Tiết
            </CardTitle>
            <Input placeholder="Tìm mẫu..." value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Không phát hiện rủi ro thiếu hàng</p>
              <p className="text-xs mt-1">Toàn bộ nhu cầu đã được đáp ứng bởi tồn kho hiện tại</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mẫu SP</TableHead>
                    <TableHead className="text-right">Thiếu Hụt</TableHead>
                    <TableHead className="text-right">DT Rủi Ro</TableHead>
                    <TableHead className="text-right">Điều Chuyển Được</TableHead>
                    <TableHead className="text-right">Cần SX</TableHead>
                    <TableHead>Hành Động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map((row: any) => {
                    const needsProduction = (row.true_shortage_units || 0) > 0;
                    const isExpanded = expandedId === row.id;
                    const transferable = row.reallocatable_units || 0;
                    const shortage = row.true_shortage_units || 0;
                    const netGap = row.net_gap_units || 0;
                    const coverPct = netGap > 0 ? Math.min(100, Math.round((transferable / netGap) * 100)) : 100;
                    return (
                      <Fragment key={row.id}>
                        <TableRow 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                        >
                          <TableCell className="font-medium text-sm">{fcMap.get(row.style_id) || row.style_id?.slice(0, 8)}</TableCell>
                          <TableCell className="text-right text-orange-600">{netGap.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">{formatVNDCompact(row.revenue_at_risk)}</TableCell>
                          <TableCell className="text-right text-emerald-600">{transferable.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{shortage.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={needsProduction ? 'destructive' : 'secondary'}>
                              {needsProduction ? 'Cần Sản Xuất' : 'Điều Chuyển'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/30 px-6 py-4">
                              <div className="space-y-4">
                                {/* Lý Do Quyết Định */}
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Lý Do Quyết Định</p>
                                  <div className="bg-background border rounded-lg p-3 space-y-2">
                                    {needsProduction ? (
                                      <>
                                        <p className="text-sm">
                                          Phát hiện <span className="font-medium text-foreground">thiếu hụt {netGap} đơn vị</span> trong mạng lưới. 
                                          Điều chuyển có thể xử lý <span className="text-emerald-600 font-medium">{transferable} đơn vị ({coverPct}%)</span>, 
                                          còn lại <span className="text-red-600 font-medium">{shortage} đơn vị</span> cần sản xuất thêm.
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          Doanh thu bị đe dọa: <span className="font-medium text-red-600">{formatVNDCompact(row.revenue_at_risk)}</span> nếu không xử lý.
                                        </p>
                                      </>
                                    ) : (
                                      <p className="text-sm">
                                        <span className="font-medium text-foreground">Thiếu hụt {netGap} đơn vị</span> đã được đáp ứng hoàn toàn bằng 
                                        tồn kho điều chuyển (<span className="text-emerald-600 font-medium">{transferable} đơn vị</span>). 
                                        Không cần sản xuất thêm.
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Biểu đồ Waterfall */}
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Phân Rã Thiếu Hụt</p>
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded px-3 py-2 text-center">
                                      <p className="text-muted-foreground">Thiếu hụt</p>
                                      <p className="text-lg font-bold text-orange-600">{netGap}</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded px-3 py-2 text-center">
                                      <p className="text-muted-foreground">Điều chuyển</p>
                                      <p className="text-lg font-bold text-emerald-600">−{transferable}</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className={`rounded px-3 py-2 text-center border ${shortage > 0 ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800'}`}>
                                      <p className="text-muted-foreground">Cần SX</p>
                                      <p className={`text-lg font-bold ${shortage > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{shortage}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Meta */}
                                <p className="text-xs text-muted-foreground">Ngày phân tích: {row.as_of_date || '—'}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              {filtered.length > 100 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">Hiển thị 100 / {filtered.length}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Banner Quyết Định ─── */
function DecisionBanner({ level, totalShortage, totalRevenueAtRisk, stylesNeedProduction, transferCoverage }: {
  level: 'safe' | 'monitor' | 'action';
  totalShortage: number;
  totalRevenueAtRisk: number;
  stylesNeedProduction: number;
  transferCoverage: number;
}) {
  if (level === 'safe') {
    return (
      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-emerald-100 bg-[hsl(60,30%,97%)] dark:border-emerald-900/30 dark:bg-[hsl(60,10%,12%)] p-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">KHÔNG cần sản xuất thêm</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
              {transferCoverage}% thiếu hụt có thể giải quyết bằng điều chuyển. Không cần sản xuất ngay.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (level === 'monitor') {
    return (
      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">Thiếu hụt nhỏ — theo dõi</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              {totalShortage} đơn vị / {formatVNDCompact(totalRevenueAtRisk)} doanh thu rủi ro trên {stylesNeedProduction} mẫu
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-4">
      <div className="flex items-center gap-3">
        <ShieldX className="h-6 w-6 text-red-600 shrink-0" />
        <div>
          <p className="font-semibold text-red-800 dark:text-red-300">CẦN SẢN XUẤT NGAY</p>
          <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
            {stylesNeedProduction} mẫu, {totalShortage.toLocaleString()} đơn vị, {formatVNDCompact(totalRevenueAtRisk)} doanh thu bị đe dọa
          </p>
        </div>
      </div>
    </motion.div>
  );
}
