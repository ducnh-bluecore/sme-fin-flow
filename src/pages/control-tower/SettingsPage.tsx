import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Bell, 
  Shield, 
  Palette, 
  Globe,
  Database,
  Key,
  Users,
  Mail,
  Smartphone,
  Moon,
  Sun,
  Save,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import NotificationRecipientsPanel from '@/components/control-tower/NotificationRecipientsPanel';
import AlertEscalationPanel from '@/components/control-tower/AlertEscalationPanel';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const settingSections: SettingSection[] = [
  { id: 'general', title: 'Cài đặt chung', description: 'Ngôn ngữ, múi giờ và giao diện', icon: Settings },
  { id: 'notifications', title: 'Thông báo', description: 'Quản lý cách nhận thông báo', icon: Bell },
  { id: 'escalation', title: 'Leo thang', description: 'Quy tắc leo thang & tổng hợp', icon: Shield },
  { id: 'recipients', title: 'Người nhận', description: 'Quản lý người nhận cảnh báo', icon: Users },
  { id: 'integrations', title: 'Tích hợp', description: 'Kết nối với các dịch vụ bên ngoài', icon: Database },
];

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  return (
    <>
      <Helmet>
        <title>Cài đặt | Control Tower</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="h-6 w-6 text-amber-400" />
            Cài đặt
          </h1>
          <p className="text-slate-400 text-sm mt-1">Quản lý cài đặt và tùy chọn hệ thống</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="bg-slate-900/50 border border-slate-800/50 w-full justify-start flex-wrap h-auto gap-1 p-1">
            {settingSections.map((section) => (
              <TabsTrigger 
                key={section.id} 
                value={section.id}
                className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400 gap-2"
              >
                <section.icon className="h-4 w-4" />
                {section.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="mt-6 space-y-6">
            <Card className="bg-slate-900/50 border-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-100">Giao diện</CardTitle>
                <CardDescription className="text-slate-400">Tùy chỉnh giao diện hiển thị</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {darkMode ? <Moon className="h-5 w-5 text-slate-400" /> : <Sun className="h-5 w-5 text-amber-400" />}
                    <div>
                      <Label className="text-slate-200">Chế độ tối</Label>
                      <p className="text-xs text-slate-500">Sử dụng giao diện tối cho mắt</p>
                    </div>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>

                <Separator className="bg-slate-800" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">Ngôn ngữ</Label>
                    <Select defaultValue="vi">
                      <SelectTrigger className="bg-slate-800/50 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="vi">Tiếng Việt</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200">Múi giờ</Label>
                    <Select defaultValue="asia-hcm">
                      <SelectTrigger className="bg-slate-800/50 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="asia-hcm">Asia/Ho_Chi_Minh (GMT+7)</SelectItem>
                        <SelectItem value="asia-bangkok">Asia/Bangkok (GMT+7)</SelectItem>
                        <SelectItem value="asia-singapore">Asia/Singapore (GMT+8)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-100">Định dạng hiển thị</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">Định dạng ngày</Label>
                    <Select defaultValue="dd/mm/yyyy">
                      <SelectTrigger className="bg-slate-800/50 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200">Đơn vị tiền tệ</Label>
                    <Select defaultValue="vnd">
                      <SelectTrigger className="bg-slate-800/50 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="vnd">VND (₫)</SelectItem>
                        <SelectItem value="usd">USD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="mt-6 space-y-6">
            <Card className="bg-slate-900/50 border-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-100">Kênh thông báo</CardTitle>
                <CardDescription className="text-slate-400">Chọn cách bạn muốn nhận thông báo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <div>
                      <Label className="text-slate-200">Thông báo Email</Label>
                      <p className="text-xs text-slate-500">Nhận thông báo qua email</p>
                    </div>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>

                <Separator className="bg-slate-800" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-slate-400" />
                    <div>
                      <Label className="text-slate-200">Thông báo đẩy</Label>
                      <p className="text-xs text-slate-500">Nhận thông báo trên trình duyệt</p>
                    </div>
                  </div>
                  <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                </div>

                <Separator className="bg-slate-800" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-slate-400" />
                    <div>
                      <Label className="text-slate-200">Thông báo SMS</Label>
                      <p className="text-xs text-slate-500">Nhận tin nhắn SMS cho cảnh báo quan trọng</p>
                    </div>
                  </div>
                  <Switch checked={smsNotifications} onCheckedChange={setSmsNotifications} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-100">Loại thông báo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Cảnh báo tồn kho', 'Đơn hàng mới', 'Báo cáo doanh số', 'Công việc được giao', 'Cập nhật hệ thống'].map((item) => (
                    <div key={item} className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-300">{item}</span>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recipients Settings */}
          <TabsContent value="recipients" className="mt-6">
            <NotificationRecipientsPanel />
          </TabsContent>

          {/* Escalation Settings */}
          <TabsContent value="escalation" className="mt-6">
            <AlertEscalationPanel />
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="mt-6 space-y-6">
            <Card className="bg-slate-900/50 border-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-100">Đổi mật khẩu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-200">Mật khẩu hiện tại</Label>
                  <Input type="password" className="bg-slate-800/50 border-slate-700" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">Mật khẩu mới</Label>
                  <Input type="password" className="bg-slate-800/50 border-slate-700" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">Xác nhận mật khẩu mới</Label>
                  <Input type="password" className="bg-slate-800/50 border-slate-700" />
                </div>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                  Đổi mật khẩu
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-100">Xác thực 2 yếu tố</CardTitle>
                <CardDescription className="text-slate-400">Thêm lớp bảo mật cho tài khoản</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-slate-400" />
                    <div>
                      <Label className="text-slate-200">Bật xác thực 2 yếu tố</Label>
                      <p className="text-xs text-slate-500">Sử dụng ứng dụng xác thực hoặc SMS</p>
                    </div>
                  </div>
                  <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-100">Phiên đăng nhập</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { device: 'Chrome trên Windows', location: 'TP. Hồ Chí Minh', time: 'Đang hoạt động', current: true },
                  { device: 'Safari trên iPhone', location: 'TP. Hồ Chí Minh', time: '2 giờ trước', current: false },
                  { device: 'Firefox trên MacOS', location: 'Hà Nội', time: '1 ngày trước', current: false },
                ].map((session, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
                    <div>
                      <p className="text-sm text-slate-200">{session.device}</p>
                      <p className="text-xs text-slate-500">{session.location} • {session.time}</p>
                    </div>
                    {session.current ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Hiện tại
                      </Badge>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        Đăng xuất
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations" className="mt-6 space-y-6">
            <Card className="bg-slate-900/50 border-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-100">Kết nối dịch vụ</CardTitle>
                <CardDescription className="text-slate-400">Tích hợp với các dịch vụ bên ngoài</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: 'Slack', description: 'Nhận thông báo qua Slack', connected: true, icon: '💬' },
                  { name: 'Google Calendar', description: 'Đồng bộ lịch công việc', connected: false, icon: '📅' },
                  { name: 'Zapier', description: 'Tự động hóa quy trình', connected: false, icon: '⚡' },
                  { name: 'Google Sheets', description: 'Xuất báo cáo tự động', connected: true, icon: '📊' },
                ].map((integration) => (
                  <div key={integration.name} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{integration.name}</p>
                        <p className="text-xs text-slate-500">{integration.description}</p>
                      </div>
                    </div>
                    {integration.connected ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Đã kết nối
                      </Badge>
                    ) : (
                      <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
                        Kết nối
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800/50">
              <CardHeader>
                <CardTitle className="text-slate-100">API Keys</CardTitle>
                <CardDescription className="text-slate-400">Quản lý API keys cho tích hợp</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Key className="h-4 w-4 mr-2" />
                  Tạo API Key mới
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">
            <Save className="h-4 w-4 mr-2" />
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </>
  );
}
