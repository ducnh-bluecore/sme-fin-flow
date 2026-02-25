import { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Bell } from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GovernanceOverlay } from '@/components/governance/GovernanceOverlay';
import { useFDPNavConfig } from './fdpNavConfig';
import { AppShell } from './AppShell';
import { Button } from '@/components/ui/button';
import { useActiveAlertsCount, useUnresolvedCriticalCount } from '@/hooks/useNotificationCenter';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

const pageTransition = {
  duration: 0.15,
  ease: 'easeOut' as const,
};

function TenantSwitchingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6 p-2"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 rounded-xl border bg-card">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function DashboardLayout() {
  const { isSwitching } = useTenantContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { sections, bottomItems } = useFDPNavConfig();
  const { data: activeCount = 0 } = useActiveAlertsCount();
  const { data: criticalCount = 0 } = useUnresolvedCriticalCount();

  const headerActions = (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => navigate('/control-tower/command')}
    >
      <Bell className="h-5 w-5" />
      {activeCount > 0 && (
        <span
          className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center font-medium px-1 ${
            criticalCount > 0
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-warning text-warning-foreground'
          }`}
        >
          {activeCount}
        </span>
      )}
    </Button>
  );

  return (
    <AppShell
      config={{
        logo: {
          icon: TrendingUp,
          iconClassName: 'bg-primary text-primary-foreground',
          title: 'Bluecore',
          subtitle: 'Finance Data Platform',
        },
        sections,
        bottomItems,
        headerActions,
        showSearch: true,
        showLogout: true,
        useOutlet: false,
      }}
    >
      {isSwitching ? (
        <TenantSwitchingSkeleton />
      ) : (
        <ErrorBoundary key={location.pathname} onReset={() => {}}>
          <Suspense fallback={<TenantSwitchingSkeleton />}>
            <GovernanceOverlay />
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
              className="min-h-full pb-6"
            >
              <Outlet />
            </motion.div>
          </Suspense>
        </ErrorBoundary>
      )}
    </AppShell>
  );
}
