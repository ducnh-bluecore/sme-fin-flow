import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Download,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Database,
  GitBranch,
  XCircle
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFeatureDecisions } from './hooks/useFeatureDecisions';
import { SystemType, FeatureDecision } from './types';

interface EntityUsage {
  entity: string;
  systems: SystemType[];
  features: string[];
  grains: string[];
  hasConflict: boolean;
}

interface TableUsage {
  table: string;
  type: 'serve' | 'dim';
  systems: SystemType[];
  features: string[];
}

interface DependencyUsage {
  name: string;
  type: 'pipeline' | 'upstream';
  systems: SystemType[];
  features: string[];
  isMissing: boolean;
}

export default function DataContractView() {
  const navigate = useNavigate();
  const { decisions, loading } = useFeatureDecisions();
  const [activeTab, setActiveTab] = useState('entities');

  // Filter to only BUILD decisions
  const buildDecisions = decisions.filter(d => d.status === 'BUILD');

  // Analyze entities across systems
  const entityAnalysis = useMemo((): EntityUsage[] => {
    const entityMap = new Map<string, EntityUsage>();
    
    buildDecisions.forEach(decision => {
      decision.data_entities.entities.forEach(entity => {
        const existing = entityMap.get(entity);
        if (existing) {
          if (!existing.systems.includes(decision.system)) {
            existing.systems.push(decision.system);
          }
          existing.features.push(decision.feature_name);
          if (decision.data_entities.grain && !existing.grains.includes(decision.data_entities.grain)) {
            existing.grains.push(decision.data_entities.grain);
          }
        } else {
          entityMap.set(entity, {
            entity,
            systems: [decision.system],
            features: [decision.feature_name],
            grains: decision.data_entities.grain ? [decision.data_entities.grain] : [],
            hasConflict: false,
          });
        }
      });
    });

    // Check for conflicts (same entity with different grains)
    entityMap.forEach(usage => {
      if (usage.grains.length > 1) {
        usage.hasConflict = true;
      }
    });

    return Array.from(entityMap.values()).sort((a, b) => b.systems.length - a.systems.length);
  }, [buildDecisions]);

  // Analyze tables across systems
  const tableAnalysis = useMemo((): TableUsage[] => {
    const tableMap = new Map<string, TableUsage>();
    
    buildDecisions.forEach(decision => {
      decision.required_tables.serve_tables.forEach(table => {
        const key = `serve:${table}`;
        const existing = tableMap.get(key);
        if (existing) {
          if (!existing.systems.includes(decision.system)) {
            existing.systems.push(decision.system);
          }
          existing.features.push(decision.feature_name);
        } else {
          tableMap.set(key, {
            table,
            type: 'serve',
            systems: [decision.system],
            features: [decision.feature_name],
          });
        }
      });

      decision.required_tables.dims.forEach(dim => {
        const key = `dim:${dim}`;
        const existing = tableMap.get(key);
        if (existing) {
          if (!existing.systems.includes(decision.system)) {
            existing.systems.push(decision.system);
          }
          existing.features.push(decision.feature_name);
        } else {
          tableMap.set(key, {
            table: dim,
            type: 'dim',
            systems: [decision.system],
            features: [decision.feature_name],
          });
        }
      });
    });

    return Array.from(tableMap.values()).sort((a, b) => b.systems.length - a.systems.length);
  }, [buildDecisions]);

  // Analyze dependencies
  const dependencyAnalysis = useMemo((): DependencyUsage[] => {
    const depMap = new Map<string, DependencyUsage>();
    
    buildDecisions.forEach(decision => {
      decision.dependencies.pipelines.forEach(pipeline => {
        const key = `pipeline:${pipeline}`;
        const existing = depMap.get(key);
        if (existing) {
          if (!existing.systems.includes(decision.system)) {
            existing.systems.push(decision.system);
          }
          existing.features.push(decision.feature_name);
        } else {
          depMap.set(key, {
            name: pipeline,
            type: 'pipeline',
            systems: [decision.system],
            features: [decision.feature_name],
            isMissing: false, // Would need external validation
          });
        }
      });

      decision.dependencies.upstream.forEach(upstream => {
        const key = `upstream:${upstream}`;
        const existing = depMap.get(key);
        if (existing) {
          if (!existing.systems.includes(decision.system)) {
            existing.systems.push(decision.system);
          }
          existing.features.push(decision.feature_name);
        } else {
          depMap.set(key, {
            name: upstream,
            type: 'upstream',
            systems: [decision.system],
            features: [decision.feature_name],
            isMissing: false,
          });
        }
      });
    });

    return Array.from(depMap.values()).sort((a, b) => b.systems.length - a.systems.length);
  }, [buildDecisions]);

  // Find features with missing data requirements
  const missingDataFeatures = buildDecisions.filter(d => 
    d.data_entities.entities.length === 0 || !d.data_entities.grain
  );

  // Export functions
  const exportAsCSV = () => {
    const rows = [
      ['Entity', 'Systems', 'Features', 'Grains', 'Has Conflict'],
      ...entityAnalysis.map(e => [
        e.entity,
        e.systems.join('; '),
        e.features.join('; '),
        e.grains.join('; '),
        e.hasConflict ? 'Yes' : 'No'
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data-contracts.csv';
    a.click();
  };

  const exportAsJSON = () => {
    const data = {
      entities: entityAnalysis,
      tables: tableAnalysis,
      dependencies: dependencyAnalysis,
      missingDataFeatures: missingDataFeatures.map(f => ({
        system: f.system,
        feature: f.feature_name,
        route: f.route,
      })),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data-contracts.json';
    a.click();
  };

  const getSystemBadge = (system: SystemType) => {
    const colors: Record<SystemType, string> = {
      'FDP': 'bg-emerald-900/30 text-emerald-400 border-emerald-700/30',
      'MDP': 'bg-blue-900/30 text-blue-400 border-blue-700/30',
      'Control Tower': 'bg-amber-900/30 text-amber-400 border-amber-700/30',
      'CDP': 'bg-purple-900/30 text-purple-400 border-purple-700/30',
    };
    return (
      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors[system]} mr-1`}>
        {system}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
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
                  Shared Data Contract View
                </h1>
                <p className="text-slate-400 text-sm">
                  Architectural alignment across systems
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportAsCSV} className="border-slate-700">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportAsJSON} className="border-slate-700">
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-500">Shared Entities</span>
            </div>
            <div className="text-2xl font-semibold text-slate-200">
              {entityAnalysis.filter(e => e.systems.length > 1).length}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-500">Shared Tables</span>
            </div>
            <div className="text-2xl font-semibold text-slate-200">
              {tableAnalysis.filter(t => t.systems.length > 1).length}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-500">Dependencies</span>
            </div>
            <div className="text-2xl font-semibold text-slate-200">
              {dependencyAnalysis.length}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-700/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-slate-500">Conflicts</span>
            </div>
            <div className="text-2xl font-semibold text-amber-400">
              {entityAnalysis.filter(e => e.hasConflict).length}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-red-950/30 border border-red-700/20">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-slate-500">Missing Data</span>
            </div>
            <div className="text-2xl font-semibold text-red-400">
              {missingDataFeatures.length}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="entities">Entities</TabsTrigger>
            <TabsTrigger value="tables">Tables</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            <TabsTrigger value="gaps">Gaps & Conflicts</TabsTrigger>
          </TabsList>

          <TabsContent value="entities" className="mt-4">
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Entity</TableHead>
                    <TableHead className="text-slate-400">Systems</TableHead>
                    <TableHead className="text-slate-400">Grains</TableHead>
                    <TableHead className="text-slate-400">Features Using</TableHead>
                    <TableHead className="text-slate-400 w-20">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entityAnalysis.map((entity, index) => (
                    <motion.tr
                      key={entity.entity}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-slate-800 hover:bg-slate-900/50"
                    >
                      <TableCell className="font-medium text-slate-200">
                        {entity.entity}
                      </TableCell>
                      <TableCell>
                        {entity.systems.map(s => getSystemBadge(s))}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {entity.grains.map(g => (
                            <span key={g} className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {g}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {entity.features.length} features
                      </TableCell>
                      <TableCell>
                        {entity.hasConflict ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            Conflict
                          </span>
                        ) : entity.systems.length > 1 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Shared
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Single</span>
                        )}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="tables" className="mt-4">
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Table</TableHead>
                    <TableHead className="text-slate-400">Type</TableHead>
                    <TableHead className="text-slate-400">Systems</TableHead>
                    <TableHead className="text-slate-400">Features Using</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableAnalysis.map((table, index) => (
                    <motion.tr
                      key={`${table.type}-${table.table}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-slate-800 hover:bg-slate-900/50"
                    >
                      <TableCell className="font-mono text-sm text-slate-200">
                        {table.table}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          table.type === 'serve' 
                            ? 'bg-blue-900/30 text-blue-400 border border-blue-700/30'
                            : 'bg-purple-900/30 text-purple-400 border border-purple-700/30'
                        }`}>
                          {table.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {table.systems.map(s => getSystemBadge(s))}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {table.features.length} features
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="dependencies" className="mt-4">
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Dependency</TableHead>
                    <TableHead className="text-slate-400">Type</TableHead>
                    <TableHead className="text-slate-400">Systems</TableHead>
                    <TableHead className="text-slate-400">Features Using</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dependencyAnalysis.map((dep, index) => (
                    <motion.tr
                      key={`${dep.type}-${dep.name}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-slate-800 hover:bg-slate-900/50"
                    >
                      <TableCell className="font-mono text-sm text-slate-200">
                        {dep.name}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          dep.type === 'pipeline' 
                            ? 'bg-amber-900/30 text-amber-400 border border-amber-700/30'
                            : 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/30'
                        }`}>
                          {dep.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {dep.systems.map(s => getSystemBadge(s))}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {dep.features.length} features
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="gaps" className="mt-4">
            <div className="space-y-6">
              {/* Conflicts */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Grain Conflicts
                </h3>
                {entityAnalysis.filter(e => e.hasConflict).length === 0 ? (
                  <div className="text-sm text-slate-500 p-4 rounded-lg bg-slate-900/30 border border-slate-800">
                    No grain conflicts detected
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-700/30 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-amber-700/30 hover:bg-transparent bg-amber-950/20">
                          <TableHead className="text-slate-400">Entity</TableHead>
                          <TableHead className="text-slate-400">Conflicting Grains</TableHead>
                          <TableHead className="text-slate-400">Systems</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entityAnalysis.filter(e => e.hasConflict).map(entity => (
                          <TableRow key={entity.entity} className="border-amber-700/30">
                            <TableCell className="font-medium text-slate-200">
                              {entity.entity}
                            </TableCell>
                            <TableCell>
                              {entity.grains.map(g => (
                                <span key={g} className="text-xs px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-300 mr-1">
                                  {g}
                                </span>
                              ))}
                            </TableCell>
                            <TableCell>
                              {entity.systems.map(s => getSystemBadge(s))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Missing Data Requirements */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Missing Data Requirements
                </h3>
                {missingDataFeatures.length === 0 ? (
                  <div className="text-sm text-slate-500 p-4 rounded-lg bg-slate-900/30 border border-slate-800">
                    All BUILD features have data requirements defined
                  </div>
                ) : (
                  <div className="rounded-lg border border-red-700/30 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-red-700/30 hover:bg-transparent bg-red-950/20">
                          <TableHead className="text-slate-400">System</TableHead>
                          <TableHead className="text-slate-400">Feature</TableHead>
                          <TableHead className="text-slate-400">Route</TableHead>
                          <TableHead className="text-slate-400">Missing</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {missingDataFeatures.map(feature => (
                          <TableRow key={feature.id} className="border-red-700/30">
                            <TableCell>{getSystemBadge(feature.system)}</TableCell>
                            <TableCell className="text-slate-200">{feature.feature_name}</TableCell>
                            <TableCell className="font-mono text-xs text-slate-400">{feature.route}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {feature.data_entities.entities.length === 0 && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/30 text-red-300">
                                    entities
                                  </span>
                                )}
                                {!feature.data_entities.grain && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/30 text-red-300">
                                    grain
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
