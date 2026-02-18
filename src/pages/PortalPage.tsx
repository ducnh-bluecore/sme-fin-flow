import { useMemo } from 'react';
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
  Loader2,
  Lock,
  Presentation,
  Crosshair,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { useNotificationCenter } from '@/hooks/useNotificationCenter';
import { useCDPEquitySnapshot } from '@/hooks/useCDPOverview';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useExtendedAlertConfigs, useInitializeDefaultAlerts } from '@/hooks/useExtendedAlertConfigs';
import { AlertSetupBanner } from '@/components/portal/AlertSetupBanner';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';

// Format VND currency
function formatVND(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '₫0';
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `₫${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `₫${(value / 1e6).toFixed(0)}M`;
  if (absValue >= 1e3) return `₫${(value / 1e3).toFixed(0)}K`;
  return `₫${value.toFixed(0)}`;
}

interface AppModule {
  id: string;
  code: string; // Module code for access check
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
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

// Compact App Module Card — Dark Glassmorphism
function CompactModuleCard({ 
  module, 
  onClick,
  isLoading = false,
  isActive = true,
}: { 
  module: AppModule; 
  onClick: (module: AppModule) => void;
  isLoading?: boolean;
  isActive?: boolean;
}) {
  return (
    <motion.div
      whileHover={isActive ? { y: -6, transition: { duration: 0.2 } } : {}}
      className={`group relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 h-full flex flex-col ${
        isActive 
          ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14]'
          : 'bg-white/[0.02] border-white/[0.05] opacity-50 cursor-not-allowed'
      }`}
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={() => isActive && onClick(module)}
    >
      {/* Per-module hover glow */}
      {isActive && (
        <div 
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 0%, ${module.color}18, transparent 70%)` }} 
        />
      )}
      
      {/* Icon + Badge */}
      <div className="flex items-start justify-between mb-4 relative">
        <div 
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ 
            background: `linear-gradient(135deg, ${module.color}35, ${module.color}15)`,
            border: `1px solid ${module.color}30`
          }}
        >
          <module.icon className="h-5 w-5" style={{ color: module.color }} />
        </div>
        <span 
          className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1 rounded-full"
          style={{ 
            color: isActive ? module.color : 'hsl(var(--muted-foreground))',
            background: isActive ? `${module.color}15` : 'transparent',
            border: `1px solid ${isActive ? module.color + '25' : 'transparent'}`
          }}
        >
          {isActive ? module.shortName : <span className="flex items-center gap-1"><Lock className="h-3 w-3" />Inactive</span>}
        </span>
      </div>

      {/* Name + Tagline */}
      <div className="mb-3 relative flex-1">
        <h3 className="font-semibold text-sm text-foreground mb-0.5">{module.name}</h3>
        <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: isActive ? module.color : 'hsl(var(--muted-foreground))' }}>
          {module.tagline}
        </p>
        <p className="text-[11px] text-muted-foreground line-clamp-2">{module.description}</p>
      </div>

      {/* Metrics */}
      {isActive && module.metrics && (
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {module.metrics.slice(0, 2).map((metric, i) => (
            <div key={i} className="bg-white/[0.05] rounded-lg px-2 py-1.5 border border-white/[0.08]">
              <div className="text-[9px] text-muted-foreground">{metric.label}</div>
              <div className="text-xs font-semibold text-foreground flex items-center gap-1">
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : metric.value}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!isActive && (
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {[0,1].map(i => (
            <div key={i} className="bg-white/[0.03] rounded-lg px-2 py-1.5 border border-white/[0.05]">
              <div className="text-[9px] text-muted-foreground">—</div>
              <div className="text-xs font-semibold text-muted-foreground">—</div>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center text-xs font-medium mt-auto" style={{ color: isActive ? module.color : 'hsl(var(--muted-foreground))' }}>
        {isActive ? (
          <>
            <span>Open {module.shortName}</span>
            <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
          </>
        ) : (
          <>
            <Lock className="h-3 w-3 mr-1" />
            <span>Upgrade to access</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

// Workspace Link Component
function WorkspaceLink({ workspace, onClick }: { workspace: Workspace; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] transition-all duration-200 group text-left"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div className="p-2 rounded-lg bg-white/[0.06] border border-white/[0.08]">
        <workspace.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { hasModule, isLoading: moduleAccessLoading } = useModuleAccess();
  const { isSuperAdmin } = useIsSuperAdmin();

  const debugEnabled = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('debug') === '1';
    } catch {
      return false;
    }
  }, []);
  
  // Fetch real financial data from SSOT
  const { data: financeSnapshot, isLoading: financeLoading } = useFinanceTruthSnapshot();
  
  // Fetch alert stats
  const { stats: alertStats, isLoading: alertsLoading } = useNotificationCenter();
  
  // Fetch alert configs to check if setup is needed
  const { data: alertConfigs, isLoading: configsLoading } = useExtendedAlertConfigs();
  const initializeDefaults = useInitializeDefaultAlerts();
  
  // Check if tenant needs alert config setup
  const needsAlertSetup = !configsLoading && (!alertConfigs || alertConfigs.length === 0);
  
  // Fetch CDP equity snapshot for CDP card stats
  const { data: cdpEquity, isLoading: cdpLoading } = useCDPEquitySnapshot();
  
  // Fetch database stats for Data Warehouse
  // eslint-disable-next-line no-restricted-syntax -- STAGING MONITORING: checks table counts including staging
  const { data: dbStats, isLoading: dbStatsLoading } = useQuery({
    queryKey: ['portal-db-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      // Count tables in public schema that have data
      // ⚠️ MONITORING: external_orders is staging, counted for sync status only
      const tableQueries = [
        'external_orders', // Staging table - for sync status
        'invoices',
        'bank_transactions',
        'products',
        'customers',
        'bills',
        'journal_entries',
        'alert_instances',
      ];
      
      let totalRecords = 0;
      let tablesWithData = 0;
      
      for (const table of tableQueries) {
        try {
          // Use buildSelectQuery for tenant-aware count
          const { data, error } = await buildSelectQuery(table as any, 'id').limit(1);
          if (!error && data) {
            // If we got data, table has records
            totalRecords += 100; // Estimate, actual count would require RPC
            tablesWithData++;
          }
        } catch {
          // Table might not exist or have tenant_id
        }
      }
      
      return {
        totalTables: 50 + tablesWithData, // Base tables + data tables
        totalRecords,
        syncStatus: 'live' as const,
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 60 * 1000, // 1 minute
  });

  // Calculate unreconciled amount (AR that hasn't been matched to bank transactions)
  const unreconciledAmount = useMemo(() => {
    if (!financeSnapshot) return 0;
    // Use overdue AR as proxy for unreconciled
    return financeSnapshot.overdueAR || 0;
  }, [financeSnapshot]);

  // Calculate Cash at Risk for MDP (marketing spend that hasn't generated profit)
  const cashAtRisk = useMemo(() => {
    if (!financeSnapshot) return 0;
    // Use total marketing spend - (marketing ROAS * spend) if ROAS < 1
    const roas = financeSnapshot.marketingRoas || 0;
    const spend = financeSnapshot.totalMarketingSpend || 0;
    if (roas < 1) {
      return spend * (1 - roas);
    }
    return spend * 0.1; // 10% of spend as baseline risk
  }, [financeSnapshot]);

  // Calculate At Risk for Control Tower (sum of impact from active alerts)
  const atRiskAmount = useMemo(() => {
    // Use overdue AR + slow moving inventory as "at risk"
    if (!financeSnapshot) return 0;
    return (financeSnapshot.overdueAR || 0) + (financeSnapshot.slowMovingInventory || 0);
  }, [financeSnapshot]);

  const isLoading = financeLoading || alertsLoading || cdpLoading;

  // App Modules with real data
  const appModules: AppModule[] = [
    {
      id: 'fdp',
      code: 'fdp',
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
      path: '/dashboard',
      metrics: [
        { label: 'Net Cash', value: formatVND(financeSnapshot?.cashToday) },
        { label: 'Unreconciled', value: formatVND(unreconciledAmount) },
      ]
    },
    {
      id: 'mdp',
      code: 'mdp',
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
      path: '/mdp',
      metrics: [
        { label: 'True ROAS', value: `${(financeSnapshot?.marketingRoas || 0).toFixed(1)}x` },
        { label: 'Cash at Risk', value: formatVND(cashAtRisk) },
      ]
    },
    {
      id: 'control-tower',
      code: 'control_tower',
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
      path: '/control-tower',
      metrics: [
        { label: 'Active Alerts', value: String(alertStats?.active || 0) },
        { label: 'At Risk', value: formatVND(atRiskAmount) },
      ]
    },
    {
      id: 'cdp',
      code: 'cdp',
      name: 'Customer Data Platform',
      shortName: 'CDP',
      tagline: 'Population > Individual',
      description: language === 'vi'
        ? 'Phát hiện dịch chuyển giá trị khách hàng. Customer = Financial Asset.'
        : 'Detect customer value shifts. Customer = Financial Asset.',
      icon: Users,
      color: 'hsl(270, 60%, 50%)',
      bgColor: 'hsl(270, 60%, 95%)',
      borderColor: 'hsl(270, 60%, 85%)',
      path: '/cdp',
      metrics: [
        { label: 'Customer Equity', value: formatVND(cdpEquity?.totalEquity12M) },
        { label: 'At Risk', value: formatVND(cdpEquity?.atRiskValue) },
      ]
    },
    {
      id: 'command',
      code: 'command',
      name: 'Bluecore Command',
      shortName: 'CMD',
      tagline: 'Capital at the Right Place',
      description: language === 'vi'
        ? 'Inventory Intelligence — đảm bảo capital nằm đúng SKU, đúng store, đúng thời điểm.'
        : 'Inventory Intelligence — ensure capital is at the right SKU, right store, right time.',
      icon: Crosshair,
      color: 'hsl(24, 90%, 50%)',
      bgColor: 'hsl(24, 90%, 95%)',
      borderColor: 'hsl(24, 90%, 80%)',
      path: '/command',
      metrics: [
        { label: 'Distortion', value: '—' },
        { label: 'Protected', value: '—' },
      ]
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
      id: 'sales-deck',
      name: 'Sales Deck Library',
      description: 'PDF Sales Decks & Tài liệu',
      icon: Presentation,
      path: '/sales-deck-library',
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
    if (hasModule(module.code) && module.path) {
      navigate(module.path);
    }
  };

  const handleWorkspaceClick = (workspace: Workspace) => {
    navigate(workspace.path);
  };

  const handleDataWarehouseClick = () => {
    window.open('https://admin.bluecore.vn/', '_blank');
  };

  // Format record count
  const formatRecordCount = (count: number): string => {
    if (count >= 1e6) return `${(count / 1e6).toFixed(1)}M`;
    if (count >= 1e3) return `${(count / 1e3).toFixed(1)}K`;
    return String(count);
  };

  return (
    <>
      <Helmet>
        <title>Bluecore | Finance & Decision Intelligence Platform</title>
        <meta name="description" content="Enterprise-grade Finance & Decision Intelligence Platform for CEOs, CFOs, and COOs" />
      </Helmet>

      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[100px]" style={{ background: 'radial-gradient(ellipse, hsl(var(--primary)/0.08) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-[80px]" style={{ background: 'radial-gradient(ellipse, hsl(var(--chart-5)/0.05) 0%, transparent 70%)' }} />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '48px 48px', opacity: 0.25 }} />
        </div>

        {debugEnabled && (
          <div className="fixed left-4 top-4 z-[9998] w-[min(520px,calc(100vw-2rem))] rounded-xl border border-border bg-card/95 backdrop-blur p-3 shadow-elevated">
            <div className="text-xs font-semibold text-foreground">Portal Debug</div>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <div className="truncate"><span className="font-medium text-foreground">tenantId:</span> {tenantId ?? 'null'}</div>
              <div className="truncate"><span className="font-medium text-foreground">language:</span> {language}</div>
              <div className="truncate"><span className="font-medium text-foreground">financeLoading:</span> {String(financeLoading)}</div>
              <div className="truncate"><span className="font-medium text-foreground">alertsLoading:</span> {String(alertsLoading)}</div>
              <div className="truncate"><span className="font-medium text-foreground">cdpLoading:</span> {String(cdpLoading)}</div>
              <div className="truncate"><span className="font-medium text-foreground">dbStatsLoading:</span> {String(dbStatsLoading)}</div>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="relative z-20 border-b border-white/[0.08] bg-background/80 backdrop-blur-xl sticky top-0">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-foreground tracking-tight">Bluecore</h1>
                  <p className="text-[10px] text-muted-foreground -mt-0.5">Finance & Decision Intelligence</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
          {/* Alert Setup Banner */}
          {needsAlertSetup && (
            <AlertSetupBanner 
              onInitialize={() => initializeDefaults.mutate()} 
              isLoading={initializeDefaults.isPending}
            />
          )}

          {/* Hero Tagline */}
          <section className="text-center pt-4 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center gap-2 mb-5"
            >
              {['Not BI', 'Not ERP', 'Not Accounting'].map((badge) => (
                <span 
                  key={badge}
                  className="px-3 py-1 text-[10px] rounded-full border text-muted-foreground uppercase tracking-widest"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)' }}
                >
                  {badge}
                </span>
              ))}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl md:text-4xl font-bold text-foreground mb-2"
            >
              Finance & Decision{' '}
              <span className="gradient-text-emerald">Intelligence Platform</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-muted-foreground text-sm max-w-lg mx-auto"
            >
              {language === 'vi'
                ? 'Giúp CEO & CFO ra quyết định nhanh hơn, chính xác hơn — dựa trên sự thật tài chính.'
                : 'Helping CEOs & CFOs decide faster and more accurately — based on financial truth.'}
            </motion.p>
          </section>

          {/* Hub and Spoke Layout */}
          <section className="mb-10">
            {/* Central Data Warehouse Hub */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center mb-8"
            >
              <div 
                className="w-full max-w-md cursor-pointer rounded-2xl border transition-all duration-300 p-6 text-center"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: 'hsl(var(--primary)/0.35)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 0 60px -10px hsl(var(--primary)/0.25)',
                }}
                onClick={handleDataWarehouseClick}
              >
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ 
                    background: 'linear-gradient(135deg, hsl(var(--primary)/0.25), hsl(var(--chart-5)/0.15))',
                    border: '1px solid hsl(var(--primary)/0.30)',
                    boxShadow: '0 0 30px -5px hsl(var(--primary)/0.3)'
                  }}
                >
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-1">Data Warehouse</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  {language === 'vi' ? 'Trung tâm dữ liệu — Single Source of Truth' : 'Central Data Hub — Single Source of Truth'}
                </p>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Tables', value: dbStatsLoading ? null : (dbStats?.totalTables || 50) },
                    { label: 'Sync', value: 'Live', isSuccess: true },
                    { label: 'Records', value: dbStatsLoading ? null : formatRecordCount(dbStats?.totalRecords || 0) },
                  ].map((stat, i) => (
                    <div key={i} className="rounded-xl p-2.5 border" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}>
                      <div className="text-[10px] text-muted-foreground uppercase mb-1">{stat.label}</div>
                      <div className={`text-base font-bold ${stat.isSuccess ? 'text-success' : 'text-foreground'}`}>
                        {stat.value === null ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : stat.value}
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="default" size="sm" className="gap-2 w-full">
                  <span>Open Data Warehouse</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>

            {/* Connection Lines Visual */}
            <div className="relative">
              <div className="hidden lg:block absolute inset-x-0 -top-4 h-8">
                <svg className="w-full h-full" viewBox="0 0 1000 32" preserveAspectRatio="none">
                  {['125', '375', '625', '875'].map((x) => (
                    <path key={x} d={`M${x} 32 L${x} 16 L500 16 L500 0`} stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" strokeDasharray="4 4" />
                  ))}
                </svg>
              </div>

              {/* Module Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {appModules.map((module, index) => (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.08, duration: 0.4 }}
                    className="h-full"
                  >
                    <CompactModuleCard 
                      module={module} 
                      onClick={handleModuleClick}
                      isLoading={isLoading || moduleAccessLoading}
                      isActive={hasModule(module.code)}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom Section: Workspaces + System Overview */}
          <div className={`grid grid-cols-1 ${isSuperAdmin ? 'lg:grid-cols-3' : ''} gap-6`}>
            {/* Workspaces - Super Admin only */}
            {isSuperAdmin && (
              <section className="lg:col-span-1">
                <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">Workspaces</h2>
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
            )}

            {/* System Overview */}
            <section className={isSuperAdmin ? "lg:col-span-2" : "lg:col-span-1"}>
              <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">System Overview</h2>
              <div 
                className="rounded-2xl border p-5"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Data Freshness</div>
                    <div className="text-base font-semibold text-foreground">
                      {financeSnapshot?.isStale ? 'Stale' : 'Real-time'}
                    </div>
                    <div className={`flex items-center gap-1.5 mt-1 text-[11px] ${financeSnapshot?.isStale ? 'text-warning' : 'text-success'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${financeSnapshot?.isStale ? 'bg-warning' : 'bg-success animate-pulse'}`} />
                      {financeSnapshot?.isStale ? 'Refresh needed' : 'All systems synced'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Active Alerts</div>
                    <div className="text-base font-semibold text-foreground">
                      {alertsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : alertStats?.active || 0}
                    </div>
                    <div className="text-[11px] text-warning mt-1">
                      {alertStats?.bySeverity?.critical || 0} critical
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Pending Decisions</div>
                    <div className="text-base font-semibold text-foreground">
                      {alertStats?.active || 0}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">Awaiting action</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Cash Position</div>
                    <div className="text-base font-semibold text-foreground">
                      {financeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : formatVND(financeSnapshot?.cashToday)}
                    </div>
                    <div className="text-[11px] text-success mt-1">
                      {financeSnapshot?.cash7dForecast && financeSnapshot.cashToday ? (
                        <>
                          {financeSnapshot.cash7dForecast > financeSnapshot.cashToday ? '↑' : '↓'}{' '}
                          {Math.abs(((financeSnapshot.cash7dForecast - financeSnapshot.cashToday) / financeSnapshot.cashToday) * 100).toFixed(1)}% next 7d
                        </>
                      ) : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-white/[0.08]">
            <div className="flex items-center justify-center gap-8 mb-3">
              {[
                { color: 'bg-success', label: 'Real Cash' },
                { color: 'bg-primary', label: 'Truth First' },
                { color: 'bg-warning', label: 'Action Now' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
                  <span className="text-muted-foreground text-xs">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/50 text-center">
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
