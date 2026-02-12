import { useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Crosshair, 
  LayoutDashboard,
  ArrowRightLeft,
  Layers3,
  Network,
  Factory,
  ListChecks,
  Target,
  Settings,
  ChevronLeft,
  ChevronRight,
  Home,
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
import { ActivityTrackerProvider } from '@/components/providers/ActivityTrackerProvider';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Tổng Quan', icon: LayoutDashboard, path: '/command/overview' },
  { id: 'allocation', label: 'Phân Bổ', icon: ArrowRightLeft, path: '/command/allocation' },
  { id: 'assortment', label: 'Cơ Cấu Size', icon: Layers3, path: '/command/assortment' },
  { id: 'network-gap', label: 'Nguồn Cung', icon: Network, path: '/command/network-gap' },
  { id: 'production', label: 'Sản Xuất', icon: Factory, path: '/command/production' },
  { id: 'decisions', label: 'Quyết Định', icon: ListChecks, path: '/command/decisions' },
  { id: 'outcomes', label: 'Kết Quả', icon: Target, path: '/command/outcomes' },
  { id: 'settings', label: 'Cài Đặt', icon: Settings, path: '/command/settings' },
];

export function BluecoreCommandLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { activeTenant } = useTenantContext();

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
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <Crosshair className="h-5 w-5 text-orange-600" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">Bluecore Command</h1>
            <p className="text-xs text-muted-foreground truncate">{activeTenant?.name || 'Inventory Intelligence'}</p>
          </div>
        )}
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.id} item={item} />
          ))}
        </nav>
      </ScrollArea>

      <Separator />

      <div className="p-3">
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/portal')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Về Trang Chính</span>}
        </motion.button>
      </div>
    </div>
  );

  return (
    <ActivityTrackerProvider>
    <div className="min-h-screen bg-background flex">
      <div className="lg:hidden">
        <MobileHeader
          showSearch
          showNotifications={false}
          onSearchClick={() => {}}
          onProfileClick={() => setMobileDrawerOpen(true)}
        />
      </div>

      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'hidden lg:flex flex-col bg-card border-r',
          'fixed left-0 top-0 bottom-0 z-30'
        )}
      >
        <SidebarContent />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-background border shadow-sm"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </motion.aside>

      <div 
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-200',
          'lg:ml-0',
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
        )}
      >
        <header className="hidden lg:flex sticky top-0 z-20 h-14 bg-background/80 backdrop-blur-xl border-b items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <TenantSwitcher />
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav onMoreClick={() => setMobileDrawerOpen(true)} />
    </div>
    </ActivityTrackerProvider>
  );
}
