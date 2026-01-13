import { useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone,
  BarChart3, 
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Target,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  BookOpen,
  Bell,
  Layers,
  PieChart,
  Zap,
  LineChart,
  Gauge
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
import { DateRangeIndicator } from '@/components/shared/DateRangeIndicator';
import { MobileBottomNav, MobileHeader, MobileDrawer } from '@/components/mobile';

interface NavItemConfig {
  id: string;
  label: string;
  labelEn: string;
  icon: React.ElementType;
  path: string;
  badgeKey?: string;
  mode?: 'marketing' | 'cmo';
}

interface NavItemWithBadge extends NavItemConfig {
  badge?: number;
}

// MDP Manifesto: Profit before Performance. Cash before Clicks.
// Two modes: Marketing Mode (Execution) & CMO Mode (Decision)
const navItemsConfig: NavItemConfig[] = [
  // Core Dashboard
  { id: 'overview', label: 'Tổng quan MDP', labelEn: 'MDP Overview', icon: Megaphone, path: '/mdp' },
  
  // Marketing Mode (Execution)
  { id: 'campaigns', label: 'Hiệu suất Campaigns', labelEn: 'Campaign Performance', icon: BarChart3, path: '/mdp/campaigns', mode: 'marketing' },
  { id: 'channels', label: 'Phân tích Kênh', labelEn: 'Channel Analysis', icon: Layers, path: '/mdp/channels', mode: 'marketing' },
  { id: 'funnel', label: 'Marketing Funnel', labelEn: 'Marketing Funnel', icon: TrendingUp, path: '/mdp/funnel', mode: 'marketing' },
  { id: 'ab-testing', label: 'A/B Testing', labelEn: 'A/B Testing', icon: Gauge, path: '/mdp/ab-testing', mode: 'marketing' },
  { id: 'audience', label: 'Audience Insights', labelEn: 'Audience Insights', icon: PieChart, path: '/mdp/audience', mode: 'marketing' },
  
  // CMO Mode (Decision)
  { id: 'profit', label: 'Profit Attribution', labelEn: 'Profit Attribution', icon: DollarSign, path: '/mdp/profit', mode: 'cmo' },
  { id: 'cash-impact', label: 'Cash Impact', labelEn: 'Cash Impact', icon: Wallet, path: '/mdp/cash-impact', mode: 'cmo' },
  { id: 'risks', label: 'Marketing Risks', labelEn: 'Marketing Risks', icon: AlertTriangle, path: '/mdp/risks', mode: 'cmo', badgeKey: 'risks' },
  { id: 'decisions', label: 'Decision Center', labelEn: 'Decision Center', icon: Target, path: '/mdp/decisions', mode: 'cmo' },
  { id: 'budget-optimizer', label: 'Budget Optimizer', labelEn: 'Budget Optimizer', icon: Zap, path: '/mdp/budget-optimizer', mode: 'cmo' },
  { id: 'scenario-planner', label: 'Scenario Planner', labelEn: 'Scenario Planner', icon: LineChart, path: '/mdp/scenario-planner', mode: 'cmo' },
  
  // Analytics
  { id: 'roi-analytics', label: 'ROI Analytics', labelEn: 'ROI Analytics', icon: BarChart3, path: '/mdp/roi-analytics' },
  { id: 'customer-ltv', label: 'Customer LTV', labelEn: 'Customer LTV', icon: DollarSign, path: '/mdp/customer-ltv' },
];

const bottomNavItemsConfig: NavItemConfig[] = [
  { id: 'data-sources', label: 'Nguồn dữ liệu', labelEn: 'Data Sources', icon: Layers, path: '/mdp/data-sources' },
  { id: 'docs', label: 'Hướng dẫn', labelEn: 'Documentation', icon: BookOpen, path: '/mdp/docs' },
  { id: 'settings', label: 'Cài đặt', labelEn: 'Settings', icon: Settings, path: '/mdp/settings' },
];

export function MDPLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { activeTenant } = useTenantContext();

  // Mock badge counts - in real app, fetch from useMDPData
  const riskAlertsCount = 2;

  // Build navItems with badge counts
  const navItems = useMemo((): NavItemWithBadge[] => {
    const badgeCounts: Record<string, number> = {
      risks: riskAlertsCount,
    };
    
    return navItemsConfig.map(item => ({
      ...item,
      badge: item.badgeKey ? badgeCounts[item.badgeKey] : undefined,
    }));
  }, [riskAlertsCount]);

  const bottomNavItems: NavItemWithBadge[] = bottomNavItemsConfig.map(item => ({ ...item }));

  const isActive = (path: string) => {
    if (path === '/mdp') {
      return location.pathname === '/mdp';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
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
          ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      )}
    >
      <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive(item.path) ? 'text-violet-400' : '')} />
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">
            {language === 'vi' ? item.label : item.labelEn}
          </span>
          {item.badge && item.badge > 0 && (
            <Badge 
              className={cn(
                'h-5 min-w-5 flex items-center justify-center text-xs font-semibold',
                isActive(item.path)
                  ? 'bg-violet-500 text-white'
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

  const SectionHeader = ({ title, collapsed }: { title: string; collapsed: boolean }) => (
    !collapsed && (
      <div className="px-3 py-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
    )
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Megaphone className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-100 truncate">MDP</h1>
            <p className="text-xs text-slate-500 truncate">Marketing Data Platform</p>
          </div>
        )}
      </div>

      <Separator className="bg-slate-700/50" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {/* Core */}
          {navItems.filter(item => !item.mode).map((item) => (
            <NavLink key={item.id} item={item} />
          ))}
          
          {/* Marketing Mode Section */}
          <div className="pt-4">
            <SectionHeader title={language === 'vi' ? 'Marketing Mode' : 'Marketing Mode'} collapsed={collapsed} />
            <div className="space-y-1">
              {navItems.filter(item => item.mode === 'marketing').map((item) => (
                <NavLink key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* CMO Mode Section */}
          <div className="pt-4">
            <SectionHeader title={language === 'vi' ? 'CMO Mode' : 'CMO Mode'} collapsed={collapsed} />
            <div className="space-y-1">
              {navItems.filter(item => item.mode === 'cmo').map((item) => (
                <NavLink key={item.id} item={item} />
              ))}
            </div>
          </div>
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
          {!collapsed && <span className="text-sm font-medium">{language === 'vi' ? 'Về Portal' : 'Back to Portal'}</span>}
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
          notificationCount={riskAlertsCount}
          onNotificationClick={() => navigate('/mdp/risks')}
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
            <DateRangeIndicator />
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-200">
              <Bell className="h-5 w-5" />
              {riskAlertsCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-violet-500 rounded-full" />
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
