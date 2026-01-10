import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';

// Daily Forecast Components (from CashFlowForecastPage)
import { DailyForecastView } from '@/components/cashforecast/DailyForecastView';
// Weekly Forecast Components (from WeeklyCashForecastPage)
import { WeeklyForecastView } from '@/components/cashforecast/WeeklyForecastView';

export default function CashForecastPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const { t } = useLanguage();

  return (
    <>
      <Helmet>
        <title>{t('cashForecast.title')} | CFO Dashboard</title>
        <meta name="description" content={t('cashForecast.pageDesc')} />
      </Helmet>

      <div className="space-y-6 p-6">
        <PageHeader
          title={t('cashForecast.title')}
          subtitle={t('cashForecast.subtitle')}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="daily">{t('cashForecast.daily')}</TabsTrigger>
            <TabsTrigger value="weekly">{t('cashForecast.weekly')}</TabsTrigger>
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
