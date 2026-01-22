import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Pause,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { 
  SystemType, 
  DecisionStatus,
  TargetVersion,
  Persona,
  FeatureDecision
} from './types';

export default function CrossSystemReview() {
  const navigate = useNavigate();
  const { decisions, loading } = useFeatureDecisions();
  
  const [filterStatus, setFilterStatus] = useState<DecisionStatus | 'all'>('all');
  const [filterVersion, setFilterVersion] = useState<TargetVersion | 'all'>('all');
  const [filterPersona, setFilterPersona] = useState<Persona | 'all'>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');

  // Get unique owners
  const owners = [...new Set(decisions.map(d => d.owner).filter(Boolean))] as string[];

  // Apply filters
  const filteredDecisions = decisions.filter(decision => {
    const matchesStatus = filterStatus === 'all' || decision.status === filterStatus;
    const matchesVersion = filterVersion === 'all' || decision.target_version === filterVersion;
    const matchesPersona = filterPersona === 'all' || decision.persona === filterPersona;
    const matchesOwner = filterOwner === 'all' || decision.owner === filterOwner;
    return matchesStatus && matchesVersion && matchesPersona && matchesOwner;
  });

  // Calculate stats
  const totalDecisions = decisions.length;
  const decidedCount = decisions.filter(d => d.status !== 'PENDING').length;
  const pendingCount = decisions.filter(d => d.status === 'PENDING').length;
  const missingDataCount = decisions.filter(d => 
    d.status === 'BUILD' && 
    (d.data_entities.entities.length === 0 || !d.data_entities.grain)
  ).length;

  const percentDecided = totalDecisions > 0 
    ? Math.round((decidedCount / totalDecisions) * 100) 
    : 0;
  const percentPending = totalDecisions > 0 
    ? Math.round((pendingCount / totalDecisions) * 100) 
    : 0;
  const percentBlocked = totalDecisions > 0 
    ? Math.round((missingDataCount / totalDecisions) * 100) 
    : 0;

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

  const hasMissingData = (decision: FeatureDecision) => {
    return decision.status === 'BUILD' && 
      (decision.data_entities.entities.length === 0 || !decision.data_entities.grain);
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
                Cross-System Review Dashboard
              </h1>
              <p className="text-slate-400 text-sm">
                Governance overview across all systems
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* Completion Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Decided</span>
              <span className="text-lg font-semibold text-slate-200">{percentDecided}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${percentDecided}%` }} />
            </div>
            <div className="text-xs text-slate-500 mt-2">{decidedCount} of {totalDecisions}</div>
          </div>
          
          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Pending</span>
              <span className="text-lg font-semibold text-amber-400">{percentPending}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${percentPending}%` }} />
            </div>
            <div className="text-xs text-slate-500 mt-2">{pendingCount} features</div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Missing Data Req.</span>
              <span className="text-lg font-semibold text-red-400">{percentBlocked}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500" style={{ width: `${percentBlocked}%` }} />
            </div>
            <div className="text-xs text-slate-500 mt-2">{missingDataCount} blocked</div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-xs text-slate-500 mb-2">By Status</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-emerald-400">BUILD</span>
                <span>{decisions.filter(d => d.status === 'BUILD').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400">HOLD</span>
                <span>{decisions.filter(d => d.status === 'HOLD').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-400">DROP</span>
                <span>{decisions.filter(d => d.status === 'DROP').length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-lg bg-slate-900/30 border border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-400">Filters:</span>
          </div>
          
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as DecisionStatus | 'all')}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-slate-900 border-slate-700">
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

          <Select value={filterVersion} onValueChange={(v) => setFilterVersion(v as TargetVersion | 'all')}>
            <SelectTrigger className="w-[120px] h-8 text-xs bg-slate-900 border-slate-700">
              <SelectValue placeholder="Version" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Versions</SelectItem>
              <SelectItem value="v1">v1</SelectItem>
              <SelectItem value="v2">v2</SelectItem>
              <SelectItem value="v3">v3</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPersona} onValueChange={(v) => setFilterPersona(v as Persona | 'all')}>
            <SelectTrigger className="w-[120px] h-8 text-xs bg-slate-900 border-slate-700">
              <SelectValue placeholder="Persona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Personas</SelectItem>
              <SelectItem value="CEO">CEO</SelectItem>
              <SelectItem value="CFO">CFO</SelectItem>
              <SelectItem value="Ops">Ops</SelectItem>
              <SelectItem value="Growth">Growth</SelectItem>
              <SelectItem value="CRM">CRM</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterOwner} onValueChange={setFilterOwner}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-slate-900 border-slate-700">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {owners.map(owner => (
                <SelectItem key={owner} value={owner}>{owner}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Decisions Table */}
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400 w-10"></TableHead>
                <TableHead className="text-slate-400">System</TableHead>
                <TableHead className="text-slate-400">Feature</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Version</TableHead>
                <TableHead className="text-slate-400">Priority</TableHead>
                <TableHead className="text-slate-400">Persona</TableHead>
                <TableHead className="text-slate-400">Owner</TableHead>
                <TableHead className="text-slate-400">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredDecisions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    No decisions match your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredDecisions.map((decision, index) => (
                  <motion.tr
                    key={decision.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-slate-800 hover:bg-slate-900/50"
                  >
                    <TableCell>
                      {hasMissingData(decision) && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </TableCell>
                    <TableCell>{getSystemBadge(decision.system)}</TableCell>
                    <TableCell>
                      <div className="text-slate-200">{decision.feature_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{decision.route}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(decision.status)}</TableCell>
                    <TableCell>
                      {decision.target_version ? (
                        <span className="text-xs text-slate-300">{decision.target_version}</span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {decision.priority ? (
                        <span className={`text-xs ${
                          decision.priority === 'P0' ? 'text-red-400' :
                          decision.priority === 'P1' ? 'text-amber-400' : 'text-slate-400'
                        }`}>{decision.priority}</span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {decision.persona ? (
                        <span className="text-xs text-slate-300">{decision.persona}</span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400">{decision.owner || '—'}</span>
                    </TableCell>
                    <TableCell>
                      {decision.data_entities.entities.length > 0 ? (
                        <span className="text-xs text-emerald-400">
                          {decision.data_entities.entities.length} entities
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">Not defined</span>
                      )}
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Showing {filteredDecisions.length} of {decisions.length} decisions
        </div>
      </main>
    </div>
  );
}
