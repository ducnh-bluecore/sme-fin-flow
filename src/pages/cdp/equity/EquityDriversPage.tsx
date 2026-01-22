import { Helmet } from 'react-helmet-async';
import { EquityLayout } from '@/components/cdp/equity/EquityLayout';
import { EquityDriversList } from '@/components/cdp/equity/EquityDriversList';
import { CDPLayout } from '@/components/layout/CDPLayout';

export default function EquityDriversPage() {
  return (
    <CDPLayout>
      <Helmet>
        <title>Động lực Ảnh hưởng | Giá trị Khách hàng - Bluecore</title>
        <meta name="description" content="Phân tích các yếu tố ảnh hưởng đến Customer Equity" />
      </Helmet>

      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-xl font-semibold mb-1">Giá trị Khách hàng</h1>
          <p className="text-sm text-muted-foreground">
            Customer Equity – Tài sản doanh thu kỳ vọng từ khách hàng hiện tại
          </p>
        </div>

        <EquityLayout>
          <EquityDriversList />
        </EquityLayout>
      </div>
    </CDPLayout>
  );
}
