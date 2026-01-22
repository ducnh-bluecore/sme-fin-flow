import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DecisionLayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: 'Danh sách Thẻ', href: '/cdp/decisions', end: true },
];

export function DecisionLayout({ children }: DecisionLayoutProps) {
  return (
    <div className="space-y-4">
      {/* Context Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">
                  Quản trị Quyết định Điều hành
                </p>
                <p className="text-xs text-muted-foreground">
                  Mỗi thẻ = một vấn đề cần xem xét • Không có hành động marketing • Chỉ ghi nhận quyết định
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              CDP Governance Layer
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Sub-navigation */}
      <div className="flex items-center gap-1 border-b">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* Page Content */}
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}
