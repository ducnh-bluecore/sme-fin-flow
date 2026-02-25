import { useMemo } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  TrendingUp,
  Shield,
  Bell,
} from 'lucide-react';
import { AppShell, type AppShellNavSection } from './AppShell';

export function AdminLayout() {
  const sections: AppShellNavSection[] = useMemo(() => [
    {
      id: 'management',
      label: 'MANAGEMENT',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
        { id: 'cs-alerts', label: 'CS Alerts', icon: Bell, href: '/admin/cs-alerts' },
        { id: 'tenants', label: 'Quản lý Tenants', icon: Building2, href: '/admin/tenants' },
        { id: 'users', label: 'Quản lý Users', icon: Users, href: '/admin/users' },
        { id: 'plans', label: 'Gói dịch vụ', icon: TrendingUp, href: '/admin/plans' },
        { id: 'modules', label: 'Sản phẩm/Modules', icon: Shield, href: '/admin/modules' },
      ],
    },
    {
      id: 'system',
      label: 'SYSTEM',
      items: [
        { id: 'settings', label: 'Cấu hình hệ thống', icon: Settings, href: '/admin/settings' },
      ],
    },
  ], []);

  return (
    <AppShell
      config={{
        logo: {
          icon: TrendingUp,
          iconClassName: 'bg-destructive/10 text-destructive',
          title: 'Bluecore',
          subtitle: 'Finance Data Platform',
        },
        sections,
        specialBadge: {
          label: 'Super Admin Panel',
          icon: Shield,
        },
        showLogout: true,
        showSearch: false,
        portalPath: '/',
        useOutlet: true,
      }}
    />
  );
}
