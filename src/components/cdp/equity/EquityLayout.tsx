import { ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Info, Calendar, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface EquityLayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: 'Tổng quan', href: '/cdp/equity', end: true },
  { label: 'Mô hình Giả định', href: '/cdp/equity/model' },
  { label: 'Động lực Ảnh hưởng', href: '/cdp/equity/drivers' },
];

export function EquityLayout({ children }: EquityLayoutProps) {
  const location = useLocation();
  const [timeframe, setTimeframe] = useState<'12' | '24'>('12');
  const [model, setModel] = useState<'base' | 'conservative' | 'optimistic'>('base');

  const modelLabels = {
    base: 'Cơ sở',
    conservative: 'Thận trọng',
    optimistic: 'Lạc quan'
  };

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
                  Phân tích Giá trị Tài sản Khách hàng
                </p>
                <p className="text-xs text-muted-foreground">
                  Giá trị kỳ vọng dựa trên mô hình LTV • Không dùng để hành động marketing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Select value={timeframe} onValueChange={(v) => setTimeframe(v as '12' | '24')}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 tháng</SelectItem>
                    <SelectItem value="24">24 tháng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <Select value={model} onValueChange={(v) => setModel(v as typeof model)}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Cơ sở</SelectItem>
                    <SelectItem value="conservative">Thận trọng</SelectItem>
                    <SelectItem value="optimistic">Lạc quan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="text-xs">
                Cập nhật: 20/01/2026
              </Badge>
            </div>
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
