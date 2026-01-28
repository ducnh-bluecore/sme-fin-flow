import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layers, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveAlerts } from '@/hooks/useAlertInstances';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * SIGNALS PAGE - Module-specific drill-down
 * 
 * FDP | MDP | CDP tabs with:
 * - Signals table per module
 * - Filters: Status, Severity, Owner
 */

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000_000) return `₫${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `₫${(amount / 1_000_000).toFixed(0)}M`;
  return `₫${amount.toLocaleString('vi-VN')}`;
};

type ModuleType = 'FDP' | 'MDP' | 'CDP';

const moduleCategories: Record<ModuleType, string[]> = {
  FDP: ['finance', 'cash', 'margin', 'revenue', 'expense'],
  MDP: ['marketing', 'channel', 'campaign', 'roas', 'cpa'],
  CDP: ['customer', 'segment', 'churn', 'ltv', 'retention'],
};

export default function SignalsPage() {
  const [activeModule, setActiveModule] = useState<ModuleType>('FDP');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const { data: alerts = [], isLoading } = useActiveAlerts();

  // Filter alerts by module
  const moduleAlerts = useMemo(() => {
    const categories = moduleCategories[activeModule];
    return alerts.filter(a => 
      categories.some(cat => a.category?.toLowerCase().includes(cat) || a.alert_type?.toLowerCase().includes(cat))
    );
  }, [alerts, activeModule]);

  // Apply filters
  const filteredAlerts = useMemo(() => {
    return moduleAlerts.filter(alert => {
      if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
      return true;
    });
  }, [moduleAlerts, statusFilter, severityFilter]);

  // Count by module
  const moduleCounts = useMemo(() => ({
    FDP: alerts.filter(a => moduleCategories.FDP.some(cat => a.category?.toLowerCase().includes(cat))).length,
    MDP: alerts.filter(a => moduleCategories.MDP.some(cat => a.category?.toLowerCase().includes(cat))).length,
    CDP: alerts.filter(a => moduleCategories.CDP.some(cat => a.category?.toLowerCase().includes(cat))).length,
  }), [alerts]);

  return (
    <>
      <Helmet>
        <title>Signals | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <div>
              <h1 className="text-lg font-semibold">Module Signals</h1>
              <p className="text-sm text-muted-foreground">
                {alerts.length} tổng signals từ tất cả modules
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Module Tabs */}
        <Tabs value={activeModule} onValueChange={(v) => setActiveModule(v as ModuleType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="FDP" className="gap-2">
              FDP
              {moduleCounts.FDP > 0 && (
                <Badge variant="secondary" className="ml-1">{moduleCounts.FDP}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="MDP" className="gap-2">
              MDP
              {moduleCounts.MDP > 0 && (
                <Badge variant="secondary" className="ml-1">{moduleCounts.MDP}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="CDP" className="gap-2">
              CDP
              {moduleCounts.CDP > 0 && (
                <Badge variant="secondary" className="ml-1">{moduleCounts.CDP}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeModule} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{activeModule} Signals ({filteredAlerts.length})</span>
                  {filteredAlerts.length !== moduleAlerts.length && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setStatusFilter('all');
                        setSeverityFilter('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading...</div>
                ) : filteredAlerts.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No signals in {activeModule}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
                      <div className="col-span-1">Type</div>
                      <div className="col-span-4">Signal</div>
                      <div className="col-span-2 text-right">Impact</div>
                      <div className="col-span-2">Owner</div>
                      <div className="col-span-2">Deadline</div>
                      <div className="col-span-1">Status</div>
                    </div>

                    {/* Table Rows */}
                    {filteredAlerts.map((alert) => (
                      <div 
                        key={alert.id}
                        className={cn(
                          'grid grid-cols-12 gap-4 px-3 py-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors',
                          alert.severity === 'critical' && 'bg-destructive/5 border-l-2 border-l-destructive'
                        )}
                      >
                        <div className="col-span-1">
                          <Badge 
                            variant={alert.severity === 'critical' ? 'destructive' : 'outline'}
                            className="text-xs"
                          >
                            {alert.severity?.charAt(0).toUpperCase()}
                          </Badge>
                        </div>
                        <div className="col-span-4">
                          <p className="font-medium truncate">{alert.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{alert.alert_type}</p>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className={cn(
                            'font-semibold',
                            (alert.impact_amount || 0) > 0 ? 'text-destructive' : 'text-muted-foreground'
                          )}>
                            {alert.impact_amount ? formatCurrency(alert.impact_amount) : '—'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-sm">{(alert as any).assigned_to || 'Unassigned'}</span>
                        </div>
                        <div className="col-span-2">
                          {alert.deadline_at ? (
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(alert.deadline_at), { locale: vi, addSuffix: false })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                        <div className="col-span-1">
                          <Badge variant="outline" className="text-xs">
                            {alert.status || 'active'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
