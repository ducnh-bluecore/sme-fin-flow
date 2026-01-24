import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Sparkles } from 'lucide-react';

export interface Scenario {
  name: string;
  retention_boost: number;
  aov_boost: number;
  discount_adjust: number;
}

interface ScenarioBuilderProps {
  scenarios: Scenario[];
  onScenariosChange: (scenarios: Scenario[]) => void;
  maxScenarios?: number;
}

const PRESET_SCENARIOS: Scenario[] = [
  { name: 'Tăng Retention 10%', retention_boost: 0.10, aov_boost: 0, discount_adjust: 0 },
  { name: 'Tăng AOV 15%', retention_boost: 0, aov_boost: 0.15, discount_adjust: 0 },
  { name: 'Tối ưu (Combo)', retention_boost: 0.05, aov_boost: 0.10, discount_adjust: -0.02 },
  { name: 'Rủi ro cao', retention_boost: -0.05, aov_boost: -0.05, discount_adjust: 0.03 },
];

export function ScenarioBuilder({ 
  scenarios, 
  onScenariosChange, 
  maxScenarios = 4 
}: ScenarioBuilderProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addScenario = (preset?: Scenario) => {
    if (scenarios.length >= maxScenarios) return;
    
    const newScenario: Scenario = preset || {
      name: `Kịch bản ${scenarios.length + 1}`,
      retention_boost: 0,
      aov_boost: 0,
      discount_adjust: 0,
    };
    
    onScenariosChange([...scenarios, newScenario]);
    setEditingIndex(scenarios.length);
  };

  const removeScenario = (index: number) => {
    onScenariosChange(scenarios.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const updateScenario = (index: number, updates: Partial<Scenario>) => {
    onScenariosChange(
      scenarios.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  const formatPercent = (value: number) => {
    const percent = (value * 100).toFixed(0);
    return value >= 0 ? `+${percent}%` : `${percent}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Xây dựng Kịch bản What-If
        </CardTitle>
        <CardDescription>
          Tạo các kịch bản để so sánh tác động lên Customer Equity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset buttons */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Kịch bản mẫu:</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_SCENARIOS.map((preset, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={scenarios.length >= maxScenarios}
                onClick={() => addScenario(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Active scenarios */}
        {scenarios.length > 0 && (
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Kịch bản đang so sánh:</Label>
            {scenarios.map((scenario, index) => (
              <div
                key={index}
                className="border rounded-lg p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Input
                    value={scenario.name}
                    onChange={(e) => updateScenario(index, { name: e.target.value })}
                    className="h-8 text-sm font-medium max-w-[200px]"
                  />
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Ret: {formatPercent(scenario.retention_boost)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      AOV: {formatPercent(scenario.aov_boost)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeScenario(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {editingIndex === index && (
                  <div className="grid gap-4 pt-2 border-t">
                    <div>
                      <div className="flex justify-between mb-1">
                        <Label className="text-xs">Retention Boost</Label>
                        <span className="text-xs font-medium">{formatPercent(scenario.retention_boost)}</span>
                      </div>
                      <Slider
                        value={[scenario.retention_boost * 100]}
                        onValueChange={([v]) => updateScenario(index, { retention_boost: v / 100 })}
                        min={-20}
                        max={30}
                        step={1}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <Label className="text-xs">AOV Boost</Label>
                        <span className="text-xs font-medium">{formatPercent(scenario.aov_boost)}</span>
                      </div>
                      <Slider
                        value={[scenario.aov_boost * 100]}
                        onValueChange={([v]) => updateScenario(index, { aov_boost: v / 100 })}
                        min={-20}
                        max={30}
                        step={1}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <Label className="text-xs">Discount Rate Adjust</Label>
                        <span className="text-xs font-medium">{formatPercent(scenario.discount_adjust)}</span>
                      </div>
                      <Slider
                        value={[scenario.discount_adjust * 100]}
                        onValueChange={([v]) => updateScenario(index, { discount_adjust: v / 100 })}
                        min={-5}
                        max={10}
                        step={0.5}
                      />
                    </div>
                  </div>
                )}

                {editingIndex !== index && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs w-full"
                    onClick={() => setEditingIndex(index)}
                  >
                    Chỉnh sửa chi tiết
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add custom scenario */}
        {scenarios.length < maxScenarios && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => addScenario()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm kịch bản tùy chỉnh
          </Button>
        )}

        {scenarios.length >= maxScenarios && (
          <p className="text-xs text-muted-foreground text-center">
            Đã đạt giới hạn {maxScenarios} kịch bản
          </p>
        )}
      </CardContent>
    </Card>
  );
}
