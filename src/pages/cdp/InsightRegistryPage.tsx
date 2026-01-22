import { useState } from 'react';
import { 
  Settings,
  Info,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightLayout } from '@/components/cdp/insights/InsightLayout';
import { InsightRegistryTable, InsightRegistryItem } from '@/components/cdp/insights/InsightRegistryTable';
import { toast } from 'sonner';

// Mock registry data
const mockRegistryItems: InsightRegistryItem[] = [
  // Giá trị
  { code: 'V01', name: 'Core Spend Decline', description: 'Phát hiện khi chi tiêu trung bình của top customers giảm > threshold', topic: 'Giá trị', threshold: 'AOV giảm > 12%', cooldownDays: 14, owners: ['CEO', 'CFO'], isEnabled: true, isTriggered: true },
  { code: 'V02', name: 'AOV Compression', description: 'Phát hiện khi AOV toàn bộ khách hàng bị nén', topic: 'Giá trị', threshold: 'AOV giảm > 10%', cooldownDays: 14, owners: ['CFO'], isEnabled: true, isTriggered: true },
  { code: 'V03', name: 'Revenue Concentration Risk', description: 'Cảnh báo khi quá nhiều doanh thu tập trung vào một nhóm nhỏ', topic: 'Giá trị', threshold: 'Top 10% > 70% DT', cooldownDays: 30, owners: ['CEO', 'CFO'], isEnabled: true, isTriggered: false },
  { code: 'V04', name: 'Customer Value Erosion', description: 'Giá trị vòng đời trung bình của khách giảm', topic: 'Giá trị', threshold: 'CLV giảm > 15%', cooldownDays: 30, owners: ['CEO'], isEnabled: true, isTriggered: false },
  { code: 'V05', name: 'Margin Pressure', description: 'Biên lợi nhuận trung bình trên khách hàng giảm', topic: 'Giá trị', threshold: 'Margin giảm > 8%', cooldownDays: 14, owners: ['CFO'], isEnabled: false, isTriggered: false },
  
  // Thời gian mua
  { code: 'T01', name: 'Inter-Purchase Expansion', description: 'Khoảng cách giữa các đơn hàng tăng', topic: 'Thời gian mua', threshold: 'Cycle tăng > 20%', cooldownDays: 14, owners: ['COO'], isEnabled: true, isTriggered: true },
  { code: 'T02', name: 'Second Purchase Delay', description: 'Thời gian từ đơn đầu đến đơn hai kéo dài', topic: 'Thời gian mua', threshold: 'Delay > 30 ngày', cooldownDays: 21, owners: ['COO'], isEnabled: true, isTriggered: false },
  { code: 'T03', name: 'Reactivation Failure', description: 'Khách dormant không quay lại sau các nỗ lực', topic: 'Thời gian mua', threshold: 'Rate < 5%', cooldownDays: 30, owners: ['COO'], isEnabled: true, isTriggered: false },
  { code: 'T04', name: 'Cohort Decay', description: 'Cohort mới có tốc độ suy giảm nhanh hơn', topic: 'Thời gian mua', threshold: 'Decay > 25%', cooldownDays: 30, owners: ['CEO'], isEnabled: false, isTriggered: false },
  { code: 'T05', name: 'Seasonal Pattern Break', description: 'Hành vi mùa vụ thay đổi so với năm trước', topic: 'Thời gian mua', threshold: 'Deviation > 20%', cooldownDays: 30, owners: ['CFO', 'COO'], isEnabled: true, isTriggered: false },
  
  // Rủi ro
  { code: 'R01', name: 'Return Rate Spike', description: 'Tỷ lệ hoàn trả tăng đột biến', topic: 'Rủi ro', threshold: 'Return > 15%', cooldownDays: 7, owners: ['COO'], isEnabled: true, isTriggered: false },
  { code: 'R02', name: 'New Customer Return Risk', description: 'Khách mới có tỷ lệ hoàn trả cao', topic: 'Rủi ro', threshold: 'Return > 12%', cooldownDays: 14, owners: ['COO'], isEnabled: true, isTriggered: true },
  { code: 'R03', name: 'COD Failure Rate', description: 'Tỷ lệ giao thất bại với COD tăng', topic: 'Rủi ro', threshold: 'Fail > 20%', cooldownDays: 7, owners: ['CFO', 'COO'], isEnabled: true, isTriggered: false },
  { code: 'R04', name: 'Promo Dependency', description: 'Khách chỉ mua khi có khuyến mãi', topic: 'Rủi ro', threshold: 'Promo orders > 60%', cooldownDays: 14, owners: ['CFO'], isEnabled: true, isTriggered: false },
  { code: 'R05', name: 'Forecast Confidence Drop', description: 'Độ tin cậy dự báo giảm', topic: 'Rủi ro', threshold: 'Confidence < 70%', cooldownDays: 7, owners: ['CFO'], isEnabled: false, isTriggered: false },
  
  // Cơ cấu
  { code: 'M01', name: 'SKU Concentration', description: 'Doanh thu tập trung vào ít SKU', topic: 'Cơ cấu', threshold: 'Top 5 SKU > 50%', cooldownDays: 30, owners: ['CEO', 'COO'], isEnabled: true, isTriggered: false },
  { code: 'M02', name: 'Category Drift', description: 'Khách hàng chuyển sang category khác', topic: 'Cơ cấu', threshold: 'Shift > 15%', cooldownDays: 30, owners: ['COO'], isEnabled: false, isTriggered: false },
  { code: 'M03', name: 'Channel Mix Shift', description: 'Tỷ trọng kênh thay đổi đáng kể', topic: 'Cơ cấu', threshold: 'Shift > 10%', cooldownDays: 14, owners: ['CEO', 'CFO'], isEnabled: true, isTriggered: false },
  { code: 'M04', name: 'Channel Cost Shift', description: 'Chi phí acquisition theo kênh thay đổi', topic: 'Cơ cấu', threshold: 'CAC > 20%', cooldownDays: 14, owners: ['CFO'], isEnabled: false, isTriggered: false },
  { code: 'M05', name: 'Basket Composition Change', description: 'Cấu trúc giỏ hàng thay đổi', topic: 'Cơ cấu', threshold: 'Items/order ±25%', cooldownDays: 30, owners: ['COO'], isEnabled: true, isTriggered: false },
  
  // Chất lượng
  { code: 'Q01', name: 'Identity Coverage Drop', description: 'Độ phủ nhận diện khách hàng giảm', topic: 'Chất lượng', threshold: 'Coverage < 80%', cooldownDays: 7, owners: ['CEO'], isEnabled: true, isTriggered: false },
  { code: 'Q02', name: 'Data Freshness Alert', description: 'Dữ liệu không được cập nhật', topic: 'Chất lượng', threshold: 'Delay > 24h', cooldownDays: 1, owners: ['CEO', 'CFO', 'COO'], isEnabled: true, isTriggered: false },
  { code: 'Q03', name: 'COGS Coverage Gap', description: 'Thiếu dữ liệu giá vốn', topic: 'Chất lượng', threshold: 'Coverage < 90%', cooldownDays: 7, owners: ['CFO'], isEnabled: true, isTriggered: false },
  { code: 'Q04', name: 'Order Sync Mismatch', description: 'Sai lệch đơn hàng giữa các nguồn', topic: 'Chất lượng', threshold: 'Mismatch > 5%', cooldownDays: 1, owners: ['COO'], isEnabled: true, isTriggered: false },
  { code: 'Q05', name: 'Customer Merge Conflict', description: 'Xung đột khi gộp identity khách', topic: 'Chất lượng', threshold: 'Conflicts > 100', cooldownDays: 7, owners: ['CEO'], isEnabled: true, isTriggered: false },
];

