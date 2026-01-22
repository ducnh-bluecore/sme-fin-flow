import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Users, 
  SlidersHorizontal, 
  GitCompare, 
  Bookmark,
  AlertCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ExploreLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

const subNavItems = [
  { 
    label: 'Tập khách nghiên cứu', 
    href: '/cdp/explore', 
    icon: Users,
    description: 'Xem và lọc danh sách khách hàng'
  },
  { 
    label: 'Bộ lọc hành vi', 
    href: '/cdp/explore/filters', 
    icon: SlidersHorizontal,
    description: 'Xây dựng giả thuyết hành vi'
  },
  { 
    label: 'So sánh tập khách', 
    href: '/cdp/explore/compare', 
    icon: GitCompare,
    description: 'So sánh hai nhóm khách hàng'
  },
  { 
    label: 'Góc nhìn đã lưu', 
    href: '/cdp/explore/saved', 
    icon: Bookmark,
    description: 'Quản lý nghiên cứu đã lưu'
  },
];

export function ExploreLayout({ children, title = 'Khám phá', description }: ExploreLayoutProps) {
  const location = useLocation();
  
  return (
    <CDPLayout>
      <Helmet>
        <title>{title} | CDP - Bluecore</title>
        <meta name="description" content={description || 'Chế độ nghiên cứu dữ liệu khách hàng'} />
      </Helmet>

      <div className="space-y-6">
        {/* Research Mode Warning Banner */}
        <div className="bg-muted/50 border border-border rounded-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-primary/10 rounded">
                <AlertCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Chế độ nghiên cứu – không kích hoạt hành động</p>
                <p className="text-xs text-muted-foreground">
                  Dữ liệu chỉ đọc • Không export • Không trigger • Không gán nhiệm vụ
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Phân tích: 90 ngày gần nhất</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Cập nhật: 2 giờ trước</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="border-b border-border">
          <nav className="flex gap-1">
            {subNavItems.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/cdp/explore' && location.pathname.startsWith(item.href));
              const isExactMatch = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === '/cdp/explore'}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                    isExactMatch || (item.href === '/cdp/explore' && location.pathname === '/cdp/explore')
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Page Content */}
        <div className="max-w-7xl">
          {children}
        </div>
      </div>
    </CDPLayout>
  );
}
