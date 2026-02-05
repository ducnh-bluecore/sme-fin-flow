import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle,
  Bell,
  Loader2,
  Filter
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotificationCenter } from '@/hooks/useNotificationCenter';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { MobileAlertItem } from '@/components/mobile/MobileAlertItem';
import { Button } from '@/components/ui/button';

export default function MobileAlertsPage() {
  const { 
    instances, 
    stats, 
    isLoading, 
    acknowledgeAlert,
    resolveAlert,
    refetch: refetchInstances 
  } = useNotificationCenter();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert.mutateAsync(id);
  };

  const handleResolve = async (id: string) => {
    await resolveAlert.mutateAsync({ id });
    setSelectedId(null);
  };

  const handleRefresh = async () => {
    await refetchInstances();
  };

  const activeAlerts = useMemo(() => 
    instances.filter(i => i.status === 'active'),
    [instances]
  );

  const acknowledgedAlerts = useMemo(() =>
    instances.filter(i => i.status === 'acknowledged'),
    [instances]
  );

  const resolvedAlerts = useMemo(() =>
    instances.filter(i => i.status === 'resolved').slice(0, 20),
    [instances]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  const renderAlertList = (alerts: typeof instances, emptyMessage: string) => (
    <AnimatePresence mode="popLayout">
      {alerts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <CheckCircle className="h-12 w-12 text-primary/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
            >
              <MobileAlertItem
                id={alert.id}
                title={alert.title}
                message={alert.message || ''}
                severity={(alert.severity as 'critical' | 'warning' | 'info') || 'info'}
                category={alert.category}
                createdAt={alert.created_at}
                isRead={alert.status !== 'active'}
                onClick={() => setSelectedId(alert.id)}
              />
              
              {/* Inline Actions */}
              {selectedId === alert.id && alert.status !== 'resolved' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-2 mt-2 px-2"
                >
                  {alert.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      Đã nhận
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleResolve(alert.id)}
                  >
                    Đánh dấu xong
                  </Button>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <Helmet>
        <title>Tất cả cảnh báo | Mobile App</title>
      </Helmet>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="w-full bg-muted/50 p-1 mb-4">
              <TabsTrigger value="active" className="flex-1 text-xs">
                Mới ({activeAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="acknowledged" className="flex-1 text-xs">
                Đã nhận ({acknowledgedAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex-1 text-xs">
                Xong ({resolvedAlerts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-0">
              {renderAlertList(activeAlerts, 'Không có cảnh báo mới')}
            </TabsContent>

            <TabsContent value="acknowledged" className="mt-0">
              {renderAlertList(acknowledgedAlerts, 'Không có cảnh báo đã nhận')}
            </TabsContent>

            <TabsContent value="resolved" className="mt-0">
              {renderAlertList(resolvedAlerts, 'Không có cảnh báo đã xử lý')}
            </TabsContent>
          </Tabs>
        </div>
      </PullToRefresh>
    </>
  );
}
