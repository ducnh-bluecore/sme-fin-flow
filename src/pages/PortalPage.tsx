import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { 
  BarChart3, 
  Database, 
  Users, 
  Megaphone,
  AlertTriangle,
  ArrowRight,
  FileText,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface AppModule {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  status: 'active' | 'coming-soon';
  path?: string;
  metrics?: {
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'neutral';
  }[];
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  path: string;
  badgeCount?: number;
}

// Compact App Module Card for radial layout
function CompactModuleCard({ 
  module, 
  onClick,
}: { 
  module: AppModule; 
  onClick: (module: AppModule) => void; 
}) {
  const isActive = module.status === 'active';
  
  return (
    <Card 
      className={`
        relative overflow-hidden transition-all duration-300 h-full
        ${isActive 
          ? 'cursor-pointer hover:shadow-elevated hover:-translate-y-1' 
          : 'opacity-60 cursor-not-allowed'}
      `}
      style={{
        borderTopWidth: '3px',
        borderTopColor: isActive ? module.color : 'hsl(var(--border))'
      }}
      onClick={() => isActive && onClick(module)}
    >
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <div 
            className="p-2 rounded-lg"
            style={{ 
              backgroundColor: module.bgColor,
              border: `1px solid ${module.borderColor}`
            }}
          >
            <module.icon 
              className="h-5 w-5" 
              style={{ color: module.color }}
            />
          </div>
          <Badge 
            variant={isActive ? "default" : "secondary"}
            className="text-[10px] font-medium"
            style={isActive ? { 
              backgroundColor: module.color,
              color: '#fff'
            } : undefined}
          >
            {isActive ? module.shortName : 'Coming Soon'}
          </Badge>
        </div>
        <div className="mt-2">
          <CardTitle className="text-base font-semibold text-foreground">
            {module.name}
          </CardTitle>
          <CardDescription className="text-[11px] mt-0.5" style={{ color: module.color }}>
            {module.tagline}
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 pb-4">
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {module.description}
        </p>
        
        {isActive && module.metrics && (
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {module.metrics.slice(0, 2).map((metric, i) => (
              <div key={i} className="bg-muted/50 rounded-md px-2 py-1.5">
                <div className="text-[10px] text-muted-foreground">{metric.label}</div>
                <div className="text-xs font-semibold text-foreground">{metric.value}</div>
              </div>
            ))}
          </div>
        )}
        
        {isActive && (
          <div className="flex items-center text-xs font-medium" style={{ color: module.color }}>
            <span>Open {module.shortName}</span>
            <ArrowRight className="h-3 w-3 ml-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Workspace Link Component
function WorkspaceLink({ workspace, onClick }: { workspace: Workspace; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:bg-accent/50 hover:border-accent transition-all duration-200 group text-left"
    >
      <div className="p-2 rounded-md bg-muted">
        <workspace.icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{workspace.name}</div>
        <div className="text-xs text-muted-foreground truncate">{workspace.description}</div>
      </div>
      {workspace.badgeCount !== undefined && workspace.badgeCount > 0 && (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
          {workspace.badgeCount}
        </Badge>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
    </button>
  );
}

export default function PortalPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  // App Modules
  const appModules: AppModule[] = [
    {
      id: 'fdp',
      name: 'Finance Data Platform',
      shortName: 'FDP',
      tagline: 'Truth > Flexibility',
      description: language === 'vi'
        ? 'Nền tảng sự thật tài chính duy nhất. Reconciliation, cash position, unit economics.'
        : 'Single source of financial truth. Reconciliation, cash position, unit economics.',
      icon: BarChart3,
      color: 'hsl(152, 60%, 36%)',
      bgColor: 'hsl(152, 60%, 95%)',
      borderColor: 'hsl(152, 60%, 85%)',
      status: 'active',
      path: '/dashboard',
      metrics: [
        { label: 'Net Cash', value: '₫12.4B' },
        { label: 'Unreconciled', value: '₫320M' },
      ]
    },
    {
      id: 'mdp',
      name: 'Marketing Data Platform',
      shortName: 'MDP',
      tagline: 'Profit before Performance',
      description: language === 'vi'
        ? 'Đo lường giá trị tài chính thật của marketing. CFO tin, CEO quyết.'
        : 'Measure real financial value of marketing. CFO trusts, CEO decides.',
      icon: Megaphone,
      color: 'hsl(270, 55%, 55%)',
      bgColor: 'hsl(270, 55%, 95%)',
      borderColor: 'hsl(270, 55%, 85%)',
      status: 'active',
      path: '/mdp',
      metrics: [
        { label: 'True ROAS', value: '2.4x' },
        { label: 'Cash at Risk', value: '₫890M' },
      ]
    },
    {
      id: 'control-tower',
      name: 'Control Tower',
      shortName: 'OPS',
      tagline: 'Awareness before Analytics',
      description: language === 'vi'
        ? 'Không phải dashboard. Tồn tại để báo động và hành động.'
        : 'Not a dashboard. Exists to alert and act.',
      icon: AlertTriangle,
      color: 'hsl(38, 92%, 50%)',
      bgColor: 'hsl(38, 92%, 95%)',
      borderColor: 'hsl(38, 92%, 80%)',
      status: 'active',
      path: '/control-tower',
      metrics: [
        { label: 'Active Alerts', value: '3' },
        { label: 'At Risk', value: '₫1.2B' },
      ]
    },
    {
      id: 'cdp',
      name: 'Customer Data Platform',
      shortName: 'CDP',
      tagline: 'Customer 360° Intelligence',
      description: language === 'vi'
        ? 'Nền tảng hợp nhất dữ liệu khách hàng. Xây dựng hồ sơ 360°.'
        : 'Unified customer data platform. Build 360° profiles.',
      icon: Users,
      color: 'hsl(210, 80%, 52%)',
      bgColor: 'hsl(210, 80%, 95%)',
      borderColor: 'hsl(210, 80%, 85%)',
      status: 'coming-soon',
      path: '/cdp',
    },
  ];

  // Cross-App Workspaces
  const workspaces: Workspace[] = [
    {
      id: 'review-hub',
      name: 'Review Hub',
      description: 'Product scoping & governance',
      icon: FileText,
      path: '/review-hub',
    },
    {
      id: 'settings',
      name: 'System Settings',
      description: 'Configuration & integrations',
      icon: Settings,
      path: '/settings',
    },
  ];

  const handleModuleClick = (module: AppModule) => {
    if (module.status === 'active' && module.path) {
      navigate(module.path);
    }
  };

  const handleWorkspaceClick = (workspace: Workspace) => {
    navigate(workspace.path);
  };

  const handleDataWarehouseClick = () => {
    window.open('https://admin.bluecore.vn/', '_blank');
  };

  return (
    <>
      <Helmet>
        <title>Bluecore | Finance & Decision Intelligence Platform</title>
        <meta name="description" content="Enterprise-grade Finance & Decision Intelligence Platform for CEOs, CFOs, and COOs" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  Bluecore
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Finance & Decision Intelligence Platform
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Hub and Spoke Layout */}
          <section className="mb-10">
            {/* Central Data Warehouse Hub */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center mb-8"
            >
              <Card 
                className="w-full max-w-md cursor-pointer hover:shadow-elevated transition-all duration-300 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10"
                onClick={handleDataWarehouseClick}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                      <Database className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-1">Data Warehouse</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      {language === 'vi' 
                        ? 'Trung tâm dữ liệu - Single Source of Truth' 
                        : 'Central Data Hub - Single Source of Truth'}
                    </p>
                    <div className="grid grid-cols-3 gap-4 w-full mb-4">
                      <div className="bg-card rounded-lg p-2 border">
                        <div className="text-[10px] text-muted-foreground uppercase">Tables</div>
                        <div className="text-lg font-bold text-foreground">142</div>
                      </div>
                      <div className="bg-card rounded-lg p-2 border">
                        <div className="text-[10px] text-muted-foreground uppercase">Sync</div>
                        <div className="text-lg font-bold text-success">Live</div>
                      </div>
                      <div className="bg-card rounded-lg p-2 border">
                        <div className="text-[10px] text-muted-foreground uppercase">Records</div>
                        <div className="text-lg font-bold text-foreground">2.1M</div>
                      </div>
                    </div>
                    <Button variant="default" size="sm" className="gap-2">
                      <span>Open Data Warehouse</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Connection Lines Visual */}
            <div className="relative">
              {/* Decorative connecting lines - hidden on mobile */}
              <div className="hidden lg:block absolute inset-x-0 -top-4 h-8">
                <svg className="w-full h-full" viewBox="0 0 1000 32" preserveAspectRatio="none">
                  <path 
                    d="M125 32 L125 16 L500 16 L500 0" 
                    stroke="hsl(var(--border))" 
                    strokeWidth="2" 
                    fill="none"
                    strokeDasharray="4 4"
                  />
                  <path 
                    d="M375 32 L375 16 L500 16 L500 0" 
                    stroke="hsl(var(--border))" 
                    strokeWidth="2" 
                    fill="none"
                    strokeDasharray="4 4"
                  />
                  <path 
                    d="M625 32 L625 16 L500 16 L500 0" 
                    stroke="hsl(var(--border))" 
                    strokeWidth="2" 
                    fill="none"
                    strokeDasharray="4 4"
                  />
                  <path 
                    d="M875 32 L875 16 L500 16 L500 0" 
                    stroke="hsl(var(--border))" 
                    strokeWidth="2" 
                    fill="none"
                    strokeDasharray="4 4"
                  />
                </svg>
              </div>

              {/* Application Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {appModules.map((module, index) => (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
                  >
                    <CompactModuleCard 
                      module={module} 
                      onClick={handleModuleClick}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom Section: Workspaces + System Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Workspaces */}
            <section className="lg:col-span-1">
              <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Workspaces</h2>
              <div className="space-y-2">
                {workspaces.map((workspace) => (
                  <WorkspaceLink 
                    key={workspace.id}
                    workspace={workspace}
                    onClick={() => handleWorkspaceClick(workspace)}
                  />
                ))}
              </div>
            </section>

            {/* System Overview */}
            <section className="lg:col-span-2">
              <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">System Overview</h2>
              <Card className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Data Freshness
                    </div>
                    <div className="text-lg font-semibold text-foreground">Real-time</div>
                    <div className="text-[11px] text-success mt-0.5">● All systems synced</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Active Alerts
                    </div>
                    <div className="text-lg font-semibold text-foreground">3</div>
                    <div className="text-[11px] text-warning mt-0.5">1 critical, 2 pending</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Pending Decisions
                    </div>
                    <div className="text-lg font-semibold text-foreground">7</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Awaiting action</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Cash Position
                    </div>
                    <div className="text-lg font-semibold text-foreground">₫12.4B</div>
                    <div className="text-[11px] text-success mt-0.5">↑ 2.3% vs yesterday</div>
                  </div>
                </div>
              </Card>
            </section>
          </div>

          {/* Footer Note */}
          <footer className="mt-10 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              {language === 'vi' 
                ? 'Nếu không khiến quyết định rõ ràng hơn → hệ thống đã thất bại.'
                : 'If the system doesn\'t make decisions clearer → it has failed.'}
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}
