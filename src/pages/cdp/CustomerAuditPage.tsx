import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CustomerAuditHeader, CustomerAuditData } from '@/components/cdp/audit/CustomerAuditHeader';
import { IdentityMergeBlock } from '@/components/cdp/audit/IdentityMergeBlock';
import { TransactionSummaryBlock } from '@/components/cdp/audit/TransactionSummaryBlock';
import { RFMVerificationBlock } from '@/components/cdp/audit/RFMVerificationBlock';
import { SourceEvidenceBlock } from '@/components/cdp/audit/SourceEvidenceBlock';

// Mock data for demonstration
const mockCustomerData: CustomerAuditData = {
  internalId: 'CDP-KH-2024-00847',
  anonymizedPhone: '038***588',
  anonymizedEmail: 'n***n@gmail.com',
  mergeConfidence: 92,
  sourceCount: 3,
  mergeStatus: 'verified',
  totalSpend: 24700000,
  orderCount: 12,
  aov: 2058333,
  daysSinceLastPurchase: 18,
  rfmScore: { r: 4, f: 3, m: 4 },
  clv: 24700000,
  avgClvSegment: 18200000,
  sources: [
    { name: 'KiotViet', hasData: true, orderCount: 7, totalValue: 14500000, lastSync: '22/01/2026' },
    { name: 'Sapo', hasData: true, orderCount: 3, totalValue: 6200000, lastSync: '21/01/2026' },
    { name: 'Haravan', hasData: true, orderCount: 2, totalValue: 4000000, lastSync: '20/01/2026' },
    { name: 'Website/App', hasData: false, orderCount: 0, totalValue: 0 },
  ],
};

const mockMilestones = [
  { id: '1', type: 'order' as const, date: '05/01/2026', value: 2500000, orderNumber: 'ORD-12847' },
  { id: '2', type: 'order' as const, date: '18/12/2025', value: 1800000, orderNumber: 'ORD-12234' },
  { id: '3', type: 'return' as const, date: '15/12/2025', value: 450000, orderNumber: 'RET-00234' },
  { id: '4', type: 'order' as const, date: '02/12/2025', value: 3200000, orderNumber: 'ORD-11987' },
  { id: '5', type: 'order' as const, date: '15/11/2025', value: 2100000, orderNumber: 'ORD-11456' },
];

export default function CustomerAuditPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  
  // In real implementation, fetch customer data based on customerId
  const customer = mockCustomerData;

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
                anonymizedPhone={customer.anonymizedPhone}
                anonymizedEmail={customer.anonymizedEmail}
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
