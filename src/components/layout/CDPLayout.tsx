import { useMemo } from 'react';
import { 
  Users, 
  LayoutGrid, 
  FileCheck, 
  ShieldCheck,
  Settings,
  HelpCircle,
  Compass,
  Wallet,
  Layers,
  MessageCircle,
  TrendingUp,
} from 'lucide-react';
import { AppShell, type AppShellNavSection } from './AppShell';

interface CDPLayoutProps {
  children: React.ReactNode;
}

export function CDPLayout({ children }: CDPLayoutProps) {
  const sections: AppShellNavSection[] = useMemo(() => [
    {
      id: 'analysis',
      label: 'PHÂN TÍCH',
      items: [
        { id: 'overview', label: 'Tổng quan', icon: LayoutGrid, href: '/cdp' },
        { id: 'qa', label: 'Hỏi về KH', icon: MessageCircle, href: '/cdp/qa' },
        { id: 'explore', label: 'Khám phá', icon: Compass, href: '/cdp/explore' },
        { id: 'insights', label: 'Insight', icon: TrendingUp, href: '/cdp/insights' },
      ],
    },
    {
      id: 'management',
      label: 'QUẢN TRỊ',
      items: [
        { id: 'ltv', label: 'Giá trị Khách hàng', icon: Wallet, href: '/cdp/ltv-engine' },
        { id: 'forecast', label: 'Dự báo Sản phẩm', icon: TrendingUp, href: '/cdp/product-forecast' },
        { id: 'populations', label: 'Tập khách hàng', icon: Layers, href: '/cdp/populations' },
        { id: 'decisions', label: 'Thẻ Quyết định', icon: FileCheck, href: '/cdp/decisions' },
        { id: 'confidence', label: 'Độ tin cậy Dữ liệu', icon: ShieldCheck, href: '/cdp/confidence' },
      ],
    },
  ], []);

  const bottomItems = useMemo(() => [
    { id: 'settings', label: 'Cài đặt', icon: Settings, href: '/cdp/settings' },
    { id: 'help', label: 'Trợ giúp', icon: HelpCircle, href: '/cdp/help' },
  ], []);

  return (
    <AppShell
      config={{
        logo: {
          icon: Users,
          iconClassName: 'bg-primary/10 text-primary',
          title: 'Bluecore',
          subtitle: 'Nền tảng Dữ liệu Khách hàng',
        },
        sections,
        bottomItems,
        showSearch: true,
        useOutlet: false,
      }}
    >
      {children}
    </AppShell>
  );
}
