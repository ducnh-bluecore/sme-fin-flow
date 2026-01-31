import { useState, Suspense } from 'react';
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

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

      {/* Admin Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: sidebarOpen ? 280 : 72,
          x: 0
        }}
        className={cn(
          'fixed left-0 top-0 h-screen z-50 flex flex-col',
          'lg:relative'
        )}
        style={{
          background: 'linear-gradient(180deg, hsl(224 55% 12%) 0%, hsl(224 55% 8%) 100%)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h1 className="text-lg font-bold text-white">Bluecore</h1>
                <p className="text-[10px] text-white/60 -mt-0.5">Finance Data Platform</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Super Admin Badge */}
        <div className={cn("py-3 border-b border-white/10", sidebarOpen ? "px-4" : "px-2")}>
          <div className={cn(
            "flex items-center gap-2 rounded-lg bg-red-500/20 border border-red-500/30",
            sidebarOpen ? "px-3 py-2" : "p-2 justify-center"
          )}>
            <Shield className="w-4 h-4 text-red-300 flex-shrink-0" />
            {sidebarOpen && (
              <span className="text-sm font-medium text-red-200">Super Admin Panel</span>
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
                      ? 'bg-white/20 text-white font-medium'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
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
        <div className="px-2 py-4 border-t border-white/10 space-y-1">
          <button
            onClick={goToTenantArea}
            className={cn(
              "flex items-center gap-3 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 w-full transition-colors",
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
              "flex items-center gap-3 rounded-lg text-sm text-red-300 hover:text-red-200 hover:bg-red-500/20 w-full transition-colors",
              sidebarOpen ? "px-3 py-2.5" : "p-2.5 justify-center"
            )}
            title={!sidebarOpen ? "Đăng xuất" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>

        {/* User Profile */}
        <div className={cn("py-3 border-t border-white/10", sidebarOpen ? "px-4" : "px-2")}>
          <div className={cn("flex items-center", sidebarOpen ? "gap-3" : "justify-center")}>
            <div className="w-9 h-9 rounded-full bg-red-500/30 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-red-200" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="text-xs text-white/60 truncate">{user?.email}</p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-muted"
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-500 text-xs font-medium">
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
