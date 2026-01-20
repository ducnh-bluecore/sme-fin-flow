import { useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart2, 
  DollarSign,
  AlertCircle,
  TrendingUp,
  Target,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  BookOpen,
  Layers,
  Database
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
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { MobileBottomNav, MobileHeader, MobileDrawer } from '@/components/mobile';

interface NavItemConfig {
  id: string;
  label: string;
  labelEn: string;
  icon: React.ElementType;
  path: string;
  badgeKey?: string;
  section?: 'primary' | 'financial' | 'analytics' | 'system';
}

interface NavItemWithBadge extends NavItemConfig {
  badge?: number;
}

// MDP Navigation - CEO/CFO Grade
// Primary: Financial Impact, Risks, Decisions
// De-emphasized: Marketing analytics, performance details
const navItemsConfig: NavItemConfig[] = [
  // PRIMARY - Financial Decision Surface
  { id: 'overview', label: 'Overview', labelEn: 'Overview', icon: Target, path: '/mdp/ceo', section: 'primary' },
  
  // FINANCIAL IMPACT - CEO/CFO Focus
  { id: 'financial-impact', label: 'Financial Impact', labelEn: 'Financial Impact', icon: DollarSign, path: '/mdp/profit', section: 'financial' },
  { id: 'cash-position', label: 'Cash Position', labelEn: 'Cash Position', icon: Wallet, path: '/mdp/cash-impact', section: 'financial' },
  { id: 'risks', label: 'Risks', labelEn: 'Risks', icon: AlertCircle, path: '/mdp/risks', section: 'financial', badgeKey: 'risks' },
  { id: 'decisions', label: 'Decisions', labelEn: 'Decisions', icon: TrendingUp, path: '/mdp/decisions', section: 'financial' },
  
  // ANALYTICS - De-emphasized (CMO/Team level)
  { id: 'campaigns', label: 'Campaigns', labelEn: 'Campaigns', icon: BarChart2, path: '/mdp/campaigns', section: 'analytics' },
  { id: 'channels', label: 'Channels', labelEn: 'Channels', icon: Layers, path: '/mdp/channels', section: 'analytics' },
];

const systemNavItems: NavItemConfig[] = [
  { id: 'data-sources', label: 'Data Sources', labelEn: 'Data Sources', icon: Database, path: '/mdp/data-sources', section: 'system' },
  { id: 'docs', label: 'Documentation', labelEn: 'Documentation', icon: BookOpen, path: '/mdp/docs', section: 'system' },
  { id: 'settings', label: 'Settings', labelEn: 'Settings', icon: Settings, path: '/mdp/settings', section: 'system' },
];

export function MDPLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Risk count from data
  const riskCount = 1;

  const navItems = useMemo((): NavItemWithBadge[] => {
    const badgeCounts: Record<string, number> = { risks: riskCount };
    return navItemsConfig.map(item => ({
      ...item,
      badge: item.badgeKey ? badgeCounts[item.badgeKey] : undefined,
    }));
  }, [riskCount]);

  const isActive = (path: string) => {
    if (path === '/mdp/ceo') {
      return location.pathname === '/mdp' || location.pathname === '/mdp/ceo';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const NavLink = ({ item }: { item: NavItemWithBadge }) => {
    const isPrimary = item.section === 'primary';
    
    return (
      <button
        onClick={() => {
          navigate(item.path);
          setMobileDrawerOpen(false);
        }}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
          'text-sm',
          isPrimary && 'py-2.5',
          isActive(item.path)
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">
              {language === 'vi' ? item.label : item.labelEn}
            </span>
            {item.badge && item.badge > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 text-xs">
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </button>
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    !collapsed && (
      <div className="px-3 py-2 mt-4 first:mt-0">
        <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
          {children}
        </span>
      </div>
    )
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Target className="h-4 w-4 text-primary" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground">Marketing</h1>
            <p className="text-[11px] text-muted-foreground">Decision Platform</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-0.5">
          {/* Primary */}
          {navItems.filter(item => item.section === 'primary').map((item) => (
            <NavLink key={item.id} item={item} />
          ))}

          {/* Financial */}
          <SectionLabel>Financial</SectionLabel>
          {navItems.filter(item => item.section === 'financial').map((item) => (
            <NavLink key={item.id} item={item} />
          ))}

          {/* Analytics - De-emphasized */}
          <SectionLabel>Analytics</SectionLabel>
          {navItems.filter(item => item.section === 'analytics').map((item) => (
            <NavLink key={item.id} item={item} />
          ))}
        </nav>
      </ScrollArea>

      <Separator />

      {/* System Navigation */}
      <div className="p-2 space-y-0.5">
        {systemNavItems.map((item) => (
          <NavLink key={item.id} item={item as NavItemWithBadge} />
        ))}
        <button
          onClick={() => navigate('/portal')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
          notificationCount={riskCount}
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

      {/* Sidebar - Desktop */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'hidden lg:flex flex-col bg-card border-r',
          'fixed left-0 top-0 bottom-0 z-30'
        )}
      >
        <SidebarContent />
        
        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 h-6 w-6 rounded-full bg-background border shadow-sm"
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
        <header className="hidden lg:flex sticky top-0 z-20 h-14 bg-background/95 backdrop-blur border-b items-center justify-between px-6">
          <TenantSwitcher />
          <div className="flex items-center gap-2">
            <QuickDateSelector />
            <LanguageSwitcher />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMoreClick={() => setMobileDrawerOpen(true)} />
    </div>
  );
}
