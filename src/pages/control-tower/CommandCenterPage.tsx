import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Grid3X3, 
  GitBranch, 
  Target,
  RefreshCw,
  Bell,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { useBusinessPulse } from '@/hooks/control-tower/useBusinessPulse';
import { useRiskHeatmap } from '@/hooks/control-tower/useRiskHeatmap';
import { PulseRing, ModuleHealthGrid, LiveMetricsTicker } from '@/components/control-tower/pulse';
import { RiskHeatmapGrid } from '@/components/control-tower/heatmap';
import { ResolutionCountdown } from '@/components/control-tower/timer';
import type { ModuleHealth } from '@/components/control-tower/pulse';
import type { HeatmapCellData } from '@/components/control-tower/heatmap';

export default function CommandCenterPage() {
  const [activeTab, setActiveTab] = useState('pulse');
  const navigate = useNavigate();
  const { activeTenant } = useTenantContext();
  
  // Fetch data from hooks
  const pulseQuery = useBusinessPulse();
  const heatmapQuery = useRiskHeatmap();
  
  const pulseData = pulseQuery.data;
  const heatmapData = heatmapQuery.data;
  const isLoading = pulseQuery.isLoading || heatmapQuery.isLoading;
  
  // Transform pulse data to module health format
  const moduleHealth = useMemo((): ModuleHealth[] => {
    if (!pulseData?.modules) return [
      { module: 'FDP', status: 'healthy', lastSyncAt: null, activeAlerts: 0, description: 'Loading...' },
      { module: 'MDP', status: 'healthy', lastSyncAt: null, activeAlerts: 0, description: 'Loading...' },
      { module: 'CDP', status: 'healthy', lastSyncAt: null, activeAlerts: 0, description: 'Loading...' },
    ];
    
    return pulseData.modules.map(m => ({
      module: m.module_code.replace('CONTROL_TOWER', 'FDP') as 'FDP' | 'MDP' | 'CDP',
      status: (m.status === 'critical' ? 'error' : m.status) as 'healthy' | 'warning' | 'error' | 'syncing',
      lastSyncAt: m.last_sync_at ? new Date(m.last_sync_at) : null,
      activeAlerts: m.active_alerts_count,
      description: m.status === 'healthy' 
        ? 'Hệ thống hoạt động ổn định'
        : m.status === 'warning'
        ? 'Có cảnh báo cần xử lý'
        : 'Có vấn đề nghiêm trọng',
    })).filter(m => ['FDP', 'MDP', 'CDP'].includes(m.module));
  }, [pulseData]);

  // Transform heatmap data
  const formattedHeatmapData = useMemo((): HeatmapCellData[] => {
    if (!heatmapData?.cells) return [];
    
    return heatmapData.cells.map(c => ({
      module: c.module_code,
      dimension: c.dimension === 'REVENUE' ? 'Revenue' : c.dimension === 'CASH' ? 'Cash' : 'Operations',
      intensity: c.risk_intensity,
      label: `${c.module_code} - ${c.dimension}`,
      detail: `Risk score: ${c.risk_intensity}/100. ${c.alert_count || 0} active alerts.`,
      alertCount: c.alert_count,
    }));
  }, [heatmapData]);

  // Transform cascade data
  const cascades = useMemo(() => {
    if (!heatmapData?.cascades) return [];
    
    return heatmapData.cascades.map(c => ({
      from: { module: c.from.module, dimension: c.from.dimension === 'REVENUE' ? 'Revenue' : c.from.dimension === 'CASH' ? 'Cash' : 'Operations' },
      to: { module: c.to.module, dimension: c.to.dimension === 'REVENUE' ? 'Revenue' : c.to.dimension === 'CASH' ? 'Cash' : 'Operations' },
      label: `Impact: ${Math.round(c.strength * 100)}%`,
      severity: c.strength > 0.7 ? 'high' : c.strength > 0.4 ? 'medium' : 'low' as 'low' | 'medium' | 'high',
    }));
  }, [heatmapData]);

  const overallStatus = pulseData?.pulse_rate || 'stable';
  const criticalAlerts = pulseData?.critical_alerts_count || 0;

  // Demo ticker metrics
  const tickerMetrics = [
    { id: '1', label: 'Doanh thu hôm nay', value: '₫125.5M', change: 8.2, updatedAt: new Date() },
    { id: '2', label: 'Cash Position', value: '₫2.1B', change: -2.1, updatedAt: new Date() },
    { id: '3', label: 'Active Customers', value: '1,234', change: 5.4, updatedAt: new Date() },
    { id: '4', label: 'CAC', value: '₫85K', change: -12.3, isAlert: true, updatedAt: new Date() },
    { id: '5', label: 'CM%', value: '32%', change: 1.2, updatedAt: new Date() },
  ];

  // Demo escalation data
  const demoEscalation = {
    cardId: 'DEC-001',
    title: 'Quyết định: Dừng SKU-A0015 do margin âm',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    deadlineAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    currentOwner: 'COO',
    escalationPath: [
      { role: 'Operations Manager', timeRemaining: -1 },
      { role: 'COO', timeRemaining: 120 },
      { role: 'CFO', timeRemaining: 240 },
      { role: 'CEO', timeRemaining: 480 },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Command Center</h1>
          <p className="text-muted-foreground">
            Real-time business intelligence & decision control
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pulseQuery.refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/control-tower/alerts')}
          >
            <Bell className="h-4 w-4 mr-2" />
            {criticalAlerts} Alerts
          </Button>
        </div>
      </div>

      {/* Live Metrics Ticker */}
      <Card className="overflow-hidden">
        <LiveMetricsTicker metrics={tickerMetrics} speed="normal" />
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pulse" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Live Pulse</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-2">
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Risk Map</span>
          </TabsTrigger>
          <TabsTrigger value="decisions" className="gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Decisions</span>
          </TabsTrigger>
          <TabsTrigger value="outcomes" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Outcomes</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Live Pulse */}
        <TabsContent value="pulse" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Pulse Ring */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Business Heartbeat</CardTitle>
                <CardDescription>Sức khỏe tổng thể hệ thống</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-6">
                <PulseRing 
                  status={overallStatus as 'stable' | 'warning' | 'critical'} 
                  size="lg" 
                />
              </CardContent>
            </Card>

            {/* Module Health Grid */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Module Health</CardTitle>
                <CardDescription>Trạng thái từng module</CardDescription>
              </CardHeader>
              <CardContent>
                <ModuleHealthGrid 
                  modules={moduleHealth}
                  onModuleClick={(mod) => navigate(`/${mod.toLowerCase()}`)}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Risk Heatmap */}
        <TabsContent value="risk" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Risk Heatmap</CardTitle>
                  <CardDescription>
                    Bản đồ nhiệt rủi ro theo module và dimension
                  </CardDescription>
                </div>
                <Badge variant="outline" className="gap-1">
                  {formattedHeatmapData.filter(d => d.intensity > 70).length} Critical Zones
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <RiskHeatmapGrid
                data={formattedHeatmapData}
                cascades={cascades}
                onCellClick={(module, dimension) => {
                  console.log('Navigate to:', module, dimension);
                }}
                showCascade
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Active Decisions */}
        <TabsContent value="decisions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resolution Timer Card */}
            <ResolutionCountdown
              {...demoEscalation}
              onEscalate={() => console.log('Escalate clicked')}
            />

            {/* More decision cards would go here */}
            <Card className="flex items-center justify-center min-h-[300px] border-dashed">
              <div className="text-center text-muted-foreground">
                <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Decision Cascade Viewer</p>
                <p className="text-sm">Coming in Phase 3</p>
                <Button variant="link" size="sm" className="mt-2">
                  View all decisions <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: Outcomes */}
        <TabsContent value="outcomes" className="space-y-6">
          <Card className="flex items-center justify-center min-h-[400px] border-dashed">
            <div className="text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Outcome Tracker</p>
              <p className="text-sm">Track decision outcomes vs predictions</p>
              <p className="text-xs mt-2">Coming in Phase 3</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
