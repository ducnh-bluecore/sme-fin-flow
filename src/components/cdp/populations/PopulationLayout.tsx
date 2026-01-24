import { ReactNode } from 'react';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NavLink, useLocation } from 'react-router-dom';
import { Info, List, FileText, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PopulationLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const subNavItems = [
  { label: 'Danh mục', href: '/cdp/populations', icon: List, end: true },
  { label: 'Quản trị', href: '/cdp/populations/governance', icon: History, end: false },
];

export function PopulationLayout({ children, title, subtitle }: PopulationLayoutProps) {
  const location = useLocation();
  
  return (
    <CDPLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Context Banner */}
        <Card className="border-border bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">
                  Chế độ phân tích — Các tập khách dùng cho phân tích & insight
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tập khách hàng là đơn vị phân tích trong CDP. Tất cả insight đều tham chiếu đến tập khách, 
                  không phải cá nhân. Định nghĩa được version hóa và chỉ đọc để đảm bảo nhất quán.
                </p>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 shrink-0">
                Đã kích hoạt
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Sub Navigation */}
        <div className="flex items-center gap-1 border-b border-border pb-3">
          {subNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.end 
              ? location.pathname === item.href
              : location.pathname.startsWith(item.href);
            
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        {/* Page Header */}
        <div>
          <h1 className="text-xl font-semibold mb-1">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Content */}
        {children}
      </div>
    </CDPLayout>
  );
}
