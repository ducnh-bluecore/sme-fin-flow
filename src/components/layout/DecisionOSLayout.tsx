import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutGrid, ListTodo, History, Target, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { 
    label: 'Decision Board', 
    path: '/decision-os/board', 
    icon: LayoutGrid,
    description: 'CEO Mode'
  },
  { 
    label: 'Execution Queue', 
    path: '/decision-os/queue', 
    icon: ListTodo,
    description: 'COO Mode'
  },
  { 
    label: 'History', 
    path: '/decision-os/history', 
    icon: History,
    description: 'Past Decisions'
  },
  { 
    label: 'Outcomes', 
    path: '/decision-os/outcomes', 
    icon: Target,
    description: 'Impact Verification'
  },
];

export function DecisionOSLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="text-muted-foreground hover:text-foreground"
              >
                <NavLink to="/portal">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Portal
                </NavLink>
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-lg font-semibold text-foreground tracking-tight">
                  Decision OS
                </h1>
                <p className="text-xs text-muted-foreground">
                  Decision &gt; Metric &gt; Data
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-5xl mx-auto px-6">
          <nav className="flex gap-1 -mb-px">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path === '/decision-os/board' && location.pathname.startsWith('/decision-os/review'));
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-4">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs text-muted-foreground text-center">
            BlueCore Decision OS helps executives act on what matters — not analyze what already happened.
          </p>
        </div>
      </footer>
    </div>
  );
}
