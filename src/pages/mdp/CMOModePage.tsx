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
  Crown,
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
import { useMDPData } from '@/hooks/useMDPData';
import { formatCurrency } from '@/lib/formatters';

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
    color: 'from-emerald-500 to-emerald-600'
  },
  { 
    id: 'cash-impact', 
    label: 'Cash Impact', 
    labelEn: 'Cash Impact',
    icon: Wallet, 
    path: '/mdp/cash-impact',
    description: 'Ảnh hưởng dòng tiền',
    color: 'from-blue-500 to-blue-600'
  },
  { 
    id: 'risks', 
    label: 'Marketing Risks', 
    labelEn: 'Marketing Risks',
    icon: AlertTriangle, 
    path: '/mdp/risks',
    description: 'Cảnh báo rủi ro',
    color: 'from-red-500 to-red-600',
    badgeCount: 2
  },
  { 
    id: 'decisions', 
    label: 'Decision Center', 
    labelEn: 'Decision Center',
    icon: Target, 
    path: '/mdp/decisions',
    description: 'Hỗ trợ quyết định',
    color: 'from-purple-500 to-purple-600'
  },
  { 
    id: 'budget-optimizer', 
    label: 'Budget Optimizer', 
    labelEn: 'Budget Optimizer',
    icon: Zap, 
    path: '/mdp/budget-optimizer',
    description: 'Tối ưu phân bổ ngân sách',
    color: 'from-yellow-500 to-yellow-600'
  },
  { 
    id: 'scenario-planner', 
    label: 'Scenario Planner', 
    labelEn: 'Scenario Planner',
    icon: LineChart, 
    path: '/mdp/scenario-planner',
    description: 'Mô phỏng kịch bản',
    color: 'from-cyan-500 to-cyan-600'
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
  } = useMDPData();

  // Calculate CMO-level metrics (profit focused)
  const totalRevenue = profitAttribution.reduce((sum, p) => sum + (p.gross_revenue || 0), 0);
  const totalSpend = profitAttribution.reduce((sum, p) => sum + (p.ad_spend || 0), 0);
  const contributionMargin = profitAttribution.reduce((sum, p) => sum + (p.contribution_margin || 0), 0);
  const profitROAS = totalSpend > 0 ? contributionMargin / totalSpend : 0;

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
          <AlertDescription>
            Không thể tải dữ liệu CMO. Vui lòng thử lại sau.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20" />
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
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">CMO Mode</h1>
            <p className="text-muted-foreground text-sm">
              {language === 'vi' 
                ? 'Decision & Strategy - Profit before Performance'
                : 'Decision & Strategy - Profit before Performance'}
            </p>
          </div>
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
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
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Contribution Margin</div>
            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(contributionMargin)}</div>
            <div className="flex items-center gap-1 mt-1">
              {contributionMargin > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-emerald-500">Profitable</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-500">Loss</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Profit ROAS</div>
            <div className="text-2xl font-bold">{profitROAS.toFixed(2)}x</div>
            <Badge variant="secondary" className="mt-1 text-xs">
              {profitROAS >= 1 ? '✓ Above breakeven' : '⚠ Below breakeven'}
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Cash Locked in Ads</div>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
            <Badge variant="secondary" className="mt-1 text-xs">Pending recovery</Badge>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Active Risks</div>
            <div className="text-2xl font-bold text-red-400">{cmoModeSummary.critical_alerts_count}</div>
            <div className="flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <span className="text-xs text-red-500">Requires action</span>
            </div>
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
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
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
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(link.path)}
                className="relative flex flex-col items-start p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all text-left group"
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${link.color} mb-3`}>
                  <link.icon className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium text-sm group-hover:text-primary transition-colors">
                  {language === 'vi' ? link.label : link.labelEn}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {link.description}
                </span>
                {link.badgeCount && link.badgeCount > 0 && (
                  <Badge className="absolute top-3 right-3 bg-red-500 text-white text-xs">
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="command-center">
            {language === 'vi' ? 'Command Center' : 'Command Center'}
          </TabsTrigger>
          <TabsTrigger value="profit">
            {language === 'vi' ? 'Profit' : 'Profit'}
          </TabsTrigger>
          <TabsTrigger value="risks">
            {language === 'vi' ? 'Risks' : 'Risks'}
          </TabsTrigger>
          <TabsTrigger value="decisions">
            {language === 'vi' ? 'Decisions' : 'Decisions'}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings2 className="h-3.5 w-3.5" />
            {language === 'vi' ? 'Cấu hình' : 'Settings'}
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
