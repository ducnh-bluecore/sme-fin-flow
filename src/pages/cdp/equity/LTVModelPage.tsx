import { Helmet } from 'react-helmet-async';
import { EquityLayout } from '@/components/cdp/equity/EquityLayout';
import { LTVModelManager } from '@/components/cdp/equity/LTVModelManager';
import { CDPLayout } from '@/components/layout/CDPLayout';

export default function LTVModelPage() {
  return (
    <CDPLayout>
      <Helmet>
        <title>Mô hình Giả định | Giá trị Khách hàng - Bluecore</title>
        <meta name="description" content="Quản lý mô hình LTV và giả định giá trị khách hàng" />
      </Helmet>

      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-xl font-semibold mb-1">Giá trị Khách hàng</h1>
          <p className="text-sm text-muted-foreground">
            Customer Equity – Tài sản doanh thu kỳ vọng từ khách hàng hiện tại
          </p>
        </div>

        <EquityLayout>
          <LTVModelManager />
        </EquityLayout>
      </div>
    </CDPLayout>
  );
}
