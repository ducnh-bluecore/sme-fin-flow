import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { 
  BarChart2, 
  DollarSign,
  AlertCircle,
  TrendingUp,
  Target,
  Wallet,
  Activity,
  PieChart,
  Users,
  Zap,
  Database,
  BookOpen,
  Settings,
  Megaphone,
  Layers,
} from 'lucide-react';
import { AppShell, type AppShellNavSection } from './AppShell';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';

export function MDPLayout() {
  const riskCount = 1;

  const sections: AppShellNavSection[] = useMemo(() => [
    {
      id: 'cmo',
      label: 'CMO MODE',
      items: [
        { id: 'cmo-overview', label: 'Overview', icon: Target, href: '/mdp/ceo' },
        { id: 'profit', label: 'Profit Attribution', icon: DollarSign, href: '/mdp/profit' },
        { id: 'cash-impact', label: 'Cash Impact', icon: Wallet, href: '/mdp/cash-impact' },
        { id: 'risks', label: 'Risks', icon: AlertCircle, href: '/mdp/risks', badge: riskCount },
        { id: 'decisions', label: 'Decision Center', icon: Zap, href: '/mdp/decisions' },
      ],
    },
    {
      id: 'marketing',
      label: 'MARKETING MODE',
      items: [
        { id: 'mkt-overview', label: 'Overview', icon: Activity, href: '/mdp/marketing-mode' },
        { id: 'campaigns', label: 'Campaigns', icon: Megaphone, href: '/mdp/campaigns' },
        { id: 'channels', label: 'Channels', icon: Layers, href: '/mdp/channels' },
        { id: 'funnel', label: 'Funnel', icon: PieChart, href: '/mdp/funnel' },
        { id: 'audience', label: 'Audience', icon: Users, href: '/mdp/audience' },
      ],
    },
    {
      id: 'system',
      label: 'SYSTEM',
      items: [
        { id: 'data-sources', label: 'Data Sources', icon: Database, href: '/mdp/data-sources' },
        { id: 'docs', label: 'Documentation', icon: BookOpen, href: '/mdp/docs' },
        { id: 'settings', label: 'Settings', icon: Settings, href: '/mdp/settings' },
      ],
    },
  ], [riskCount]);

  const headerActions = useMemo(() => <QuickDateSelector />, []);

  return (
    <AppShell
      config={{
        logo: {
          icon: BarChart2,
          iconClassName: 'bg-primary/10 text-primary',
          title: 'Bluecore',
          subtitle: 'Marketing Data Platform',
        },
        sections,
        headerActions,
        showSearch: true,
        useOutlet: true,
      }}
    />
  );
}
