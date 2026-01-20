import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  ArrowUpDown,
  Filter,
  FileWarning,
  Banknote,
  CreditCard,
  ExternalLink,
  Eye,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useExceptions, 
  useExceptionStats, 
  Exception,
  ExceptionFilters 
} from '@/hooks/useExceptions';
import { ExceptionDetailDrawer } from './ExceptionDetailDrawer';
import { formatCurrency } from '@/lib/format';

const severityConfig = {
  critical: { 
    label: 'Critical', 
    icon: AlertCircle, 
    className: 'bg-destructive text-destructive-foreground',
    dotColor: 'bg-destructive'
  },
  high: { 
    label: 'High', 
    icon: AlertTriangle, 
    className: 'bg-orange-500 text-white',
    dotColor: 'bg-orange-500'
  },
  medium: { 
    label: 'Medium', 
    icon: Clock, 
    className: 'bg-yellow-500 text-white',
    dotColor: 'bg-yellow-500'
  },
  low: { 
    label: 'Low', 
    icon: CheckCircle2, 
    className: 'bg-muted text-muted-foreground',
    dotColor: 'bg-muted-foreground'
  },
};

const typeConfig = {
  ORPHAN_BANK_TXN: { 
    label: 'Orphan Bank Txn', 
    icon: Banknote,
    color: 'text-blue-500'
  },
  AR_OVERDUE: { 
    label: 'AR Overdue', 
    icon: FileWarning,
    color: 'text-orange-500'
  },
  PARTIAL_MATCH_STUCK: { 
    label: 'Partial Match', 
    icon: CreditCard,
    color: 'text-purple-500'
  },
};

const statusConfig = {
  open: { label: 'Open', className: 'bg-destructive/10 text-destructive' },
  triaged: { label: 'Triaged', className: 'bg-blue-500/10 text-blue-600' },
  snoozed: { label: 'Snoozed', className: 'bg-muted text-muted-foreground' },
  resolved: { label: 'Resolved', className: 'bg-green-500/10 text-green-600' },
};

interface ExceptionBoardProps {
  embedded?: boolean;
  defaultFilters?: ExceptionFilters;
}

export function ExceptionBoard({ embedded = false, defaultFilters = {} }: ExceptionBoardProps) {
  const [filters, setFilters] = useState<ExceptionFilters>({
    status: 'open',
    sort: 'impact',
    ...defaultFilters,
  });
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);

  const { data: exceptions, isLoading } = useExceptions(filters);
  const { data: stats } = useExceptionStats();

  const handleFilterChange = (key: keyof ExceptionFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' && key !== 'status' ? undefined : value,
    }));
  };

  const getAgingDays = (detectedAt: string) => {
    return Math.floor((Date.now() - new Date(detectedAt).getTime()) / (1000 * 60 * 60 * 24));
  };

  const getReference = (exception: Exception) => {
    const evidence = exception.evidence as Record<string, string>;
    if (exception.exception_type === 'AR_OVERDUE') {
      return evidence?.invoice_number || 'N/A';
    }
    return evidence?.reference || exception.ref_id.slice(0, 8);
  };

  const getCustomer = (exception: Exception) => {
    const evidence = exception.evidence as Record<string, string>;
    return evidence?.customer_name || '-';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'space-y-6'}>
      {/* Stats Cards - Only show if not embedded */}
      {!embedded && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-destructive/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                  <span className="text-sm text-muted-foreground">Critical</span>
                </div>
                <div className="text-2xl font-bold text-destructive mt-1">
                  {stats.by_severity.critical}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-orange-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  <span className="text-sm text-muted-foreground">High</span>
                </div>
                <div className="text-2xl font-bold text-orange-500 mt-1">
                  {stats.by_severity.high}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Open</span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {stats.open}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Impact</span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {formatCurrency(stats.total_impact)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Exception Queue
              {stats && (
                <Badge variant="secondary" className="ml-2">
                  {stats.open} open
                </Badge>
              )}
            </CardTitle>

            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={filters.status || 'open'}
                onValueChange={(v) => handleFilterChange('status', v)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="triaged">Triaged</SelectItem>
                  <SelectItem value="snoozed">Snoozed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.type || 'all'}
                onValueChange={(v) => handleFilterChange('type', v)}
              >
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ORPHAN_BANK_TXN">Orphan Bank Txn</SelectItem>
                  <SelectItem value="AR_OVERDUE">AR Overdue</SelectItem>
                  <SelectItem value="PARTIAL_MATCH_STUCK">Partial Match</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.severity || 'all'}
                onValueChange={(v) => handleFilterChange('severity', v)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.sort || 'impact'}
                onValueChange={(v) => handleFilterChange('sort', v)}
              >
                <SelectTrigger className="w-[130px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="impact">By Impact</SelectItem>
                  <SelectItem value="aging">By Aging</SelectItem>
                  <SelectItem value="detected">By Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Severity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Impact</TableHead>
                  <TableHead className="text-right">Aging</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions && exceptions.length > 0 ? (
                  exceptions.map((exception, index) => {
                    const severity = severityConfig[exception.severity];
                    const type = typeConfig[exception.exception_type];
                    const status = statusConfig[exception.status];
                    const TypeIcon = type.icon;
                    const agingDays = getAgingDays(exception.detected_at);

                    return (
                      <motion.tr
                        key={exception.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedExceptionId(exception.id)}
                      >
                        <TableCell>
                          <Badge className={severity.className}>
                            {severity.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TypeIcon className={`h-4 w-4 ${type.color}`} />
                            <span className="text-sm">{type.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="truncate block" title={exception.title}>
                            {exception.title}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {getReference(exception)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getCustomer(exception)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(exception.impact_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={agingDays > 7 ? 'text-destructive font-medium' : ''}>
                            {agingDays}d
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.className}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExceptionId(exception.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
                        <p>No exceptions found</p>
                        <p className="text-sm">All clear!</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <ExceptionDetailDrawer
        exceptionId={selectedExceptionId}
        open={!!selectedExceptionId}
        onClose={() => setSelectedExceptionId(null)}
      />
    </div>
  );
}
