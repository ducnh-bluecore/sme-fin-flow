import { useState } from 'react';
import { Settings, Check, History, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LTVModel {
  id: string;
  name: string;
  description: string;
  timeframe: '12' | '24';
  totalEquity: number;
  atRiskPercent: number;
  confidence: 'high' | 'medium' | 'low';
  isActive: boolean;
}

interface LTVRule {
  segment: string;
  behavior: string;
  ltv12: number;
  ltv24: number;
  confidence: string;
}

const models: LTVModel[] = [
  {
    id: 'conservative',
    name: 'Thận trọng',
    description: 'Giả định retention thấp hơn 10%, AOV giảm 5%. Phù hợp khi thị trường khó khăn.',
    timeframe: '12',
    totalEquity: 38000000000,
    atRiskPercent: 22,
    confidence: 'high',
    isActive: false,
  },
  {
    id: 'base',
    name: 'Cơ sở',
    description: 'Giữ nguyên xu hướng hiện tại. Mô hình mặc định cho báo cáo điều hành.',
    timeframe: '12',
    totalEquity: 45000000000,
    atRiskPercent: 18,
    confidence: 'medium',
    isActive: true,
  },
  {
    id: 'optimistic',
    name: 'Lạc quan',
    description: 'Giả định retention tăng 5%, AOV tăng 8%. Phù hợp khi có chiến lược tăng trưởng mạnh.',
    timeframe: '12',
    totalEquity: 54000000000,
    atRiskPercent: 12,
    confidence: 'low',
    isActive: false,
  },
];

const ltvRules: LTVRule[] = [
  { segment: 'TOP10', behavior: 'Mua lại – Bình thường', ltv12: 18750000, ltv24: 32000000, confidence: '85%' },
  { segment: 'TOP10', behavior: 'Mua lại – Chậm', ltv12: 12500000, ltv24: 20000000, confidence: '70%' },
  { segment: 'TOP20', behavior: 'Mua lại – Bình thường', ltv12: 7500000, ltv24: 12000000, confidence: '80%' },
  { segment: 'TOP20', behavior: 'Mua lại – Chậm', ltv12: 5000000, ltv24: 7500000, confidence: '65%' },
  { segment: 'TOP30', behavior: 'Mua lại – Bình thường', ltv12: 5625000, ltv24: 9000000, confidence: '75%' },
  { segment: 'Trung bình', behavior: 'Bình thường', ltv12: 1250000, ltv24: 2000000, confidence: '60%' },
  { segment: 'Thấp', behavior: 'Không hoạt động 60d+', ltv12: 200000, ltv24: 300000, confidence: '40%' },
];

const auditHistory = [
  { date: '20/01/2026', user: 'Admin', action: 'Cập nhật ngưỡng retention TOP10', model: 'Cơ sở' },
  { date: '15/01/2026', user: 'CFO', action: 'Đổi mô hình active sang Cơ sở', model: 'Cơ sở' },
  { date: '10/01/2026', user: 'Admin', action: 'Thêm mô hình Lạc quan', model: 'Lạc quan' },
  { date: '05/01/2026', user: 'Admin', action: 'Khởi tạo mô hình', model: 'Thận trọng' },
];

export function LTVModelManager() {
  const [activeTab, setActiveTab] = useState<'models' | 'rules' | 'history'>('models');

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    return value.toLocaleString('vi-VN');
  };

  const getConfidenceBadge = (confidence: string) => {
    if (confidence === 'high') {
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Cao</Badge>;
    }
    if (confidence === 'medium') {
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">TB</Badge>;
    }
    return <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/20">Thấp</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Explainer */}
      <Card className="border-border bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">
                Mô hình Giả định Giá trị (LTV Model)
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Các mô hình dưới đây định nghĩa cách tính giá trị kỳ vọng từ khách hàng. Mỗi mô hình 
                có giả định khác nhau về retention, AOV, và thời gian quan hệ. Chọn mô hình phù hợp 
                với bối cảnh kinh doanh để có dự báo chính xác hơn.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="models" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Các mô hình
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Quy tắc gán LTV
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Lịch sử thay đổi
          </TabsTrigger>
        </TabsList>

        {/* Models Tab */}
        <TabsContent value="models" className="mt-6 space-y-4">
          {models.map((model) => (
            <Card key={model.id} className={model.isActive ? 'border-primary' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{model.name}</h3>
                      {model.isActive && (
                        <Badge className="bg-primary text-primary-foreground">
                          <Check className="w-3 h-3 mr-1" />
                          Đang dùng
                        </Badge>
                      )}
                      {getConfidenceBadge(model.confidence)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{model.description}</p>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Tổng Equity (12M)</p>
                        <p className="text-lg font-bold">₫{formatCurrency(model.totalEquity)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Giá trị Rủi ro</p>
                        <p className="text-lg font-bold text-warning-foreground">{model.atRiskPercent}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Độ tin cậy</p>
                        <p className="text-lg font-bold capitalize">
                          {model.confidence === 'high' ? 'Cao' : model.confidence === 'medium' ? 'Trung bình' : 'Thấp'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {!model.isActive && (
                    <Button variant="outline" size="sm">
                      Chọn mô hình này
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="border-dashed">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">So sánh tác động</p>
                  <p className="text-sm text-muted-foreground">
                    Chênh lệch giữa mô hình Thận trọng và Lạc quan: <strong>₫16 tỷ</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Thận trọng</span>
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <span className="font-medium">₫38 tỷ</span>
                  <span className="text-muted-foreground mx-2">→</span>
                  <span className="font-medium">₫54 tỷ</span>
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-muted-foreground">Lạc quan</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quy tắc gán LTV theo Tập khách & Hành vi</CardTitle>
              <CardDescription>
                Mỗi khách hàng được gán LTV dựa trên phân khúc giá trị và trạng thái hành vi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tập khách</TableHead>
                    <TableHead>Trạng thái Hành vi</TableHead>
                    <TableHead className="text-right">LTV 12 tháng</TableHead>
                    <TableHead className="text-right">LTV 24 tháng</TableHead>
                    <TableHead className="text-right">Độ tin cậy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ltvRules.map((rule, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{rule.segment}</TableCell>
                      <TableCell className="text-muted-foreground">{rule.behavior}</TableCell>
                      <TableCell className="text-right">₫{formatCurrency(rule.ltv12)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ₫{formatCurrency(rule.ltv24)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-xs">{rule.confidence}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Công thức LTV đang dùng:</strong> LTV = AOV × Tần suất mua/năm × Số năm dự kiến × (1 - Tỷ lệ hoàn trả)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lịch sử thay đổi Mô hình</CardTitle>
              <CardDescription>
                Audit trail cho mọi thay đổi giả định LTV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Người thực hiện</TableHead>
                    <TableHead>Hành động</TableHead>
                    <TableHead>Mô hình</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditHistory.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-muted-foreground">{item.date}</TableCell>
                      <TableCell className="font-medium">{item.user}</TableCell>
                      <TableCell>{item.action}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.model}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
