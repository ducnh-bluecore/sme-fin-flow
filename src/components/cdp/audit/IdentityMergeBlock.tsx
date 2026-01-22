import { Database, Check, X, AlertTriangle, Link } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DataSource {
  name: string;
  hasData: boolean;
  orderCount: number;
  totalValue: number;
  lastSync?: string;
}

interface IdentityMergeBlockProps {
  anonymizedPhone: string;
  anonymizedEmail: string;
  mergeConfidence: number;
  sources: DataSource[];
  conflictNotes?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}tr`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString('vi-VN');
}

export function IdentityMergeBlock({
  anonymizedPhone,
  anonymizedEmail,
  mergeConfidence,
  sources,
  conflictNotes
}: IdentityMergeBlockProps) {
  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 90) return { label: 'Cao', color: 'text-success', bgColor: 'bg-success' };
    if (confidence >= 70) return { label: 'Trung bình', color: 'text-warning', bgColor: 'bg-warning' };
    return { label: 'Thấp', color: 'text-destructive', bgColor: 'bg-destructive' };
  };

  const confidenceLevel = getConfidenceLevel(mergeConfidence);
  const sourcesWithData = sources.filter(s => s.hasData).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Link className="w-5 h-5" />
              Định danh & Hợp nhất Dữ liệu
            </CardTitle>
            <CardDescription>
              CDP đã hợp nhất khách hàng này đúng chưa?
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-normal">
            <Database className="w-3 h-3 mr-1" />
            {sourcesWithData}/{sources.length} nguồn
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Identifiers Section */}
        <div>
          <h4 className="text-sm font-medium mb-3">Các định danh được dùng</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <span className="text-xs text-muted-foreground">Số điện thoại (ẩn danh)</span>
              <p className="font-mono text-sm mt-1">{anonymizedPhone}</p>
            </div>
            <div className="p-3 border rounded-lg">
              <span className="text-xs text-muted-foreground">Email (ẩn danh)</span>
              <p className="font-mono text-sm mt-1">{anonymizedEmail}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Merge Confidence */}
        <div>
          <h4 className="text-sm font-medium mb-3">Độ tin cậy hợp nhất (Match Confidence)</h4>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={mergeConfidence} className="h-2" />
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-2xl font-bold tabular-nums", confidenceLevel.color)}>
                {mergeConfidence}%
              </span>
              <Badge 
                variant="outline" 
                className={cn(
                  "font-normal",
                  confidenceLevel.color === 'text-success' && "bg-success/10 border-success/20",
                  confidenceLevel.color === 'text-warning' && "bg-warning/10 border-warning/20",
                  confidenceLevel.color === 'text-destructive' && "bg-destructive/10 border-destructive/20"
                )}
              >
                {confidenceLevel.label}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Data Sources */}
        <div>
          <h4 className="text-sm font-medium mb-3">Danh sách nguồn dữ liệu</h4>
          <div className="space-y-2">
            {sources.map((source) => (
              <div 
                key={source.name}
                className={cn(
                  "flex items-center justify-between p-3 border rounded-lg",
                  source.hasData ? "bg-muted/20" : "bg-muted/5 opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                  {source.hasData ? (
                    <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-success" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-sm">{source.name}</span>
                    {source.lastSync && (
                      <p className="text-xs text-muted-foreground">
                        Đồng bộ: {source.lastSync}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {source.hasData ? (
                    <>
                      <p className="text-sm font-medium tabular-nums">{source.orderCount} đơn</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(source.totalValue)}</p>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Không có dữ liệu</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conflict Notes */}
        {conflictNotes && (
          <>
            <Separator />
            <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning">Ghi chú xung đột</p>
                  <p className="text-sm text-muted-foreground mt-1">{conflictNotes}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
