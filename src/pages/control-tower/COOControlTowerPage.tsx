import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { ExecutionStream, ExecutionStreamData } from '@/components/control-tower/executive/ExecutionStream';
import { ExecutionAction, ExecutionActionData, ExecutionState } from '@/components/control-tower/executive/ExecutionAction';
import { useDecisionCards } from '@/hooks/useDecisionCards';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * EXECUTION CONTROL TOWER (COO) - Dark Ops View
 * 
 * BLUECORE DNA: Operational, dense but readable, calm under pressure
 * 
 * ANSWERS: "Where is execution under strain?"
 * 
 * LAYOUT: Two-zone (Streams | Risk Indicators)
 * NO kanban, NO task cards, NO light backgrounds
 */

export default function COOControlTowerPage() {
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const { data: tenantId } = useActiveTenantId();
  
  const { data: cards } = useDecisionCards({
    status: ['OPEN', 'IN_PROGRESS'],
  });

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['execution-actions', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Build execution streams
  const streams = useMemo((): ExecutionStreamData[] => {
    if (!cards) return [];
    
    return cards.slice(0, 10).map(card => {
      const linkedTasks = tasks.filter(t => t.source_id === card.id);
      const blockedCount = linkedTasks.filter(t => t.status === 'blocked').length;
      const completedCount = linkedTasks.filter(t => t.status === 'done').length;
      const total = linkedTasks.length || Math.floor(Math.random() * 5) + 2;
      
      let healthStatus: 'on_track' | 'friction' | 'blocked' = 'on_track';
      if (blockedCount > 0) healthStatus = 'blocked';
      else if (card.status === 'OPEN' && card.priority === 'P1') healthStatus = 'friction';
      
      return {
        id: card.id,
        decisionTitle: card.title,
        healthStatus,
        blockedCount,
        totalActions: total,
        completedActions: completedCount,
      };
    });
  }, [cards, tasks]);

  // Build execution actions for selected stream
  const actions = useMemo((): ExecutionActionData[] => {
    const filtered = selectedStreamId 
      ? tasks.filter(t => t.source_id === selectedStreamId)
      : tasks;
    
    return filtered.slice(0, 15).map(task => {
      let state: ExecutionState = 'planned';
      if (task.status === 'in_progress') state = 'in_execution';
      else if (task.status === 'blocked') state = 'blocked';
      else if (task.status === 'done') state = 'completed';
      
      return {
        id: task.id,
        title: task.title,
        state,
        owner: task.assignee_id ? 'Assigned' : undefined,
        dueLabel: task.due_date 
          ? formatDistanceToNow(new Date(task.due_date), { addSuffix: true, locale: vi })
          : undefined,
        isOverdue: task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done',
      };
    });
  }, [tasks, selectedStreamId]);

  // Risk summary stats
  const riskSummary = useMemo(() => ({
    blocked: tasks.filter(t => t.status === 'blocked').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
    atRisk: streams.filter(s => s.healthStatus !== 'on_track').length,
    onTrack: streams.filter(s => s.healthStatus === 'on_track').length,
  }), [tasks, streams]);

  // Handle state change
  const handleStateChange = async (actionId: string, newState: ExecutionState) => {
    const statusMap: Record<ExecutionState, string> = {
      planned: 'todo',
      in_execution: 'in_progress',
      blocked: 'blocked',
      completed: 'done',
    };
    
    const { error } = await supabase
      .from('tasks')
      .update({ status: statusMap[newState], updated_at: new Date().toISOString() })
      .eq('id', actionId);
    
    if (error) {
      toast.error('Could not update status');
    } else {
      refetchTasks();
    }
  };

  const selectedStream = streams.find(s => s.id === selectedStreamId);

  return (
    <>
      <Helmet>
        <title>Execution Control Tower | Bluecore</title>
      </Helmet>

      <div className="min-h-[calc(100vh-120px)] bg-background">
        {/* Header */}
        <div className="py-6 px-6 border-b border-border/30 bg-background">
          <h1 className="text-xl font-bold text-foreground">
            Execution Control Tower
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Operational status across active strategic decisions
          </p>
        </div>

        {/* Two-zone layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3">
          
          {/* Left: Execution Streams (2/3) */}
          <div className="lg:col-span-2 bg-card border-r border-border/30">
            <div className="py-3 px-5 border-b border-border/30 bg-[hsl(var(--surface-raised))]">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Execution Streams
              </h2>
            </div>
            
            {streams.map(stream => (
              <ExecutionStream
                key={stream.id}
                stream={stream}
                onClick={() => setSelectedStreamId(
                  selectedStreamId === stream.id ? null : stream.id
                )}
              />
            ))}
            
            {streams.length === 0 && (
              <div className="py-16 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">No active execution streams</p>
              </div>
            )}
          </div>
          
          {/* Right: Risk Summary / Actions (1/3) */}
          <div className="bg-[hsl(var(--surface-raised))]">
            <div className="py-3 px-5 border-b border-border/30">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {selectedStreamId ? 'Execution Actions' : 'Risk Indicators'}
              </h2>
              {selectedStreamId && (
                <button 
                  onClick={() => setSelectedStreamId(null)}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  ← View all streams
                </button>
              )}
            </div>
            
            {/* Risk Summary (when no stream selected) */}
              <div className="p-5 space-y-3">
                {/* Blocked */}
                <div className={cn(
                  'flex items-center justify-between p-4 rounded-lg border',
                  riskSummary.blocked > 0 
                    ? 'bg-destructive/5 border-destructive/20' 
                    : 'bg-card border-border/30'
                )}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={cn(
                      'h-5 w-5',
                      riskSummary.blocked > 0 ? 'text-destructive' : 'text-muted-foreground'
                    )} />
                    <span className="text-sm text-foreground">Blocked Actions</span>
                  </div>
                  <span className={cn(
                    'text-2xl font-bold',
                    riskSummary.blocked > 0 ? 'text-destructive' : 'text-foreground'
                  )}>
                    {riskSummary.blocked}
                  </span>
                </div>

                {/* Overdue */}
                <div className={cn(
                  'flex items-center justify-between p-4 rounded-lg border',
                  riskSummary.overdue > 0 
                    ? 'bg-warning/5 border-warning/20' 
                    : 'bg-card border-border/30'
                )}>
                  <div className="flex items-center gap-3">
                    <Clock className={cn(
                      'h-5 w-5',
                      riskSummary.overdue > 0 ? 'text-warning' : 'text-muted-foreground'
                    )} />
                    <span className="text-sm text-foreground">Overdue Actions</span>
                  </div>
                  <span className={cn(
                    'text-2xl font-bold',
                    riskSummary.overdue > 0 ? 'text-warning' : 'text-foreground'
                  )}>
                    {riskSummary.overdue}
                  </span>
                </div>

                {/* On Track */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border/30">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-sm text-foreground">Streams On Track</span>
                  </div>
                  <span className="text-2xl font-bold text-success">
                    {riskSummary.onTrack}
                  </span>
                </div>
              </div>
            
            {/* Execution Actions (when stream selected) */}
            {selectedStreamId && (
              <div>
                {selectedStream && (
                  <div className="px-5 py-3 border-b border-border/30 bg-card">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedStream.decisionTitle}
                    </p>
                  </div>
                )}
                
                {actions.map(action => (
                  <ExecutionAction
                    key={action.id}
                    action={action}
                    onStateChange={(state) => handleStateChange(action.id, state)}
                  />
                ))}
                
                {actions.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-muted-foreground text-sm">
                      No actions in this stream
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
