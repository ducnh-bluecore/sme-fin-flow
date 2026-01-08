import { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { FileText, Trash2, Eye, CheckCircle, Clock, Archive, Filter, Send, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDecisionAnalyses, DecisionAnalysis } from '@/hooks/useDecisionAnalyses';
import { formatVNDCompact } from '@/lib/formatters';
import { SubmitForApprovalDialog } from './SubmitForApprovalDialog';

const analysisTypeLabels: Record<string, string> = {
  make_vs_buy: 'Make vs Buy',
  break_even: 'Break-even',
  roi: 'ROI',
  npv_irr: 'NPV/IRR',
  payback: 'Payback Period',
  sensitivity: 'Sensitivity',
  scenario: 'Scenario',
};

const statusConfig: Record<string, { label: string; icon: typeof Clock; variant: 'default' | 'secondary' | 'outline'; color?: string }> = {
  draft: { label: 'Nháp', icon: Clock, variant: 'secondary' },
  completed: { label: 'Hoàn thành', icon: CheckCircle, variant: 'default' },
  pending_approval: { label: 'Chờ duyệt', icon: Send, variant: 'outline', color: 'text-yellow-500' },
  approved: { label: 'Đã duyệt', icon: CheckCircle, variant: 'default', color: 'text-green-500' },
  rejected: { label: 'Từ chối', icon: XCircle, variant: 'outline', color: 'text-red-500' },
  archived: { label: 'Lưu trữ', icon: Archive, variant: 'outline' },
};

function AnalysisDetailDialog({ analysis }: { analysis: DecisionAnalysis }) {
  const canSubmitForApproval = analysis.status === 'draft' || analysis.status === 'completed' || analysis.status === 'rejected';
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{analysis.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge>{analysisTypeLabels[analysis.analysis_type] || analysis.analysis_type}</Badge>
            <Badge variant={statusConfig[analysis.status]?.variant || 'secondary'}>
              {statusConfig[analysis.status]?.label || analysis.status}
            </Badge>
            {canSubmitForApproval && (
              <div className="ml-auto">
                <SubmitForApprovalDialog analysis={analysis} />
              </div>
            )}
          </div>

          {analysis.description && (
            <p className="text-sm text-muted-foreground">{analysis.description}</p>
          )}

          <div>
            <h4 className="font-medium mb-2">Tham số</h4>
            <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
              {JSON.stringify(analysis.parameters, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">Kết quả</h4>
            <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
              {JSON.stringify(analysis.results, null, 2)}
            </pre>
          </div>

          {analysis.recommendation && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <h4 className="font-medium mb-1">Khuyến nghị</h4>
              <p className="text-sm">{analysis.recommendation}</p>
            </div>
          )}

          {analysis.ai_insights && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="font-medium mb-1">AI Insights</h4>
              <p className="text-sm">{analysis.ai_insights}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Tạo: {format(new Date(analysis.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SavedAnalysesList() {
  const [filterType, setFilterType] = useState<string>('all');
  const { data: analyses, isLoading } = useDecisionAnalyses(filterType === 'all' ? undefined : filterType);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Đang tải...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Lịch sử phân tích
          </CardTitle>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="make_vs_buy">Make vs Buy</SelectItem>
              <SelectItem value="break_even">Break-even</SelectItem>
              <SelectItem value="roi">ROI</SelectItem>
              <SelectItem value="npv_irr">NPV/IRR</SelectItem>
              <SelectItem value="payback">Payback</SelectItem>
              <SelectItem value="sensitivity">Sensitivity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {!analyses || analyses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Chưa có phân tích nào được lưu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.map((analysis) => {
                const StatusIcon = statusConfig[analysis.status]?.icon || Clock;
                const statusColor = statusConfig[analysis.status]?.color;
                const canSubmitForApproval = analysis.status === 'draft' || analysis.status === 'completed' || analysis.status === 'rejected';
                
                return (
                  <div
                    key={analysis.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {analysisTypeLabels[analysis.analysis_type] || analysis.analysis_type}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <StatusIcon className={`h-3 w-3 ${statusColor || 'text-muted-foreground'}`} />
                            <span className={`text-xs ${statusColor || 'text-muted-foreground'}`}>
                              {statusConfig[analysis.status]?.label || analysis.status}
                            </span>
                          </div>
                        </div>
                        <h4 className="font-medium text-sm truncate">{analysis.title}</h4>
                        {analysis.recommendation && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {analysis.recommendation}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(analysis.created_at), 'dd/MM/yyyy', { locale: vi })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {canSubmitForApproval && (
                          <SubmitForApprovalDialog analysis={analysis} />
                        )}
                        <AnalysisDetailDialog analysis={analysis} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
