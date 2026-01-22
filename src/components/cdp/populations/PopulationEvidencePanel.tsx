import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';

interface SampleCustomer {
  id: string;
  anonymizedId: string;
  purchaseCount: number;
  totalSpend: number;
  lastPurchase: string;
  matchScore: number; // How well they match the criteria
  status: 'verified' | 'edge_case';
}

interface PopulationEvidencePanelProps {
  populationName: string;
  samples: SampleCustomer[];
  onClose: () => void;
}

function MatchBadge({ score }: { score: number }) {
  if (score >= 90) {
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Khớp cao
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/20 gap-1">
      <AlertTriangle className="w-3 h-3" />
      Edge case
    </Badge>
  );
}

export function PopulationEvidencePanel({ 
  populationName, 
  samples, 
  onClose 
}: PopulationEvidencePanelProps) {
  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Bằng chứng xác minh
            </CardTitle>
            <CardDescription className="mt-1">
              {samples.length} khách hàng mẫu từ tập "{populationName}"
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Privacy Notice */}
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <EyeOff className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Chế độ chỉ đọc — Không hiển thị thông tin nhận dạng</p>
            <p>
              Dữ liệu được ẩn danh hóa. Chỉ dùng để xác minh logic phân loại, 
              không phục vụ mục đích liên hệ hay hành động.
            </p>
          </div>
        </div>

        {/* Sample Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[140px]">ID ẩn danh</TableHead>
                <TableHead className="text-right w-[80px]">Số đơn</TableHead>
                <TableHead className="text-right w-[120px]">Tổng chi tiêu</TableHead>
                <TableHead className="w-[120px]">Mua gần nhất</TableHead>
                <TableHead className="w-[100px]">Mức khớp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {samples.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-mono text-sm">
                    {customer.anonymizedId}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {customer.purchaseCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatVNDCompact(customer.totalSpend)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {customer.lastPurchase}
                  </TableCell>
                  <TableCell>
                    <MatchBadge score={customer.matchScore} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <p className="text-lg font-semibold tabular-nums">
              {samples.filter(s => s.matchScore >= 90).length}/{samples.length}
            </p>
            <p className="text-xs text-muted-foreground">Khớp cao</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold tabular-nums">
              {samples.filter(s => s.matchScore < 90).length}
            </p>
            <p className="text-xs text-muted-foreground">Edge cases</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold tabular-nums">
              {Math.round(samples.reduce((sum, s) => sum + s.matchScore, 0) / samples.length)}%
            </p>
            <p className="text-xs text-muted-foreground">Độ tin cậy TB</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
