import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, AlertTriangle, CheckCircle, XCircle, 
  Plus, Calendar, Building, TrendingUp 
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  useCovenants, 
  useCovenantSummary, 
  useCreateCovenant,
  useRecordMeasurement,
  getCovenantTypeLabel,
  type BankCovenant
} from '@/hooks/useCovenantTracking';
import { formatNumber, formatPercent } from '@/lib/formatters';

export default function CovenantTrackingPage() {
  const { data: covenants, isLoading } = useCovenants();
  const { data: summary } = useCovenantSummary();
  const createCovenant = useCreateCovenant();
  const recordMeasurement = useRecordMeasurement();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMeasureDialog, setShowMeasureDialog] = useState(false);
  const [selectedCovenant, setSelectedCovenant] = useState<BankCovenant | null>(null);
  const [measureValue, setMeasureValue] = useState('');
  const [measureNotes, setMeasureNotes] = useState('');
  
  const [newCovenant, setNewCovenant] = useState({
    covenant_name: '',
    covenant_type: 'current_ratio' as BankCovenant['covenant_type'],
    lender_name: '',
    threshold_value: 0,
    threshold_operator: '>=' as BankCovenant['threshold_operator'],
    warning_threshold: 0,
    measurement_frequency: 'quarterly' as BankCovenant['measurement_frequency'],
  });

  const statusConfig = {
    compliant: { 
      icon: CheckCircle, 
      color: 'text-green-600', 
      bg: 'bg-green-500/20',
      label: 'Tuân thủ' 
    },
    warning: { 
      icon: AlertTriangle, 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-500/20',
      label: 'Cảnh báo' 
    },
    breach: { 
      icon: XCircle, 
      color: 'text-red-600', 
      bg: 'bg-red-500/20',
      label: 'Vi phạm' 
    },
    waiver: { 
      icon: Shield, 
      color: 'text-blue-600', 
      bg: 'bg-blue-500/20',
      label: 'Miễn trừ' 
    },
  };

  const handleAddCovenant = () => {
    createCovenant.mutate(newCovenant as any, {
      onSuccess: () => {
        setShowAddDialog(false);
        setNewCovenant({
          covenant_name: '',
          covenant_type: 'current_ratio',
          lender_name: '',
          threshold_value: 0,
          threshold_operator: '>=',
          warning_threshold: 0,
          measurement_frequency: 'quarterly',
        });
      },
    });
  };

  const handleRecordMeasurement = () => {
    if (!selectedCovenant) return;
    recordMeasurement.mutate({
      covenantId: selectedCovenant.id,
      measuredValue: parseFloat(measureValue),
      notes: measureNotes,
    }, {
      onSuccess: () => {
        setShowMeasureDialog(false);
        setSelectedCovenant(null);
        setMeasureValue('');
        setMeasureNotes('');
      },
    });
  };

  const getComplianceProgress = (covenant: BankCovenant) => {
    const current = covenant.current_value;
    const threshold = covenant.threshold_value;
    const warning = covenant.warning_threshold || threshold;
    
    if (covenant.threshold_operator === '>=' || covenant.threshold_operator === '>') {
      // Higher is better
      const range = threshold * 2;
      return Math.min(100, (current / range) * 100);
    } else {
      // Lower is better
      const range = threshold * 2;
      return Math.min(100, ((range - current) / range) * 100);
    }
  };

  return (
    <>
      <Helmet>
        <title>Theo dõi Covenant | CFO Dashboard</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader 
            title="Theo dõi Covenant"
            subtitle="Giám sát cam kết tài chính với ngân hàng và tổ chức tín dụng"
          />
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm Covenant
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className={`${
            summary?.overallHealth === 'critical' ? 'border-red-500' :
            summary?.overallHealth === 'caution' ? 'border-yellow-500' :
            'border-green-500'
          } border-2`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tình trạng tổng thể
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${
                summary?.overallHealth === 'critical' ? 'text-red-600' :
                summary?.overallHealth === 'caution' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {summary?.overallHealth === 'critical' ? 'Nghiêm trọng' :
                 summary?.overallHealth === 'caution' ? 'Cần chú ý' :
                 'Tốt'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Tuân thủ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary?.compliant || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Cảnh báo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {summary?.warning || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-600" />
                Vi phạm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary?.breach || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Shield className="h-4 w-4 text-blue-600" />
                Miễn trừ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summary?.waiver || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Measurements Alert */}
        {summary?.upcomingMeasurements && summary.upcomingMeasurements.length > 0 && (
          <Card className="border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-yellow-600" />
                Sắp đến kỳ đo lường ({summary.upcomingMeasurements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {summary.upcomingMeasurements.map(c => (
                  <Badge key={c.id} variant="outline" className="py-1">
                    <span className="font-medium">{c.covenant_name}</span>
                    <span className="mx-1 text-muted-foreground">|</span>
                    <span className="text-muted-foreground">
                      {c.next_measurement_date && differenceInDays(parseISO(c.next_measurement_date), new Date())} ngày
                    </span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Covenant List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Danh sách Covenant
            </CardTitle>
            <CardDescription>
              Tất cả cam kết tài chính đang theo dõi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : !covenants || covenants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Chưa có covenant nào</p>
                <p className="text-sm">Nhấn "Thêm Covenant" để bắt đầu theo dõi</p>
              </div>
            ) : (
              <div className="space-y-4">
                {covenants.map(covenant => {
                  const StatusIcon = statusConfig[covenant.status].icon;
                  return (
                    <div 
                      key={covenant.id}
                      className={`p-4 rounded-lg border ${statusConfig[covenant.status].bg}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <StatusIcon className={`h-6 w-6 mt-0.5 ${statusConfig[covenant.status].color}`} />
                          <div>
                            <h3 className="font-semibold">{covenant.covenant_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {covenant.lender_name} • {getCovenantTypeLabel(covenant.covenant_type)}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span>
                                Ngưỡng: <strong>{covenant.threshold_operator} {formatNumber(covenant.threshold_value)}</strong>
                              </span>
                              <span>
                                Hiện tại: <strong className={statusConfig[covenant.status].color}>
                                  {formatNumber(covenant.current_value)}
                                </strong>
                              </span>
                              <span>
                                Biên an toàn: <strong>{formatNumber(covenant.compliance_margin)}</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusConfig[covenant.status].bg}>
                            {statusConfig[covenant.status].label}
                          </Badge>
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedCovenant(covenant);
                              setShowMeasureDialog(true);
                            }}
                          >
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Đo lường
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Progress 
                          value={getComplianceProgress(covenant)} 
                          className="h-2"
                        />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>0</span>
                          <span>
                            Đo lường tiếp: {covenant.next_measurement_date 
                              ? format(parseISO(covenant.next_measurement_date), 'dd/MM/yyyy', { locale: vi })
                              : 'Chưa đặt'}
                          </span>
                          <span>{formatNumber(covenant.threshold_value * 2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Covenant Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm Covenant mới</DialogTitle>
            <DialogDescription>
              Thêm cam kết tài chính mới để theo dõi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên Covenant</Label>
              <Input 
                value={newCovenant.covenant_name}
                onChange={(e) => setNewCovenant({...newCovenant, covenant_name: e.target.value})}
                placeholder="VD: Tỷ số thanh toán hiện hành"
              />
            </div>
            <div>
              <Label>Loại</Label>
              <Select 
                value={newCovenant.covenant_type}
                onValueChange={(v) => setNewCovenant({...newCovenant, covenant_type: v as any})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_ratio">Tỷ số thanh toán hiện hành</SelectItem>
                  <SelectItem value="debt_equity">Nợ/Vốn chủ sở hữu</SelectItem>
                  <SelectItem value="dscr">Tỷ số khả năng trả nợ (DSCR)</SelectItem>
                  <SelectItem value="interest_coverage">Tỷ số thanh toán lãi vay</SelectItem>
                  <SelectItem value="leverage">Đòn bẩy tài chính</SelectItem>
                  <SelectItem value="liquidity">Tỷ số thanh khoản</SelectItem>
                  <SelectItem value="custom">Tùy chỉnh</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tổ chức cho vay</Label>
              <Input 
                value={newCovenant.lender_name}
                onChange={(e) => setNewCovenant({...newCovenant, lender_name: e.target.value})}
                placeholder="VD: Vietcombank"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Điều kiện</Label>
                <Select 
                  value={newCovenant.threshold_operator}
                  onValueChange={(v) => setNewCovenant({...newCovenant, threshold_operator: v as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">=">≥ (Lớn hơn hoặc bằng)</SelectItem>
                    <SelectItem value="<=">≤ (Nhỏ hơn hoặc bằng)</SelectItem>
                    <SelectItem value=">">{'>'} (Lớn hơn)</SelectItem>
                    <SelectItem value="<">{'<'} (Nhỏ hơn)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ngưỡng</Label>
                <Input 
                  type="number"
                  value={newCovenant.threshold_value}
                  onChange={(e) => setNewCovenant({...newCovenant, threshold_value: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <Label>Ngưỡng cảnh báo</Label>
              <Input 
                type="number"
                value={newCovenant.warning_threshold}
                onChange={(e) => setNewCovenant({...newCovenant, warning_threshold: parseFloat(e.target.value)})}
                placeholder="Cảnh báo khi tiến gần ngưỡng vi phạm"
              />
            </div>
            <div>
              <Label>Tần suất đo lường</Label>
              <Select 
                value={newCovenant.measurement_frequency}
                onValueChange={(v) => setNewCovenant({...newCovenant, measurement_frequency: v as any})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Hàng tháng</SelectItem>
                  <SelectItem value="quarterly">Hàng quý</SelectItem>
                  <SelectItem value="annually">Hàng năm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleAddCovenant} disabled={createCovenant.isPending}>
              {createCovenant.isPending ? 'Đang lưu...' : 'Thêm Covenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Measurement Dialog */}
      <Dialog open={showMeasureDialog} onOpenChange={setShowMeasureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ghi nhận đo lường</DialogTitle>
            <DialogDescription>
              {selectedCovenant?.covenant_name} - {selectedCovenant?.lender_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Ngưỡng yêu cầu: <strong>{selectedCovenant?.threshold_operator} {formatNumber(selectedCovenant?.threshold_value || 0)}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Giá trị hiện tại: <strong>{formatNumber(selectedCovenant?.current_value || 0)}</strong>
              </p>
            </div>
            <div>
              <Label>Giá trị đo được</Label>
              <Input 
                type="number"
                value={measureValue}
                onChange={(e) => setMeasureValue(e.target.value)}
                placeholder="Nhập giá trị"
              />
            </div>
            <div>
              <Label>Ghi chú</Label>
              <Textarea 
                value={measureNotes}
                onChange={(e) => setMeasureNotes(e.target.value)}
                placeholder="Ghi chú về kết quả đo lường..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeasureDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleRecordMeasurement} disabled={recordMeasurement.isPending}>
              {recordMeasurement.isPending ? 'Đang lưu...' : 'Ghi nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
