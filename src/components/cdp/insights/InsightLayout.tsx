import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  List, 
  BookOpen,
  AlertCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface InsightLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

const subNavItems = [
  { 
    label: 'Hành vi Khách hàng', 
    href: '/cdp/insights', 
    icon: List,
    description: 'Các thay đổi hành vi được phát hiện'
  },
  { 
    label: 'Nhu cầu & Sản phẩm', 
    href: '/cdp/insights/demand', 
    icon: List,
    description: 'Dịch chuyển nhu cầu và cấu trúc chi tiêu'
  },
  { 
    label: 'Danh mục Insight', 
    href: '/cdp/insight-registry', 
    icon: BookOpen,
    description: 'Quản trị hệ thống insight'
  },
];

export function InsightLayout({ children, title = 'Insight', description }: InsightLayoutProps) {
  const location = useLocation();
  
  // Check if we're on detail page (insight detail view, not list pages)
  // List pages: /cdp/insights, /cdp/insights/demand, /cdp/insight-registry
  const listPaths = ['/cdp/insights', '/cdp/insights/demand', '/cdp/insight-registry'];
  const isDetailPage = !listPaths.includes(location.pathname);
  
  return (
    <CDPLayout>
      <Helmet>
        <title>{title} | CDP - Bluecore</title>
        <meta name="description" content={description || 'Các tín hiệu dịch chuyển hành vi khách hàng'} />
      </Helmet>

      <div className="space-y-6">
        {/* Context Banner - Only show on list pages */}
        {!isDetailPage && (
          <div className="bg-muted/50 border border-border rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-primary/10 rounded">
                  <AlertCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Insight cấp tập khách hàng – không có hành động marketing</p>
                  <p className="text-xs text-muted-foreground">
                    Chỉ dẫn tới quyết định điều hành • Không trigger • Không export
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Phân tích: 30 ngày</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Cập nhật: 1 giờ trước</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sub Navigation - Only show on list/registry pages */}
        {!isDetailPage && (
          <div className="border-b border-border">
            <nav className="flex gap-1">
              {subNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.href === '/cdp/insights'}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                      isActive
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
        )}

        {/* Page Content */}
        <div className="max-w-6xl">
          {children}
        </div>
      </div>
    </CDPLayout>
  );
}
