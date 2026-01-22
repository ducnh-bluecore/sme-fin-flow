import { useState } from 'react';
import { useLocation, NavLink as RouterNavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  TrendingUp, 
  LayoutGrid, 
  FileCheck, 
  ShieldCheck,
  Settings,
  HelpCircle,
  Home,
  X,
  ChevronRight,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TenantSwitcher } from '@/components/tenant/TenantSwitcher';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

/**
 * CDP LAYOUT - Light Professional Theme
 * 
 * Unified with FDP/MDP design system:
 * - 280px sidebar width
 * - Semantic tokens (bg-card, border-border, etc.)
 * - Light professional aesthetic
 * - Decision-first navigation
 */

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/cdp', icon: LayoutGrid },
  { label: 'Insights', href: '/cdp/insights', icon: TrendingUp },
  { label: 'Populations', href: '/cdp/populations', icon: Users },
  { label: 'Decision Cards', href: '/cdp/decisions', icon: FileCheck },
  { label: 'Data Confidence', href: '/cdp/confidence', icon: ShieldCheck },
];

const bottomNavItems: NavItem[] = [
  { label: 'Settings', href: '/cdp/settings', icon: Settings },
  { label: 'Help', href: '/cdp/help', icon: HelpCircle },
];

interface CDPLayoutProps {
  children: React.ReactNode;
}

export function CDPLayout({ children }: CDPLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const NavItemLink = ({ item, end = false }: { item: NavItem; end?: boolean }) => (
    <RouterNavLink
      to={item.href}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
          isActive 
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )
      }
    >
      <item.icon className="w-4 h-4" />
      <span>{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium bg-destructive/10 text-destructive rounded">
          {item.badge}
        </span>
      )}
    </RouterNavLink>
  );

  const SidebarContent = () => (
    <div className="w-[280px] h-full flex flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Bluecore</h1>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Customer Data Platform</p>
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
      <ScrollArea className="flex-1 px-4 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavItemLink key={item.href} item={item} end={item.href === '/cdp'} />
          ))}
        </nav>
      </ScrollArea>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border space-y-1">
        {bottomNavItems.map((item) => (
          <NavItemLink key={item.href} item={item} />
        ))}
        
        {/* Back to Portal */}
        <RouterNavLink
          to="/portal"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Back to Portal</span>
        </RouterNavLink>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: sidebarOpen ? 280 : 0,
          x: 0 
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'fixed left-0 top-0 h-full z-50 flex flex-col overflow-hidden',
          'bg-card border-r border-border',
          'lg:relative lg:h-full'
        )}
      >
        <SidebarContent />
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 h-14 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between px-6">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden h-8 w-8"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <TenantSwitcher />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
