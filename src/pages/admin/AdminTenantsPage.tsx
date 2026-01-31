import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Search, MoreHorizontal, Eye, Edit, Users, Plus, Loader2, Trash2, ExternalLink, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useBatchTenantSchemaStatus } from '@/hooks/useTenantSchemaStatus';
import { TenantSchemaStatus } from '@/components/admin/TenantSchemaStatus';
import { ProvisionSchemaButton } from '@/components/admin/ProvisionSchemaButton';
import { PageHeader } from '@/components/shared/PageHeader';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

const createTenantSchema = z.object({
  name: z.string().min(2, 'Tên công ty phải có ít nhất 2 ký tự').max(100),
  slug: z.string()
    .min(2, 'Slug phải có ít nhất 2 ký tự')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug chỉ chứa chữ thường, số và dấu gạch ngang'),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']),
  ownerEmail: z.string().email('Email không hợp lệ'),
});

const editTenantSchema = z.object({
  name: z.string().min(2, 'Tên công ty phải có ít nhất 2 ký tự').max(100),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']),
  is_active: z.boolean(),
});

type CreateTenantFormData = z.infer<typeof createTenantSchema>;
type EditTenantFormData = z.infer<typeof editTenantSchema>;

interface TenantToEdit {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  is_active: boolean | null;
}

