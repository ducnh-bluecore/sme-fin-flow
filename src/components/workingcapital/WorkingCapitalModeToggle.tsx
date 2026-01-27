import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, ChevronDown, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { WorkingCapitalMode, WorkingCapitalPeriod } from '@/hooks/useWorkingCapitalMode';

interface Props {
  mode: WorkingCapitalMode;
  period: WorkingCapitalPeriod;
  modes: Array<{ value: WorkingCapitalMode; label: string; description: string }>;
  onModeChange: (mode: WorkingCapitalMode) => void;
}

export function WorkingCapitalModeToggle({ mode, period, modes, onModeChange }: Props) {
  const currentMode = modes.find(m => m.value === mode);
  
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            {currentMode?.label}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          {modes.map((m) => (
            <DropdownMenuItem
              key={m.value}
              onClick={() => onModeChange(m.value)}
              className="flex flex-col items-start gap-0.5"
            >
              <span className={mode === m.value ? 'font-medium' : ''}>
                {m.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {m.description}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1">
              {period.label}
              <Info className="h-3 w-3" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p className="font-medium">{period.label}</p>
              <p className="text-muted-foreground">
                {period.start} → {period.end}
              </p>
              <p className="text-muted-foreground">{period.days} ngày</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
