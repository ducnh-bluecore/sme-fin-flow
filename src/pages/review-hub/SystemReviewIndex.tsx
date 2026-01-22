import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  Save,
  Clock,
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

  const inputStyles = "h-9 text-sm bg-[hsl(222,20%,12%)] border-[hsl(222,15%,22%)] text-slate-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20";
  const labelStyles = "text-xs font-medium text-amber-400/80 uppercase tracking-wider";
  const tagBaseStyles = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium";

  return (
    <div className="space-y-5 pt-4 border-t border-[hsl(222,15%,18%)]">
      <h4 className="text-sm font-semibold text-slate-200">Data Requirements</h4>
      
      {/* Entities */}
      <div className="space-y-2">
        <label className={labelStyles}>Entities</label>
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {decision.data_entities.entities.map(entity => (
            <span key={entity} className={`${tagBaseStyles} bg-[hsl(222,20%,15%)] text-slate-300 border border-[hsl(222,15%,25%)]`}>
              {entity}
              <button onClick={() => removeEntity(entity)} className="hover:text-red-400 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Select value={newEntity} onValueChange={setNewEntity}>
            <SelectTrigger className={`flex-1 ${inputStyles}`}>
              <SelectValue placeholder="Select entity" />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(222,20%,12%)] border-[hsl(222,15%,22%)]">
              {ENTITY_OPTIONS.map(opt => (
                <SelectItem key={opt} value={opt} className="text-slate-200 focus:bg-[hsl(222,20%,18%)] focus:text-white">{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" variant="outline" onClick={addEntity} className="h-9 w-9 border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grain */}
      <div className="space-y-2">
        <label className={labelStyles}>Grain</label>
        <Select value={decision.data_entities.grain || ''} onValueChange={setGrain}>
          <SelectTrigger className={inputStyles}>
            <SelectValue placeholder="Select grain" />
          </SelectTrigger>
          <SelectContent className="bg-[hsl(222,20%,12%)] border-[hsl(222,15%,22%)]">
            {GRAIN_OPTIONS.map(opt => (
              <SelectItem key={opt} value={opt} className="text-slate-200 focus:bg-[hsl(222,20%,18%)] focus:text-white">{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Serve Tables */}
      <div className="space-y-2">
        <label className={labelStyles}>Required Serve Tables</label>
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {decision.required_tables.serve_tables.map(table => (
            <span key={table} className={`${tagBaseStyles} bg-blue-950/50 text-blue-300 border border-blue-700/40`}>
              {table}
              <button onClick={() => removeServeTable(table)} className="hover:text-red-400 transition-colors">
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
            className={`flex-1 ${inputStyles}`}
            onKeyDown={(e) => e.key === 'Enter' && addServeTable()}
          />
          <Button size="icon" variant="outline" onClick={addServeTable} className="h-9 w-9 border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-2">
        <label className={labelStyles}>Dimension Tables</label>
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {decision.required_tables.dims.map(dim => (
            <span key={dim} className={`${tagBaseStyles} bg-purple-950/50 text-purple-300 border border-purple-700/40`}>
              {dim}
              <button onClick={() => removeDim(dim)} className="hover:text-red-400 transition-colors">
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
            className={`flex-1 ${inputStyles}`}
            onKeyDown={(e) => e.key === 'Enter' && addDim()}
          />
          <Button size="icon" variant="outline" onClick={addDim} className="h-9 w-9 border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Pipelines */}
      <div className="space-y-2">
        <label className={labelStyles}>Pipeline Dependencies</label>
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {decision.dependencies.pipelines.map(pipeline => (
            <span key={pipeline} className={`${tagBaseStyles} bg-amber-950/50 text-amber-300 border border-amber-700/40`}>
              {pipeline}
              <button onClick={() => removePipeline(pipeline)} className="hover:text-red-400 transition-colors">
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
            className={`flex-1 ${inputStyles}`}
            onKeyDown={(e) => e.key === 'Enter' && addPipeline()}
          />
          <Button size="icon" variant="outline" onClick={addPipeline} className="h-9 w-9 border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Upstream */}
      <div className="space-y-2">
        <label className={labelStyles}>Upstream Marts</label>
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {decision.dependencies.upstream.map(upstream => (
            <span key={upstream} className={`${tagBaseStyles} bg-emerald-950/50 text-emerald-300 border border-emerald-700/40`}>
              {upstream}
              <button onClick={() => removeUpstream(upstream)} className="hover:text-red-400 transition-colors">
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
            className={`flex-1 ${inputStyles}`}
            onKeyDown={(e) => e.key === 'Enter' && addUpstream()}
          />
          <Button size="icon" variant="outline" onClick={addUpstream} className="h-9 w-9 border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400">
            <Plus className="h-4 w-4" />
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

  const inputStyles = "h-9 text-sm bg-[hsl(222,20%,12%)] border-[hsl(222,15%,22%)] text-slate-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20";
  const labelStyles = "text-xs font-medium text-amber-400/80 uppercase tracking-wider";
  const selectTriggerStyles = "h-8 text-xs bg-[hsl(222,20%,14%)] border-[hsl(222,15%,25%)] text-slate-200 hover:border-[hsl(222,15%,35%)]";

  return (
    <div className="rounded-lg overflow-hidden border border-[hsl(222,15%,18%)] bg-[hsl(222,20%,10%)]">
      {/* Main Row */}
      <div 
        className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-[hsl(222,20%,12%)] ${expanded ? 'bg-[hsl(222,20%,11%)]' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <Clock className="h-4 w-4 text-slate-500 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-100">{decision.feature_name}</div>
          <div className="text-xs text-slate-500 font-mono mt-0.5">{decision.route}</div>
        </div>

        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {decision.is_live ? (
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              LIVE
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded text-xs font-medium bg-[hsl(222,20%,15%)] text-slate-400 border border-[hsl(222,15%,25%)]">
              PLANNED
            </span>
          )}

          <Select 
            value={currentValue('status')} 
            onValueChange={(v) => handleChange({ status: v as DecisionStatus })}
          >
            <SelectTrigger className={`w-[100px] ${selectTriggerStyles}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(222,20%,12%)] border-[hsl(222,15%,22%)]">
              <SelectItem value="BUILD" className="text-emerald-400 focus:bg-emerald-950/50 focus:text-emerald-300">BUILD</SelectItem>
              <SelectItem value="HOLD" className="text-amber-400 focus:bg-amber-950/50 focus:text-amber-300">HOLD</SelectItem>
              <SelectItem value="DROP" className="text-red-400 focus:bg-red-950/50 focus:text-red-300">DROP</SelectItem>
              <SelectItem value="PENDING" className="text-slate-400 focus:bg-slate-800 focus:text-slate-300">PENDING</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={currentValue('target_version') || ''} 
            onValueChange={(v) => handleChange({ target_version: v as TargetVersion })}
          >
            <SelectTrigger className={`w-[70px] ${selectTriggerStyles}`}>
              <SelectValue placeholder="Ver" />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(222,20%,12%)] border-[hsl(222,15%,22%)]">
              <SelectItem value="v1" className="text-slate-200 focus:bg-[hsl(222,20%,18%)] focus:text-white">v1</SelectItem>
              <SelectItem value="v2" className="text-slate-200 focus:bg-[hsl(222,20%,18%)] focus:text-white">v2</SelectItem>
              <SelectItem value="v3" className="text-slate-200 focus:bg-[hsl(222,20%,18%)] focus:text-white">v3</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={currentValue('priority') || ''} 
            onValueChange={(v) => handleChange({ priority: v as Priority })}
          >
            <SelectTrigger className={`w-[70px] ${selectTriggerStyles}`}>
              <SelectValue placeholder="Pri" />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(222,20%,12%)] border-[hsl(222,15%,22%)]">
              <SelectItem value="P0" className="text-red-400 focus:bg-red-950/50 focus:text-red-300">P0</SelectItem>
              <SelectItem value="P1" className="text-amber-400 focus:bg-amber-950/50 focus:text-amber-300">P1</SelectItem>
              <SelectItem value="P2" className="text-blue-400 focus:bg-blue-950/50 focus:text-blue-300">P2</SelectItem>
              <SelectItem value="P3" className="text-slate-400 focus:bg-slate-800 focus:text-slate-300">P3</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={currentValue('persona') || ''} 
            onValueChange={(v) => handleChange({ persona: v as Persona })}
          >
            <SelectTrigger className={`w-[100px] ${selectTriggerStyles}`}>
              <SelectValue placeholder="Persona" />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(222,20%,12%)] border-[hsl(222,15%,22%)]">
              <SelectItem value="CEO" className="text-slate-200 focus:bg-[hsl(222,20%,18%)] focus:text-white">CEO</SelectItem>
              <SelectItem value="CFO" className="text-slate-200 focus:bg-[hsl(222,20%,18%)] focus:text-white">CFO</SelectItem>
              <SelectItem value="Ops" className="text-slate-200 focus:bg-[hsl(222,20%,18%)] focus:text-white">Ops</SelectItem>
              <SelectItem value="Growth" className="text-slate-200 focus:bg-[hsl(222,20%,18%)] focus:text-white">Growth</SelectItem>
              <SelectItem value="CRM" className="text-slate-200 focus:bg-[hsl(222,20%,18%)] focus:text-white">CRM</SelectItem>
              <SelectItem value="Finance Director" className="text-slate-200 focus:bg-[hsl(222,20%,18%)] focus:text-white">Finance Director</SelectItem>
              <SelectItem value="Marketing Analyst" className="text-slate-200 focus:bg-[hsl(222,20%,18%)] focus:text-white">Marketing Analyst</SelectItem>
              <SelectItem value="Product Manager" className="text-slate-200 focus:bg-[hsl(222,20%,18%)] focus:text-white">Product Manager</SelectItem>
            </SelectContent>
          </Select>

          <button 
            className="p-2 rounded-md hover:bg-[hsl(222,20%,18%)] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-5 space-y-5 border-t border-[hsl(222,15%,15%)] bg-[hsl(222,20%,9%)]">
              {/* Owner & Reviewed By */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className={labelStyles}>Owner</label>
                  <Input
                    value={currentValue('owner') || ''}
                    onChange={(e) => handleChange({ owner: e.target.value })}
                    placeholder="Feature owner"
                    className={inputStyles}
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelStyles}>Reviewed By</label>
                  <Input
                    value={currentValue('reviewed_by') || ''}
                    onChange={(e) => handleChange({ reviewed_by: e.target.value })}
                    placeholder="Reviewer name"
                    className={inputStyles}
                  />
                </div>
              </div>

              {/* Rationale */}
              <div className="space-y-2">
                <label className={labelStyles}>Rationale / Notes</label>
                <Textarea
                  value={currentValue('rationale') || ''}
                  onChange={(e) => handleChange({ rationale: e.target.value })}
                  placeholder="Why this decision was made..."
                  className={`min-h-[80px] text-sm bg-[hsl(222,20%,12%)] border-[hsl(222,15%,22%)] text-slate-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 resize-none`}
                />
              </div>

              {/* Data Requirements */}
              <DataRequirementsEditor 
                decision={{ ...decision, ...localChanges } as FeatureDecision}
                onUpdate={handleChange}
              />

              {/* Save Button */}
              {hasChanges && (
                <div className="flex justify-end pt-4 border-t border-[hsl(222,15%,15%)]">
                  <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

  if (!decodedSystem || !SYSTEM_ROUTES[decodedSystem]) {
    return (
      <div className="min-h-screen bg-[hsl(222,20%,8%)] flex items-center justify-center">
        <div className="text-slate-400">System not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(222,20%,8%)] text-slate-100">
      {/* Header */}
      <header className="border-b border-[hsl(222,15%,15%)] bg-[hsl(222,20%,10%)] backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/review-hub')}
              className="hover:bg-[hsl(222,20%,15%)] text-slate-400"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-emerald-400">
                {decodedSystem} Review
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                {SYSTEM_INFO[decodedSystem]?.tagline} • {SYSTEM_ROUTES[decodedSystem].length} routes
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Column Headers */}
        <div className="flex items-center gap-4 px-5 py-3 bg-[hsl(222,20%,10%)] rounded-lg border border-[hsl(222,15%,15%)] mb-4">
          <div className="w-4" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">FEATURE</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-[65px] text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">STATUS</span>
            <span className="w-[100px] text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">DECISION</span>
            <span className="w-[70px] text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">VERSION</span>
            <span className="w-[70px] text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">PRIORITY</span>
            <span className="w-[100px] text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">PERSONA</span>
            <div className="w-10" />
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
