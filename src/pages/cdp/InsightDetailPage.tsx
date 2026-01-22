import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { InsightDetailView, InsightDetailData } from '@/components/cdp/insights/InsightDetailView';
import { toast } from 'sonner';

// Mock data - in real app, fetch by code
const mockInsightDetail: InsightDetailData = {
  code: 'V01',
  title: 'Chi tiêu trung bình của nhóm Top 20% giảm 15.9%',
  topic: 'Giá trị',
  populationName: 'Top 20% khách hàng',
  populationSize: 2456,
  revenueContribution: 65,
  severity: 'high',
  confidence: 'high',
  status: 'active',
  
  currentValue: 1850000,
  baselineValue: 2200000,
  changePercent: -15.9,
  changeDirection: 'down',
  metricName: 'AOV trung bình',
  periodCurrent: '21/12/2024 - 20/01/2025',
  periodBaseline: '21/11/2024 - 20/12/2024',
  
  businessImplication: 'Nhóm khách hàng giá trị cao đang giảm mức chi tiêu trung bình. Xu hướng này cho thấy có thể có sự thay đổi trong nhu cầu hoặc hành vi mua sắm của phân khúc này. Nếu xu hướng tiếp tục, doanh thu từ phân khúc Top 20% có thể giảm 12-15% trong Q1/2025, ảnh hưởng trực tiếp đến kế hoạch tài chính.',
  
  drivers: [
    { name: 'Tần suất mua', value: -8.2, unit: '%', trend: 'down' },
    { name: 'Số lượng/đơn', value: -12.5, unit: '%', trend: 'down' },
    { name: 'Giá trị giỏ hàng', value: -15.9, unit: '%', trend: 'down' },
  ],
  
  sampleCustomers: [
    { anonymousId: 'KH-001234', previousValue: 2500000, currentValue: 1800000 },
    { anonymousId: 'KH-001567', previousValue: 2200000, currentValue: 1650000 },
    { anonymousId: 'KH-001890', previousValue: 2800000, currentValue: 2100000 },
    { anonymousId: 'KH-002123', previousValue: 2100000, currentValue: 1550000 },
    { anonymousId: 'KH-002456', previousValue: 2400000, currentValue: 1900000 },
  ],
  snapshotDate: '20/01/2025',
  
  linkedDecisionCardId: undefined,
  linkedDecisionCardStatus: undefined,
  
  detectedAt: '18/01/2025',
  cooldownUntil: undefined,
};

// More mock data for different insight codes
const insightDetails: Record<string, InsightDetailData> = {
  V01: mockInsightDetail,
  T01: {
    ...mockInsightDetail,
    code: 'T01',
    title: 'Khoảng cách giữa các đơn hàng tăng 12 ngày',
    topic: 'Thời gian mua',
    populationName: 'Khách mua lại',
    populationSize: 8234,
    revenueContribution: 78,
    severity: 'medium',
    currentValue: 45,
    baselineValue: 33,
    changePercent: 36.4,
    changeDirection: 'up',
    metricName: 'Chu kỳ mua lại (ngày)',
    businessImplication: 'Khách hàng đang kéo dài thời gian giữa các lần mua. Điều này có thể phản ánh sự thay đổi trong nhu cầu hoặc sự cạnh tranh từ đối thủ. Cần xem xét liệu đây là xu hướng tạm thời hay thay đổi cấu trúc trong hành vi mua.',
    drivers: [
      { name: 'Số đơn/khách', value: -15.2, unit: '%', trend: 'down' },
      { name: 'Tỷ lệ quay lại', value: -8.5, unit: '%', trend: 'down' },
      { name: 'Thời gian từ đơn cuối', value: 36.4, unit: '%', trend: 'up' },
    ],
  },
  R02: {
    ...mockInsightDetail,
    code: 'R02',
    title: 'Tỷ lệ hoàn trả của khách mới tăng từ 8% lên 14%',
    topic: 'Hoàn trả & Rủi ro',
    populationName: 'Khách mới (< 60 ngày)',
    populationSize: 1567,
    revenueContribution: 12,
    severity: 'high',
    currentValue: 14,
    baselineValue: 8,
    changePercent: 75,
    changeDirection: 'up',
    metricName: 'Tỷ lệ hoàn trả (%)',
    businessImplication: 'Tỷ lệ hoàn trả cao ở khách mới gợi ý có thể có vấn đề với kỳ vọng sản phẩm hoặc trải nghiệm mua hàng lần đầu. Cần xem xét nguồn traffic, mô tả sản phẩm, hoặc chính sách đổi trả.',
    drivers: [
      { name: 'Hoàn trả lần đầu', value: 75, unit: '%', trend: 'up' },
      { name: 'Thời gian hoàn', value: -20, unit: '%', trend: 'down' },
      { name: 'Lý do "Không đúng mô tả"', value: 45, unit: '%', trend: 'up' },
    ],
    linkedDecisionCardId: 'DC-003',
    linkedDecisionCardStatus: 'Đang xem xét',
  },
};

export default function InsightDetailPage() {
  const { insightCode } = useParams();
  
  // Get insight detail by code
  const insight = insightDetails[insightCode || 'V01'] || mockInsightDetail;

  const handleCreateDecisionCard = () => {
    toast.success('Đã tạo Thẻ Quyết định', {
      description: `Insight ${insight.code} đã được liên kết với thẻ quyết định mới.`
    });
  };

  return (
    <CDPLayout>
      <Helmet>
        <title>{insight.code} - {insight.title} | CDP - Bluecore</title>
        <meta name="description" content={`Chi tiết insight ${insight.code}`} />
      </Helmet>

      <InsightDetailView 
        insight={insight}
        onCreateDecisionCard={handleCreateDecisionCard}
      />
    </CDPLayout>
  );
}
