import { useState } from 'react';
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

// App Module Card Component
function AppModuleCard({ 
  module, 
  onClick,
}: { 
  module: AppModule; 
  onClick: (module: AppModule) => void; 
}) {
  const isActive = module.status === 'active';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card 
        className={`
          relative overflow-hidden transition-all duration-300 h-full
          ${isActive 
            ? 'cursor-pointer hover:shadow-elevated hover:-translate-y-1' 
            : 'opacity-60 cursor-not-allowed'}
        `}
        style={{
          borderLeftWidth: '4px',
          borderLeftColor: isActive ? module.color : 'hsl(var(--border))'
        }}
        onClick={() => isActive && onClick(module)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div 
              className="p-2.5 rounded-lg"
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
          <div className="mt-3">
            <CardTitle className="text-lg font-semibold text-foreground">
              {module.name}
            </CardTitle>
            <CardDescription className="text-xs mt-1" style={{ color: module.color }}>
              {module.tagline}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {module.description}
          </p>
          
          {isActive && module.metrics && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {module.metrics.slice(0, 2).map((metric, i) => (
                <div key={i} className="bg-muted/50 rounded-md p-2">
                  <div className="text-xs text-muted-foreground">{metric.label}</div>
                  <div className="text-sm font-semibold text-foreground">{metric.value}</div>
                </div>
              ))}
            </div>
          )}
          
          {isActive && (
            <div className="flex items-center text-sm font-medium" style={{ color: module.color }}>
              <span>Open {module.shortName}</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
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
        ? 'Nền tảng sự thật tài chính duy nhất. Reconciliation, cash position, unit economics - không có phiên bản khác.'
        : 'Single source of financial truth. Reconciliation, cash position, unit economics - no alternative versions.',
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
      tagline: 'Profit before Performance. Cash before Clicks.',
      description: language === 'vi'
        ? 'Đo lường giá trị tài chính thật của marketing. CFO tin, CEO quyết, Marketer phải điều chỉnh.'
        : 'Measure real financial value of marketing. CFO trusts, CEO decides, Marketer adjusts.',
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
      tagline: 'Awareness before Analytics. Action before Reports.',
      description: language === 'vi'
        ? 'Không phải dashboard. Tồn tại để báo động và hành động. Mỗi alert phải đau và phải có giá.'
        : 'Not a dashboard. Exists to alert and act. Every alert must hurt and have a price.',
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
        ? 'Nền tảng hợp nhất dữ liệu khách hàng. Xây dựng hồ sơ 360° để cá nhân hóa trải nghiệm.'
        : 'Unified customer data platform. Build 360° profiles to personalize experiences.',
      icon: Users,
      color: 'hsl(210, 80%, 52%)',
      bgColor: 'hsl(210, 80%, 95%)',
      borderColor: 'hsl(210, 80%, 85%)',
      status: 'coming-soon',
      path: '/cdp',
    },
  ];

  // Cross-App Workspaces (Phase 2 - currently linking to existing routes)
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
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  Bluecore
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Finance & Decision Intelligence Platform
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDataWarehouseClick}
                className="gap-2"
              >
                <Database className="h-4 w-4" />
                Data Warehouse
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Apps Section */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Applications</h2>
                <p className="text-sm text-muted-foreground">
                  {language === 'vi' ? 'Chọn module để bắt đầu' : 'Select a module to get started'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {appModules.map((module, index) => (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                >
                  <AppModuleCard 
                    module={module} 
                    onClick={handleModuleClick}
                  />
                </motion.div>
              ))}
            </div>
          </section>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Workspaces */}
            <section className="lg:col-span-1">
              <h2 className="text-lg font-semibold text-foreground mb-4">Workspaces</h2>
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

            {/* Quick Stats / System Health */}
            <section className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-foreground mb-4">System Overview</h2>
              <Card className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Data Freshness
                    </div>
                    <div className="text-xl font-semibold text-foreground">Real-time</div>
                    <div className="text-xs text-success mt-1">● All systems synced</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Active Alerts
                    </div>
                    <div className="text-xl font-semibold text-foreground">3</div>
                    <div className="text-xs text-warning mt-1">1 critical, 2 pending</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Pending Decisions
                    </div>
                    <div className="text-xl font-semibold text-foreground">7</div>
                    <div className="text-xs text-muted-foreground mt-1">Awaiting action</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Cash Position
                    </div>
                    <div className="text-xl font-semibold text-foreground">₫12.4B</div>
                    <div className="text-xs text-success mt-1">↑ 2.3% vs yesterday</div>
                  </div>
                </div>
              </Card>
            </section>
          </div>

          {/* Footer Note */}
          <footer className="mt-12 pt-6 border-t border-border">
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
