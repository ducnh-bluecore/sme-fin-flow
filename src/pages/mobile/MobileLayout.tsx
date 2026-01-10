import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Bell, 
  AlertTriangle, 
  CheckSquare,
  User,
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useTenantContext } from '@/contexts/TenantContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Trang chủ', icon: Home, path: '/mobile' },
  { id: 'alerts', label: 'Cảnh báo', icon: AlertTriangle, path: '/mobile/alerts', badge: 3 },
  { id: 'notifications', label: 'Thông báo', icon: Bell, path: '/mobile/notifications', badge: 5 },
  { id: 'tasks', label: 'Công việc', icon: CheckSquare, path: '/mobile/tasks', badge: 12 },
];

export default function MobileLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { activeTenant } = useTenantContext();

  const isActive = (path: string) => {
    if (path === '/mobile') return location.pathname === '/mobile';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#13151C]/95 backdrop-blur-xl border-b border-slate-800/50 safe-area-top">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-bold">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-xs text-slate-400">Xin chào 👋</p>
                <p className="text-sm font-medium text-slate-100 line-clamp-1">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
              </div>
            </motion.button>
          </div>

          <div className="flex items-center gap-2">
            {activeTenant && (
              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs">
                {activeTenant.name}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-black/60"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-[#13151C] border-r border-slate-800/50"
            >
              <div className="flex flex-col h-full safe-area-top safe-area-bottom">
                {/* Profile */}
                <div className="p-4 border-b border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-lg font-bold">
                        {user?.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">
                        {user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    </div>
                  </div>
                  {activeTenant && (
                    <div className="mt-3 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <p className="text-xs text-slate-500">Workspace</p>
                      <p className="text-sm font-medium text-slate-200">{activeTenant.name}</p>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <ScrollArea className="flex-1 p-3">
                  <nav className="space-y-1">
                    {navItems.map((item) => (
                      <motion.button
                        key={item.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleNavClick(item.path)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                          isActive(item.path)
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                        )}
                      >
                        <item.icon className={cn('h-5 w-5', isActive(item.path) && 'text-amber-400')} />
                        <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <Badge className={cn(
                            'h-5 min-w-5 text-xs font-semibold',
                            isActive(item.path)
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-700 text-slate-300'
                          )}>
                            {item.badge > 99 ? '99+' : item.badge}
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      </motion.button>
                    ))}
                  </nav>
                </ScrollArea>

                {/* Bottom Actions */}
                <div className="p-3 border-t border-slate-800/50 space-y-1">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavClick('/mobile/settings')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50"
                  >
                    <Settings className="h-5 w-5" />
                    <span className="text-sm font-medium">Cài đặt</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="text-sm font-medium">Đăng xuất</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content */}
      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#13151C]/95 backdrop-blur-xl border-t border-slate-800/50 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative',
                  active ? 'text-amber-400' : 'text-slate-500'
                )}
              >
                <div className="relative">
                  <item.icon className={cn('h-5 w-5', active && 'stroke-[2.5px]')} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold border-2 border-[#13151C]">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="mobileNavIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber-400 rounded-full"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
