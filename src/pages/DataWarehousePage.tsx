import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BigQueryConfigPanel } from '@/components/connectors/BigQueryConfigPanel';
import { BigQueryRealtimeDashboard } from '@/components/warehouse/BigQueryRealtimeDashboard';
import { DataModelManager } from '@/components/warehouse/DataModelManager';
import { BigQuerySchemaManager } from '@/components/warehouse/BigQuerySchemaManager';
import { BigQuerySyncManager } from '@/components/warehouse/BigQuerySyncManager';
import { SyncProgressProvider } from '@/contexts/SyncProgressContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DataWarehousePage() {
  const { t } = useLanguage();

  return (
    <>
      <Helmet>
        <title>{t('warehouse.title')} | Bluecore Finance</title>
        <meta name="description" content={t('warehouse.subtitle')} />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Link to="/data-hub">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('warehouse.title')}</h1>
              <p className="text-muted-foreground">{t('warehouse.subtitle')}</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <SyncProgressProvider>
          <Tabs defaultValue="sync" className="space-y-6">
            <TabsList>
              <TabsTrigger value="sync">{t('warehouse.tabSync')}</TabsTrigger>
              <TabsTrigger value="realtime">{t('warehouse.tabRealtime')}</TabsTrigger>
              <TabsTrigger value="schema">{t('warehouse.tabSchema')}</TabsTrigger>
              <TabsTrigger value="models">{t('warehouse.tabModels')}</TabsTrigger>
              <TabsTrigger value="config">{t('warehouse.tabConfig')}</TabsTrigger>
            </TabsList>

            <TabsContent value="sync" forceMount className="data-[state=inactive]:hidden">
              <BigQuerySyncManager />
            </TabsContent>

            <TabsContent value="realtime">
              <BigQueryRealtimeDashboard />
            </TabsContent>

            <TabsContent value="schema">
              <BigQuerySchemaManager />
            </TabsContent>

            <TabsContent value="models">
              <DataModelManager />
            </TabsContent>

            <TabsContent value="config">
              <BigQueryConfigPanel />
            </TabsContent>
          </Tabs>
        </SyncProgressProvider>
      </div>
    </>
  );
}