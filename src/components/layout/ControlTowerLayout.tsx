import { useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Bell, 
  CheckSquare, 
  BarChart3, 
  Users, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Home,
  AlertTriangle,
  TrendingUp,
  Store,
  Bot,
  Target,
  BookOpen,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTenantContext } from '@/contexts/TenantContext';
import { TenantSwitcher } from '@/components/tenant/TenantSwitcher';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { MobileBottomNav, MobileHeader, MobileDrawer } from '@/components/mobile';
import { useActiveAlertsCount } from '@/hooks/useNotificationCenter';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badgeKey?: string;
}

interface NavItemWithBadge extends NavItemConfig {
  badge?: number;
}

const navItemsConfig: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/control-tower' },
  { id: 'kpi-rules', label: 'Rules KPI', icon: Target, path: '/control-tower/kpi-rules' },
  { id: 'rules-doc', label: 'Tài liệu Rules', icon: BookOpen, path: '/control-tower/rules-doc' },
  { id: 'docs', label: 'Tài liệu hệ thống', icon: FileText, path: '/control-tower/docs' },
  { id: 'tasks', label: 'Công việc', icon: CheckSquare, path: '/control-tower/tasks', badgeKey: 'tasks' },
  { id: 'alerts', label: 'Cảnh báo', icon: AlertTriangle, path: '/control-tower/alerts', badgeKey: 'alerts' },
  { id: 'analytics', label: 'Phân tích', icon: BarChart3, path: '/control-tower/analytics' },
  { id: 'stores', label: 'Kênh bán', icon: Store, path: '/control-tower/stores' },
  { id: 'performance', label: 'Hiệu suất', icon: TrendingUp, path: '/control-tower/performance' },
  { id: 'team', label: 'Đội ngũ', icon: Users, path: '/control-tower/team' },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Bot, path: '/control-tower/chat' },
];

const bottomNavItemsConfig: NavItemConfig[] = [
  { id: 'settings', label: 'Cài đặt', icon: Settings, path: '/control-tower/settings' },
];

export function ControlTowerLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { activeTenant } = useTenantContext();

  // Fetch real counts from database
  const { data: alertsData } = useActiveAlertsCount();
  const activeAlertsCount = alertsData?.total ?? 0;
  
  const { data: pendingTasksCount = 0 } = useQuery({
    queryKey: ['pending-tasks-count', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return 0;
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', activeTenant.id)
        .in('status', ['todo', 'pending', 'in_progress']);
      return count || 0;
    },
    enabled: !!activeTenant?.id,
  });

  // Build navItems with real badge counts
  const navItems = useMemo((): NavItemWithBadge[] => {
    const badgeCounts: Record<string, number> = {
      alerts: activeAlertsCount,
      tasks: pendingTasksCount,
    };
    
    return navItemsConfig.map(item => ({
      ...item,
      badge: item.badgeKey ? badgeCounts[item.badgeKey] : undefined,
    }));
  }, [activeAlertsCount, pendingTasksCount]);

  const bottomNavItems: NavItemWithBadge[] = bottomNavItemsConfig.map(item => ({ ...item }));

  const isActive = (path: string) => {
    if (path === '/control-tower') {
      return location.pathname === '/control-tower';
    }
    return location.pathname.startsWith(path);
  };

  const NavLink = ({ item }: { item: NavItemWithBadge }) => (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        navigate(item.path);
        setMobileDrawerOpen(false);
      }}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
        'text-sm font-medium',
        isActive(item.path)
          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      )}
    >
      <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive(item.path) ? 'text-amber-400' : '')} />
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {item.badge && item.badge > 0 && (
            <Badge 
              className={cn(
                'h-5 min-w-5 flex items-center justify-center text-xs font-semibold',
                isActive(item.path)
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-700 text-slate-300'
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
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
          <LayoutDashboard className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-100 truncate">Control Tower</h1>
            <p className="text-xs text-slate-500 truncate">{activeTenant?.name || 'Operation System'}</p>
          </div>
        )}
      </div>

      <Separator className="bg-slate-700/50" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.id} item={item} />
          ))}
        </nav>
      </ScrollArea>

      <Separator className="bg-slate-700/50" />

      {/* Bottom Navigation */}
      <div className="p-3 space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink key={item.id} item={item} />
        ))}
        <motion.button
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/portal')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all"
        >
          <Home className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Về Portal</span>}
        </motion.button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F1117] flex">
      {/* Mobile Header - Only on mobile */}
      <div className="lg:hidden">
        <MobileHeader
          showSearch
          showNotifications
          notificationCount={5}
          onNotificationClick={() => navigate('/control-tower/notifications')}
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
          'hidden lg:flex flex-col bg-[#13151C] border-r border-slate-800/50',
          'fixed left-0 top-0 bottom-0 z-30'
        )}
      >
        <SidebarContent />
        
        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
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
        <header className="hidden lg:flex sticky top-0 z-20 h-16 bg-[#0F1117]/80 backdrop-blur-xl border-b border-slate-800/50 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <TenantSwitcher />
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-200">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-amber-500 rounded-full" />
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
