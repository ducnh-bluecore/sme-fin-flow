import { useState, useMemo, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Target, 
  CheckSquare, 
  FileText, 
  Bell, 
  Shield, 
  Users, 
  Settings, 
  Home,
  ChevronLeft,
  ChevronRight,
  Activity
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * CONTROL TOWER LAYOUT - Bluecore Executive Navigation
 * 
 * BLUECORE DNA: Dark executive system, financial control room
 * NOT a generic SaaS sidebar
 * 
 * Visual weight, authority, seriousness
 */

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badgeCount?: number;
}

export function ControlTowerLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { activeTenant } = useTenantContext();

  // Force dark mode for Control Tower
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  // Fetch badge counts
  const { data: alertsData } = useActiveAlertsCount();
  const activeAlertsCount = alertsData?.total ?? 0;
  
  const { data: executionCount = 0 } = useQuery({
    queryKey: ['execution-count', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return 0;
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', activeTenant.id)
        .in('status', ['todo', 'pending', 'in_progress', 'blocked']);
      return count || 0;
    },
    enabled: !!activeTenant?.id,
  });

  // Navigation items
  const navItems = useMemo((): NavItem[] => [
    { id: 'ceo', label: 'CEO Control Tower', icon: Target, path: '/control-tower/ceo' },
    { id: 'coo', label: 'Execution Control', icon: CheckSquare, path: '/control-tower/coo', badgeCount: executionCount > 0 ? executionCount : undefined },
    { id: 'decisions', label: 'Decision Workspace', icon: FileText, path: '/control-tower/decisions' },
    { id: 'signals', label: 'Signals', icon: Bell, path: '/control-tower/signals', badgeCount: activeAlertsCount > 0 ? activeAlertsCount : undefined },
    { id: 'rules', label: 'Rules & Governance', icon: Shield, path: '/control-tower/rules' },
    { id: 'teams', label: 'Teams', icon: Users, path: '/control-tower/teams' },
  ], [activeAlertsCount, executionCount]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const NavLink = ({ item }: { item: NavItem }) => (
    <button
      onClick={() => {
        navigate(item.path);
        setMobileDrawerOpen(false);
      }}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
        'text-sm font-medium',
        isActive(item.path)
          ? 'bg-primary/15 text-primary border border-primary/25'
          : 'text-muted-foreground hover:bg-[hsl(var(--surface-overlay))] hover:text-foreground'
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {item.badgeCount && (
            <Badge 
              variant="secondary" 
              className={cn(
                'h-5 min-w-5 text-xs',
                isActive(item.path) 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-[hsl(var(--surface-overlay))] text-muted-foreground'
              )}
            >
              {item.badgeCount}
            </Badge>
          )}
        </>
      )}
    </button>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Activity className="h-4 w-4 text-primary" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate">Control Tower</h1>
            <p className="text-xs text-muted-foreground truncate">{activeTenant?.name || 'Executive OS'}</p>
          </div>
        )}
      </div>

      <Separator className="bg-border/30" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.id} item={item} />
          ))}
        </nav>
      </ScrollArea>

      <Separator className="bg-border/30" />

      {/* Bottom */}
      <div className="p-3 space-y-1">
        <NavLink item={{ id: 'settings', label: 'Settings', icon: Settings, path: '/control-tower/settings' }} />
        <button
          onClick={() => navigate('/portal')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-[hsl(var(--surface-overlay))] hover:text-foreground transition-all"
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Back to Portal</span>}
        </button>
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
          onNotificationClick={() => navigate('/control-tower/signals')}
          onSearchClick={() => {}}
          onProfileClick={() => setMobileDrawerOpen(true)}
        />
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} />

      {/* Sidebar - Desktop */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={cn(
          'hidden lg:flex flex-col bg-card border-r border-border/40',
          'fixed left-0 top-0 bottom-0 z-30'
        )}
      >
        <SidebarContent />
        
        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 h-6 w-6 rounded-full bg-[hsl(var(--surface-raised))] border border-border/50 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-overlay))]"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </motion.aside>

      {/* Main Content */}
      <div className={cn(
        'flex-1 flex flex-col min-h-screen transition-all duration-150',
        collapsed ? 'lg:ml-16' : 'lg:ml-60'
      )}>
        {/* Header - Desktop */}
        <header className="hidden lg:flex sticky top-0 z-20 h-14 bg-background/90 backdrop-blur-sm border-b border-border/40 items-center justify-between px-6">
          <TenantSwitcher />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav onMoreClick={() => setMobileDrawerOpen(true)} />
    </div>
  );
}
