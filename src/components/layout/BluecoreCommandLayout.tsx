import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Crosshair, 
  LayoutDashboard,
  ArrowRightLeft,
  Layers3,
  Tags,
  Network,
  Factory,
  ListChecks,
  Target,
  Settings,
  Siren,
  Map,
  Bell,
} from 'lucide-react';
import { AppShell, type AppShellNavSection } from './AppShell';
import { useTenantContext } from '@/contexts/TenantContext';

export function BluecoreCommandLayout() {
  const { activeTenant } = useTenantContext();

  const sections: AppShellNavSection[] = useMemo(() => [
    {
      id: 'command-center',
      label: 'COMMAND CENTER',
      items: [
        { id: 'war-room', label: 'War Room', icon: Siren, href: '/command/war-room' },
        { id: 'capital-map', label: 'Capital Map', icon: Map, href: '/command/capital-map' },
        { id: 'overview', label: 'Tổng Quan', icon: LayoutDashboard, href: '/command/overview' },
      ],
    },
    {
      id: 'operations',
      label: 'OPERATIONS',
      items: [
        { id: 'allocation', label: 'Phân Bổ', icon: ArrowRightLeft, href: '/command/allocation' },
        { id: 'assortment', label: 'Cơ Cấu Size', icon: Layers3, href: '/command/assortment' },
        { id: 'clearance', label: 'Thanh Lý', icon: Tags, href: '/command/clearance' },
        { id: 'network-gap', label: 'Nguồn Cung', icon: Network, href: '/command/network-gap' },
        { id: 'production', label: 'Sản Xuất', icon: Factory, href: '/command/production' },
      ],
    },
    {
      id: 'system',
      label: 'SYSTEM',
      items: [
        { id: 'decisions', label: 'Quyết Định', icon: ListChecks, href: '/command/decisions' },
        { id: 'outcomes', label: 'Kết Quả', icon: Target, href: '/command/outcomes' },
        { id: 'settings', label: 'Cài Đặt', icon: Settings, href: '/command/settings' },
      ],
    },
  ], []);

  return (
    <AppShell
      config={{
        logo: {
          icon: Crosshair,
          iconClassName: 'bg-orange-500/10 text-orange-600',
          title: 'Bluecore Command',
          subtitle: activeTenant?.name || 'Inventory Intelligence',
        },
        sections,
        showSearch: true,
        useOutlet: true,
      }}
    />
  );
}
