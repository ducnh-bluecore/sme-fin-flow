import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, RefreshCw, TrendingUp, Target } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { DateRangeIndicator } from '@/components/shared/DateRangeIndicator';
import { useLanguage } from '@/contexts/LanguageContext';

// Import existing page content (we'll embed them without their headers)
import WorkingCapitalContent from '@/components/workingcapital/WorkingCapitalContent';
import CashConversionCycleContent from '@/components/workingcapital/CashConversionCycleContent';

export default function WorkingCapitalHubPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { t } = useLanguage();

  return (
    <>
      <Helmet>
        <title>{t('workingCapital.hubTitle') || 'Vốn lưu động'} | Bluecore Finance</title>
        <meta name="description" content={t('workingCapital.hubSubtitle') || 'Quản lý vốn lưu động và chu kỳ chuyển đổi tiền mặt'} />
      </Helmet>

      <div className="space-y-6 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              {activeTab === 'overview' ? (
                <Wallet className="w-6 h-6 text-primary" />
              ) : (
                <RefreshCw className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {t('workingCapital.hubTitle') || 'Vốn lưu động & CCC'}
              </h1>
              <p className="text-muted-foreground">
                {t('workingCapital.hubSubtitle') || 'Quản lý vốn lưu động và chu kỳ chuyển đổi tiền mặt'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <QuickDateSelector />
            <DateRangeIndicator variant="badge" />
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-lg grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('workingCapital.tabOverview') || 'Tổng quan & Đề xuất'}
            </TabsTrigger>
            <TabsTrigger value="ccc" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              {t('workingCapital.tabCCC') || 'CCC & Benchmark'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <WorkingCapitalContent />
          </TabsContent>

          <TabsContent value="ccc" className="mt-6">
            <CashConversionCycleContent />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
