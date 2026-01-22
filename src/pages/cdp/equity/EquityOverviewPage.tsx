import { Helmet } from 'react-helmet-async';
import { EquityLayout } from '@/components/cdp/equity/EquityLayout';
import { EquityKPICards } from '@/components/cdp/equity/EquityKPICards';
import { EquityDistributionTable } from '@/components/cdp/equity/EquityDistributionTable';
import { CDPLayout } from '@/components/layout/CDPLayout';

export default function EquityOverviewPage() {
  return (
    <CDPLayout>
      <Helmet>
        <title>Giá trị Khách hàng | CDP - Bluecore</title>
        <meta name="description" content="Customer Equity - Tổng quan giá trị tài sản khách hàng" />
      </Helmet>

      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-xl font-semibold mb-1">Giá trị Khách hàng</h1>
          <p className="text-sm text-muted-foreground">
            Customer Equity – Tài sản doanh thu kỳ vọng từ khách hàng hiện tại
          </p>
        </div>

        <EquityLayout>
          <div className="space-y-6">
            <EquityKPICards 
              totalEquity={45000000000}
              equityChange={12.5}
              atRiskValue={8100000000}
              atRiskPercent={18}
              timeframe="12"
            />
            
            <EquityDistributionTable />
          </div>
        </EquityLayout>
      </div>
    </CDPLayout>
  );
}
