import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminDashboard() {
  const { t } = useLanguage();
  
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

  const statsCards = [
    {
      title: t('admin.totalTenants'),
      value: stats?.totalTenants || 0,
      description: t('admin.totalTenantsDesc'),
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: t('admin.activeTenants'),
      value: stats?.activeTenants || 0,
      description: t('admin.activeTenantsDesc'),
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: t('admin.totalUsers'),
      value: stats?.totalUsers || 0,
      description: t('admin.totalUsersDesc'),
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: t('admin.alerts'),
      value: 0,
      description: t('admin.alertsDesc'),
      icon: AlertCircle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Super Admin Dashboard | Bluecore</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('admin.dashboard.subtitle')}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : stat.value.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.recentActivity')}</CardTitle>
            <CardDescription>{t('admin.recentActivityDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              {t('admin.noActivity')}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
