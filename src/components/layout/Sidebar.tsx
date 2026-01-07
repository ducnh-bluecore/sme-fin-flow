import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Database,
  BarChart3,
  Bell,
  Shield,
  Plug,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  TrendingUp,
  FlaskConical,
  Receipt,
  Building2,
  CreditCard,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  BookOpen,
  PenSquare,
  Crown,
  Target,
  Briefcase,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  labelKey: string;
  icon: React.ElementType;
  href?: string;
  children?: { labelKey: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    labelKey: 'nav.cfoOverview',
    icon: LayoutDashboard,
    children: [
      { labelKey: 'nav.dashboard', href: '/' },
      { labelKey: 'nav.cashForecast', href: '/cash-forecast' },
      { labelKey: 'nav.workingCapital', href: '/working-capital' },
      { labelKey: 'nav.cashConversion', href: '/cash-conversion-cycle' },
    ],
  },
  {
    labelKey: 'nav.strategyDecision',
    icon: Target,
    children: [
      { labelKey: 'nav.executiveSummary', href: '/executive-summary' },
      { labelKey: 'nav.capitalAllocation', href: '/capital-allocation' },
      { labelKey: 'nav.riskDashboard', href: '/risk-dashboard' },
      { labelKey: 'nav.decisionSupport', href: '/decision-support' },
    ],
  },
  {
    labelKey: 'nav.financialReports',
    icon: BarChart3,
    children: [
      { labelKey: 'nav.plReport', href: '/pl-report' },
      { labelKey: 'nav.analysis', href: '/financial-reports' },
      { labelKey: 'nav.budgetVsActual', href: '/budget-vs-actual' },
      { labelKey: 'nav.varianceAnalysis', href: '/variance-analysis' },
      { labelKey: 'nav.boardReports', href: '/board-reports' },
    ],
  },
  {
    labelKey: 'nav.planSimulation',
    icon: FlaskConical,
    children: [
      { labelKey: 'nav.scenario', href: '/scenario' },
      { labelKey: 'nav.rollingForecast', href: '/rolling-forecast' },
      { labelKey: 'nav.strategicInitiatives', href: '/strategic-initiatives' },
    ],
  },
  {
    labelKey: 'nav.arAp',
    icon: Receipt,
    children: [
      { labelKey: 'nav.invoiceManagement', href: '/invoice/tracking' },
      { labelKey: 'nav.arOperations', href: '/ar-operations' },
      { labelKey: 'nav.apOverview', href: '/bills' },
      { labelKey: 'nav.creditDebitNotes', href: '/credit-debit-notes' },
      { labelKey: 'nav.reconciliation', href: '/reconciliation' },
    ],
  },
  {
    labelKey: 'nav.salesChannels',
    icon: TrendingUp,
    children: [
      { labelKey: 'nav.channelAnalytics', href: '/channel-analytics' },
      { labelKey: 'nav.unitEconomics', href: '/unit-economics' },
    ],
  },
  {
    labelKey: 'nav.dataHub',
    icon: Database,
    children: [
      { labelKey: 'nav.dataCenter', href: '/data-hub' },
      { labelKey: 'nav.etlRules', href: '/etl-rules' },
    ],
  },
  {
    labelKey: 'nav.taxCompliance',
    icon: Shield,
    children: [
      { labelKey: 'nav.taxTracking', href: '/tax-compliance' },
      { labelKey: 'nav.covenantTracking', href: '/covenant-tracking' },
    ],
  },
  {
    labelKey: 'nav.alerts',
    icon: Bell,
    href: '/alerts',
  },
  {
    labelKey: 'nav.admin',
    icon: Users,
    children: [
      { labelKey: 'nav.companyManagement', href: '/tenant' },
      { labelKey: 'nav.members', href: '/tenant/members' },
      { labelKey: 'nav.rbac', href: '/rbac' },
      { labelKey: 'nav.auditLog', href: '/audit-log' },
    ],
  },
  {
    labelKey: 'nav.api',
    icon: Plug,
    href: '/api',
  },
];

// Super Admin menu items - only shown for super admins
const superAdminItems: NavItem = {
  labelKey: 'nav.superAdmin',
  icon: Crown,
  children: [
    { labelKey: 'nav.dashboard', href: '/admin' },
    { labelKey: 'nav.tenantManagement', href: '/admin/tenants' },
    { labelKey: 'nav.userManagement', href: '/admin/users' },
    { labelKey: 'nav.platformSettings', href: '/admin/settings' },
  ],
};

