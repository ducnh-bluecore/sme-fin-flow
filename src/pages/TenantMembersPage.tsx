import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  Users,
  Crown,
  Shield,
  UserCircle,
  Eye,
  MoreVertical,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useTenantContext } from '@/contexts/TenantContext';
import {
  useTenantMembers,
  useInviteToTenant,
  useUpdateMemberRole,
  useRemoveMember,
} from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/formatters';

const roleConfig = {
  owner: {
    label: 'Chủ sở hữu',
    icon: Crown,
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  admin: {
    label: 'Quản trị viên',
    icon: Shield,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  member: {
    label: 'Thành viên',
    icon: UserCircle,
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
  viewer: {
    label: 'Xem',
    icon: Eye,
    color: 'bg-muted text-muted-foreground border-border',
  },
};

export default function TenantMembersPage() {
  const { activeTenant, isAdmin, isLoading: tenantLoading } = useTenantContext();
  const { data: members = [], isLoading } = useTenantMembers(activeTenant?.id);
  const inviteToTenant = useInviteToTenant();
  const updateMemberRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const { toast } = useToast();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  const handleInvite = async () => {
    if (!activeTenant || !inviteEmail) return;
    await inviteToTenant.mutateAsync({
      tenantId: activeTenant.id,
      email: inviteEmail,
      role: inviteRole,
    });
    setInviteEmail('');
    setShowInviteDialog(false);
  };

  const handleRemoveConfirm = () => {
    if (!memberToRemove) return;
    removeMember.mutate(memberToRemove.id);
    setMemberToRemove(null);
  };

  const handleRemove = (memberId: string, memberRole: string, memberName: string) => {
    if (memberRole === 'owner') {
      toast({
        title: 'Không thể xóa',
        description: 'Không thể xóa chủ sở hữu khỏi công ty',
        variant: 'destructive',
      });
      return;
    }
    setMemberToRemove({ id: memberId, name: memberName });
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!activeTenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Users className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Chưa có công ty nào được chọn</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Quản lý thành viên | {activeTenant.name}</title>
        <meta name="description" content="Quản lý thành viên trong công ty" />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/tenant">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Quản lý thành viên
            </h1>
            <p className="text-muted-foreground">
              Quản lý thành viên trong {activeTenant.name}
            </p>
          </div>
          {isAdmin && (
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Mời thành viên
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mời thành viên mới</DialogTitle>
                  <DialogDescription>
                    Gửi lời mời đến email của người bạn muốn thêm vào công ty
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Vai trò</Label>
                    <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Quản trị viên</SelectItem>
                        <SelectItem value="member">Thành viên</SelectItem>
                        <SelectItem value="viewer">Xem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleInvite} disabled={inviteToTenant.isPending}>
                    {inviteToTenant.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Gửi lời mời
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thành viên</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Tham gia</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Chưa có thành viên nào
                  </TableCell>
                </TableRow>
              ) : (
                members.filter(m => m.is_active).map((member) => {
                  const config = roleConfig[member.role];
                  const RoleIcon = config.icon;
                  const memberName = member.profile?.full_name || 'Unknown User';

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {memberName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{memberName}</p>
                            <p className="text-sm text-muted-foreground">
                              {member.user_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={config.color}>
                          <RoleIcon className="mr-1 h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.joined_at
                          ? formatDate(member.joined_at)
                          : 'Chờ xác nhận'}
                      </TableCell>
                      <TableCell>
                        {isAdmin && member.role !== 'owner' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem
                                onClick={() => updateMemberRole.mutate({
                                  memberId: member.id,
                                  role: 'admin',
                                })}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Đặt làm Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateMemberRole.mutate({
                                  memberId: member.id,
                                  role: 'member',
                                })}
                              >
                                <UserCircle className="mr-2 h-4 w-4" />
                                Đặt làm Member
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateMemberRole.mutate({
                                  memberId: member.id,
                                  role: 'viewer',
                                })}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Đặt làm Viewer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleRemove(member.id, member.role, memberName)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa khỏi công ty
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </motion.div>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa <strong>{memberToRemove?.name}</strong> khỏi công ty? 
              Thành viên này sẽ không thể truy cập dữ liệu công ty nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa thành viên
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
