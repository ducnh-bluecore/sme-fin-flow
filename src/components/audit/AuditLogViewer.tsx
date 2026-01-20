import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Download, 
  FileText, 
  Shield, 
  Clock, 
  User, 
  Bot, 
  Brain, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Package
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { 
  useAuditEvents, 
  useAuditSummary, 
  useSOCControls,
  useExportAudit,
  useEvidencePack,
  getActionLabel,
  getActorTypeColor,
  getResourceTypeIcon,
  AuditFilters
} from "@/hooks/useAudit";

export function AuditLogViewer() {
  const [filters, setFilters] = useState<AuditFilters>({
    limit: 50,
    offset: 0,
  });
  const [searchAction, setSearchAction] = useState('');
  const [activeTab, setActiveTab] = useState('events');

  const { data: eventsData, isLoading: eventsLoading, refetch } = useAuditEvents(filters);
  const { data: summary, isLoading: summaryLoading } = useAuditSummary(30);
  const { data: controls, isLoading: controlsLoading } = useSOCControls();
  const exportAudit = useExportAudit();
  const evidencePack = useEvidencePack();

  const handleExport = (format: 'json' | 'csv') => {
    exportAudit.mutate({ format, ...filters });
  };

  const handleEvidencePack = (period: '7d' | '30d' | '90d') => {
    evidencePack.mutate(period);
  };

  const ActorIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'USER': return <User className="h-4 w-4" />;
      case 'SYSTEM': return <Bot className="h-4 w-4" />;
      case 'ML': return <Brain className="h-4 w-4" />;
      case 'GUARDRAIL': return <Shield className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>Audit Log & Compliance</CardTitle>
                    <CardDescription>SOC 2 / ISO 27001 ready audit trails</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button size="sm" onClick={() => handleEvidencePack('30d')} disabled={evidencePack.isPending}>
                    <Package className="h-4 w-4 mr-2" />
                    {evidencePack.isPending ? 'Generating...' : 'Evidence Pack'}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Summary Stats */}
        {summaryLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : summary && (
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              label="Total Events (30d)"
              value={summary.totalEvents.toLocaleString()}
              icon={<FileText className="h-4 w-4" />}
            />
            <StatCard
              label="User Actions"
              value={(summary.byActorType['USER'] || 0).toLocaleString()}
              icon={<User className="h-4 w-4" />}
            />
            <StatCard
              label="System Actions"
              value={(summary.byActorType['SYSTEM'] || 0).toLocaleString()}
              icon={<Bot className="h-4 w-4" />}
            />
            <StatCard
              label="Guardrail Events"
              value={(summary.byActorType['GUARDRAIL'] || 0).toLocaleString()}
              icon={<Shield className="h-4 w-4" />}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="events">Audit Events</TabsTrigger>
            <TabsTrigger value="controls">SOC Controls</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      placeholder="Search actions..."
                      value={searchAction}
                      onChange={(e) => setSearchAction(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select
                    value={filters.actorType || 'all'}
                    onValueChange={(v) => setFilters({ ...filters, actorType: v === 'all' ? undefined : v })}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Actor Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actors</SelectItem>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="SYSTEM">System</SelectItem>
                      <SelectItem value="ML">ML</SelectItem>
                      <SelectItem value="GUARDRAIL">Guardrail</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.resourceType || 'all'}
                    onValueChange={(v) => setFilters({ ...filters, resourceType: v === 'all' ? undefined : v })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Resource Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Resources</SelectItem>
                      <SelectItem value="reconciliation_link">Reconciliation</SelectItem>
                      <SelectItem value="decision_snapshot">Decision Snapshot</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="bank_transaction">Bank Transaction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Events List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Events ({eventsData?.total || 0})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {eventsData?.events.map((event, idx) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge className={getActorTypeColor(event.actor_type)}>
                                  <ActorIcon type={event.actor_type} />
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>{event.actor_type}</TooltipContent>
                            </Tooltip>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{getActionLabel(event.action)}</span>
                                <span className="text-muted-foreground">
                                  {getResourceTypeIcon(event.resource_type)} {event.resource_type}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                {event.decision_context && (
                                  <Badge variant="outline" className="text-xs">
                                    {event.decision_context}
                                  </Badge>
                                )}
                                {event.reason_code && (
                                  <span>Reason: {event.reason_code}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground">
                              {event.id.slice(0, 8)}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="controls" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SOC Control Attestations</CardTitle>
                <CardDescription>
                  Implementation status of security and compliance controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                {controlsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {controls?.map((control) => (
                      <div
                        key={control.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="font-mono">
                            {control.control_id}
                          </Badge>
                          <div>
                            <p className="font-medium">{control.control_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {control.control_description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={
                            control.implementation_status === 'IMPLEMENTED'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : control.implementation_status === 'PARTIAL'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }>
                            {control.implementation_status === 'IMPLEMENTED' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {control.implementation_status === 'PARTIAL' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {control.implementation_status === 'NOT_IMPLEMENTED' && <XCircle className="h-3 w-3 mr-1" />}
                            {control.implementation_status}
                          </Badge>
                          {control.test_result && (
                            <Badge variant={control.test_result === 'PASS' ? 'default' : 'destructive'}>
                              {control.test_result}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Control Mapping */}
            <Card>
              <CardHeader>
                <CardTitle>Control Implementation Mapping</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <ControlMappingCard
                    control="Change Management"
                    implementation="Append-only ledger + audit_events"
                    icon={<FileText className="h-4 w-4" />}
                  />
                  <ControlMappingCard
                    control="Least Privilege"
                    implementation="RLS + role-based access"
                    icon={<Shield className="h-4 w-4" />}
                  />
                  <ControlMappingCard
                    control="Traceability"
                    implementation="audit_events + derived_from fields"
                    icon={<Search className="h-4 w-4" />}
                  />
                  <ControlMappingCard
                    control="Automation Risk"
                    implementation="Guardrails + ML kill-switch"
                    icon={<AlertTriangle className="h-4 w-4" />}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ControlMappingCard({ control, implementation, icon }: { control: string; implementation: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
      <div className="p-2 bg-primary/10 rounded-lg text-primary">
        {icon}
      </div>
      <div>
        <p className="font-medium">{control}</p>
        <p className="text-sm text-muted-foreground">{implementation}</p>
      </div>
    </div>
  );
}

export default AuditLogViewer;
