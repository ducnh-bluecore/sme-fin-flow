import { Helmet } from 'react-helmet-async';
import { EquityEvidencePanel } from '@/components/cdp/equity/EquityEvidencePanel';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';

export default function EquityEvidencePage() {
  return (
    <CDPLayout>
      <Helmet>
        <title>Bằng chứng Giá trị | Giá trị Khách hàng - Bluecore</title>
        <meta name="description" content="Kiểm chứng Customer Equity bằng dữ liệu khách hàng mẫu" />
      </Helmet>

      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-xl font-semibold mb-1">Bằng chứng Giá trị</h1>
          <p className="text-sm text-muted-foreground">
            Kiểm chứng Customer Equity với dữ liệu khách hàng thực tế
          </p>
        </div>

        {/* Context Banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">
                  Màn hình Bằng chứng – Chế độ Kiểm chứng
                </p>
                <p className="text-xs text-muted-foreground">
                  Dữ liệu ẩn danh • Chỉ đọc • Không có hành động marketing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <EquityEvidencePanel />
      </div>
    </CDPLayout>
  );
}
