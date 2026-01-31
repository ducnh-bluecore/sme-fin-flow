import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, TrendingUp, Bell, ArrowRight, Activity, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOpenCSAlertsCount } from '@/hooks/useTenantHealth';
import { CSAlertsDashboard } from '@/components/admin/CSAlertsDashboard';
import { PageHeader } from '@/components/shared/PageHeader';
import { useNavigate } from 'react-router-dom';

// Stat Card Component - Clean & Professional
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  bgColor,
  isLoading,
  onClick,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  isLoading?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: onClick ? 1.02 : 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={`cursor-${onClick ? 'pointer' : 'default'} transition-all hover:shadow-md`}
        onClick={onClick}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="text-3xl font-bold tabular-nums">
                {isLoading ? (
                  <div className="h-9 w-20 bg-muted animate-pulse rounded" />
                ) : (
                  value.toLocaleString()
                )}
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className={`p-3 rounded-xl ${bgColor}`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Quick Action Card
function QuickActionCard({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
      <Button
        variant="ghost"
        className="w-full justify-start h-auto py-3 px-4 hover:bg-muted/50"
        onClick={onClick}
      >
        <div className="flex items-center gap-3 w-full">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </Button>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Get total tenants
      const { count: tenantsCount } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true });

      // Get total users (from profiles as we can't query auth.users)
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get active tenants
      const { count: activeTenantsCount } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      return {
        totalTenants: tenantsCount || 0,
        totalUsers: usersCount || 0,
        activeTenants: activeTenantsCount || 0,
      };
    },
  });

  const { data: openAlertsCount } = useOpenCSAlertsCount();

  const statsCards = [
    {
      title: t('admin.totalTenants'),
      value: stats?.totalTenants || 0,
      description: t('admin.totalTenantsDesc'),
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      onClick: () => navigate('/admin/tenants'),
    },
    {
      title: t('admin.activeTenants'),
      value: stats?.activeTenants || 0,
      description: t('admin.activeTenantsDesc'),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      onClick: () => navigate('/admin/tenants'),
    },
    {
      title: t('admin.totalUsers'),
      value: stats?.totalUsers || 0,
      description: t('admin.totalUsersDesc'),
      icon: Users,
      color: 'text-violet-600',
      bgColor: 'bg-violet-100 dark:bg-violet-900/30',
      onClick: () => navigate('/admin/users'),
    },
    {
      title: t('admin.alerts'),
      value: openAlertsCount || 0,
      description: t('admin.alertsDesc'),
      icon: Bell,
      color: openAlertsCount && openAlertsCount > 0 ? 'text-destructive' : 'text-amber-600',
      bgColor: openAlertsCount && openAlertsCount > 0 ? 'bg-destructive/10' : 'bg-amber-100 dark:bg-amber-900/30',
      onClick: () => navigate('/admin/cs-alerts'),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Super Admin Dashboard | Bluecore</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title={t('admin.dashboard.title')}
          subtitle={t('admin.dashboard.subtitle')}
          icon={<Shield className="w-5 h-5" />}
        />

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StatCard
                title={stat.title}
                value={stat.value}
                description={stat.description}
                icon={stat.icon}
                color={stat.color}
                bgColor={stat.bgColor}
                isLoading={isLoading}
                onClick={stat.onClick}
              />
            </motion.div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - CS Alerts Dashboard */}
          <div className="lg:col-span-2">
            <CSAlertsDashboard />
          </div>

          {/* Sidebar - Quick Actions & System Status */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Thao tác nhanh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <QuickActionCard
                  title="Quản lý Tenants"
                  description="Xem và quản lý tất cả tenants"
                  icon={Building2}
                  onClick={() => navigate('/admin/tenants')}
                />
                <QuickActionCard
                  title="Platform Admins"
                  description="Quản lý quyền Super Admin"
                  icon={Users}
                  onClick={() => navigate('/admin/users')}
                />
                <QuickActionCard
                  title="CS Alerts"
                  description="Xem tất cả cảnh báo"
                  icon={Bell}
                  onClick={() => navigate('/admin/cs-alerts')}
                />
              </CardContent>
            </Card>

            {/* Recent Activity Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">{t('admin.recentActivity')}</CardTitle>
                <CardDescription className="text-xs">{t('admin.recentActivityDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground text-center py-8">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  {t('admin.noActivity')}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
