import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  Settings,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTenantMembers } from '@/hooks/useTenant';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TenantManagementPage() {
  const { t } = useLanguage();
  const { activeTenant, isLoading, currentRole } = useTenantContext();
  const { data: members = [] } = useTenantMembers(activeTenant?.id);
  
  const activeMembers = members.filter(m => m.is_active);

  const menuItems = [
    {
      title: t('tenant.manageMembers'),
      description: t('tenant.manageMembersDesc'),
      icon: Users,
      href: '/tenant/members',
      color: 'text-blue-500',
    },
    {
      title: t('tenant.companySettings'),
      description: t('tenant.companySettingsDesc'),
      icon: Settings,
      href: '/tenant/settings',
      color: 'text-emerald-500',
    },
  ];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return t('tenant.owner');
      case 'admin': return t('tenant.admin');
      case 'member': return t('tenant.member');
      default: return t('tenant.viewer');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!activeTenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t('tenant.noCompany')}</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('tenant.title')} | {activeTenant.name}</title>
        <meta name="description" content={t('tenant.metaDesc')} />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Company Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={activeTenant.logo_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {activeTenant.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{activeTenant.name}</h1>
                  <Badge variant="secondary" className="capitalize">
                    {activeTenant.plan || 'free'}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {activeMembers.length} {t('tenant.members')} · {t('tenant.yourRole')}: {getRoleLabel(currentRole || '')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <div className="grid gap-4 md:grid-cols-2">
          {menuItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('tenant.members')}</CardDescription>
              <CardTitle className="text-3xl">{activeMembers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('tenant.plan')}</CardDescription>
              <CardTitle className="text-3xl capitalize">{activeTenant.plan || 'Free'}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('tenant.status')}</CardDescription>
              <CardTitle className="text-3xl">
                {activeTenant.is_active ? (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                    {t('tenant.active')}
                  </Badge>
                ) : (
                  <Badge variant="destructive">{t('tenant.paused')}</Badge>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </motion.div>
    </>
  );
}
