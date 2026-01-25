import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  Users, 
  AlertTriangle, 
  TrendingDown,
  ExternalLink,
  Calendar,
  User,
  MessageSquare,
  CheckCircle2,
  Clock,
  Eye,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DecisionCardData } from './DecisionQueueCard';
import { useRecordDecision } from '@/hooks/useCDPDecisionCards';

interface DecisionDetailViewProps {
  card: DecisionCardData & {
    problemStatement: string;
    relatedInsights: Array<{
      code: string;
      title: string;
      change: string;
      impact: string;
    }>;
    affectedPopulation: {
      description: string;
      size: number;
      revenueShare: number;
      equityShare: number;
    };
    risks: {
      revenue: string;
      cashflow: string;
      longTerm: string;
      level: 'low' | 'medium' | 'high';
    };
    options?: string[];
    decision?: {
      outcome: string;
      note: string;
      decidedAt: string;
      decidedBy: string;
    };
    postDecisionReview?: string;
  };
}

const statusStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  new: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/20', label: 'Mới' },
  reviewing: { bg: 'bg-warning/10', text: 'text-warning-foreground', border: 'border-warning/20', label: 'Đang xem xét' },
  decide: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', label: 'Đã quyết' },
  decided: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', label: 'Đã quyết' },
  archived: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted', label: 'Lưu trữ' },
};

const defaultStatusStyle = { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted', label: 'Không xác định' };

const riskLevelStyles: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-warning/10 text-warning-foreground',
  high: 'bg-destructive/10 text-destructive',
};

// Helper: Convert technical problem statement to business language
function formatProblemAsBusinessContext(rawStatement: string, customerCount: number, riskAmount: number): string {
  // Parse common patterns and convert to business language
  const lowerStatement = rawStatement.toLowerCase();
  
  // Pattern: LTV/inactive customers
  if (lowerStatement.includes('inactive') || lowerStatement.includes('churn') || lowerStatement.includes('ltv')) {
    const avgLTV = riskAmount && customerCount ? Math.round(riskAmount / customerCount) : 0;
    return `Nhóm ${customerCount.toLocaleString()} khách hàng có giá trị cao (LTV trung bình ~${avgLTV > 0 ? (avgLTV / 1_000_000).toFixed(1) + 'M' : '1M+'} VND) đang ngừng mua hàng. Nếu không can thiệp, doanh nghiệp có thể mất ${riskAmount > 0 ? (riskAmount / 1_000_000).toFixed(0) + 'M VND' : 'một khoản đáng kể'} doanh thu tiềm năng.`;
  }
  
  // Pattern: Discount/margin erosion
  if (lowerStatement.includes('discount') || lowerStatement.includes('margin') || lowerStatement.includes('shopee')) {
    return `Chi phí khuyến mãi/chiết khấu đang ăn mòn biên lợi nhuận. Xu hướng này nếu tiếp tục sẽ ảnh hưởng trực tiếp đến dòng tiền và khả năng sinh lời của kênh bán.`;
  }
  
  // Pattern: Fee/platform cost
  if (lowerStatement.includes('fee') || lowerStatement.includes('tiktok') || lowerStatement.includes('platform')) {
    return `Chi phí vận hành trên kênh bán đang tăng cao hơn mức bền vững. Cần đánh giá lại cơ cấu chi phí để đảm bảo lợi nhuận dương.`;
  }
  
  // Pattern: Cohort/new customer quality
  if (lowerStatement.includes('cohort') || lowerStatement.includes('acquisition') || lowerStatement.includes('new customer')) {
    return `Chất lượng khách hàng mới đang có dấu hiệu suy giảm. Điều này ảnh hưởng trực tiếp đến giá trị tài sản khách hàng dài hạn và ROI của hoạt động marketing.`;
  }
  
  // Default: Clean up technical jargon
  return rawStatement
    .replace(/FDP\s*external_orders:/gi, 'Dữ liệu cho thấy:')
    .replace(/LTV\s*avg/gi, 'giá trị trung bình')
    .replace(/inactive\s*(\d+)\+?\s*days/gi, 'không hoạt động hơn $1 ngày')
    .replace(/Total\s*risk:/gi, 'Tổng giá trị rủi ro:');
}

