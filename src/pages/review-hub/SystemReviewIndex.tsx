import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Save,
  CheckCircle2,
  Clock,
  XCircle,
  Pause,
  ChevronDown,
  ChevronUp,
  Plus,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  SYSTEM_ROUTES, 
  SYSTEM_INFO,
  DecisionStatus,
  TargetVersion,
  Priority,
  Persona,
  ENTITY_OPTIONS,
  GRAIN_OPTIONS,
  FeatureDecision,
  STATUS_INFO,
  PRIORITY_INFO,
  VERSION_INFO,
} from './types';
import { toast } from 'sonner';

function DataRequirementsEditor({ 
  decision, 
  onUpdate 
}: { 
  decision: FeatureDecision;
  onUpdate: (updates: Partial<FeatureDecision>) => void;
}) {
  const [newEntity, setNewEntity] = useState('');
  const [newServeTable, setNewServeTable] = useState('');
  const [newDim, setNewDim] = useState('');
  const [newPipeline, setNewPipeline] = useState('');
  const [newUpstream, setNewUpstream] = useState('');

  const addEntity = () => {
    if (newEntity && !decision.data_entities.entities.includes(newEntity)) {
      onUpdate({
        data_entities: {
          ...decision.data_entities,
          entities: [...decision.data_entities.entities, newEntity]
        }
      });
      setNewEntity('');
    }
  };

  const removeEntity = (entity: string) => {
    onUpdate({
      data_entities: {
        ...decision.data_entities,
        entities: decision.data_entities.entities.filter(e => e !== entity)
      }
    });
  };

  const setGrain = (grain: string) => {
    onUpdate({
      data_entities: {
        ...decision.data_entities,
        grain
      }
    });
  };

  const addServeTable = () => {
    if (newServeTable && !decision.required_tables.serve_tables.includes(newServeTable)) {
      onUpdate({
        required_tables: {
          ...decision.required_tables,
          serve_tables: [...decision.required_tables.serve_tables, newServeTable]
        }
      });
      setNewServeTable('');
    }
  };

  const removeServeTable = (table: string) => {
    onUpdate({
      required_tables: {
        ...decision.required_tables,
        serve_tables: decision.required_tables.serve_tables.filter(t => t !== table)
      }
    });
  };

  const addDim = () => {
    if (newDim && !decision.required_tables.dims.includes(newDim)) {
      onUpdate({
        required_tables: {
          ...decision.required_tables,
          dims: [...decision.required_tables.dims, newDim]
        }
      });
      setNewDim('');
    }
  };

  const removeDim = (dim: string) => {
    onUpdate({
      required_tables: {
        ...decision.required_tables,
        dims: decision.required_tables.dims.filter(d => d !== dim)
      }
    });
  };

  const addPipeline = () => {
    if (newPipeline && !decision.dependencies.pipelines.includes(newPipeline)) {
      onUpdate({
        dependencies: {
          ...decision.dependencies,
          pipelines: [...decision.dependencies.pipelines, newPipeline]
        }
      });
      setNewPipeline('');
    }
  };

  const removePipeline = (pipeline: string) => {
    onUpdate({
      dependencies: {
        ...decision.dependencies,
        pipelines: decision.dependencies.pipelines.filter(p => p !== pipeline)
      }
    });
  };

  const addUpstream = () => {
    if (newUpstream && !decision.dependencies.upstream.includes(newUpstream)) {
      onUpdate({
        dependencies: {
          ...decision.dependencies,
          upstream: [...decision.dependencies.upstream, newUpstream]
        }
      });
      setNewUpstream('');
    }
  };

  const removeUpstream = (upstream: string) => {
    onUpdate({
      dependencies: {
        ...decision.dependencies,
        upstream: decision.dependencies.upstream.filter(u => u !== upstream)
      }
    });
  };

  return (
    <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
      <h4 className="text-sm font-medium text-slate-300">Data Requirements</h4>
      
      {/* Entities */}
      <div className="space-y-2">
        <label className="text-xs text-slate-500">Entities</label>
        <div className="flex flex-wrap gap-2">
          {decision.data_entities.entities.map(entity => (
            <span key={entity} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-xs text-slate-300">
              {entity}
              <button onClick={() => removeEntity(entity)} className="hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Select value={newEntity} onValueChange={setNewEntity}>
            <SelectTrigger className="flex-1 h-8 text-xs bg-slate-900 border-slate-700">
              <SelectValue placeholder="Select entity" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_OPTIONS.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={addEntity} className="h-8 border-slate-700">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Grain */}
      <div className="space-y-2">
        <label className="text-xs text-slate-500">Grain</label>
        <Select value={decision.data_entities.grain || ''} onValueChange={setGrain}>
          <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700">
            <SelectValue placeholder="Select grain" />
          </SelectTrigger>
          <SelectContent>
            {GRAIN_OPTIONS.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Serve Tables */}
      <div className="space-y-2">
        <label className="text-xs text-slate-500">Required Serve Tables</label>
        <div className="flex flex-wrap gap-2">
          {decision.required_tables.serve_tables.map(table => (
            <span key={table} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-900/30 text-xs text-blue-300 border border-blue-700/30">
              {table}
              <button onClick={() => removeServeTable(table)} className="hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newServeTable}
            onChange={(e) => setNewServeTable(e.target.value)}
            placeholder="Table name"
            className="flex-1 h-8 text-xs bg-slate-900 border-slate-700"
            onKeyDown={(e) => e.key === 'Enter' && addServeTable()}
          />
          <Button size="sm" variant="outline" onClick={addServeTable} className="h-8 border-slate-700">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-2">
        <label className="text-xs text-slate-500">Dimension Tables</label>
        <div className="flex flex-wrap gap-2">
          {decision.required_tables.dims.map(dim => (
            <span key={dim} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-900/30 text-xs text-purple-300 border border-purple-700/30">
              {dim}
              <button onClick={() => removeDim(dim)} className="hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newDim}
            onChange={(e) => setNewDim(e.target.value)}
            placeholder="Dimension name"
            className="flex-1 h-8 text-xs bg-slate-900 border-slate-700"
            onKeyDown={(e) => e.key === 'Enter' && addDim()}
          />
          <Button size="sm" variant="outline" onClick={addDim} className="h-8 border-slate-700">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Pipelines */}
      <div className="space-y-2">
        <label className="text-xs text-slate-500">Pipeline Dependencies</label>
        <div className="flex flex-wrap gap-2">
          {decision.dependencies.pipelines.map(pipeline => (
            <span key={pipeline} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-900/30 text-xs text-amber-300 border border-amber-700/30">
              {pipeline}
              <button onClick={() => removePipeline(pipeline)} className="hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newPipeline}
            onChange={(e) => setNewPipeline(e.target.value)}
            placeholder="Pipeline name"
            className="flex-1 h-8 text-xs bg-slate-900 border-slate-700"
            onKeyDown={(e) => e.key === 'Enter' && addPipeline()}
          />
          <Button size="sm" variant="outline" onClick={addPipeline} className="h-8 border-slate-700">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Upstream */}
      <div className="space-y-2">
        <label className="text-xs text-slate-500">Upstream Marts</label>
        <div className="flex flex-wrap gap-2">
          {decision.dependencies.upstream.map(upstream => (
            <span key={upstream} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-900/30 text-xs text-emerald-300 border border-emerald-700/30">
              {upstream}
              <button onClick={() => removeUpstream(upstream)} className="hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newUpstream}
            onChange={(e) => setNewUpstream(e.target.value)}
            placeholder="Upstream mart name"
            className="flex-1 h-8 text-xs bg-slate-900 border-slate-700"
            onKeyDown={(e) => e.key === 'Enter' && addUpstream()}
          />
          <Button size="sm" variant="outline" onClick={addUpstream} className="h-8 border-slate-700">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function DecisionRow({ 
  decision, 
  onUpdate,
  onSave
}: { 
  decision: FeatureDecision;
  onUpdate: (updates: Partial<FeatureDecision>) => void;
  onSave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [localChanges, setLocalChanges] = useState<Partial<FeatureDecision>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (updates: Partial<FeatureDecision>) => {
    setLocalChanges(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate(localChanges);
    setHasChanges(false);
    setLocalChanges({});
    onSave();
  };

  const currentValue = <K extends keyof FeatureDecision>(key: K): FeatureDecision[K] => {
    return (localChanges[key] ?? decision[key]) as FeatureDecision[K];
  };

  const getStatusIcon = (status: DecisionStatus) => {
    const icons: Record<DecisionStatus, React.ElementType> = {
      BUILD: CheckCircle2,
      HOLD: Pause,
      DROP: XCircle,
      PENDING: Clock,
    };
    return icons[status];
  };

  const getStatusColor = (status: DecisionStatus) => {
    const colors: Record<DecisionStatus, string> = {
      BUILD: 'text-emerald-500',
      HOLD: 'text-amber-500',
      DROP: 'text-red-500',
      PENDING: 'text-slate-500',
    };
    return colors[status];
  };

  const StatusIcon = getStatusIcon(currentValue('status'));

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      {/* Main Row */}
      <div className="flex items-center gap-4 p-4 bg-slate-900/30">
        <StatusIcon className={`h-4 w-4 ${getStatusColor(currentValue('status'))}`} />
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-200 truncate">{decision.feature_name}</div>
          <div className="text-xs text-slate-500 font-mono">{decision.route}</div>
        </div>

        <div className="flex items-center gap-3">
          {decision.is_live ? (
            <span className="px-2 py-0.5 rounded text-xs bg-emerald-900/30 text-emerald-400 border border-emerald-700/30">
              LIVE
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-500">
              COMING SOON
            </span>
          )}

          <Select 
            value={currentValue('status')} 
            onValueChange={(v) => handleChange({ status: v as DecisionStatus })}
          >
            <SelectTrigger className="w-[110px] h-8 text-xs bg-slate-900 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUILD">BUILD</SelectItem>
              <SelectItem value="HOLD">HOLD</SelectItem>
              <SelectItem value="DROP">DROP</SelectItem>
              <SelectItem value="PENDING">PENDING</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={currentValue('target_version') || ''} 
            onValueChange={(v) => handleChange({ target_version: v as TargetVersion })}
          >
            <SelectTrigger className="w-[80px] h-8 text-xs bg-slate-900 border-slate-700">
              <SelectValue placeholder="Ver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="v1">v1</SelectItem>
              <SelectItem value="v2">v2</SelectItem>
              <SelectItem value="v3">v3</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={currentValue('priority') || ''} 
            onValueChange={(v) => handleChange({ priority: v as Priority })}
          >
            <SelectTrigger className="w-[80px] h-8 text-xs bg-slate-900 border-slate-700">
              <SelectValue placeholder="Pri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="P0">P0 Critical</SelectItem>
              <SelectItem value="P1">P1 High</SelectItem>
              <SelectItem value="P2">P2 Medium</SelectItem>
              <SelectItem value="P3">P3 Low</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={currentValue('persona') || ''} 
            onValueChange={(v) => handleChange({ persona: v as Persona })}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs bg-slate-900 border-slate-700">
              <SelectValue placeholder="Persona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CEO">CEO</SelectItem>
              <SelectItem value="CFO">CFO</SelectItem>
              <SelectItem value="Ops">Ops</SelectItem>
              <SelectItem value="Growth">Growth</SelectItem>
              <SelectItem value="CRM">CRM</SelectItem>
              <SelectItem value="Finance Director">Finance Director</SelectItem>
              <SelectItem value="Marketing Analyst">Marketing Analyst</SelectItem>
              <SelectItem value="Product Manager">Product Manager</SelectItem>
            </SelectContent>
          </Select>

          {hasChanges && (
            <Button size="sm" onClick={handleSave} className="h-8 bg-emerald-600 hover:bg-emerald-700">
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          )}

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-slate-800"
        >
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Owner</label>
                <Input
                  value={currentValue('owner') || ''}
                  onChange={(e) => handleChange({ owner: e.target.value })}
                  placeholder="Feature owner"
                  className="h-8 text-sm bg-slate-900 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Reviewed By</label>
                <Input
                  value={currentValue('reviewed_by') || ''}
                  onChange={(e) => handleChange({ reviewed_by: e.target.value })}
                  placeholder="Reviewer name"
                  className="h-8 text-sm bg-slate-900 border-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-500">Rationale / Notes</label>
              <Textarea
                value={currentValue('rationale') || ''}
                onChange={(e) => handleChange({ rationale: e.target.value })}
                placeholder="Why this decision was made..."
                className="min-h-[80px] text-sm bg-slate-900 border-slate-700"
              />
            </div>

            <DataRequirementsEditor 
              decision={{ ...decision, ...localChanges } as FeatureDecision}
              onUpdate={handleChange}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function SystemReviewIndex() {
  const navigate = useNavigate();
  const { system } = useParams<{ system: string }>();
  const decodedSystem = decodeURIComponent(system || '') as SystemType;
  
  const { decisions, loading, initializeSystemDecisions, updateDecision } = useFeatureDecisions(decodedSystem);

  useEffect(() => {
    if (decodedSystem && SYSTEM_ROUTES[decodedSystem]) {
      initializeSystemDecisions(decodedSystem);
    }
  }, [decodedSystem]);

  const handleUpdate = async (id: string, updates: Partial<FeatureDecision>) => {
    const success = await updateDecision(id, updates);
    if (success) {
      toast.success('Decision saved');
    }
  };

  const systemColors: Record<SystemType, { bg: string; border: string; text: string }> = {
    'FDP': { bg: 'bg-emerald-950/20', border: 'border-emerald-700/30', text: 'text-emerald-400' },
    'MDP': { bg: 'bg-blue-950/20', border: 'border-blue-700/30', text: 'text-blue-400' },
    'Control Tower': { bg: 'bg-amber-950/20', border: 'border-amber-700/30', text: 'text-amber-400' },
    'CDP': { bg: 'bg-purple-950/20', border: 'border-purple-700/30', text: 'text-purple-400' },
  };

  const colors = systemColors[decodedSystem] || systemColors['FDP'];

  if (!decodedSystem || !SYSTEM_ROUTES[decodedSystem]) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">System not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className={`border-b border-slate-800 ${colors.bg} backdrop-blur-sm sticky top-0 z-10`}>
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
              <h1 className={`text-xl font-semibold ${colors.text}`}>
                {decodedSystem} Review
              </h1>
              <p className="text-slate-400 text-sm">
                {SYSTEM_INFO[decodedSystem]?.tagline} • {SYSTEM_ROUTES[decodedSystem].length} routes
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* Column Headers */}
        <div className="flex items-center gap-4 px-4 py-3 bg-slate-900/50 rounded-t-lg border border-slate-800 mb-1">
          <div className="w-4" /> {/* Status icon placeholder */}
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Feature</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-[70px] text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Status</span>
            <span className="w-[110px] text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Decision</span>
            <span className="w-[80px] text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Version</span>
            <span className="w-[80px] text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Priority</span>
            <span className="w-[100px] text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Persona</span>
            <div className="w-8" /> {/* Expand button placeholder */}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : (
          <div className="space-y-3">
            {decisions.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Initializing decisions...
              </div>
            ) : (
              decisions.map((decision) => (
                <DecisionRow
                  key={decision.id}
                  decision={decision}
                  onUpdate={(updates) => handleUpdate(decision.id, updates)}
                  onSave={() => {}}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
