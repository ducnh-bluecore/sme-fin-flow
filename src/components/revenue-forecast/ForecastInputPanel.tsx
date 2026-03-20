import { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Settings2, Calculator, Info, CalendarIcon, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ForecastParams } from '@/hooks/useRevenueForecast';

function fmtVnd(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B₫`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M₫`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K₫`;
  return n.toLocaleString('vi-VN') + '₫';
}

interface Props {
  params: ForecastParams;
  onChange: (params: ForecastParams) => void;
  isLoading?: boolean;
  historicalAvgAdsSpend?: number | null;
  hasAdsData?: boolean;
}

export function ForecastInputPanel({ params, onChange, isLoading, historicalAvgAdsSpend, hasAdsData }: Props) {
  const [draft, setDraft] = useState<ForecastParams>(params);
  const horizonOptions = [1, 3, 6];

  const handleCalculate = () => {
    onChange(draft);
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

        {/* Ads Spend - Now "Additional" */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Chi phí Ads bổ sung/tháng (VNĐ)</Label>
          <Input
            type="number"
            value={draft.adsSpend}
            onChange={(e) => setDraft({ ...draft, adsSpend: Number(e.target.value) || 0 })}
            className="h-8 text-sm"
          />
          {/* Baseline explanation */}
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

        {/* Calculate Button */}
        <Button
          onClick={handleCalculate}
          disabled={isLoading}
          className="w-full"
          size="sm"
        >
          <Calculator className="h-4 w-4 mr-2" />
          {isLoading ? 'Đang tính toán...' : 'Tính toán dự báo'}
        </Button>
      </CardContent>
    </Card>
  );
}
