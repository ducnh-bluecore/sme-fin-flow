import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Loader2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CustomerAuditHeader } from '@/components/cdp/audit/CustomerAuditHeader';
import { IdentityMergeBlock } from '@/components/cdp/audit/IdentityMergeBlock';
import { TransactionSummaryBlock } from '@/components/cdp/audit/TransactionSummaryBlock';
import { RFMVerificationBlock } from '@/components/cdp/audit/RFMVerificationBlock';
import { SourceEvidenceBlock } from '@/components/cdp/audit/SourceEvidenceBlock';
import { CategorySpendBlock } from '@/components/cdp/audit/CategorySpendBlock';
import { PurchaseTimelineBlock } from '@/components/cdp/audit/PurchaseTimelineBlock';
import { TopProductsBlock } from '@/components/cdp/audit/TopProductsBlock';
import { BasketEvolutionBlock } from '@/components/cdp/audit/BasketEvolutionBlock';
import { useCDPCustomerAudit } from '@/hooks/useCDPAudit';
import { useCDPCustomerOrderItems } from '@/hooks/useCDPCustomerOrderItems';

export default function CustomerAuditPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  
  const { data: customer, isLoading, error } = useCDPCustomerAudit(customerId);
  const { data: orderItemsData } = useCDPCustomerOrderItems(customerId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </Button>
          </div>
        </div>
        <div className="container mx-auto px-6 py-12">
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-sm font-medium mb-1">Không tìm thấy khách hàng</p>
              <p className="text-xs text-muted-foreground">
                ID khách hàng không tồn tại hoặc bạn không có quyền truy cập.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Generate mock milestones from customer data
  const mockMilestones: Array<{ id: string; type: 'order' | 'return'; date: string; value: number; orderNumber: string }> = 
    Array.from({ length: Math.min(customer.orderCount, 5) }, (_, i) => ({
      id: String(i + 1),
      type: i === 2 ? 'return' : 'order',
      date: new Date(Date.now() - (i * 7 + 5) * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN'),
      value: Math.floor(customer.aov * (0.8 + Math.random() * 0.4)),
      orderNumber: i === 2 ? `RET-00${i + 1}` : `ORD-${12000 + i}`,
    }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại
              </Button>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Hồ sơ Kiểm chứng Khách hàng
                </h1>
                <p className="text-sm text-muted-foreground">
                  Màn hình này giúp xác minh dữ liệu khách hàng đã được hợp nhất đúng từ nhiều nguồn hay chưa.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Chế độ Kiểm chứng
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Header Card */}
          <CustomerAuditHeader customer={customer} />

          {/* Two Column Layout for Main Blocks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Block 1: Identity & Merge */}
              <IdentityMergeBlock
                anonymizedPhone={customer.anonymizedPhone || ''}
                anonymizedEmail={customer.anonymizedEmail || ''}
                mergeConfidence={customer.mergeConfidence}
                sources={customer.sources}
              />

              {/* Block 3: RFM/CLV Verification */}
              <RFMVerificationBlock
                rfmScore={customer.rfmScore}
                clv={customer.clv}
                avgClvSegment={customer.avgClvSegment}
                segmentName="tập tương đương"
              />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Block 2: Transaction Summary */}
              <TransactionSummaryBlock
                totalSpend={customer.totalSpend}
                orderCount={customer.orderCount}
                aov={customer.aov}
                daysSinceLastPurchase={customer.daysSinceLastPurchase}
                milestones={mockMilestones}
              />

              {/* Block 4: Source Evidence */}
              <SourceEvidenceBlock sources={customer.sources} />
            </div>
          </div>

          {/* Purchase Behavior Analysis Section */}
          {orderItemsData && orderItemsData.items.length > 0 && (
            <>
              <div className="mt-8 pt-6 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingBag className="w-5 h-5" />
                  <h2 className="text-lg font-semibold">Phân tích Thói quen Mua hàng</h2>
                  <Badge variant="outline" className="text-xs">
                    {orderItemsData.items.length} sản phẩm
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  Dữ liệu chi tiết về danh mục, sản phẩm và xu hướng mua hàng của khách
                </p>
              </div>

              {/* Purchase Analysis Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Spend */}
                <CategorySpendBlock data={orderItemsData.categorySpend} />
                
                {/* Top Products */}
                <TopProductsBlock products={orderItemsData.topProducts} />
                
                {/* Purchase Timeline */}
                <PurchaseTimelineBlock orders={orderItemsData.timelineOrders} />
                
                {/* Basket Evolution */}
                <BasketEvolutionBlock 
                  shifts={orderItemsData.basketEvolution.shifts}
                  earlyPeriod={orderItemsData.basketEvolution.earlyPeriod}
                  recentPeriod={orderItemsData.basketEvolution.recentPeriod}
                />
              </div>
            </>
          )}

          {/* Footer Disclaimer */}
          <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-dashed text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Chế độ Kiểm chứng Dữ liệu</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
              Hồ sơ này dùng để kiểm chứng CDP đang hợp nhất dữ liệu đúng hay không, 
              xác minh dữ liệu từ nhiều nguồn (POS, OMS, Website, App), 
              và tạo niềm tin cho Insight và Customer Equity.
              <br />
              <strong>Không có bất kỳ hành động nào được phép thực hiện trên khách hàng từ màn hình này.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
