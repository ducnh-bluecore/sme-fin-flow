/**
 * StrategicInitiativesPage - Strategic initiatives management
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 */

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Plus, Target, Pencil, Trash2, CheckCircle, Clock, 
  TrendingUp, Lightbulb, Shield, Settings2, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

type InitiativeCategory = 'growth' | 'efficiency' | 'innovation' | 'risk_management' | 'digital_transformation' | 'sustainability';
type InitiativePriority = 'low' | 'medium' | 'high' | 'critical';
type InitiativeStatus = 'planned' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

interface Milestone {
  title: string;
  date: string;
  completed: boolean;
}

interface StrategicInitiative {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  category: InitiativeCategory;
  priority: InitiativePriority;
  status: InitiativeStatus;
  progress: number;
  budget: number;
  spent: number;
  start_date: string | null;
  end_date: string | null;
  kpis: string[];
  milestones: Milestone[];
  owner: string | null;
  created_at: string;
  updated_at: string;
}

const categoryConfigStatic: Record<InitiativeCategory, { icon: typeof Target; color: string }> = {
  growth: { icon: TrendingUp, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  efficiency: { icon: Settings2, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  innovation: { icon: Lightbulb, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  risk_management: { icon: Shield, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  digital_transformation: { icon: Target, color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' },
  sustainability: { icon: Target, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
};

const priorityConfigStatic: Record<InitiativePriority, { color: string }> = {
  low: { color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' },
  medium: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  high: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  critical: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

const statusConfigStatic: Record<InitiativeStatus, { color: string }> = {
  planned: { color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' },
  in_progress: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  on_hold: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

interface InitiativeFormData {
  title: string;
  description: string;
  category: InitiativeCategory;
  priority: InitiativePriority;
  status: InitiativeStatus;
  progress: number;
  budget: number;
  spent: number;
  start_date: string;
  end_date: string;
  owner: string;
  kpis: string;
}

const defaultFormData: InitiativeFormData = {
  title: '',
  description: '',
  category: 'growth',
  priority: 'medium',
  status: 'planned',
  progress: 0,
  budget: 0,
  spent: 0,
  start_date: '',
  end_date: '',
  owner: '',
  kpis: '',
};

export default function StrategicInitiativesPage() {
  const { t, language } = useLanguage();
  const dateLocale = language === 'vi' ? vi : enUS;
  const { buildSelectQuery, buildInsertQuery, buildUpdateQuery, buildDeleteQuery, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<InitiativeFormData>(defaultFormData);

  const categoryConfig: Record<InitiativeCategory, { label: string; icon: typeof Target; color: string }> = {
    growth: { label: t('strategic.growth'), icon: TrendingUp, ...categoryConfigStatic.growth },
    efficiency: { label: t('strategic.efficiency'), icon: Settings2, ...categoryConfigStatic.efficiency },
    innovation: { label: t('strategic.innovation'), icon: Lightbulb, ...categoryConfigStatic.innovation },
    risk_management: { label: t('strategic.riskManagement'), icon: Shield, ...categoryConfigStatic.risk_management },
    digital_transformation: { label: t('strategic.digitalTransformation'), icon: Target, ...categoryConfigStatic.digital_transformation },
    sustainability: { label: t('strategic.sustainability'), icon: Target, ...categoryConfigStatic.sustainability },
  };

  const priorityConfig: Record<InitiativePriority, { label: string; color: string }> = {
    low: { label: t('strategic.low'), ...priorityConfigStatic.low },
    medium: { label: t('strategic.medium'), ...priorityConfigStatic.medium },
    high: { label: t('strategic.high'), ...priorityConfigStatic.high },
    critical: { label: t('strategic.critical'), ...priorityConfigStatic.critical },
  };

  const statusConfig: Record<InitiativeStatus, { label: string; color: string }> = {
    planned: { label: t('strategic.planned'), ...statusConfigStatic.planned },
    in_progress: { label: t('strategic.inProgress'), ...statusConfigStatic.in_progress },
    completed: { label: t('strategic.completed'), ...statusConfigStatic.completed },
    on_hold: { label: t('strategic.onHold'), ...statusConfigStatic.on_hold },
    cancelled: { label: t('strategic.cancelled'), ...statusConfigStatic.cancelled },
  };

  const { data: initiatives, isLoading } = useQuery({
    queryKey: ['strategic-initiatives', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('strategic_initiatives', '*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return ((data || []) as unknown as any[]).map(row => ({
        ...row,
        category: row.category as InitiativeCategory,
        priority: row.priority as InitiativePriority,
        status: row.status as InitiativeStatus,
        milestones: (row.milestones as unknown as Milestone[]) || [],
      })) as StrategicInitiative[];
    },
    enabled: isReady && !!tenantId,
  });

  type InsertPayload = {
    title: string;
    description?: string | null;
    category: string;
    priority: string;
    status: string;
    progress: number;
    budget: number;
    spent: number;
    start_date?: string | null;
    end_date?: string | null;
    owner?: string | null;
    kpis?: string[];
    milestones?: Record<string, unknown>[];
    tenant_id?: string | null;
  };

  const createMutation = useMutation({
    mutationFn: async (payload: InsertPayload) => {
      const { error } = await buildInsertQuery('strategic_initiatives', {
        title: payload.title,
        description: payload.description,
        category: payload.category,
        priority: payload.priority,
        status: payload.status,
        progress: payload.progress,
        budget: payload.budget,
        spent: payload.spent,
        start_date: payload.start_date,
        end_date: payload.end_date,
        owner: payload.owner,
        kpis: payload.kpis,
        milestones: payload.milestones as unknown as null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-initiatives', tenantId] });
      toast.success('Đã tạo sáng kiến mới');
      setIsDialogOpen(false);
      setFormData(defaultFormData);
    },
    onError: () => toast.error('Không thể tạo sáng kiến'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertPayload }) => {
      const { error } = await buildUpdateQuery('strategic_initiatives', {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: data.status,
        progress: data.progress,
        budget: data.budget,
        spent: data.spent,
        start_date: data.start_date,
        end_date: data.end_date,
        owner: data.owner,
        kpis: data.kpis,
        milestones: data.milestones as unknown as null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-initiatives', tenantId] });
      toast.success('Đã cập nhật sáng kiến');
      setIsDialogOpen(false);
      setEditingId(null);
      setFormData(defaultFormData);
    },
    onError: () => toast.error('Không thể cập nhật sáng kiến'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await buildDeleteQuery('strategic_initiatives')
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-initiatives', tenantId] });
      toast.success('Đã xóa sáng kiến');
    },
    onError: () => toast.error('Không thể xóa sáng kiến'),
  });

  const handleSubmit = () => {
    const payload: InsertPayload = {
      title: formData.title,
      description: formData.description || null,
      category: formData.category,
      priority: formData.priority,
      status: formData.status,
      progress: formData.progress,
      budget: formData.budget,
      spent: formData.spent,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      owner: formData.owner || null,
      kpis: formData.kpis ? formData.kpis.split(',').map(k => k.trim()).filter(Boolean) : [],
      milestones: [],
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (initiative: StrategicInitiative) => {
    setEditingId(initiative.id);
    setFormData({
      title: initiative.title,
      description: initiative.description || '',
      category: initiative.category,
      priority: initiative.priority,
      status: initiative.status,
      progress: initiative.progress,
      budget: initiative.budget,
      spent: initiative.spent,
      start_date: initiative.start_date || '',
      end_date: initiative.end_date || '',
      owner: initiative.owner || '',
      kpis: initiative.kpis?.join(', ') || '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('strategic.title')} subtitle={t('strategic.subtitle')} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  const totalBudget = initiatives?.reduce((sum, i) => sum + (i.budget || 0), 0) || 0;
  const totalSpent = initiatives?.reduce((sum, i) => sum + (i.spent || 0), 0) || 0;
  const avgProgress = initiatives?.length 
    ? initiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / initiatives.length 
    : 0;
  const inProgressCount = initiatives?.filter(i => i.status === 'in_progress').length || 0;

  return (
    <>
      <Helmet>
        <title>{t('strategic.title')} | CFO Dashboard</title>
        <meta name="description" content={t('strategic.subtitle')} />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader title={t('strategic.title')} subtitle={t('strategic.subtitle')} />
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('strategic.addInitiative')}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('strategic.totalInitiatives')}</p>
                  <p className="text-2xl font-bold">{initiatives?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('strategic.inProgress')}</p>
                  <p className="text-2xl font-bold">{inProgressCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('strategic.avgProgress')}</p>
                  <p className="text-2xl font-bold">{avgProgress.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Settings2 className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('strategic.budget')}</p>
                  <p className="text-lg font-bold">{formatCurrency(totalBudget)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Initiatives List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {initiatives?.map((initiative) => {
            const CategoryIcon = categoryConfig[initiative.category]?.icon || Target;
            return (
              <Card key={initiative.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={categoryConfig[initiative.category]?.color}>
                          <CategoryIcon className="h-3 w-3 mr-1" />
                          {categoryConfig[initiative.category]?.label}
                        </Badge>
                        <Badge className={priorityConfig[initiative.priority]?.color}>
                          {priorityConfig[initiative.priority]?.label}
                        </Badge>
                      </div>
                      <CardTitle className="text-base mt-2">{initiative.title}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(initiative)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(initiative.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {initiative.description || 'Chưa có mô tả'}
                  </p>
                  
                  <Badge className={statusConfig[initiative.status]?.color}>
                    {statusConfig[initiative.status]?.label}
                  </Badge>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tiến độ</span>
                      <span className="font-medium">{initiative.progress}%</span>
                    </div>
                    <Progress value={initiative.progress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Ngân sách</p>
                      <p className="font-medium">{formatCurrency(initiative.budget)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Đã chi</p>
                      <p className="font-medium">{formatCurrency(initiative.spent)}</p>
                    </div>
                  </div>

                  {initiative.start_date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(initiative.start_date), 'dd/MM/yyyy', { locale: vi })}
                      {initiative.end_date && ` - ${format(new Date(initiative.end_date), 'dd/MM/yyyy', { locale: vi })}`}
                    </div>
                  )}

                  {initiative.kpis && initiative.kpis.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {initiative.kpis.slice(0, 3).map((kpi, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {kpi}
                        </Badge>
                      ))}
                      {initiative.kpis.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{initiative.kpis.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {(!initiatives || initiatives.length === 0) && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">Chưa có sáng kiến</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Bắt đầu bằng cách thêm sáng kiến chiến lược đầu tiên
                </p>
                <Button className="mt-4" onClick={handleOpenCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm sáng kiến
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Chỉnh sửa sáng kiến' : 'Thêm sáng kiến mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tiêu đề *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Tên sáng kiến"
              />
            </div>

            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả chi tiết sáng kiến"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v as InitiativeCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mức độ ưu tiên</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData({ ...formData, priority: v as InitiativePriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v as InitiativeStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tiến độ (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ngân sách (VND)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Đã chi (VND)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.spent}
                  onChange={(e) => setFormData({ ...formData, spent: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ngày bắt đầu</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Ngày kết thúc</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Người phụ trách</Label>
              <Input
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                placeholder="Tên người phụ trách"
              />
            </div>

            <div className="space-y-2">
              <Label>KPIs (phân cách bằng dấu phẩy)</Label>
              <Input
                value={formData.kpis}
                onChange={(e) => setFormData({ ...formData, kpis: e.target.value })}
                placeholder="VD: Tăng doanh thu 20%, Giảm chi phí 10%"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!formData.title || createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
