import { Shield, Database, AlertTriangle, Check, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface CustomerAuditData {
  internalId: string;
  anonymizedPhone: string;
  anonymizedEmail: string;
  mergeConfidence: number;
  sourceCount: number;
  mergeStatus: 'verified' | 'partial' | 'conflict';
  totalSpend: number;
  orderCount: number;
  aov: number;
  daysSinceLastPurchase: number;
  rfmScore: { r: number; f: number; m: number };
  clv: number;
  avgClvSegment: number;
  sources: {
    name: string;
    hasData: boolean;
    orderCount: number;
    totalValue: number;
    lastSync?: string;
  }[];
}

interface CustomerAuditHeaderProps {
  customer: CustomerAuditData;
}

export function CustomerAuditHeader({ customer }: CustomerAuditHeaderProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-success';
    if (confidence >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const getMergeStatusBadge = (status: CustomerAuditData['mergeStatus']) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            <Check className="w-3 h-3 mr-1" />
            Đã xác minh
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Hợp nhất một phần
          </Badge>
        );
      case 'conflict':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Có xung đột
          </Badge>
        );
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="pt-6">
        {/* Audit Mode Banner */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg border border-dashed">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Hồ sơ này dùng để <strong>KIỂM CHỨNG DỮ LIỆU</strong> – không dùng cho vận hành khách hàng.
          </p>
        </div>

        <div className="flex items-start gap-6">
          {/* Avatar/Identifier */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>

          {/* Main Info */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-semibold font-mono">{customer.internalId}</h2>
                {getMergeStatusBadge(customer.mergeStatus)}
              </div>
              <p className="text-sm text-muted-foreground">
                Màn hình này giúp xác minh dữ liệu khách hàng đã được hợp nhất đúng từ nhiều nguồn hay chưa.
              </p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Độ tin cậy hợp nhất</span>
                </div>
                <p className={cn("text-xl font-bold tabular-nums", getConfidenceColor(customer.mergeConfidence))}>
                  {customer.mergeConfidence}%
                </p>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Số nguồn dữ liệu</span>
                </div>
                <p className="text-xl font-bold tabular-nums">
                  {customer.sourceCount}
                </p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Định danh SĐT</span>
                <p className="text-sm font-mono mt-1">{customer.anonymizedPhone}</p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Định danh Email</span>
                <p className="text-sm font-mono mt-1">{customer.anonymizedEmail}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
