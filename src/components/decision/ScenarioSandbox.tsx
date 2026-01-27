import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Package, Settings2, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ScenarioModifiers {
  revenueMultiplier: number;
  cogsMultiplier: number;
  opexMultiplier: number;
  volumeMultiplier: number;
}

interface ScenarioPreset {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  modifiers: ScenarioModifiers;
  color: string;
}

const presets: ScenarioPreset[] = [
  {
    id: 'inflation',
    name: 'Lạm phát cao',
    icon: TrendingUp,
    description: 'COGS +15%, OPEX +10%',
    modifiers: { revenueMultiplier: 1, cogsMultiplier: 1.15, opexMultiplier: 1.10, volumeMultiplier: 1 },
    color: 'text-destructive',
  },
  {
    id: 'supply-shock',
    name: 'Thiếu hụt cung',
    icon: Package,
    description: 'COGS +25%, Volume -20%',
    modifiers: { revenueMultiplier: 1, cogsMultiplier: 1.25, opexMultiplier: 1, volumeMultiplier: 0.8 },
    color: 'text-warning',
  },
  {
    id: 'demand-surge',
    name: 'Nhu cầu tăng',
    icon: Zap,
    description: 'Revenue +20%, Volume +30%',
    modifiers: { revenueMultiplier: 1.20, cogsMultiplier: 1, opexMultiplier: 1, volumeMultiplier: 1.3 },
    color: 'text-success',
  },
];

const defaultModifiers: ScenarioModifiers = {
  revenueMultiplier: 1,
  cogsMultiplier: 1,
  opexMultiplier: 1,
  volumeMultiplier: 1,
};

interface ScenarioSandboxProps {
  modifiers: ScenarioModifiers;
  onModifiersChange: (modifiers: ScenarioModifiers) => void;
  className?: string;
}

export function ScenarioSandbox({ modifiers, onModifiersChange, className }: ScenarioSandboxProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  const handlePresetToggle = (preset: ScenarioPreset) => {
    if (activePreset === preset.id) {
      // Deactivate
      setActivePreset(null);
      onModifiersChange(defaultModifiers);
    } else {
      // Activate
      setActivePreset(preset.id);
      onModifiersChange(preset.modifiers);
    }
  };

  const handleReset = () => {
    setActivePreset(null);
    onModifiersChange(defaultModifiers);
  };

  const isModified = JSON.stringify(modifiers) !== JSON.stringify(defaultModifiers);

  const formatModifier = (value: number) => {
    const percent = (value - 1) * 100;
    if (percent === 0) return '0%';
    return percent > 0 ? `+${percent.toFixed(0)}%` : `${percent.toFixed(0)}%`;
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Kịch bản kinh tế</h3>
              <p className="text-xs text-muted-foreground">Mô phỏng tác động lên chi phí</p>
            </div>
          </div>
          {isModified && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const Icon = preset.icon;
            const isActive = activePreset === preset.id;
            
            return (
              <motion.button
                key={preset.id}
                onClick={() => handlePresetToggle(preset)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all',
                  isActive
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className={cn('h-4 w-4', isActive ? preset.color : 'text-muted-foreground')} />
                <div className="text-left">
                  <p className={cn('text-sm font-medium', isActive && 'text-primary')}>{preset.name}</p>
                  <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                </div>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-2 w-2 rounded-full bg-primary ml-1"
                  />
                )}
              </motion.button>
            );
          })}

          {/* Custom settings popover */}
          <Popover open={customOpen} onOpenChange={setCustomOpen}>
            <PopoverTrigger asChild>
              <motion.button
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all',
                  !activePreset && isModified
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-dashed border-border bg-card hover:border-primary/50'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-medium">Tùy chỉnh</p>
                  {!activePreset && isModified ? (
                    <p className="text-[10px] text-muted-foreground">Đang áp dụng</p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Điều chỉnh thủ công</p>
                  )}
                </div>
              </motion.button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Tùy chỉnh kịch bản</h4>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-xs">Doanh thu</Label>
                      <Badge variant="outline" className="text-xs font-mono">
                        {formatModifier(modifiers.revenueMultiplier)}
                      </Badge>
                    </div>
                    <Slider
                      value={[modifiers.revenueMultiplier * 100]}
                      onValueChange={([v]) => {
                        setActivePreset(null);
                        onModifiersChange({ ...modifiers, revenueMultiplier: v / 100 });
                      }}
                      min={70}
                      max={150}
                      step={5}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-xs">Chi phí hàng bán (COGS)</Label>
                      <Badge variant="outline" className="text-xs font-mono">
                        {formatModifier(modifiers.cogsMultiplier)}
                      </Badge>
                    </div>
                    <Slider
                      value={[modifiers.cogsMultiplier * 100]}
                      onValueChange={([v]) => {
                        setActivePreset(null);
                        onModifiersChange({ ...modifiers, cogsMultiplier: v / 100 });
                      }}
                      min={70}
                      max={150}
                      step={5}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-xs">Chi phí vận hành (OPEX)</Label>
                      <Badge variant="outline" className="text-xs font-mono">
                        {formatModifier(modifiers.opexMultiplier)}
                      </Badge>
                    </div>
                    <Slider
                      value={[modifiers.opexMultiplier * 100]}
                      onValueChange={([v]) => {
                        setActivePreset(null);
                        onModifiersChange({ ...modifiers, opexMultiplier: v / 100 });
                      }}
                      min={70}
                      max={150}
                      step={5}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-xs">Sản lượng</Label>
                      <Badge variant="outline" className="text-xs font-mono">
                        {formatModifier(modifiers.volumeMultiplier)}
                      </Badge>
                    </div>
                    <Slider
                      value={[modifiers.volumeMultiplier * 100]}
                      onValueChange={([v]) => {
                        setActivePreset(null);
                        onModifiersChange({ ...modifiers, volumeMultiplier: v / 100 });
                      }}
                      min={50}
                      max={150}
                      step={5}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Active modifiers summary */}
        {isModified && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-3 border-t border-border"
          >
            <div className="flex flex-wrap gap-2">
              {modifiers.revenueMultiplier !== 1 && (
                <Badge variant="secondary" className="text-xs">
                  Revenue: {formatModifier(modifiers.revenueMultiplier)}
                </Badge>
              )}
              {modifiers.cogsMultiplier !== 1 && (
                <Badge variant="secondary" className="text-xs">
                  COGS: {formatModifier(modifiers.cogsMultiplier)}
                </Badge>
              )}
              {modifiers.opexMultiplier !== 1 && (
                <Badge variant="secondary" className="text-xs">
                  OPEX: {formatModifier(modifiers.opexMultiplier)}
                </Badge>
              )}
              {modifiers.volumeMultiplier !== 1 && (
                <Badge variant="secondary" className="text-xs">
                  Volume: {formatModifier(modifiers.volumeMultiplier)}
                </Badge>
              )}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
