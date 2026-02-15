import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Layers3,
  ListChecks,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, path: '/command/overview' },
  { id: 'allocation', label: 'Phân bổ', icon: ArrowRightLeft, path: '/command/allocation' },
  { id: 'assortment', label: 'Cơ cấu', icon: Layers3, path: '/command/assortment' },
  { id: 'decisions', label: 'Quyết định', icon: ListChecks, path: '/command/decisions' },
  { id: 'more', label: 'Thêm', icon: Menu, path: '' },
];

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (!path) return false;
    if (path === '/command/overview') {
      return location.pathname === '/command/overview' || location.pathname === '/command';
    }
    return location.pathname.startsWith(path);
  };

  const handleClick = (item: NavItem) => {
    if (item.id === 'more') {
      onMoreClick();
    } else {
      navigate(item.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Safe area padding for iOS */}
      <div className="bg-card/95 backdrop-blur-xl border-t border-border pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleClick(item)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative',
                  'transition-colors duration-200',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className="relative">
                  <item.icon className={cn('h-5 w-5', active && 'stroke-[2.5px]')} />
                  {item.badge && item.badge > 0 && (
                    <Badge
                      className={cn(
                        'absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 text-[10px] font-bold',
                        'bg-destructive text-destructive-foreground border-2 border-card'
                      )}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </div>
                <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
