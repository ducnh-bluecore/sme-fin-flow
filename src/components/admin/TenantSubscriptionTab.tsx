/**
 * TenantSubscriptionTab - Admin component to manage tenant subscription
 * 
 * @architecture Control Plane - Cross-tenant admin management
 * Uses direct supabase client for:
 * - tenants table (public schema) update
 * This is an admin component that operates on ANY tenant, not the current user's tenant.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Layers, 
  Users, 
  TrendingUp, 
  Target, 
  Radio, 
  Database as DatabaseIcon,
  Loader2,
  Save,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { usePlatformPlans } from '@/hooks/usePlatformPlans';
import { usePlatformModules } from '@/hooks/usePlatformModules';
import { useTenantModules, useUpdateTenantModules, useInitializeTenantModules } from '@/hooks/useTenantModules';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface TenantSubscriptionTabProps {
  tenantId: string;
  tenantPlan: string;
}

const moduleIcons: Record<string, React.ComponentType<any>> = {
  fdp: TrendingUp,
  mdp: Target,
  cdp: Users,
  control_tower: Radio,
  data_warehouse: DatabaseIcon,
};

const moduleColors: Record<string, string> = {
  fdp: 'text-emerald-500',
  mdp: 'text-blue-500',
  cdp: 'text-violet-500',
  control_tower: 'text-amber-500',
  data_warehouse: 'text-slate-500',
};

export function TenantSubscriptionTab({ tenantId, tenantPlan }: TenantSubscriptionTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans, isLoading: plansLoading } = usePlatformPlans();
  const { data: allModules, isLoading: modulesLoading } = usePlatformModules();
  const { data: tenantModules, isLoading: tenantModulesLoading } = useTenantModules(tenantId);
  const updateModules = useUpdateTenantModules();
  const initializeModules = useInitializeTenantModules();

  const [selectedPlan, setSelectedPlan] = useState(tenantPlan || 'free');
  const [moduleStates, setModuleStates] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize module states from tenant data
  useEffect(() => {
    if (tenantModules && allModules) {
      const states: Record<string, boolean> = {};
      for (const mod of allModules) {
        const tenantMod = tenantModules.find(tm => tm.module_id === mod.id);
        states[mod.id] = tenantMod ? tenantMod.is_enabled : false;
      }
      setModuleStates(states);
      setHasChanges(false);
    }
  }, [tenantModules, allModules]);

  const handleModuleToggle = (moduleId: string, isCore: boolean) => {
    if (isCore) return; // Cannot disable core modules
    
    setModuleStates(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
    setHasChanges(true);
  };

  const handlePlanChange = async (newPlan: string) => {
    setSelectedPlan(newPlan);
    
    // Update tenant's plan field
    const { error } = await supabase
      .from('tenants')
      .update({ plan: newPlan })
      .eq('id', tenantId);

    if (error) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Cập nhật gói thành công',
        description: 'Gói dịch vụ đã được thay đổi',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-detail', tenantId] });
    }
  };

  const handleSaveModules = async () => {
    const modules = Object.entries(moduleStates).map(([moduleId, isEnabled]) => ({
      moduleId,
      isEnabled,
    }));

    await updateModules.mutateAsync({ tenantId, modules });
    setHasChanges(false);
  };

  const handleResetToDefault = async () => {
    await initializeModules.mutateAsync({ tenantId, planCode: selectedPlan });
    setHasChanges(false);
  };

  const currentPlan = plans?.find(p => p.code === selectedPlan);
  const isLoading = plansLoading || modulesLoading || tenantModulesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Current Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Gói dịch vụ hiện tại
            </CardTitle>
            <CardDescription>
              Thay đổi gói dịch vụ cho tenant này
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Chọn gói</Label>
              <Select value={selectedPlan} onValueChange={handlePlanChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn gói dịch vụ" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map(plan => (
                    <SelectItem key={plan.code} value={plan.code}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{plan.name}</span>
                        {plan.price_monthly ? (
                          <span className="text-muted-foreground text-sm">
                            {new Intl.NumberFormat('vi-VN').format(plan.price_monthly)}đ/tháng
                          </span>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Miễn phí</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentPlan && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Giới hạn người dùng</span>
                    <span className="font-medium">
                      {currentPlan.max_users ? `${currentPlan.max_users} người` : 'Không giới hạn'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trạng thái gói</span>
                    <Badge variant={currentPlan.is_active ? 'default' : 'secondary'}>
                      {currentPlan.is_active ? 'Đang bán' : 'Tạm dừng'}
                    </Badge>
                  </div>
                </div>

                <Separator />
                
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={handleResetToDefault}
                  disabled={initializeModules.isPending}
                >
                  {initializeModules.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Reset modules theo gói
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Modules Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Modules được bật
                </CardTitle>
                <CardDescription>
                  Bật/tắt modules riêng cho tenant này
                </CardDescription>
              </div>
              {hasChanges && (
                <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <AlertCircle className="w-3 h-3" />
                  Chưa lưu
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {allModules?.map(mod => {
              const Icon = moduleIcons[mod.code] || Layers;
              const isEnabled = moduleStates[mod.id] ?? false;
              
              return (
                <div 
                  key={mod.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-colors',
                    isEnabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      isEnabled ? 'bg-primary/10' : 'bg-muted'
                    )}>
                      <Icon className={cn('w-5 h-5', isEnabled ? moduleColors[mod.code] : 'text-muted-foreground')} />
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {mod.name}
                        {mod.is_core && (
                          <Badge variant="secondary" className="text-xs">Core</Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {mod.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleModuleToggle(mod.id, mod.is_core)}
                    disabled={mod.is_core}
                  />
                </div>
              );
            })}

            {hasChanges && (
              <Button 
                className="w-full gap-2"
                onClick={handleSaveModules}
                disabled={updateModules.isPending}
              >
                {updateModules.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Lưu thay đổi
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
