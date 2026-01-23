import { useState } from 'react';
import { Settings, Check, History, AlertCircle, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCDPLTVModels, useCDPLTVRules, useCDPLTVAuditHistory } from '@/hooks/useCDPEquity';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export function LTVModelManager() {
  const [activeTab, setActiveTab] = useState<'models' | 'rules' | 'history'>('models');
  
  const { data: models, isLoading: isLoadingModels } = useCDPLTVModels();
  const { data: ltvRules, isLoading: isLoadingRules } = useCDPLTVRules();
  const { data: auditHistory, isLoading: isLoadingHistory } = useCDPLTVAuditHistory();

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

  const isLoading = isLoadingModels || isLoadingRules || isLoadingHistory;

  // Calculate comparison values for the summary card
  const conservativeModel = models?.find(m => m.model_id === 'conservative');
  const optimisticModel = models?.find(m => m.model_id === 'optimistic');
  const modelDiff = (optimisticModel?.total_equity || 54000000000) - (conservativeModel?.total_equity || 38000000000);

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
          {isLoadingModels ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {(models || []).map((model) => (
                <Card key={model.model_id} className={model.is_active ? 'border-primary' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{model.name}</h3>
                          {model.is_active && (
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
                            <p className="text-lg font-bold">₫{formatCurrency(model.total_equity)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Giá trị Rủi ro</p>
                            <p className="text-lg font-bold text-warning-foreground">{model.at_risk_percent.toFixed(0)}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Độ tin cậy</p>
                            <p className="text-lg font-bold capitalize">
                              {model.confidence === 'high' ? 'Cao' : model.confidence === 'medium' ? 'Trung bình' : 'Thấp'}
                            </p>
                          </div>
                        </div>
                      </div>
                      {!model.is_active && (
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
                        Chênh lệch giữa mô hình Thận trọng và Lạc quan: <strong>₫{formatCurrency(modelDiff)}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Thận trọng</span>
                      <TrendingDown className="w-4 h-4 text-destructive" />
                      <span className="font-medium">₫{formatCurrency(conservativeModel?.total_equity || 38000000000)}</span>
                      <span className="text-muted-foreground mx-2">→</span>
                      <span className="font-medium">₫{formatCurrency(optimisticModel?.total_equity || 54000000000)}</span>
                      <TrendingUp className="w-4 h-4 text-success" />
                      <span className="text-muted-foreground">Lạc quan</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
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
              {isLoadingRules ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
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
                      {(ltvRules || []).map((rule, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{rule.segment}</TableCell>
                          <TableCell className="text-muted-foreground">{rule.behavior}</TableCell>
                          <TableCell className="text-right">₫{formatCurrency(rule.ltv_12m)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            ₫{formatCurrency(rule.ltv_24m)}
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
                </>
              )}
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
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
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
                    {(auditHistory || []).map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(item.change_date), 'dd/MM/yyyy', { locale: vi })}
                        </TableCell>
                        <TableCell className="font-medium">{item.user_name}</TableCell>
                        <TableCell>{item.action_description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.model_name}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}