// Helper: Generate business implication
function getBusinessImplication(title: string, riskAmount: number, customerCount: number): string {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('churn') || lowerTitle.includes('retain') || lowerTitle.includes('ltv')) {
    return `Khách hàng giá trị cao một khi rời đi rất khó thu hút lại. Chi phí acquire khách mới thường cao gấp 5-7 lần chi phí giữ chân khách hiện tại.`;
  }
  
  if (lowerTitle.includes('discount') || lowerTitle.includes('margin')) {
    return `Biên lợi nhuận bị xói mòn sẽ tạo áp lực lên dòng tiền và hạn chế khả năng đầu tư phát triển. Cần cân bằng giữa tăng trưởng và lợi nhuận.`;
  }
  
  if (lowerTitle.includes('fee') || lowerTitle.includes('cost')) {
    return `Chi phí vận hành tăng không kiểm soát sẽ ảnh hưởng trực tiếp đến điểm hòa vốn và khả năng cạnh tranh về giá.`;
  }
  
  if (lowerTitle.includes('cohort') || lowerTitle.includes('acquisition')) {
    return `Chất lượng khách hàng mới quyết định giá trị tài sản khách hàng (Customer Equity) trong 12-24 tháng tới.`;
  }
  
  return `Vấn đề này nếu không được xử lý có thể ảnh hưởng đến ${riskAmount > 0 ? (riskAmount / 1_000_000).toFixed(0) + 'M VND' : 'doanh thu'} trong kỳ tới.`;
}

