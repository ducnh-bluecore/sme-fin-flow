import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Search, Menu, AlertTriangle, CheckCircle } from 'lucide-react';
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
                {activeCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium ${
                      criticalCount > 0 
                        ? 'bg-destructive text-destructive-foreground animate-pulse' 
                        : 'bg-warning text-warning-foreground'
                    }`}
                  >
                    {activeCount}
                  </motion.span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b border-border">
                <h4 className="font-semibold flex items-center gap-2">
                  {t('header.alerts')}
                  {criticalCount > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {criticalCount} nghiêm trọng
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
                          {criticalCount} cảnh báo nghiêm trọng cần xử lý
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Có {activeCount} cảnh báo đang chờ xử lý
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
