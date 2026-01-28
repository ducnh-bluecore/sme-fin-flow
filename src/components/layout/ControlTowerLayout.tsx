import { useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Layers, 
  GitCompare, 
  ListTodo, 
  Target, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Home,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTenantContext } from '@/contexts/TenantContext';
import { TenantSwitcher } from '@/components/tenant/TenantSwitcher';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { MobileBottomNav, MobileHeader, MobileDrawer } from '@/components/mobile';
import { useActiveAlertsCount } from '@/hooks/useNotificationCenter';

/**
 * CONTROL TOWER LAYOUT - Rebuilt
 * 
 * 6 Navigation Items:
 * 1. Command (Default) - Real-time pulse
 * 2. Signals - Module-specific drill-down
 * 3. Variance - Cross-module monitoring
 * 4. Queue - Execution tracking
 * 5. Outcomes - Retrospective
 * 6. Settings - Configuration
 */

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'command', label: 'Command', icon: Activity, path: '/control-tower/command' },
  { id: 'signals', label: 'Signals', icon: Layers, path: '/control-tower/signals' },
  { id: 'variance', label: 'Variance', icon: GitCompare, path: '/control-tower/variance' },
  { id: 'queue', label: 'Queue', icon: ListTodo, path: '/control-tower/queue' },
  { id: 'outcomes', label: 'Outcomes', icon: Target, path: '/control-tower/outcomes' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/control-tower/settings' },
];

export function ControlTowerLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { activeTenant } = useTenantContext();

  // Fetch alert count for badge
  const { data: alertsData } = useActiveAlertsCount();
  const activeAlertsCount = alertsData?.total ?? 0;

  // Add badge to Command nav item
  const navItemsWithBadge = useMemo(() => {
    return navItems.map(item => ({
      ...item,
      badge: item.id === 'command' ? activeAlertsCount : undefined,
    }));
  }, [activeAlertsCount]);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const NavLink = ({ item }: { item: NavItem }) => (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        navigate(item.path);
        setMobileDrawerOpen(false);
      }}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
        'text-sm font-medium',
        isActive(item.path)
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive(item.path) ? 'text-primary' : '')} />
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <Badge 
              className={cn(
                'h-5 min-w-5 flex items-center justify-center text-xs font-semibold',
                isActive(item.path)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-destructive text-destructive-foreground'
              )}
            >
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </motion.button>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">Control Tower</h1>
            <p className="text-xs text-muted-foreground truncate">{activeTenant?.name || 'Operations'}</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItemsWithBadge.map((item) => (
            <NavLink key={item.id} item={item} />
          ))}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Back to Portal */}
      <div className="p-3">
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/portal')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Back to Portal</span>}
        </motion.button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader
          showSearch
          showNotifications
          notificationCount={activeAlertsCount}
          onNotificationClick={() => navigate('/control-tower/command')}
          onSearchClick={() => {}}
          onProfileClick={() => setMobileDrawerOpen(true)}
        />
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* Sidebar - Desktop Only */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'hidden lg:flex flex-col bg-card border-r',
          'fixed left-0 top-0 bottom-0 z-30'
        )}
      >
        <SidebarContent />
        
        {/* Collapse Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-background border shadow-sm"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </motion.aside>

      {/* Main Content */}
      <div 
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-200',
          'lg:ml-0',
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
        )}
      >
        {/* Header - Desktop Only */}
        <header className="hidden lg:flex sticky top-0 z-20 h-14 bg-background/80 backdrop-blur-xl border-b items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <TenantSwitcher />
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative" 
              onClick={() => navigate('/control-tower/command')}
            >
              <Bell className="h-5 w-5" />
              {activeAlertsCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
              )}
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMoreClick={() => setMobileDrawerOpen(true)} />
    </div>
  );
}
