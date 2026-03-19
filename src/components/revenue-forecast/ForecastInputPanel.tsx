import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Settings2, Calculator } from 'lucide-react';
import type { ForecastParams } from '@/hooks/useRevenueForecast';

interface Props {
  params: ForecastParams;
  onChange: (params: ForecastParams) => void;
  isLoading?: boolean;
}

export function ForecastInputPanel({ params, onChange, isLoading }: Props) {
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

        {/* Ads Spend */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Chi phí Ads/tháng (VNĐ)</Label>
          <Input
            type="number"
            value={draft.adsSpend}
            onChange={(e) => setDraft({ ...draft, adsSpend: Number(e.target.value) || 0 })}
            className="h-8 text-sm"
          />
          {draft.adsSpend === 0 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight">
              = 0₫ → Dự báo chỉ tính doanh thu tự nhiên (không ads). Nhập số để xem thêm doanh thu từ ads.
            </p>
          )}
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
