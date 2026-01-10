import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Plug, 
  Key,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  RefreshCw,
  Code,
  Download,
  ExternalLink,
  Activity,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatNumber, formatDateTime } from '@/lib/formatters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function APIPage() {
  const [showKey, setShowKey] = useState<string | null>(null);
  const { data: tenantId } = useActiveTenantId();
  const { t } = useLanguage();

  const endpoints = [
    { method: 'GET', path: '/api/v1/invoices', description: t('api.getInvoices') },
    { method: 'POST', path: '/api/v1/invoices', description: t('api.createInvoice') },
    { method: 'GET', path: '/api/v1/transactions', description: t('api.getTransactions') },
    { method: 'GET', path: '/api/v1/reports/revenue', description: t('api.revenueReport') },
    { method: 'GET', path: '/api/v1/alerts', description: t('api.getAlerts') },
    { method: 'POST', path: '/api/v1/webhooks', description: t('api.registerWebhook') },
  ];

  const exportFormats = [
    { name: 'Excel (.xlsx)', icon: '📊', description: t('api.exportExcel') },
    { name: 'CSV', icon: '📄', description: t('api.exportCsv') },
    { name: 'PDF', icon: '📑', description: t('api.exportPdf') },
    { name: 'JSON', icon: '{ }', description: t('api.exportJson') },
  ];

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['api-keys', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });
  
  const totalRequests = apiKeys.reduce((sum, k) => sum + (k.requests_count || 0), 0);

  const handleCopyKey = (keyPrefix: string) => {
    navigator.clipboard.writeText(keyPrefix + '...');
    toast.success(t('api.keyCopied'));
  };

  return (
    <>
      <Helmet>
        <title>{t('api.title')} | Bluecore Finance</title>
        <meta name="description" content={t('api.subtitle')} />
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
              <Plug className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('api.title')}</h1>
              <p className="text-muted-foreground">{t('api.subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              API Docs
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t('api.createKey')}
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">{t('api.apiKeys')}</span>
              </div>
              <p className="text-2xl font-bold">{isLoading ? '-' : apiKeys.length}</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-success" />
                <span className="text-sm text-muted-foreground">{t('api.requestsThisMonth')}</span>
              </div>
              <p className="text-2xl font-bold">{isLoading ? '-' : totalRequests.toLocaleString()}</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <Code className="w-5 h-5 text-info" />
                <span className="text-sm text-muted-foreground">{t('api.endpoints')}</span>
              </div>
              <p className="text-2xl font-bold">{endpoints.length}</p>
            </Card>
          </motion.div>
        </div>

        {/* API Keys */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="data-card"
        >
          <h3 className="font-semibold text-lg mb-4">{t('api.apiKeys')}</h3>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('api.noKeys')}
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <Card key={apiKey.id} className="p-4 bg-muted/30">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        apiKey.status === 'active' ? 'bg-success/10' : 'bg-muted'
                      )}>
                        <Key className={cn(
                          'w-5 h-5',
                          apiKey.status === 'active' ? 'text-success' : 'text-muted-foreground'
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{apiKey.name}</h4>
                          <Badge variant={apiKey.status === 'active' ? 'default' : 'secondary'}>
                            {apiKey.status === 'active' ? t('api.active') : t('api.paused')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-sm bg-muted px-2 py-0.5 rounded font-mono">
                            {showKey === apiKey.id ? apiKey.key_prefix + '**********************' : '••••••••••••••••••••'}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                          >
                            {showKey === apiKey.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => handleCopyKey(apiKey.key_prefix)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right text-sm">
                        <p className="font-medium">{formatNumber(apiKey.requests_count || 0)} {t('api.requests')}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('api.lastUsed')}: {apiKey.last_used_at ? formatDateTime(apiKey.last_used_at) : 'N/A'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Endpoints */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="data-card"
          >
            <h3 className="font-semibold text-lg mb-4">API {t('api.endpoints')}</h3>
            <div className="space-y-3">
              {endpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Badge variant={endpoint.method === 'GET' ? 'default' : 'secondary'} className="w-16 justify-center">
                    {endpoint.method}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <code className="text-sm font-mono">{endpoint.path}</code>
                    <p className="text-xs text-muted-foreground">{endpoint.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Export Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="data-card"
          >
            <h3 className="font-semibold text-lg mb-4">{t('api.exportData')}</h3>
            <div className="grid grid-cols-2 gap-4">
              {exportFormats.map((format) => (
                <Card key={format.name} className="p-4 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{format.icon}</span>
                    <h4 className="font-medium">{format.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{format.description}</p>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    <Download className="w-3 h-3 mr-1" />
                    {t('api.export')}
                  </Button>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
