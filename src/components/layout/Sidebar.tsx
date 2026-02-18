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
  Package,
  Percent,
  Banknote,
  Home,
  Zap,
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
  // [1] TỔNG QUAN
  {
    labelKey: 'nav.cfoOverview',
    icon: LayoutDashboard,
    children: [
      { labelKey: 'nav.dashboard', href: '/dashboard' },
      { labelKey: 'nav.cashPosition', href: '/cash-position' },
      { labelKey: 'nav.cashForecast', href: '/cash-forecast' },
      { labelKey: 'nav.cashFlowDirect', href: '/cash-flow-direct' },
      { labelKey: 'nav.workingCapitalHub', href: '/working-capital-hub' },
    ],
  },
  // [2] PHÂN TÍCH TÀI CHÍNH
  {
    labelKey: 'nav.financialReports',
    icon: BarChart3,
    children: [
      { labelKey: 'nav.plReport', href: '/pl-report' },
      { labelKey: 'nav.analysis', href: '/financial-reports' },
      { labelKey: 'nav.performanceAnalysis', href: '/performance-analysis' },
      { labelKey: 'nav.channelAnalytics', href: '/channel-analytics' },
      { labelKey: 'nav.unitEconomics', href: '/unit-economics' },
      { labelKey: 'nav.revenue', href: '/revenue' },
    ],
  },
  // [3] ĐỐI SOÁT & CÔNG NỢ
  {
    labelKey: 'nav.arAp',
    icon: Receipt,
    children: [
      { labelKey: 'nav.arOperations', href: '/ar-operations' },
      { labelKey: 'nav.apOverview', href: '/bills' },
      { labelKey: 'nav.reconciliation', href: '/reconciliation' },
      { labelKey: 'nav.exceptions', href: '/exceptions' },
      { labelKey: 'nav.creditDebitNotes', href: '/credit-debit-notes' },
    ],
  },
  // [4] NHẬP LIỆU & CẤU HÌNH
  {
    labelKey: 'nav.dataHub',
    icon: Database,
    children: [
      { labelKey: 'nav.expenses', href: '/expenses' },
      { labelKey: 'nav.supplierPayments', href: '/supplier-payments' },
      { labelKey: 'nav.bankConnections', href: '/bank-connections' },
      { labelKey: 'nav.chartOfAccounts', href: '/chart-of-accounts' },
      { labelKey: 'nav.dataCenter', href: '/data-hub' },
      { labelKey: 'nav.dataWarehouse', href: '/data-warehouse' },
    ],
  },
  // [5] KẾ HOẠCH & QUYẾT ĐỊNH
  {
    labelKey: 'nav.planSimulation',
    icon: Target,
    children: [
      { labelKey: 'nav.scenario', href: '/scenario' },
      { labelKey: 'nav.rollingForecast', href: '/rolling-forecast' },
      { labelKey: 'nav.executiveSummary', href: '/executive-summary' },
      { labelKey: 'nav.riskDashboard', href: '/risk-dashboard' },
      { labelKey: 'nav.decisionSupport', href: '/decision-support' },
      { labelKey: 'nav.decisionCenter', href: '/decision-center' },
    ],
  },
  // Admin — chỉ hiện khi admin (render logic xử lý riêng)
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
  { labelKey: 'nav.formulas', icon: PenSquare, href: '/formulas' },
  { labelKey: 'nav.documentation', icon: FileText, href: '/documentation' },
  { labelKey: 'nav.userGuide', icon: BookOpen, href: '/user-guide' },
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

      {/* Sidebar - Light Professional */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isOpen ? 280 : 0,
          x: 0 
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'fixed left-0 top-0 h-full z-50 flex flex-col overflow-hidden',
          'bg-card border-r border-border',
          'lg:relative lg:h-full'
        )}
      >
        <div className="w-[280px] h-full flex flex-col">
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">Bluecore</h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Finance Data Platform</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="lg:hidden"
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
                        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5',
                        hasActiveChild(item.children) ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4" />
                        <span>{t(item.labelKey)}</span>
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
                          <div className="ml-6 mt-1 space-y-0.5 border-l border-border/50 pl-3">
                            {item.children.map((child) => (
                              <NavLink
                                key={child.href}
                                to={child.href}
                                end
                                className={({ isActive }) =>
                                  cn(
                                    'block py-2 px-3 rounded-md text-sm transition-colors',
                                    isActive
                                      ? 'bg-primary/15 text-primary font-medium'
                                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
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
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive 
                          ? 'bg-primary/15 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                      )
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                )}
              </div>
            ))}

            {/* Super Admin Menu - only shown for super admins */}
            {isSuperAdmin && superAdminItems.children && (
              <div className="pt-3 mt-3 border-t border-border">
                <div>
                  <button
                    onClick={() => toggleExpand(superAdminItems.labelKey)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                      'bg-destructive/10 hover:bg-destructive/15',
                      hasActiveChild(superAdminItems.children) ? 'text-destructive font-medium' : 'text-destructive/80'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <superAdminItems.icon className="w-4 h-4 text-destructive/80" />
                      <span>{t(superAdminItems.labelKey)}</span>
                    </div>
                    {expandedItems.includes(superAdminItems.labelKey) ? (
                      <ChevronDown className="w-4 h-4 text-destructive/80" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-destructive/80" />
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
                        <div className="ml-6 mt-1 space-y-0.5 border-l border-destructive/20 pl-3">
                          {superAdminItems.children.map((child) => (
                            <NavLink
                              key={child.href}
                              to={child.href}
                              className={({ isActive }) =>
                                cn(
                                  'block py-2 px-3 rounded-md text-sm transition-colors',
                                  isActive
                                    ? 'bg-destructive/15 text-destructive font-medium'
                                    : 'text-destructive/70 hover:text-destructive hover:bg-destructive/10'
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
        <div className="px-3 py-4 border-t border-border space-y-1">
          {/* Back to Portal Button */}
          <NavLink
            to="/portal"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-2',
                'bg-primary/15 hover:bg-primary/20',
                isActive ? 'text-primary font-medium' : 'text-primary'
              )
            }
          >
            <Home className="w-4 h-4" />
            <span className="font-medium">{t('nav.backToPortal')}</span>
          </NavLink>
          {bottomNavItems.map((item) => (
            item.children ? (
              <div key={item.labelKey}>
                <button
                  onClick={() => toggleExpand(item.labelKey)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5',
                    hasActiveChild(item.children) ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{t(item.labelKey)}</span>
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
                      <div className="ml-6 mt-1 space-y-0.5 border-l border-border/50 pl-3">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.href}
                            to={child.href}
                            end
                            className={({ isActive }) =>
                              cn(
                                'block py-2 px-3 rounded-md text-sm transition-colors',
                                isActive
                                  ? 'bg-primary/15 text-primary font-medium'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
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
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive 
                      ? 'bg-primary/15 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            )
          ))}
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('common.logout')}</span>
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
