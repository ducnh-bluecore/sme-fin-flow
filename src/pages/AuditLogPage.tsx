import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  ScrollText, 
  Filter,
  Download,
  Search,
  User,
  Clock,
  Activity,
  Eye,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Settings,
  FileText,
  Plus,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuditLogs, useAuditLogStats } from '@/hooks/useAuditLogs';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AuditLogPage() {
  const { data: logs, isLoading: logsLoading } = useAuditLogs();
  const { data: stats, isLoading: statsLoading } = useAuditLogStats();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const { t, language } = useLanguage();

  const actionConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
    view: { label: t('auditLog.actionView'), icon: Eye, color: 'text-info', bg: 'bg-info/10' },
    select: { label: t('auditLog.actionView'), icon: Eye, color: 'text-info', bg: 'bg-info/10' },
    edit: { label: t('auditLog.actionEdit'), icon: Edit, color: 'text-warning', bg: 'bg-warning/10' },
    update: { label: t('auditLog.actionUpdate'), icon: Edit, color: 'text-warning', bg: 'bg-warning/10' },
    create: { label: t('auditLog.actionCreate'), icon: Plus, color: 'text-success', bg: 'bg-success/10' },
    insert: { label: t('auditLog.actionCreate'), icon: Plus, color: 'text-success', bg: 'bg-success/10' },
    delete: { label: t('auditLog.actionDelete'), icon: Trash2, color: 'text-destructive', bg: 'bg-destructive/10' },
    login: { label: t('auditLog.actionLogin'), icon: LogIn, color: 'text-primary', bg: 'bg-primary/10' },
    logout: { label: t('auditLog.actionLogout'), icon: LogOut, color: 'text-muted-foreground', bg: 'bg-muted' },
    export: { label: t('auditLog.actionExport'), icon: Download, color: 'text-info', bg: 'bg-info/10' },
    settings: { label: t('auditLog.actionSettings'), icon: Settings, color: 'text-warning', bg: 'bg-warning/10' },
  };

  const defaultAction = { label: t('auditLog.actionOther'), icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted' };

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    return logs.filter(log => {
      const matchesSearch = searchQuery === '' || 
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.ip_address?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesAction = actionFilter === 'all' || 
        log.action.toLowerCase() === actionFilter.toLowerCase();
      
      const matchesModule = moduleFilter === 'all' || 
        log.entity_type?.toLowerCase() === moduleFilter.toLowerCase();
      
      return matchesSearch && matchesAction && matchesModule;
    });
  }, [logs, searchQuery, actionFilter, moduleFilter]);

  const uniqueModules = useMemo(() => {
    if (!logs) return [];
    const modules = new Set(logs.map(log => log.entity_type).filter(Boolean));
    return Array.from(modules) as string[];
  }, [logs]);

  const uniqueActions = useMemo(() => {
    if (!logs) return [];
    const actions = new Set(logs.map(log => log.action.toLowerCase()));
    return Array.from(actions);
  }, [logs]);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return format(date, 'dd/MM/yyyy HH:mm:ss', { locale: language === 'vi' ? vi : enUS });
      }
      return timestamp;
    } catch {
      return timestamp;
    }
  };

  const getActionConfig = (action: string) => {
    const key = action.toLowerCase();
    return actionConfig[key] || defaultAction;
  };

  return (
    <>
      <Helmet>
        <title>{t('auditLog.title')} | Bluecore Finance</title>
        <meta name="description" content={t('auditLog.subtitle')} />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ScrollText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('auditLog.title')}</h1>
              <p className="text-muted-foreground">{t('auditLog.subtitle')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            {t('auditLog.exportLog')}
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">{t('auditLog.activityToday')}</span>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stats?.totalToday || 0}</p>
              )}
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-5 h-5 text-info" />
                <span className="text-sm text-muted-foreground">{t('auditLog.activeUsers')}</span>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stats?.uniqueUsers || 0}</p>
              )}
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <Trash2 className="w-5 h-5 text-destructive" />
                <span className="text-sm text-muted-foreground">{t('auditLog.criticalActions')}</span>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stats?.criticalActions || 0}</p>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col md:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder={t('auditLog.search')} 
              className="pl-9" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('auditLog.action')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('auditLog.all')}</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {getActionConfig(action).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('auditLog.module')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('auditLog.all')}</SelectItem>
              {uniqueModules.map((module) => (
                <SelectItem key={module} value={module.toLowerCase()}>
                  {module}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setActionFilter('all');
              setModuleFilter('all');
            }}
          >
            <Filter className="w-4 h-4 mr-2" />
            {t('auditLog.clearFilter')}
          </Button>
        </motion.div>

        {/* Log List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="data-card"
        >
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('auditLog.noLogs')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => {
                const config = getActionConfig(log.action);
                const ActionIcon = config.icon;
                
                return (
                  <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', config.bg)}>
                      <ActionIcon className={cn('w-5 h-5', config.color)} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium">User ID: {log.user_id?.slice(0, 8) || 'System'}...</span>
                        <Badge variant="outline" className="text-xs">{config.label}</Badge>
                        {log.entity_type && (
                          <Badge variant="secondary" className="text-xs">{log.entity_type}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {log.action} {log.entity_type && `${t('auditLog.on')} ${log.entity_type}`}
                        {log.entity_id && ` (ID: ${log.entity_id.slice(0, 8)}...)`}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(log.created_at)}
                        </span>
                        {log.ip_address && <span>IP: {log.ip_address}</span>}
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
