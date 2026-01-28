import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDecisionCards } from '@/hooks/useDecisionCards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, History, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type FilterState = 'ALL' | 'DECIDED' | 'DISMISSED';

function formatVND(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (absValue >= 1e9) return `${sign}${(absValue / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `${sign}${(absValue / 1e6).toFixed(0)}M`;
  if (absValue >= 1e3) return `${sign}${(absValue / 1e3).toFixed(0)}K`;
  return `${sign}${absValue.toFixed(0)}`;
}

const stateConfig = {
  OPEN: { label: 'Proposed', className: 'bg-sky-100 text-sky-800' },
  IN_PROGRESS: { label: 'Accepted', className: 'bg-amber-100 text-amber-800' },
  DECIDED: { label: 'Executed', className: 'bg-emerald-100 text-emerald-800' },
  DISMISSED: { label: 'Rejected', className: 'bg-slate-100 text-slate-800' },
  EXPIRED: { label: 'Expired', className: 'bg-red-100 text-red-800' },
};

export default function DecisionHistoryPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>('ALL');

  // Fetch all cards including decided and dismissed
  const { data: allCards, isLoading } = useDecisionCards({
    status: ['DECIDED', 'DISMISSED', 'EXPIRED'],
  });

  // Apply filter
  const filteredCards = (allCards || []).filter(card => {
    if (filter === 'ALL') return true;
    return card.status === filter;
  });

  return (
    <>
      <Helmet>
        <title>Decision History | BlueCore Decision OS</title>
      </Helmet>

      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Decision History
          </h2>
          <p className="text-muted-foreground">
            Past decisions and their outcomes
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          {(['ALL', 'DECIDED', 'DISMISSED'] as FilterState[]).map((state) => (
            <Button
              key={state}
              variant={filter === state ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(state)}
            >
              {state === 'ALL' ? 'All' : state === 'DECIDED' ? 'Executed' : 'Rejected'}
            </Button>
          ))}
        </div>

        {/* History Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              No decision history
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Decisions that have been executed or rejected will appear here.
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40%]">Decision</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCards.map((card) => {
                  const config = stateConfig[card.status] || stateConfig.DECIDED;
                  return (
                    <TableRow 
                      key={card.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => navigate(`/decision-os/review/${card.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground line-clamp-1">
                            {card.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {card.entity_label}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", config.className)}
                        >
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-medium",
                          card.impact_amount < 0 ? "text-destructive" : "text-emerald-600"
                        )}>
                          {formatVND(card.impact_amount)} VND
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {card.owner_role}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(card.updated_at).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
