/**
 * SourceProgressTable - Displays granular sync progress per data source
 * 
 * @architecture Layer 10 Integration UI
 * Shows which sources (KiotViet, Haravan, Shopee, etc.) are being synced
 * and their individual progress.
 */

import { useSourceProgress, getSourceStatusInfo, type SourceProgressRecord } from '@/hooks/useSourceProgress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, AlertCircle } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SourceProgressTableProps {
  jobId: string;
}

export function SourceProgressTable({ jobId }: SourceProgressTableProps) {
  const { data: sources, isLoading, error } = useSourceProgress(jobId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading source details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive py-2">
        Error loading source progress
      </div>
    );
  }

  if (!sources || sources.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        No source details available
      </div>
    );
  }

  return (
    <div className="border rounded-md mt-2">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-[120px]">Source</TableHead>
            <TableHead className="w-[140px]">Table</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[180px]">Progress</TableHead>
            <TableHead className="text-right">Records</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
        </TableBody>
      </Table>
      
      {/* Summary row */}
      <div className="px-4 py-2 border-t bg-muted/20 flex items-center justify-between text-sm">
        <span className="font-medium">
          Total: {sources.length} sources
        </span>
        <span className="text-muted-foreground">
          {sources.reduce((sum, s) => sum + s.processed_records, 0).toLocaleString()} / {' '}
          {sources.reduce((sum, s) => sum + s.total_records, 0).toLocaleString()} records
        </span>
      </div>
    </div>
  );
}

function SourceRow({ source }: { source: SourceProgressRecord }) {
  const statusInfo = getSourceStatusInfo(source.status);
  const progress = source.total_records > 0
    ? (source.processed_records / source.total_records) * 100
    : 0;

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-1">
          {getSourceIcon(source.source_name)}
          <span className="capitalize">{source.source_name}</span>
        </div>
      </TableCell>
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <code className="text-xs bg-muted px-1 py-0.5 rounded truncate block max-w-[120px]">
                {source.table_name}
              </code>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-mono text-xs">
                {source.dataset}.{source.table_name}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Badge variant={statusInfo.variant} className="text-xs">
            {statusInfo.icon} {statusInfo.label}
          </Badge>
          {source.error_message && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="w-3 h-3 text-destructive" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">
                  <p className="text-xs">{source.error_message}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell>
        {source.status === 'running' || source.status === 'completed' ? (
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {Math.round(progress)}%
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-xs">
        {source.processed_records.toLocaleString()}
        {source.total_records > 0 && (
          <span className="text-muted-foreground">
            {' / '}{source.total_records.toLocaleString()}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

function getSourceIcon(sourceName: string): string {
  const icons: Record<string, string> = {
    kiotviet: '🏪',
    haravan: '🛍️',
    bluecore: '💙',
    shopee: '🟠',
    lazada: '🟣',
    tiktok: '🎵',
    tiki: '🔵',
    kiotviet_master: '📦',
  };
  return icons[sourceName.toLowerCase()] || '📊';
}
