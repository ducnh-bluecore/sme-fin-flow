import { useState } from 'react';
import { format, parse } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Settings2, Calculator, Info, CalendarIcon, FlaskConical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ForecastParams } from '@/hooks/useRevenueForecast';

function fmtVnd(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B₫`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M₫`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K₫`;
  return n.toLocaleString('vi-VN') + '₫';
}

function generateMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const months: { value: string; label: string }[] = [];
  // Go back 24 months from current month
  for (let i = 1; i <= 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = format(d, 'yyyy-MM');
    const label = format(d, 'MM/yyyy');
    months.push({ value, label });
  }
  return months;
}

interface Props {
  params: ForecastParams;
  onChange: (params: ForecastParams) => void;
  isLoading?: boolean;
  historicalAvgAdsSpend?: number | null;
  hasAdsData?: boolean;
}

export function ForecastInputPanel({ params, onChange, isLoading, historicalAvgAdsSpend, hasAdsData }: Props) {
  const [draft, setDraft] = useState<ForecastParams>({ ...params, asOfDate: params.asOfDate || null });
  const [backtestEnabled, setBacktestEnabled] = useState(!!params.asOfDate);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(
    params.asOfDate ? [params.asOfDate.substring(0, 7)] : []
  );
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const horizonOptions = [1, 3, 6];
  const monthOptions = generateMonthOptions();

  const toggleMonth = (monthValue: string) => {
    setSelectedMonths((prev) => {
      const next = prev.includes(monthValue)
        ? prev.filter((m) => m !== monthValue)
        : [...prev, monthValue].sort();
      // Use last day of the earliest selected month as asOfDate
      if (next.length > 0) {
        const earliest = next[0];
        const [y, m] = earliest.split('-').map(Number);
        // Last day of that month
        const lastDay = new Date(y, m, 0);
        const dateStr = format(lastDay, 'yyyy-MM-dd');
        setDraft((d) => ({ ...d, asOfDate: dateStr }));
      } else {
        setDraft((d) => ({ ...d, asOfDate: null }));
      }
      return next;
    });
  };

  const handleCalculate = () => {
    onChange({ ...draft, asOfDate: backtestEnabled ? draft.asOfDate : null });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Tham số dự báo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Horizon */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Khoảng thời gian</Label>
          <div className="flex gap-1">
            {horizonOptions.map((h) => (
              <Button
                key={h}
                size="sm"
                variant={draft.horizonMonths === h ? 'default' : 'outline'}
                className="flex-1 text-xs"
                onClick={() => setDraft({ ...draft, horizonMonths: h })}
              >
                {h} tháng
              </Button>
            ))}
          </div>
        </div>

        {/* Ads Spend */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Chi phí Ads bổ sung/tháng (VNĐ)</Label>
          <Input
            type="number"
            value={draft.adsSpend}
            onChange={(e) => setDraft({ ...draft, adsSpend: Number(e.target.value) || 0 })}
            className="h-8 text-sm"
          />
          <div className="rounded-md bg-muted/60 px-2.5 py-2 space-y-1">
            <div className="flex items-start gap-1.5">
              <Info className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground leading-tight">
                <strong>Baseline đã bao gồm hiệu quả ads lịch sử.</strong> Doanh thu quá khứ trong hệ thống bao gồm cả đơn hàng từ quảng cáo đã chạy.
              </p>
            </div>
            {hasAdsData && historicalAvgAdsSpend != null && historicalAvgAdsSpend > 0 && (
              <p className="text-[10px] text-primary font-medium ml-[18px]">
                TB ads lịch sử: {fmtVnd(historicalAvgAdsSpend)}/tháng
              </p>
            )}
            {draft.adsSpend === 0 ? (
              <p className="text-[10px] text-muted-foreground ml-[18px] leading-tight">
                = 0₫ → Dự báo duy trì mức chi tiêu ads như hiện tại (status quo). Không phải "ngừng ads".
              </p>
            ) : (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-[18px] leading-tight">
                + {fmtVnd(draft.adsSpend)}/tháng → Dự báo sẽ tính thêm doanh thu từ ngân sách ads <strong>bổ sung</strong> này.
              </p>
            )}
          </div>
        </div>

        {/* ROAS Override */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            ROAS {draft.roasOverride === null ? '(tự động)' : `(${draft.roasOverride}x)`}
          </Label>
          <Input
            type="number"
            step="0.1"
            placeholder="Để trống = tự động"
            value={draft.roasOverride ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                roasOverride: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="h-8 text-sm"
          />
        </div>

        {/* Growth Adjustment */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Tăng trưởng/tháng: {(draft.growthAdj * 100).toFixed(0)}%
          </Label>
          <Slider
            value={[draft.growthAdj * 100]}
            onValueChange={([v]) => setDraft({ ...draft, growthAdj: v / 100 })}
            min={-20}
            max={30}
            step={1}
            className="py-2"
          />
        </div>

        {/* Backtest Mode */}
        <div className="space-y-2 rounded-lg border border-dashed border-muted-foreground/30 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs font-medium">Backtest (thử nghiệm quá khứ)</Label>
            </div>
            <Switch
              checked={backtestEnabled}
              onCheckedChange={(checked) => {
                setBacktestEnabled(checked);
                if (!checked) {
                  setDraft({ ...draft, asOfDate: null });
                  setSelectedMonths([]);
                }
              }}
            />
          </div>
          {backtestEnabled && (
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground">
                Chọn tháng để backtest (có thể chọn nhiều tháng)
              </Label>
              <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-auto min-h-8 text-sm py-1.5',
                      selectedMonths.length === 0 && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                    {selectedMonths.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {selectedMonths.map((m) => (
                          <span
                            key={m}
                            className="inline-flex items-center gap-0.5 rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-medium"
                          >
                            {m.split('-').reverse().join('/')}
                          </span>
                        ))}
                      </span>
                    ) : (
                      'Chọn tháng backtest...'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 pointer-events-auto" align="start">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Chọn tháng</p>
                    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                      {monthOptions.map((opt) => (
                        <Button
                          key={opt.value}
                          size="sm"
                          variant={selectedMonths.includes(opt.value) ? 'default' : 'outline'}
                          className="text-[11px] h-7 px-1"
                          onClick={() => toggleMonth(opt.value)}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                    {selectedMonths.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs h-7 text-muted-foreground"
                        onClick={() => {
                          setSelectedMonths([]);
                          setDraft((d) => ({ ...d, asOfDate: null }));
                        }}
                      >
                        <X className="h-3 w-3 mr-1" /> Bỏ chọn tất cả
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {selectedMonths.length > 0 && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  ⚠ Chế độ backtest: Dự báo sẽ chạy từ cuối tháng {selectedMonths[0].split('-').reverse().join('/')}
                  {selectedMonths.length > 1 && ` (${selectedMonths.length} tháng được chọn)`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Calculate Button */}
        <Button
          onClick={handleCalculate}
          disabled={isLoading}
          className="w-full"
          size="sm"
        >
          <Calculator className="h-4 w-4 mr-2" />
          {isLoading ? 'Đang tính toán...' : backtestEnabled && selectedMonths.length > 0 ? 'Chạy Backtest' : 'Tính toán dự báo'}
        </Button>
      </CardContent>
    </Card>
  );
}
