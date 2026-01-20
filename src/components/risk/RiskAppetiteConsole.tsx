/**
 * Risk Appetite Console
 * Board-defined, System-enforced risk configuration
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Settings,
  History,
  Eye,
  Trash2,
  Power,
  RefreshCw,
  ChevronDown,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useActiveRiskAppetite,
  useRiskAppetites,
  useRiskAppetiteRules,
  useEvaluateRiskAppetite,
  useRiskBreaches,
  useCreateRiskAppetite,
  useUpdateRiskAppetiteStatus,
  useAddRiskRule,
  useUpdateRiskRule,
  useDeleteRiskRule,
  useDetectBreaches,
  useResolveBreach,
  getDomainLabel,
  getActionLabel,
  getSeverityColor,
  formatMetricValue,
  AVAILABLE_METRICS,
  type RiskAppetiteRule,
} from '@/hooks/useRiskAppetite';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// ========== SUB-COMPONENTS ==========

function RuleStatusBadge({ isBreached, severity }: { isBreached: boolean; severity: string }) {
  if (isBreached) {
    return (
      <Badge variant="outline" className={getSeverityColor(severity)}>
        <AlertTriangle className="h-3 w-3 mr-1" />
        Breached
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
      <CheckCircle className="h-3 w-3 mr-1" />
      OK
    </Badge>
  );
}

function AddRuleDialog({ appetiteId, onClose }: { appetiteId: string; onClose: () => void }) {
  const addRule = useAddRiskRule();
  const [form, setForm] = useState<{
    metric_code: string;
    operator: '<' | '<=' | '>' | '>=' | '=';
    threshold: string;
    action_on_breach: 'ALERT' | 'REQUIRE_APPROVAL' | 'BLOCK_AUTOMATION' | 'DISABLE_ML' | 'ESCALATE_TO_BOARD';
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>({
    metric_code: '',
    operator: '>',
    threshold: '',
    action_on_breach: 'ALERT',
    severity: 'medium',
  });

  const selectedMetric = AVAILABLE_METRICS.find(m => m.code === form.metric_code);

  const handleSubmit = () => {
    if (!selectedMetric || !form.threshold) return;

    addRule.mutate({
      risk_appetite_id: appetiteId,
      risk_domain: selectedMetric.domain as RiskAppetiteRule['risk_domain'],
      metric_code: form.metric_code,
      metric_label: selectedMetric.label,
      operator: form.operator,
      threshold: parseFloat(form.threshold),
      unit: selectedMetric.unit,
      action_on_breach: form.action_on_breach,
      severity: form.severity,
      is_enabled: true,
    }, {
      onSuccess: onClose,
    });
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Add Risk Rule</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Metric</Label>
          <Select value={form.metric_code} onValueChange={v => setForm(f => ({ ...f, metric_code: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select metric..." />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_METRICS.map(m => (
                <SelectItem key={m.code} value={m.code}>
                  {m.label} ({getDomainLabel(m.domain)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Operator</Label>
            <Select value={form.operator} onValueChange={(v: '<' | '<=' | '>' | '>=' | '=') => setForm(f => ({ ...f, operator: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="<">Less than (&lt;)</SelectItem>
                <SelectItem value="<=">Less or equal (≤)</SelectItem>
                <SelectItem value=">">Greater than (&gt;)</SelectItem>
                <SelectItem value=">=">Greater or equal (≥)</SelectItem>
                <SelectItem value="=">Equal (=)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Threshold {selectedMetric && `(${selectedMetric.unit})`}</Label>
            <Input
              type="number"
              step="0.01"
              value={form.threshold}
              onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
              placeholder="e.g. 15"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Action on Breach</Label>
            <Select value={form.action_on_breach} onValueChange={(v: 'ALERT' | 'REQUIRE_APPROVAL' | 'BLOCK_AUTOMATION' | 'DISABLE_ML' | 'ESCALATE_TO_BOARD') => setForm(f => ({ ...f, action_on_breach: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALERT">Create Alert</SelectItem>
                <SelectItem value="REQUIRE_APPROVAL">Require Approval</SelectItem>
                <SelectItem value="BLOCK_AUTOMATION">Block Automation</SelectItem>
                <SelectItem value="DISABLE_ML">Disable ML</SelectItem>
                <SelectItem value="ESCALATE_TO_BOARD">Escalate to Board</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v: 'low' | 'medium' | 'high' | 'critical') => setForm(f => ({ ...f, severity: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!form.metric_code || !form.threshold || addRule.isPending}>
          {addRule.isPending ? 'Adding...' : 'Add Rule'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function RulesTable({ appetiteId }: { appetiteId: string }) {
  const { data: rules, isLoading } = useRiskAppetiteRules(appetiteId);
  const { data: evaluation } = useEvaluateRiskAppetite();
  const updateRule = useUpdateRiskRule();
  const deleteRule = useDeleteRiskRule();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  const getEvaluation = (ruleId: string) => {
    return evaluation?.evaluations.find(e => e.ruleId === ruleId);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Risk Rules</h3>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <AddRuleDialog appetiteId={appetiteId} onClose={() => setAddDialogOpen(false)} />
        </Dialog>
      </div>

      {!rules?.length ? (
        <div className="text-center py-8 text-muted-foreground">
          No rules defined. Add your first risk rule above.
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => {
            const evalResult = getEvaluation(rule.id);
            return (
              <div
                key={rule.id}
                className={cn(
                  'p-4 rounded-lg border bg-card',
                  evalResult?.isBreached && 'border-destructive/50'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getDomainLabel(rule.risk_domain)}
                      </Badge>
                      <span className="font-medium">{rule.metric_label}</span>
                      {evalResult && (
                        <RuleStatusBadge isBreached={evalResult.isBreached} severity={rule.severity} />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Trigger when value {rule.operator} {formatMetricValue(rule.threshold, rule.unit)}
                      {evalResult && (
                        <span className="ml-2">
                          (Current: <span className={evalResult.isBreached ? 'text-destructive font-medium' : ''}>
                            {formatMetricValue(evalResult.currentValue, rule.unit)}
                          </span>)
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Action: {getActionLabel(rule.action_on_breach)}</span>
                      <span>•</span>
                      <Badge variant="outline" className={getSeverityColor(rule.severity)}>
                        {rule.severity}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_enabled}
                      onCheckedChange={(checked) => updateRule.mutate({ ruleId: rule.id, updates: { is_enabled: checked } })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteRule.mutate(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BreachHistory() {
  const { data: breaches, isLoading } = useRiskBreaches();
  const resolveBreach = useResolveBreach();
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  const handleResolve = () => {
    if (!resolveId) return;
    resolveBreach.mutate({ breachId: resolveId, notes: resolveNotes }, {
      onSuccess: () => {
        setResolveId(null);
        setResolveNotes('');
      },
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Breach History</h3>

      {!breaches?.length ? (
        <div className="text-center py-8 text-muted-foreground">
          No breach events recorded.
        </div>
      ) : (
        <div className="space-y-2">
          {breaches.map((breach) => (
            <div
              key={breach.id}
              className={cn(
                'p-4 rounded-lg border',
                breach.is_resolved ? 'bg-muted/30' : 'bg-destructive/5 border-destructive/30'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {breach.risk_appetite_rules?.metric_label || breach.metric_code}
                    </span>
                    <Badge variant="outline" className={getSeverityColor(breach.severity)}>
                      {breach.severity}
                    </Badge>
                    {breach.is_resolved ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
                        Resolved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-500/10 text-red-500">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Value: {breach.metric_value} exceeded threshold {breach.threshold}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(breach.breached_at)} • Action: {getActionLabel(breach.action_taken)}
                  </p>
                  {breach.resolution_notes && (
                    <p className="text-xs text-muted-foreground italic mt-2">
                      Resolution: {breach.resolution_notes}
                    </p>
                  )}
                </div>
                {!breach.is_resolved && (
                  <Dialog open={resolveId === breach.id} onOpenChange={(open) => !open && setResolveId(null)}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => setResolveId(breach.id)}>
                        Resolve
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Resolve Breach</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <Label>Resolution Notes</Label>
                        <Textarea
                          value={resolveNotes}
                          onChange={(e) => setResolveNotes(e.target.value)}
                          placeholder="Describe how this breach was addressed..."
                          className="mt-2"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setResolveId(null)}>Cancel</Button>
                        <Button onClick={handleResolve} disabled={resolveBreach.isPending}>
                          {resolveBreach.isPending ? 'Resolving...' : 'Mark Resolved'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== MAIN COMPONENT ==========

export function RiskAppetiteConsole() {
  const { data: activeAppetite, isLoading: loadingActive } = useActiveRiskAppetite();
  const { data: allAppetites } = useRiskAppetites();
  const { data: evaluation, isLoading: loadingEval } = useEvaluateRiskAppetite();
  const { data: unresolvedBreaches } = useRiskBreaches(true);
  const createAppetite = useCreateRiskAppetite();
  const updateStatus = useUpdateRiskAppetiteStatus();
  const detectBreaches = useDetectBreaches();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAppetite, setNewAppetite] = useState({
    name: '',
    description: '',
    effective_from: new Date().toISOString().split('T')[0],
  });

  const handleCreateAppetite = () => {
    createAppetite.mutate({
      ...newAppetite,
      status: 'active',
    }, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        setNewAppetite({ name: '', description: '', effective_from: new Date().toISOString().split('T')[0] });
      },
    });
  };

  if (loadingActive) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Risk Appetite Configuration
          </h1>
          <p className="text-muted-foreground">Board-defined risk constraints, system-enforced</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => detectBreaches.mutate()}
            disabled={detectBreaches.isPending}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', detectBreaches.isPending && 'animate-spin')} />
            Run Detection
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Risk Appetite Version</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newAppetite.name}
                    onChange={(e) => setNewAppetite(n => ({ ...n, name: e.target.value }))}
                    placeholder="Q1 2026 Risk Policy"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newAppetite.description}
                    onChange={(e) => setNewAppetite(n => ({ ...n, description: e.target.value }))}
                    placeholder="Board-approved risk thresholds for..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Effective From</Label>
                  <Input
                    type="date"
                    value={newAppetite.effective_from}
                    onChange={(e) => setNewAppetite(n => ({ ...n, effective_from: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateAppetite} disabled={!newAppetite.name || createAppetite.isPending}>
                  {createAppetite.isPending ? 'Creating...' : 'Create & Activate'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Current Risk Appetite Summary */}
      {activeAppetite ? (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {activeAppetite.name}
                  <Badge className="bg-emerald-500/10 text-emerald-500">Active</Badge>
                </CardTitle>
                <CardDescription>
                  Version {activeAppetite.version} • Effective from {activeAppetite.effective_from}
                </CardDescription>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus.mutate({ appetiteId: activeAppetite.id, status: 'retired' })}
                    >
                      <Power className="h-4 w-4 mr-2" />
                      Retire
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Retire this version and stop enforcement</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Rules</p>
                <p className="text-2xl font-bold">{activeAppetite.rule_count || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Breaches Evaluated</p>
                <p className="text-2xl font-bold">{evaluation?.evaluations.length || 0}</p>
              </div>
              <div className={cn('p-3 rounded-lg', (evaluation?.breachCount || 0) > 0 ? 'bg-destructive/10' : 'bg-muted/50')}>
                <p className="text-xs text-muted-foreground">Active Breaches</p>
                <p className={cn('text-2xl font-bold', (evaluation?.breachCount || 0) > 0 && 'text-destructive')}>
                  {evaluation?.breachCount || 0}
                </p>
              </div>
              <div className={cn('p-3 rounded-lg', (unresolvedBreaches?.length || 0) > 0 ? 'bg-amber-500/10' : 'bg-muted/50')}>
                <p className="text-xs text-muted-foreground">Unresolved Events</p>
                <p className={cn('text-2xl font-bold', (unresolvedBreaches?.length || 0) > 0 && 'text-amber-500')}>
                  {unresolvedBreaches?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No active risk appetite configured. Create a new version to start defining risk constraints.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="breaches" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Breach History
            {(unresolvedBreaches?.length || 0) > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {unresolvedBreaches?.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="versions" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Versions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          {activeAppetite ? (
            <RulesTable appetiteId={activeAppetite.id} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Create a risk appetite version first to add rules.
            </div>
          )}
        </TabsContent>

        <TabsContent value="breaches">
          <BreachHistory />
        </TabsContent>

        <TabsContent value="versions">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Version History</h3>
            {allAppetites?.map((appetite) => (
              <div key={appetite.id} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">v{appetite.version}: {appetite.name}</span>
                      <Badge variant="outline" className={
                        appetite.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                        appetite.status === 'draft' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-muted text-muted-foreground'
                      }>
                        {appetite.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {appetite.effective_from} {appetite.effective_to && `→ ${appetite.effective_to}`}
                    </p>
                  </div>
                  {appetite.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus.mutate({ appetiteId: appetite.id, status: 'active' })}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
