import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { 
  Shield, 
  Users, 
  Key,
  Plus,
  Settings,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Default roles configuration
const defaultRoles = [
  { 
    id: 'owner', 
    name: 'Owner', 
    description: 'Toàn quyền quản trị tenant',
    permissions: ['all'],
    color: 'bg-destructive',
  },
  { 
    id: 'admin', 
    name: 'Admin', 
    description: 'Quản lý người dùng và cấu hình',
    permissions: ['dashboard', 'reports', 'users', 'settings'],
    color: 'bg-primary',
  },
  { 
    id: 'editor', 
    name: 'Editor', 
    description: 'Chỉnh sửa dữ liệu',
    permissions: ['invoices', 'reconciliation', 'expenses'],
    color: 'bg-info',
  },
  { 
    id: 'viewer', 
    name: 'Viewer', 
    description: 'Chỉ xem báo cáo',
    permissions: ['dashboard_view', 'reports_view'],
    color: 'bg-muted-foreground',
  },
];

const permissions = [
  { module: 'Dashboard', view: true, edit: false, delete: false, admin: true },
  { module: 'Hóa đơn', view: true, edit: true, delete: false, admin: true },
  { module: 'Đối soát', view: true, edit: true, delete: false, admin: true },
  { module: 'Báo cáo', view: true, edit: false, delete: false, admin: true },
  { module: 'Cảnh báo', view: true, edit: true, delete: true, admin: true },
  { module: 'Cài đặt', view: false, edit: false, delete: false, admin: true },
];

export default function RBACPage() {
  const { data: tenantId } = useActiveTenantId();

  // Fetch tenant users with profiles
  const { data: tenantUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['tenant-users-rbac', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_users')
        .select(`
          id,
          user_id,
          role,
          is_active,
          joined_at,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('tenant_id', tenantId!)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Transform data for display
  const users = tenantUsers.map((tu) => {
    const profile = tu.profiles as any;
    return {
      id: tu.id,
      user_id: tu.user_id,
      name: profile?.full_name || 'Chưa cập nhật',
      email: tu.user_id, // We don't have email in profiles, use user_id
      role: tu.role || 'viewer',
      status: tu.is_active ? 'active' : 'inactive',
      lastLogin: tu.joined_at ? new Date(tu.joined_at).toLocaleString('vi-VN') : '-',
    };
  });

  // Calculate role stats
  const rolesWithCounts = defaultRoles.map(role => ({
    ...role,
    users: users.filter(u => u.role === role.id).length,
  }));

  const activeUsers = users.filter(u => u.status === 'active').length;

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Phân quyền RBAC | Bluecore Finance</title>
        <meta name="description" content="Quản lý phân quyền người dùng" />
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
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Phân quyền RBAC</h1>
              <p className="text-muted-foreground">Role-Based Access Control</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Key className="w-4 h-4 mr-2" />
              Tạo role mới
            </Button>
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Thêm người dùng
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Tổng người dùng</span>
              </div>
              <p className="text-2xl font-bold">{users.length || '--'}</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-5 h-5 text-info" />
                <span className="text-sm text-muted-foreground">Roles</span>
              </div>
              <p className="text-2xl font-bold">{defaultRoles.length}</p>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-5 bg-card shadow-card">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-sm text-muted-foreground">Đang hoạt động</span>
              </div>
              <p className="text-2xl font-bold">{activeUsers || '--'}</p>
            </Card>
          </motion.div>
        </div>

        <Tabs defaultValue="roles" className="space-y-6">
          <TabsList>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="users">Người dùng</TabsTrigger>
            <TabsTrigger value="permissions">Ma trận quyền</TabsTrigger>
          </TabsList>

          <TabsContent value="roles">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {rolesWithCounts.map((role) => (
                <Card key={role.id} className="p-5 bg-card shadow-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-3 h-3 rounded-full', role.color)} />
                      <h4 className="font-semibold">{role.name}</h4>
                    </div>
                    <Badge variant="outline">{role.users} users</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-3 h-3 mr-1" />
                      Xem
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="w-3 h-3 mr-1" />
                      Sửa
                    </Button>
                  </div>
                </Card>
              ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="users">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              {users.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Chưa có người dùng nào trong tenant này
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold">Người dùng</th>
                        <th className="text-left py-3 px-4 font-semibold">Role</th>
                        <th className="text-left py-3 px-4 font-semibold">Trạng thái</th>
                        <th className="text-left py-3 px-4 font-semibold">Ngày tham gia</th>
                        <th className="text-right py-3 px-4 font-semibold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {user.name.split(' ').map(n => n[0]).join('').slice(-2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.user_id.slice(0, 8)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                              user.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                            )}>
                              {user.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {user.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{user.lastLogin}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="permissions">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-4">Ma trận quyền - Role: Editor</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Module</th>
                      <th className="text-center py-3 px-4 font-semibold">Xem</th>
                      <th className="text-center py-3 px-4 font-semibold">Sửa</th>
                      <th className="text-center py-3 px-4 font-semibold">Xóa</th>
                      <th className="text-center py-3 px-4 font-semibold">Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((perm) => (
                      <tr key={perm.module} className="border-b border-border/50">
                        <td className="py-3 px-4 font-medium">{perm.module}</td>
                        <td className="py-3 px-4 text-center">
                          <Switch checked={perm.view} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Switch checked={perm.edit} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Switch checked={perm.delete} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Switch checked={perm.admin} disabled />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
