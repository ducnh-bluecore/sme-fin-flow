import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { LTVOverview } from '@/components/cdp/ltv/LTVOverview';
import { LTVByCohort } from '@/components/cdp/ltv/LTVByCohort';
import { LTVBySource } from '@/components/cdp/ltv/LTVBySource';
import { AssumptionEditor } from '@/components/cdp/ltv/AssumptionEditor';
import { LayoutGrid, Users, Megaphone, Settings } from 'lucide-react';

export default function LTVEnginePage() {
  return (
    <CDPLayout>
      <Helmet>
        <title>LTV Engine | Giá trị Khách hàng - Bluecore</title>
        <meta name="description" content="Phân tích và dự báo giá trị vòng đời khách hàng với mô hình tùy chỉnh" />
      </Helmet>

      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold mb-1">LTV Intelligence Engine</h1>
          <p className="text-sm text-muted-foreground">
            Phân tích và dự báo giá trị vòng đời khách hàng với giả định tùy chỉnh
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="cohort" className="gap-2">
              <Users className="h-4 w-4" />
              Theo Cohort
            </TabsTrigger>
            <TabsTrigger value="source" className="gap-2">
              <Megaphone className="h-4 w-4" />
              Theo Nguồn
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Mô hình
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <LTVOverview />
          </TabsContent>

          <TabsContent value="cohort">
            <LTVByCohort />
          </TabsContent>

          <TabsContent value="source">
            <LTVBySource />
          </TabsContent>

          <TabsContent value="settings">
            <AssumptionEditor />
          </TabsContent>
        </Tabs>
      </div>
    </CDPLayout>
  );
}
