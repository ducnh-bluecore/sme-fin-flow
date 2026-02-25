import { useState, useEffect, Suspense, useMemo } from 'react';
import { Outlet, useLocation, useNavigate, NavLink as RouterNavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Home,
  LogOut,
  Menu,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TenantSwitcher } from '@/components/tenant/TenantSwitcher';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { ActivityTrackerProvider } from '@/components/providers/ActivityTrackerProvider';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ───
export interface AppShellNavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  badge?: number;
  children?: { id: string; label: string; href: string }[];
}

export interface AppShellNavSection {
  id: string;
  label: string; // Uppercase section label like "MAIN", "MANAGEMENT"
  items: AppShellNavItem[];
}

export interface AppShellConfig {
  logo: {
    icon: React.ElementType;
    iconClassName?: string;
    title: string;
    subtitle: string;
  };
  sections: AppShellNavSection[];
  bottomItems?: AppShellNavItem[];
  headerActions?: React.ReactNode;
  showSearch?: boolean;
  showBackToPortal?: boolean;
  showLogout?: boolean;
  portalPath?: string;
  /** Special badge (e.g. "SUPER ADMIN") shown below logo */
  specialBadge?: {
    label: string;
    icon?: React.ElementType;
    className?: string;
  };
  /** Use Outlet or children */
  useOutlet?: boolean;
}

interface AppShellProps {
  config: AppShellConfig;
  children?: React.ReactNode;
}

