import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Search, MoreHorizontal, Shield, UserX, Plus, ShieldCheck, ShieldOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/shared/PageHeader';

type AppRole = Database['public']['Enums']['app_role'];

const addAdminSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  role: z.enum(['admin', 'accountant', 'viewer'] as const),
});

type AddAdminFormData = z.infer<typeof addAdminSchema>;

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isChangeRoleDialogOpen, setIsChangeRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; currentRole: AppRole } | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('viewer');
  
  const queryClient = useQueryClient();

  const form = useForm<AddAdminFormData>({
    resolver: zodResolver(addAdminSchema),
    defaultValues: {
      email: '',
      role: 'admin',
    },
  });

  // Fetch only users who have app_role (Super Admin users)
  const { data: adminUsers, isLoading } = useQuery({
    queryKey: ['admin-platform-users'],
    queryFn: async () => {
      // Get all user_roles entries
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      if (!roles || roles.length === 0) return [];

      // Get profiles for these users
      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine data - only show users with app_role
      return roles.map((role) => {
        const profile = profiles?.find(p => p.id === role.user_id);
        return {
          id: role.user_id,
          full_name: profile?.full_name,
          role: role.role,
          created_at: profile?.created_at,
        };
      });
    },
  });

  // Add user to platform admin
  const addAdminMutation = useMutation({
    mutationFn: async (data: AddAdminFormData) => {
      // First, find user by email - we need to call an edge function for this
      const { data: result, error } = await supabase.functions.invoke('create-tenant-with-owner', {
        body: {
          action: 'find-user-by-email',
          email: data.email,
        },
      });

      if (error) throw error;
      
      if (!result.userId) {
        throw new Error('Không tìm thấy user với email này. User cần đăng ký tài khoản trước.');
      }

      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', result.userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({ role: data.role })
          .eq('user_id', result.userId);

        if (updateError) throw updateError;
      } else {
        // Insert new role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: result.userId, role: data.role });

        if (insertError) throw insertError;
      }

      return { userId: result.userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-platform-users'] });
      toast.success('Đã thêm Platform Admin thành công');
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Có lỗi xảy ra');
    },
  });

  // Change user role
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-platform-users'] });
      toast.success('Đã cập nhật role thành công');
      setIsChangeRoleDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Có lỗi xảy ra');
    },
  });

  // Remove admin role
  const removeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-platform-users'] });
      toast.success('Đã xóa quyền Platform Admin');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Có lỗi xảy ra');
    },
  });

  const filteredUsers = adminUsers?.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.includes(searchQuery);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500">{t('admin.users.superAdmin')}</Badge>;
      case 'accountant':
        return <Badge className="bg-blue-500">{t('admin.users.accountant')}</Badge>;
      default:
        return <Badge variant="secondary">{t('admin.users.viewer')}</Badge>;
    }
  };

  const handleAddAdmin = (data: AddAdminFormData) => {
    addAdminMutation.mutate(data);
  };

  const handleChangeRole = (user: { id: string; full_name: string | null; role: AppRole }) => {
    setSelectedUser({ id: user.id, name: user.full_name || 'Unknown', currentRole: user.role });
    setNewRole(user.role);
    setIsChangeRoleDialogOpen(true);
  };

  const handleConfirmChangeRole = () => {
    if (selectedUser) {
      changeRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
    }
  };

  const handleRemoveAdmin = (userId: string) => {
    if (confirm(t('admin.users.confirmRemove'))) {
      removeAdminMutation.mutate(userId);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('admin.users.title')} | Super Admin</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title={t('admin.users.title')}
          subtitle={t('admin.users.subtitle')}
          icon={<ShieldCheck className="w-5 h-5" />}
          actions={
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('admin.users.addAdmin')}
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  {t('admin.users.platformAdmins')}
                </CardTitle>
                <CardDescription>
                  {adminUsers?.length || 0} {t('admin.users.usersWithPlatformAccess')}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t('admin.users.filterByRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.users.allRoles')}</SelectItem>
                    <SelectItem value="admin">{t('admin.users.superAdmin')}</SelectItem>
                    <SelectItem value="accountant">{t('admin.users.accountant')}</SelectItem>
                    <SelectItem value="viewer">{t('admin.users.viewer')}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
            ) : filteredUsers?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('admin.users.noAdmins')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.users.name')}</TableHead>
                    <TableHead>{t('admin.users.platformRole')}</TableHead>
                    <TableHead>{t('admin.users.createdAt')}</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.full_name || t('admin.users.noName')}</div>
                          <div className="text-sm text-muted-foreground">{user.id.slice(0, 8)}...</div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy', { locale: vi }) : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleChangeRole(user)}>
                              <Shield className="w-4 h-4 mr-2" />
                              {t('admin.users.changeRole')}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleRemoveAdmin(user.id)}
                            >
                              <ShieldOff className="w-4 h-4 mr-2" />
                              {t('admin.users.removePlatformAccess')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t('admin.users.userTypes')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>Platform Admins:</strong> {t('admin.users.platformAdminsDesc')}</p>
            <p><strong>Tenant Users:</strong> {t('admin.users.tenantUsersDesc')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Platform Admin Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.users.addTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.users.addDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleAddAdmin)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('admin.users.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t('admin.users.platformRole')}</Label>
              <Select
                value={form.watch('role')}
                onValueChange={(value: AppRole) => form.setValue('role', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('admin.users.superAdmin')}</SelectItem>
                  <SelectItem value="accountant">{t('admin.users.accountant')}</SelectItem>
                  <SelectItem value="viewer">{t('admin.users.viewer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={addAdminMutation.isPending}>
                {addAdminMutation.isPending ? t('common.loading') : t('common.add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={isChangeRoleDialogOpen} onOpenChange={setIsChangeRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.users.changeRoleTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.users.changeRoleDesc')} {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('admin.users.newRole')}</Label>
              <Select value={newRole} onValueChange={(value: AppRole) => setNewRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('admin.users.superAdmin')}</SelectItem>
                  <SelectItem value="accountant">{t('admin.users.accountant')}</SelectItem>
                  <SelectItem value="viewer">{t('admin.users.viewer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeRoleDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmChangeRole} disabled={changeRoleMutation.isPending}>
              {changeRoleMutation.isPending ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
