import { FileText, Activity, DollarSign, Lock, Flame, TrendingDown, ShieldAlert, Store, Package } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatVNDCompact } from '@/lib/formatters';

interface EvidenceDrawerProps {
  evidenceProductId: string | null;
  onClose: () => void;
  evidenceRow: any;
  evidencePack: any;
  drawerSizeData: { missing: string[]; partial: string[]; present: string[] } | null;
  surplusStores: { store_id: string; store_name: string; sizes: Record<string, number>; totalQty: number }[];
  productName: string;
}

export default function EvidenceDrawer({
  evidenceProductId, onClose, evidenceRow, evidencePack,
  drawerSizeData, surplusStores, productName,
}: EvidenceDrawerProps) {
  return (
    <Sheet open={!!evidenceProductId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Hồ Sơ Bằng Chứng
          </SheetTitle>
          <SheetDescription>{productName}</SheetDescription>
        </SheetHeader>

        {/* Size map */}
        {drawerSizeData && (drawerSizeData.present.length > 0 || drawerSizeData.partial.length > 0 || drawerSizeData.missing.length > 0) && (
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-destructive" /> Bản Đồ Size
            </h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              {drawerSizeData.present.map(size => (
                <Badge key={`p-${size}`} variant="outline" className="text-xs px-2 py-0.5 font-medium text-emerald-700 border-emerald-500/40 bg-emerald-500/10">
                  ✓ {size}
                </Badge>
              ))}
              {drawerSizeData.partial.map(size => (
                <Badge key={`w-${size}`} variant="outline" className="text-xs px-2 py-0.5 font-semibold text-amber-700 border-amber-500/40 bg-amber-500/10">
                  ⚠ {size}
                </Badge>
              ))}
              {drawerSizeData.missing.map(size => (
                <Badge key={`m-${size}`} variant="outline" className="text-xs px-2 py-0.5 font-bold text-destructive border-destructive/40 bg-destructive/5">
                  ✗ {size}
                </Badge>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-3">
              <span><span className="text-emerald-700">✓</span> Đủ hàng</span>
              <span><span className="text-amber-700">⚠</span> Lẻ (thiếu ở một số store)</span>
              <span><span className="text-destructive">✗</span> Hết toàn bộ</span>
            </div>
            {evidenceRow?.core_size_missing && (
              <p className="text-xs text-destructive font-medium">⚠️ Bao gồm size core — ảnh hưởng trực tiếp đến doanh thu</p>
            )}
          </div>
        )}

        {/* Surplus stores */}
        {surplusStores.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-emerald-600" /> Nguồn Hàng Khả Dụng
            </h4>
            <p className="text-[10px] text-muted-foreground">
              Cửa hàng đang có tồn kho size thiếu/lẻ — có thể điều chuyển
            </p>
            <div className="space-y-1.5">
              {surplusStores.map(s => (
                <div key={s.store_id} className="flex items-center justify-between text-xs p-2 rounded-md bg-emerald-500/5 border border-emerald-500/15">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Store className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span className="font-medium truncate">{s.store_name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {Object.entries(s.sizes).map(([size, qty]) => (
                      <Badge key={size} variant="outline" className="text-[9px] px-1.5 py-0 h-5 font-semibold text-emerald-700 border-emerald-500/40 bg-emerald-500/10">
                        {size}: {qty}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Basic info from detail row */}
        {!evidencePack && evidenceRow && (
          <div className="space-y-4 mb-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/50">
                <span className="text-muted-foreground">Sức Khỏe</span>
                <p className={`font-bold text-lg ${
                  evidenceRow.size_health_score < 40 ? 'text-destructive' :
                  evidenceRow.size_health_score < 60 ? 'text-orange-600' : 'text-amber-600'
                }`}>{Math.round(evidenceRow.size_health_score)}</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <span className="text-muted-foreground">Trạng Thái</span>
                <p className="font-bold text-lg capitalize">{evidenceRow.curve_state}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-xs">
              {evidenceRow.lost_revenue_est > 0 && (
                <div className="p-2 rounded bg-destructive/5">
                  <span className="text-muted-foreground">DT Mất</span>
                  <p className="font-bold text-destructive">{formatVNDCompact(evidenceRow.lost_revenue_est)}</p>
                </div>
              )}
              {evidenceRow.cash_locked_value > 0 && (
                <div className="p-2 rounded bg-orange-500/5">
                  <span className="text-muted-foreground">Vốn Khóa</span>
                  <p className="font-bold text-orange-600">{formatVNDCompact(evidenceRow.cash_locked_value)}</p>
                </div>
              )}
              {evidenceRow.margin_leak_value > 0 && (
                <div className="p-2 rounded bg-destructive/5">
                  <span className="text-muted-foreground">Rò Biên</span>
                  <p className="font-bold text-destructive">{formatVNDCompact(evidenceRow.margin_leak_value)}</p>
                </div>
              )}
              {evidenceRow.markdown_eta_days && (
                <div className="p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">MD ETA</span>
                  <p className="font-bold">{evidenceRow.markdown_eta_days} ngày</p>
                </div>
              )}
            </div>
            {evidenceRow.markdown_risk_score >= 80 && (
              <div className="p-2 rounded bg-destructive/10 text-xs text-destructive font-medium">
                ⚠️ Rủi ro markdown cao ({evidenceRow.markdown_risk_score}%) — Cân nhắc thanh lý sớm
              </div>
            )}
          </div>
        )}

        {evidencePack ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={
                evidencePack.severity === 'critical' ? 'destructive' :
                evidencePack.severity === 'high' ? 'secondary' : 'default'
              } className="capitalize">{evidencePack.severity}</Badge>
              <span className="text-xs text-muted-foreground">{evidencePack.as_of_date}</span>
            </div>

            <Separator />

            {evidencePack.data_snapshot?.health && (
              <div className="space-y-1">
                <h4 className="text-sm font-semibold flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Sức Khỏe Size</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">Điểm</span>
                    <p className="font-bold text-lg">{evidencePack.data_snapshot.health.score?.toFixed(0)}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">Trạng Thái</span>
                    <p className="font-bold text-lg capitalize">{evidencePack.data_snapshot.health.state}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">Thiếu Size Chính</span>
                    <p className="font-semibold">{evidencePack.data_snapshot.health.core_missing ? 'Có ⚠️' : 'Không'}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">Độ Lệch</span>
                    <p className="font-semibold">{evidencePack.data_snapshot.health.deviation?.toFixed(3)}</p>
                  </div>
                </div>
              </div>
            )}

            {evidencePack.data_snapshot?.lost_revenue && (
              <>
                <Separator />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Doanh Thu Mất</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-destructive/5">
                      <span className="text-muted-foreground">DT Mất</span>
                      <p className="font-bold text-destructive">{formatVNDCompact(evidencePack.data_snapshot.lost_revenue.revenue)}</p>
                    </div>
                    <div className="p-2 rounded bg-destructive/5">
                      <span className="text-muted-foreground">SL Mất</span>
                      <p className="font-bold">{evidencePack.data_snapshot.lost_revenue.units}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Nguyên nhân: {evidencePack.data_snapshot.lost_revenue.driver}</p>
                </div>
              </>
            )}

            {evidencePack.data_snapshot?.cash_lock && (
              <>
                <Separator />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Vốn Bị Khóa</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded bg-orange-500/5">
                      <span className="text-muted-foreground">Bị Khóa</span>
                      <p className="font-bold text-orange-600">{formatVNDCompact(evidencePack.data_snapshot.cash_lock.value)}</p>
                    </div>
                    <div className="p-2 rounded bg-orange-500/5">
                      <span className="text-muted-foreground">Tỷ Lệ</span>
                      <p className="font-bold">{evidencePack.data_snapshot.cash_lock.pct}%</p>
                    </div>
                    <div className="p-2 rounded bg-orange-500/5">
                      <span className="text-muted-foreground">Giải Phóng</span>
                      <p className="font-bold">{evidencePack.data_snapshot.cash_lock.release_days}d</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {evidencePack.data_snapshot?.markdown_risk && (
              <>
                <Separator />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5" /> Rủi Ro Giảm Giá</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Điểm Rủi Ro</span>
                      <p className="font-bold">{evidencePack.data_snapshot.markdown_risk.score}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">ETA</span>
                      <p className="font-bold">{evidencePack.data_snapshot.markdown_risk.eta_days}d</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Lý do: {evidencePack.data_snapshot.markdown_risk.reason}</p>
                </div>
              </>
            )}

            {evidencePack.data_snapshot?.margin_leak && (
              <>
                <Separator />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5"><Flame className="h-3.5 w-3.5" /> Rò Rỉ Biên LN</h4>
                  <div className="p-2 rounded bg-red-500/5 text-xs">
                    <span className="text-muted-foreground">Tổng Rò Rỉ</span>
                    <p className="font-bold text-red-600">{formatVNDCompact(evidencePack.data_snapshot.margin_leak.total)}</p>
                  </div>
                  {evidencePack.data_snapshot.margin_leak.drivers?.map((d: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs px-2">
                      <span className="text-muted-foreground capitalize">{d.driver.replace('_', ' ')}</span>
                      <span className="font-medium">{formatVNDCompact(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Separator />
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold mb-1">Bảng Nguồn</p>
              <div className="flex flex-wrap gap-1">
                {evidencePack.source_tables?.map((t: string) => (
                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            </div>
          </div>
        ) : !evidenceRow ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Không có dữ liệu chi tiết</div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
