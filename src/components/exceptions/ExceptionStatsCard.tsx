import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useExceptionStats } from '@/hooks/useExceptions';
import { formatCurrency } from '@/lib/format';
import { useNavigate } from 'react-router-dom';

interface ExceptionStatsCardProps {
  className?: string;
}

export function ExceptionStatsCard({ className }: ExceptionStatsCardProps) {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useExceptionStats();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.open === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Exceptions</p>
                <p className="text-lg font-medium text-green-600">All Clear</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasCritical = stats.by_severity.critical > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card 
        className={`${className} ${hasCritical ? 'border-destructive/50 bg-destructive/5' : 'border-orange-500/30'} cursor-pointer hover:shadow-md transition-shadow`}
        onClick={() => navigate('/exceptions')}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${hasCritical ? 'bg-destructive/10' : 'bg-orange-500/10'}`}>
                <AlertTriangle className={`h-5 w-5 ${hasCritical ? 'text-destructive' : 'text-orange-500'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Exceptions</p>
                  {hasCritical && (
                    <Badge variant="destructive" className="animate-pulse text-xs">
                      {stats.by_severity.critical} Critical
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{stats.open}</p>
                  <span className="text-sm text-muted-foreground">open</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Impact</p>
              <p className="text-lg font-semibold">{formatCurrency(stats.total_impact)}</p>
            </div>
          </div>

          {/* Type breakdown */}
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-sm">
            <div className="flex gap-4">
              {stats.by_type.AR_OVERDUE > 0 && (
                <span className="text-muted-foreground">
                  <span className="text-orange-500 font-medium">{stats.by_type.AR_OVERDUE}</span> AR Overdue
                </span>
              )}
              {stats.by_type.ORPHAN_BANK_TXN > 0 && (
                <span className="text-muted-foreground">
                  <span className="text-blue-500 font-medium">{stats.by_type.ORPHAN_BANK_TXN}</span> Orphan Txn
                </span>
              )}
              {stats.by_type.PARTIAL_MATCH_STUCK > 0 && (
                <span className="text-muted-foreground">
                  <span className="text-purple-500 font-medium">{stats.by_type.PARTIAL_MATCH_STUCK}</span> Partial
                </span>
              )}
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
