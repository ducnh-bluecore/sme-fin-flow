import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Layers, 
  GitCompare, 
  ListTodo, 
  Target, 
  Settings, 
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppShell, type AppShellNavSection } from './AppShell';
import { useTenantContext } from '@/contexts/TenantContext';
import { useActiveAlertsCount } from '@/hooks/useNotificationCenter';

export function ControlTowerLayout() {
  const { activeTenant } = useTenantContext();
  const { data: activeAlertsCount = 0 } = useActiveAlertsCount();
  const navigate = useNavigate();

  const sections: AppShellNavSection[] = useMemo(() => [
    {
      id: 'command',
      label: 'COMMAND',
      items: [
        { id: 'command', label: 'Command', icon: Activity, href: '/control-tower/command', badge: activeAlertsCount || undefined },
        { id: 'signals', label: 'Signals', icon: Layers, href: '/control-tower/signals' },
      ],
    },
    {
      id: 'monitoring',
      label: 'MONITORING',
      items: [
        { id: 'variance', label: 'Variance', icon: GitCompare, href: '/control-tower/variance' },
        { id: 'queue', label: 'Queue', icon: ListTodo, href: '/control-tower/queue' },
        { id: 'outcomes', label: 'Outcomes', icon: Target, href: '/control-tower/outcomes' },
      ],
    },
    {
      id: 'system',
      label: 'SYSTEM',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings, href: '/control-tower/settings' },
      ],
    },
  ], [activeAlertsCount]);

  const headerActions = useMemo(() => (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative" 
      onClick={() => navigate('/control-tower/command')}
    >
      <Bell className="h-5 w-5" />
      {activeAlertsCount > 0 && (
        <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
      )}
    </Button>
  ), [activeAlertsCount, navigate]);

  return (
    <AppShell
      config={{
        logo: {
          icon: Activity,
          iconClassName: 'bg-primary/10 text-primary',
          title: 'Control Tower',
          subtitle: activeTenant?.name || 'Operations',
        },
        sections,
        headerActions,
        showSearch: true,
        useOutlet: true,
      }}
    />
  );
}
