import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Users, 
  Search, 
  Filter,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MoreVertical,
  UserCheck,
  Clock,
  Award,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTeamMembers, TeamMember } from '@/hooks/useTeamMembers';

/**
 * TEAM PAGE - Control Tower
 * Light Professional Theme
 */

const statusConfig = {
  active: { label: 'Online', color: 'bg-emerald-500' },
  away: { label: 'Away', color: 'bg-amber-500' },
  offline: { label: 'Offline', color: 'bg-muted-foreground' },
};

const departmentColors: Record<string, string> = {
  'Bán hàng': 'bg-blue-50 text-blue-700 border-blue-200',
  'Kho': 'bg-amber-50 text-amber-700 border-amber-200',
  'Kế toán': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Nhân sự': 'bg-purple-50 text-purple-700 border-purple-200',
  'IT': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'CSKH': 'bg-pink-50 text-pink-700 border-pink-200',
};

function TeamMemberCard({ member }: { member: TeamMember }) {
  const status = statusConfig[member.status];
  const deptColor = departmentColors[member.department] || 'bg-muted text-muted-foreground border-border';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-card border-border hover:border-primary/30 transition-all">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ${status.color} border-2 border-card`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Xem hồ sơ</DropdownMenuItem>
                    <DropdownMenuItem>Gửi tin nhắn</DropdownMenuItem>
                    <DropdownMenuItem>Chỉnh sửa</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge className={`${deptColor} border text-xs`}>
                  {member.department}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {member.location}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                <a href={`mailto:${member.email}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {member.email}
                </a>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {member.phone}
                </span>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Từ {new Date(member.joinDate).toLocaleDateString('vi-VN')}
                </span>
                <div className="flex items-center gap-1">
                  <Award className="h-3 w-3 text-amber-500" />
                  <span className={`text-xs font-medium ${
                    member.performance >= 90 ? 'text-emerald-600' : 
                    member.performance >= 80 ? 'text-amber-600' : 'text-destructive'
                  }`}>
                    {member.performance}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function TeamPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: team = [], isLoading } = useTeamMembers();

  const filteredTeam = team.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = team.filter(m => m.status === 'active').length;
  const awayCount = team.filter(m => m.status === 'away').length;
  const departments = [...new Set(team.map(m => m.department))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Đội ngũ | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              Quản lý đội ngũ
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Theo dõi và quản lý nhân sự</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Thêm thành viên
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-foreground">{team.length}</div>
                <div className="text-xs text-muted-foreground">Tổng nhân viên</div>
              </div>
            </div>
          </Card>
          <Card className="bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-emerald-600">{activeCount}</div>
                <div className="text-xs text-muted-foreground">Đang online</div>
              </div>
            </div>
          </Card>
          <Card className="bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-amber-600">{awayCount}</div>
                <div className="text-xs text-muted-foreground">Tạm vắng</div>
              </div>
            </div>
          </Card>
          <Card className="bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-purple-600">{departments.length}</div>
                <div className="text-xs text-muted-foreground">Phòng ban</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Search & Filter */}
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm nhân viên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Lọc
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">
              Tất cả ({team.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Online ({activeCount})
            </TabsTrigger>
            {departments.slice(0, 3).map((dept: string) => (
              <TabsTrigger key={dept} value={dept}>
                {dept}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTeam.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TeamMemberCard member={member} />
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTeam.filter(m => m.status === 'active').map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TeamMemberCard member={member} />
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {departments.slice(0, 3).map((dept: string) => (
            <TabsContent key={dept} value={dept} className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTeam.filter(m => m.department === dept).map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <TeamMemberCard member={member} />
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {filteredTeam.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Không tìm thấy nhân viên nào</p>
          </div>
        )}
      </div>
    </>
  );
}
