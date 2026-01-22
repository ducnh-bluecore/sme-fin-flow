import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Target, 
  AlertTriangle, 
  Users,
  ArrowRight,
  Database,
  GitBranch,
  CheckCircle2,
  Clock,
  Zap,
  Play,
  FileText,
  Map
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFeatureDecisions } from './hooks/useFeatureDecisions';
import { 
  SystemType, 
  SYSTEM_ROUTES, 
  SYSTEM_INFO,
  STATUS_INFO,
} from './types';

const SYSTEM_ICONS: Record<SystemType, React.ElementType> = {
  'FDP': BarChart3,
  'Control Tower': AlertTriangle,
  'MDP': Target,
  'CDP': Users,
};

const SYSTEM_COLORS: Record<SystemType, { bg: string; border: string; text: string; icon: string; progress: string }> = {
  'FDP': { 
    bg: 'bg-emerald-950/30', 
    border: 'border-emerald-700/30', 
    text: 'text-emerald-400',
    icon: 'text-emerald-500',
    progress: 'bg-emerald-500'
  },
  'Control Tower': { 
    bg: 'bg-amber-950/30', 
    border: 'border-amber-700/30', 
    text: 'text-amber-400',
    icon: 'text-amber-500',
    progress: 'bg-amber-500'
  },
  'MDP': { 
    bg: 'bg-blue-950/30', 
    border: 'border-blue-700/30', 
    text: 'text-blue-400',
    icon: 'text-blue-500',
    progress: 'bg-blue-500'
  },
  'CDP': { 
    bg: 'bg-purple-950/30', 
    border: 'border-purple-700/30', 
    text: 'text-purple-400',
    icon: 'text-purple-500',
    progress: 'bg-purple-500'
  },
};

