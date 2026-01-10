import { motion } from 'framer-motion';
import { Bell, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  onNotificationClick?: () => void;
  onSearchClick?: () => void;
  onProfileClick?: () => void;
  notificationCount?: number;
}

export function MobileHeader({
  title,
  showSearch = true,
  showNotifications = true,
  onNotificationClick,
  onSearchClick,
  onProfileClick,
  notificationCount = 0,
}: MobileHeaderProps) {
  const { activeTenant } = useTenantContext();
  const { user } = useAuth();

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border lg:hidden">
      {/* Safe area padding for iOS */}
      <div className="pt-safe">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left: Avatar & Greeting */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onProfileClick}
            className="flex items-center gap-3"
          >
            <Avatar className="h-9 w-9 border-2 border-primary/20">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Xin chào,</p>
              <p className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                {displayName}
              </p>
            </div>
          </motion.button>

          {/* Center: Title or Tenant */}
          {title ? (
            <h1 className="text-base font-semibold text-foreground absolute left-1/2 -translate-x-1/2">
              {title}
            </h1>
          ) : (
            <div className="absolute left-1/2 -translate-x-1/2 text-center">
              <p className="text-xs text-muted-foreground">{activeTenant?.name || 'Workspace'}</p>
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            {showSearch && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSearchClick}
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
            {showNotifications && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNotificationClick}
                className="h-9 w-9 text-muted-foreground hover:text-foreground relative"
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      'absolute -top-0.5 -right-0.5 flex items-center justify-center',
                      'h-4 min-w-4 px-1 text-[10px] font-bold rounded-full',
                      'bg-destructive text-destructive-foreground'
                    )}
                  >
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </motion.span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
