import { useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Eye, CheckCircle, Lock, Flame, DollarSign, TrendingDown, ChevronDown, Loader2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatVNDCompact } from '@/lib/formatters';
import type { SizeHealthGroupSummary, SizeHealthDetailRow } from '@/hooks/inventory/useSizeHealthGroups';

interface SizeHealthActionGroupsProps {
  groups: SizeHealthGroupSummary[];
  isLoading: boolean;
  detailCache: Record<string, SizeHealthDetailRow[]>;
  loadingStates: Record<string, boolean>;
  onExpandGroup: (curveState: string, loadMore?: boolean) => void;
  onViewEvidence?: (productId: string) => void;
  pageSize: number;
}

const STATE_CONFIG: Record<string, {
  icon: typeof ShieldAlert;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeVariant: 'destructive' | 'secondary' | 'outline' | 'default';
}> = {
  broken: {
    icon: ShieldAlert,
    color: 'text-destructive',
    bgColor: 'bg-destructive/5',
    borderColor: 'border-l-destructive',
    badgeVariant: 'destructive',
  },
  risk: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/5',
    borderColor: 'border-l-orange-500',
    badgeVariant: 'secondary',
  },
  watch: {
    icon: Eye,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/5',
    borderColor: 'border-l-amber-500',
    badgeVariant: 'outline',
  },
  healthy: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/5',
    borderColor: 'border-l-emerald-500',
    badgeVariant: 'default',
  },
};

export default function SizeHealthActionGroups({
  groups,
  isLoading,
  detailCache,
  loadingStates,
  onExpandGroup,
  onViewEvidence,
  pageSize,
}: SizeHealthActionGroupsProps) {
  // Auto-expand broken and risk on mount
  const defaultExpanded = groups
    .filter(g => (g.curve_state === 'broken' || g.curve_state === 'risk') && g.style_count > 0)
    .map(g => g.curve_state);

  const handleValueChange = (values: string[]) => {
    // Load details for newly expanded groups
    for (const state of values) {
      if (!detailCache[state]) {
        onExpandGroup(state);
      }
    }
  };

  // Auto-load details for default expanded groups
  useEffect(() => {
    for (const state of defaultExpanded) {
      if (!detailCache[state]) {
        onExpandGroup(state);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.length]);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
        Loading action groups...
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No size health data</p>
        <p className="text-xs mt-1">Click "Run Engine" to compute Size Intelligence</p>
      </div>
    );
  }

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultExpanded}
      onValueChange={handleValueChange}
      className="space-y-3"
    >
      {groups.map((group) => {
        const config = STATE_CONFIG[group.curve_state] || STATE_CONFIG.watch;
        const Icon = config.icon;
        const details = detailCache[group.curve_state] || [];
        const isDetailLoading = loadingStates[group.curve_state];
        const hasMore = details.length < group.style_count && details.length >= pageSize;

        return (
          <AccordionItem
            key={group.curve_state}
            value={group.curve_state}
            className={`border rounded-lg border-l-4 ${config.borderColor} overflow-hidden`}
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center justify-between w-full mr-2">
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <span className="font-semibold capitalize">{group.curve_state}</span>
                  <Badge variant={config.badgeVariant} className="text-xs">
                    {group.style_count} styles
                  </Badge>
                  {group.core_missing_count > 0 && (
                    <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                      {group.core_missing_count} core missing
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {group.total_lost_revenue > 0 && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span className="text-destructive font-semibold">{formatVNDCompact(group.total_lost_revenue)}</span>
                    </span>
                  )}
                  {group.total_cash_locked > 0 && (
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      <span className="text-orange-600 font-semibold">{formatVNDCompact(group.total_cash_locked)}</span>
                    </span>
                  )}
                  {group.total_margin_leak > 0 && (
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      <span className="text-red-600 font-semibold">{formatVNDCompact(group.total_margin_leak)}</span>
                    </span>
                  )}
                  {group.high_md_risk_count > 0 && (
                    <span className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      <span>{group.high_md_risk_count} MD risk</span>
                    </span>
                  )}
                  {group.curve_state === 'healthy' && (
                    <span>Avg score: {Number(group.avg_health_score).toFixed(0)}</span>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0">
              {isDetailLoading && details.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 mx-auto animate-spin mb-1" />
                  Loading details...
                </div>
              ) : details.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-xs">No detail data</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Style</TableHead>
                        <TableHead className="text-center text-xs">Health</TableHead>
                        <TableHead className="text-right text-xs">Lost Rev</TableHead>
                        <TableHead className="text-right text-xs">Cash Lock</TableHead>
                        <TableHead className="text-right text-xs">Margin Leak</TableHead>
                        <TableHead className="text-center text-xs">MD Risk</TableHead>
                        <TableHead className="text-center text-xs">ETA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details.map((row) => (
                        <TableRow
                          key={row.product_id}
                          className={onViewEvidence ? 'cursor-pointer hover:bg-muted/50' : ''}
                          onClick={() => onViewEvidence?.(row.product_id)}
                        >
                          <TableCell className="text-xs font-medium max-w-[200px] truncate">
                            {row.product_name}
                            {row.core_size_missing && (
                              <Badge variant="outline" className="ml-1.5 text-[10px] text-destructive border-destructive/30">core</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-semibold text-sm ${
                              row.size_health_score >= 80 ? 'text-emerald-600' :
                              row.size_health_score >= 60 ? 'text-amber-600' :
                              row.size_health_score >= 40 ? 'text-orange-600' : 'text-destructive'
                            }`}>
                              {Number(row.size_health_score).toFixed(0)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium">
                            {row.lost_revenue_est > 0 
                              ? <span className="text-destructive">{formatVNDCompact(row.lost_revenue_est)}</span> 
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium">
                            {row.cash_locked_value > 0 
                              ? <span className="text-orange-600">{formatVNDCompact(row.cash_locked_value)}</span> 
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium">
                            {row.margin_leak_value > 0 
                              ? <span className="text-red-600">{formatVNDCompact(row.margin_leak_value)}</span> 
                              : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.markdown_risk_score > 0 ? (
                              <span className={`font-semibold text-xs ${
                                row.markdown_risk_score >= 80 ? 'text-destructive' :
                                row.markdown_risk_score >= 60 ? 'text-orange-600' :
                                row.markdown_risk_score >= 40 ? 'text-amber-600' : 'text-muted-foreground'
                              }`}>
                                {Number(row.markdown_risk_score).toFixed(0)}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {row.markdown_eta_days ? `${row.markdown_eta_days}d` : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {(hasMore || isDetailLoading) && (
                    <div className="flex justify-center py-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDetailLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          onExpandGroup(group.curve_state, true);
                        }}
                      >
                        {isDetailLoading ? (
                          <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Loading...</>
                        ) : (
                          <>Load more ({details.length}/{group.style_count})</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
