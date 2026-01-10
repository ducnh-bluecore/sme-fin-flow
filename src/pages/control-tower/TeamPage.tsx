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
  UserX,
  Clock,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  location: string;
  status: 'active' | 'away' | 'offline';
  joinDate: string;
  performance: number;
  avatar?: string;
}

const mockTeam: TeamMember[] = [
  { id: '1', name: 'Nguyễn Văn A', email: 'nva@company.com', phone: '0901234567', role: 'Store Manager', department: 'Bán hàng', location: 'Quận 1', status: 'active', joinDate: '2022-03-15', performance: 95 },
  { id: '2', name: 'Trần Thị B', email: 'ttb@company.com', phone: '0902345678', role: 'Sales Lead', department: 'Bán hàng', location: 'Quận 3', status: 'active', joinDate: '2021-08-20', performance: 88 },
  { id: '3', name: 'Lê Văn C', email: 'lvc@company.com', phone: '0903456789', role: 'Sales Executive', department: 'Bán hàng', location: 'Quận 7', status: 'away', joinDate: '2023-01-10', performance: 82 },
  { id: '4', name: 'Phạm Thị D', email: 'ptd@company.com', phone: '0904567890', role: 'Warehouse Manager', department: 'Kho', location: 'Kho TT', status: 'active', joinDate: '2020-11-05', performance: 91 },
  { id: '5', name: 'Hoàng Văn E', email: 'hve@company.com', phone: '0905678901', role: 'Accountant', department: 'Kế toán', location: 'VP', status: 'offline', joinDate: '2022-06-12', performance: 87 },
  { id: '6', name: 'Mai Thị F', email: 'mtf@company.com', phone: '0906789012', role: 'HR Manager', department: 'Nhân sự', location: 'VP', status: 'active', joinDate: '2019-04-22', performance: 93 },
  { id: '7', name: 'Đỗ Văn G', email: 'dvg@company.com', phone: '0907890123', role: 'IT Support', department: 'IT', location: 'VP', status: 'active', joinDate: '2023-02-28', performance: 78 },
  { id: '8', name: 'Vũ Thị H', email: 'vth@company.com', phone: '0908901234', role: 'Customer Service', department: 'CSKH', location: 'VP', status: 'away', joinDate: '2022-09-14', performance: 85 },
];

const statusConfig = {
  active: { label: 'Online', color: 'bg-emerald-500' },
  away: { label: 'Away', color: 'bg-amber-500' },
  offline: { label: 'Offline', color: 'bg-slate-500' },
};

const departmentColors: Record<string, string> = {
  'Bán hàng': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'Kho': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Kế toán': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'Nhân sự': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'IT': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  'CSKH': 'bg-pink-500/10 text-pink-400 border-pink-500/30',
};

function TeamMemberCard({ member }: { member: TeamMember }) {
  const status = statusConfig[member.status];
  const deptColor = departmentColors[member.department] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-slate-900/50 border-slate-800/50 hover:border-slate-700/50 transition-all">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-semibold">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ${status.color} border-2 border-slate-900`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">{member.name}</h3>
                  <p className="text-sm text-slate-400">{member.role}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
                    <DropdownMenuItem className="text-slate-300 focus:bg-slate-800">Xem hồ sơ</DropdownMenuItem>
                    <DropdownMenuItem className="text-slate-300 focus:bg-slate-800">Gửi tin nhắn</DropdownMenuItem>
                    <DropdownMenuItem className="text-slate-300 focus:bg-slate-800">Chỉnh sửa</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge className={`${deptColor} border text-xs`}>
                  {member.department}
                </Badge>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {member.location}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800/50">
                <a href={`mailto:${member.email}`} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {member.email}
                </a>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {member.phone}
                </span>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Từ {new Date(member.joinDate).toLocaleDateString('vi-VN')}
                </span>
                <div className="flex items-center gap-1">
                  <Award className="h-3 w-3 text-amber-400" />
                  <span className={`text-xs font-medium ${
                    member.performance >= 90 ? 'text-emerald-400' : 
                    member.performance >= 80 ? 'text-amber-400' : 'text-red-400'
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
  const [team] = useState(mockTeam);

  const filteredTeam = team.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = team.filter(m => m.status === 'active').length;
  const awayCount = team.filter(m => m.status === 'away').length;
  const departments = [...new Set(team.map(m => m.department))];

  return (
    <>
      <Helmet>
        <title>Đội ngũ | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Users className="h-6 w-6 text-amber-400" />
              Quản lý đội ngũ
            </h1>
            <p className="text-slate-400 text-sm mt-1">Theo dõi và quản lý nhân sự</p>
          </div>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Thêm thành viên
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-100">{team.length}</div>
                <div className="text-xs text-slate-400">Tổng nhân viên</div>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <UserCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
                <div className="text-xs text-slate-400">Đang online</div>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">{awayCount}</div>
                <div className="text-xs text-slate-400">Tạm vắng</div>
              </div>
            </div>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Award className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">{departments.length}</div>
                <div className="text-xs text-slate-400">Phòng ban</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Search & Filter */}
        <Card className="bg-slate-900/50 border-slate-800/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Tìm kiếm nhân viên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700/50 text-slate-200"
                />
              </div>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
                <Filter className="h-4 w-4 mr-2" />
                Lọc
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-slate-900/50 border border-slate-800/50">
            <TabsTrigger value="all" className="data-[state=active]:bg-slate-800">
              Tất cả ({team.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-slate-800">
              Online ({activeCount})
            </TabsTrigger>
            {departments.slice(0, 3).map(dept => (
              <TabsTrigger key={dept} value={dept} className="data-[state=active]:bg-slate-800">
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

          {departments.slice(0, 3).map(dept => (
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
            <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Không tìm thấy nhân viên nào</p>
          </div>
        )}
      </div>
    </>
  );
}
