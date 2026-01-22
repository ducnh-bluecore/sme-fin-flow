import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Pause,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFeatureDecisions } from './hooks/useFeatureDecisions';
import { SystemType, SYSTEM_ROUTES, DecisionStatus } from './types';

export default function ReviewHubRoutes() {
  const navigate = useNavigate();
  const { decisions, loading } = useFeatureDecisions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSystem, setFilterSystem] = useState<SystemType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<DecisionStatus | 'all'>('all');

  // Build full route list from all systems
  const allRoutes = Object.entries(SYSTEM_ROUTES).flatMap(([system, routes]) =>
    routes.map(route => {
      const decision = decisions.find(d => d.system === system && d.route === route.route);
      return {
        system: system as SystemType,
        route: route.route,
        feature_name: route.feature_name,
        is_live: route.is_live,
        status: decision?.status || 'PENDING',
        target_version: decision?.target_version || null,
        reviewed: decision?.status !== 'PENDING',
      };
    })
  );

  // Apply filters
  const filteredRoutes = allRoutes.filter(route => {
    const matchesSearch = 
      route.feature_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.route.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSystem = filterSystem === 'all' || route.system === filterSystem;
    const matchesStatus = filterStatus === 'all' || route.status === filterStatus;
    return matchesSearch && matchesSystem && matchesStatus;
  });

  const getStatusBadge = (status: DecisionStatus) => {
    const styles: Record<DecisionStatus, { bg: string; text: string; icon: React.ElementType }> = {
      BUILD: { bg: 'bg-emerald-900/50', text: 'text-emerald-400', icon: CheckCircle2 },
      HOLD: { bg: 'bg-amber-900/50', text: 'text-amber-400', icon: Pause },
      DROP: { bg: 'bg-red-900/50', text: 'text-red-400', icon: XCircle },
      PENDING: { bg: 'bg-slate-800', text: 'text-slate-400', icon: Clock },
    };
    const style = styles[status];
    const Icon = style.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    );
  };

  const getSystemBadge = (system: SystemType) => {
    const colors: Record<SystemType, string> = {
      'FDP': 'bg-emerald-900/30 text-emerald-400 border-emerald-700/30',
      'MDP': 'bg-blue-900/30 text-blue-400 border-blue-700/30',
      'Control Tower': 'bg-amber-900/30 text-amber-400 border-amber-700/30',
      'CDP': 'bg-purple-900/30 text-purple-400 border-purple-700/30',
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${colors[system]}`}>
        {system}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/review-hub')}
              className="hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-slate-100">
                Full Route Map
              </h1>
              <p className="text-slate-400 text-sm">
                Global visibility of product surface area
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search routes or features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-700"
            />
          </div>
          
          <Select value={filterSystem} onValueChange={(v) => setFilterSystem(v as SystemType | 'all')}>
            <SelectTrigger className="w-[160px] bg-slate-900 border-slate-700">
              <SelectValue placeholder="System" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Systems</SelectItem>
              <SelectItem value="FDP">FDP</SelectItem>
              <SelectItem value="MDP">MDP</SelectItem>
              <SelectItem value="Control Tower">Control Tower</SelectItem>
              <SelectItem value="CDP">CDP</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as DecisionStatus | 'all')}>
            <SelectTrigger className="w-[140px] bg-slate-900 border-slate-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="BUILD">BUILD</SelectItem>
              <SelectItem value="HOLD">HOLD</SelectItem>
              <SelectItem value="DROP">DROP</SelectItem>
              <SelectItem value="PENDING">PENDING</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-2xl font-semibold text-slate-200">{allRoutes.length}</div>
            <div className="text-xs text-slate-500">Total Routes</div>
          </div>
          <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-700/20">
            <div className="text-2xl font-semibold text-emerald-400">
              {allRoutes.filter(r => r.status === 'BUILD').length}
            </div>
            <div className="text-xs text-slate-500">BUILD</div>
          </div>
          <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-700/20">
            <div className="text-2xl font-semibold text-amber-400">
              {allRoutes.filter(r => r.status === 'HOLD').length}
            </div>
            <div className="text-xs text-slate-500">HOLD</div>
          </div>
          <div className="p-4 rounded-lg bg-red-950/30 border border-red-700/20">
            <div className="text-2xl font-semibold text-red-400">
              {allRoutes.filter(r => r.status === 'DROP').length}
            </div>
            <div className="text-xs text-slate-500">DROP</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-2xl font-semibold text-slate-400">
              {allRoutes.filter(r => r.status === 'PENDING').length}
            </div>
            <div className="text-xs text-slate-500">PENDING</div>
          </div>
        </div>

        {/* Routes Table */}
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">System</TableHead>
                <TableHead className="text-slate-400">Route</TableHead>
                <TableHead className="text-slate-400">Feature</TableHead>
                <TableHead className="text-slate-400">Availability</TableHead>
                <TableHead className="text-slate-400">Version</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoutes.map((route, index) => (
                <motion.tr
                  key={`${route.system}-${route.route}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="border-slate-800 hover:bg-slate-900/50"
                >
                  <TableCell>{getSystemBadge(route.system)}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-300">
                    {route.route}
                  </TableCell>
                  <TableCell className="text-slate-200">{route.feature_name}</TableCell>
                  <TableCell>
                    {route.is_live ? (
                      <span className="text-xs text-emerald-400 font-medium">LIVE</span>
                    ) : (
                      <span className="text-xs text-slate-500">COMING SOON</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {route.target_version ? (
                      <span className="text-xs text-slate-300">{route.target_version}</span>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(route.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-slate-800"
                      onClick={() => navigate(`/review-hub/systems/${encodeURIComponent(route.system)}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredRoutes.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No routes match your filters
          </div>
        )}
      </main>
    </div>
  );
}
