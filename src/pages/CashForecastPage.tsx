import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';

// Daily Forecast Components (from CashFlowForecastPage)
import { DailyForecastView } from '@/components/cashforecast/DailyForecastView';
// Weekly Forecast Components (from WeeklyCashForecastPage)
import { WeeklyForecastView } from '@/components/cashforecast/WeeklyForecastView';

export default function CashForecastPage() {
  const [activeTab, setActiveTab] = useState('daily');

  return (
    <>
      <Helmet>
        <title>Cash Flow Forecast | CFO Dashboard</title>
        <meta name="description" content="Dự báo dòng tiền hàng ngày và hàng tuần với AI insights và phân tích kịch bản" />
      </Helmet>

      <div className="space-y-6 p-6">
        <PageHeader
          title="Cash Flow Forecast"
          subtitle="Dự báo dòng tiền chi tiết theo ngày hoặc tuần"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="daily">Theo ngày (90 ngày)</TabsTrigger>
            <TabsTrigger value="weekly">Theo tuần (13 tuần)</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-6">
            <DailyForecastView />
          </TabsContent>

          <TabsContent value="weekly" className="space-y-6">
            <WeeklyForecastView />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
