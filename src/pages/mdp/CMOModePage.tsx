import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  DollarSign,
  Wallet,
  AlertTriangle,
  Target,
  Zap,
  LineChart,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Shield,
  Settings2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMDPDataSSOT } from '@/hooks/useMDPDataSSOT';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// CMO Mode Components
import {
  CMOCommandCenter,
  QuickActionCards,
  ProfitAttributionPanel,
  CMOCashImpactPanel,
  RiskAlertsPanel,
  DecisionPanel,
} from '@/components/mdp/cmo-mode';
import { ChannelBudgetConfigPanel } from '@/components/mdp/cmo-mode/ChannelBudgetConfigPanel';

const cmoQuickLinks = [
  { 
    id: 'profit', 
    label: 'Profit Attribution', 
    labelEn: 'Profit Attribution',
    icon: DollarSign, 
    path: '/mdp/profit',
    description: 'Lợi nhuận thực từ marketing',
  },
  { 
    id: 'cash-impact', 
    label: 'Cash Impact', 
    labelEn: 'Cash Impact',
    icon: Wallet, 
    path: '/mdp/cash-impact',
    description: 'Ảnh hưởng dòng tiền',
  },
  { 
    id: 'risks', 
    label: 'Marketing Risks', 
    labelEn: 'Marketing Risks',
    icon: AlertTriangle, 
    path: '/mdp/risks',
    description: 'Cảnh báo rủi ro',
    badgeCount: 2
  },
  { 
    id: 'decisions', 
    label: 'Decision Center', 
    labelEn: 'Decision Center',
    icon: Target, 
    path: '/mdp/decisions',
    description: 'Hỗ trợ quyết định',
  },
  { 
    id: 'budget-optimizer', 
    label: 'Budget Optimizer', 
    labelEn: 'Budget Optimizer',
    icon: Zap, 
    path: '/mdp/budget-optimizer',
    description: 'Tối ưu phân bổ ngân sách',
  },
  { 
    id: 'scenario-planner', 
    label: 'Scenario Planner', 
    labelEn: 'Scenario Planner',
    icon: LineChart, 
    path: '/mdp/scenario-planner',
    description: 'Mô phỏng kịch bản',
  },
];

export default function CMOModePage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('command-center');

  // Get data from hook
  const { 
    profitAttribution,
    cashImpact,
    riskAlerts,
    cmoModeSummary,
    isLoading, 
    error,
  } = useMDPDataSSOT();

  // Calculate CMO-level metrics (profit focused)
  const totalRevenue = profitAttribution.reduce((sum, p) => sum + (p.gross_revenue || 0), 0);
  const totalSpend = profitAttribution.reduce((sum, p) => sum + (p.ad_spend || 0), 0);
  const contributionMargin = profitAttribution.reduce((sum, p) => sum + (p.contribution_margin || 0), 0);
  const profitROAS = totalSpend > 0 ? contributionMargin / totalSpend : 0;

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">Unable to load CMO data</p>
                <p className="text-sm text-muted-foreground">Please try again later.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/portal')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">CMO Mode</h1>
              <p className="text-sm text-muted-foreground">
                Decision & Strategy - Profit before Performance
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Executive View
          </Badge>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/mdp/marketing-mode')}
          className="gap-2"
        >
          <Target className="h-4 w-4" />
          {language === 'vi' ? 'Chuyển Marketing Mode' : 'Switch to Marketing Mode'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* CMO-Level Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cn(
          "border-l-4",
          contributionMargin >= 0 ? "border-l-emerald-500" : "border-l-amber-500"
        )}>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Contribution Margin</div>
            <div className={cn(
              "text-2xl font-bold",
              contributionMargin >= 0 ? "text-emerald-600" : "text-amber-600"
            )}>
              {formatCurrency(contributionMargin)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {contributionMargin > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600">Profitable</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-amber-500" />
                  <span className="text-xs text-amber-600">Loss</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Profit ROAS</div>
            <div className="text-2xl font-bold">{profitROAS.toFixed(2)}x</div>
            <Badge variant="secondary" className="mt-1 text-xs">
              {profitROAS >= 1 ? '✓ Above breakeven' : '⚠ Below breakeven'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Cash Locked in Ads</div>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
            <Badge variant="secondary" className="mt-1 text-xs">Pending recovery</Badge>
          </CardContent>
        </Card>
        <Card className={cn(
          cmoModeSummary.critical_alerts_count > 0 && "border-l-4 border-l-amber-500"
        )}>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Active Risks</div>
            <div className={cn(
              "text-2xl font-bold",
              cmoModeSummary.critical_alerts_count > 0 ? "text-amber-600" : "text-foreground"
            )}>
              {cmoModeSummary.critical_alerts_count}
            </div>
            {cmoModeSummary.critical_alerts_count > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-600">Requires action</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <QuickActionCards 
        profitData={profitAttribution}
        cashImpact={cashImpact}
        summary={cmoModeSummary}
      />

      {/* Quick Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            {language === 'vi' ? 'Công cụ CMO' : 'CMO Tools'}
          </CardTitle>
          <CardDescription>
            {language === 'vi' 
              ? 'Công cụ ra quyết định chiến lược marketing'
              : 'Strategic marketing decision tools'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {cmoQuickLinks.map((link) => (
              <motion.button
                key={link.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(link.path)}
                className="relative flex flex-col items-start p-4 rounded-lg border bg-card hover:bg-muted/50 transition-all text-left group"
              >
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                  <link.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium text-sm group-hover:text-primary transition-colors">
                  {language === 'vi' ? link.label : link.labelEn}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {link.description}
                </span>
                {link.badgeCount && link.badgeCount > 0 && (
                  <Badge className="absolute top-3 right-3 bg-amber-500 text-white text-xs">
                    {link.badgeCount}
                  </Badge>
                )}
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="command-center">Command Center</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings2 className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="command-center" className="space-y-4">
          <CMOCommandCenter 
            profitData={profitAttribution}
            cashImpact={cashImpact}
            riskAlerts={riskAlerts}
            summary={cmoModeSummary}
          />
        </TabsContent>

        <TabsContent value="profit" className="space-y-4">
          <ProfitAttributionPanel 
            profitData={profitAttribution} 
            summary={cmoModeSummary} 
          />
          <CMOCashImpactPanel 
            cashImpact={cashImpact} 
            summary={cmoModeSummary} 
          />
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <RiskAlertsPanel 
            alerts={riskAlerts}
            onAction={(alert) => {
              console.log('CMO Action on alert:', alert);
            }}
          />
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          <DecisionPanel 
            profitData={profitAttribution}
            cashImpact={cashImpact}
            summary={cmoModeSummary}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <ChannelBudgetConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
