import { useState, useEffect, Suspense } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  Menu,
  TrendingUp,
  LogOut,
  ArrowLeft,
  Shield,
  ChevronLeft,
  ChevronRight,
  Bell,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActivityTrackerProvider } from '@/components/providers/ActivityTrackerProvider';

const adminNavItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'CS Alerts', href: '/admin/cs-alerts', icon: Bell },
  { label: 'Quản lý Tenants', href: '/admin/tenants', icon: Building2 },
  { label: 'Quản lý Users', href: '/admin/users', icon: Users },
  { label: 'Gói dịch vụ', href: '/admin/plans', icon: TrendingUp },
  { label: 'Sản phẩm/Modules', href: '/admin/modules', icon: Shield },
  { label: 'Cấu hình hệ thống', href: '/admin/settings', icon: Settings },
];

export function AdminLayout() {
  // On desktop, start open; on mobile, start closed
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const goToTenantArea = () => {
    navigate('/');
  };

  return (
    <ActivityTrackerProvider>
    <div className="min-h-screen flex w-full bg-background">

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Admin Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: sidebarOpen ? 280 : 0,
          x: sidebarOpen ? 0 : -280
        }}
        className={cn(
          'fixed left-0 top-0 h-screen z-50 flex flex-col overflow-hidden',
          'lg:relative lg:!width-auto',
          sidebarOpen ? 'lg:w-[280px]' : 'lg:w-[72px]'
        )}
        style={{
          background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-destructive flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-destructive-foreground" />
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h1 className="text-lg font-bold text-foreground">Bluecore</h1>
                <p className="text-[10px] text-muted-foreground -mt-0.5">Finance Data Platform</p>
              </motion.div>
            )}
          </div>
          {/* Close button on mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Super Admin Badge */}
        <div className={cn("py-3 border-b border-border", sidebarOpen ? "px-4" : "px-2")}>
          <div className={cn(
            "flex items-center gap-2 rounded-lg bg-destructive/20 border border-destructive/30",
            sidebarOpen ? "px-3 py-2" : "p-2 justify-center"
          )}>
            <Shield className="w-4 h-4 text-destructive flex-shrink-0" />
            {sidebarOpen && (
              <span className="text-sm font-medium text-destructive">Super Admin Panel</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="space-y-1">
            {adminNavItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/admin'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg text-sm transition-colors',
                    sidebarOpen ? 'px-3 py-2.5' : 'p-2.5 justify-center',
                    isActive
                      ? 'bg-primary/20 text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )
                }
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom Section */}
        <div className="px-2 py-4 border-t border-border space-y-1">
          <button
            onClick={goToTenantArea}
            className={cn(
              "flex items-center gap-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-colors",
              sidebarOpen ? "px-3 py-2.5" : "p-2.5 justify-center"
            )}
            title={!sidebarOpen ? "Về trang vận hành" : undefined}
          >
            <ArrowLeft className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Về trang vận hành</span>}
          </button>
          <button
            onClick={handleSignOut}
            className={cn(
              "flex items-center gap-3 rounded-lg text-sm text-destructive hover:text-destructive hover:bg-destructive/10 w-full transition-colors",
              sidebarOpen ? "px-3 py-2.5" : "p-2.5 justify-center"
            )}
            title={!sidebarOpen ? "Đăng xuất" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>

        {/* User Profile */}
        <div className={cn("py-3 border-t border-border", sidebarOpen ? "px-4" : "px-2")}>
          <div className={cn("flex items-center", sidebarOpen ? "gap-3" : "justify-center")}>
            <div className="w-9 h-9 rounded-full bg-destructive/30 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-destructive" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-muted"
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5 hidden lg:block" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-md bg-destructive/10 text-destructive text-xs font-medium">
                SUPER ADMIN
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
    </ActivityTrackerProvider>
  );
}
