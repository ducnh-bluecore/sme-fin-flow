import { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { FileText, Trash2, Eye, CheckCircle, Clock, Archive, Filter, Send, XCircle, TrendingUp, Calculator, Percent, DollarSign, Calendar } from 'lucide-react';
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

// Label mapping for parameters
const parameterLabels: Record<string, string> = {
  initialInvestment: 'Vốn đầu tư ban đầu',
  year1Return: 'Lợi nhuận năm 1',
  year2Return: 'Lợi nhuận năm 2',
  year3Return: 'Lợi nhuận năm 3',
  year4Return: 'Lợi nhuận năm 4',
  year5Return: 'Lợi nhuận năm 5',
  discountRate: 'Tỷ lệ chiết khấu',
  fixedCosts: 'Chi phí cố định',
  variableCostPerUnit: 'Chi phí biến đổi/đơn vị',
  pricePerUnit: 'Giá bán/đơn vị',
  expectedVolume: 'Sản lượng dự kiến',
  makeCost: 'Chi phí tự sản xuất',
  buyCost: 'Chi phí thuê ngoài',
  investmentCost: 'Chi phí đầu tư',
  annualSavings: 'Tiết kiệm hàng năm',
};

// Label mapping for results
const resultLabels: Record<string, string> = {
  roi: 'ROI',
  netProfit: 'Lợi nhuận ròng',
  totalReturns: 'Tổng lợi nhuận',
  annualizedROI: 'ROI hàng năm',
  npv: 'NPV',
  irr: 'IRR',
  paybackPeriod: 'Thời gian hoàn vốn',
  breakEvenPoint: 'Điểm hòa vốn',
  breakEvenUnits: 'Số lượng hòa vốn',
  breakEvenRevenue: 'Doanh thu hòa vốn',
  recommendation: 'Khuyến nghị',
  savings: 'Tiết kiệm',
  makeTotal: 'Tổng chi phí tự làm',
  buyTotal: 'Tổng chi phí thuê ngoài',
};

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined) return '-';
  
  // Percentage fields
  if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('roi') || key.toLowerCase().includes('irr') || key.toLowerCase().includes('margin')) {
    if (typeof value === 'number') {
      return `${value.toFixed(2)}%`;
    }
  }
  
  // Currency/money fields
  if (key.toLowerCase().includes('cost') || key.toLowerCase().includes('investment') || 
      key.toLowerCase().includes('return') || key.toLowerCase().includes('profit') || 
      key.toLowerCase().includes('savings') || key.toLowerCase().includes('revenue') ||
      key.toLowerCase().includes('npv') || key.toLowerCase().includes('total')) {
    if (typeof value === 'number') {
      return formatVNDCompact(value);
    }
  }
  
  // Period/time fields
  if (key.toLowerCase().includes('period') || key.toLowerCase().includes('year')) {
    if (typeof value === 'number') {
      return `${value.toFixed(1)} năm`;
    }
  }
  
  // Units
  if (key.toLowerCase().includes('unit') || key.toLowerCase().includes('volume') || key.toLowerCase().includes('point')) {
    if (typeof value === 'number') {
      return value.toLocaleString('vi-VN');
    }
  }
  
  // Default number formatting
  if (typeof value === 'number') {
    return value.toLocaleString('vi-VN');
  }
  
  return String(value);
}

function DataTable({ data, labels }: { data: Record<string, any>; labels: Record<string, string> }) {
  const entries = Object.entries(data).filter(([_, value]) => value !== null && value !== undefined);
  
  if (entries.length === 0) return null;
  
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {entries.map(([key, value], index) => (
            <tr key={key} className={index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}>
              <td className="px-4 py-2.5 font-medium text-muted-foreground border-r w-1/2">
                {labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </td>
              <td className="px-4 py-2.5 font-semibold text-right">
                {formatValue(key, value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
        <div className="space-y-5">
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

          {analysis.parameters && Object.keys(analysis.parameters).length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Tham số đầu vào
              </h4>
              <DataTable data={analysis.parameters} labels={parameterLabels} />
            </div>
          )}

          {analysis.results && Object.keys(analysis.results).length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Kết quả phân tích
              </h4>
              <DataTable data={analysis.results} labels={resultLabels} />
            </div>
          )}

          {analysis.recommendation && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Khuyến nghị
              </h4>
              <p className="text-sm">{analysis.recommendation}</p>
            </div>
          )}

          {analysis.ai_insights && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="font-medium mb-2">AI Insights</h4>
              <p className="text-sm">{analysis.ai_insights}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
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
