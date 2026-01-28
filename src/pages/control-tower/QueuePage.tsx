import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { ListTodo, User, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useActiveAlerts } from '@/hooks/useAlertInstances';
import { useDecisionCards } from '@/hooks/useDecisionCards';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * QUEUE PAGE - Execution tracking
 * 
 * Shows:
 * - Owner workload cards (CEO/CFO/CMO/COO)
 * - In Progress items
 * - Pending items awaiting assignment
 */

const OWNERS = [
  { id: 'ceo', label: 'CEO', color: 'bg-purple-500' },
  { id: 'cfo', label: 'CFO', color: 'bg-blue-500' },
  { id: 'cmo', label: 'CMO', color: 'bg-green-500' },
  { id: 'coo', label: 'COO', color: 'bg-amber-500' },
];

interface QueueItem {
  id: string;
  title: string;
  type: 'alert' | 'decision';
  owner: string | null;
  status: 'in_progress' | 'pending';
  priority: string;
  deadline?: string;
  startedAt?: string;
}

export default function QueuePage() {
  const { data: alerts = [] } = useActiveAlerts();
  const { data: decisions = [] } = useDecisionCards({ status: ['OPEN', 'IN_PROGRESS'] });

  // Combine alerts and decisions into queue items
  const queueItems = useMemo((): QueueItem[] => {
    const alertItems: QueueItem[] = alerts.map(a => ({
      id: a.id,
      title: a.title,
      type: 'alert' as const,
      owner: (a as any).assigned_to || null,
      status: a.acknowledged_at ? 'in_progress' : 'pending',
      priority: a.severity === 'critical' ? 'P1' : a.severity === 'warning' ? 'P2' : 'P3',
      deadline: a.deadline_at || undefined,
      startedAt: a.acknowledged_at || undefined,
    }));

    const decisionItems: QueueItem[] = decisions.map(d => ({
      id: d.id,
      title: d.title,
      type: 'decision' as const,
      owner: d.owner_role,
      status: d.status === 'IN_PROGRESS' ? 'in_progress' : 'pending',
      priority: d.priority,
      deadline: d.deadline_at,
      startedAt: d.updated_at,
    }));

    return [...alertItems, ...decisionItems].sort((a, b) => {
      // Sort by status (in_progress first), then priority
      if (a.status !== b.status) return a.status === 'in_progress' ? -1 : 1;
      const priorityOrder = { P1: 0, P2: 1, P3: 2 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3) - 
             (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3);
    });
  }, [alerts, decisions]);

  // Group by owner
  const ownerCounts = useMemo(() => {
    return OWNERS.map(owner => ({
      ...owner,
      count: queueItems.filter(item => 
        item.owner?.toLowerCase().includes(owner.id) || 
        item.owner?.toLowerCase() === owner.label.toLowerCase()
      ).length,
      inProgress: queueItems.filter(item => 
        item.status === 'in_progress' && (
          item.owner?.toLowerCase().includes(owner.id) || 
          item.owner?.toLowerCase() === owner.label.toLowerCase()
        )
      ).length,
    }));
  }, [queueItems]);

  // Split by status
  const inProgressItems = queueItems.filter(i => i.status === 'in_progress');
  const pendingItems = queueItems.filter(i => i.status === 'pending');

  return (
    <>
      <Helmet>
        <title>Execution Queue | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListTodo className="h-5 w-5 text-muted-foreground" />
            <div>
              <h1 className="text-lg font-semibold">Execution Queue</h1>
              <p className="text-sm text-muted-foreground">
                {inProgressItems.length} đang xử lý • {pendingItems.length} chờ phân công
              </p>
            </div>
          </div>
        </div>

        {/* Owner Workload Cards */}
        <div className="grid grid-cols-4 gap-4">
          {ownerCounts.map((owner) => (
            <Card key={owner.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Avatar className={cn('h-10 w-10', owner.color)}>
                    <AvatarFallback className="text-white font-semibold">
                      {owner.label.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{owner.label}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{owner.count} items</span>
                      {owner.inProgress > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {owner.inProgress} active
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* In Progress Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              In Progress ({inProgressItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inProgressItems.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                Không có item đang xử lý
              </div>
            ) : (
              <div className="space-y-2">
                {inProgressItems.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        item.priority === 'P1' ? 'bg-destructive' : 
                        item.priority === 'P2' ? 'bg-amber-500' : 'bg-muted-foreground'
                      )} />
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{item.type}</Badge>
                          {item.startedAt && (
                            <span>Started {formatDistanceToNow(new Date(item.startedAt), { locale: vi, addSuffix: true })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">{item.owner || 'Unassigned'}</p>
                        {item.deadline && (
                          <p className="text-xs text-muted-foreground">
                            Due {formatDistanceToNow(new Date(item.deadline), { locale: vi, addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Pending Assignment ({pendingItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingItems.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                Tất cả items đã được phân công
              </div>
            ) : (
              <div className="space-y-2">
                {pendingItems.slice(0, 10).map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={item.priority === 'P1' ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {item.priority}
                      </Badge>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.deadline && (
                        <span className="text-xs text-muted-foreground">
                          Due {formatDistanceToNow(new Date(item.deadline), { locale: vi, addSuffix: true })}
                        </span>
                      )}
                      <Button size="sm">Assign</Button>
                    </div>
                  </div>
                ))}
                {pendingItems.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    + {pendingItems.length - 10} more items
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
