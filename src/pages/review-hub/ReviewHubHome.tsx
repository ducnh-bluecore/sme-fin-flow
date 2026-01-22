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
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFeatureDecisions } from './hooks/useFeatureDecisions';
import { SystemType, SYSTEM_ROUTES } from './types';

const SYSTEMS: { 
  id: SystemType; 
  name: string; 
  icon: React.ElementType; 
  color: string;
  description: string;
  routeCount: number;
  liveCount: number;
}[] = [
  { 
    id: 'FDP', 
    name: 'Financial Data Platform', 
    icon: BarChart3, 
    color: 'emerald',
    description: 'Financial truth engine for CEO/CFO decisions',
    routeCount: SYSTEM_ROUTES['FDP'].length,
    liveCount: SYSTEM_ROUTES['FDP'].filter(r => r.is_live).length,
  },
  { 
    id: 'Control Tower', 
    name: 'Control Tower', 
    icon: AlertTriangle, 
    color: 'amber',
    description: 'Alert & decision engine for real-time action',
    routeCount: SYSTEM_ROUTES['Control Tower'].length,
    liveCount: SYSTEM_ROUTES['Control Tower'].filter(r => r.is_live).length,
  },
  { 
    id: 'MDP', 
    name: 'Marketing Data Platform', 
    icon: Target, 
    color: 'blue',
    description: 'Profit attribution for marketing decisions',
    routeCount: SYSTEM_ROUTES['MDP'].length,
    liveCount: SYSTEM_ROUTES['MDP'].filter(r => r.is_live).length,
  },
  { 
    id: 'CDP', 
    name: 'Customer Data Platform', 
    icon: Users, 
    color: 'purple',
    description: 'Customer 360 and journey intelligence (Planned)',
    routeCount: SYSTEM_ROUTES['CDP'].length,
    liveCount: SYSTEM_ROUTES['CDP'].filter(r => r.is_live).length,
  },
];

export default function ReviewHubHome() {
  const navigate = useNavigate();
  const { decisions, loading } = useFeatureDecisions();

  const getSystemStats = (systemId: SystemType) => {
    const totalRoutes = SYSTEM_ROUTES[systemId].length;
    const systemDecisions = decisions.filter(d => d.system === systemId);
    const decided = systemDecisions.filter(d => d.status !== 'PENDING').length;
    const percentReviewed = totalRoutes > 0 
      ? Math.round((decided / totalRoutes) * 100) 
      : 0;
    const pending = totalRoutes - decided;

    return { totalRoutes, decided, pending, percentReviewed };
  };

  const colorClasses: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    emerald: { 
      bg: 'bg-emerald-950/30', 
      border: 'border-emerald-700/30', 
      text: 'text-emerald-400',
      icon: 'text-emerald-500'
    },
    amber: { 
      bg: 'bg-amber-950/30', 
      border: 'border-amber-700/30', 
      text: 'text-amber-400',
      icon: 'text-amber-500'
    },
    blue: { 
      bg: 'bg-blue-950/30', 
      border: 'border-blue-700/30', 
      text: 'text-blue-400',
      icon: 'text-blue-500'
    },
    purple: { 
      bg: 'bg-purple-950/30', 
      border: 'border-purple-700/30', 
      text: 'text-purple-400',
      icon: 'text-purple-500'
    },
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
                Decision capture and data contract definition layer
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
              {SYSTEMS.reduce((acc, s) => acc + s.routeCount, 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Total Routes</div>
          </div>
          <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-700/20">
            <div className="text-3xl font-bold text-emerald-400">
              {SYSTEMS.reduce((acc, s) => acc + s.liveCount, 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Live</div>
          </div>
          <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-700/20">
            <div className="text-3xl font-bold text-amber-400">
              {SYSTEMS.reduce((acc, s) => acc + s.routeCount - s.liveCount, 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Planned</div>
          </div>
          <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-700/20">
            <div className="text-3xl font-bold text-blue-400">
              {SYSTEMS.filter(s => s.liveCount > 0).length}
            </div>
            <div className="text-xs text-slate-500 mt-1">Active Systems</div>
          </div>
          <div className="p-4 rounded-lg bg-purple-950/30 border border-purple-700/20">
            <div className="text-3xl font-bold text-purple-400">
              {SYSTEMS.filter(s => s.liveCount === 0).length}
            </div>
            <div className="text-xs text-slate-500 mt-1">Planned Systems</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/review-hub/routes')}
            className="border-slate-700 hover:bg-slate-800"
          >
            <Database className="h-4 w-4 mr-2" />
            Full Route Map
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/review-hub/review')}
            className="border-slate-700 hover:bg-slate-800"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Review Dashboard
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/review-hub/data-contract')}
            className="border-slate-700 hover:bg-slate-800"
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Data Contracts
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              localStorage.removeItem('review_hub_feature_decisions');
              window.location.reload();
            }}
            className="border-red-700/30 text-red-400 hover:bg-red-950/30"
          >
            <Zap className="h-4 w-4 mr-2" />
            Reset All Decisions
          </Button>
        </div>

        {/* System Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SYSTEMS.map((system, index) => {
            const stats = getSystemStats(system.id);
            const colors = colorClasses[system.color];
            const Icon = system.icon;

            return (
              <motion.div
                key={system.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`${colors.bg} ${colors.border} border hover:border-opacity-60 transition-all cursor-pointer group`}
                  onClick={() => navigate(`/review-hub/systems/${encodeURIComponent(system.id)}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg bg-slate-900/50 ${colors.border} border`}>
                          <Icon className={`h-5 w-5 ${colors.icon}`} />
                        </div>
                        <div>
                          <CardTitle className={`text-lg ${colors.text}`}>
                            {system.id}
                          </CardTitle>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {system.name}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400 mb-4">
                      {system.description}
                    </p>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-semibold text-slate-200">
                          {system.routeCount}
                        </div>
                        <div className="text-xs text-slate-500">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-semibold text-emerald-400">
                          {system.liveCount}
                        </div>
                        <div className="text-xs text-slate-500">Live</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-semibold text-slate-200">
                          {stats.percentReviewed}%
                        </div>
                        <div className="text-xs text-slate-500">Reviewed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-semibold text-amber-400">
                          {stats.pending}
                        </div>
                        <div className="text-xs text-slate-500">Pending</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colors.text.replace('text-', 'bg-')} transition-all duration-500`}
                        style={{ width: `${stats.percentReviewed}%` }}
                      />
                    </div>

                    {/* Status Indicators */}
                    <div className="flex items-center gap-4 mt-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-slate-400">{stats.decided} decided</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-slate-400">{stats.pending} pending</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Decision Status Legend</h3>
          <div className="flex flex-wrap gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-slate-400">BUILD - Approved for development</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-slate-400">HOLD - Pending further review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-500" />
              <span className="text-slate-400">DROP - Not in scope</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-slate-500" />
              <span className="text-slate-400">PENDING - Not yet reviewed</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
