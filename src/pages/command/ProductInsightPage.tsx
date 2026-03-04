/**
 * ProductInsightPage - Product Lifecycle & Sell-Through Intelligence
 * 
 * Tracks product lifecycle batches (initial + restock), sell-through progress,
 * and surfaces products that are behind schedule or need action.
 */

import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { Package, TrendingUp, RefreshCw, AlertTriangle, Clock, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function StatCard({ icon: Icon, label, value, sub, iconClass }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  iconClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className={`h-5 w-5 ${iconClass || 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProductInsightPage() {
  return (
    <>
      <Helmet>
        <title>Product Insight | Bluecore Command</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title="Product Insight"
          subtitle="Vòng đời sản phẩm, sell-through tracking & restock intelligence"
          icon={<Package className="w-5 h-5" />}
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Package} label="Tổng SP đang bán" value="—" sub="Đang tải..." iconClass="text-primary" />
          <StatCard icon={TrendingUp} label="Sell-through TB" value="—" sub="Trung bình toàn bộ" iconClass="text-emerald-500" />
          <StatCard icon={RefreshCw} label="Đã restock" value="—" sub="SP có ≥2 batch" iconClass="text-blue-500" />
          <StatCard icon={AlertTriangle} label="Behind schedule" value="—" sub="Cần hành động" iconClass="text-destructive" />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="lifecycle" className="space-y-4">
          <TabsList>
            <TabsTrigger value="lifecycle" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Vòng Đời
            </TabsTrigger>
            <TabsTrigger value="restock" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Restock
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Hiệu Suất
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lifecycle">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Lifecycle Tracker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground space-y-3">
                  <Package className="h-12 w-12 mx-auto opacity-20" />
                  <div>
                    <p className="font-medium">Đang chuẩn bị dữ liệu lifecycle</p>
                    <p className="text-sm">Hệ thống sẽ sync batch data từ kho và hiển thị tiến độ sell-through tại đây</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <Badge variant="outline" className="text-xs">Batch #1 → Initial stock</Badge>
                    <Badge variant="outline" className="text-xs">Batch #2+ → Restock</Badge>
                    <Badge variant="outline" className="text-xs">Target milestones</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restock">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-500" />
                  Restock Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground space-y-3">
                  <RefreshCw className="h-12 w-12 mx-auto opacity-20" />
                  <div>
                    <p className="font-medium">Phát hiện & theo dõi restock</p>
                    <p className="text-sm">Tự động phát hiện spike tồn kho → tạo batch mới → track lifecycle riêng</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  Hiệu Suất Bán Hàng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground space-y-3">
                  <BarChart3 className="h-12 w-12 mx-auto opacity-20" />
                  <div>
                    <p className="font-medium">So sánh hiệu suất theo batch</p>
                    <p className="text-sm">Sell-through velocity, cash-at-risk, margin performance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
