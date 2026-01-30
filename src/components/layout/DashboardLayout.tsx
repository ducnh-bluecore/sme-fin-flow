import { useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useTenantContext } from '@/contexts/TenantContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GovernanceOverlay } from '@/components/governance/GovernanceOverlay';
import { ActivityTrackerProvider } from '@/components/providers/ActivityTrackerProvider';

// Simplified page variants - removed exit animation to prevent blank screens
const pageVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
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
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border bg-card">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
        <div className="p-6 rounded-xl border bg-card">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="p-6 rounded-xl border bg-card">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { isSwitching } = useTenantContext();

  return (
    <ActivityTrackerProvider>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          
          <main className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar">
            {isSwitching ? (
              <TenantSwitchingSkeleton />
            ) : (
              <ErrorBoundary
                key={location.pathname}
                // Avoid infinite reload loops; let the user retry within React first.
                onReset={() => {}}
              >
                <Suspense fallback={<TenantSwitchingSkeleton />}>
                  {/* Governance Dashboard - shows when ?governance=1 */}
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
          </main>
        </div>
      </div>
    </ActivityTrackerProvider>
  );
}
