import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  Database, 
  Calendar,
  Loader2,
  CheckCircle2,
  Clock,
  Shield,
  BarChart3,
  History,
  HeartPulse,
  Package
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSchemaStatus } from '@/hooks/useTenantSchemaStatus';
import { useTenantMembers } from '@/hooks/useTenant';
import { TenantSchemaStatus } from '@/components/admin/TenantSchemaStatus';
import { ProvisionSchemaButton } from '@/components/admin/ProvisionSchemaButton';
import { TenantStatsCard } from '@/components/admin/TenantStatsCard';
import { TenantHealthTab } from '@/components/admin/TenantHealthTab';
import { TenantAuditLog } from '@/components/admin/TenantAuditLog';
import { TenantSubscriptionTab } from '@/components/admin/TenantSubscriptionTab';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminTenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch tenant details
  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['admin-tenant-detail', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch schema status
  const { data: schemaInfo, isLoading: schemaLoading } = useTenantSchemaStatus(tenantId);

  // Fetch tenant members
  const { data: members, isLoading: membersLoading } = useTenantMembers(tenantId);

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/admin/tenants')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Button>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Không tìm thấy tenant
          </CardContent>
        </Card>
      </div>
    );
  }

  const ownerMember = members?.find(m => m.role === 'owner');

  return (
    <>
      <Helmet>
        <title>{tenant.name} | Admin Tenant Detail</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/tenants')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">{tenant.name}</h1>
              <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                {tenant.is_active ? 'Hoạt động' : 'Tạm dừng'}
              </Badge>
              <TenantSchemaStatus 
                status={schemaInfo?.status || 'pending'} 
                isLoading={schemaLoading} 
              />
            </div>
            <p className="text-muted-foreground mt-1">
              Slug: <code className="bg-muted px-1.5 py-0.5 rounded text-sm">{tenant.slug}</code>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Building2 className="w-4 h-4" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="w-4 h-4" />
              Thành viên ({members?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="schema" className="gap-2">
              <Database className="w-4 h-4" />
              Schema
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Sử dụng
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-2">
              <Package className="w-4 h-4" />
              Gói & Modules
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <History className="w-4 h-4" />
              Lịch sử
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-2">
              <HeartPulse className="w-4 h-4" />
              Sức khỏe
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Thông tin cơ bản</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tên công ty</span>
                    <span className="font-medium">{tenant.name}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Slug</span>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm">{tenant.slug}</code>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gói dịch vụ</span>
                    <Badge variant="outline" className="capitalize">{tenant.plan || 'free'}</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trạng thái</span>
                    <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                      {tenant.is_active ? 'Hoạt động' : 'Tạm dừng'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Dates & Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Thông tin thêm</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Ngày tạo
                    </span>
                    <span className="font-medium">
                      {tenant.created_at 
                        ? format(new Date(tenant.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })
                        : '-'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Số thành viên
                    </span>
                    <span className="font-medium">{members?.length || 0}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Owner
                    </span>
                    <span className="font-medium">
                      {ownerMember?.profile?.full_name || 'Chưa có'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Schema Status
                    </span>
                    <TenantSchemaStatus 
                      status={schemaInfo?.status || 'pending'} 
                      isLoading={schemaLoading} 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Thành viên
                </CardTitle>
                <CardDescription>
                  Danh sách tất cả thành viên của tenant này
                </CardDescription>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : members?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có thành viên nào
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members?.map((member) => (
                      <div 
                        key={member.id} 
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {member.profile?.full_name || 'Chưa đặt tên'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.user_id}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {member.role}
                          </Badge>
                          {member.is_active ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schema Tab */}
          <TabsContent value="schema" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Trạng thái Schema
                </CardTitle>
                <CardDescription>
                  Quản lý schema database riêng biệt cho tenant này
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-1">
                    <p className="font-medium">Schema Status</p>
                    <p className="text-sm text-muted-foreground">
                      {schemaInfo?.isProvisioned 
                        ? `Schema tenant_${tenant.slug} đã được khởi tạo`
                        : 'Tenant đang sử dụng schema chung (public)'}
                    </p>
                  </div>
                  <TenantSchemaStatus 
                    status={schemaInfo?.status || 'pending'} 
                    isLoading={schemaLoading} 
                  />
                </div>

                {!schemaInfo?.isProvisioned && (
                  <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <p className="font-medium text-amber-700 dark:text-amber-400">
                          Schema chưa được khởi tạo
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Tenant này đang sử dụng schema công khai với RLS. Để chuyển sang kiến trúc 
                          schema-per-tenant với hiệu năng tốt hơn, hãy khởi tạo schema riêng.
                        </p>
                        <ProvisionSchemaButton 
                          tenantId={tenant.id}
                          tenantName={tenant.name}
                          slug={tenant.slug}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {schemaInfo?.isProvisioned && (
                  <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-emerald-700 dark:text-emerald-400">
                          Schema đã được khởi tạo
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Tenant này đang sử dụng schema riêng <code className="bg-muted px-1 py-0.5 rounded">tenant_{tenant.slug}</code> với 
                          đầy đủ các bảng và views.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage">
            <TenantStatsCard 
              tenantId={tenant.id}
              tenantSlug={tenant.slug}
              isProvisioned={schemaInfo?.isProvisioned || false}
            />
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <TenantSubscriptionTab 
              tenantId={tenant.id}
              tenantPlan={tenant.plan || 'free'}
            />
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit">
            <TenantAuditLog tenantId={tenant.id} />
          </TabsContent>

          {/* Health Tab */}
          <TabsContent value="health">
            <TenantHealthTab tenantId={tenant.id} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
