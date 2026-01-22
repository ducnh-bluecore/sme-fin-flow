import { Users, ShieldCheck, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SampleCustomer {
  id: string;
  anonymizedId: string;
  segment: string;
  estimatedLTV: number;
  behaviorStatus: 'normal' | 'at_risk' | 'inactive';
  lastPurchase: string;
  purchaseCount: number;
  dataConfidence: number;
}

const sampleCustomers: SampleCustomer[] = [
  {
    id: '1',
    anonymizedId: 'KH-****8721',
    segment: 'TOP10',
    estimatedLTV: 18500000,
    behaviorStatus: 'normal',
    lastPurchase: '12/01/2026',
    purchaseCount: 24,
    dataConfidence: 92,
  },
  {
    id: '2',
    anonymizedId: 'KH-****3456',
    segment: 'TOP10',
    estimatedLTV: 15200000,
    behaviorStatus: 'normal',
    lastPurchase: '18/01/2026',
    purchaseCount: 18,
    dataConfidence: 88,
  },
  {
    id: '3',
    anonymizedId: 'KH-****9012',
    segment: 'TOP20',
    estimatedLTV: 8500000,
    behaviorStatus: 'at_risk',
    lastPurchase: '02/12/2025',
    purchaseCount: 12,
    dataConfidence: 75,
  },
  {
    id: '4',
    anonymizedId: 'KH-****5678',
    segment: 'TOP30',
    estimatedLTV: 4200000,
    behaviorStatus: 'at_risk',
    lastPurchase: '15/11/2025',
    purchaseCount: 8,
    dataConfidence: 70,
  },
  {
    id: '5',
    anonymizedId: 'KH-****1234',
    segment: 'Trung bình',
    estimatedLTV: 1200000,
    behaviorStatus: 'inactive',
    lastPurchase: '20/09/2025',
    purchaseCount: 3,
    dataConfidence: 55,
  },
];

export function EquityEvidencePanel() {
  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    return value.toLocaleString('vi-VN');
  };

  const getStatusBadge = (status: SampleCustomer['behaviorStatus']) => {
    switch (status) {
      case 'normal':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Bình thường</Badge>;
      case 'at_risk':
        return <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/20">Rủi ro</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Không hoạt động</Badge>;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-success';
    if (confidence >= 60) return 'text-warning-foreground';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      {/* Privacy Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">
                Chế độ Chỉ đọc – Bằng chứng Kiểm chứng
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Danh sách dưới đây chỉ dùng để kiểm chứng mô hình LTV và Customer Equity. 
                Thông tin được ẩn danh hóa và không thể xuất, chỉnh sửa, hay thực hiện hành động.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Customers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5" />
                Khách hàng Đại diện
              </CardTitle>
              <CardDescription>
                3-5 khách hàng minh họa cho phân bổ equity trong mỗi phân khúc
              </CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Chỉ đọc
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID ẩn danh</TableHead>
                <TableHead>Phân khúc</TableHead>
                <TableHead className="text-right">LTV Ước tính</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Mua gần nhất</TableHead>
                <TableHead className="text-right">Số đơn</TableHead>
                <TableHead className="text-right">Độ tin cậy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-mono text-sm">{customer.anonymizedId}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.segment}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₫{formatCurrency(customer.estimatedLTV)}
                  </TableCell>
                  <TableCell>{getStatusBadge(customer.behaviorStatus)}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.lastPurchase}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {customer.purchaseCount}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${getConfidenceColor(customer.dataConfidence)}`}>
                    {customer.dataConfidence}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Lưu ý:</strong> Đây là dữ liệu mẫu dùng để kiểm chứng mô hình. 
              Không hiển thị thông tin liên hệ. Không có hành động khả dụng.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Confidence Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Độ tin cậy Dữ liệu</CardTitle>
          <CardDescription>
            Chất lượng ghép dữ liệu của các khách hàng mẫu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-success/5 rounded-lg border border-success/20">
              <p className="text-2xl font-bold text-success">3</p>
              <p className="text-xs text-muted-foreground">Độ tin cậy cao (&gt;80%)</p>
            </div>
            <div className="text-center p-4 bg-warning/5 rounded-lg border border-warning/20">
              <p className="text-2xl font-bold text-warning-foreground">1</p>
              <p className="text-xs text-muted-foreground">Độ tin cậy TB (60-80%)</p>
            </div>
            <div className="text-center p-4 bg-destructive/5 rounded-lg border border-destructive/20">
              <p className="text-2xl font-bold text-destructive">1</p>
              <p className="text-xs text-muted-foreground">Độ tin cậy thấp (&lt;60%)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
