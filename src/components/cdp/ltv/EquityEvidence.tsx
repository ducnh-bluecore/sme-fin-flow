import { Users, ShieldCheck, Eye, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCDPEquityEvidence } from '@/hooks/useCDPEquity';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export function EquityEvidence() {
  const navigate = useNavigate();
  const { data: sampleCustomers, isLoading } = useCDPEquityEvidence();

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    return value.toLocaleString('vi-VN');
  };

  const getStatusBadge = (status: 'normal' | 'at_risk' | 'inactive') => {
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

  // Calculate confidence summary
  const confidenceSummary = useMemo(() => {
    if (!sampleCustomers || sampleCustomers.length === 0) {
      return { high: 0, medium: 0, low: 0 };
    }
    return {
      high: sampleCustomers.filter(c => c.data_confidence >= 80).length,
      medium: sampleCustomers.filter(c => c.data_confidence >= 60 && c.data_confidence < 80).length,
      low: sampleCustomers.filter(c => c.data_confidence < 60).length,
    };
  }, [sampleCustomers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                Khách hàng mẫu minh họa cho phân bổ equity trong mỗi phân khúc
              </CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Chỉ đọc
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {(!sampleCustomers || sampleCustomers.length === 0) ? (
            <div className="py-8 text-center text-muted-foreground">
              Chưa có đủ dữ liệu khách hàng để hiển thị mẫu
            </div>
          ) : (
            <>
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
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleCustomers.map((customer, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{customer.anonymized_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{customer.segment}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₫{formatCurrency(customer.estimated_ltv)}
                      </TableCell>
                      <TableCell>{getStatusBadge(customer.behavior_status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.last_purchase 
                          ? format(new Date(customer.last_purchase), 'dd/MM/yyyy', { locale: vi })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {customer.purchase_count}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${getConfidenceColor(customer.data_confidence)}`}>
                        {customer.data_confidence}%
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/cdp/audit/${customer.customer_id}`)}
                          title="Xem hồ sơ kiểm chứng"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Confidence Summary */}
      {sampleCustomers && sampleCustomers.length > 0 && (
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
                <p className="text-2xl font-bold text-success">{confidenceSummary.high}</p>
                <p className="text-xs text-muted-foreground">Độ tin cậy cao (&gt;80%)</p>
              </div>
              <div className="text-center p-4 bg-warning/5 rounded-lg border border-warning/20">
                <p className="text-2xl font-bold text-warning-foreground">{confidenceSummary.medium}</p>
                <p className="text-xs text-muted-foreground">Độ tin cậy TB (60-80%)</p>
              </div>
              <div className="text-center p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                <p className="text-2xl font-bold text-destructive">{confidenceSummary.low}</p>
                <p className="text-xs text-muted-foreground">Độ tin cậy thấp (&lt;60%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
