import { Helmet } from 'react-helmet-async';
import { ExecutionItem } from '@/components/decision-os/ExecutionItem';
import { useDecisionCards } from '@/hooks/useDecisionCards';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ExecutionQueuePage() {
  const navigate = useNavigate();
  const { data: cards, isLoading } = useDecisionCards({
    status: ['IN_PROGRESS'],
  });

  // Map cards to execution items
  const executionItems = (cards || []).map(card => {
    const recommendedAction = card.actions?.find(a => a.is_recommended);
    
    return {
      id: card.id,
      actionSummary: recommendedAction?.label || card.title,
      owner: card.owner_role,
      deadlineAt: card.deadline_at,
      escalationPath: card.owner_role === 'CMO' ? 'CFO' : 
                      card.owner_role === 'COO' ? 'CEO' : 
                      'CEO',
      escalationInHours: 24,
      priority: card.priority,
      status: 'IN_PROGRESS' as const,
    };
  });

  return (
    <>
      <Helmet>
        <title>Execution Queue | BlueCore Decision OS</title>
      </Helmet>

      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Execution Queue
          </h2>
          <p className="text-muted-foreground">
            What must be executed now to prevent compounding damage?
          </p>
        </div>

        {/* Helper Copy */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            This queue exists to prevent issues from silently compounding.
          </p>
        </div>

        {/* Execution Items */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : executionItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-emerald-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              No pending executions
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              All accepted decisions are either completed or awaiting new assignments.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {executionItems.map((item) => (
              <ExecutionItem
                key={item.id}
                {...item}
                onClick={() => navigate(`/decision-os/review/${item.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
