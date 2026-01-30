import { useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate, NavLink as RouterNavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart2, 
  DollarSign,
  AlertCircle,
  TrendingUp,
  Target,
  Wallet,
  ChevronDown,
  ChevronRight,
  Home,
  Settings,
  BookOpen,
  Layers,
  Database,
  Megaphone,
  Activity,
  PieChart,
  Users,
  Zap,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTenantContext } from '@/contexts/TenantContext';
import { TenantSwitcher } from '@/components/tenant/TenantSwitcher';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { MobileBottomNav, MobileHeader, MobileDrawer } from '@/components/mobile';
import { ActivityTrackerProvider } from '@/components/providers/ActivityTrackerProvider';

/**
 * MDP LAYOUT - Light Professional Theme
 * 
 * Clean sidebar with semantic tokens
 * Unified navigation experience
 */

interface NavItem {
  labelKey: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  badge?: number;
  children?: { labelKey: string; label: string; href: string }[];
}

// CMO Mode - Financial accountability & decisions
const cmoModeItems: NavItem[] = [
  {
    labelKey: 'mdp.overview',
    label: 'Overview',
    icon: Target,
    href: '/mdp/ceo',
  },
  {
    labelKey: 'mdp.profitAttribution',
    label: 'Profit Attribution',
    icon: DollarSign,
    href: '/mdp/profit',
  },
  {
    labelKey: 'mdp.cashImpact',
    label: 'Cash Impact',
    icon: Wallet,
    href: '/mdp/cash-impact',
  },
  {
    labelKey: 'mdp.risks',
    label: 'Risks',
    icon: AlertCircle,
    href: '/mdp/risks',
  },
  {
    labelKey: 'mdp.decisions',
    label: 'Decision Center',
    icon: Zap,
    href: '/mdp/decisions',
  },
];

// Marketing Mode - Execution & monitoring
const marketingModeItems: NavItem[] = [
  {
    labelKey: 'mdp.marketingOverview',
    label: 'Overview',
    icon: Activity,
    href: '/mdp/marketing-mode',
  },
  {
    labelKey: 'mdp.campaigns',
    label: 'Campaigns',
    icon: Megaphone,
    href: '/mdp/campaigns',
  },
  {
    labelKey: 'mdp.channels',
    label: 'Channels',
    icon: Layers,
    href: '/mdp/channels',
  },
  {
    labelKey: 'mdp.funnel',
    label: 'Funnel',
    icon: PieChart,
    href: '/mdp/funnel',
  },
  {
    labelKey: 'mdp.audience',
    label: 'Audience',
    icon: Users,
    href: '/mdp/audience',
  },
];

// System items
const systemItems: NavItem[] = [
  { labelKey: 'mdp.dataSources', label: 'Data Sources', icon: Database, href: '/mdp/data-sources' },
  { labelKey: 'mdp.docs', label: 'Documentation', icon: BookOpen, href: '/mdp/docs' },
  { labelKey: 'mdp.settings', label: 'Settings', icon: Settings, href: '/mdp/settings' },
];

export function MDPLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['cmo', 'marketing']);
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Risk count from data (mock)
  const riskCount = 1;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isActive = (path: string) => {
    if (path === '/mdp/ceo') {
      return location.pathname === '/mdp' || location.pathname === '/mdp/ceo';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const hasSectionActiveItem = (items: NavItem[]) => {
    return items.some(item => item.href && isActive(item.href));
  };

  const NavItemLink = ({ item }: { item: NavItem }) => (
    <RouterNavLink
      to={item.href!}
      onClick={() => setMobileDrawerOpen(false)}
      className={({ isActive: active }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
          active || isActive(item.href!)
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )
      }
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge && item.badge > 0 && (
        <Badge 
          variant="secondary" 
          className="h-5 min-w-5 text-xs bg-amber-100 text-amber-700 border-amber-200"
        >
          {item.badge}
        </Badge>
      )}
    </RouterNavLink>
  );

  const SectionHeader = ({ 
    title, 
    section, 
    isExpanded, 
    hasActive,
    icon: Icon 
  }: { 
    title: string; 
    section: string; 
    isExpanded: boolean;
    hasActive: boolean;
    icon: React.ElementType;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors',
        'hover:bg-muted',
        hasActive ? 'text-foreground font-medium' : 'text-muted-foreground'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4" />
        <span>{title}</span>
      </div>
      {isExpanded ? (
        <ChevronDown className="w-4 h-4" />
      ) : (
        <ChevronRight className="w-4 h-4" />
      )}
    </button>
  );

  const SidebarContent = () => (
    <div className="w-[280px] h-full flex flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Bluecore</h1>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Marketing Data Platform</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {/* CMO MODE - Financial accountability & decisions */}
          <div>
            <SectionHeader 
              title="CMO Mode" 
              section="cmo" 
              isExpanded={expandedSections.includes('cmo')}
              hasActive={hasSectionActiveItem(cmoModeItems)}
              icon={Target}
            />
            <AnimatePresence>
              {expandedSections.includes('cmo') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                    {cmoModeItems.map((item) => (
                      <NavItemLink 
                        key={item.labelKey} 
                        item={{ ...item, badge: item.labelKey === 'mdp.risks' ? riskCount : undefined }} 
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* MARKETING MODE - Execution & monitoring */}
          <div>
            <SectionHeader 
              title="Marketing Mode" 
              section="marketing" 
              isExpanded={expandedSections.includes('marketing')}
              hasActive={hasSectionActiveItem(marketingModeItems)}
              icon={Megaphone}
            />
            <AnimatePresence>
              {expandedSections.includes('marketing') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                    {marketingModeItems.map((item) => (
                      <NavItemLink key={item.labelKey} item={item} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>
      </ScrollArea>

      {/* Bottom Navigation */}
      <div className="border-t border-border px-3 py-4 space-y-1">
        {systemItems.map((item) => (
          <NavItemLink key={item.labelKey} item={item} />
        ))}
        <button
          onClick={() => navigate('/portal')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-primary font-medium hover:bg-primary/10 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Back to Portal</span>
        </button>
      </div>
    </div>
  );

  return (
    <ActivityTrackerProvider>
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
        initial={false}
        animate={{ 
          width: sidebarOpen ? 280 : 0,
          x: 0 
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'hidden lg:flex flex-col overflow-hidden',
          'fixed left-0 top-0 bottom-0 z-50'
        )}
      >
        <SidebarContent />
      </motion.aside>

      {/* Main Content */}
      <div className={cn(
        'flex-1 flex flex-col min-h-screen transition-all duration-200',
        sidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-0'
      )}>
        {/* Header - Desktop */}
        <header className="hidden lg:flex sticky top-0 z-20 h-14 bg-background/95 backdrop-blur border-b border-border items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            <TenantSwitcher />
          </div>
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
    </ActivityTrackerProvider>
  );
}