const bottomNavItems: NavItem[] = [
  { labelKey: 'nav.integrationGuide', icon: BookOpen, href: '/data-guide' },
  { labelKey: 'nav.formulas', icon: PenSquare, children: [
    { labelKey: 'nav.formulasOverview', href: '/formulas' },
    { labelKey: 'nav.formulaSettings', href: '/formula-settings' },
  ]},
  { labelKey: 'common.settings', icon: Settings, href: '/settings' },
  { labelKey: 'common.help', icon: HelpCircle, href: '/help' },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(['nav.cfoOverview']);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { t } = useLanguage();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const toggleExpand = (labelKey: string) => {
    setExpandedItems((prev) =>
      prev.includes(labelKey) ? prev.filter((item) => item !== labelKey) : [...prev, labelKey]
    );
  };

  const isActive = (href?: string) => href === location.pathname;
  const hasActiveChild = (children?: { labelKey: string; href: string }[]) =>
    children?.some((child) => child.href === location.pathname);

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isOpen ? 280 : 0,
          x: 0 
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'fixed left-0 top-0 h-full z-50 flex flex-col overflow-hidden',
          'bg-sidebar text-sidebar-foreground',
          'lg:relative lg:h-full'
        )}
        style={{
          background: 'linear-gradient(180deg, hsl(224 55% 12%) 0%, hsl(224 55% 8%) 100%)',
        }}
      >
        <div className="w-[280px] h-full flex flex-col">
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-sidebar-accent-foreground">Bluecore</h1>
              <p className="text-[10px] text-sidebar-foreground/60 -mt-0.5">Finance Data Platform</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {/* Regular nav items */}
            {navItems.map((item) => (
              <div key={item.labelKey}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpand(item.labelKey)}
                      className={cn(
                        'nav-item w-full justify-between',
                        hasActiveChild(item.children) && 'text-sidebar-accent-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="text-sm">{t(item.labelKey)}</span>
                      </div>
                      {expandedItems.includes(item.labelKey) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <AnimatePresence>
                      {expandedItems.includes(item.labelKey) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-8 mt-1 space-y-1 border-l border-sidebar-border pl-4">
                            {item.children.map((child) => (
                              <NavLink
                                key={child.href}
                                to={child.href}
                                end
                                className={({ isActive }) =>
                                  cn(
                                    'block py-2 px-3 rounded-md text-sm transition-colors',
                                    isActive
                                      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                                      : 'text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent'
                                  )
                                }
                              >
                                {t(child.labelKey)}
                              </NavLink>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <NavLink
                    to={item.href!}
                    className={({ isActive }) =>
                      cn('nav-item', isActive && 'active')
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{t(item.labelKey)}</span>
                  </NavLink>
                )}
              </div>
            ))}

            {/* Super Admin Menu - only shown for super admins */}
            {isSuperAdmin && superAdminItems.children && (
              <div className="pt-3 mt-3 border-t border-sidebar-border">
                <div>
                  <button
                    onClick={() => toggleExpand(superAdminItems.labelKey)}
                    className={cn(
                      'nav-item w-full justify-between',
                      'bg-gradient-to-r from-red-500/10 to-orange-500/10',
                      hasActiveChild(superAdminItems.children) && 'text-red-300'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <superAdminItems.icon className="w-5 h-5 text-red-400" />
                      <span className="text-sm text-red-300">{t(superAdminItems.labelKey)}</span>
                    </div>
                    {expandedItems.includes(superAdminItems.labelKey) ? (
                      <ChevronDown className="w-4 h-4 text-red-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-red-400" />
                    )}
                  </button>
                  <AnimatePresence>
                    {expandedItems.includes(superAdminItems.labelKey) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-8 mt-1 space-y-1 border-l border-red-500/30 pl-4">
                          {superAdminItems.children.map((child) => (
                            <NavLink
                              key={child.href}
                              to={child.href}
                              className={({ isActive }) =>
                                cn(
                                  'block py-2 px-3 rounded-md text-sm transition-colors',
                                  isActive
                                    ? 'bg-red-500/20 text-red-300 font-medium'
                                    : 'text-red-300/70 hover:text-red-300 hover:bg-red-500/10'
                                )
                              }
                            >
                              {t(child.labelKey)}
                            </NavLink>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </nav>
        </ScrollArea>

        {/* Bottom Section */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
          {bottomNavItems.map((item) => (
            item.children ? (
              <div key={item.labelKey}>
                <button
                  onClick={() => toggleExpand(item.labelKey)}
                  className={cn(
                    'nav-item w-full justify-between',
                    hasActiveChild(item.children) && 'text-sidebar-accent-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{t(item.labelKey)}</span>
                  </div>
                  {expandedItems.includes(item.labelKey) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <AnimatePresence>
                  {expandedItems.includes(item.labelKey) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-8 mt-1 space-y-1 border-l border-sidebar-border pl-4">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.href}
                            to={child.href}
                            end
                            className={({ isActive }) =>
                              cn(
                                'block py-2 px-3 rounded-md text-sm transition-colors',
                                isActive
                                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                                  : 'text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent'
                              )
                            }
                          >
                            {t(child.labelKey)}
                          </NavLink>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <NavLink
                key={item.labelKey}
                to={item.href!}
                end={item.href === '/settings'}
                className={({ isActive }) =>
                  cn('nav-item', isActive && 'active')
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm">{t(item.labelKey)}</span>
              </NavLink>
            )
          ))}
          <button 
            onClick={handleSignOut}
            className="nav-item w-full text-destructive/80 hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">{t('common.logout')}</span>
          </button>
        </div>

        {/* User Profile */}
        <div className="px-4 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
              <Users className="w-5 h-5 text-sidebar-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
        </div>
      </motion.aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="lg:hidden"
    >
      <Menu className="w-5 h-5" />
    </Button>
  );
}
