import { Helmet } from 'react-helmet-async';
import { useParams, Navigate } from 'react-router-dom';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { DecisionDetailView } from '@/components/cdp/decisions/DecisionDetailView';

// Mock data for decision card detail
const mockDecisionCards: Record<string, Parameters<typeof DecisionDetailView>[0]['card']> = {
  'DC-001': {
    id: 'DC-001',
    title: 'Khách hàng TOP20 có xu hướng giảm tần suất mua',
    sourceInsights: ['T01', 'V02'],
    sourceEquity: true,
    severity: 'high',
    priority: 1,
    owner: 'CFO',
    reviewDeadline: '15/01/2026',
    status: 'decided',
    createdAt: '08/01/2026',
    populationSize: 2400,
    equityImpact: 3200000000,
    problemStatement: 'Nhóm khách hàng TOP20 (chiếm 20% doanh thu) đang có xu hướng giảm tần suất mua trong 60 ngày qua. Thời gian giữa các lần mua tăng từ 28 ngày lên 35 ngày (+25%). Nếu xu hướng này tiếp diễn, có thể ảnh hưởng đáng kể đến dòng tiền và doanh thu quý tới.',
    relatedInsights: [
      { code: 'T01', title: 'Chu kỳ mua lại giãn rộng', change: '+25%', impact: 'Cao' },
      { code: 'V02', title: 'AOV giảm nhẹ', change: '-8%', impact: 'Trung bình' }
    ],
    affectedPopulation: {
      description: 'Khách hàng TOP20 – nhóm có giá trị cao thứ 2, thường mua định kỳ 3-4 tuần/lần',
      size: 2400,
      revenueShare: 20,
      equityShare: 22
    },
    risks: {
      revenue: 'Giảm 8-12% doanh thu quý tới nếu không can thiệp',
      cashflow: 'Chậm thu tiền, ảnh hưởng CCC khoảng 3-5 ngày',
      longTerm: 'Có thể mất khách sang đối thủ nếu không tìm hiểu nguyên nhân',
      level: 'high'
    },
    options: [
      'Điều chỉnh chính sách giá hoặc ưu đãi cho nhóm TOP20',
      'Xem lại trải nghiệm mua hàng và giao hàng',
      'Đánh giá lại portfolio sản phẩm cho segment này'
    ],
    decision: {
      outcome: 'Điều chỉnh chiến lược',
      note: 'Đã xem xét dữ liệu và xác nhận xu hướng. Quyết định: (1) Yêu cầu team Product xem lại trải nghiệm checkout cho mobile, (2) CFO sẽ review lại chính sách giá cho Q2. Chấp nhận rủi ro ngắn hạn trong khi điều chỉnh.',
      decidedAt: '14/01/2026',
      decidedBy: 'CFO - Nguyễn Văn A'
    }
  },
  'DC-002': {
    id: 'DC-002',
    title: 'Tỷ lệ hoàn trả tăng đột biến ở danh mục Điện tử',
    sourceInsights: ['E03'],
    severity: 'medium',
    priority: 2,
    owner: 'COO',
    reviewDeadline: '18/01/2026',
    status: 'reviewing',
    createdAt: '10/01/2026',
    populationSize: 850,
    equityImpact: 800000000,
    problemStatement: 'Tỷ lệ hoàn trả danh mục Điện tử tăng từ 5.2% lên 8.7% trong 30 ngày qua. Nguyên nhân có thể liên quan đến chất lượng sản phẩm hoặc mô tả không chính xác. Cần xem xét để tránh ảnh hưởng đến margin và trải nghiệm khách hàng.',
    relatedInsights: [
      { code: 'E03', title: 'Tỷ lệ hoàn trả tăng', change: '+3.5pp', impact: 'Cao' }
    ],
    affectedPopulation: {
      description: 'Khách hàng mua danh mục Điện tử trong 30 ngày qua',
      size: 850,
      revenueShare: 8,
      equityShare: 6
    },
    risks: {
      revenue: 'Giảm margin 2-3% nếu tỷ lệ hoàn trả duy trì',
      cashflow: 'Refund làm chậm vòng tiền khoảng 1 tuần',
      longTerm: 'Ảnh hưởng uy tín thương hiệu nếu không xử lý',
      level: 'medium'
    },
    options: [
      'Rà soát chất lượng sản phẩm từ nhà cung cấp',
      'Cập nhật mô tả sản phẩm chính xác hơn',
      'Tăng cường kiểm tra trước khi giao hàng'
    ]
  },
  'T01': {
    id: 'T01',
    title: 'Chu kỳ mua lại của khách hàng đang giãn rộng',
    sourceInsights: ['T01'],
    severity: 'high',
    priority: 1,
    owner: 'CFO',
    reviewDeadline: '25/01/2026',
    status: 'new',
    createdAt: '20/01/2026',
    populationSize: 4500,
    equityImpact: 2100000000,
    problemStatement: 'Thời gian giữa các lần mua của toàn bộ tập khách hàng đang tăng 15% so với baseline. Điều này cho thấy khách hàng đang mua ít thường xuyên hơn, có thể ảnh hưởng đến doanh thu định kỳ và khả năng dự báo dòng tiền.',
    relatedInsights: [
      { code: 'T01', title: 'Chu kỳ mua lại giãn rộng', change: '+15%', impact: 'Cao' }
    ],
    affectedPopulation: {
      description: 'Toàn bộ khách hàng có ít nhất 2 lần mua trong 12 tháng qua',
      size: 4500,
      revenueShare: 65,
      equityShare: 70
    },
    risks: {
      revenue: 'Giảm 10-15% doanh thu từ khách cũ nếu xu hướng tiếp tục',
      cashflow: 'Thu tiền chậm hơn, CCC có thể tăng 5-7 ngày',
      longTerm: 'Mất khách hàng lâu dài nếu không can thiệp kịp thời',
      level: 'high'
    },
    options: [
      'Phân tích nguyên nhân theo segment',
      'Điều chỉnh chiến lược retention',
      'Review lại loyalty program'
    ]
  }
};

export default function DecisionDetailPage() {
  const { cardId } = useParams<{ cardId: string }>();

  if (!cardId) {
    return <Navigate to="/cdp/decisions" replace />;
  }

  const card = mockDecisionCards[cardId];

  if (!card) {
    return (
      <CDPLayout>
        <Helmet>
          <title>Không tìm thấy | Thẻ Quyết định - Bluecore</title>
        </Helmet>
        <div className="max-w-5xl py-12 text-center">
          <p className="text-lg font-medium">Không tìm thấy thẻ quyết định</p>
          <p className="text-sm text-muted-foreground mt-1">
            Thẻ "{cardId}" không tồn tại hoặc đã bị xóa
          </p>
        </div>
      </CDPLayout>
    );
  }

  return (
    <CDPLayout>
      <Helmet>
        <title>{card.title} | Thẻ Quyết định - Bluecore</title>
        <meta name="description" content={card.problemStatement?.slice(0, 150)} />
      </Helmet>

      <div className="max-w-4xl">
        <DecisionDetailView card={card} />
      </div>
    </CDPLayout>
  );
}
