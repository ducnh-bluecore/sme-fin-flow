import { useState } from 'react';
import { CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Info, ChevronDown, ChevronUp, Database, Brain, CalendarDays, Megaphone } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Props {
  dataMonths?: number;
  earliestDate?: string;
  latestDate?: string;
  hasAdsData?: boolean;
}

export function ForecastMethodologyInfo({ dataMonths = 105, earliestDate = '07/2017', latestDate = '03/2026', hasAdsData = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 text-left hover:bg-primary/10 transition-colors rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium">Dự báo này được tính toán như thế nào?</span>
            </div>
            {open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-4">
            {/* Data Sources */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold">Dữ liệu đầu vào</span>
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-1 ml-5 list-disc">
                <li>
                  <strong>~{dataMonths} tháng</strong> lịch sử đơn hàng ({earliestDate} → {latestDate})
                </li>
                <li>Doanh thu theo tháng, phân tách theo khách mới vs khách cũ (cohort)</li>
                <li>Dữ liệu chi phí ads (nếu có đồng bộ)</li>
              </ul>
            </div>

            {/* Model Logic */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-purple-600" />
                <span className="text-xs font-semibold">Mô hình Smart Ensemble</span>
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-1 ml-5 list-disc">
                <li>
                  <strong>Trend-based</strong>: 60% trung vị 5 tháng gần nhất + 40% trung bình trọng số 3 tháng
                </li>
                <li>
                  <strong>LY-Anchor</strong>: Doanh thu cùng kỳ năm trước × hệ số tăng trưởng YoY
                </li>
                <li>
                  Nếu Trend và LY-Anchor lệch {'>'} 50% → ưu tiên LY-Anchor (30/70) để thận trọng
                </li>
                <li>
                  Nếu lệch {'≤'} 50% → ưu tiên Trend (70/30) để bám sát xu hướng gần
                </li>
                <li>
                  <strong>Conservative</strong> = Base × 0.85 · <strong>Optimistic</strong> = Base × 1.15
                </li>
              </ul>
            </div>

            {/* Seasonal */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold">Yếu tố mùa vụ (Seasonal)</span>
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-1 ml-5 list-disc">
                <li>Hệ số seasonal được tính động từ dữ liệu lịch sử, so sánh từng tháng với trung bình</li>
                <li className="text-amber-700 dark:text-amber-400">
                  ⚠️ <strong>Tết Âm lịch</strong> (tháng 12–2): Ngày Tết dịch chuyển ~10 ngày mỗi năm → seasonal các tháng này có thể kém chính xác
                </li>
                <li>
                  <strong>Các mùa sale lớn</strong> ảnh hưởng dự báo:
                </li>
              </ul>
              <div className="ml-5 flex flex-wrap gap-1.5 mt-1">
                {[
                  { label: 'Tết Nguyên Đán', months: 'T1–T2', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                  { label: '3.8 / Women\'s Day', months: 'T3', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
                  { label: 'Summer Sale', months: 'T6–T7', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
                  { label: 'Back to School', months: 'T8–T9', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
                  { label: '10.10 / 11.11 / 12.12', months: 'T10–T12', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
                  { label: 'Black Friday', months: 'T11', color: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
                ].map((s) => (
                  <span key={s.label} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                    {s.label} ({s.months})
                  </span>
                ))}
              </div>
            </div>

            {/* Ads Spend - Updated for Baseline = Status Quo */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Megaphone className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold">Baseline & Chi phí Ads</span>
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-1 ml-5 list-disc">
                <li>
                  <strong>⚡ Quan trọng:</strong> Doanh thu lịch sử <strong>đã bao gồm</strong> hiệu quả từ chi phí quảng cáo đã chạy trước đó. Baseline dự báo = duy trì mức hoạt động hiện tại (bao gồm cả ads đã chạy).
                </li>
                <li>
                  <strong>Chi phí Ads = 0₫ (mặc định)</strong>: Dự báo duy trì mức chi tiêu ads như hiện tại — <strong>không phải ngừng ads</strong>.
                </li>
                <li>
                  Khi nhập chi phí ads {'>'} 0: Đây là ngân sách <strong>bổ sung</strong> so với mức hiện tại. Hệ thống tính thêm doanh thu = Chi phí bổ sung × ROAS.
                </li>
                {!hasAdsData && (
                  <li className="text-amber-700 dark:text-amber-400">
                    ⚠️ <strong>Chưa có dữ liệu ads chi tiết</strong> trong hệ thống. Không thể tách riêng doanh thu organic vs paid. ROAS sử dụng giá trị mặc định (3.0x).
                  </li>
                )}
                <li>
                  ROAS tự động = ROAS trung bình từ dữ liệu ads lịch sử (nếu có). Có thể override thủ công.
                </li>
              </ul>
            </div>

            {/* Disclaimer */}
            <div className="rounded-md bg-muted/80 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
              💡 <strong>Lưu ý quan trọng</strong>: Dự báo dựa trên dữ liệu quá khứ và mô hình thống kê. Kết quả mang tính tham khảo, không phải cam kết. Các yếu tố ngoại cảnh (thị trường, đối thủ, chính sách) có thể ảnh hưởng đáng kể.
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