export default function InsightRegistryPage() {
  const [insights, setInsights] = useState(mockRegistryItems);

  const handleToggle = (code: string, enabled: boolean) => {
    setInsights(prev => 
      prev.map(i => i.code === code ? { ...i, isEnabled: enabled } : i)
    );
    toast.success(enabled ? 'Đã bật insight' : 'Đã tắt insight', {
      description: `Insight ${code} đã được ${enabled ? 'kích hoạt' : 'tạm dừng'}.`
    });
  };

  // Summary stats
  const totalInsights = insights.length;
  const enabledCount = insights.filter(i => i.isEnabled).length;
  const triggeredCount = insights.filter(i => i.isTriggered).length;
  const topicCount = new Set(insights.map(i => i.topic)).size;

  return (
    <InsightLayout title="Danh mục Insight" description="Quản trị hệ thống insight (chỉ dành cho Admin/Data)">
      <div className="space-y-6">
        {/* Admin Warning */}
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-warning-foreground" />
              <div>
                <p className="text-sm font-medium text-warning-foreground">
                  Màn hình quản trị – Chỉ dành cho Admin/Product/Data
                </p>
                <p className="text-xs text-muted-foreground">
                  Thay đổi ở đây ảnh hưởng đến toàn bộ hệ thống phát hiện insight
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-3xl font-bold">{totalInsights}</p>
              <p className="text-xs text-muted-foreground">Tổng insight</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-3xl font-bold text-primary">{enabledCount}</p>
              <p className="text-xs text-muted-foreground">Đang bật</p>
            </CardContent>
          </Card>
          <Card className="bg-destructive/5">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-3xl font-bold text-destructive">{triggeredCount}</p>
              <p className="text-xs text-muted-foreground">Đang kích hoạt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-3xl font-bold">{topicCount}</p>
              <p className="text-xs text-muted-foreground">Chủ đề</p>
            </CardContent>
          </Card>
        </div>

        {/* Registry Table */}
        <InsightRegistryTable 
          insights={insights}
          onToggle={handleToggle}
        />

        {/* Footer Note */}
        <div className="text-center text-xs text-muted-foreground py-4 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <Info className="w-3 h-3" />
            Đây là màn hình quản trị logic phát hiện, không phải màn hình kỹ thuật SQL
          </p>
          <p>Mọi thay đổi cần được phê duyệt bởi Product Owner</p>
        </div>
      </div>
    </InsightLayout>
  );
}