export default function ReviewHubHome() {
  const navigate = useNavigate();
  const { decisions, loading } = useFeatureDecisions();

  const getSystemStats = (systemId: SystemType) => {
    const routes = SYSTEM_ROUTES[systemId];
    const totalRoutes = routes.length;
    const liveCount = routes.filter(r => r.is_live).length;
    const systemDecisions = decisions.filter(d => d.system === systemId);
    
    const buildCount = systemDecisions.filter(d => d.status === 'BUILD').length;
    const holdCount = systemDecisions.filter(d => d.status === 'HOLD').length;
    const dropCount = systemDecisions.filter(d => d.status === 'DROP').length;
    const pendingCount = systemDecisions.filter(d => d.status === 'PENDING').length;
    const decided = buildCount + holdCount + dropCount;
    const percentReviewed = totalRoutes > 0 
      ? Math.round((decided / totalRoutes) * 100) 
      : 0;

    return { 
      totalRoutes, 
      liveCount, 
      decided, 
      pendingCount: totalRoutes - decided,
      percentReviewed,
      buildCount,
      holdCount,
      dropCount,
    };
  };

  // Global stats
  const globalStats = {
    totalRoutes: Object.keys(SYSTEM_ROUTES).reduce((acc, s) => acc + SYSTEM_ROUTES[s as SystemType].length, 0),
    liveRoutes: Object.keys(SYSTEM_ROUTES).reduce((acc, s) => acc + SYSTEM_ROUTES[s as SystemType].filter(r => r.is_live).length, 0),
    plannedRoutes: Object.keys(SYSTEM_ROUTES).reduce((acc, s) => acc + SYSTEM_ROUTES[s as SystemType].filter(r => !r.is_live).length, 0),
    activeSystems: (Object.keys(SYSTEM_ROUTES) as SystemType[]).filter(s => SYSTEM_ROUTES[s].some(r => r.is_live)).length,
    plannedSystems: (Object.keys(SYSTEM_ROUTES) as SystemType[]).filter(s => !SYSTEM_ROUTES[s].some(r => r.is_live)).length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
              <GitBranch className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">
                Product Review & Scoping Hub
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Decision capture và data contract definition cho FDP, MDP, CDP, Control Tower
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Overall Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-3xl font-bold text-slate-100">
              {globalStats.totalRoutes}
            </div>
            <div className="text-xs text-slate-500 mt-1">Total Routes</div>
          </div>
          <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-700/20">
            <div className="text-3xl font-bold text-emerald-400">
              {globalStats.liveRoutes}
            </div>
            <div className="text-xs text-slate-500 mt-1">LIVE</div>
          </div>
          <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-700/20">
            <div className="text-3xl font-bold text-amber-400">
              {globalStats.plannedRoutes}
            </div>
            <div className="text-xs text-slate-500 mt-1">COMING SOON</div>
          </div>
          <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-700/20">
            <div className="text-3xl font-bold text-blue-400">
              {globalStats.activeSystems}
            </div>
            <div className="text-xs text-slate-500 mt-1">Active Systems</div>
          </div>
          <div className="p-4 rounded-lg bg-purple-950/30 border border-purple-700/20">
            <div className="text-3xl font-bold text-purple-400">
              {globalStats.plannedSystems}
            </div>
            <div className="text-xs text-slate-500 mt-1">Planned Systems</div>
          </div>
        </div>

        {/* Quick Actions per spec */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button 
            onClick={() => navigate('/review-hub/review')}
            className="bg-emerald-700 hover:bg-emerald-600 text-white border-0"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Review
          </Button>
          <Button 
            onClick={() => navigate('/review-hub/data-contract')}
            className="bg-blue-700 hover:bg-blue-600 text-white border-0"
          >
            <FileText className="h-4 w-4 mr-2" />
            Data Contract
          </Button>
          <Button 
            onClick={() => navigate('/review-hub/routes')}
            className="bg-slate-700 hover:bg-slate-600 text-slate-100 border-0"
          >
            <Map className="h-4 w-4 mr-2" />
            Route Map
          </Button>
          <Button 
            onClick={() => {
              localStorage.removeItem('review_hub_feature_decisions');
              window.location.reload();
            }}
            className="bg-red-900/50 hover:bg-red-800/60 text-red-300 border-0"
          >
            <Zap className="h-4 w-4 mr-2" />
            Reset All Decisions
          </Button>
        </div>

        {/* System Cards - 4 thẻ sản phẩm lớn per spec */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(Object.keys(SYSTEM_INFO) as SystemType[]).map((systemId, index) => {
            const info = SYSTEM_INFO[systemId];
            const stats = getSystemStats(systemId);
            const colors = SYSTEM_COLORS[systemId];
            const Icon = SYSTEM_ICONS[systemId];

            return (
              <motion.div
                key={systemId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`${colors.bg} ${colors.border} border hover:border-opacity-60 transition-all cursor-pointer group`}
                  onClick={() => navigate(`/review-hub/systems/${encodeURIComponent(systemId)}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg bg-slate-900/50 ${colors.border} border`}>
                          <Icon className={`h-5 w-5 ${colors.icon}`} />
                        </div>
                        <div>
                          <CardTitle className={`text-lg ${colors.text}`}>
                            {systemId}
                          </CardTitle>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {info.tagline}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400 mb-3">
                      {info.description}
                    </p>

                    {/* Personas */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {info.personas.map(persona => (
                        <span 
                          key={persona} 
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-800/50 text-slate-400 border border-slate-700/50"
                        >
                          {persona}
                        </span>
                      ))}
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-xl font-semibold text-slate-200">
                          {stats.totalRoutes}
                        </div>
                        <div className="text-[10px] text-slate-500">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-semibold text-emerald-400">
                          {stats.liveCount}
                        </div>
                        <div className="text-[10px] text-slate-500">LIVE</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-semibold text-slate-200">
                          {stats.percentReviewed}%
                        </div>
                        <div className="text-[10px] text-slate-500">Reviewed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-semibold text-amber-400">
                          {stats.pendingCount}
                        </div>
                        <div className="text-[10px] text-slate-500">Pending</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                      <div 
                        className={`h-full ${colors.progress} transition-all duration-500`}
                        style={{ width: `${stats.percentReviewed}%` }}
                      />
                    </div>

                    {/* Decision Stats - BUILD/HOLD/DROP */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-400">{stats.buildCount} BUILD</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-slate-400">{stats.holdCount} HOLD</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-slate-400">{stats.dropCount} DROP</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Legend per spec */}
        <div className="mt-8 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Định nghĩa trạng thái</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-start gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-slate-300 font-medium">BUILD</span>
                <p className="text-slate-500">{STATUS_INFO.BUILD.description}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-3 h-3 rounded bg-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-slate-300 font-medium">HOLD</span>
                <p className="text-slate-500">{STATUS_INFO.HOLD.description}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-3 h-3 rounded bg-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-slate-300 font-medium">DROP</span>
                <p className="text-slate-500">{STATUS_INFO.DROP.description}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-3 h-3 rounded bg-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-slate-300 font-medium">PENDING</span>
                <p className="text-slate-500">{STATUS_INFO.PENDING.description}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
