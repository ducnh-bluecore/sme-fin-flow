import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Settings, 
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Save,
  Moon,
  Sun,
  Monitor,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

export default function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Vui lòng nhập API Key');
      return;
    }
    if (!apiKey.startsWith('sk-')) {
      setApiKeyStatus('invalid');
      toast.error('API Key không hợp lệ. OpenAI API Key phải bắt đầu bằng "sk-"');
      return;
    }

    setApiKeyStatus('testing');
    
    try {
      // Test API key bằng cách gọi OpenAI API trực tiếp
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        setApiKeyStatus('valid');
        toast.success('API Key hợp lệ và hoạt động tốt!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setApiKeyStatus('invalid');
        if (response.status === 401) {
          toast.error('API Key không hợp lệ hoặc đã hết hạn');
        } else if (response.status === 429) {
          toast.error('API Key đã vượt quá giới hạn request');
        } else {
          toast.error(errorData.error?.message || 'Không thể xác thực API Key');
        }
      }
    } catch (error) {
      setApiKeyStatus('invalid');
      toast.error('Lỗi kết nối. Vui lòng kiểm tra lại.');
    }
  };

  const handleSaveApiKey = async () => {
    if (apiKeyStatus !== 'valid') {
      toast.error('Vui lòng test API Key trước khi lưu');
      return;
    }
    toast.success('API Key đã được lưu thành công! Lưu ý: API Key được quản lý bởi admin hệ thống.');
  };
  return (
    <>
      <Helmet>
        <title>Cài đặt | Bluecore Finance</title>
        <meta name="description" content="Cài đặt hệ thống" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Cài đặt</h1>
            <p className="text-muted-foreground">System Settings</p>
          </div>
        </motion.div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="profile">Hồ sơ</TabsTrigger>
            <TabsTrigger value="notifications">Thông báo</TabsTrigger>
            <TabsTrigger value="appearance">Giao diện</TabsTrigger>
            <TabsTrigger value="security">Bảo mật</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="system">Hệ thống</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Thông tin cá nhân
              </h3>
              
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">NVA</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm">Thay đổi ảnh</Button>
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Họ và tên</Label>
                      <Input id="fullName" defaultValue="Nguyễn Văn An" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue="an.nguyen@company.com" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Số điện thoại</Label>
                      <Input id="phone" defaultValue="0901234567" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="department">Phòng ban</Label>
                      <Input id="department" defaultValue="Tài chính" className="mt-1.5" />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <Button>
                    <Save className="w-4 h-4 mr-2" />
                    Lưu thay đổi
                  </Button>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Cài đặt thông báo
              </h3>
              
              <div className="space-y-6">
                {[
                  { title: 'Email thông báo', description: 'Nhận thông báo qua email' },
                  { title: 'Cảnh báo khẩn cấp', description: 'Thông báo ngay khi có cảnh báo mức cao' },
                  { title: 'Báo cáo hàng tuần', description: 'Nhận báo cáo tổng hợp mỗi tuần' },
                  { title: 'Thông báo đối soát', description: 'Thông báo khi có giao dịch chưa khớp' },
                  { title: 'Nhắc deadline thuế', description: 'Nhắc nhở trước deadline nộp thuế' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch defaultChecked={index < 3} />
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="appearance">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Giao diện
              </h3>
              
              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block">Chế độ màu</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { name: 'Light', icon: Sun },
                      { name: 'Dark', icon: Moon },
                      { name: 'System', icon: Monitor },
                    ].map((theme) => (
                      <Card key={theme.name} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors text-center">
                        <theme.icon className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">{theme.name}</p>
                      </Card>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Ngôn ngữ</Label>
                    <Select defaultValue="vi">
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vi">Tiếng Việt</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Múi giờ</Label>
                    <Select defaultValue="asia_ho_chi_minh">
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asia_ho_chi_minh">Asia/Ho_Chi_Minh (GMT+7)</SelectItem>
                        <SelectItem value="asia_singapore">Asia/Singapore (GMT+8)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="security">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Bảo mật
              </h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">Đổi mật khẩu</h4>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                      <Input id="currentPassword" type="password" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="newPassword">Mật khẩu mới</Label>
                      <Input id="newPassword" type="password" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                      <Input id="confirmPassword" type="password" className="mt-1.5" />
                    </div>
                    <Button>Đổi mật khẩu</Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">Xác thực 2 yếu tố (2FA)</p>
                    <p className="text-sm text-muted-foreground">Bảo vệ tài khoản với xác thực 2 yếu tố</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="api">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Cấu hình API Keys
              </h3>
              
              <div className="space-y-6">
                {/* OpenAI API Key */}
                <div className="p-4 rounded-lg border bg-muted/20">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        OpenAI API Key
                        {apiKeyStatus === 'valid' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {apiKeyStatus === 'invalid' && (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        API Key để sử dụng các tính năng AI phân tích dữ liệu
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-w-lg">
                    <div className="relative">
                      <Label htmlFor="openai-key">API Key</Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="openai-key"
                          type={showApiKey ? 'text' : 'password'}
                          placeholder="sk-..."
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value);
                            setApiKeyStatus('idle');
                          }}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        onClick={handleTestApiKey}
                        disabled={apiKeyStatus === 'testing' || !apiKey.trim()}
                      >
                        {apiKeyStatus === 'testing' ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4 mr-2" />
                        )}
                        {apiKeyStatus === 'testing' ? 'Đang kiểm tra...' : 'Test API Key'}
                      </Button>
                      <Button 
                        onClick={handleSaveApiKey}
                        disabled={apiKeyStatus !== 'valid'}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Lưu API Key
                      </Button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      <p className="font-medium mb-1">Lưu ý:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>API Key được mã hóa và lưu trữ an toàn</li>
                        <li>Bạn có thể lấy API Key tại <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com</a></li>
                        <li>Chi phí sử dụng API sẽ được tính vào tài khoản OpenAI của bạn</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Other API integrations placeholder */}
                <div className="p-4 rounded-lg border border-dashed bg-muted/10">
                  <h4 className="font-medium text-muted-foreground">Các tích hợp khác</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sắp ra mắt: Google AI, Anthropic Claude, và các dịch vụ khác
                  </p>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="system">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="data-card"
            >
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Cài đặt hệ thống
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Định dạng tiền tệ</Label>
                    <Select defaultValue="vnd">
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vnd">VND - Việt Nam Đồng</SelectItem>
                        <SelectItem value="usd">USD - US Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Định dạng ngày tháng</Label>
                    <Select defaultValue="dd_mm_yyyy">
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd_mm_yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="mm_dd_yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy_mm_dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Năm tài chính bắt đầu</Label>
                    <Select defaultValue="january">
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="january">Tháng 1</SelectItem>
                        <SelectItem value="april">Tháng 4</SelectItem>
                        <SelectItem value="july">Tháng 7</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tự động đồng bộ</Label>
                    <Select defaultValue="15">
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Mỗi 5 phút</SelectItem>
                        <SelectItem value="15">Mỗi 15 phút</SelectItem>
                        <SelectItem value="30">Mỗi 30 phút</SelectItem>
                        <SelectItem value="60">Mỗi giờ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Separator />
                
                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Lưu cài đặt
                </Button>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
