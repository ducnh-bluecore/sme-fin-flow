import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Globe, Mail, Shield, Database } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <>
      <Helmet>
        <title>Cấu hình hệ thống | Super Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Cấu hình hệ thống</h1>
          <p className="text-muted-foreground">Thiết lập chung cho toàn bộ platform</p>
        </div>

        <div className="grid gap-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Cài đặt chung
              </CardTitle>
              <CardDescription>Cấu hình cơ bản của platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="platform-name">Tên Platform</Label>
                <Input id="platform-name" defaultValue="Bluecore Finance" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="support-email">Email hỗ trợ</Label>
                <Input id="support-email" type="email" defaultValue="support@bluecore.vn" />
              </div>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Cấu hình Email
              </CardTitle>
              <CardDescription>Thiết lập gửi email thông báo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Gửi email xác nhận đăng ký</Label>
                  <p className="text-sm text-muted-foreground">
                    Yêu cầu xác nhận email khi đăng ký tài khoản mới
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Thông báo tenant mới</Label>
                  <p className="text-sm text-muted-foreground">
                    Gửi email cho admin khi có tenant mới đăng ký
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Bảo mật
              </CardTitle>
              <CardDescription>Cấu hình bảo mật platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bắt buộc xác thực 2 yếu tố</Label>
                  <p className="text-sm text-muted-foreground">
                    Yêu cầu tất cả admin phải bật 2FA
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cho phép đăng ký mới</Label>
                  <p className="text-sm text-muted-foreground">
                    Cho phép người dùng mới tự đăng ký tài khoản
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Database Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database
              </CardTitle>
              <CardDescription>Thông tin database và backup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Backup tự động</Label>
                  <p className="text-sm text-muted-foreground">Đang bật - Hàng ngày lúc 2:00 AM</p>
                </div>
                <Button variant="outline" size="sm">
                  Cấu hình
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Backup thủ công</Label>
                  <p className="text-sm text-muted-foreground">Tạo backup ngay lập tức</p>
                </div>
                <Button variant="outline" size="sm">
                  Tạo backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button>Lưu thay đổi</Button>
        </div>
      </div>
    </>
  );
}
