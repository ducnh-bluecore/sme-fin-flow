import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Bell, 
  Settings,
  LogOut,
  User,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useTenantContext } from '@/contexts/TenantContext';
import { useNotificationCenter } from '@/hooks/useNotificationCenter';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Trang chủ', icon: Home, path: '/mobile' },
  { id: 'alerts', label: 'Cảnh báo', icon: Bell, path: '/mobile/alerts' },
  { id: 'settings', label: 'Cài đặt', icon: Settings, path: '/mobile/settings' },
];

export default function MobileLayout() {
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { activeTenant } = useTenantContext();
  const { stats } = useNotificationCenter();

  const isActive = (path: string) => {
    if (path === '/mobile') return location.pathname === '/mobile';
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const totalActiveAlerts = stats.active || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border safe-area-top">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Bell className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Alerts</p>
                {activeTenant && (
                  <p className="text-[10px] text-muted-foreground">{activeTenant.name}</p>
                )}
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setProfileOpen(true)}
            className="relative"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </motion.button>
        </div>
      </header>

      {/* Profile Modal */}
      <AnimatePresence>
        {profileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileOpen(false)}
              className="fixed inset-0 z-50 bg-black/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-4 right-4 left-4 z-50 bg-card border border-border rounded-2xl p-4 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Tài khoản</h3>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setProfileOpen(false)}
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </motion.button>
              </div>
              
              <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-xl">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Đăng xuất</span>
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content */}
      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation - Simpler */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-6">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const showBadge = item.id === 'alerts' && totalActiveAlerts > 0;
            
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 relative px-4 py-2 rounded-xl transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className="relative">
                  <item.icon className={cn('h-6 w-6', active && 'stroke-[2.5px]')} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-2 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                      {totalActiveAlerts > 9 ? '9+' : totalActiveAlerts}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
