import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  LayoutDashboard,
  Bell,
  CheckSquare,
  BarChart3,
  Users,
  Settings,
  Home,
  AlertTriangle,
  TrendingUp,
  Package,
  Store,
  MessageSquare,
  Target,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/control-tower' },
  { id: 'notifications', label: 'Thông báo', icon: Bell, path: '/control-tower/notifications', badge: 5 },
  { id: 'kpi-rules', label: 'Rules KPI', icon: Target, path: '/control-tower/kpi-rules' },
  { id: 'tasks', label: 'Công việc', icon: CheckSquare, path: '/control-tower/tasks', badge: 12 },
  { id: 'alerts', label: 'Cảnh báo', icon: AlertTriangle, path: '/control-tower/alerts', badge: 3 },
  { id: 'analytics', label: 'Phân tích', icon: BarChart3, path: '/control-tower/analytics' },
  { id: 'stores', label: 'Cửa hàng', icon: Store, path: '/control-tower/stores' },
  { id: 'inventory', label: 'Tồn kho', icon: Package, path: '/control-tower/inventory' },
  { id: 'performance', label: 'Hiệu suất', icon: TrendingUp, path: '/control-tower/performance' },
  { id: 'team', label: 'Đội ngũ', icon: Users, path: '/control-tower/team' },
  { id: 'chat', label: 'Tin nhắn', icon: MessageSquare, path: '/control-tower/chat', badge: 2 },
];

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { activeTenant } = useTenantContext();

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  const isActive = (path: string) => {
    if (path === '/control-tower') {
      return location.pathname === '/control-tower';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[85%] max-w-sm bg-card z-50 shadow-2xl"
          >
            <div className="flex flex-col h-full pt-safe">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[160px]">{email}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Tenant Info */}
              <div className="px-4 py-3 bg-muted/50">
                <p className="text-xs text-muted-foreground">Workspace</p>
                <p className="text-sm font-medium text-foreground">{activeTenant?.name || 'Default'}</p>
              </div>

              {/* Navigation */}
              <ScrollArea className="flex-1">
                <nav className="p-3 space-y-1">
                  {navItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <motion.button
                        key={item.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleNavClick(item.path)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-muted'
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="flex-1 text-left font-medium">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <Badge
                            className={cn(
                              'h-5 min-w-5 text-xs font-bold',
                              active
                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                : 'bg-destructive text-destructive-foreground'
                            )}
                          >
                            {item.badge}
                          </Badge>
                        )}
                        <ChevronRight className={cn('h-4 w-4 opacity-50', active && 'opacity-100')} />
                      </motion.button>
                    );
                  })}
                </nav>
              </ScrollArea>

              <Separator />

              {/* Bottom Actions */}
              <div className="p-3 space-y-1 pb-safe">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNavClick('/control-tower/settings')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted transition-colors"
                >
                  <Settings className="h-5 w-5" />
                  <span className="flex-1 text-left font-medium">Cài đặt</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNavClick('/portal')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted transition-colors"
                >
                  <Home className="h-5 w-5" />
                  <span className="flex-1 text-left font-medium">Về Portal</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="flex-1 text-left font-medium">Đăng xuất</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