// ─── Loading Skeleton ───
function PageSkeleton() {
  return (
    <div className="space-y-6 p-2 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 rounded-xl border bg-card">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───
export function AppShell({ config, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // Auto-expand section containing active route
  useEffect(() => {
    for (const section of config.sections) {
      for (const item of section.items) {
        if (item.children?.some(c => location.pathname === c.href || location.pathname.startsWith(c.href + '/'))) {
          setExpandedItems(prev => prev.includes(item.id) ? prev : [...prev, item.id]);
        }
      }
    }
  }, [location.pathname, config.sections]);

  // Close mobile on navigate
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const hasActiveChild = (children?: { href: string }[]) =>
    children?.some(c => isActive(c.href));

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const Logo = config.logo;

  // ─── Nav Item Renderer ───
  const NavItem = ({ item, depth = 0 }: { item: AppShellNavItem; depth?: number }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const active = item.href ? isActive(item.href) : hasActiveChild(item.children);

    if (collapsed && !hasChildren) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <RouterNavLink
              to={item.href!}
              className={cn(
                'sidebar-nav-item justify-center',
                active && 'sidebar-nav-item-active'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
            </RouterNavLink>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
            {item.badge !== undefined && item.badge > 0 && ` (${item.badge})`}
          </TooltipContent>
        </Tooltip>
      );
    }

    if (hasChildren) {
      if (collapsed) {
        return (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => { setCollapsed(false); toggleExpand(item.id); }}
                className={cn(
                  'sidebar-nav-item justify-center',
                  active && 'text-primary'
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      }

      return (
        <div>
          <button
            onClick={() => toggleExpand(item.id)}
            className={cn(
              'sidebar-nav-item',
              active ? 'text-foreground font-medium' : ''
            )}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left truncate">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="sidebar-badge">{item.badge}</span>
            )}
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-6 mt-0.5 space-y-0.5 border-l border-border/40 pl-3">
                  {item.children!.map(child => (
                    <RouterNavLink
                      key={child.href}
                      to={child.href}
                      end
                      className={({ isActive: a }) =>
                        cn(
                          'block py-2 px-3 rounded-md text-sm transition-colors',
                          a
                            ? 'bg-primary/15 text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        )
                      }
                    >
                      {child.label}
                    </RouterNavLink>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    // Simple nav link
    return (
      <RouterNavLink
        to={item.href!}
        end={item.href === location.pathname}
        className={({ isActive: a }) =>
          cn(
            'sidebar-nav-item',
            (a || active) && 'sidebar-nav-item-active'
          )
        }
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left truncate">{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <span className="sidebar-badge">{item.badge}</span>
        )}
      </RouterNavLink>
    );
  };

  // ─── Sidebar Content ───
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={cn('flex flex-col h-full', isMobile ? 'w-full' : collapsed ? 'w-[72px]' : 'w-[280px]')}>
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 border-b border-border flex-shrink-0',
        collapsed ? 'justify-center px-2' : 'px-5 gap-3'
      )}>
        <div className={cn(
          'flex-shrink-0 rounded-xl flex items-center justify-center',
          collapsed ? 'w-9 h-9' : 'w-9 h-9',
          Logo.iconClassName || 'bg-primary/10'
        )}>
          <Logo.icon className={cn('h-5 w-5', Logo.iconClassName?.includes('text-') ? '' : 'text-primary')} />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">{Logo.title}</h1>
            <p className="text-[10px] text-muted-foreground truncate -mt-0.5">{Logo.subtitle}</p>
          </div>
        )}
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="flex-shrink-0 ml-auto">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Special Badge */}
      {config.specialBadge && (
        <div className={cn('border-b border-border', collapsed ? 'px-2 py-3' : 'px-4 py-3')}>
          <div className={cn(
            'flex items-center gap-2 rounded-lg',
            config.specialBadge.className || 'bg-destructive/15 border border-destructive/25',
            collapsed ? 'p-2 justify-center' : 'px-3 py-2'
          )}>
            {config.specialBadge.icon && <config.specialBadge.icon className="h-4 w-4 flex-shrink-0 text-destructive" />}
            {!collapsed && (
              <span className="text-xs font-semibold text-destructive">{config.specialBadge.label}</span>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      {config.showSearch && !collapsed && (
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-muted/50 border-border"
            />
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <ScrollArea className="flex-1 px-3 py-3">
        <TooltipProvider delayDuration={0}>
          <nav className="space-y-4">
            {config.sections.map(section => (
              <div key={section.id}>
                {/* Section Label - Aniq UI style */}
                {!collapsed && (
                  <div className="sidebar-section-label">
                    {section.label}
                  </div>
                )}
                {collapsed && <Separator className="my-2" />}
                <div className="space-y-0.5">
                  {section.items.map(item => (
                    <NavItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </TooltipProvider>
      </ScrollArea>

      {/* Bottom Section */}
      <div className="border-t border-border px-3 py-3 space-y-0.5 flex-shrink-0">
        {config.bottomItems?.map(item => (
          <NavItem key={item.id} item={item} />
        ))}

        {config.showBackToPortal !== false && (
          <TooltipProvider delayDuration={0}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(config.portalPath || '/portal')}
                    className="sidebar-nav-item justify-center text-primary"
                  >
                    <Home className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Về Portal</TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={() => navigate(config.portalPath || '/portal')}
                className="sidebar-nav-item bg-primary/10 text-primary hover:bg-primary/15"
              >
                <Home className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left text-sm font-medium">Về Portal</span>
              </button>
            )}
          </TooltipProvider>
        )}

        {config.showLogout && (
          <TooltipProvider delayDuration={0}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={handleSignOut} className="sidebar-nav-item justify-center text-destructive">
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Đăng xuất</TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={handleSignOut}
                className="sidebar-nav-item text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left text-sm">Đăng xuất</span>
              </button>
            )}
          </TooltipProvider>
        )}
      </div>
    </div>
  );

  return (
    <ActivityTrackerProvider>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        {/* Mobile Overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-card z-50 shadow-2xl lg:hidden overflow-hidden"
            >
              <SidebarContent isMobile />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        <motion.aside
          animate={{ width: collapsed ? 72 : 280 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="hidden lg:flex flex-col bg-card border-r border-border flex-shrink-0 relative overflow-hidden"
        >
          <SidebarContent />

          {/* Collapse Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-background border shadow-sm z-10"
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </Button>
        </motion.aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-20 h-14 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Mobile menu */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden h-9 w-9"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <TenantSwitcher />
            </div>
            <div className="flex items-center gap-2">
              {config.headerActions}
              <LanguageSwitcher />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-4 lg:p-6 custom-scrollbar">
            <Suspense fallback={<PageSkeleton />}>
              {config.useOutlet !== false ? <Outlet /> : children}
            </Suspense>
          </main>
        </div>
      </div>
    </ActivityTrackerProvider>
  );
}