export function DecisionDetailView({ card }: DecisionDetailViewProps) {
  const navigate = useNavigate();
  const [decisionOutcome, setDecisionOutcome] = useState(card.decision?.outcome || '');
  const [decisionNote, setDecisionNote] = useState(card.decision?.note || '');
  const statusStyle = statusStyles[card.status] || defaultStatusStyle;
  const recordDecision = useRecordDecision();

  const handleRecordDecision = () => {
    if (!decisionOutcome || !decisionNote.trim()) return;
    
    recordDecision.mutate({
      cardId: card.id,
      outcome: decisionOutcome,
      note: decisionNote,
      decidedBy: card.owner || 'CEO',
    });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
    return value.toLocaleString('vi-VN');
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate('/cdp/decisions')}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại danh sách
      </Button>

      {/* [A] Card Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                  {statusStyle.label}
                </Badge>
                <Badge variant="outline" className={riskLevelStyles[card.severity]}>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Mức độ: {card.severity === 'high' ? 'Cao' : card.severity === 'medium' ? 'TB' : 'Thấp'}
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  <User className="w-3 h-3 mr-1" />
                  {card.owner}
                </Badge>
              </div>
              <CardTitle className="text-xl">{card.title}</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Tạo: {card.createdAt}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Thời hạn xem xét: {card.reviewDeadline}
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* [B] Problem Statement - Business Context */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Vấn đề Kinh doanh
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Business Interpretation */}
          <div className="space-y-2">
            <p className="text-base leading-relaxed font-medium">
              {formatProblemAsBusinessContext(card.problemStatement, card.affectedPopulation.size, card.equityImpact)}
            </p>
          </div>
          
          {/* Key Business Metrics - At a Glance */}
          {(card.equityImpact > 0 || card.affectedPopulation.size > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
              {card.affectedPopulation.size > 0 && (
                <div className="bg-background p-3 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{card.affectedPopulation.size.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">khách hàng bị ảnh hưởng</p>
                </div>
              )}
              {card.equityImpact > 0 && (
                <div className="bg-background p-3 rounded-lg">
                  <p className="text-2xl font-bold text-destructive">₫{formatCurrency(card.equityImpact)}</p>
                  <p className="text-xs text-muted-foreground">doanh thu đang rủi ro</p>
                </div>
              )}
              {card.affectedPopulation.revenueShare > 0 && (
                <div className="bg-background p-3 rounded-lg">
                  <p className="text-2xl font-bold">{card.affectedPopulation.revenueShare}%</p>
                  <p className="text-xs text-muted-foreground">tỷ trọng doanh thu</p>
                </div>
              )}
            </div>
          )}
          
          {/* Why it matters - Business implication */}
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
            <p className="text-sm font-medium text-warning-foreground mb-1">⚠️ Tại sao cần quan tâm?</p>
            <p className="text-sm text-muted-foreground">
              {getBusinessImplication(card.title, card.equityImpact, card.affectedPopulation.size)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* [C] Related Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Dữ liệu & Insight Liên quan
          </CardTitle>
          <CardDescription>Các tín hiệu dẫn đến việc tạo thẻ quyết định này</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Thay đổi</TableHead>
                <TableHead>Ảnh hưởng</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {card.relatedInsights.map((insight) => (
                <TableRow key={insight.code}>
                  <TableCell className="font-mono text-sm">{insight.code}</TableCell>
                  <TableCell>{insight.title}</TableCell>
                  <TableCell className="text-destructive">{insight.change}</TableCell>
                  <TableCell className="text-muted-foreground">{insight.impact}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/cdp/insights/${insight.code}`)}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* [D] Affected Population */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5" />
            Tập Khách hàng Bị ảnh hưởng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">{card.affectedPopulation.description}</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xl font-bold">{card.affectedPopulation.size.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Số khách hàng</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xl font-bold">{card.affectedPopulation.revenueShare}%</p>
              <p className="text-xs text-muted-foreground">Tỷ trọng doanh thu</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xl font-bold">{card.affectedPopulation.equityShare}%</p>
              <p className="text-xs text-muted-foreground">Tỷ trọng equity</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Không hiển thị danh sách khách hàng cá nhân
          </p>
        </CardContent>
      </Card>

      {/* [E] Risk if Not Addressed */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Đánh giá Rủi ro và Tác động
            </CardTitle>
            <Badge className={riskLevelStyles[card.risks.level]}>
              {card.risks.level === 'high' ? 'Rủi ro Cao' : card.risks.level === 'medium' ? 'Rủi ro Trung bình' : 'Rủi ro Thấp'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-background">
              <p className="text-xs text-muted-foreground mb-2">Rủi ro về Doanh thu</p>
              <p className="text-sm font-medium leading-relaxed">{card.risks.revenue}</p>
            </div>
            <div className="p-4 border rounded-lg bg-background">
              <p className="text-xs text-muted-foreground mb-2">Rủi ro về Dòng tiền</p>
              <p className="text-sm font-medium leading-relaxed">{card.risks.cashflow}</p>
            </div>
            <div className="p-4 border rounded-lg bg-background">
              <p className="text-xs text-muted-foreground mb-2">Rủi ro về Dài hạn</p>
              <p className="text-sm font-medium leading-relaxed">{card.risks.longTerm}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* [F] Options to Consider (Optional) */}
      {card.options && card.options.length > 0 && (
        <Card>
          <CardHeader>
          <CardTitle className="text-base">Các Hướng Xem xét Có thể</CardTitle>
          <CardDescription>Ghi chú các hướng tiếp cận – mang tính tham khảo, không phải hành động bắt buộc</CardDescription>
        </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {card.options.map((option, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">{idx + 1}.</span>
                  <span>{option}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-4">
              Các phương án trên chỉ mang tính tham khảo. Không có workflow hay hành động tự động.
            </p>
          </CardContent>
        </Card>
      )}

      {/* [G] Decision & Recording */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Quyết định & Ghi nhận
          </CardTitle>
          <CardDescription>
            Ghi nhận quyết định điều hành – Bắt buộc ghi chú khi chuyển trạng thái
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {card.status === 'decided' && card.decision ? (
            // Show recorded decision
            <div className="space-y-4">
              <div className="p-4 bg-success/5 border border-success/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="font-medium text-success">Đã ghi nhận quyết định</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-muted-foreground">Kết quả:</span>{' '}
                    <span className="font-medium">{card.decision.outcome}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ngày:</span>{' '}
                    <span className="font-medium">{card.decision.decidedAt}</span>
                  </div>
                </div>
                <p className="text-sm">{card.decision.note}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Ghi nhận bởi: {card.decision.decidedBy}
                </p>
              </div>
            </div>
          ) : (
            // Decision form
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Kết quả quyết định</label>
                <Select value={decisionOutcome} onValueChange={setDecisionOutcome}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn kết quả..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accept_risk">Chấp nhận rủi ro</SelectItem>
                    <SelectItem value="adjust_strategy">Điều chỉnh chiến lược</SelectItem>
                    <SelectItem value="monitor">Theo dõi thêm</SelectItem>
                    <SelectItem value="escalate">Nâng cấp lên cấp cao hơn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Ghi chú quyết định <span className="text-destructive">*</span>
                </label>
                <Textarea 
                  placeholder="Mô tả lý do quyết định, các cân nhắc, và hướng xử lý..."
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  rows={4}
                />
              </div>
              <Button 
                className="w-full" 
                disabled={!decisionOutcome || !decisionNote.trim() || recordDecision.isPending}
                onClick={handleRecordDecision}
              >
                {recordDecision.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {recordDecision.isPending ? 'Đang lưu...' : 'Ghi nhận Quyết định'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* [H] Post-Decision Review (Optional) */}
      {card.status === 'decided' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Đánh giá Sau Quyết định
            </CardTitle>
            <CardDescription>
              Ghi nhận kết quả thực tế sau một thời gian – Phục vụ học tập & governance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {card.postDecisionReview ? (
              <p className="text-sm">{card.postDecisionReview}</p>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Chưa có đánh giá sau quyết định</p>
                <p className="text-xs">Có thể bổ sung sau 30-60 ngày</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Evidence Link */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Bằng chứng Kiểm chứng</p>
                <p className="text-xs text-muted-foreground">
                  Khách hàng mẫu, snapshot dữ liệu – Chỉ đọc
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/cdp/equity/evidence')}>
              Xem Bằng chứng
              <ExternalLink className="w-3.5 h-3.5 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