export default function AdminTenantsPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState<TenantToEdit | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<{ id: string; name: string } | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { startImpersonation } = useImpersonation();

  const createForm = useForm<CreateTenantFormData>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: '',
      slug: '',
      plan: 'free',
      ownerEmail: '',
    },
  });

  const editForm = useForm<EditTenantFormData>({
    resolver: zodResolver(editTenantSchema),
    defaultValues: {
      name: '',
      plan: 'free',
      is_active: true,
    },
  });

  // Reset edit form when tenant changes
  useEffect(() => {
    if (tenantToEdit) {
      editForm.reset({
        name: tenantToEdit.name,
        plan: (tenantToEdit.plan as EditTenantFormData['plan']) || 'free',
        is_active: tenantToEdit.is_active ?? true,
      });
    }
  }, [tenantToEdit, editForm]);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_users(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Get all tenant IDs for batch schema status check
  const tenantIds = useMemo(() => tenants?.map(t => t.id) || [], [tenants]);
  const { data: schemaStatusMap, isLoading: schemaStatusLoading } = useBatchTenantSchemaStatus(tenantIds);

  const createTenantMutation = useMutation({
    mutationFn: async (values: CreateTenantFormData) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Bạn cần đăng nhập để thực hiện thao tác này');
      }

      const response = await supabase.functions.invoke('create-tenant-with-owner', {
        body: {
          tenantName: values.name,
          slug: values.slug,
          plan: values.plan,
          ownerEmail: values.ownerEmail,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Lỗi khi tạo tenant');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      if (data?.isNewUser) {
        toast.success('Tạo tenant thành công! Một email đặt lại mật khẩu đã được gửi đến owner.');
      } else {
        toast.success('Tạo tenant thành công! Owner đã được gán cho user có sẵn.');
      }
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Lỗi khi tạo tenant');
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: EditTenantFormData }) => {
      const { data, error } = await supabase
        .from('tenants')
        .update({
          name: values.name,
          plan: values.plan,
          is_active: values.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      toast.success('Cập nhật tenant thành công');
      setIsEditDialogOpen(false);
      setTenantToEdit(null);
    },
    onError: (error: any) => {
      toast.error('Lỗi khi cập nhật tenant: ' + error.message);
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      // First delete all tenant_users
      const { error: usersError } = await supabase
        .from('tenant_users')
        .delete()
        .eq('tenant_id', tenantId);

      if (usersError) throw usersError;

      // Then delete the tenant
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      toast.success('Xóa tenant thành công');
      setIsDeleteDialogOpen(false);
      setTenantToDelete(null);
    },
    onError: (error: any) => {
      toast.error('Lỗi khi xóa tenant: ' + error.message);
    },
  });

  const filteredTenants = tenants?.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImpersonate = async (tenantId: string, tenantName: string) => {
    const success = await startImpersonation(tenantId, tenantName);
    if (success) {
      navigate('/');
    }
  };

  const handleEditClick = (tenant: TenantToEdit) => {
    setTenantToEdit(tenant);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (tenant: { id: string; name: string }) => {
    setTenantToDelete(tenant);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (tenantToDelete) {
      deleteTenantMutation.mutate(tenantToDelete.id);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const onCreateSubmit = (values: CreateTenantFormData) => {
    createTenantMutation.mutate(values);
  };

  const onEditSubmit = (values: EditTenantFormData) => {
    if (tenantToEdit) {
      updateTenantMutation.mutate({ id: tenantToEdit.id, values });
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('admin.tenants.title')} | Super Admin</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title={t('admin.tenants.title')}
          subtitle={t('admin.tenants.subtitle')}
          icon={<Building2 className="w-5 h-5" />}
          actions={
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('admin.tenants.createNew')}
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {t('admin.tenants.list')}
                </CardTitle>
                <CardDescription>
                  {t('admin.tenants.total')} {tenants?.length || 0} {t('admin.tenants.tenant')}
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.tenants.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.tenants.companyName')}</TableHead>
                    <TableHead>{t('admin.tenants.slug')}</TableHead>
                    <TableHead>{t('admin.tenants.plan')}</TableHead>
                    <TableHead>{t('admin.tenants.status')}</TableHead>
                    <TableHead>Schema</TableHead>
                    <TableHead>{t('admin.tenants.members')}</TableHead>
                    <TableHead>{t('admin.tenants.createdAt')}</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants?.map((tenant) => {
                    const schemaInfo = schemaStatusMap?.get(tenant.id);
                    return (
                      <TableRow key={tenant.id} className="group">
                        <TableCell className="font-medium">
                          <button
                            onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                            className="hover:text-primary hover:underline text-left"
                          >
                            {tenant.name}
                          </button>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {tenant.plan || 'free'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                            {tenant.is_active ? t('admin.tenants.active') : t('admin.tenants.paused')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {schemaInfo?.isProvisioned ? (
                            <TenantSchemaStatus 
                              status="provisioned" 
                              isLoading={schemaStatusLoading} 
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <TenantSchemaStatus 
                                status="pending" 
                                isLoading={schemaStatusLoading} 
                              />
                              <ProvisionSchemaButton
                                tenantId={tenant.id}
                                tenantName={tenant.name}
                                slug={tenant.slug}
                                size="sm"
                                variant="ghost"
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>{(tenant.tenant_users as any)?.[0]?.count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tenant.created_at
                            ? format(new Date(tenant.created_at), 'dd/MM/yyyy', { locale: vi })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                              title="Xem chi tiết"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/admin/tenants/${tenant.id}`)}>
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Xem chi tiết
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleImpersonate(tenant.id, tenant.name)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  {t('admin.tenants.view')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditClick(tenant)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  {t('admin.tenants.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/admin/tenants/${tenant.id}`)}>
                                  <Users className="w-4 h-4 mr-2" />
                                  {t('admin.tenants.viewMembers')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteClick({ id: tenant.id, name: tenant.name })}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  {t('admin.tenants.delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Tenant Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('admin.tenants.createTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.tenants.createDesc')}
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.tenants.companyName')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Công ty ABC" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          const slug = generateSlug(e.target.value);
                          createForm.setValue('slug', slug);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.tenants.slug')}</FormLabel>
                    <FormControl>
                      <Input placeholder="cong-ty-abc" {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('admin.tenants.slugDesc')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="ownerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.users.email')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="owner@company.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {t('admin.tenants.ownerEmailDesc')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.tenants.plan')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn gói dịch vụ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={createTenantMutation.isPending}>
                  {createTenantMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Tạo tenant
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) setTenantToEdit(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Tenant</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin cho tenant: <span className="font-medium">{tenantToEdit?.slug}</span>
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên công ty</FormLabel>
                    <FormControl>
                      <Input placeholder="Công ty ABC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gói dịch vụ</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn gói dịch vụ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Trạng thái hoạt động</FormLabel>
                      <FormDescription>
                        Tenant tạm dừng sẽ không thể truy cập hệ thống
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setTenantToEdit(null);
                  }}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={updateTenantMutation.isPending}>
                  {updateTenantMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Lưu thay đổi
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Tenant Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa tenant <span className="font-semibold">{tenantToDelete?.name}</span>?
              <br />
              <span className="text-destructive">Hành động này không thể hoàn tác. Tất cả dữ liệu của tenant sẽ bị xóa vĩnh viễn.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTenantToDelete(null)}>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTenantMutation.isPending}
            >
              {deleteTenantMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Xóa tenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
