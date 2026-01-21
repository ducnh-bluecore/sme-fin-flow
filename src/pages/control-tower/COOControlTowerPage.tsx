import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { ExecutionStream, ExecutionStreamData } from '@/components/control-tower/executive/ExecutionStream';
import { ExecutionAction, ExecutionActionData, ExecutionState } from '@/components/control-tower/executive/ExecutionAction';
import { useDecisionCards } from '@/hooks/useDecisionCards';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * EXECUTION CONTROL TOWER (COO)
 * 
 * ANSWERS ONE QUESTION: "Where is execution breaking down?"
 * 
 * LAYOUT: Two-column
 * - Left: Execution Streams grouped by decision
 * - Right: Risk Summary
 * 
 * RENAMED CONCEPTS:
 * - "Task" → "Execution Action"
 * - "Task list" → "Execution Queue"
 * 
 * VISUAL: Simple rows, no boxes, minimal icons
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
        <title>Execution Control Tower</title>
      </Helmet>

      <div className="min-h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="py-6 px-4 border-b border-border/20">
          <h1 className="text-2xl font-semibold text-foreground">
            Execution Control Tower
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Deliver outcomes for active strategic decisions
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          
          {/* Left: Execution Streams */}
          <div className="lg:col-span-2 border-r border-border/20">
            <div className="py-4 px-4 border-b border-border/20">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Execution Streams
              </h2>
            </div>
            
            <div className="divide-y divide-border/10">
              {streams.map(stream => (
                <ExecutionStream
                  key={stream.id}
                  stream={stream}
                  onClick={() => setSelectedStreamId(
                    selectedStreamId === stream.id ? null : stream.id
                  )}
                />
              ))}
            </div>
            
            {streams.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">No active execution streams</p>
              </div>
            )}
          </div>
          
          {/* Right: Risk Summary / Actions */}
          <div className="bg-secondary/20">
            <div className="py-4 px-4 border-b border-border/20">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {selectedStreamId ? 'Execution Actions' : 'Risk Summary'}
              </h2>
              {selectedStreamId && (
                <button 
                  onClick={() => setSelectedStreamId(null)}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  ← Back to summary
                </button>
              )}
            </div>
            
            {/* Risk Summary (when no stream selected) */}
            {!selectedStreamId && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Blocked actions</span>
                  <span className={`text-lg font-medium ${riskSummary.blocked > 0 ? 'text-[hsl(0,60%,55%)]' : 'text-foreground'}`}>
                    {riskSummary.blocked}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Overdue actions</span>
                  <span className={`text-lg font-medium ${riskSummary.overdue > 0 ? 'text-[hsl(40,60%,55%)]' : 'text-foreground'}`}>
                    {riskSummary.overdue}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Streams at risk</span>
                  <span className="text-lg font-medium text-foreground">
                    {riskSummary.atRisk}
                  </span>
                </div>
              </div>
            )}
            
            {/* Execution Actions (when stream selected) */}
            {selectedStreamId && (
              <div>
                {selectedStream && (
                  <div className="px-4 py-3 border-b border-border/20 bg-secondary/30">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedStream.decisionTitle}
                    </p>
                  </div>
                )}
                
                <div className="divide-y divide-border/10">
                  {actions.map(action => (
                    <ExecutionAction
                      key={action.id}
                      action={action}
                      onStateChange={(state) => handleStateChange(action.id, state)}
                    />
                  ))}
                </div>
                
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
