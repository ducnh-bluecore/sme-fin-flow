import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Megaphone, 
  LineChart,
  AlertTriangle,
  Settings,
  Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type MDPMode = 'marketing' | 'cmo';

interface MDPLayoutProps {
  children: (mode: MDPMode) => React.ReactNode;
  criticalAlerts?: number;
  executionAlerts?: number;
}

export function MDPLayout({ children, criticalAlerts = 0, executionAlerts = 0 }: MDPLayoutProps) {
  const [mode, setMode] = useState<MDPMode>('marketing');

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <LineChart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Marketing Data Platform</h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'marketing' 
                ? 'Execution Mode — Điều khiển chiến dịch hằng ngày'
                : 'Decision Mode — Trách nhiệm lợi nhuận & Quyết định'
              }
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2 p-1 rounded-lg bg-muted/50 border border-border/50">
          <Button
            variant={mode === 'marketing' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('marketing')}
            className={cn(
              "gap-2 transition-all",
              mode === 'marketing' && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Marketing Mode</span>
            <span className="sm:hidden">Marketing</span>
            {executionAlerts > 0 && mode !== 'marketing' && (
              <Badge variant="outline" className="ml-1 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                {executionAlerts}
              </Badge>
            )}
          </Button>
          
          <Button
            variant={mode === 'cmo' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('cmo')}
            className={cn(
              "gap-2 transition-all",
              mode === 'cmo' && "bg-purple-600 hover:bg-purple-700"
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">CMO Mode</span>
            <span className="sm:hidden">CMO</span>
            {criticalAlerts > 0 && mode !== 'cmo' && (
              <Badge variant="outline" className="ml-1 bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                {criticalAlerts}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Mode Description */}
      <div className={cn(
        "p-4 rounded-lg border transition-colors",
        mode === 'marketing' 
          ? "bg-blue-500/5 border-blue-500/20"
          : "bg-purple-500/5 border-purple-500/20"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg shrink-0",
            mode === 'marketing' ? "bg-blue-500/10" : "bg-purple-500/10"
          )}>
            {mode === 'marketing' ? (
              <Megaphone className="h-4 w-4 text-blue-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-purple-400" />
            )}
          </div>
          <div className="flex-1">
            {mode === 'marketing' ? (
              <>
                <p className="text-sm font-medium text-blue-400">Marketing Mode (Execution)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Dành cho:</strong> Marketing team vận hành hằng ngày • 
                  <strong> Xem:</strong> Spend, Leads, CPA, ROAS, Funnel • 
                  <strong> Không thấy:</strong> Cash runway, Margin sau logistics, Decision stop/scale
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-purple-400">CMO Mode (Decision & Accountability)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Dành cho:</strong> CMO quyết định lớn • 
                  <strong> Xem:</strong> Profit Attribution, Cash Impact, Risk Alerts • 
                  <strong> Quyền:</strong> Approve/Reject scale, Feed to Control Tower
                </p>
              </>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium mb-1">Nguyên tắc MDP</p>
              <p className="text-xs text-muted-foreground">
                Một data, một logic, hai lens. Marketing Mode = đề xuất. CMO Mode = phê duyệt.
                Quyết định cuối không nằm ở Marketing Mode.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Mode Content */}
      <div className="transition-all">
        {children(mode)}
      </div>
    </div>
  );
}
