import { useState } from 'react';
import { Bell, Search, Menu, AlertTriangle, CheckCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useActiveAlertsCount } from '@/hooks/useNotificationCenter';
import { TenantSwitcher } from '@/components/tenant/TenantSwitcher';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { data, isLoading } = useActiveAlertsCount();
  const activeCount = data?.total || 0;
  const criticalCount = data?.critical || 0;
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <header className="h-14 border-b border-border bg-card sticky top-0 z-30">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Back to Portal */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="hidden md:flex gap-2 text-muted-foreground hover:text-foreground"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm">Portal</span>
          </Button>

          {/* Tenant Switcher */}
          <TenantSwitcher />
          
          {/* Search */}
          <div className="hidden md:flex items-center relative">
            <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              className="w-64 lg:w-72 pl-9 h-9 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {activeCount > 0 && (
                  <span
                    className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center font-medium px-1 ${
                      criticalCount > 0 
                        ? 'bg-destructive text-destructive-foreground' 
                        : 'bg-warning text-warning-foreground'
                    }`}
                  >
                    {activeCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b border-border">
                <h4 className="font-semibold flex items-center gap-2">
                  {t('header.alerts')}
                  {criticalCount > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {criticalCount} critical
                    </Badge>
                  )}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {activeCount} {t('header.unreadAlerts')}
                </p>
              </div>
              <div className="p-4">
                {isLoading ? (
                  <div className="text-center text-muted-foreground text-sm">
                    {t('common.loading')}
                  </div>
                ) : activeCount === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle className="w-10 h-10 text-success/50 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{t('header.noAlerts')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {criticalCount > 0 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <span className="text-sm text-destructive font-medium">
                          {criticalCount} critical alerts require action
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {activeCount} alerts pending review
                    </p>
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-border">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate('/control-tower/alerts')}
                >
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
