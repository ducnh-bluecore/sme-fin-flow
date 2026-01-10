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
import { useLanguage } from '@/contexts/LanguageContext';

export default function TenantMembersPage() {
  const { t } = useLanguage();
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

  const roleConfig = {
    owner: {
      label: t('tenant.owner'),
      icon: Crown,
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    },
    admin: {
      label: t('tenant.admin'),
      icon: Shield,
      color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    },
    member: {
      label: t('tenant.member'),
      icon: UserCircle,
      color: 'bg-green-500/10 text-green-500 border-green-500/20',
    },
    viewer: {
      label: t('tenant.viewer'),
      icon: Eye,
      color: 'bg-muted text-muted-foreground border-border',
    },
  };

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
        title: t('common.cancel'),
        description: t('tenant.cannotRemoveOwner'),
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
        <p className="text-muted-foreground">{t('tenant.noCompany')}</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('tenant.membersTitle')} | {activeTenant.name}</title>
        <meta name="description" content={t('tenant.membersMetaDesc')} />
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
              {t('tenant.membersTitle')}
            </h1>
            <p className="text-muted-foreground">
              {t('tenant.membersMetaDesc').replace('công ty', activeTenant.name)}
            </p>
          </div>
          {isAdmin && (
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('tenant.inviteMember')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('tenant.inviteTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('tenant.inviteDesc')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('tenant.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">{t('tenant.role')}</Label>
                    <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{t('tenant.admin')}</SelectItem>
                        <SelectItem value="member">{t('tenant.member')}</SelectItem>
                        <SelectItem value="viewer">{t('tenant.viewer')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleInvite} disabled={inviteToTenant.isPending}>
                    {inviteToTenant.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t('tenant.sendInvite')}
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
                <TableHead>{t('tenant.member')}</TableHead>
                <TableHead>{t('tenant.role')}</TableHead>
                <TableHead>{t('tenant.joined')}</TableHead>
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
                    {t('tenant.noMembers')}
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
                          : t('tenant.pending')}
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
                                {t('tenant.setAsAdmin')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateMemberRole.mutate({
                                  memberId: member.id,
                                  role: 'member',
                                })}
                              >
                                <UserCircle className="mr-2 h-4 w-4" />
                                {t('tenant.setAsMember')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateMemberRole.mutate({
                                  memberId: member.id,
                                  role: 'viewer',
                                })}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                {t('tenant.setAsViewer')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleRemove(member.id, member.role, memberName)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('tenant.removeFromCompany')}
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
            <AlertDialogTitle>{t('tenant.confirmRemoveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tenant.confirmRemoveDesc')} <strong>{memberToRemove?.name}</strong> {t('tenant.confirmRemoveNote')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('tenant.removeMember')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
