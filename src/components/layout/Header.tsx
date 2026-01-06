import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAlerts } from '@/hooks/useAlertsData';
import { TenantSwitcher } from '@/components/tenant/TenantSwitcher';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: alerts = [], isLoading } = useAlerts();
  const { t } = useLanguage();
  const unacknowledgedAlerts = alerts.filter((a) => !a.is_read).length;

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Tenant Switcher */}
          <TenantSwitcher />
          
          {/* Search */}
          <div className="hidden md:flex items-center relative">
            <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              className="w-64 lg:w-80 pl-9 bg-muted/50 border-0 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {unacknowledgedAlerts > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium"
                  >
                    {unacknowledgedAlerts}
                  </motion.span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b border-border">
                <h4 className="font-semibold">{t('header.alerts')}</h4>
                <p className="text-xs text-muted-foreground">
                  {unacknowledgedAlerts} {t('header.unreadAlerts')}
                </p>
              </div>
              <div className="max-h-64 overflow-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    {t('common.loading')}
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    {t('header.noAlerts')}
                  </div>
                ) : (
                  alerts.slice(0, 5).map((alert) => (
                    <DropdownMenuItem
                      key={alert.id}
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Badge
                          variant={
                            alert.severity === 'high'
                              ? 'destructive'
                              : alert.severity === 'medium'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-[10px] px-1.5"
                        >
                          {alert.severity === 'high' ? t('header.high') : alert.severity === 'medium' ? t('header.medium') : t('header.low')}
                        </Badge>
                        <span className="text-sm font-medium flex-1 truncate">
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {alert.message}
                      </p>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-border">
                <Button variant="ghost" size="sm" className="w-full">
                  {t('header.viewAllAlerts')}
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
