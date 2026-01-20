import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';

// Import existing page content (embedded without their headers)
import BudgetVsActualContent from '@/components/performance/BudgetVsActualContent';
import VarianceAnalysisContent from '@/components/performance/VarianceAnalysisContent';

export default function PerformanceAnalysisPage() {
  const [activeTab, setActiveTab] = useState('budget');
  const { t } = useLanguage();

  return (
    <>
      <Helmet>
        <title>{t('performance.hubTitle') || 'Phân tích Hiệu suất'} | Bluecore Finance</title>
        <meta name="description" content={t('performance.hubSubtitle') || 'So sánh kế hoạch vs thực tế và phân tích biến động'} />
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
              {activeTab === 'budget' ? (
                <Target className="w-6 h-6 text-primary" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {t('performance.hubTitle') || 'Phân tích Hiệu suất'}
              </h1>
              <p className="text-muted-foreground">
                {t('performance.hubSubtitle') || 'So sánh kế hoạch vs thực tế và phân tích biến động'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-lg grid-cols-2">
            <TabsTrigger value="budget" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Kế hoạch vs Thực tế
            </TabsTrigger>
            <TabsTrigger value="variance" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Phân tích Biến động
            </TabsTrigger>
          </TabsList>

          <TabsContent value="budget" className="mt-6">
            <BudgetVsActualContent />
          </TabsContent>

          <TabsContent value="variance" className="mt-6">
            <VarianceAnalysisContent />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
