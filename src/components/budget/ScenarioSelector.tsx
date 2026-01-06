import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Target, Star } from 'lucide-react';

interface SimpleScenario {
  id: string;
  name: string;
  is_primary: boolean;
}

interface ScenarioSelectorProps {
  scenarios: SimpleScenario[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}

export function ScenarioSelector({ scenarios, selectedId, onSelect }: ScenarioSelectorProps) {
  if (scenarios.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        <Target className="h-4 w-4" />
        <span>Chưa có kịch bản nào</span>
      </div>
    );
  }

  return (
    <Select value={selectedId} onValueChange={onSelect}>
      <SelectTrigger className="w-[280px]">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <SelectValue placeholder="Chọn kịch bản" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {scenarios.map((scenario) => (
          <SelectItem key={scenario.id} value={scenario.id}>
            <div className="flex items-center gap-2">
              <span>{scenario.name}</span>
              {scenario.is_primary && (
                <Badge variant="outline" className="text-xs py-0 px-1 gap-1">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  Primary
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
