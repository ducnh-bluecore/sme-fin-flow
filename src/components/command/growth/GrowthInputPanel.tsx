import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DEFAULTS, type SimulationParams } from './types';

interface Props {
  params: SimulationParams;
  onChange: (params: SimulationParams) => void;
}

export default function GrowthInputPanel({ params, onChange }: Props) {
  const [invOpen, setInvOpen] = useState(false);
  const [constOpen, setConstOpen] = useState(false);

  const update = (patch: Partial<SimulationParams>) => onChange({ ...params, ...patch });

  return (
    <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
      {/* Row 1: Growth + Horizon */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
        <div className="flex-1 w-full space-y-2">
          <label className="text-sm font-medium">Mục tiêu tăng trưởng</label>
          <div className="flex items-center gap-3">
            <Slider
              value={[params.growthPct]}
              onValueChange={v => update({ growthPct: v[0] })}
              min={10} max={100} step={5}
              className="flex-1"
            />
            <span className="text-lg font-bold text-primary w-16 text-right">+{params.growthPct}%</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Khung thời gian</label>
          <Select value={String(params.horizonMonths)} onValueChange={v => update({ horizonMonths: Number(v) })}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 tháng</SelectItem>
              <SelectItem value="6">6 tháng</SelectItem>
              <SelectItem value="12">12 tháng</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Inventory Policy */}
      <Collapsible open={invOpen} onOpenChange={setInvOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full">
          <ChevronDown className={`h-4 w-4 transition-transform ${invOpen ? 'rotate-180' : ''}`} />
          Chính sách tồn kho
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">DOC Hero ({params.docHero} ngày)</label>
              <Slider value={[params.docHero]} onValueChange={v => update({ docHero: v[0] })} min={45} max={90} step={5} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">DOC Non-Hero ({params.docNonHero} ngày)</label>
              <Slider value={[params.docNonHero]} onValueChange={v => update({ docNonHero: v[0] })} min={15} max={60} step={5} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Safety Stock ({params.safetyStockPct}%)</label>
              <Slider value={[params.safetyStockPct]} onValueChange={v => update({ safetyStockPct: v[0] })} min={5} max={30} step={1} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Constraints */}
      <Collapsible open={constOpen} onOpenChange={setConstOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full">
          <ChevronDown className={`h-4 w-4 transition-transform ${constOpen ? 'rotate-180' : ''}`} />
          Ràng buộc (optional)
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Cash Cap (VND)</label>
              <Input
                type="number"
                placeholder="Không giới hạn"
                value={params.cashCap || ''}
                onChange={e => update({ cashCap: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Capacity Cap (SL/tháng)</label>
              <Input
                type="number"
                placeholder="Không giới hạn"
                value={params.capacityCap || ''}
                onChange={e => update({ capacityCap: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Overstock Threshold ({params.overstockThreshold}x)</label>
              <Slider value={[params.overstockThreshold * 10]} onValueChange={v => update({ overstockThreshold: v[0] / 10 })} min={10} max={30} step={1} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
